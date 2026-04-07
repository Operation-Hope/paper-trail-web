import * as duckdb from '@duckdb/duckdb-wasm';
import type { VoteResponse, Politician } from '../../../types/api';

let db: duckdb.AsyncDuckDB | null = null;
let initPromise: Promise<void> | null = null;

export const VOTE_BASE_URL = 'https://huggingface.co/datasets/Dustinhax/tyt/resolve/main/voteview';
export const DIME_BASE_URL = 'https://huggingface.co/datasets/Dustinhax/paper-trail-data/resolve/main/dime/contributions/organizational';

export async function getDuckDB(): Promise<duckdb.AsyncDuckDB | null> {
  if (!db && !initPromise) initPromise = initializeVotes();
  if (initPromise) await initPromise;
  return db;
}

export async function initializeVotes() {
  try {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
    const workerRes = await fetch(bundle.mainWorker!);
    const blob = new Blob([await workerRes.text()], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    const worker = new Worker(workerUrl);
    const instance = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
    await instance.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(workerUrl);

    const conn = await instance.connect();
    try {
      await conn.query(`INSTALL httpfs; LOAD httpfs;`);
      await instance.registerFileURL('members.parquet', `${VOTE_BASE_URL}/HSall_members.parquet`, duckdb.DuckDBDataProtocol.HTTP, false);
      await instance.registerFileURL('votes.parquet', `${VOTE_BASE_URL}/HSall_votes.parquet`, duckdb.DuckDBDataProtocol.HTTP, false);
      await instance.registerFileURL('rollcalls.parquet', `${VOTE_BASE_URL}/HSall_rollcalls.parquet`, duckdb.DuckDBDataProtocol.HTTP, false);
    } finally {
      await conn.close();
    }
    db = instance;
  } catch (err) {
    console.error('❌ DuckDB Init Failed:', err);
    initPromise = null;
  }
}

export async function getLivePoliticians(searchTerm?: string): Promise<Politician[]> {
  const instance = await getDuckDB();
  if (!instance) return [];
  const conn = await instance.connect();
  try {
    const query = `SELECT * FROM 'members.parquet' WHERE congress = (SELECT MAX(congress) FROM 'members.parquet') ${searchTerm ? `AND (LOWER(bioname) LIKE '%${searchTerm.toLowerCase()}%')` : ''} ORDER BY bioname ASC`;
    const result = await conn.query(query);
    return (result.toArray() as any[]).map(row => ({
      canonical_id: row.bioguide_id || row.icpsr?.toString(),
      full_name: row.bioname,
      party: row.party_code === 100 ? 'D' : 'R',
      state: row.state_abbrev,
      icpsr_id: Number(row.icpsr),
      bioguide_id: row.bioguide_id,
      chamber: row.chamber
    } as any));
  } finally {
    await conn.close();
  }
}

export async function getLivePoliticianById(id: string): Promise<Politician | null> {
  const instance = await getDuckDB();
  if (!instance) return null;
  const conn = await instance.connect();
  try {
    const result = await conn.query(`SELECT * FROM 'members.parquet' WHERE bioguide_id = '${id}' OR CAST(icpsr AS VARCHAR) = '${id}' LIMIT 1`);
    const rows = result.toArray();
    if (rows.length === 0) return null;
    const row = rows[0] as any;
    return {
      full_name: row.bioname,
      party: row.party_code === 100 ? 'D' : 'R',
      state: row.state_abbrev,
      icpsr_id: Number(row.icpsr),
      bioguide_id: row.bioguide_id,
      district: row.district_code === 0 ? 'At Large' : `District ${row.district_code}`
    } as any;
  } finally {
    await conn.close();
  }
}

export async function getPoliticianVotes(icpsrId: number): Promise<VoteResponse> {
  const instance = await getDuckDB();
  if (!instance || !icpsrId) return { votes: [], pagination: { currentPage: 1, totalPages: 0, totalVotes: 0 } };
  const conn = await instance.connect();
  try {
    const query = `
      SELECT v.rollnumber, r.date, r.bill_number, r.vote_desc as bill_title, r.vote_question as action_type, r.dtl_desc as bill_description,
      CASE WHEN v.cast_code = 1 THEN 'Yea' WHEN v.cast_code = 6 THEN 'Nay' ELSE 'Present' END as vote_value
      FROM 'votes.parquet' v
      JOIN 'rollcalls.parquet' r ON v.rollnumber = r.rollnumber AND v.chamber = r.chamber AND v.congress = r.congress
      WHERE v.icpsr = ${icpsrId} ORDER BY r.date DESC LIMIT 20`;
    const result = await conn.query(query);
    const votes = result.toArray().map((row: any) => ({
      vote_id: row.rollnumber.toString(),
      vote_value: row.vote_value,
      bill_number: row.bill_number || 'N/A',
      bill_title: row.bill_title || 'Legislative Action',
      action_type: row.action_type || '',
      bill_description: row.bill_description || '', 
      vote_date: row.date ? new Date(row.date).toISOString().split('T')[0] : 'Unknown',
      topics: []
    }));
    return { votes, pagination: { currentPage: 1, totalPages: 1, totalVotes: votes.length } };
  } finally {
    await conn.close();
  }
}
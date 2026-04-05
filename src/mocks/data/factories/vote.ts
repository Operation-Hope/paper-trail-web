import * as duckdb from '@duckdb/duckdb-wasm';
import type {
  VoteResponse,
  VoteDateRangeResponse,
  Politician,
} from '@/types/api';

let db: duckdb.AsyncDuckDB | null = null;
let isInitializing = false;
const HF_TOKEN = (import.meta.env.VITE_HF_TOKEN as string) || '';

interface DuckDBMemberRow {
  icpsr: number;
  bioguide_id: string;
  bioname: string;
  state_abbrev: string;
  district_code: number;
  party_code: number;
  chamber: string;
  nominate_dim1: number;
  nominate_dim2: number;
}

interface DuckDBVoteRow {
  vote_id: number;
  vote_date: Date | number;
  bill_number: string;
  bill_description: string;
  vote_value: string;
}

export async function initializeVotes() {
  if (db || isInitializing) return;
  isInitializing = true;

  try {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    const workerUrlFromBundle = bundle.mainWorker;
    if (!workerUrlFromBundle) {
      throw new Error('DuckDB main worker URL is missing from bundle');
    }

    const workerRes = await fetch(workerUrlFromBundle);
    const workerScript = await workerRes.text();
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    const worker = new Worker(workerUrl);
    const instance = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
    await instance.instantiate(bundle.mainModule, bundle.pthreadWorker);

    db = instance;
    URL.revokeObjectURL(workerUrl);

    const baseUrl =
      'https://huggingface.co/datasets/Dustinhax/tyt/resolve/main/voteview';

    await instance.registerFileURL(
      'members.parquet',
      `${baseUrl}/HSall_members.parquet`,
      duckdb.DuckDBDataProtocol.HTTP,
      false
    );
    await instance.registerFileURL(
      'votes.parquet',
      `${baseUrl}/HSall_votes.parquet`,
      duckdb.DuckDBDataProtocol.HTTP,
      false
    );
    await instance.registerFileURL(
      'rollcalls.parquet',
      `${baseUrl}/HSall_rollcalls.parquet`,
      duckdb.DuckDBDataProtocol.HTTP,
      false
    );

    await fetch(`${baseUrl}/HSall_members.parquet`, {
      headers: { Authorization: `Bearer ${HF_TOKEN}` },
      method: 'HEAD',
    }).catch(() => {});

    console.log('✅ DuckDB Ready with Live Member Data.');
  } catch (err) {
    console.error('❌ DuckDB Init Failed:', err);
  } finally {
    isInitializing = false;
  }
}

function mapMemberRow(row: DuckDBMemberRow): Politician {
  const nameParts = row.bioname.split(', ');
  const rawLast = nameParts[0] || '';
  const rawFirst = nameParts[1] || '';
  const formatName = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const last_name = formatName(rawLast);
  const first_name = formatName(rawFirst);

  return {
    canonical_id: row.bioguide_id || row.icpsr.toString(),
    first_name,
    last_name,
    full_name: `${first_name} ${last_name}`,
    party: row.party_code === 100 ? 'D' : row.party_code === 200 ? 'R' : 'I',
    state: row.state_abbrev,
    district:
      row.district_code === 0 ? 'Senate' : `District ${row.district_code}`,
    is_active: true,
    bioguide_id: row.bioguide_id,
    icpsr_id: row.icpsr,
    nominate_dim1: row.nominate_dim1,
    nominate_dim2: row.nominate_dim2,
    chamber: row.chamber === 'Senate' ? 'Senate' : 'House',
  };
}

export async function getLivePoliticians(
  searchTerm?: string
): Promise<Politician[]> {
  if (!db) await initializeVotes();
  if (!db) return [];
  const conn = await db.connect();
  try {
    const query = `
      SELECT icpsr, bioguide_id, bioname, state_abbrev, district_code, party_code, chamber, nominate_dim1, nominate_dim2
      FROM 'members.parquet'
      WHERE congress = (SELECT MAX(congress) FROM 'members.parquet')
      ${searchTerm ? `AND (LOWER(bioname) LIKE '%${searchTerm.toLowerCase()}%')` : ''}
      ORDER BY bioname ASC
    `;
    const result = await conn.query(query);
    return (result.toArray() as unknown as DuckDBMemberRow[]).map(mapMemberRow);
  } finally {
    await conn.close();
  }
}

export async function getLivePoliticianById(
  id: string
): Promise<Politician | null> {
  if (!db) await initializeVotes();
  if (!db) return null;
  const conn = await db.connect();
  try {
    const query = `SELECT * FROM 'members.parquet' WHERE bioguide_id = '${id}' LIMIT 1`;
    const result = await conn.query(query);
    const results = result.toArray() as unknown as DuckDBMemberRow[];
    return results.length > 0 ? mapMemberRow(results[0]) : null;
  } finally {
    await conn.close();
  }
}

/**
 * Executes the SQL query to find votes for a specific ICPSR ID.
 */
export async function getVotesForPolitician(
  icpsrId: number,
  params: { page?: string; search?: string }
): Promise<VoteResponse> {
  if (!db) {
    await initializeVotes();
  }

  const instance = db as duckdb.AsyncDuckDB;
  const conn = await instance.connect();

  const page = parseInt(params.page || '1', 10);
  const pageSize = 10;
  const offset = (page - 1) * pageSize;
  const searchTerm = params.search ? `%${params.search.toLowerCase()}%` : null;

  try {
    const query = `
      SELECT v.rollnumber as vote_id, r.date as vote_date, r.bill_number, r.dtl_desc as bill_description,
             CASE WHEN v.cast_code = 1 THEN 'Yea' WHEN v.cast_code = 6 THEN 'Nay' WHEN v.cast_code = 9 THEN 'Not Voting' ELSE 'Present' END as vote_value
      FROM 'votes.parquet' v
      JOIN 'rollcalls.parquet' r ON v.rollnumber = r.rollnumber AND v.chamber = r.chamber AND v.congress = r.congress
      WHERE v.icpsr = ${icpsrId}
      ${searchTerm ? `AND (LOWER(r.dtl_desc) LIKE '${searchTerm}' OR LOWER(r.bill_number) LIKE '${searchTerm}')` : ''}
      ORDER BY r.date DESC LIMIT ${pageSize} OFFSET ${offset}
    `;

    const result = await conn.query(query);
    const votes = (result.toArray() as unknown as DuckDBVoteRow[]).map(
      (row) => {
        const dateObj = new Date(row.vote_date);
        return {
          vote_id: row.vote_id.toString(),
          vote_value: row.vote_value,
          bill_number: row.bill_number || 'N/A',
          bill_description: row.bill_description || 'No description provided',
          vote_date: !isNaN(dateObj.getTime())
            ? dateObj.toISOString().split('T')[0]
            : 'Unknown',
          topics: [],
        };
      }
    );

    const countRes = await conn.query(
      `SELECT count(*) as total FROM 'votes.parquet' WHERE icpsr = ${icpsrId}`
    );
    const totalVotes = Number(
      (countRes.toArray()[0] as unknown as { total: bigint }).total
    );

    return {
      votes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalVotes / pageSize),
        totalVotes,
      },
    };
  } finally {
    await conn.close();
  }
}

/**
 * Returns the career date range for a politician.
 */
export async function createVoteDateRangeResponse(
  icpsrId: number
): Promise<VoteDateRangeResponse> {
  if (!db) {
    await initializeVotes();
  }

  const instance = db as duckdb.AsyncDuckDB;
  const conn = await instance.connect();

  try {
    const query = `SELECT MIN(r.date) as earliest, MAX(r.date) as latest FROM 'votes.parquet' v JOIN 'rollcalls.parquet' r ON v.rollnumber = r.rollnumber WHERE v.icpsr = ${icpsrId}`;
    const result = await conn.query(query);
    const row = result.toArray()[0] as unknown as {
      earliest: number;
      latest: number;
    };
    const earliest = row.earliest ? new Date(row.earliest) : null;
    const latest = row.latest ? new Date(row.latest) : null;
    return {
      earliest_vote: earliest ? earliest.toISOString().split('T')[0] : '',
      latest_vote: latest ? latest.toISOString().split('T')[0] : '',
      congress_sessions: [
        { congress: 118, start: '2023-01-03', end: '2025-01-03' },
      ],
    };
  } finally {
    await conn.close();
  }
}

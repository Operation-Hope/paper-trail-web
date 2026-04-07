import * as duckdb from '@duckdb/duckdb-wasm';
import type {
  VoteResponse,
  VoteDateRangeResponse,
  Politician,
} from '@/types/api';

let db: duckdb.AsyncDuckDB | null = null;
let initPromise: Promise<void> | null = null;
const HF_TOKEN = (import.meta.env.VITE_HF_TOKEN as string) || '';

export async function getDuckDB(): Promise<duckdb.AsyncDuckDB | null> {
  if (!db && !initPromise) {
    initPromise = initializeVotes();
  }
  if (initPromise) {
    await initPromise;
  }
  return db;
}

export async function initializeVotes() {
  try {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
    const workerRes = await fetch(bundle.mainWorker!);
    const blob = new Blob([await workerRes.text()], {
      type: 'application/javascript',
    });
    const workerUrl = URL.createObjectURL(blob);

    const worker = new Worker(workerUrl);
    const instance = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
    await instance.instantiate(bundle.mainModule, bundle.pthreadWorker);

    URL.revokeObjectURL(workerUrl);

    const conn = await instance.connect();
    try {
      await conn.query(
        `SET autoinstall_known_extensions=1; SET autoload_known_extensions=1;`
      );
      await conn.query(`INSTALL httpfs; LOAD httpfs;`);

      const CROSSWALK_URL =
        'https://huggingface.co/datasets/Dustinhax/paper-trail-data/resolve/main/legislator_crosswalk.parquet';
      await conn.query(
        `CREATE TABLE IF NOT EXISTS crosswalk AS SELECT * FROM '${CROSSWALK_URL}';`
      );

      if (HF_TOKEN) {
        await conn.query(
          `CREATE SECRET hf_token (TYPE HUGGINGFACE, TOKEN '${HF_TOKEN}');`
        );
      }
    } finally {
      await conn.close();
    }

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

    db = instance;
    console.log('✅ DuckDB Live: Core Database Ready.');
  } catch (err) {
    console.error('❌ DuckDB Init Failed:', err);
    initPromise = null;
  }
}

function mapMemberRow(row: any): Politician {
  const bioname = row.bioname || 'Unknown, Unknown';
  const nameParts = bioname.split(', ');
  const formatName = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
  const last_name = formatName(nameParts[0]);
  const first_name = formatName(nameParts[1]);

  return {
    canonical_id: row.bioguide_id || row.icpsr?.toString(),
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
  const instance = await getDuckDB();
  if (!instance) return [];
  const conn = await instance.connect();
  try {
    const query = `
      SELECT * FROM 'members.parquet'
      WHERE congress = (SELECT MAX(congress) FROM 'members.parquet')
      ${searchTerm ? `AND (LOWER(bioname) LIKE '%${searchTerm.toLowerCase()}%')` : ''}
      ORDER BY bioname ASC
    `;
    const result = await conn.query(query);
    return (result.toArray() as any[]).map(mapMemberRow);
  } finally {
    await conn.close();
  }
}

export async function getLivePoliticianById(
  id: string
): Promise<Politician | null> {
  const instance = await getDuckDB();
  if (!instance) return null;
  const conn = await instance.connect();
  try {
    const query = `
      SELECT * FROM 'members.parquet' 
      WHERE bioguide_id = '${id}' 
      OR CAST(icpsr AS VARCHAR) = '${id}'
      LIMIT 1
    `;
    const result = await conn.query(query);
    const results = result.toArray() as any[];
    return results.length > 0 ? mapMemberRow(results[0]) : null;
  } finally {
    await conn.close();
  }
}

export async function getVotesForPolitician(
  icpsrId: number,
  params: { page?: string }
): Promise<VoteResponse> {
  const instance = await getDuckDB();
  if (!instance) throw new Error('DB not initialized');
  const conn = await instance.connect();
  const page = parseInt(params.page || '1', 10);
  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  try {
    // 🛡️ JOIN with rollcalls to get bill_title and action_type
    const query = `
      SELECT v.rollnumber as vote_id, r.date as vote_date, r.bill_number, r.dtl_desc as bill_description,
             r.vote_desc as bill_title, r.vote_question as action_type,
             CASE WHEN v.cast_code = 1 THEN 'Yea' WHEN v.cast_code = 6 THEN 'Nay' ELSE 'Present' END as vote_value
      FROM 'votes.parquet' v
      JOIN 'rollcalls.parquet' r ON v.rollnumber = r.rollnumber AND v.chamber = r.chamber AND v.congress = r.congress
      WHERE v.icpsr = ${icpsrId}
      ORDER BY r.date DESC LIMIT ${pageSize} OFFSET ${offset}
    `;
    const result = await conn.query(query);
    const votes = (result.toArray() as any[]).map((row) => ({
      vote_id: row.vote_id.toString(),
      vote_value: row.vote_value,
      bill_number: row.bill_number || 'N/A',
      bill_title: row.bill_title || 'Legislative Action',
      action_type: row.action_type || '',
      bill_description: row.bill_description || 'No description',
      vote_date: row.vote_date
        ? new Date(row.vote_date).toISOString().split('T')[0]
        : 'Unknown',
      topics: [],
    }));

    const countRes = await conn.query(
      `SELECT count(*) as total FROM 'votes.parquet' WHERE icpsr = ${icpsrId}`
    );
    const totalVotes = Number((countRes.toArray()[0] as any).total);

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

export async function createVoteDateRangeResponse(
  icpsrId: number
): Promise<VoteDateRangeResponse> {
  const instance = await getDuckDB();
  if (!instance) throw new Error('DB not initialized');
  const conn = await instance.connect();
  try {
    const query = `SELECT MIN(r.date) as earliest, MAX(r.date) as latest FROM 'votes.parquet' v JOIN 'rollcalls.parquet' r ON v.rollnumber = r.rollnumber WHERE v.icpsr = ${icpsrId}`;
    const result = await conn.query(query);
    const row = result.toArray()[0] as any;
    return {
      earliest_vote: row.earliest
        ? new Date(row.earliest).toISOString().split('T')[0]
        : '',
      latest_vote: row.latest
        ? new Date(row.latest).toISOString().split('T')[0]
        : '',
      congress_sessions: [
        { congress: 119, start: '2025-01-03', end: '2027-01-03' },
      ],
    };
  } finally {
    await conn.close();
  }
}

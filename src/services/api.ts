import { Politician } from '../types/api';
import { getDuckDB } from '../lib/duckdb';

// Self-hosted datasets, rebuilt daily from primary sources (FEC bulk data +
// VoteView) by scripts/data_sync.py via .github/workflows/data-sync.yml.
// VITE_DATA_BASE_URL overrides the base for local testing against a dev server.
const DATA_BASE =
  import.meta.env.VITE_DATA_BASE_URL ||
  'https://huggingface.co/datasets/arpanbosmia/paper-trail-data/resolve/main';
const VV_BASE = `${DATA_BASE}/voteview`;

// These three must move together: the 119th Congress (2025-2027) overlaps the
// 2026 election cycle, whose contribution data starts in January 2025.
const CURRENT_CYCLE = 2026;
const CURRENT_CONGRESS = 119;
const CYCLE_START_DATE = '2025-01-03';

const CONTRIBUTIONS_URL = `${DATA_BASE}/fec/contributions_${CURRENT_CYCLE}_organizational.parquet`;

export interface CorrelatedDonation {
  vote_id: string;
  vote_desc: string;
  vote_date: string;
  position: string;
  donor_name: string;
  amount: number;
  donation_date: string;
  days_difference: number;
  sector: string;
  timeline_direction: 'before' | 'after' | 'same_day';
}

// Row shapes as returned by conn.query(...).toArray() for each SQL query below.
// DuckDB-wasm types every column as `any`, so these are the cast boundary that
// keeps the rest of each function type-checked under strictTypeChecked.
interface MemberSearchRow {
  id: string;
  icpsr: number;
  full_name: string;
  state: string;
  district_code: number;
  chamber: string;
  party_code: number;
}

interface MemberByIdRow {
  bioguide_id: string;
  icpsr: number;
  bioname: string;
  state_abbrev: string;
  district_code: number;
  party_code: number;
  chamber: string;
}

interface VoteHistoryRow {
  vote_id: string;
  vote_desc: string | null;
  date: string;
  cast_code: number;
}

interface DonationSummaryRow {
  name: string;
  value: number;
}

interface DonationBySectorRow {
  occ: string | null;
  emp: string | null;
  cname: string | null;
  value: number;
}

interface CorrelationCountRow {
  total_count: number;
}

interface CorrelationRow {
  vote_id: string;
  vote_desc: string | null;
  vote_date: string;
  cast_code: number;
  donor_name: string;
  amount: number;
  donation_date: string;
  occ: string | null;
  emp: string | null;
  days_difference: number | null;
}

function classifySector(combinedText: string): string {
  const combined = combinedText.toUpperCase();
  if (
    /WINRED|ACTBLUE|COMMITTEE|PAC|DCCC|NRCC|VICTORY|PARTY|POLITICAL|FEDERAL/.test(
      combined
    )
  )
    return 'Political Committees';
  if (
    /OIL|GAS|ENERGY|PETROLEUM|EXXON|CHEVRON|MINING|UTILITY|COAL|POWER|DRILLING|EXPLORATION|GEOLOGY|BP|SHELL/.test(
      combined
    )
  )
    return 'Energy & Resources';
  if (
    /BANK|FINANCE|EQUITY|INVEST|CAPITAL|REALTOR|REAL ESTATE|INSURANCE|WALL STREET|GOLDMAN|MORGAN|HEDGE|ADVISOR/.test(
      combined
    )
  )
    return 'Finance & Real Estate';
  if (
    /TECH|GOOGLE|APPLE|META|AMAZON|SOFTWARE|MICROSOFT|TELECOM|VERIZON|AI|MEDIA|COMCAST|BROADCAST/.test(
      combined
    )
  )
    return 'Technology & Media';
  if (
    /PHARMA|MEDICAL|HEALTH|DOCTOR|PHYSICIAN|HOSPITAL|PFIZER|BIOTECH|DENTIST|SURGEON/.test(
      combined
    )
  )
    return 'Health & Pharma';
  if (/ATTORNEY|LAWYER|LEGAL|COUNSEL|LAW FIRM|LOBBY|PARTNER/.test(combined))
    return 'Lawyers & Lobbyists';
  if (
    /OWNER|CEO|PRESIDENT|EXECUTIVE|CHAIRMAN|BUSINESS|SELF|RETIRED|HOMEMAKER/.test(
      combined
    )
  )
    return 'Business & Ideological';
  if (/DEFENSE|BOEING|LOCKHEED|RAYTHEON|AERO|MILITARY|NORTHROP/.test(combined))
    return 'Defense & Aerospace';
  if (
    /UNION|TEACHER|PROFESSOR|UNIVERSITY|SCHOOL|EDU|COLLEGE|AFL-CIO/.test(
      combined
    )
  )
    return 'Labor & Education';
  return 'Other / Misc';
}

// Interface defining the brand-new runtime filtering criteria options
export interface TimelineFilters {
  search?: string;
  sector?: string;
  direction?: 'before' | 'after' | 'same_day' | 'all';
  sortBy?: 'proximity' | 'amount';
  hidePacs?: boolean;
}

export const api = {
  searchPoliticians: async (searchQuery: string): Promise<Politician[]> => {
    const db = await getDuckDB();
    const conn = await db.connect();
    try {
      const query = `
        SELECT bioguide_id as id, icpsr, bioname as full_name, state_abbrev as state, 
               district_code, chamber, party_code
        FROM read_parquet('${VV_BASE}/HSall_members.parquet')
        WHERE congress = ${CURRENT_CONGRESS}
          AND bioname ILIKE '%${searchQuery}%'
        ORDER BY bioname ASC LIMIT 20
      `;
      const res = await conn.query(query);
      return (res.toArray() as MemberSearchRow[]).map((row) => ({
        id: row.id,
        canonical_id: row.id,
        icpsr: row.icpsr,
        name: row.full_name,
        full_name: row.full_name,
        state: row.state,
        district: row.district_code.toString(),
        role: row.chamber === 'House' ? 'Representative' : 'Senator',
        chamber: row.chamber,
        party:
          row.party_code === 100
            ? 'Democrat'
            : row.party_code === 200
              ? 'Republican'
              : 'Other',
      }));
    } finally {
      await conn.close();
    }
  },

  getPoliticianById: async (id: string): Promise<Politician | null> => {
    const db = await getDuckDB();
    const conn = await db.connect();
    try {
      const query = `
        SELECT bioguide_id, icpsr, bioname, state_abbrev, district_code, party_code, chamber
        FROM read_parquet('${VV_BASE}/HSall_members.parquet')
        WHERE congress = ${CURRENT_CONGRESS}
          AND (bioguide_id = '${id}' OR CAST(icpsr AS VARCHAR) = '${id}')
        LIMIT 1
      `;
      const res = await conn.query(query);
      if (res.numRows === 0) return null;
      const row = (res.toArray() as MemberByIdRow[])[0];
      return {
        id: row.bioguide_id,
        canonical_id: row.bioguide_id,
        icpsr: row.icpsr,
        name: row.bioname,
        full_name: row.bioname,
        state: row.state_abbrev,
        district: row.district_code.toString(),
        role: row.chamber === 'House' ? 'Representative' : 'Senator',
        chamber: row.chamber,
        party:
          row.party_code === 100
            ? 'Democrat'
            : row.party_code === 200
              ? 'Republican'
              : 'Other',
      };
    } finally {
      await conn.close();
    }
  },

  async getVoteHistory(icpsr: number) {
    const db = await getDuckDB();
    if (!icpsr) return { data: [], total: 0 };
    const conn = await db.connect();
    try {
      const query = `
        SELECT CAST(CAST(v.rollnumber AS INTEGER) AS VARCHAR) as vote_id, rc.vote_desc, rc.date, 
               CAST(v.cast_code AS INTEGER) as cast_code
        FROM read_parquet('${VV_BASE}/HSall_votes.parquet') v
        LEFT JOIN read_parquet('${VV_BASE}/HSall_rollcalls.parquet') rc 
          ON CAST(v.rollnumber AS INTEGER) = CAST(rc.rollnumber AS INTEGER) 
          AND CAST(v.congress AS INTEGER) = CAST(rc.congress AS INTEGER)
        WHERE CAST(v.icpsr AS INTEGER) = ${Math.floor(icpsr)}
          AND rc.date >= '${CYCLE_START_DATE}'
        ORDER BY rc.date DESC, v.rollnumber DESC
      `;
      const res = await conn.query(query);
      const data = (res.toArray() as VoteHistoryRow[]).map((r) => ({
        id: r.vote_id,
        title: r.vote_desc || `Vote #${r.vote_id}`,
        date: r.date,
        position:
          r.cast_code === 1 ? 'Yea' : r.cast_code === 6 ? 'Nay' : 'Other',
      }));
      return { data, total: data.length };
    } finally {
      await conn.close();
    }
  },

  async getDonationSummary(name: string) {
    const db = await getDuckDB();
    const conn = await db.connect();
    try {
      const hfUrl = CONTRIBUTIONS_URL;
      const parts = name
        .replace(/[^a-zA-Z\s,]/g, '')
        .toUpperCase()
        .split(',')
        .map((p) => p.trim());
      const lastName = parts[0];
      const firstName = parts[1] || '';

      const query = `
        SELECT "contributor.name" as name, SUM(amount) as value 
        FROM read_parquet('${hfUrl}') 
        WHERE (UPPER("recipient.name") LIKE '%${lastName}%' AND UPPER("recipient.name") LIKE '%${firstName}%')
        GROUP BY name ORDER BY value DESC LIMIT 5
      `;
      const res = await conn.query(query);
      return (res.toArray() as DonationSummaryRow[]).map((r) => ({
        name: r.name,
        value: r.value,
      }));
    } finally {
      await conn.close();
    }
  },

  async getDonationBySector(name: string) {
    const db = await getDuckDB();
    const conn = await db.connect();
    try {
      const hfUrl = CONTRIBUTIONS_URL;
      const parts = name
        .replace(/[^a-zA-Z\s,]/g, '')
        .toUpperCase()
        .split(',')
        .map((p) => p.trim());
      const lastName = parts[0];
      const firstName = parts[1] || '';

      const query = `
        SELECT 
          "contributor.occupation" as occ, 
          "contributor.employer" as emp, 
          "contributor.name" as cname, 
          SUM(amount) as value 
        FROM read_parquet('${hfUrl}') 
        WHERE (UPPER("recipient.name") LIKE '%${lastName}%' AND UPPER("recipient.name") LIKE '%${firstName}%')
        GROUP BY "contributor.occupation", "contributor.employer", "contributor.name"
      `;

      const res = await conn.query(query);
      const sectors: Record<string, number> = {};

      (res.toArray() as DonationBySectorRow[]).forEach((r) => {
        const occ = (r.occ ?? '').toUpperCase();
        const emp = (r.emp ?? '').toUpperCase();
        const combined = `${occ} ${emp} ${r.cname ?? ''}`;
        const s = classifySector(combined);
        sectors[s] = (sectors[s] || 0) + r.value;
      });

      return Object.entries(sectors)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    } finally {
      await conn.close();
    }
  },

  // 🚀 SEARCHABLE, SECTOR-FILTERABLE, & OPTIMIZED MULTI-SORT PAC METHOD
  async getVoteCorrelatedDonations(
    icpsr: number,
    name: string,
    page: number = 1,
    pageSize: number = 10,
    filters: TimelineFilters = {}
  ): Promise<{ items: CorrelatedDonation[]; total: number }> {
    const db = await getDuckDB();
    if (!icpsr) return { items: [], total: 0 };
    const conn = await db.connect();

    // Unpack filters with default fallbacks
    const {
      search = '',
      sector = '',
      direction = 'all',
      sortBy = 'proximity',
      hidePacs = true,
    } = filters;

    try {
      const hfUrl = CONTRIBUTIONS_URL;
      const parts = name
        .replace(/[^a-zA-Z\s,]/g, '')
        .toUpperCase()
        .split(',')
        .map((p) => p.trim());
      const lastName = parts[0];
      const firstName = parts[1] || '';
      const cleanICPSR = Math.floor(icpsr);
      const offset = (page - 1) * pageSize;

      // 🛠 Dynamically build out search/filter constraints for the SQL engine
      let secondaryConditions = '';

      // Keyword Text Search (Checks across descriptions, votes, and donor companies)
      if (search.trim().length > 0) {
        const cleanSearch = search.replace(/'/g, "''").trim();
        secondaryConditions += ` AND (rc.vote_desc ILIKE '%${cleanSearch}%' OR d."contributor.name" ILIKE '%${cleanSearch}%')`;
      }

      // Proximity Window Direction Toggle (Before, After, or Same Day)
      if (direction === 'before') {
        secondaryConditions += ` AND CAST(d.date AS DATE) < CAST(rc.date AS DATE)`;
      } else if (direction === 'after') {
        // 🌟 FIXED: Changed operator from < to > so "After" timeline filters work correctly
        secondaryConditions += ` AND CAST(d.date AS DATE) > CAST(rc.date AS DATE)`;
      } else if (direction === 'same_day') {
        secondaryConditions += ` AND CAST(d.date AS DATE) = CAST(rc.date AS DATE)`;
      }

      // Hide Party Committee PAC Backlogs (Crucial performance layer for Hakeem Jeffries)
      if (hidePacs) {
        secondaryConditions += ` AND NOT (
          UPPER(d."contributor.name") LIKE '%DCCC%' OR 
          UPPER(d."contributor.name") LIKE '%ACTBLUE%' OR 
          UPPER(d."contributor.name") LIKE '%WINRED%' OR
          UPPER(d."contributor.name") LIKE '%PAC%' OR
          UPPER(d."contributor.name") LIKE '%COMMITTEE%'
        )`;
      }

      // 🌟 FIXED: Added rc.rollnumber anchor for a stable index sorting matrix
      let orderByClause =
        'ORDER BY days_difference ASC, d.amount DESC, rc.rollnumber ASC';
      if (sortBy === 'amount') {
        orderByClause =
          'ORDER BY d.amount DESC, days_difference ASC, rc.rollnumber ASC';
      }

      // 1. Gather total subset pagination boundaries matching active constraints
      const countQuery = `
        SELECT COUNT(*) as total_count
        FROM read_parquet('${VV_BASE}/HSall_votes.parquet') v
        INNER JOIN read_parquet('${VV_BASE}/HSall_rollcalls.parquet') rc 
          ON CAST(v.rollnumber AS INTEGER) = CAST(rc.rollnumber AS INTEGER) 
          AND CAST(v.congress AS INTEGER) = CAST(rc.congress AS INTEGER)
        INNER JOIN read_parquet('${hfUrl}') d
          ON (UPPER(d."recipient.name") LIKE '%${lastName}%' AND UPPER(d."recipient.name") LIKE '%${firstName}%')
        WHERE CAST(v.icpsr AS INTEGER) = ${cleanICPSR}
          AND rc.date >= '${CYCLE_START_DATE}'
          AND abs(date_diff('day', CAST(rc.date AS DATE), CAST(d.date AS DATE))) <= 30
          ${secondaryConditions}
      `;
      const countRes = await conn.query(countQuery);
      const total =
        (countRes.toArray() as CorrelationCountRow[])[0]?.total_count ?? 0;

      // 2. Stream paginated and filtered chunk records
      const query = `
        SELECT 
          CAST(CAST(v.rollnumber AS INTEGER) AS VARCHAR) as vote_id,
          rc.vote_desc,
          rc.date as vote_date,
          CAST(v.cast_code AS INTEGER) as cast_code,
          d."contributor.name" as donor_name,
          CAST(d.amount AS DOUBLE) as amount, -- 🌟 FIXED: Enforce clear numeric types for faster row scanning
          d.date as donation_date,
          "contributor.occupation" as occ,
          "contributor.employer" as emp,
          abs(date_diff('day', CAST(rc.date AS DATE), CAST(d.date AS DATE))) as days_difference
        FROM read_parquet('${VV_BASE}/HSall_votes.parquet') v
        INNER JOIN read_parquet('${VV_BASE}/HSall_rollcalls.parquet') rc 
          ON CAST(v.rollnumber AS INTEGER) = CAST(rc.rollnumber AS INTEGER) 
          AND CAST(v.congress AS INTEGER) = CAST(rc.congress AS INTEGER)
        INNER JOIN read_parquet('${hfUrl}') d
          ON (UPPER(d."recipient.name") LIKE '%${lastName}%' AND UPPER(d."recipient.name") LIKE '%${firstName}%')
        WHERE CAST(v.icpsr AS INTEGER) = ${cleanICPSR}
          AND rc.date >= '${CYCLE_START_DATE}'
          AND abs(date_diff('day', CAST(rc.date AS DATE), CAST(d.date AS DATE))) <= 30
          ${secondaryConditions}
        ${orderByClause}
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const res = await conn.query(query);
      let items = (res.toArray() as CorrelationRow[]).map((r) => {
        const occ = (r.occ ?? '').toUpperCase();
        const emp = (r.emp ?? '').toUpperCase();
        const combined = `${occ} ${emp} ${r.donor_name}`;
        const s = classifySector(combined);

        const vDate = r.vote_date ? new Date(r.vote_date) : null;
        const dDate = r.donation_date ? new Date(r.donation_date) : null;

        let direction: 'before' | 'after' | 'same_day' = 'same_day';
        if (vDate && dDate) {
          const diffTime = dDate.getTime() - vDate.getTime();
          if (diffTime < 0) direction = 'before';
          else if (diffTime > 0) direction = 'after';
        }

        return {
          vote_id: r.vote_id,
          vote_desc: r.vote_desc || `Roll Call Vote #${r.vote_id}`,
          vote_date: r.vote_date,
          position:
            r.cast_code === 1 ? 'Yea' : r.cast_code === 6 ? 'Nay' : 'Other',
          donor_name: r.donor_name,
          amount: r.amount,
          donation_date: r.donation_date,
          days_difference: r.days_difference ?? 0,
          sector: s,
          timeline_direction: direction,
        };
      });

      // Optional sector filters calculated via mapped row outputs
      if (sector && sector !== 'all') {
        items = items.filter((item) => item.sector === sector);
      }

      return { items, total };
    } finally {
      await conn.close();
    }
  },
};

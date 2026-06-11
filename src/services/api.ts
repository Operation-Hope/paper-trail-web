import * as DuckDBLib from '../lib/duckdb';

const VV_BASE = 'https://huggingface.co/datasets/bhoward628/voteview/resolve/main';
const DIME_BASE = 'https://huggingface.co/datasets/bhoward628/dime/resolve/main';

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

export interface TimelineFilters {
  search?: string;
  sector?: string;
  direction?: 'before' | 'after' | 'same_day' | 'all';
  sortBy?: 'proximity' | 'amount';
  hidePacs?: boolean;
}

export interface Politician {
  id: string;
  name: string;
  full_name: string;
  party: string;
  role: string;
  state: string;
  district: string;
  icpsr: number;
}

let dbInstance: any = null;
async function getDuckDB() {
  if (!dbInstance) {
    // Cast the imported module to any to bypass static type analysis rules
    const untypedLib = DuckDBLib as any;
    
    const initFn = untypedLib.initDuckDB || 
                   untypedLib.openDuckDB || 
                   untypedLib.default;
                   
    if (!initFn) {
      console.error("Available DuckDB exports:", Object.keys(DuckDBLib));
      throw new Error("Could not find an initialization function in '../lib/duckdb'");
    }
    
    dbInstance = await initFn();
  }
  return dbInstance;
}

export const api = {
  async getPoliticianById(id: string): Promise<Politician | null> {
    const db = await getDuckDB();
    if (!db) return null;
    const conn = await db.connect();

    try {
      const query = `
        SELECT 
          icpsr as id,
          bioname as name,
          bioname as full_name,
          CASE WHEN party_code = 100 THEN 'Democrat' WHEN party_code = 200 THEN 'Republican' ELSE 'Independent' END as party,
          CASE WHEN chamber = 'Senate' THEN 'Senator' ELSE 'Representative' END as role,
          state_abbrev as state,
          district_code as district,
          icpsr
        FROM read_parquet('${VV_BASE}/HSall_members.parquet')
        WHERE CAST(icpsr AS VARCHAR) = '${id}'
        LIMIT 1
      `;
      const res = await conn.query(query);
      const rows = res.toArray();
      if (rows.length === 0) return null;
      
      const r = rows[0];
      return {
        id: String(r.id),
        name: r.name,
        full_name: r.full_name,
        party: r.party,
        role: r.role,
        state: r.state,
        district: r.district === 0 || r.district === '0' ? 'At-Large' : String(r.district),
        icpsr: Number(r.icpsr)
      };
    } catch (err) {
      console.error('Error fetching politician metadata:', err);
      return null;
    } finally {
      await conn.close();
    }
  },

  async getVoteCorrelatedDonations(
    icpsr: number, 
    name: string,
    page: number = 1,
    pageSize: number = 10,
    filters: TimelineFilters = {}
  ): Promise<{ items: CorrelatedDonation[]; total: number }> {
    const db = await getDuckDB();
    if (!db || !icpsr) return { items: [], total: 0 };
    const conn = await db.connect();
    
    const { search = '', sector = '', direction = 'all', sortBy = 'proximity', hidePacs = true } = filters;

    try {
      const hfUrl = `${DIME_BASE}/dime/contributions/organizational/contribDB_2024_organizational.parquet`;
      
      const parts = name.toUpperCase().split(',').map(p => p.trim());
      const rawLastName = parts[0] || '';
      const firstName = parts[1] || '';
      
      const firstInitial = firstName.replace(/[^A-Z]/g, '').charAt(0);
      
      const lastNameSegments = rawLastName
        .replace(/[^A-Z\s-]/g, '')
        .split(/[\s-]+/)
        .filter(seg => seg.length > 2);

      let recipientNameConstraint = '';
      if (lastNameSegments.length > 0) {
        const segmentConditions = lastNameSegments
          .map(seg => `UPPER(d."recipient.name") LIKE '%${seg}%'`)
          .join(' AND ');
        
        recipientNameConstraint = firstInitial 
          ? `(${segmentConditions}) AND UPPER(d."recipient.name") LIKE '%${firstInitial}%'`
          : `(${segmentConditions})`;
      } else {
        recipientNameConstraint = `UPPER(d."recipient.name") LIKE '%${rawLastName.replace(/[^A-Z]/g, '')}%'`;
      }

      const cleanICPSR = Math.floor(icpsr);
      const offset = (page - 1) * pageSize;

      let secondaryConditions = '';
      
      if (search.trim().length > 0) {
        const cleanSearch = search.replace(/'/g, "''").trim();
        secondaryConditions += ` AND (rc.vote_desc ILIKE '%${cleanSearch}%' OR d."contributor.name" ILIKE '%${cleanSearch}%')`;
      }

      if (direction === 'before') {
        secondaryConditions += ` AND CAST(d.date AS DATE) < CAST(rc.date AS DATE)`;
      } else if (direction === 'after') {
        secondaryConditions += ` AND CAST(d.date AS DATE) > CAST(rc.date AS DATE)`;
      } else if (direction === 'same_day') {
        secondaryConditions += ` AND CAST(d.date AS DATE) = CAST(rc.date AS DATE)`;
      }

      if (hidePacs) {
        secondaryConditions += ` AND NOT (
          UPPER(d."contributor.name") LIKE '%DCCC%' OR 
          UPPER(d."contributor.name") LIKE '%ACTBLUE%' OR 
          UPPER(d."contributor.name") LIKE '%WINRED%' OR
          UPPER(d."contributor.name") LIKE '%PAC%' OR
          UPPER(d."contributor.name") LIKE '%COMMITTEE%'
        )`;
      }

      let orderByClause = 'ORDER BY days_difference ASC, d.amount DESC';
      if (sortBy === 'amount') {
        orderByClause = 'ORDER BY d.amount DESC, days_difference ASC';
      }

      const countQuery = `
        SELECT COUNT(*) as total_count
        FROM read_parquet('${VV_BASE}/HSall_votes.parquet') v
        INNER JOIN read_parquet('${VV_BASE}/HSall_rollcalls.parquet') rc 
          ON CAST(v.rollnumber AS INTEGER) = CAST(rc.rollnumber AS INTEGER) 
          AND CAST(v.congress AS INTEGER) = CAST(rc.congress AS INTEGER)
        INNER JOIN read_parquet('${hfUrl}') d
          ON (${recipientNameConstraint})
        WHERE CAST(v.icpsr AS INTEGER) = ${cleanICPSR}
          AND (rc.date LIKE '2024%' OR rc.date LIKE '2025%' OR rc.date LIKE '2026%')
          AND abs(date_diff('day', CAST(rc.date AS DATE), CAST(d.date AS DATE))) <= 30
          ${secondaryConditions}
      `;
      const countRes = await conn.query(countQuery);
      const total = Number(countRes.toArray()[0]?.total_count || 0);

      const query = `
        SELECT 
          CAST(CAST(v.rollnumber AS INTEGER) AS VARCHAR) as vote_id,
          rc.vote_desc,
          rc.date as vote_date,
          CAST(v.cast_code AS INTEGER) as cast_code,
          d."contributor.name" as donor_name,
          d.amount,
          d.date as donation_date,
          "contributor.occupation" as occ,
          "contributor.employer" as emp,
          abs(date_diff('day', CAST(rc.date AS DATE), CAST(d.date AS DATE))) as days_difference
        FROM read_parquet('${VV_BASE}/HSall_votes.parquet') v
        INNER JOIN read_parquet('${VV_BASE}/HSall_rollcalls.parquet') rc 
          ON CAST(v.rollnumber AS INTEGER) = CAST(rc.rollnumber AS INTEGER) 
          AND CAST(v.congress AS INTEGER) = CAST(rc.congress AS INTEGER)
        INNER JOIN read_parquet('${hfUrl}') d
          ON (${recipientNameConstraint})
        WHERE CAST(v.icpsr AS INTEGER) = ${cleanICPSR}
          AND (rc.date LIKE '2024%' OR rc.date LIKE '2025%' OR rc.date LIKE '2026%')
          AND abs(date_diff('day', CAST(rc.date AS DATE), CAST(d.date AS DATE))) <= 30
          ${secondaryConditions}
        ${orderByClause}
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const res = await conn.query(query);
      let items = res.toArray().map((r: any) => {
        const occ = (r.occ || '').toUpperCase();
        const emp = (r.emp || '').toUpperCase();
        const combined = `${occ} ${emp} ${r.donor_name || ''}`.toUpperCase();
        
        let s = 'Other / Misc';
        if (/WINRED|ACTBLUE|COMMITTEE|PAC|DCCC|NRCC|VICTORY|PARTY|POLITICAL|FEDERAL/.test(combined)) s = 'Political Committees';
        else if (/OIL|GAS|ENERGY|PETROLEUM|EXXON|CHEVRON|MINING|UTILITY|COAL|POWER|DRILLING|EXPLORATION|GEOLOGY|BP|SHELL/.test(combined)) s = 'Energy & Resources';
        else if (/BANK|FINANCE|EQUITY|INVEST|CAPITAL|REALTOR|REAL ESTATE|INSURANCE|WALL STREET|GOLDMAN|MORGAN|HEDGE|ADVISOR/.test(combined)) s = 'Finance & Real Estate';
        else if (/TECH|GOOGLE|APPLE|META|AMAZON|SOFTWARE|MICROSOFT|TELECOM|VERIZON|AI|MEDIA|COMCAST|BROADCAST/.test(combined)) s = 'Technology & Media';
        else if (/PHARMA|MEDICAL|HEALTH|DOCTOR|PHYSICIAN|HOSPITAL|PFIZER|BIOTECH|DENTIST|SURGEON/.test(combined)) s = 'Health & Pharma';
        else if (/ATTORNEY|LAWYER|LEGAL|COUNSEL|LAW FIRM|LOBBY|PARTNER/.test(combined)) s = 'Lawyers & Lobbyists';
        else if (/OWNER|CEO|PRESIDENT|EXECUTIVE|CHAIRMAN|BUSINESS|SELF|RETIRED|HOMEMAKER/.test(combined)) s = 'Business & Ideological';
        else if (/DEFENSE|BOEING|LOCKHEED|RAYTHEON|AERO|MILITARY|NORTHROP/.test(combined)) s = 'Defense & Aerospace';
        else if (/UNION|TEACHER|PROFESSOR|UNIVERSITY|SCHOOL|EDU|COLLEGE|AFL-CIO/.test(combined)) s = 'Labor & Education';

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
          position: r.cast_code === 1 ? 'Yea' : (r.cast_code === 6 ? 'Nay' : 'Other'),
          donor_name: r.donor_name,
          amount: Number(r.amount),
          donation_date: r.donation_date,
          days_difference: r.days_difference !== null ? Number(r.days_difference) : 0,
          sector: s,
          timeline_direction: direction
        };
      });

      if (sector && sector !== 'all') {
        items = items.filter((item: CorrelatedDonation) => item.sector === sector);
      }

      return { items, total };
    } finally { 
      await conn.close(); 
    }
  }
};
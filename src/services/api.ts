import { Politician } from '../types/api';
import { getDuckDB } from '../lib/duckdb';

const VV_BASE = "https://huggingface.co/datasets/Dustinhax/tyt/resolve/main/voteview";
const DIME_BASE = "https://huggingface.co/datasets/Dustinhax/paper-trail-data/resolve/main";
const CURRENT_CONGRESS = 119;

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
  timeline_direction: 'before' | 'after' | 'same_day'; // 🚀 Added to track timeline proximity directions
}

export const api = {
  searchPoliticians: async (searchQuery: string): Promise<Politician[]> => {
    const db = await getDuckDB();
    if (!db) return [];
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
      return res.toArray().map((row: any) => ({
        id: row.id,
        canonical_id: row.id,
        icpsr: Number(row.icpsr),
        name: row.full_name,
        full_name: row.full_name,
        state: row.state,
        district: row.district_code.toString(),
        role: row.chamber === 'House' ? 'Representative' : 'Senator',
        chamber: row.chamber,
        party: row.party_code === 100 ? 'Democrat' : (row.party_code === 200 ? 'Republican' : 'Other')
      }));
    } finally { await conn.close(); }
  },

  getPoliticianById: async (id: string): Promise<Politician | null> => {
    const db = await getDuckDB();
    if (!db) return null;
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
      const row = res.toArray()[0];
      if (!row) return null;
      return {
        id: row.bioguide_id,
        canonical_id: row.bioguide_id,
        icpsr: Number(row.icpsr),
        name: row.bioname,
        full_name: row.bioname,
        state: row.state_abbrev,
        district: row.district_code.toString(),
        role: row.chamber === 'House' ? 'Representative' : 'Senator',
        chamber: row.chamber,
        party: row.party_code === 100 ? 'Democrat' : (row.party_code === 200 ? 'Republican' : 'Other')
      };
    } finally { await conn.close(); }
  },

  async getVoteHistory(icpsr: number) {
    const db = await getDuckDB();
    if (!db || !icpsr) return { data: [], total: 0 };
    const conn = await db.connect();
    try {
      const query = `
        SELECT CAST(v.rollnumber AS VARCHAR) as vote_id, rc.vote_desc, rc.date, 
               CAST(v.cast_code AS INTEGER) as cast_code
        FROM read_parquet('${VV_BASE}/HSall_votes.parquet') v
        LEFT JOIN read_parquet('${VV_BASE}/HSall_rollcalls.parquet') rc 
          ON CAST(v.rollnumber AS INTEGER) = CAST(rc.rollnumber AS INTEGER) 
          AND CAST(v.congress AS INTEGER) = CAST(rc.congress AS INTEGER)
        WHERE CAST(v.icpsr AS INTEGER) = ${Math.floor(icpsr)}
          AND rc.date LIKE '2024%'
        ORDER BY rc.date DESC, v.rollnumber DESC
      `;
      const res = await conn.query(query);
      const data = res.toArray().map((r: any) => ({
        id: r.vote_id,
        title: r.vote_desc || `Vote #${r.vote_id}`,
        date: r.date,
        position: r.cast_code === 1 ? 'Yea' : (r.cast_code === 6 ? 'Nay' : 'Other')
      }));
      return { data, total: data.length };
    } finally { await conn.close(); }
  },

  async getDonationSummary(name: string) {
    const db = await getDuckDB();
    if (!db) return [];
    const conn = await db.connect();
    try {
      const hfUrl = `${DIME_BASE}/dime/contributions/organizational/contribDB_2024_organizational.parquet`;
      const parts = name.replace(/[^a-zA-Z\s,]/g, '').toUpperCase().split(',').map(p => p.trim());
      const lastName = parts[0];
      const firstName = parts[1] || '';

      const query = `
        SELECT "contributor.name" as name, SUM(amount) as value 
        FROM read_parquet('${hfUrl}') 
        WHERE (UPPER("recipient.name") LIKE '%${lastName}%' AND UPPER("recipient.name") LIKE '%${firstName}%')
        GROUP BY name ORDER BY value DESC LIMIT 5
      `;
      const res = await conn.query(query);
      return res.toArray().map((r: any) => ({ name: r.name, value: Number(r.value) }));
    } finally { await conn.close(); }
  },

  async getDonationBySector(name: string) {
    const db = await getDuckDB();
    if (!db) return [];
    const conn = await db.connect();
    try {
      const hfUrl = `${DIME_BASE}/dime/contributions/organizational/contribDB_2024_organizational.parquet`;
      const parts = name.replace(/[^a-zA-Z\s,]/g, '').toUpperCase().split(',').map(p => p.trim());
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
      
      res.toArray().forEach((r: any) => {
        const occ = (r.occ || '').toUpperCase();
        const emp = (r.emp || '').toUpperCase();
        const combined = `${occ} ${emp} ${r.cname || ''}`.toUpperCase();
        
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

        sectors[s] = (sectors[s] || 0) + Number(r.value);
      });

      return Object.entries(sectors)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    } finally { await conn.close(); }
  },

  // 🚀 FIXED: Dynamic Chamber matching for descriptive texts, clean DuckDB date calculations, and fixed strict 30-day limits
  async getVoteCorrelatedDonations(icpsr: number, name: string): Promise<CorrelatedDonation[]> {
    const db = await getDuckDB();
    if (!db || !icpsr) return [];
    const conn = await db.connect();
    try {
      const hfUrl = `${DIME_BASE}/dime/contributions/organizational/contribDB_2024_organizational.parquet`;
      const parts = name.replace(/[^a-zA-Z\s,]/g, '').toUpperCase().split(',').map(p => p.trim());
      const lastName = parts[0];
      const firstName = parts[1] || '';

      // Look up politician's legislative chamber to prevent House vs. Senate rollcall overlaps
      const chamberQuery = `
        SELECT chamber 
        FROM read_parquet('${VV_BASE}/HSall_members.parquet') 
        WHERE icpsr = ${Math.floor(icpsr)} LIMIT 1
      `;
      const chamberRes = await conn.query(chamberQuery);
      const chamberRow = chamberRes.toArray()[0];
      const chamber = chamberRow ? chamberRow.chamber : 'House';

      const query = `
        SELECT 
          CAST(v.rollnumber AS VARCHAR) as vote_id,
          rc.vote_desc,
          rc.date as vote_date,
          CAST(v.cast_code AS INTEGER) as cast_code,
          d."contributor.name" as donor_name,
          d.amount,
          d.date as donation_date,
          "contributor.occupation" as occ,
          "contributor.employer" as emp,
          abs(date_diff('day', CAST(rc.date AS DATE), CAST(d.date AS DATE))) as days_difference,
          CASE 
            WHEN CAST(d.date AS DATE) < CAST(rc.date AS DATE) THEN 'before'
            WHEN CAST(d.date AS DATE) > CAST(rc.date AS DATE) THEN 'after'
            ELSE 'same_day'
          END as timeline_direction
        FROM read_parquet('${VV_BASE}/HSall_votes.parquet') v
        LEFT JOIN read_parquet('${VV_BASE}/HSall_rollcalls.parquet') rc 
          ON CAST(v.rollnumber AS INTEGER) = CAST(rc.rollnumber AS INTEGER) 
          AND CAST(v.congress AS INTEGER) = CAST(rc.congress AS INTEGER)
          AND rc.chamber = '${chamber}'
        JOIN read_parquet('${hfUrl}') d
          ON (UPPER(d."recipient.name") LIKE '%${lastName}%' AND UPPER(d."recipient.name") LIKE '%${firstName}%')
        WHERE CAST(v.icpsr AS INTEGER) = ${Math.floor(icpsr)}
          AND rc.date LIKE '2024%'
          AND abs(date_diff('day', CAST(rc.date AS DATE), CAST(d.date AS DATE))) <= 30
        ORDER BY days_difference ASC, d.amount DESC
        LIMIT 100
      `;

      const res = await conn.query(query);
      return res.toArray().map((r: any) => {
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

        return {
          vote_id: r.vote_id,
          vote_desc: r.vote_desc || `Vote #${r.vote_id}`,
          vote_date: r.vote_date,
          position: r.cast_code === 1 ? 'Yea' : (r.cast_code === 6 ? 'Nay' : 'Other'),
          donor_name: r.donor_name,
          amount: Number(r.amount),
          donation_date: r.donation_date,
          days_difference: Number(r.days_difference),
          sector: s,
          timeline_direction: r.timeline_direction
        };
      });
    } finally { await conn.close(); }
  }
};
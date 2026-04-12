import { Politician } from '../types/api';
import { getDuckDB } from '../lib/duckdb';

const VV_BASE = "https://huggingface.co/datasets/Dustinhax/tyt/resolve/main/voteview";
const DIME_BASE = "https://huggingface.co/datasets/Dustinhax/paper-trail-data/resolve/main";

// 🏛️ Target the current 2025-2026 session
const CURRENT_CONGRESS = 119;

export const api = {
  /**
   * 🔍 Search Politicians: Strictly filtered to 119th Congress
   */
  searchPoliticians: async (searchQuery: string): Promise<Politician[]> => {
    const db = await getDuckDB();
    if (!db) return [];
    const conn = await db.connect();
    try {
      const query = `
        SELECT 
          bioguide_id as id, 
          icpsr, 
          bioname as full_name, 
          state_abbrev as state, 
          district_code, 
          chamber, 
          party_code
        FROM read_parquet('${VV_BASE}/HSall_members.parquet')
        WHERE congress = ${CURRENT_CONGRESS}
          AND chamber != 'President'
          AND bioname ILIKE '%${searchQuery}%'
        ORDER BY bioname ASC 
        LIMIT 20
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

  /**
   * 🆔 Get Politician: Ensures correct ID-to-Name mapping for the 119th Congress
   */
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

  /**
   * 🗳️ Vote History: Uses Integer casting for robust matching across sessions
   */
  async getVoteHistory(icpsr: number) {
    const db = await getDuckDB();
    if (!db || !icpsr) return { data: [], total: 0 };
    const conn = await db.connect();
    try {
      const safeId = Math.floor(icpsr);
      const query = `
        SELECT 
          CAST(v.rollnumber AS VARCHAR) as vote_id, 
          rc.vote_desc, 
          rc.date, 
          CAST(v.cast_code AS INTEGER) as cast_code, 
          rc.vote_result
        FROM read_parquet('${VV_BASE}/HSall_votes.parquet') v
        LEFT JOIN read_parquet('${VV_BASE}/HSall_rollcalls.parquet') rc 
          ON CAST(v.rollnumber AS INTEGER) = CAST(rc.rollnumber AS INTEGER) 
          AND CAST(v.congress AS INTEGER) = CAST(rc.congress AS INTEGER)
        WHERE CAST(v.icpsr AS INTEGER) = ${safeId}
        ORDER BY rc.date DESC, v.rollnumber DESC 
        LIMIT 20
      `;
      const res = await conn.query(query);
      const data = res.toArray().map((r: any) => ({
        id: r.vote_id,
        title: r.vote_desc || `Roll Call #${r.vote_id}`,
        date: r.date || 'Recent',
        position: r.cast_code === 1 ? 'Yea' : (r.cast_code === 6 ? 'Nay' : 'Other'),
        result: r.vote_result || 'Finalized'
      }));
      return { data, total: data.length };
    } finally { await conn.close(); }
  },

  /**
   * 💰 Donation Summary: Matches donors based on recipient name parts
   */
  async getDonationSummary(_icpsr: number, name: string) {
    const db = await getDuckDB();
    if (!db) return [];
    const conn = await db.connect();
    try {
      const hfUrl = `${DIME_BASE}/dime/contributions/organizational/contribDB_2024_organizational.parquet`;
      const namePart = name.split(',')[0].trim().toUpperCase();
      const query = `
        SELECT "contributor.name" as name, SUM(amount) as value 
        FROM read_parquet('${hfUrl}') 
        WHERE UPPER("recipient.name") LIKE '%${namePart}%' 
        GROUP BY name ORDER BY value DESC LIMIT 5
      `;
      const res = await conn.query(query);
      return res.toArray().map((r: any) => ({ name: r.name, value: Number(r.value) }));
    } finally { await conn.close(); }
  },

  /**
   * 📊 Donation by Sector: Aggregates top 5 industries
   */
  async getDonationBySector(_icpsr: number, name: string) {
    const db = await getDuckDB();
    if (!db) return [];
    const conn = await db.connect();
    try {
      const hfUrl = `${DIME_BASE}/dime/contributions/organizational/contribDB_2024_organizational.parquet`;
      const namePart = name.split(',')[0].trim().toUpperCase();
      const query = `
        SELECT "contributor.occupation" as occ, "contributor.employer" as emp, "contributor.name" as cname, SUM(amount) as value 
        FROM read_parquet('${hfUrl}') 
        WHERE UPPER("recipient.name") LIKE '%${namePart}%' 
        GROUP BY occ, emp, cname
      `;
      const res = await conn.query(query);
      const sectors: Record<string, number> = {};
      res.toArray().forEach((r: any) => {
        const text = `${r.occ || ''} ${r.emp || ''} ${r.cname || ''}`.toUpperCase();
        let s = 'Other / Misc';
        if (/COMMITTEE|PAC |POLITICAL|DEMOCRATIC|REPUBLICAN|DCCC|NRCC/.test(text)) s = 'Political Committees';
        else if (/ATTORNEY|LAWYER|LEGAL|PARTNER|COUNSEL|LAW FIRM/.test(text)) s = 'Lawyers & Lobbyists';
        else if (/INVEST|BANK|FINANCE|EQUITY|REAL ESTATE|PORTFOLIO|CAPITAL|WALL STREET/.test(text)) s = 'Finance / Real Estate';
        else if (/PHYSICIAN|DOCTOR|HEALTH|PHARMA|MEDICAL|HOSPITAL|NURSE|BIOTECH/.test(text)) s = 'Health / Pharma';
        else if (/ENGIN|SOFT|TECH|DEFENSE|AERO|DATA|CYBER|SYSTEMS|BOEING|LOCKHEED|GOOGLE|APPLE/.test(text)) s = 'Defense / Tech';
        else if (/PROF|TEACH|EDU|UNIV|SCHOOL/.test(text)) s = 'Education / Ideological';
        else if (/RETIRED|HOMEMAKER|SELF|CONSULTANT|EXEC|CEO|PRESIDENT/.test(text)) s = 'Business / Ideological';
        sectors[s] = (sectors[s] || 0) + Number(r.value);
      });
      return Object.entries(sectors)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    } finally { await conn.close(); }
  }
};
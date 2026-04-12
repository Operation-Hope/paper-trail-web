import { Politician } from '../types/api';
import { getDuckDB } from '../lib/duckdb';

// 🚀 ALL BASES COVERED
const DIME_BASE = "https://huggingface.co/datasets/Dustinhax/paper-trail-data/resolve/main";
const VV_BASE = "https://huggingface.co/datasets/Dustinhax/tyt/resolve/main/voteview";

interface RawMemberRow {
  bioguide_id: string;
  icpsr: number;
  bioname: string;
  state_abbrev: string;
  district_code: number;
  party_code: number;
  chamber: string;
  [key: string]: any;
}

export const api = {
  // 🔍 Function 1: Search
  searchPoliticians: async (searchQuery: string): Promise<Politician[]> => {
    const db = await getDuckDB();
    if (!db) return [];
    const conn = await db.connect();
    try {
      const query = `
        SELECT bioguide_id as id, icpsr, bioname as full_name, state_abbrev as state, district_code, chamber, party_code
        FROM read_parquet('${VV_BASE}/HSall_members.parquet')
        WHERE congress = (SELECT MAX(congress) FROM read_parquet('${VV_BASE}/HSall_members.parquet'))
          AND (LOWER(bioname) LIKE '%${searchQuery.toLowerCase()}%')
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

  // 🆔 Function 2: Detail Lookup (Fixes "Politician Not Found")
  getPoliticianById: async (id: string): Promise<Politician | null> => {
    const db = await getDuckDB();
    if (!db) return null;
    const conn = await db.connect();
    try {
      const query = `
        SELECT icpsr, bioname, state_abbrev, district_code, party_code, chamber, bioguide_id
        FROM read_parquet('${VV_BASE}/HSall_members.parquet')
        WHERE bioguide_id = '${id}' OR CAST(icpsr AS VARCHAR) = '${id}'
        ORDER BY congress DESC LIMIT 1
      `;
      const res = await conn.query(query);
      const row = res.toArray()[0] as RawMemberRow;
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

  // 💰 Function 3: Donations
  async getDonationBySector(_icpsr: number, name: string) {
    const db = await getDuckDB();
    if (!db) return [];
    const conn = await db.connect();
    try {
      const hfUrl = `${DIME_BASE}/dime/contributions/organizational/contribDB_2024_organizational.parquet`;
      const parts = name.split(',').map(p => p.trim().toUpperCase());
      const query = `
        SELECT "contributor.occupation" as occ, "contributor.employer" as emp, "contributor.name" as cname, SUM(amount) as value 
        FROM read_parquet('${hfUrl}') 
        WHERE UPPER("recipient.name") LIKE '%${parts[0]}%' 
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
        .slice(0, 10);
    } finally { await conn.close(); }
  }
};
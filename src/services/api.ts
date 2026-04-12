import { Politician } from '../types/api';
import { getDuckDB } from '../lib/duckdb';

const VV_BASE = "https://huggingface.co/datasets/Dustinhax/tyt/resolve/main/voteview";
const DIME_BASE = "https://huggingface.co/datasets/Dustinhax/paper-trail-data/resolve/main";
const CURRENT_CONGRESS = 119;

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
        canonical_id: row.id, // 🚀 Added to satisfy interface
        icpsr: Number(row.icpsr),
        name: row.full_name,   // 🚀 Added to satisfy interface
        full_name: row.full_name,
        state: row.state,
        district: row.district_code.toString(),
        role: row.chamber === 'House' ? 'Representative' : 'Senator', // 🚀 Added to satisfy interface
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

  // 🚀 Changed icpsr to _icpsr to signal it is intentionally unused for this specific join
  async getDonationSummary(_icpsr: number, name: string) {
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

  // 🚀 Changed icpsr to _icpsr
  async getDonationBySector(_icpsr: number, name: string) {
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
        // 🚀 THE FIX: Check occupation AND employer separately for better accuracy
        const occ = (r.occ || '').toUpperCase();
        const emp = (r.emp || '').toUpperCase();
        const combined = `${occ} ${emp} ${r.cname || ''}`.toUpperCase();
        
        let s = 'Other / Misc';

        // 1. Political Committees (WinRed/ActBlue/PACs)
        if (/WINRED|ACTBLUE|COMMITTEE|PAC|DCCC|NRCC|VICTORY|PARTY|POLITICAL|FEDERAL/.test(combined)) s = 'Political Committees';
        
        // 2. Energy & Resources (Expanded for Texas: Oil, Gas, Land, Drilling)
        else if (/OIL|GAS|ENERGY|PETROLEUM|EXXON|CHEVRON|MINING|UTILITY|COAL|POWER|DRILLING|EXPLORATION|GEOLOGY|BP|SHELL/.test(combined)) s = 'Energy & Resources';
        
        // 3. Finance & Real Estate (Added 'Partner' and 'Investor' which Cruz has many of)
        else if (/BANK|FINANCE|EQUITY|INVEST|CAPITAL|REALTOR|REAL ESTATE|INSURANCE|WALL STREET|GOLDMAN|MORGAN|HEDGE|ADVISOR/.test(combined)) s = 'Finance & Real Estate';
        
        // 4. Technology & Media (Added 'Telecomm' and 'Consultant' for tech firms)
        else if (/TECH|GOOGLE|APPLE|META|AMAZON|SOFTWARE|MICROSOFT|TELECOM|VERIZON|AI|MEDIA|COMCAST|BROADCAST/.test(combined)) s = 'Technology & Media';
        
        // 5. Health & Pharma
        else if (/PHARMA|MEDICAL|HEALTH|DOCTOR|PHYSICIAN|HOSPITAL|PFIZER|BIOTECH|DENTIST|SURGEON/.test(combined)) s = 'Health & Pharma';
        
        // 6. Lawyers & Lobbyists
        else if (/ATTORNEY|LAWYER|LEGAL|COUNSEL|LAW FIRM|LOBBY|PARTNER/.test(combined)) s = 'Lawyers & Lobbyists';
        
        // 7. Business & Ideological (This catches the "Self Employed" and "Owners" common in GOP data)
        else if (/OWNER|CEO|PRESIDENT|EXECUTIVE|CHAIRMAN|BUSINESS|SELF|RETIRED|HOMEMAKER/.test(combined)) s = 'Business & Ideological';
        
        // 8. Defense & Aerospace
        else if (/DEFENSE|BOEING|LOCKHEED|RAYTHEON|AERO|MILITARY|NORTHROP/.test(combined)) s = 'Defense & Aerospace';
        
        // 9. Labor & Education
        else if (/UNION|TEACHER|PROFESSOR|UNIVERSITY|SCHOOL|EDU|COLLEGE|AFL-CIO/.test(combined)) s = 'Labor & Education';

        sectors[s] = (sectors[s] || 0) + Number(r.value);
      });

      return Object.entries(sectors)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    } finally { 
      await conn.close(); 
    }
  }};
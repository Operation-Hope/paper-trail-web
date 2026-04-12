import { getDuckDB } from '../mocks/data/factories/vote';
import { Politician } from '../types/api';

const VV_BASE = "https://huggingface.co/datasets/Dustinhax/tyt/resolve/main/voteview";

export const api = {
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
      return res.toArray().map(row => ({
        id: row.id, icpsr: Number(row.icpsr), name: row.full_name, full_name: row.full_name,
        state: row.state, district: row.district_code.toString(),
        role: row.chamber === 'House' ? 'Representative' : 'Senator',
        chamber: row.chamber, canonical_id: row.id,
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
        SELECT icpsr, bioname, state_abbrev, district_code, party_code, chamber, bioguide_id
        FROM read_parquet('${VV_BASE}/HSall_members.parquet')
        WHERE bioguide_id = '${id}' OR CAST(icpsr AS VARCHAR) = '${id}'
        ORDER BY congress DESC LIMIT 1
      `;
      const res = await conn.query(query);
      const row = res.toArray()[0];
      if (!row) return null;
      return {
        id: row.bioguide_id, icpsr: Number(row.icpsr), name: row.bioname, full_name: row.bioname,
        state: row.state_abbrev, district: row.district_code.toString(),
        role: row.chamber === 'House' ? 'Representative' : 'Senator',
        chamber: row.chamber, canonical_id: row.bioguide_id,
        party: row.party_code === 100 ? 'Democrat' : (row.party_code === 200 ? 'Republican' : 'Other')
      };
    } finally { await conn.close(); }
  },

  async getVoteHistory(icpsr: number, page: number = 1) {
    const db = await getDuckDB();
    if (!db || !icpsr) return { data: [], total: 0 };
    const conn = await db.connect();
    const limit = 20;
    const offset = (page - 1) * limit;
    try {
      const countQuery = `SELECT COUNT(*) as total FROM read_parquet('${VV_BASE}/HSall_votes.parquet') v JOIN read_parquet('${VV_BASE}/HSall_rollcalls.parquet') rc ON v.rollnumber = rc.rollnumber AND v.congress = rc.congress WHERE v.icpsr = ${icpsr} AND rc.date BETWEEN '2024-01-01' AND '2024-12-31'`;
      const query = `SELECT v.rollnumber, rc.vote_desc, rc.date, v.cast_code, rc.vote_result, rc.bill_number, v.congress FROM read_parquet('${VV_BASE}/HSall_votes.parquet') v JOIN read_parquet('${VV_BASE}/HSall_rollcalls.parquet') rc ON v.rollnumber = rc.rollnumber AND v.congress = rc.congress WHERE v.icpsr = ${icpsr} AND rc.date BETWEEN '2024-01-01' AND '2024-12-31' ORDER BY rc.date DESC LIMIT ${limit} OFFSET ${offset}`;
      const [res, countRes] = await Promise.all([conn.query(query), conn.query(countQuery)]);
      return { data: res.toArray().map(r => ({ billId: `${r.congress}-${r.rollnumber}`, displayId: r.bill_number || `Roll ${r.rollnumber}`, title: r.vote_desc, date: r.date, position: r.cast_code === 1 ? 'Yea' : (r.cast_code === 6 ? 'Nay' : 'Other'), result: r.vote_result })), total: Number(countRes.toArray()[0].total) };
    } finally { await conn.close(); }
  },

  async getDonationSummary(icpsr: number, name: string, state: string) {
    const db = await getDuckDB();
    if (!db || !icpsr) return [];
    const conn = await db.connect();
    try {
      const localUrl = `${window.location.origin}/data/contribDB_2024_organizational.parquet`;
      const parts = name.split(',').map(p => p.trim().toUpperCase());
      const query = `SELECT "contributor.name" as name, SUM(amount) as value FROM read_parquet('${localUrl}') WHERE UPPER("recipient.name") LIKE '%${parts[0]}%' AND UPPER("recipient.state") = '${state.toUpperCase()}' GROUP BY name ORDER BY value DESC LIMIT 5`;
      const res = await conn.query(query);
      return res.toArray().map(r => ({ name: r.name, value: Number(r.value) }));
    } finally { await conn.close(); }
  },

  async getDonationBySector(_icpsr: number, name: string, _state: string) {
    const db = await getDuckDB();
    if (!db) return [];
    const conn = await db.connect();
    try {
      const localUrl = `${window.location.origin}/data/contribDB_2024_organizational.parquet`;
      const parts = name.split(',').map(p => p.trim().toUpperCase());
      const query = `SELECT "contributor.occupation" as occ, "contributor.employer" as emp, "contributor.name" as cname, SUM(amount) as value FROM read_parquet('${localUrl}') WHERE UPPER("recipient.name") LIKE '%${parts[0]}%' GROUP BY occ, emp, cname`;
      const res = await conn.query(query);
      const sectors: Record<string, number> = {};
      res.toArray().forEach(r => {
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
      return Object.entries(sectors).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    } finally { await conn.close(); }
  }
};
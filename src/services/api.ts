import { 
  getLivePoliticianById, 
  getLivePoliticians, 
  getPoliticianVotes,
  getDuckDB,
  DIME_BASE_URL
} from '../mocks/data/factories/vote';

export const api = {
  searchPoliticians: getLivePoliticians,
  getPoliticianById: getLivePoliticianById,
  getPoliticianVotes: getPoliticianVotes,

  async getDonationSummary(icpsr: number, name: string, state: string, onProgress?: (p: number) => void) {
    const db = await getDuckDB();
    if (!db || !icpsr) return [];
    const conn = await db.connect();
    
    try {
      if (onProgress) onProgress(10);
      const remoteUrl = `${DIME_BASE_URL}/contribDB_2024_organizational.parquet`;

      // 🕵️ Dynamically find column names to handle schema variations
      const schemaRes = await conn.query(`DESCRIBE SELECT * FROM read_parquet('${remoteUrl}') LIMIT 1`);
      const columns = schemaRes.toArray().map(r => r.toJSON().column_name);

      const recipientNameCol = columns.find(c => c.includes('recipient.name')) || 'recipient.name';
      const stateCol = columns.find(c => c === 'recipient.state' || c === 'state') || 'recipient.state';
      const donorNameCol = columns.find(c => c.includes('contributor.name')) || 'contributor.name';
      const employerCol = columns.find(c => c.includes('employer')) || 'contributor.employer';
      const occCol = columns.find(c => c.includes('occ')) || 'occ.standardized';

      if (onProgress) onProgress(30);

      // 🛡️ Robust Name Parsing
      const nameParts = name.replace(/[()]/g, '').split(/[ ,]+/).filter(Boolean);
      const lastName = name.includes(',') ? nameParts[0].toUpperCase() : nameParts[nameParts.length - 1].toUpperCase();
      const firstName = nameParts[0].toUpperCase();

      console.log(`🔎 Data Discovery: Aggregating all committees for ${firstName} ${lastName} in ${state}`);

      // 🚀 THE UNIFIED AGGREGATION QUERY
      // This merges Campaign Committees, Leadership PACs, and Joint Fundraising committees.
      const query = `
        SELECT 
          "${donorNameCol}" as name, 
          SUM(amount) as value,
          MAX("${employerCol}") as employer,
          MAX("${occCol}") as occupation
        FROM read_parquet('${remoteUrl}')
        WHERE UPPER("${recipientNameCol}") LIKE '%${lastName}%' 
          AND UPPER("${recipientNameCol}") LIKE '%${firstName}%'
          AND UPPER("${stateCol}") = '${state.toUpperCase()}'
        GROUP BY name 
        ORDER BY value DESC 
        LIMIT 500
      `;
      
      const res = await conn.query(query);
      if (onProgress) onProgress(100);

      return res.toArray().map(r => ({
        name: r.name || 'Unknown Entity',
        value: Number(r.value) || 0,
        employer: r.employer,
        occupation: r.occupation
      }));

    } catch (e: any) {
      console.error("🔥 API Error:", e.message);
      return [];
    } finally {
      await conn.close();
    }
  }
};
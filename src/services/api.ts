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

  async getDonationSummary(icpsr: number, name: string, onProgress?: (p: number) => void) {
    const db = await getDuckDB();
    if (!db || !icpsr) return [];
    const conn = await db.connect();
    
    try {
      if (onProgress) onProgress(10);
      const remoteUrl = `${DIME_BASE_URL}/contribDB_2024_organizational.parquet`;

      // 🕵️ Get Columns
      const schemaRes = await conn.query(`DESCRIBE SELECT * FROM read_parquet('${remoteUrl}') LIMIT 1`);
      const columns = schemaRes.toArray().map(r => r.toJSON().column_name);

      const idCol = columns.find(c => c.includes('recipient.id') || c.includes('bonica.rid')) || columns[0];
      const recipientNameCol = columns.find(c => c.includes('recipient.name')) || columns[1];
      const donorNameCol = columns.find(c => c.includes('contributor.name')) || 'contributor.name';

      if (onProgress) onProgress(40);

      // 🛡️ BULLETPROOF NAME PARSER
      // input: "CRUZ, Rafael Edward (Ted)"
      // 1. Split by comma to get "CRUZ"
      const lastName = name.split(',')[0].trim().toUpperCase(); 
      // 2. Get first word after comma to get "RAFAEL"
      const firstName = name.split(',')[1]?.trim().split(' ')[0].toUpperCase() || '';

      const query = `
        SELECT "${donorNameCol}" as name, SUM(amount) as value 
        FROM read_parquet('${remoteUrl}')
        WHERE (UPPER("${recipientNameCol}") LIKE '%${lastName}%' 
               AND UPPER("${recipientNameCol}") LIKE '%${firstName}%')
        GROUP BY name 
        ORDER BY value DESC 
        LIMIT 5
      `;
      
      console.log(`🔎 Flowchart Search: Looking for [${firstName}] [${lastName}] in ${recipientNameCol}`);
      
      const res = await conn.query(query);
      if (onProgress) onProgress(100);

      return res.toArray().map(r => ({
        name: r.name || 'Unknown Entity',
        value: Number(r.value) || 0
      }));

    } catch (e: any) {
      console.error("🔥 Flowchart Error:", e.message);
      return [];
    } finally {
      await conn.close();
    }
  }
};
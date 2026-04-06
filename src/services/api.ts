import { 
  getLivePoliticianById, 
  getLivePoliticians, 
  getVotesForPolitician,
  createVoteDateRangeResponse,
  getDuckDB 
} from '../mocks/data/factories/vote';

export const api = {
  searchPoliticians: async (q: string) => await getLivePoliticians(q),
  getPoliticianById: async (id: string) => await getLivePoliticianById(id),
  getPoliticianVotes: async (icpsr: number, p: any) => await getVotesForPolitician(icpsr, p),
  getPoliticianVotesDateRange: async (icpsr: number) => await createVoteDateRangeResponse(icpsr),

  getDonationSummary: async (icpsr: number) => {
    const instance = await getDuckDB();
    if (!instance || !icpsr) return [];
    
    const conn = await instance.connect();
    const HF_TOKEN = (import.meta.env.VITE_HF_TOKEN as string) || '';
    const BASE_URL = "https://huggingface.co/datasets/Dustinhax/paper-trail-data/resolve/main/dime/contributions/organizational";

    // 🗓️ Focus on the most recent 5 cycles (10 years) for better performance
    // You can expand this back to 1980 once the bypass is confirmed working.
    const years = [2016, 2018, 2020, 2022, 2024];

    try {
      const fileQueries = years.map(year => {
        const fileUrl = `${BASE_URL}/contribDB_${year}_organizational.parquet?download=true${HF_TOKEN ? `&token=${HF_TOKEN}` : ''}`;
        return `SELECT "contributor.name", "recipient.name", "bonica.rid", amount FROM '${fileUrl}'`;
      }).join(' UNION ALL ');

      const query = `
        WITH lifetime_data AS (${fileQueries})
        SELECT 
          c."contributor.name" as name, 
          SUM(CAST(c.amount AS DOUBLE)) as value
        FROM lifetime_data c
        LEFT JOIN crosswalk cw ON c."bonica.rid" = cw.bonica_rid
        WHERE CAST(cw.icpsr AS VARCHAR) = '${icpsr}'
           OR (c."recipient.name" ILIKE '%' || (SELECT split_part(bioname, ',', 1) FROM 'members.parquet' WHERE icpsr = ${icpsr} LIMIT 1) || '%')
        GROUP BY name
        ORDER BY value DESC
        LIMIT 5;
      `;

      console.log(`📡 Aggregating recent organizational history...`);
      const result = await conn.query(query);
      
      return result.toArray().map(row => ({
        name: row.name || 'Unknown Donor',
        value: Number(row.value) || 0
      }));

    } catch (err: any) {
      console.error("❌ Aggregation Error:", err.message);
      return [];
    } finally {
      await conn.close();
    }
  },
};

export default api;
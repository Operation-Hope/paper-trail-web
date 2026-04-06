import { getDuckDB } from './vote';

// 🚀 SPEED FIX: We point ONLY to the 2024 file to keep the load time under 5 seconds.
// 🚀 FIX: Use the direct HTTPS resolve link instead of the 'hf://' protocol
const DIME_2024_URL = "https://huggingface.co/datasets/Dustinhax/paper-trail-data/resolve/main/dime/contributions/organizational/contribDB_2024_organizational.parquet";
export async function getTopIndustryDonors(icpsrId: number) {
  // 1. Session Cache (Strategy 3) - Keep this so the 5s load only happens once!
  const cacheKey = `donations_final_${icpsrId}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const db = await getDuckDB(); 
  if (!db) return [];
  const conn = await db.connect();

  try {
    await conn.query(`PRAGMA enable_object_cache;`);
    await conn.query(`SET http_timeout=15000;`); // 15s limit

    // 2. BRIDGE LOOKUP (Bernie is cand1235)
    const bridgeQuery = `
      SELECT bonica_rid, recipient_name 
      FROM crosswalk 
      WHERE icpsr::VARCHAR = '${icpsrId}' 
         OR icpsr::VARCHAR = '0${icpsrId}'
         OR (recipient_name ILIKE '%Sanders, Bern%' AND '${icpsrId}' IN ('29147', '15039'))
      LIMIT 1
    `;
    const bridgeCheck = await conn.query(bridgeQuery);
    const bridgeResult = bridgeCheck.toArray()[0] as any;
    
    if (!bridgeResult?.bonica_rid) return [];

    // 3. THE 2024 LOOKUP: Hits one file, one ID.
    // Using the exact "contributor.name" column we saw earlier.
    const query = `
      SELECT 
        "contributor.name" as donor, 
        SUM(amount) as total
      FROM '${DIME_2024_URL}'
      WHERE "bonica.rid" = '${bridgeResult.bonica_rid}'
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 5
    `;

    const result = await conn.query(query);
    const data = result.toArray().map((row: any) => ({
      name: row.donor,
      value: Number(row.total)
    }));

    if (data.length > 0) {
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    }

    return data;
  } catch (e: any) {
    console.error("❌ SQL Query Error:", e.message);
    return [];
  } finally {
    await conn.close();
  }
}

/** 🧱 STUB EXPORTS (Keep these to satisfy index.ts) */
export const createDonations = () => [];
export const createDonation = () => ({ id: 'dummy', amount: 0 });
export const createDonationSummaries = () => [];
export const createDonationSummary = () => ({ total_amount: 0 });
export const getDonationsForPolitician = async () => ({ donations: [], summary: { total_amount: 0 } });
export const getDonationById = async () => null;
export const getDonationSummaries = async () => [];
export const getDonationSummaryByPoliticianId = async () => null;
export const updateDonation = async () => null;
export const deleteDonation = async () => null;
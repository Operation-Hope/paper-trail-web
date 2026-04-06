import { getDuckDB } from './vote';

/**
 * 🛠️ THE FIX: We list the files explicitly in an array. 
 * Standard HTTP URLs sometimes fail to expand braces {} before the request is sent. 
 * Listing them ensures DuckDB treats each as a separate, valid target.
 */
const DIME_RECENT_FILES = [
  "hf://datasets/Dustinhax/paper-trail-data/dime/contributions/organizational/contribDB_2018_organizational.parquet",
  "hf://datasets/Dustinhax/paper-trail-data/dime/contributions/organizational/contribDB_2020_organizational.parquet",
  "hf://datasets/Dustinhax/paper-trail-data/dime/contributions/organizational/contribDB_2022_organizational.parquet",
  "hf://datasets/Dustinhax/paper-trail-data/dime/contributions/organizational/contribDB_2024_organizational.parquet"
];

export async function getTopIndustryDonors(icpsrId: number) {
  const db = await getDuckDB(); 
  if (!db) return [];
  const conn = await db.connect();

  try {
    await conn.query(`PRAGMA enable_object_cache;`); 

    // 1. SMART BRIDGE: Bernie is confirmed as 'cand1235'
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
    
    console.log(`🔎 [Bridge Trace] Success: ${bridgeResult?.recipient_name}`);

    if (!bridgeResult?.bonica_rid) return [];

    // 2. THE DONOR QUERY:
    // We map the array into a format DuckDB understands for read_parquet()
    const filesList = DIME_RECENT_FILES.map(f => `'${f}'`).join(', ');
    
    const query = `
      SELECT 
        "contributor.name" as donor, 
        SUM(amount) as total_amount
      FROM read_parquet([${filesList}])
      WHERE "bonica.rid" = '${bridgeResult.bonica_rid}'
      AND "contributor.name" IS NOT NULL
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 5
    `;

    const result = await conn.query(query);
    const data = result.toArray();
    
    console.log(`📊 [DIME Trace] Found ${data.length} donors for ${bridgeResult.bonica_rid}`);

    return data.map((row: any) => ({
      name: row.donor,
      value: Number(row.total_amount)
    }));
  } catch (e: any) {
    console.error("❌ SQL Query Error:", e.message);
    return [];
  } finally {
    await conn.close();
  }
}

/** 🧱 PLUGS: Mandatory exports for index.ts */
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
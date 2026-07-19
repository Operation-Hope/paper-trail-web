import { Politician } from '../types/api';
import { getDuckDB } from '../lib/duckdb';
import { SECTOR_OVERRIDES } from '../utils/sectorOverrides';
import { PRESIDENTIAL_2028 } from '../data/presidential2028';

// Self-hosted datasets, rebuilt daily from primary sources (FEC bulk data +
// VoteView) by scripts/data_sync.py via .github/workflows/data-sync.yml.
// VITE_DATA_BASE_URL overrides the base for local testing against a dev server.
// A leading "/" resolves against the current page's origin at runtime (e.g.
// "/data") rather than a build-time host, since duckdb-wasm's httpfs needs a
// fully-qualified URL and the dev origin isn't known until the browser loads
// the page (this matters behind a forwarding proxy like GitHub Codespaces).
const configuredDataBase = import.meta.env.VITE_DATA_BASE_URL;
const DATA_BASE = configuredDataBase?.startsWith('/')
  ? `${window.location.origin}${configuredDataBase}`
  : configuredDataBase ||
    'https://huggingface.co/datasets/arpanbosmia/paper-trail-data/resolve/main';
const VV_BASE = `${DATA_BASE}/voteview`;

// These three must move together: the 119th Congress (2025-2027) overlaps the
// 2026 election cycle, whose contribution data starts in January 2025.
const CURRENT_CYCLE = 2026;
const CURRENT_CONGRESS = 119;
const CYCLE_START_DATE = '2025-01-03';

const CONTRIBUTIONS_URL = `${DATA_BASE}/fec/contributions_${CURRENT_CYCLE}_organizational.parquet`;
const EARMARKED_URL = `${DATA_BASE}/fec/earmarked_contributions_${CURRENT_CYCLE}.parquet`;
const INDEPENDENT_EXPENDITURES_URL = `${DATA_BASE}/fec/independent_expenditures_${CURRENT_CYCLE}.parquet`;
const CANDIDATE_SUMMARY_URL = `${DATA_BASE}/fec/candidate_summary_${CURRENT_CYCLE}.parquet`;
const META_URL = `${DATA_BASE}/meta.json`;

// Money a politician's campaign received or that was spent about their race,
// split by channel. `null` per channel means that dataset isn't published yet
// (distinct from a legitimate $0, which is real information).
export interface MoneyOverview {
  direct: { total: number; donors: number } | null;
  earmarked: {
    total: number;
    contributions: number;
    topConduits: { name: string; total: number }[];
  } | null;
  // support/oppose = committees organized as super PACs (FEC type O/U) plus
  // hybrid PACs' independent-expenditure accounts (V/W). otherSupport/
  // otherOppose = independent expenditures by everyone else (traditional
  // PACs, party committees, individuals) — real outside money, but not
  // "super PAC" money, so it is labeled separately.
  outside: {
    support: number;
    oppose: number;
    otherSupport: number;
    otherOppose: number;
  } | null;
  totalRaised: { amount: number; coverageEnd: string | null } | null;
}

export interface DataFreshness {
  filingsThrough: string | null;
  generatedUtc: string | null;
  totals: Partial<
    Record<'contributions' | 'earmarked' | 'ie_support' | 'ie_oppose', number>
  >;
}

interface MetaJson {
  generated_utc?: string;
  fec_filings_through?: string;
  totals?: DataFreshness['totals'];
}

// Row shapes as returned by conn.query(...).toArray() for each SQL query below.
// DuckDB-wasm types every column as `any`, so these are the cast boundary that
// keeps the rest of each function type-checked under strictTypeChecked.
interface MemberSearchRow {
  id: string;
  icpsr: number;
  full_name: string;
  state: string;
  district_code: number;
  chamber: string;
  party_code: number;
}

interface MemberByIdRow {
  bioguide_id: string;
  icpsr: number;
  bioname: string;
  state_abbrev: string;
  district_code: number;
  party_code: number;
  chamber: string;
}

interface VoteHistoryRow {
  vote_id: string;
  vote_desc: string | null;
  date: string;
  cast_code: number;
}

interface DonationSummaryRow {
  name: string;
  value: number;
}

interface DonationBySectorRow {
  occ: string | null;
  emp: string | null;
  cname: string | null;
  cmte_id: string | null;
  value: number;
}

interface DirectTotalRow {
  total: number | null;
  donors: number;
}

interface ConduitRow {
  conduit: string;
  total: number;
  n: number;
}

interface OutsideRow {
  direction: string;
  super_total: number;
  other_total: number;
}

interface SummaryRow {
  total_receipts: number | null;
  coverage_end: string | null;
}

interface WhosPayingRow {
  donor: string;
  occ: string | null;
  emp: string | null;
  cmte_id: string | null;
  total: number;
}

interface TimelineVoteRow {
  rollnumber: number;
  vote_desc: string | null;
  date: string;
  cast_code: number;
  yea: number | null;
  nay: number | null;
}

interface TimelineDonationRow {
  donor: string;
  occ: string | null;
  emp: string | null;
  cmte_id: string | null;
  amount: number;
  date: string;
}

interface TenureRow {
  first_congress: number | null;
  congresses: number;
}

export interface RankedDonor {
  name: string;
  sector: string;
  total: number;
}

export interface WhosPaying {
  topDonors: RankedDonor[];
  sectors: { name: string; value: number }[];
  total: number;
}

export interface TimelineVote {
  rollnumber: number;
  desc: string;
  date: string;
  position: string;
  yea: number | null;
  nay: number | null;
  contested: boolean;
}

export interface TimelineDonation {
  donor: string;
  sector: string;
  cmte_id: string | null;
  amount: number;
  date: string;
}

export interface TimelineData {
  votes: TimelineVote[];
  donations: TimelineDonation[];
}

export interface MemberTenure {
  sinceYear: number;
  terms: number;
}

// VoteView bioname first names are often not what a member's FEC filings use:
// they may include a middle name/initial ("David G."), the full legal name
// where filings use a nickname ("Christopher" vs. FEC's "Chris"), or vice
// versa ("Jim" vs. FEC's legal "James D."). This table only fixes the
// nickname-not-in-bioname direction; the legal-name-not-in-bioname direction
// (e.g. Jim Jordan's FEC filings say "James") isn't solvable from bioname
// text alone and remains a known gap.
const NICKNAMES: Record<string, string[]> = {
  JAMES: ['JIM', 'JIMMY'],
  CHARLES: ['CHUCK', 'CHARLIE'],
  WILLIAM: ['BILL', 'WILL', 'BILLY'],
  STEPHEN: ['STEVE'],
  STEVEN: ['STEVE'],
  JOSEPH: ['JOE'],
  THOMAS: ['TOM', 'TOMMY'],
  MICHAEL: ['MIKE'],
  ANDREW: ['ANDY', 'DREW'],
  RICHARD: ['RICK', 'DICK'],
  ROBERT: ['BOB', 'ROB', 'BOBBY'],
  DANIEL: ['DAN', 'DANNY'],
  DAVID: ['DAVE'],
  CHRISTOPHER: ['CHRIS'],
  TIMOTHY: ['TIM'],
  ALEXANDER: ['ALEX'],
  ALEJANDRO: ['ALEX'],
  GERALD: ['JERRY'],
  GREGORY: ['GREG'],
  RONALD: ['RON'],
  DONALD: ['DON'],
  LAWRENCE: ['LARRY'],
  PATRICK: ['PAT'],
  ANTHONY: ['TONY'],
  RAYMOND: ['RAY'],
  KENNETH: ['KEN'],
  BENJAMIN: ['BEN'],
  NICHOLAS: ['NICK'],
  MATTHEW: ['MATT'],
  SAMUEL: ['SAM'],
  FRANCIS: ['FRANK'],
  MARGARET: ['MARGE', 'PEGGY', 'MAGGIE'],
  ELIZABETH: ['LIZ', 'BETH', 'BETSY'],
  SUSAN: ['SUE', 'SUZY'],
  REBECCA: ['BECKY'],
  KATHERINE: ['KATE', 'KATHY'],
  PATRICIA: ['PAT', 'PATTY'],
  JACLYN: ['JACKY'],
  JACKLYN: ['JACKY'],
  CHRISTINA: ['CHRISSY'],
  CHRISTINE: ['CHRISSY'],
  PETER: ['PETE'],
  AMERISH: ['AMI'],
};

function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function escapeSqlLike(text: string): string {
  return text.replace(/'/g, "''");
}

// Builds a SQL boolean expression matching `column` against a VoteView
// bioname's last name and any plausible first name/nickname. bioname format
// is "LAST, First Middle (Nickname) Suffix" (e.g. "Aguilar, Peter Rey (Pete)"
// or "Cortez Masto, Catherine Marie").
function buildRecipientNameMatch(column: string, bioname: string): string {
  const nameParts = bioname.split(',');
  const lastRaw = nameParts[0];
  const restRaw = nameParts[1] ?? '';
  const last = escapeSqlLike(
    stripAccents(lastRaw.replace(/[^a-zA-Z\s-]/g, ''))
      .toUpperCase()
      .trim()
  );
  const rest = stripAccents(restRaw).toUpperCase();

  const parenNickname = /\(([A-Z]+)\)/.exec(rest)?.[1];
  const withoutParen = rest.replace(/\([A-Z]+\)/g, '');
  const withoutSuffix = withoutParen
    .replace(/,?\s*(JR|SR|III|II|IV)\.?\s*$/, '')
    .trim();
  const firstWord = withoutSuffix.split(/\s+/)[0]?.replace(/\.$/, '') ?? '';

  const firstNameCandidates = new Set<string>();
  if (parenNickname) firstNameCandidates.add(parenNickname);
  if (firstWord) firstNameCandidates.add(firstWord);
  for (const nickname of NICKNAMES[firstWord] ?? []) {
    firstNameCandidates.add(nickname);
  }

  const firstNameClause = [...firstNameCandidates]
    .map((f) => `UPPER(${column}) LIKE '%${escapeSqlLike(f)}%'`)
    .join(' OR ');

  return `(UPPER(${column}) LIKE '%${last}%' AND (${firstNameClause}))`;
}

function classifySector(combinedText: string, cmteId?: string | null): string {
  // Hand-curated assignments for the top committees take precedence; the
  // keyword rules below are the fallback for everything else.
  if (cmteId) {
    const curated = SECTOR_OVERRIDES[cmteId];
    if (curated) return curated;
  }
  const combined = combinedText.toUpperCase();
  // Industry checks run BEFORE the political-committee catch-all: nearly
  // every donor in this data is a committee whose name contains "PAC" or
  // "COMMITTEE" (e.g. "WHOLESALE & SPECIALTY INSURANCE ASSOCIATION PAC"),
  // and classifying those as "Political Committees" would hide which
  // industry the money actually represents. The catch-all is for party
  // machinery and ideological committees with no industry identity.
  if (
    /OIL|GAS|ENERGY|PETROLEUM|EXXON|CHEVRON|MINING|UTILITY|COAL|POWER|DRILLING|EXPLORATION|GEOLOGY|BP|SHELL/.test(
      combined
    )
  )
    return 'Energy & Resources';
  if (
    /BANK|FINANCE|EQUITY|INVEST|CAPITAL|REALTOR|REAL ESTATE|INSURANCE|WALL STREET|GOLDMAN|MORGAN|HEDGE|ADVISOR/.test(
      combined
    )
  )
    return 'Finance & Real Estate';
  if (
    /TECH|GOOGLE|APPLE|META|AMAZON|SOFTWARE|MICROSOFT|TELECOM|VERIZON|AI|MEDIA|COMCAST|BROADCAST/.test(
      combined
    )
  )
    return 'Technology & Media';
  if (
    /PHARMA|MEDICAL|HEALTH|DOCTOR|PHYSICIAN|HOSPITAL|PFIZER|BIOTECH|DENTIST|SURGEON/.test(
      combined
    )
  )
    return 'Health & Pharma';
  if (/ATTORNEY|LAWYER|LEGAL|COUNSEL|LAW FIRM|LOBBY|PARTNER/.test(combined))
    return 'Lawyers & Lobbyists';
  if (
    /OWNER|CEO|PRESIDENT|EXECUTIVE|CHAIRMAN|BUSINESS|SELF|RETIRED|HOMEMAKER/.test(
      combined
    )
  )
    return 'Business & Ideological';
  if (/DEFENSE|BOEING|LOCKHEED|RAYTHEON|AERO|MILITARY|NORTHROP/.test(combined))
    return 'Defense & Aerospace';
  if (
    /UNION|TEACHER|PROFESSOR|UNIVERSITY|SCHOOL|EDU|COLLEGE|AFL-CIO/.test(
      combined
    )
  )
    return 'Labor & Education';
  if (
    /WINRED|ACTBLUE|COMMITTEE|PAC|DCCC|NRCC|VICTORY|PARTY|POLITICAL|FEDERAL/.test(
      combined
    )
  )
    return 'Political Committees';
  return 'Other / Misc';
}

export const api = {
  searchPoliticians: async (searchQuery: string): Promise<Politician[]> => {
    const db = await getDuckDB();
    const conn = await db.connect();
    try {
      // Each word of the query must appear somewhere in the name, in any
      // order — VoteView stores "Massie, Thomas", so "Thomas Massie" (or
      // "massie thomas") must still match.
      const tokens = searchQuery
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => t.replace(/'/g, "''"));
      const tokenMatch =
        tokens.length > 0
          ? tokens.map((t) => `bioname ILIKE '%${t}%'`).join(' AND ')
          : "bioname ILIKE '%'";
      const query = `
        SELECT bioguide_id as id, icpsr, bioname as full_name, state_abbrev as state,
               district_code, chamber, party_code
        FROM read_parquet('${VV_BASE}/HSall_members.parquet')
        WHERE congress = ${CURRENT_CONGRESS}
          AND (${tokenMatch})
        ORDER BY bioname ASC LIMIT 20
      `;
      const res = await conn.query(query);
      const members: Politician[] = (res.toArray() as MemberSearchRow[]).map(
        (row) => ({
          id: row.id,
          canonical_id: row.id,
          icpsr: row.icpsr,
          name: row.full_name,
          full_name: row.full_name,
          state: row.state,
          district: row.district_code.toString(),
          role: row.chamber === 'House' ? 'Representative' : 'Senator',
          chamber: row.chamber,
          party:
            row.party_code === 100
              ? 'Democrat'
              : row.party_code === 200
                ? 'Republican'
                : 'Other',
        })
      );

      // Potential 2028 presidential candidates who aren't sitting members
      // (governors, cabinet officials, former officeholders) come from a
      // curated list; sitting members already appear via the query above.
      const upperTokens = searchQuery
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => t.toUpperCase());
      const presidential: Politician[] = PRESIDENTIAL_2028.filter((c) =>
        upperTokens.every((t) => c.name.toUpperCase().includes(t))
      ).map((c) => ({
        id: `2028-${c.slug}`,
        canonical_id: `2028-${c.slug}`,
        icpsr: 0,
        name: c.name,
        full_name: c.name,
        state: c.state,
        district: '',
        role: '2028 Presidential Candidate',
        chamber: '2028 Presidential Candidate',
        party: c.party,
      }));

      return [...members, ...presidential];
    } finally {
      await conn.close();
    }
  },

  getPoliticianById: async (id: string): Promise<Politician | null> => {
    const db = await getDuckDB();
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
      if (res.numRows === 0) return null;
      const row = (res.toArray() as MemberByIdRow[])[0];
      return {
        id: row.bioguide_id,
        canonical_id: row.bioguide_id,
        icpsr: row.icpsr,
        name: row.bioname,
        full_name: row.bioname,
        state: row.state_abbrev,
        district: row.district_code.toString(),
        role: row.chamber === 'House' ? 'Representative' : 'Senator',
        chamber: row.chamber,
        party:
          row.party_code === 100
            ? 'Democrat'
            : row.party_code === 200
              ? 'Republican'
              : 'Other',
      };
    } finally {
      await conn.close();
    }
  },

  async getVoteHistory(icpsr: number) {
    const db = await getDuckDB();
    if (!icpsr) return { data: [], total: 0 };
    const conn = await db.connect();
    try {
      const query = `
        SELECT CAST(CAST(v.rollnumber AS INTEGER) AS VARCHAR) as vote_id, rc.vote_desc, rc.date, 
               CAST(v.cast_code AS INTEGER) as cast_code
        FROM read_parquet('${VV_BASE}/HSall_votes.parquet') v
        LEFT JOIN read_parquet('${VV_BASE}/HSall_rollcalls.parquet') rc 
          ON CAST(v.rollnumber AS INTEGER) = CAST(rc.rollnumber AS INTEGER) 
          AND CAST(v.congress AS INTEGER) = CAST(rc.congress AS INTEGER)
          AND v.chamber = rc.chamber
        WHERE CAST(v.icpsr AS INTEGER) = ${Math.floor(icpsr)}
          AND rc.date >= '${CYCLE_START_DATE}'
        ORDER BY rc.date DESC, v.rollnumber DESC
      `;
      const res = await conn.query(query);
      const data = (res.toArray() as VoteHistoryRow[]).map((r) => ({
        id: r.vote_id,
        title: r.vote_desc || `Vote #${r.vote_id}`,
        date: r.date,
        position:
          r.cast_code === 1 ? 'Yea' : r.cast_code === 6 ? 'Nay' : 'Other',
      }));
      return { data, total: data.length };
    } finally {
      await conn.close();
    }
  },

  async getDonationSummary(name: string) {
    const db = await getDuckDB();
    const conn = await db.connect();
    try {
      const hfUrl = CONTRIBUTIONS_URL;
      const recipientMatch = buildRecipientNameMatch('"recipient.name"', name);

      const query = `
        SELECT "contributor.name" as name, SUM(amount) as value
        FROM read_parquet('${hfUrl}')
        WHERE ${recipientMatch}
        GROUP BY name ORDER BY value DESC LIMIT 5
      `;
      const res = await conn.query(query);
      return (res.toArray() as DonationSummaryRow[]).map((r) => ({
        name: r.name,
        value: r.value,
      }));
    } finally {
      await conn.close();
    }
  },

  async getDonationBySector(name: string) {
    const db = await getDuckDB();
    const conn = await db.connect();
    try {
      const hfUrl = CONTRIBUTIONS_URL;
      const recipientMatch = buildRecipientNameMatch('"recipient.name"', name);

      const query = `
        SELECT
          "contributor.occupation" as occ,
          "contributor.employer" as emp,
          "contributor.name" as cname,
          cmte_id,
          SUM(amount) as value
        FROM read_parquet('${hfUrl}')
        WHERE ${recipientMatch}
        GROUP BY "contributor.occupation", "contributor.employer", "contributor.name", cmte_id
      `;

      const res = await conn.query(query);
      const sectors: Record<string, number> = {};

      (res.toArray() as DonationBySectorRow[]).forEach((r) => {
        const occ = (r.occ ?? '').toUpperCase();
        const emp = (r.emp ?? '').toUpperCase();
        const combined = `${occ} ${emp} ${r.cname ?? ''}`;
        const s = classifySector(combined, r.cmte_id);
        sectors[s] = (sectors[s] || 0) + r.value;
      });

      return Object.entries(sectors)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    } finally {
      await conn.close();
    }
  },

  // Top donors + sector breakdown for the "Who's Paying" section. One query
  // serves both: donors ranked by cycle total, classified into sectors from
  // occupation/employer/name text.
  async getWhosPaying(name: string): Promise<WhosPaying> {
    const db = await getDuckDB();
    const conn = await db.connect();
    try {
      const recipientMatch = buildRecipientNameMatch('"recipient.name"', name);
      const res = await conn.query(`
        SELECT "contributor.name" as donor,
               ANY_VALUE("contributor.occupation") as occ,
               ANY_VALUE("contributor.employer") as emp,
               ANY_VALUE(cmte_id) as cmte_id,
               CAST(SUM(amount) AS DOUBLE) as total
        FROM read_parquet('${CONTRIBUTIONS_URL}')
        WHERE ${recipientMatch}
          AND (date IS NULL OR date >= '${CYCLE_START_DATE}')
        GROUP BY 1 ORDER BY total DESC
      `);
      const rows = res.toArray() as WhosPayingRow[];
      const sectorTotals: Record<string, number> = {};
      const ranked: RankedDonor[] = rows.map((r) => {
        const sector = classifySector(
          `${(r.occ ?? '').toUpperCase()} ${(r.emp ?? '').toUpperCase()} ${r.donor}`,
          r.cmte_id
        );
        sectorTotals[sector] = (sectorTotals[sector] || 0) + r.total;
        return { name: r.donor, sector, total: r.total };
      });
      return {
        topDonors: ranked.slice(0, 10),
        sectors: Object.entries(sectorTotals)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        total: ranked.reduce((s, r) => s + r.total, 0),
      };
    } finally {
      await conn.close();
    }
  },

  // Full cycle of votes and donations for the visual timeline and the vote
  // spotlights: the components pair them client-side, so one load serves both.
  async getTimelineData(icpsr: number, name: string): Promise<TimelineData> {
    const db = await getDuckDB();
    if (!icpsr) return { votes: [], donations: [] };
    const conn = await db.connect();
    try {
      const votesRes = await conn.query(`
        SELECT CAST(v.rollnumber AS INTEGER) as rollnumber,
               rc.vote_desc,
               rc.date,
               CAST(v.cast_code AS INTEGER) as cast_code,
               CAST(rc.yea_count AS INTEGER) as yea,
               CAST(rc.nay_count AS INTEGER) as nay
        FROM read_parquet('${VV_BASE}/HSall_votes.parquet') v
        INNER JOIN read_parquet('${VV_BASE}/HSall_rollcalls.parquet') rc
          ON CAST(v.rollnumber AS INTEGER) = CAST(rc.rollnumber AS INTEGER)
          AND CAST(v.congress AS INTEGER) = CAST(rc.congress AS INTEGER)
          AND v.chamber = rc.chamber
        WHERE CAST(v.icpsr AS INTEGER) = ${Math.floor(icpsr)}
          AND rc.date >= '${CYCLE_START_DATE}'
        ORDER BY rc.date
      `);
      const votes: TimelineVote[] = (
        votesRes.toArray() as TimelineVoteRow[]
      ).map((r) => {
        const total = (r.yea ?? 0) + (r.nay ?? 0);
        return {
          rollnumber: r.rollnumber,
          desc: r.vote_desc || `Roll Call Vote #${r.rollnumber}`,
          date: r.date,
          position:
            r.cast_code === 1 ? 'Yea' : r.cast_code === 6 ? 'Nay' : 'Other',
          yea: r.yea,
          nay: r.nay,
          contested:
            total > 0 && Math.min(r.yea ?? 0, r.nay ?? 0) / total >= 0.1,
        };
      });

      const recipientMatch = buildRecipientNameMatch('"recipient.name"', name);
      const donationsRes = await conn.query(`
        SELECT "contributor.name" as donor,
               "contributor.occupation" as occ,
               "contributor.employer" as emp,
               cmte_id,
               CAST(amount AS DOUBLE) as amount,
               date
        FROM read_parquet('${CONTRIBUTIONS_URL}')
        WHERE ${recipientMatch} AND date >= '${CYCLE_START_DATE}'
        ORDER BY date
      `);
      const donations: TimelineDonation[] = (
        donationsRes.toArray() as TimelineDonationRow[]
      ).map((r) => ({
        donor: r.donor,
        sector: classifySector(
          `${(r.occ ?? '').toUpperCase()} ${(r.emp ?? '').toUpperCase()} ${r.donor}`,
          r.cmte_id
        ),
        cmte_id: r.cmte_id,
        amount: r.amount,
        date: r.date,
      }));

      return { votes, donations };
    } finally {
      await conn.close();
    }
  },

  // First year in office + number of Congresses served, from the full
  // VoteView member history (already in the dataset).
  async getMemberTenure(icpsr: number): Promise<MemberTenure | null> {
    const db = await getDuckDB();
    if (!icpsr) return null;
    const conn = await db.connect();
    try {
      const res = await conn.query(`
        SELECT CAST(MIN(CAST(congress AS INTEGER)) AS INTEGER) as first_congress,
               CAST(COUNT(DISTINCT congress) AS INTEGER) as congresses
        FROM read_parquet('${VV_BASE}/HSall_members.parquet')
        WHERE CAST(icpsr AS INTEGER) = ${Math.floor(icpsr)}
      `);
      const rows = res.toArray() as TenureRow[];
      if (rows.length === 0 || rows[0].first_congress === null) return null;
      // Congress N convened in 1789 + 2*(N-1).
      return {
        sinceYear: 1789 + 2 * (rows[0].first_congress - 1),
        terms: rows[0].congresses,
      };
    } finally {
      await conn.close();
    }
  },

  // All money channels for one politician, each queried independently so a
  // dataset that isn't published yet degrades to null instead of failing the
  // whole overview. A real $0 (e.g. no super PAC spending) is returned as 0 —
  // that absence is information and must be displayed, not hidden.
  async getMoneyOverview(name: string): Promise<MoneyOverview> {
    const db = await getDuckDB();
    const conn = await db.connect();
    const overview: MoneyOverview = {
      direct: null,
      earmarked: null,
      outside: null,
      totalRaised: null,
    };
    try {
      const recipientMatch = buildRecipientNameMatch('"recipient.name"', name);
      const candidateMatch = buildRecipientNameMatch('"candidate.name"', name);
      const summaryMatch = buildRecipientNameMatch('cand_name', name);

      try {
        const res = await conn.query(`
          SELECT CAST(COALESCE(SUM(amount), 0) AS DOUBLE) as total,
                 CAST(COUNT(DISTINCT cmte_id) AS INTEGER) as donors
          FROM read_parquet('${CONTRIBUTIONS_URL}')
          WHERE ${recipientMatch}
            AND (date IS NULL OR date >= '${CYCLE_START_DATE}')
        `);
        const row = (res.toArray() as DirectTotalRow[])[0];
        overview.direct = { total: row.total ?? 0, donors: row.donors };
      } catch (error) {
        console.warn('Direct contributions unavailable:', error);
      }

      try {
        const res = await conn.query(`
          SELECT "conduit.name" as conduit,
                 CAST(SUM(amount) AS DOUBLE) as total,
                 CAST(SUM(n_contributions) AS INTEGER) as n
          FROM read_parquet('${EARMARKED_URL}')
          WHERE ${recipientMatch}
            AND (date IS NULL OR date >= '${CYCLE_START_DATE}')
          GROUP BY 1 ORDER BY total DESC
        `);
        const rows = res.toArray() as ConduitRow[];
        overview.earmarked = {
          total: rows.reduce((s, r) => s + r.total, 0),
          contributions: rows.reduce((s, r) => s + r.n, 0),
          topConduits: rows
            .slice(0, 3)
            .map((r) => ({ name: r.conduit, total: r.total })),
        };
      } catch (error) {
        console.warn('Earmarked contributions unavailable:', error);
      }

      try {
        const res = await conn.query(`
          SELECT direction,
                 CAST(SUM(CASE WHEN spender_kind IN ('super_pac', 'hybrid_pac')
                          THEN amount ELSE 0 END) AS DOUBLE) as super_total,
                 CAST(SUM(CASE WHEN spender_kind NOT IN ('super_pac', 'hybrid_pac')
                          THEN amount ELSE 0 END) AS DOUBLE) as other_total
          FROM read_parquet('${INDEPENDENT_EXPENDITURES_URL}')
          WHERE ${candidateMatch}
            AND (date IS NULL OR date >= '${CYCLE_START_DATE}')
          GROUP BY 1
        `);
        const rows = res.toArray() as OutsideRow[];
        const support = rows.find((r) => r.direction === 'support');
        const oppose = rows.find((r) => r.direction === 'oppose');
        overview.outside = {
          support: support?.super_total ?? 0,
          oppose: oppose?.super_total ?? 0,
          otherSupport: support?.other_total ?? 0,
          otherOppose: oppose?.other_total ?? 0,
        };
      } catch (error) {
        console.warn('Independent expenditures unavailable:', error);
      }

      try {
        const res = await conn.query(`
          SELECT CAST(total_receipts AS DOUBLE) as total_receipts, coverage_end
          FROM read_parquet('${CANDIDATE_SUMMARY_URL}')
          WHERE ${summaryMatch}
          ORDER BY total_receipts DESC LIMIT 1
        `);
        const rows = res.toArray() as SummaryRow[];
        if (rows.length > 0 && rows[0].total_receipts !== null) {
          overview.totalRaised = {
            amount: rows[0].total_receipts,
            coverageEnd: rows[0].coverage_end,
          };
        }
      } catch (error) {
        console.warn('Candidate summary unavailable:', error);
      }

      return overview;
    } finally {
      await conn.close();
    }
  },

  // Build stamp + filing-coverage date + cycle totals, written by the data
  // pipeline. Plain fetch, no DuckDB: the money-flow explainer reads this too.
  async getDataFreshness(): Promise<DataFreshness | null> {
    try {
      const res = await fetch(META_URL);
      if (!res.ok) return null;
      const meta = (await res.json()) as MetaJson;
      return {
        filingsThrough: meta.fec_filings_through ?? null,
        generatedUtc: meta.generated_utc ?? null,
        totals: meta.totals ?? {},
      };
    } catch {
      return null;
    }
  },
};

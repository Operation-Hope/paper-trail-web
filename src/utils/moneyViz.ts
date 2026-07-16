import { TimelineData, TimelineDonation, TimelineVote } from '../services/api';

// CVD-validated categorical palette for dark surfaces (checked with the
// palette validator: lightness band, chroma floor, adjacent-pair separation,
// contrast >= 3:1). The two non-industry buckets are deliberately neutral
// grays so the industry hues carry identity.
export const SECTOR_COLORS: Record<string, string> = {
  'Finance & Real Estate': '#3987e5',
  'Health & Pharma': '#008300',
  'Technology & Media': '#d55181',
  'Labor & Education': '#c98500',
  'Energy & Resources': '#199e70',
  'Lawyers & Lobbyists': '#d95926',
  'Defense & Aerospace': '#9085e9',
  'Business & Ideological': '#e66767',
  'Political Committees': '#8f8f96',
  'Other / Misc': '#a1a1aa',
};

export function sectorColor(sector: string): string {
  return SECTOR_COLORS[sector] ?? '#a1a1aa';
}

export function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const DAY = 86400000;

export function inWindow(
  donation: TimelineDonation,
  vote: TimelineVote,
  windowDays: number
): boolean {
  return (
    Math.abs(Date.parse(donation.date) - Date.parse(vote.date)) <=
    windowDays * DAY
  );
}

export function daysLabel(
  donation: TimelineDonation,
  vote: TimelineVote
): string {
  const d = Math.round(
    (Date.parse(vote.date) - Date.parse(donation.date)) / DAY
  );
  if (d === 0) return 'same day';
  return `${String(Math.abs(d))}d ${d > 0 ? 'before' : 'after'}`;
}

// Contested votes ranked by PAC money within ±30 days — the same fixed
// formula for every member. Near-unanimous votes are excluded because
// donation timing around them carries no signal.
export function topVotesByNearbyMoney(
  data: TimelineData,
  limit: number
): { vote: TimelineVote; total: number; hits: TimelineDonation[] }[] {
  return data.votes
    .filter((v) => v.contested)
    .map((vote) => {
      const hits = data.donations.filter((d) => inWindow(d, vote, 30));
      return { vote, total: hits.reduce((s, d) => s + d.amount, 0), hits };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

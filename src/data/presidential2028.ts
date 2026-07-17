// Curated list of potential 2028 presidential candidates, as tracked at
// trackaipac.com/2028 (fetched 2026-07-16). Sitting members of Congress are
// intentionally NOT listed here — they are already searchable through the
// VoteView member data and have full money profiles; this list only adds the
// people the database can't otherwise show (governors, cabinet officials,
// former officeholders). The FEC has not yet published 2028-cycle bulk data
// (it appears in 2027), so these candidate pages explain the data status
// honestly instead of showing empty charts.

export interface PresidentialCandidate {
  slug: string;
  name: string;
  party: 'Democrat' | 'Republican';
  title: string;
  state: string;
}

export const PRESIDENTIAL_2028: PresidentialCandidate[] = [
  // Potential Democratic candidates (non-members of Congress)
  {
    slug: 'andy-beshear',
    name: 'Andy Beshear',
    party: 'Democrat',
    title: 'Governor of Kentucky',
    state: 'KY',
  },
  {
    slug: 'pete-buttigieg',
    name: 'Pete Buttigieg',
    party: 'Democrat',
    title: 'Former U.S. Secretary of Transportation',
    state: 'MI',
  },
  {
    slug: 'rahm-emanuel',
    name: 'Rahm Emanuel',
    party: 'Democrat',
    title: 'Former Mayor of Chicago',
    state: 'IL',
  },
  {
    slug: 'kamala-harris',
    name: 'Kamala Harris',
    party: 'Democrat',
    title: '49th Vice President of the United States',
    state: 'CA',
  },
  {
    slug: 'wes-moore',
    name: 'Wes Moore',
    party: 'Democrat',
    title: 'Governor of Maryland',
    state: 'MD',
  },
  {
    slug: 'gavin-newsom',
    name: 'Gavin Newsom',
    party: 'Democrat',
    title: 'Governor of California',
    state: 'CA',
  },
  {
    slug: 'jb-pritzker',
    name: 'JB Pritzker',
    party: 'Democrat',
    title: 'Governor of Illinois',
    state: 'IL',
  },
  {
    slug: 'josh-shapiro',
    name: 'Josh Shapiro',
    party: 'Democrat',
    title: 'Governor of Pennsylvania',
    state: 'PA',
  },
  {
    slug: 'gretchen-whitmer',
    name: 'Gretchen Whitmer',
    party: 'Democrat',
    title: 'Governor of Michigan',
    state: 'MI',
  },
  // Potential Republican candidates (non-members of Congress)
  {
    slug: 'ron-desantis',
    name: 'Ron DeSantis',
    party: 'Republican',
    title: 'Governor of Florida',
    state: 'FL',
  },
  {
    slug: 'robert-f-kennedy-jr',
    name: 'Robert F. Kennedy Jr.',
    party: 'Republican',
    title: 'U.S. Secretary of Health and Human Services',
    state: 'CA',
  },
  {
    slug: 'kristi-noem',
    name: 'Kristi Noem',
    party: 'Republican',
    title: 'U.S. Secretary of Homeland Security',
    state: 'SD',
  },
  {
    slug: 'marco-rubio',
    name: 'Marco Rubio',
    party: 'Republican',
    title: 'U.S. Secretary of State',
    state: 'FL',
  },
  {
    slug: 'jd-vance',
    name: 'JD Vance',
    party: 'Republican',
    title: '50th Vice President of the United States',
    state: 'OH',
  },
  {
    slug: 'glenn-youngkin',
    name: 'Glenn Youngkin',
    party: 'Republican',
    title: 'Governor of Virginia',
    state: 'VA',
  },
];

// Members of Congress on the same watch list — searchable already via their
// member pages; listed for the 2028 badge on candidate pages if needed later:
// Cory Booker (NJ), Ruben Gallego (AZ), Mark Kelly (AZ), Ro Khanna (CA-17),
// Alexandria Ocasio-Cortez (NY-14), Jon Ossoff (GA), Ted Cruz (TX),
// Elissa Slotkin (MI).

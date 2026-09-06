// Curated list of potential 2028 presidential candidates. Base list is
// trackaipac.com/2028 (re-verified 2026-09-06, unchanged since 2026-07-16),
// widened with names carried in general 2028 coverage (The Hill, TIME) that
// TrackAIPAC does not rate, since it is an Israel-policy watchdog list rather
// than a general field tracker. Sitting members of Congress are
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
  /** Past congressional service, shown in the votes panel for honesty. */
  formerCongress?: string;
  /** VoteView ICPSR id, present only for those who served in Congress.
      CURATED AND VERIFIED BY HAND against exact VoteView bionames — never
      derive by name matching (a "Kennedy, Robert" search returns RFK Sr.,
      "Newsom" returns a 1943 congressman). Its presence is what enables the
      congressional vote-money sections on this candidate's page. */
  icpsr?: number;
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
    formerCongress: 'U.S. Representative (IL), 2003–2009',
    icpsr: 20323,
  },
  {
    slug: 'kamala-harris',
    name: 'Kamala Harris',
    party: 'Democrat',
    title: '49th Vice President of the United States',
    state: 'CA',
    formerCongress: 'U.S. Senator (CA), 2017–2021',
    icpsr: 41701,
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
    formerCongress: 'U.S. Representative (FL), 2013–2019',
    icpsr: 21318,
  },
  {
    slug: 'tulsi-gabbard',
    name: 'Tulsi Gabbard',
    party: 'Republican',
    title: 'U.S. Director of National Intelligence',
    state: 'HI',
    // She sat as a Democrat; the party field above reflects where she is
    // placed in 2028 speculation, so the two are stated separately rather
    // than letting the badge imply she cast these votes as a Republican.
    formerCongress: 'U.S. Representative (HI), 2013–2021, as a Democrat',
    icpsr: 21324,
  },
  {
    slug: 'nikki-haley',
    name: 'Nikki Haley',
    party: 'Republican',
    title: 'Former U.S. Ambassador to the United Nations',
    state: 'SC',
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
    formerCongress: 'U.S. Representative (SD), 2011–2019',
    icpsr: 21177,
  },
  {
    slug: 'marco-rubio',
    name: 'Marco Rubio',
    party: 'Republican',
    title: 'U.S. Secretary of State',
    state: 'FL',
    formerCongress: 'U.S. Senator (FL), 2011–2025',
    icpsr: 41102,
  },
  {
    slug: 'jd-vance',
    name: 'JD Vance',
    party: 'Republican',
    title: '50th Vice President of the United States',
    state: 'OH',
    formerCongress: 'U.S. Senator (OH), 2023–2025',
    icpsr: 42304,
  },
  {
    slug: 'glenn-youngkin',
    name: 'Glenn Youngkin',
    party: 'Republican',
    title: 'Governor of Virginia',
    state: 'VA',
  },
];

// Members of Congress on the same watch lists — searchable already via their
// member pages; listed for the 2028 badge on candidate pages if needed later.
// Deliberately NOT entries above: a candidate page would show them LESS than
// their member page does. Verified sitting as of VoteView congress 119.
//
// From TrackAIPAC: Cory Booker (NJ), Ruben Gallego (AZ), Mark Kelly (AZ),
// Ro Khanna (CA-17), Alexandria Ocasio-Cortez (NY-14), Jon Ossoff (GA),
// Ted Cruz (TX, icpsr 41304), Elissa Slotkin (MI).
// From wider 2028 coverage: Tom Cotton (AR, icpsr 21301),
// Josh Hawley (MO, icpsr 41901), Rand Paul (KY, icpsr 41104).

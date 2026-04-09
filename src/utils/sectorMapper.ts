export interface DonorRecord {
  name: string;
  value: number;
  employer?: string;
  occupation?: string;
  isCorp?: boolean;
}

// 🏛️ The "OpenSecrets" Style Sector Dictionary
const SECTOR_RULES = [
  {
    sector: 'Defense & Aerospace',
    keywords: ['LOCKHEED', 'BOEING', 'RAYTHEON', 'RTX', 'NORTHROP', 'GENERAL DYNAMICS', 'BAE', 'L3HARRIS', 'HONEYWELL', 'TEXTRON', 'DEFENSE', 'AEROSPACE', 'HUNTINGTON INGALLS']
  },
  {
    sector: 'Finance, Insurance & Real Estate',
    keywords: ['BANK', 'CITI', 'GOLDMAN', 'JPMORGAN', 'CAPITAL', 'INVEST', 'INSURANCE', 'REALTOR', 'FINANCE', 'WALL STREET', 'APOLLO', 'BLACKROCK', 'WELLS FARGO', 'MORGAN STANLEY', 'REAL ESTATE', 'PROPERTY']
  },
  {
    sector: 'Energy & Natural Resources',
    keywords: ['EXXON', 'CHEVRON', 'SHELL', 'BP ', 'ENERGY', 'OIL', 'GAS', 'MINING', 'COAL', 'PIPELINE', 'CONOCO', 'VALERO', 'NEXTERA', 'FOSSIL']
  },
  {
    sector: 'Healthcare & Pharmaceuticals',
    keywords: ['PFIZER', 'PHARMA', 'AETNA', 'HUMANA', 'BLUE CROSS', 'HOSPITAL', 'MEDICAL', 'HEALTHCARE', 'PHYSICIAN', 'NURSE', 'MERCK', 'ELI LILLY', 'MODERNA', 'JOHNSON & JOHNSON', 'CIGNA']
  },
  {
    sector: 'Technology & Communications',
    keywords: ['GOOGLE', 'ALPHABET', 'AMAZON', 'META', 'APPLE', 'TECH', 'COMCAST', 'TELECOM', 'SOFTWARE', 'MICROSOFT', 'AT&T', 'VERIZON', 'BROADBAND', 'INTERNET', 'ORACLE']
  },
  {
    sector: 'Labor Unions',
    keywords: ['UNION', 'AFL-CIO', 'TEAMSTERS', 'WORKERS', 'AFSCME', 'SEIU', 'TEACHERS', 'NEA', 'AFT', 'BROTHERHOOD', 'IBEW', 'CWA']
  },
  {
    sector: 'Lawyers & Lobbyists',
    keywords: ['LAW FIRM', 'ATTORNEY', 'LAWYER', 'LOBBYIST', 'SQUIRE PATTON', 'AKIN GUMP', 'BROWNSTEIN', 'LEGAL', 'LITIGATION']
  },
  {
    sector: 'Agribusiness',
    keywords: ['MONSANTO', 'CARGILL', 'FARM', 'AGRICULTURE', 'SUGAR', 'DAIRY', 'CROP', 'POULTRY', 'BEEF', 'TRACTOR']
  }
];

// 🕵️ Specific Edge Cases for 2024 Politics
const PASS_THROUGH_KEYWORDS = ['ACTBLUE', 'WINRED'];
const LEADERSHIP_KEYWORDS = ['VICTORY FUND', 'LEADERSHIP', 'MAJORITY', 'CONGRESSIONAL', 'SENATORIAL', 'DCCC', 'NRCC', 'DSCC', 'NRSC', 'PAC TO THE FUTURE'];
const IDEOLOGICAL_KEYWORDS = ['CLUB FOR GROWTH', 'EMILY\'S LIST', 'AIPAC', 'NRA', 'PLANNED PARENTHOOD', 'CITIZENS FOR', 'PATRIOT', 'FREEDOM', 'PROGRESSIVE', 'CONSERVATIVE'];

export const determineSector = (donor: DonorRecord): string => {
  // Sanitize data
  const name = (donor.name || '').toUpperCase();
  const employer = (donor.employer || '').toUpperCase();
  const occ = (donor.occupation || '').toUpperCase();
  
  // Create a combined string for deep searching
  const searchString = `${name} | ${employer} | ${occ}`;

  // 1. Filter out Pass-Throughs (ActBlue/WinRed mask true donors)
  if (PASS_THROUGH_KEYWORDS.some(k => searchString.includes(k))) return 'Pass-Through (ActBlue/WinRed)';

  // 2. Filter Leadership & Joint Fundraising (The "Mike Rogers" exception)
  if (LEADERSHIP_KEYWORDS.some(k => searchString.includes(k))) return 'Leadership & Joint Fundraising';

  // 3. Filter major Ideological/Single-Issue groups
  if (IDEOLOGICAL_KEYWORDS.some(k => searchString.includes(k))) return 'Ideological / Single-Issue';

  // 4. Map to Corporate/Industrial Sectors
  for (const rule of SECTOR_RULES) {
    if (rule.keywords.some(k => searchString.includes(k))) {
      return rule.sector;
    }
  }

  // 5. Intelligent Fallback
  if (donor.isCorp) return 'Misc. Corporate/Business';
  
  return 'Unclassified / Other';
};
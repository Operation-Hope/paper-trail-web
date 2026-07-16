// Curated sector assignments for the top 300 direct-contribution committees
// of the 2026 cycle (53% of all direct PAC dollars), keyed by FEC committee
// ID. Reviewed by hand against each committee's name and connected
// organization; the keyword classifier in api.ts is only the fallback for
// committees not listed here. Conventions: candidate, leadership, victory,
// and party committees -> Political Committees; unions and professional
// employee associations -> Labor & Education; ideological single-issue
// committees (pro-Israel, gun, campaign-reform, LGBTQ, veterans) and
// industry/trade/corporate committees without a closer bucket (agribusiness,
// transport, retail, food, manufacturing) -> Business & Ideological.

const POL = 'Political Committees';
const FIN = 'Finance & Real Estate';
const NRG = 'Energy & Resources';
const TEC = 'Technology & Media';
const MED = 'Health & Pharma';
const LAW = 'Lawyers & Lobbyists';
const BIZ = 'Business & Ideological';
const DEF = 'Defense & Aerospace';
const LAB = 'Labor & Education';

export const SECTOR_OVERRIDES: Record<string, string> = {
  C00929844: POL, // Allred Victory Fund
  C00030718: FIN, // National Association of Realtors
  C00077321: FIN, // American Institute of CPAs
  C00004275: FIN, // American Bankers Association (BankPAC)
  C00110338: BIZ, // American Crystal Sugar Company
  C00011114: LAB, // AFSCME
  C00027466: POL, // Young Victory Committee / NRSC
  C00024521: LAW, // American Association for Justice (trial lawyers)
  C00096156: DEF, // Honeywell International
  C00144766: BIZ, // National Beer Wholesalers Association
  C00797670: BIZ, // AIPAC PAC (pro-Israel, ideological)
  C00007880: FIN, // Credit Union National Association
  C00039578: FIN, // Council of Insurance Agents & Brokers
  C00284885: BIZ, // The Home Depot
  C00007542: LAB, // SMART (Sheet Metal, Air, Rail, Transportation Workers)
  C00010868: BIZ, // American Council of Engineering Companies
  C00002469: LAB, // Machinists & Aerospace Workers union
  C00002972: NRG, // National Rural Electric Cooperative Association
  C00106146: MED, // American Hospital Association
  C00027342: LAB, // IBEW
  C00227744: FIN, // Ernst & Young
  C00035451: LAB, // Air Line Pilots Association
  C00001016: LAB, // United Brotherhood of Carpenters
  C00238725: LAB, // National Air Traffic Controllers Association
  C00142711: DEF, // Boeing
  C00040998: BIZ, // National Automobile Dealers Association
  C00024968: MED, // American Optometric Association
  C00088591: DEF, // Northrop Grumman
  C00028860: LAB, // American Federation of Teachers
  C00426775: TEC, // Charter Communications
  C00211318: FIN, // Deloitte
  C00000901: FIN, // National Association of Home Builders
  C00158881: FIN, // New York Life
  C00303024: DEF, // Lockheed Martin
  C00078451: DEF, // General Dynamics
  C00012245: FIN, // UBS Americas
  C00197228: MED, // Elevance Health
  C00093054: BIZ, // Walmart
  C00007922: LAB, // LIUNA (Laborers' union)
  C00064766: BIZ, // UPS
  C00771246: POL, // Johnson Leadership Fund
  C00029447: LAB, // International Association of Fire Fighters
  C00034157: FIN, // Aflac
  C00467431: POL, // Scalise Leadership Fund
  C00639229: POL, // American Revival PAC
  C00267849: LAB, // Allied Pilots Association
  C00113241: FIN, // National Apartment Association
  C00236489: NRG, // Koch Inc.
  C00022343: FIN, // Independent Insurance Agents & Brokers
  C00107235: FIN, // PricewaterhouseCoopers
  C00097568: DEF, // RTX (Raytheon)
  C00029504: LAB, // Operating Engineers union
  C00003251: LAB, // National Education Association
  C00130773: FIN, // National Multifamily Housing Council
  C00411116: DEF, // SpaceX
  C00004812: FIN, // Mortgage Bankers Association
  C00570226: POL, // SEAL PAC (Zinke)
  C00563726: POL, // Smith Victory
  C00005249: FIN, // Insurance & Financial Advisors (NAIFA)
  C00193631: FIN, // Farm Credit Council
  C00113811: BIZ, // National Electrical Contractors Association
  C00032979: LAB, // Teamsters (DRIVE)
  C00089458: NRG, // National Stone, Sand & Gravel (aggregates)
  C00147173: BIZ, // Wine & Spirits Wholesalers
  C00035006: NRG, // Chevron
  C00255752: MED, // American Society of Anesthesiologists
  C00186288: TEC, // Verizon
  C00574970: POL, // Fair Shot PAC (Clark)
  C00109017: TEC, // AT&T
  C00542365: BIZ, // Toyota
  C00248716: TEC, // Comcast / NBCUniversal
  C00477653: TEC, // Cox Enterprises
  C00617803: POL, // JEFF PAC (Jeffries leadership)
  C00546234: DEF, // Leidos
  C00001198: BIZ, // American Hotel & Lodging Association
  C00428623: TEC, // Google
  C00749481: POL, // Raptor PAC (Pfluger)
  C00359539: MED, // American Academy of Dermatology
  C00032995: LAB, // Amalgamated Transit Union
  C00271338: POL, // AmeriPAC (Hoyer)
  C00081414: BIZ, // American Sugar Cane League
  C00147066: FIN, // American Council of Life Insurers
  C00100321: DEF, // L3Harris
  C00023028: BIZ, // National Cotton Council
  C00369751: TEC, // Dell
  C00360354: TEC, // Amazon
  C00010421: BIZ, // Associated Builders & Contractors
  C00028787: BIZ, // National Cattlemen's Beef Association
  C00004036: LAB, // SEIU
  C00000729: MED, // American Dental Association
  C00010470: BIZ, // Union Pacific (railroad)
  C00009985: TEC, // National Association of Broadcasters
  C00008268: LAB, // Transport Workers Union
  C00148031: BIZ, // Caterpillar
  C00089136: BIZ, // Altria
  C00027359: LAB, // Iron Workers union
  C00126763: BIZ, // National Association of Convenience Stores
  C00085316: MED, // Cigna
  C00361758: TEC, // T-Mobile
  C00012476: LAB, // Plumbers & Pipefitters (UA)
  C00105981: FIN, // Investment Company Institute
  C00235739: BIZ, // BNSF Railway
  C00023580: LAB, // National Association of Letter Carriers
  C00173153: MED, // Nurse Anesthetists (CRNA)
  C00513549: NRG, // Phillips 66
  C00002766: LAB, // UFCW
  C00344234: POL, // PAC to the Future (Pelosi)
  C00764233: POL, // Defend the Vote Leadership Fund
  C00325332: FIN, // American Seniors Housing Association
  C00346353: BIZ, // CRH Americas (building materials)
  C00076810: BIZ, // General Motors
  C00432252: FIN, // Regions Financial
  C00343459: MED, // American College of Radiology
  C00343137: MED, // Orthopaedic Surgeons (AAOS)
  C00066472: FIN, // American Property Casualty Insurance
  C00082792: MED, // Eli Lilly
  C00363879: NRG, // Entergy
  C00251876: MED, // Amgen
  C00480863: BIZ, // National Shooting Sports Foundation (ideological)
  C00280222: FIN, // KPMG
  C00274431: MED, // UnitedHealth Group
  C00104299: FIN, // JPMorgan Chase
  C00104802: BIZ, // Delta Air Lines
  C00592089: POL, // Emmer Victory Committee
  C00016683: MED, // Pfizer
  C00326595: FIN, // Capital One
  C00140061: MED, // American College of Emergency Physicians
  C00170258: FIN, // National Association of Mutual Insurance Companies
  C00082917: BIZ, // Associated General Contractors
  C00685297: BIZ, // Elect Democratic Women (ideological)
  C00215285: DEF, // General Atomics
  C00040279: MED, // Abbott Laboratories
  C00380550: FIN, // Fidelity (FMR)
  C00431361: FIN, // TIAA
  C00430256: MED, // Molina Healthcare
  C00623512: POL, // In The Arena PAC (Hill)
  C00536573: MED, // AbbVie
  C00010983: MED, // Johnson & Johnson
  C00501429: FIN, // TD Bank
  C00340943: MED, // DaVita
  C00447565: FIN, // Finseca (financial security profession)
  C00163832: BIZ, // CSX (railroad)
  C00337626: FIN, // Morgan Stanley
  C00072025: LAB, // National Rural Letter Carriers
  C00010082: TEC, // NCTA - The Internet & Television Association
  C00064774: NRG, // NextEra Energy
  C00281212: DEF, // BAE Systems
  C00038604: FIN, // American Financial Services Association
  C00793711: NRG, // Constellation Energy
  C00032698: FIN, // Independent Community Bankers (ICBA)
  C00441949: BIZ, // JStreetPAC (pro-Israel, ideological)
  C00227546: TEC, // Microsoft
  C00009936: LAB, // American Federation of Government Employees
  C00109546: NRG, // Valero
  C00068692: BIZ, // FedEx
  C00350744: FIN, // Goldman Sachs
  C00084491: BIZ, // International Franchise Association
  C00271007: MED, // Humana
  C00364778: FIN, // Bank of America
  C00165159: POL, // Republican Main Street Partnership
  C00012880: MED, // American Physical Therapy Association
  C00336743: BIZ, // Asian American Hotel Owners Association
  C00040535: FIN, // American Express
  C00000885: LAB, // Painters & Allied Trades union
  C00002089: LAB, // Communications Workers of America
  C00118943: FIN, // MassMutual
  C00693796: POL, // Buckeye Liberty PAC
  C00817338: POL, // MVL PAC
  C00396895: MED, // Gilead Sciences
  C00001636: LAB, // SMART Transportation Division
  C00388827: FIN, // Rocket (mortgage)
  C00431312: FIN, // SIFMA
  C00245548: BIZ, // National Marine Manufacturers Association
  C00416594: POL, // Buckeye Victory Fund (Jordan)
  C00008474: FIN, // Citigroup
  C00358663: FIN, // American Resort Development Association
  C00390583: LAW, // Brownstein Hyatt Farber Schreck
  C00003632: LAB, // Bricklayers union
  C00300178: FIN, // Wells Fargo
  C00303339: FIN, // REITs (Nareit)
  C00376343: BIZ, // National Corn Growers Association
  C00123612: DEF, // Textron / Beechcraft
  C00382424: MED, // American College of Surgeons
  C00121319: FIN, // Thrivent Financial
  C00000422: MED, // American Medical Association
  C00496307: NRG, // Marathon Petroleum
  C00384818: MED, // CVS Health
  C00479246: FIN, // BlackRock
  C00204099: BIZ, // John Deere
  C00757419: POL, // SD PAC
  C00164145: FIN, // USAA
  C00495002: FIN, // American Investment Council (private equity)
  C00083535: NRG, // Duke Energy
  C00394957: POL, // Scalise Leadership Fund
  C00451153: POL, // Gridiron-PAC
  C00573709: POL, // CA LUV PAC (Aguilar)
  C00095869: NRG, // Edison Electric Institute
  C00012914: FIN, // American Land Title Association
  C00488882: FIN, // U.S. Bancorp
  C00097485: MED, // Merck
  C00365122: FIN, // Visa
  C00386524: FIN, // Truist
  C00540146: POL, // First In Freedom PAC
  C00197095: FIN, // Northwestern Mutual
  C00579540: FIN, // Ally Financial
  C00375360: MED, // American College of Cardiology
  C00252338: NRG, // American Chemistry Council
  C00214981: BIZ, // Texas Farm Bureau
  C00004473: TEC, // NTCA rural broadband
  C00114132: MED, // American Veterinary Medical Association
  C00383950: LAB, // Elevator Constructors union
  C00364158: MED, // American College of OB-GYNs
  C00360669: LAB, // Southwest Airlines Pilots Association
  C00171330: LAW, // Holland & Knight
  C00019653: NRG, // Edison International
  C00121368: NRG, // Exxon Mobil
  C00411553: MED, // American Academy of Family Physicians
  C00235036: FIN, // Zurich
  C00082040: BIZ, // U.S. Chamber of Commerce
  C00397851: MED, // Centene
  C00076299: FIN, // CME Group
  C00171843: FIN, // Liberty Mutual
  C00101105: BIZ, // NFIB
  C00091561: LAB, // NARFE (federal employees association)
  C00822767: POL, // Rudy Victory Fund
  C00697326: POL, // On Wisconsin PAC (Steil)
  C00433060: POL, // Republican Governance Group / Tuesday Group
  C00817585: FIN, // Western Alliance Bancorporation
  C00127779: FIN, // Prudential
  C00103549: DEF, // Parsons Corporation
  C00196246: MED, // American Academy of Ophthalmology
  C00219642: BIZ, // Enterprise Holdings
  C00326389: BIZ, // Amalgamated Sugar Company
  C00510461: POL, // Aguilar Leadership Fund
  C00486217: FIN, // LPL Financial
  C00379628: BIZ, // Nucor (steel)
  C00013961: BIZ, // Sheet Metal & AC Contractors Association
  C00003764: BIZ, // National Restaurant Association
  C00557793: DEF, // Blue Origin
  C00410407: FIN, // Edward Jones
  C00035675: MED, // Bristol-Myers Squibb
  C00435933: MED, // American Academy of Neurology
  C00279455: MED, // AstraZeneca (Zeneca)
  C00544817: FIN, // State Farm
  C00166348: BIZ, // Southern Minnesota Beet Sugar Cooperative
  C00164939: BIZ, // Minn-Dak Farmers Cooperative
  C00409730: POL, // New Democrat Coalition Action Fund
  C00892901: POL, // Innovation For Good PAC
  C00103903: BIZ, // HDR Inc. (engineering)
  C00863373: POL, // BERNIE PAC (leadership)
  C00308478: BIZ, // USA Rice Federation
  C00177436: FIN, // Unum Group
  C00002261: MED, // Federation of American Hospitals
  C00217638: FIN, // International Council of Shopping Centers
  C00075341: TEC, // Motorola Solutions
  C00144774: NRG, // Southern Company
  C00213173: LAW, // K&L Gates
  C00325092: DEF, // Huntington Ingalls
  C00540518: FIN, // Capital Group
  C00128918: FIN, // Principal Life
  C00418897: BIZ, // VoteVets (ideological)
  C00400929: MED, // Cencora (drug distribution)
  C00300418: DEF, // SAIC
  C00569871: POL, // Doing Right Leadership PAC
  C00406215: FIN, // Nationwide
  C00844720: POL, // Democratic Majority Fund (DelBene)
  C00024869: DEF, // GE Aerospace
  C00010322: LAB, // American Postal Workers Union
  C00683508: POL, // Kim Victory Fund
  C00027532: LAB, // American Maritime Officers
  C00408468: BIZ, // American Soybean Association
  C00250399: BIZ, // Automotive Free International Trade PAC
  C00030809: MED, // National Community Pharmacists Association
  C00403881: MED, // American College of Physicians
  C00104901: LAW, // Akin Gump
  C00345132: BIZ, // Republican Jewish Coalition (ideological)
  C00040394: NRG, // Williams Companies (pipelines)
  C00327189: POL, // McMorris Rodgers fund
  C00108209: NRG, // Dominion Energy
  C00573261: BIZ, // End Citizens United (ideological)
  C00306894: FIN, // Managed Funds Association (hedge funds)
  C00043463: FIN, // Manufactured Housing Institute
  C00503052: POL, // Jeffries Victory Fund
  C00113803: MED, // American Osteopathic Association
  C00107300: BIZ, // American Airlines
  C00033969: MED, // Novartis
  C00390161: POL, // Eureka PAC
  C00373696: MED, // American Psychiatric Association
  C00009282: BIZ, // Norfolk Southern (railroad)
  C00551853: POL, // Oorah! PAC (Young)
  C00444539: BIZ, // National Asphalt Pavement Association
  C00412791: POL, // Forward Together PAC
  C00475665: NRG, // Growth Energy (ethanol)
  C00235853: BIZ, // Human Rights Campaign (ideological)
  C00169821: BIZ, // Tyson Foods
  C00495887: POL, // Tomorrow Is Meaningful PAC (Scott)
  C00007948: NRG, // Weyerhaeuser (timber)
  C00783167: POL, // Working For Ohio (Vance)
  C00100404: LAB, // United Postmasters and Managers
  C00067231: MED, // HCA Healthcare
};

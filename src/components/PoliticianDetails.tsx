import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Politician } from '../types/api';
import { DonationChart } from './DonationChart';
import { VoteHistory } from './VoteHistory';
import { MoneyOverview } from '../components/MoneyOverview';
import { WhosPaying } from '../components/WhosPaying';
import { VotesMoneyTimeline } from '../components/VotesMoneyTimeline';
import { VoteSpotlights } from '../components/VoteSpotlights';
import { Loader2, MapPin, CalendarClock, Landmark } from 'lucide-react';
import { useEffect, useState } from 'react';

// 💡 DEVELOPER TOGGLE: Set to true if you ever want to bring back the charts/history cards!
const SHOW_LEGACY_SECTIONS: boolean = false;

// "JEFFRIES, Hakeem" / "Aguilar, Peter Rey (Pete)" -> "Hakeem Jeffries" /
// "Pete Aguilar". VoteView biosames are LAST, First Middle (Nickname); the
// nickname, when present, is what the member actually goes by.
function formatBioname(bioname: string): string {
  const commaIndex = bioname.indexOf(',');
  if (commaIndex === -1) return bioname;
  const last = bioname.slice(0, commaIndex).trim();
  const rest = bioname.slice(commaIndex + 1).trim();
  const nickname = /\(([^)]+)\)/.exec(rest)?.[1];
  const firstWord =
    rest
      .replace(/\([^)]*\)/g, '')
      .trim()
      .split(/\s+/)[0] ?? '';
  const first = nickname ?? firstWord;

  const titleCaseWord = (word: string): string => {
    let out = '';
    let capitalizeNext = true;
    for (const ch of word) {
      out += capitalizeNext ? ch.toUpperCase() : ch.toLowerCase();
      capitalizeNext = ch === '-' || ch === "'";
    }
    // McCARTHY -> McCarthy
    return out.replace(/^Mc(\w)/, (_, c: string) => `Mc${c.toUpperCase()}`);
  };
  const lastFormatted = last.split(/\s+/).map(titleCaseWord).join(' ');
  return `${first} ${lastFormatted}`;
}

function ordinal(n: number): string {
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 === 1 && rem100 !== 11) return `${String(n)}st`;
  if (rem10 === 2 && rem100 !== 12) return `${String(n)}nd`;
  if (rem10 === 3 && rem100 !== 13) return `${String(n)}rd`;
  return `${String(n)}th`;
}

export default function PoliticianDetails() {
  const { id } = useParams<{ id: string }>();
  const [photoFailed, setPhotoFailed] = useState(false);

  const showLegacySections = SHOW_LEGACY_SECTIONS;

  const {
    data: politician,
    isLoading: loadingMeta,
    isError,
  } = useQuery<Politician>({
    queryKey: ['politician', id],
    queryFn: async () => {
      const data = await api.getPoliticianById(id || '');
      if (!data) throw new Error('Politician not found');
      return data;
    },
    enabled: !!id,
  });

  const { data: tenure } = useQuery({
    queryKey: ['tenure', politician?.icpsr],
    queryFn: () => api.getMemberTenure(politician?.icpsr ?? 0),
    enabled: !!politician?.icpsr,
  });

  const displayName = politician ? formatBioname(politician.full_name) : '';

  useEffect(() => {
    if (displayName) {
      document.title = `Corruption Watch | ${displayName}`;
    }
  }, [displayName]);

  if (loadingMeta)
    return (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center space-y-4"
        role="status"
      >
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="text-[10px] font-black tracking-[0.4em] text-white uppercase">
          Need about a minute to load...
        </p>
      </div>
    );

  if (isError || !politician)
    return (
      <div className="space-y-4 p-20 text-center">
        <p className="text-2xl font-black tracking-tighter text-white uppercase opacity-70">
          Politician Not Found
        </p>
      </div>
    );

  return (
    <div className="animate-in fade-in mx-auto max-w-7xl space-y-8 px-4 py-8 duration-700">
      <header className="border-primary/5 bg-card rounded-3xl border p-8 shadow-sm md:p-10">
        <div className="flex flex-wrap items-center gap-7">
          {/* Official Bioguide portrait, initials as fallback */}
          {!photoFailed ? (
            <img
              src={`https://unitedstates.github.io/images/congress/225x275/${politician.id}.jpg`}
              alt={`Official portrait of ${displayName}`}
              width={104}
              height={127}
              className="h-[127px] w-[104px] flex-none rounded-2xl border border-[#4A90E2]/30 object-cover"
              onError={() => {
                setPhotoFailed(true);
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-[127px] w-[104px] flex-none items-center justify-center rounded-2xl border border-[#4A90E2]/30 bg-gradient-to-br from-[#4A90E2]/25 to-[#4A90E2]/5 text-3xl font-black text-[#8ab8ec]"
            >
              {displayName
                .split(/\s+/)
                .map((w) => w[0])
                .slice(0, 2)
                .join('')}
            </div>
          )}

          <div className="min-w-[260px] flex-1 space-y-4">
            <div className="bg-primary/5 border-primary/10 inline-flex items-center gap-3 rounded-full border px-4 py-1.5">
              <span className="text-sm font-black tracking-[0.2em] text-[#4A90E2] uppercase">
                {politician.party} • {politician.role}
              </span>
            </div>

            <h1 className="text-4xl leading-none font-black tracking-tighter sm:text-5xl md:text-6xl">
              {displayName}
            </h1>

            <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm font-black tracking-widest text-zinc-400 uppercase">
              <div className="flex items-center gap-2">
                <MapPin
                  className="text-primary h-4 w-4 opacity-70"
                  aria-hidden="true"
                />
                <span>
                  {politician.chamber === 'House'
                    ? `${politician.state}-${politician.district}`
                    : politician.state}
                </span>
              </div>
              {tenure && (
                <div className="flex items-center gap-2">
                  <Landmark
                    className="text-primary h-4 w-4 opacity-70"
                    aria-hidden="true"
                  />
                  <span>
                    In office since {tenure.sinceYear}
                    {politician.chamber === 'House' &&
                      ` · ${ordinal(tenure.terms)} term`}
                  </span>
                </div>
              )}
              {politician.chamber === 'House' && (
                <div className="flex items-center gap-2">
                  <CalendarClock
                    className="text-primary h-4 w-4 opacity-70"
                    aria-hidden="true"
                  />
                  <span>Next election: Nov 3, 2026</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Structured Max-Width Layout Area */}
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4">
        {/* Analytics Section Grid (Conditionally Controlled by showLegacySections Variable) */}
        {showLegacySections && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DonationChart
              icpsr={politician.icpsr}
              politicianName={politician.full_name}
            />
            <VoteHistory icpsr={politician.icpsr} />
          </div>
        )}

        {/* Money Channels Overview (all channels shown, including zeros) */}
        <MoneyOverview politicianName={politician.full_name} />

        {/* Top donors + sector breakdown */}
        <WhosPaying politicianName={politician.full_name} />

        {/* Interactive votes & money timeline */}
        <VotesMoneyTimeline
          icpsr={politician.icpsr}
          politicianName={politician.full_name}
        />

        {/* Top contested votes by nearby money */}
        <VoteSpotlights
          icpsr={politician.icpsr}
          politicianName={politician.full_name}
        />
      </div>
    </div>
  );
}

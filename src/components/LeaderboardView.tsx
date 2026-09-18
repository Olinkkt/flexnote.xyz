import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Flame,
  Sparkles,
  Clock,
  School,
  Share2,
  Check,
  Crown,
  Medal,
  Award,
} from 'lucide-react';
import {
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardTimeframe,
  GamificationState,
} from '../types/notes';
import { UserProfile, fetchLeaderboard } from '../services/supabase';
import { formatStudyDuration } from '../services/studyTracker';
import { playPopSound, playSuccessChime } from '../utils/audio';

interface LeaderboardViewProps {
  user: { id: string; email?: string };
  profile: UserProfile | null;
  gamification: GamificationState;
  onOpenProfile?: () => void;
  onShowToast?: (title: string, message: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  user,
  profile,
  gamification,
  onOpenProfile,
  onShowToast,
}) => {
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('weekly');
  const [metric, setMetric] = useState<LeaderboardMetric>('study_time');
  const [schoolFilterOnly, setSchoolFilterOnly] = useState<boolean>(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedFlex, setCopiedFlex] = useState<boolean>(false);
  const [showFlexModal, setShowFlexModal] = useState<boolean>(false);

  const userSchool = profile?.school?.trim() || null;

  // Load leaderboard entries whenever timeframe, metric or school filter changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const filterSchool = schoolFilterOnly ? userSchool : null;

    fetchLeaderboard(metric, timeframe, filterSchool, user.id)
      .then((data) => {
        if (!isMounted) return;

        // Ensure current user entry reflects latest local gamification numbers
        const currentUserId = user.id;
        const mapped = data.map((entry) => {
          if (entry.id === currentUserId || entry.isCurrentUser) {
            return {
              ...entry,
              isCurrentUser: true,
              username: profile?.username || entry.username || 'já',
              fullName: profile?.full_name || entry.fullName,
              school: profile?.school || entry.school,
              studyTimeSeconds: Math.max(entry.studyTimeSeconds, gamification.studyTimeSeconds),
              weeklyStudySeconds: Math.max(entry.weeklyStudySeconds, gamification.weeklyStudySeconds),
              diamonds: Math.max(entry.diamonds, gamification.diamonds),
              weeklyDiamonds: Math.max(entry.weeklyDiamonds, gamification.weeklyDiamonds),
              streakDays: Math.max(entry.streakDays, gamification.streakDays),
            };
          }
          return entry;
        });

        // Re-sort with merged current user numbers
        mapped.sort((a, b) => {
          if (metric === 'study_time') {
            const valA = timeframe === 'weekly' ? a.weeklyStudySeconds : a.studyTimeSeconds;
            const valB = timeframe === 'weekly' ? b.weeklyStudySeconds : b.studyTimeSeconds;
            return valB - valA;
          }
          if (metric === 'diamonds') {
            const valA = timeframe === 'weekly' ? a.weeklyDiamonds : a.diamonds;
            const valB = timeframe === 'weekly' ? b.weeklyDiamonds : b.diamonds;
            return valB - valA;
          }
          return b.streakDays - a.streakDays;
        });

        const reRanked = mapped.map((item, idx) => ({ ...item, rank: idx + 1 }));
        setEntries(reRanked);
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [timeframe, metric, schoolFilterOnly, userSchool, user.id, gamification, profile]);

  // Current user's rank and entry
  const currentUserEntry = useMemo(() => {
    return entries.find((e) => e.isCurrentUser || e.id === user.id);
  }, [entries, user.id]);

  const top3 = useMemo(() => {
    return [
      entries.find((e) => e.rank === 2),
      entries.find((e) => e.rank === 1),
      entries.find((e) => e.rank === 3),
    ].filter(Boolean) as LeaderboardEntry[];
  }, [entries]);

  const listEntries = useMemo(() => {
    return entries.filter((e) => e.rank > 3);
  }, [entries]);

  // Format value based on metric with clean icons
  const formatMetricValue = (entry: LeaderboardEntry) => {
    if (metric === 'study_time') {
      const sec = timeframe === 'weekly' ? entry.weeklyStudySeconds : entry.studyTimeSeconds;
      return (
        <span className="inline-flex items-center gap-1">
          <Clock size={12} className="text-duoGray-pencil shrink-0" />
          <span>{formatStudyDuration(sec)}</span>
        </span>
      );
    }
    if (metric === 'diamonds') {
      const dia = timeframe === 'weekly' ? entry.weeklyDiamonds : entry.diamonds;
      return (
        <span className="inline-flex items-center gap-1">
          <Sparkles size={12} className="text-sparkBlue fill-sparkBlue shrink-0" />
          <span>{dia}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1">
        <Flame size={12} className="text-orange-500 fill-orange-500 shrink-0" />
        <span>{entry.streakDays} dní</span>
      </span>
    );
  };

  // Generate Flex status text
  const generateFlexText = () => {
    const rankText = currentUserEntry ? `${currentUserEntry.rank}. místo` : 'v TOP lize';
    const weeklyTime = formatStudyDuration(gamification.weeklyStudySeconds);
    return `Moje statistiky na Flexnote (flexnote.xyz):
• Série: ${gamification.streakDays} dní v řadě
• Čas studia tento týden: ${weeklyTime}
• Získáno drahokamů: ${gamification.weeklyDiamonds}
• Žebříček: ${rankText}
Trumfneš mě?`;
  };

  const handleCopyFlex = () => {
    playSuccessChime();
    navigator.clipboard.writeText(generateFlexText());
    setCopiedFlex(true);
    onShowToast?.('Zkopírováno!', 'Statistiky jsou připraveny k chlubení před spolužáky.');
    setTimeout(() => setCopiedFlex(false), 2500);
  };

  return (
    <div className="px-4 py-2 flex flex-col gap-3.5 pb-20 select-none animate-in fade-in duration-150">
      {/* Clean, Airy Header Row */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="font-feather font-black text-2xl text-duoGray-charcoal tracking-tight">
            Žebříček
          </h2>
          <p className="text-xs font-bold text-duoGray-pencil mt-0.5 flex items-center gap-1.5">
            {timeframe === 'weekly' ? (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} className="text-eagerGreen-dark" />
                <span>Tento týden</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Trophy size={12} className="text-amber-500" />
                <span>Celková síň slávy</span>
              </span>
            )}
            <span>•</span>
            <span>{currentUserEntry ? `Jsi na ${currentUserEntry.rank}. místě` : `${entries.length} studentů`}</span>
          </p>
        </div>

        {/* Single prominent 3D Flexit Button */}
        <button
          onClick={() => {
            playPopSound();
            setShowFlexModal(true);
          }}
          className="duo-btn duo-btn-white px-3.5 py-2 text-xs font-feather font-black text-orange-600 border-2 border-orange-200 border-b-[4px] border-b-orange-400 hover:bg-orange-50 flex items-center gap-1.5 shadow-xs transition"
        >
          <Share2 size={13} className="stroke-[2.5]" />
          <span>Flexit</span>
        </button>
      </div>

      {/* Metric Selector - Tactile Duo 3D Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            playPopSound();
            setMetric('study_time');
          }}
          className={`duo-btn py-2 px-2 text-xs font-feather font-black rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer border-2 ${
            metric === 'study_time'
              ? 'bg-storybookGreen/50 text-eagerGreen-dark border-eagerGreen border-b-[4px] shadow-xs'
              : 'bg-white text-duoGray-pencil border-duoGray-border border-b-[3px] hover:border-duoGray-faded'
          }`}
        >
          <Clock size={15} className={metric === 'study_time' ? 'stroke-[2.5]' : ''} />
          <span>Čas</span>
        </button>

        <button
          onClick={() => {
            playPopSound();
            setMetric('diamonds');
          }}
          className={`duo-btn py-2 px-2 text-xs font-feather font-black rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer border-2 ${
            metric === 'diamonds'
              ? 'bg-sparkBlue-tint text-sparkBlue border-sparkBlue border-b-[4px] shadow-xs'
              : 'bg-white text-duoGray-pencil border-duoGray-border border-b-[3px] hover:border-duoGray-faded'
          }`}
        >
          <Sparkles size={15} className={metric === 'diamonds' ? 'stroke-[2.5]' : ''} />
          <span>Drahokamy</span>
        </button>

        <button
          onClick={() => {
            playPopSound();
            setMetric('streak');
          }}
          className={`duo-btn py-2 px-2 text-xs font-feather font-black rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer border-2 ${
            metric === 'streak'
              ? 'bg-amber-100/70 text-orange-600 border-amber-400 border-b-[4px] shadow-xs'
              : 'bg-white text-duoGray-pencil border-duoGray-border border-b-[3px] hover:border-duoGray-faded'
          }`}
        >
          <Flame size={15} className={metric === 'streak' ? 'fill-orange-500 stroke-[2.5]' : ''} />
          <span>Série</span>
        </button>
      </div>

      {/* Secondary Filter Row: Timeframe & School Filter */}
      <div className="flex items-center justify-between">
        {/* 3D Timeframe Switcher */}
        <div className="flex items-center gap-1 bg-white border-2 border-duoGray-border border-b-[3px] rounded-2xl p-1 shadow-2xs">
          <button
            onClick={() => {
              playPopSound();
              setTimeframe('weekly');
            }}
            className={`px-2.5 py-1 rounded-xl font-feather font-black transition cursor-pointer text-[11px] ${
              timeframe === 'weekly'
                ? 'bg-duoGray-charcoal text-white shadow-2xs'
                : 'text-duoGray-pencil hover:text-duoGray-charcoal'
            }`}
          >
            Tento týden
          </button>
          <button
            onClick={() => {
              playPopSound();
              setTimeframe('all-time');
            }}
            className={`px-2.5 py-1 rounded-xl font-feather font-black transition cursor-pointer text-[11px] ${
              timeframe === 'all-time'
                ? 'bg-duoGray-charcoal text-white shadow-2xs'
                : 'text-duoGray-pencil hover:text-duoGray-charcoal'
            }`}
          >
            Celkově
          </button>
        </div>

        {/* 3D School Filter Button */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              playPopSound();
              if (schoolFilterOnly) {
                setSchoolFilterOnly(false);
              } else {
                if (!userSchool) {
                  onOpenProfile?.();
                  onShowToast?.('Vyplň svou školu', 'Pro filtrování spolužáků si nejprve v profilu nastav školu.');
                  return;
                }
                setSchoolFilterOnly(true);
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-feather font-black flex items-center gap-1 transition cursor-pointer border-2 border-b-[3px] ${
              schoolFilterOnly
                ? 'bg-sparkBlue text-white border-sparkBlue shadow-xs'
                : 'bg-white text-duoGray-pencil border-duoGray-border hover:text-duoGray-charcoal'
            }`}
          >
            <School size={13} />
            <span>{schoolFilterOnly && userSchool ? userSchool.split(' ')[0] : 'Moje škola'}</span>
          </button>
        </div>
      </div>

      {/* Podium Card for TOP 3 - Always visible */}
      <div className="my-1 pt-8 pb-4 px-3 bg-white rounded-3xl border-2 border-duoGray-border border-b-[5px] shadow-sm">
        <div className="flex items-end justify-center gap-2 sm:gap-4 max-w-xs sm:max-w-sm mx-auto">
          {/* 2nd place (Silver - Left) */}
          <div className="flex-1 flex flex-col items-center">
            {entries[1] ? (
              <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-2 duration-200">
                <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-feather font-black text-sm text-slate-700 shadow-2xs relative mb-1.5">
                  <Medal size={22} className="text-slate-500 fill-slate-300" />
                  {entries[1].isCurrentUser && (
                    <span className="absolute -top-1 -right-1 bg-eagerGreen text-white text-[9px] px-1 rounded-full font-black border-b-2 border-eagerGreen-dark shadow-xs">
                      TY
                    </span>
                  )}
                </div>
                <div className="text-xs font-feather font-black text-duoGray-charcoal truncate max-w-[85px] text-center">
                  @{entries[1].username}
                </div>
                <div className="text-[10.5px] font-bold text-duoGray-pencil mb-2 truncate max-w-[90px] text-center">
                  {formatMetricValue(entries[1])}
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center opacity-60">
                <div className="w-12 h-12 rounded-full bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs font-bold mb-1.5">
                  <Medal size={22} className="text-slate-400 fill-slate-200 opacity-60" />
                </div>
                <div className="text-xs font-feather font-bold text-duoGray-faded text-center">
                  Volno
                </div>
                <div className="text-[10.5px] font-bold text-duoGray-faded mb-2 text-center">
                  -
                </div>
              </div>
            )}
            {/* Flat Silver Pedestal - 2nd place medium height */}
            <div className="w-full h-[75px] bg-slate-200/80 rounded-t-2xl flex items-center justify-center">
              <span className="font-feather font-black text-2xl text-slate-600">2</span>
            </div>
          </div>

          {/* 1st place (Gold - Champion - Center - Tallest!) */}
          <div className="flex-1 flex flex-col items-center">
            {entries[0] ? (
              <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-3 duration-200">
                <div className="relative mb-1.5 flex flex-col items-center">
                  <div className="absolute -top-6 left-0 right-0 flex justify-center pointer-events-none">
                    <Crown size={20} className="text-amber-500 fill-amber-400 drop-shadow-2xs" />
                  </div>
                  <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center font-feather font-black text-lg text-amber-800 shadow-xs">
                    <Trophy size={22} className="text-amber-500 fill-amber-300" />
                    {entries[0].isCurrentUser && (
                      <span className="absolute -top-1 -right-1 bg-eagerGreen text-white text-[9px] px-1.5 rounded-full font-black border-b-2 border-eagerGreen-dark shadow-xs">
                        TY
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs font-feather font-black text-duoGray-charcoal truncate max-w-[95px] text-center">
                  @{entries[0].username}
                </div>
                <div className="text-[11px] font-black text-amber-600 mb-2 truncate max-w-[95px] text-center">
                  {formatMetricValue(entries[0])}
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center opacity-60">
                <div className="relative mb-1.5 flex flex-col items-center">
                  <div className="absolute -top-6 left-0 right-0 flex justify-center pointer-events-none">
                    <Crown size={20} className="text-amber-400 fill-amber-300 opacity-60" />
                  </div>
                  <div className="w-14 h-14 rounded-full bg-amber-50/50 border-2 border-dashed border-amber-300 flex items-center justify-center text-amber-500 shadow-xs">
                    <Trophy size={22} className="text-amber-400 fill-amber-200 opacity-60" />
                  </div>
                </div>
                <div className="text-xs font-feather font-bold text-duoGray-faded text-center">
                  Volno
                </div>
                <div className="text-[11px] font-bold text-duoGray-faded mb-2 text-center">
                  -
                </div>
              </div>
            )}
            {/* Flat Gold Pedestal - 1st place tallest */}
            <div className="w-full h-[105px] bg-amber-200/90 rounded-t-2xl flex items-center justify-center">
              <span className="font-feather font-black text-3xl text-amber-800">1</span>
            </div>
          </div>

          {/* 3rd place (Bronze - Right - Lowest) */}
          <div className="flex-1 flex flex-col items-center">
            {entries[2] ? (
              <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-1 duration-200">
                <div className="w-12 h-12 rounded-full bg-orange-50 border-2 border-orange-300 flex items-center justify-center font-feather font-black text-sm text-orange-900 shadow-2xs relative mb-1.5">
                  <Award size={22} className="text-amber-700 fill-amber-300" />
                  {entries[2].isCurrentUser && (
                    <span className="absolute -top-1 -right-1 bg-eagerGreen text-white text-[9px] px-1 rounded-full font-black border-b-2 border-eagerGreen-dark shadow-xs">
                      TY
                    </span>
                  )}
                </div>
                <div className="text-xs font-feather font-black text-duoGray-charcoal truncate max-w-[85px] text-center">
                  @{entries[2].username}
                </div>
                <div className="text-[10.5px] font-bold text-duoGray-pencil mb-2 truncate max-w-[90px] text-center">
                  {formatMetricValue(entries[2])}
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center opacity-60">
                <div className="w-12 h-12 rounded-full bg-orange-50/40 border-2 border-dashed border-orange-300 flex items-center justify-center text-orange-500 text-xs font-bold mb-1.5">
                  <Award size={22} className="text-amber-600/60 fill-amber-200 opacity-60" />
                </div>
                <div className="text-xs font-feather font-bold text-duoGray-faded text-center">
                  Volno
                </div>
                <div className="text-[10.5px] font-bold text-duoGray-faded mb-2 text-center">
                  -
                </div>
              </div>
            )}
            {/* Flat Bronze Pedestal - 3rd place lowest */}
            <div className="w-full h-[50px] bg-orange-200/80 rounded-t-2xl flex items-center justify-center">
              <span className="font-feather font-black text-xl text-orange-800">3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Unified, Clean 3D Ranked List for Ranks 4+ */}
      <div className="mt-1">
        {loading ? (
          <div className="py-12 text-center text-xs font-feather font-bold text-duoGray-pencil">
            Načítám žebříček studentů...
          </div>
        ) : listEntries.length === 0 ? (
          <div className="py-8 text-center text-xs font-bold text-duoGray-pencil bg-white rounded-3xl border-2 border-duoGray-border border-b-[4px] shadow-2xs">
            {entries.length === 0
              ? 'Zatím v této kategorii nikdo nesoutěží. Buď první na pódiu!'
              : 'Všichni soutěžící jsou na pódiu výše. Buď další!'}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border-2 border-duoGray-border border-b-[5px] divide-y-2 divide-gray-100 overflow-hidden shadow-xs">
            {listEntries.map((entry) => {
              const isMe = entry.isCurrentUser;
              return (
                <div
                  key={entry.id}
                  className={`p-3 sm:px-4 flex items-center justify-between transition ${
                    isMe
                      ? 'bg-storybookGreen/30'
                      : 'hover:bg-gray-50/70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-5 text-center font-feather font-black text-xs shrink-0 ${
                      isMe ? 'text-eagerGreen-dark font-black' : 'text-duoGray-pencil'
                    }`}>
                      {entry.rank}
                    </span>

                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-feather font-black text-xs uppercase ${
                      isMe
                        ? 'bg-eagerGreen text-white border-b-2 border-eagerGreen-dark shadow-2xs'
                        : 'bg-gray-100 text-duoGray-charcoal border border-gray-200'
                    }`}>
                      {entry.username.substring(0, 2)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-feather font-black text-xs truncate ${
                          isMe ? 'text-eagerGreen-dark font-black' : 'text-duoGray-charcoal'
                        }`}>
                          @{entry.username}
                        </span>
                        {isMe && (
                          <span className="bg-eagerGreen text-white text-[9px] font-feather font-black px-1.5 py-0.5 rounded-md border-b-2 border-eagerGreen-dark shadow-2xs">
                            TY
                          </span>
                        )}
                      </div>
                      {entry.school && (
                        <span className="text-[10px] font-bold text-duoGray-pencil truncate block">
                          {entry.school}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`font-feather font-black text-xs shrink-0 text-right ${
                    isMe ? 'text-eagerGreen-dark font-black' : 'text-duoGray-charcoal'
                  }`}>
                    {formatMetricValue(entry)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Sticky Indicator ONLY if user is far down in a long list */}
      {currentUserEntry && currentUserEntry.rank > 10 && entries.length > 10 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 px-3 max-w-[440px] mx-auto pointer-events-none">
          <div className="p-2.5 bg-white/95 backdrop-blur-md rounded-2xl border-2 border-duoGray-border shadow-xl flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-eagerGreen text-white flex items-center justify-center font-feather font-black text-xs shrink-0">
                #{currentUserEntry.rank}
              </div>
              <div className="min-w-0">
                <div className="font-feather font-black text-xs text-duoGray-charcoal flex items-center gap-1 truncate">
                  <span>@{currentUserEntry.username} (Ty)</span>
                </div>
                <div className="text-[10px] text-duoGray-pencil font-bold">
                  Aktuální pozice v lize
                </div>
              </div>
            </div>

            <span className="font-feather font-black text-xs text-duoGray-charcoal shrink-0">
              {formatMetricValue(currentUserEntry)}
            </span>
          </div>
        </div>
      )}

      {/* Flexit Modal */}
      {showFlexModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-duoGray-charcoal/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl border-2 border-duoGray-border border-b-6 shadow-2xl p-5 text-center animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
              <Trophy size={32} className="fill-yellow-200" />
            </div>

            <h3 className="font-feather font-black text-xl text-duoGray-charcoal">
              Flexit výsledky
            </h3>
            <p className="text-xs font-bold text-duoGray-pencil mt-1 mb-4">
              Pochlub se svým časem studia, sérií a nasbíranými drahokamy před spolužáky na Discordu nebo sítích!
            </p>

            {/* Stylized Preview Box */}
            <div className="bg-gray-50 border-2 border-duoGray-border rounded-2xl p-3.5 text-left font-mono text-xs text-duoGray-charcoal mb-4 whitespace-pre-line leading-relaxed select-all">
              {generateFlexText()}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowFlexModal(false)}
                className="flex-1 duo-btn duo-btn-white text-xs font-feather font-black uppercase tracking-wider py-2.5 cursor-pointer"
              >
                Zavřít
              </button>
              <button
                onClick={handleCopyFlex}
                className="flex-1 duo-btn duo-btn-green text-xs font-feather font-black uppercase tracking-wider py-2.5 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedFlex ? (
                  <>
                    <Check size={15} />
                    <span>Zkopírováno!</span>
                  </>
                ) : (
                  <>
                    <Share2 size={15} />
                    <span>Zkopírovat</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

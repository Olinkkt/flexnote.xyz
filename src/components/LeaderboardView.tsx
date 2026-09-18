import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Flame,
  Sparkles,
  Clock,
  School,
  Globe,
  Share2,
  Check,
  Crown,
  Medal,
  ChevronUp,
  User as UserIcon,
  RefreshCw,
  Sparkle
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

  // Format value based on metric
  const formatMetricValue = (entry: LeaderboardEntry) => {
    if (metric === 'study_time') {
      const sec = timeframe === 'weekly' ? entry.weeklyStudySeconds : entry.studyTimeSeconds;
      return formatStudyDuration(sec);
    }
    if (metric === 'diamonds') {
      const dia = timeframe === 'weekly' ? entry.weeklyDiamonds : entry.diamonds;
      return `${dia} 💎`;
    }
    return `${entry.streakDays} dní 🔥`;
  };

  // Generate Flex status text
  const generateFlexText = () => {
    const rankText = currentUserEntry ? `${currentUserEntry.rank}. místo` : 'v TOP lize';
    const weeklyTime = formatStudyDuration(gamification.weeklyStudySeconds);
    return `🔥 Moje statistiky na Flexnote (flexnote.xyz):
⚡ Série: ${gamification.streakDays} dní v řadě
⏱️ Čas studia tento týden: ${weeklyTime}
💎 Získáno: ${gamification.weeklyDiamonds} drahokamů
🏆 Žebříček: ${rankText} v lize!
Trumfneš mě? 🚀`;
  };

  const handleCopyFlex = () => {
    playSuccessChime();
    navigator.clipboard.writeText(generateFlexText());
    setCopiedFlex(true);
    onShowToast?.('Zkopírováno!', 'Statistiky jsou připraveny k chlubení před spolužáky.');
    setTimeout(() => setCopiedFlex(false), 2500);
  };

  return (
    <div className="flex flex-col gap-4 pb-20 select-none animate-in fade-in duration-150">
      {/* Top Banner Header */}
      <div className="duo-card p-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white shadow-inner">
            <Trophy size={26} className="fill-yellow-300 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="font-feather font-black text-lg sm:text-xl leading-tight">
              Ligové žebříčky
            </h2>
            <p className="text-xs font-bold text-white/90">
              Soutěž se spolužáky a ukaž, kdo studuje nejpoctivěji!
            </p>
          </div>
        </div>

        {/* Flexit Button */}
        <button
          onClick={() => {
            playPopSound();
            setShowFlexModal(true);
          }}
          className="duo-btn bg-white text-orange-600 hover:bg-white/90 border-white text-xs font-feather font-black uppercase tracking-wider py-2 px-3 sm:px-4 shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Share2 size={15} />
          <span>Flexit 🚀</span>
        </button>
      </div>

      {/* Timeframe Tabs: Tento týden vs Celkově */}
      <div className="flex bg-duoGray-faded/20 p-1 rounded-2xl border-2 border-duoGray-border">
        <button
          onClick={() => {
            playPopSound();
            setTimeframe('weekly');
          }}
          className={`flex-1 py-2 text-xs font-feather font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
            timeframe === 'weekly'
              ? 'bg-white text-duoGray-charcoal shadow-xs border border-duoGray-border/40'
              : 'text-duoGray-pencil hover:text-duoGray-charcoal'
          }`}
        >
          ⚡ Tento týden
        </button>
        <button
          onClick={() => {
            playPopSound();
            setTimeframe('all-time');
          }}
          className={`flex-1 py-2 text-xs font-feather font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
            timeframe === 'all-time'
              ? 'bg-white text-duoGray-charcoal shadow-xs border border-duoGray-border/40'
              : 'text-duoGray-pencil hover:text-duoGray-charcoal'
          }`}
        >
          👑 Celkově (Síň slávy)
        </button>
      </div>

      {/* Metric Selector Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            playPopSound();
            setMetric('study_time');
          }}
          className={`duo-card p-2.5 flex flex-col items-center justify-center gap-1 text-center transition cursor-pointer ${
            metric === 'study_time'
              ? 'bg-storybookGreen/30 border-eagerGreen text-eagerGreen-dark'
              : 'bg-white text-duoGray-pencil hover:border-duoGray-faded'
          }`}
        >
          <Clock size={18} className={metric === 'study_time' ? 'stroke-[2.5]' : ''} />
          <span className="text-[11px] font-feather font-black">Čas studia</span>
        </button>

        <button
          onClick={() => {
            playPopSound();
            setMetric('diamonds');
          }}
          className={`duo-card p-2.5 flex flex-col items-center justify-center gap-1 text-center transition cursor-pointer ${
            metric === 'diamonds'
              ? 'bg-sparkBlue-tint border-sparkBlue text-sparkBlue'
              : 'bg-white text-duoGray-pencil hover:border-duoGray-faded'
          }`}
        >
          <Sparkles size={18} className={metric === 'diamonds' ? 'stroke-[2.5]' : ''} />
          <span className="text-[11px] font-feather font-black">Drahokamy</span>
        </button>

        <button
          onClick={() => {
            playPopSound();
            setMetric('streak');
          }}
          className={`duo-card p-2.5 flex flex-col items-center justify-center gap-1 text-center transition cursor-pointer ${
            metric === 'streak'
              ? 'bg-amber-50 border-amber-400 text-orange-600'
              : 'bg-white text-duoGray-pencil hover:border-duoGray-faded'
          }`}
        >
          <Flame size={18} className={metric === 'streak' ? 'fill-orange-400 stroke-[2.5]' : ''} />
          <span className="text-[11px] font-feather font-black">Série (Streak)</span>
        </button>
      </div>

      {/* School Filter Toggle Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playPopSound();
              setSchoolFilterOnly(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-feather font-black flex items-center gap-1.5 transition cursor-pointer border-2 ${
              !schoolFilterOnly
                ? 'bg-duoGray-charcoal text-white border-duoGray-charcoal'
                : 'bg-white text-duoGray-pencil border-duoGray-border hover:text-duoGray-charcoal'
            }`}
          >
            <Globe size={14} />
            <span>Celá komunita</span>
          </button>

          <button
            onClick={() => {
              playPopSound();
              if (!userSchool) {
                onOpenProfile?.();
                onShowToast?.('Vyplň svou školu', 'Pro filtrování spolužáků si nejprve v profilu nastav školu.');
                return;
              }
              setSchoolFilterOnly(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-feather font-black flex items-center gap-1.5 transition cursor-pointer border-2 ${
              schoolFilterOnly
                ? 'bg-duoGray-charcoal text-white border-duoGray-charcoal'
                : 'bg-white text-duoGray-pencil border-duoGray-border hover:text-duoGray-charcoal'
            }`}
          >
            <School size={14} />
            <span>{userSchool ? userSchool.split(' ')[0] : 'Moje škola'}</span>
          </button>
        </div>

        <span className="text-[11px] font-bold text-duoGray-pencil">
          {entries.length} studentů
        </span>
      </div>

      {/* Podium for TOP 3 */}
      {!loading && entries.length >= 3 && (
        <div className="duo-card bg-gradient-to-b from-white to-amber-50/50 p-4 pt-6 border-2 border-duoGray-border shadow-xs">
          <div className="flex items-end justify-center gap-2 sm:gap-4 max-w-sm mx-auto">
            {/* 2nd place (Silver) */}
            {entries[1] && (
              <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-3 duration-200">
                <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-feather font-black text-sm text-slate-700 shadow-sm relative mb-1.5">
                  <span className="text-base font-black">🥈</span>
                  {entries[1].isCurrentUser && (
                    <span className="absolute -top-1 -right-1 bg-eagerGreen text-white text-[9px] px-1 rounded-full font-black">
                      TY
                    </span>
                  )}
                </div>
                <div className="text-xs font-feather font-black text-duoGray-charcoal truncate max-w-[85px] text-center">
                  @{entries[1].username}
                </div>
                <div className="text-[10px] font-extrabold text-duoGray-pencil mb-2">
                  {formatMetricValue(entries[1])}
                </div>
                {/* Silver Pedestal */}
                <div className="w-full h-20 bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-2xl border-2 border-b-0 border-slate-300 flex flex-col items-center justify-center text-slate-700 font-feather font-black text-lg shadow-xs">
                  <span>2</span>
                  <span className="text-[9px] uppercase text-slate-500 font-bold">Stříbro</span>
                </div>
              </div>
            )}

            {/* 1st place (Gold - Champion) */}
            {entries[0] && (
              <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-5 duration-200">
                <div className="relative mb-1.5">
                  <Crown size={22} className="text-amber-500 fill-amber-400 absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce" />
                  <div className="w-14 h-14 rounded-full bg-amber-100 border-3 border-amber-400 flex items-center justify-center font-feather font-black text-lg text-amber-800 shadow-md">
                    <span>🥇</span>
                    {entries[0].isCurrentUser && (
                      <span className="absolute -top-1 -right-1 bg-eagerGreen text-white text-[9px] px-1.5 rounded-full font-black">
                        TY
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs font-feather font-black text-duoGray-charcoal truncate max-w-[95px] text-center">
                  @{entries[0].username}
                </div>
                <div className="text-[11px] font-black text-amber-600 mb-2">
                  {formatMetricValue(entries[0])}
                </div>
                {/* Gold Pedestal */}
                <div className="w-full h-28 bg-gradient-to-t from-amber-300 via-amber-200 to-amber-100 rounded-t-2xl border-2 border-b-0 border-amber-400 flex flex-col items-center justify-center text-amber-800 font-feather font-black text-2xl shadow-md">
                  <span>1</span>
                  <span className="text-[10px] uppercase text-amber-700 font-black tracking-wider">Šampion</span>
                </div>
              </div>
            )}

            {/* 3rd place (Bronze) */}
            {entries[2] && (
              <div className="flex-1 flex flex-col items-center animate-in slide-in-from-bottom-2 duration-200">
                <div className="w-12 h-12 rounded-full bg-amber-100/60 border-2 border-amber-600/40 flex items-center justify-center font-feather font-black text-sm text-amber-900 shadow-sm relative mb-1.5">
                  <span className="text-base font-black">🥉</span>
                  {entries[2].isCurrentUser && (
                    <span className="absolute -top-1 -right-1 bg-eagerGreen text-white text-[9px] px-1 rounded-full font-black">
                      TY
                    </span>
                  )}
                </div>
                <div className="text-xs font-feather font-black text-duoGray-charcoal truncate max-w-[85px] text-center">
                  @{entries[2].username}
                </div>
                <div className="text-[10px] font-extrabold text-duoGray-pencil mb-2">
                  {formatMetricValue(entries[2])}
                </div>
                {/* Bronze Pedestal */}
                <div className="w-full h-16 bg-gradient-to-t from-amber-200/60 to-orange-100 rounded-t-2xl border-2 border-b-0 border-amber-600/30 flex flex-col items-center justify-center text-amber-900 font-feather font-black text-lg shadow-xs">
                  <span>3</span>
                  <span className="text-[9px] uppercase text-amber-800 font-bold">Bronz</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ranked List for ranks 4..50 */}
      <div className="flex flex-col gap-2">
        {loading ? (
          <div className="py-12 text-center text-xs font-feather font-bold text-duoGray-pencil">
            Načítám žebříček studentů...
          </div>
        ) : listEntries.length === 0 && entries.length <= 3 ? (
          <div className="py-6 text-center text-xs font-bold text-duoGray-pencil">
            V této kategorii zatím soutěží první 3 studenti. Buď další!
          </div>
        ) : (
          listEntries.map((entry) => {
            const isMe = entry.isCurrentUser;
            return (
              <div
                key={entry.id}
                className={`duo-card p-3 flex items-center justify-between transition ${
                  isMe
                    ? 'bg-storybookGreen/30 border-eagerGreen border-b-[4px] shadow-sm'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center font-feather font-black text-sm text-duoGray-pencil shrink-0">
                    {entry.rank}
                  </span>

                  <div className="w-9 h-9 rounded-xl bg-gray-100 border border-duoGray-border flex items-center justify-center text-duoGray-charcoal shrink-0 font-feather font-black text-xs uppercase">
                    {entry.username.substring(0, 2)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-feather font-black text-xs text-duoGray-charcoal truncate">
                        @{entry.username}
                      </span>
                      {isMe && (
                        <span className="bg-eagerGreen text-white text-[9px] font-feather font-black px-1.5 py-0.5 rounded-full">
                          TY
                        </span>
                      )}
                    </div>
                    {entry.school && (
                      <span className="text-[10.5px] font-bold text-duoGray-pencil truncate block">
                        {entry.school}
                      </span>
                    )}
                  </div>
                </div>

                <div className="font-feather font-black text-xs text-duoGray-charcoal shrink-0 text-right">
                  {formatMetricValue(entry)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Current User Placement Bar (if not in top 3) */}
      {currentUserEntry && currentUserEntry.rank > 3 && (
        <div className="fixed bottom-14 left-0 right-0 z-30 px-3 py-2 bg-duoGray-charcoal/90 backdrop-blur-md text-white border-t border-white/20 flex items-center justify-between shadow-2xl max-w-[440px] mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-eagerGreen text-white flex items-center justify-center font-feather font-black text-xs shrink-0">
              #{currentUserEntry.rank}
            </div>
            <div>
              <div className="font-feather font-black text-xs flex items-center gap-1">
                <span>@{currentUserEntry.username} (Ty)</span>
              </div>
              <div className="text-[10px] text-white/80 font-bold">
                Aktuální pozice v lize
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-feather font-black text-xs text-amber-300">
              {formatMetricValue(currentUserEntry)}
            </span>
            <button
              onClick={handleCopyFlex}
              title="Zkopírovat statistiky"
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-feather font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
            >
              <Share2 size={12} />
              <span>Flexit</span>
            </button>
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
              Flexit výsledky 🚀
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

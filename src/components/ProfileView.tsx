import React, { useState, useEffect } from 'react';
import {
  LogOut,
  Sparkles,
  BookOpen,
  School,
  ShieldCheck,
  Pencil,
  X,
  Loader2,
  Check,
  AtSign,
  User,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Download,
  ChevronRight,
  Wifi,
  WifiOff,
  Smartphone,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { UserProfile, signOutUser, updateUserProfile, checkUsernameAvailability } from '../services/supabase';
import { playPopSound, playSuccessChime } from '../utils/audio';

interface ProfileViewProps {
  user: { id: string; email?: string };
  profile: UserProfile | null;
  totalNotes: number;
  onSignOut: () => void;
  onUpdateProfile?: (updated: UserProfile) => void;
  onOpenExport?: () => void;
  isOnline?: boolean;
  pendingSyncCount?: number;
  isSyncing?: boolean;
  onSyncNow?: () => void;
}

const GRADE_CATEGORIES = [
  {
    name: 'Základní škola (ZŠ)',
    grades: ['6. třída', '7. třída', '8. třída', '9. třída'],
  },
  {
    name: 'Střední škola & SOU',
    grades: ['1. ročník', '2. ročník', '3. ročník', '4. ročník'],
  },
  {
    name: 'Víceleté gymnázium',
    grades: ['Prima', 'Sekunda', 'Tercie', 'Kvarta', 'Kvinta', 'Sexta', 'Septima', 'Oktáva'],
  },
];

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'too_short' | 'same';

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  profile,
  totalNotes,
  onSignOut,
  onUpdateProfile,
  onOpenExport,
  isOnline = true,
  pendingSyncCount = 0,
  isSyncing = false,
  onSyncNow,
}) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [school, setSchool] = useState(profile?.school || '');
  const [grade, setGrade] = useState(profile?.grade || '');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');

  // Real-time debounced check of username availability as user types (Instagram / GitHub standard)
  useEffect(() => {
    if (!editModalOpen) {
      setUsernameStatus('idle');
      return;
    }

    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    // Pre-validation guards: zero database requests
    if (clean.length === 0) {
      setUsernameStatus('idle');
      return;
    }

    if (clean.length < 3) {
      setUsernameStatus('too_short');
      return;
    }

    if (clean === profile?.username) {
      setUsernameStatus('same');
      return;
    }

    setUsernameStatus('checking');

    // Create an AbortController to cancel stale in-flight requests if user keeps typing
    const abortController = new AbortController();

    // 500ms debounce (industry standard: typing speed is ~200-300ms/char)
    const timer = setTimeout(async () => {
      try {
        const isAvailable = await checkUsernameAvailability(clean, user.id, abortController.signal);
        setUsernameStatus(isAvailable ? 'available' : 'taken');
      } catch (err: unknown) {
        // If aborted by next keystroke, ignore and do not reset status
        if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('abort') || err.message.includes('aborted'))) {
          return;
        }
        setUsernameStatus('idle');
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [username, editModalOpen, profile?.username, user.id]);

  const handleSignOut = async () => {
    playPopSound();
    try {
      await signOutUser();
      onSignOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleOpenEdit = () => {
    playPopSound();
    setFullName(profile?.full_name || '');
    setUsername(profile?.username || '');
    setSchool(profile?.school || '');
    setGrade(profile?.grade || '');
    setUsernameStatus('same');
    setErrorMessage(null);
    setEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    playPopSound();

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (cleanUsername.length < 3) {
      setErrorMessage('Přezdívka musí mít alespoň 3 znaky (písmena, číslice).');
      return;
    }

    if (usernameStatus === 'taken') {
      setErrorMessage(`Přezdívka @${cleanUsername} je již obsazená.`);
      return;
    }

    setSaving(true);

    try {
      if (cleanUsername !== profile?.username) {
        const isAvailable = await checkUsernameAvailability(cleanUsername, user.id);
        if (!isAvailable) {
          setErrorMessage(`Přezdívka @${cleanUsername} je již obsazená. Zvol prosím jinou.`);
          setUsernameStatus('taken');
          setSaving(false);
          return;
        }
      }

      const updated = await updateUserProfile(user.id, {
        full_name: fullName.trim() || null,
        username: cleanUsername,
        school: school.trim() || null,
        grade: grade.trim() || null,
      });

      playSuccessChime();
      onUpdateProfile?.(updated);
      setEditModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('duplicate key') || msg.includes('profiles_username_key')) {
        setErrorMessage('Tato přezdívka je již obsazená.');
        setUsernameStatus('taken');
      } else {
        setErrorMessage(`Chyba při ukládání: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Student';
  const initial = displayName.charAt(0).toUpperCase();

  const schoolGradeText =
    profile?.school && profile?.grade
      ? `${profile.school} • ${profile.grade}`
      : profile?.school || profile?.grade || 'Škola a ročník nezadány';

  const isSaveDisabled =
    saving ||
    usernameStatus === 'taken' ||
    usernameStatus === 'too_short' ||
    usernameStatus === 'checking';

  return (
    <div className="p-4 flex flex-col gap-3.5 animate-in fade-in duration-150 select-none">
      {/* Unified Profile Card with single clean Edit button */}
      <div className="duo-card p-4 bg-white flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-eagerGreen border-b-4 border-eagerGreen-dark flex items-center justify-center text-white font-feather font-black text-xl shadow-xs shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-feather font-black text-base text-duoGray-charcoal truncate">
                {displayName}
              </h3>
              <ShieldCheck size={16} className="text-sparkBlue shrink-0" />
            </div>

            {/* School & Grade display inside profile card */}
            <p className="text-xs font-bold text-duoGray-pencil truncate mt-0.5">
              {schoolGradeText}
            </p>

            <p className="text-[11px] font-bold text-duoGray-faded truncate mt-0.5">
              {user.email}
            </p>
          </div>
        </div>

        {/* The ONLY Edit Button */}
        <button
          onClick={handleOpenEdit}
          title="Upravit profil"
          className="p-2.5 rounded-xl border-2 border-duoGray-border hover:border-eagerGreen hover:bg-gray-50 text-duoGray-charcoal active:scale-95 transition cursor-pointer shrink-0"
        >
          <Pencil size={15} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="duo-card p-3 bg-white flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-storybookGreen text-eagerGreen flex items-center justify-center shrink-0">
            <BookOpen size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="text-[10px] font-feather font-black uppercase text-duoGray-pencil">
              Zápisky
            </div>
            <div className="font-feather font-black text-base text-duoGray-charcoal">
              {totalNotes}
            </div>
          </div>
        </div>

        <div className="duo-card p-3 bg-white flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sparkBlue-tint text-sparkBlue flex items-center justify-center shrink-0">
            <Sparkles size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="text-[10px] font-feather font-black uppercase text-duoGray-pencil">
              Drahokamy
            </div>
            <div className="font-feather font-black text-base text-duoGray-charcoal">
              {profile?.diamonds || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Network & Cloud Status Card (Strictly no pill shapes) */}
      <div className="duo-card p-3.5 bg-white flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isOnline ? (
              <div className="w-8 h-8 rounded-xl bg-storybookGreen text-eagerGreen flex items-center justify-center shrink-0">
                <Wifi size={17} className="stroke-[2.5]" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-[#fffbeb] text-[#d97706] flex items-center justify-center shrink-0">
                <WifiOff size={17} className="stroke-[2.5]" />
              </div>
            )}
            <div>
              <div className="font-feather font-black text-xs text-duoGray-charcoal">
                {isOnline ? 'Cloudová synchronizace' : 'Režim offline'}
              </div>
              <p className="text-[11px] font-bold text-duoGray-pencil">
                {isOnline
                  ? 'Aktivní připojení k serveru'
                  : 'Změny se ukládají lokálně do zařízení'}
              </p>
            </div>
          </div>
          <span
            className={`text-[11px] font-feather font-black px-2.5 py-1 rounded-md border ${
              isOnline
                ? 'text-eagerGreen bg-storybookGreen/60 border-eagerGreen/30'
                : 'text-[#b45309] bg-[#fef3c7] border-[#fcd34d]'
            }`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Pending Sync Queue Action if changes are queued */}
        {pendingSyncCount > 0 && (
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#b45309]">
              {pendingSyncCount} {pendingSyncCount === 1 ? 'změna čeká' : 'změn čeká'} na synchronizaci
            </span>
            {isOnline && onSyncNow && (
              <button
                onClick={() => {
                  playPopSound();
                  onSyncNow();
                }}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-eagerGreen hover:bg-eagerGreen-dark text-white text-xs font-feather font-black uppercase tracking-wider cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Synchronizuji...' : 'Synchronizovat'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Offline Storage Card */}
      <div className="duo-card p-3.5 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gray-100 text-duoGray-charcoal flex items-center justify-center shrink-0">
            <HardDrive size={17} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="font-feather font-black text-xs text-duoGray-charcoal">
              Offline úložiště v zařízení
            </div>
            <p className="text-[11px] font-bold text-duoGray-pencil">
              {totalNotes} {totalNotes === 1 ? 'zápisek' : totalNotes < 5 ? 'zápisky' : 'zápisků'} připraveno bez internetu
            </p>
          </div>
        </div>
        <span className="text-[11px] font-feather font-black text-duoGray-charcoal bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
          Uloženo
        </span>
      </div>

      {/* PWA Mobile App Card */}
      <div className="duo-card p-3.5 bg-white">
        <button
          onClick={() => {
            playPopSound();
            setShowPwaGuide(!showPwaGuide);
          }}
          className="w-full flex items-center justify-between cursor-pointer text-left group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sparkBlue-tint text-sparkBlue flex items-center justify-center shrink-0">
              <Smartphone size={17} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="font-feather font-black text-xs text-duoGray-charcoal">
                Aplikace na plochu telefonu
              </div>
              <p className="text-[11px] font-bold text-duoGray-pencil">
                Jak používat Flexnote bez prohlížeče
              </p>
            </div>
          </div>
          <ChevronRight
            size={18}
            className={`text-duoGray-pencil transition-transform duration-150 ${
              showPwaGuide ? 'rotate-90 text-sparkBlue' : 'group-hover:translate-x-0.5'
            }`}
          />
        </button>

        {showPwaGuide && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-xs text-duoGray-charcoal font-medium animate-in fade-in">
            <div className="p-2.5 rounded-xl bg-gray-50 border border-duoGray-border">
              <div className="font-feather font-black text-[11px] text-duoGray-charcoal uppercase tracking-wider mb-1">
                🍏 iPhone & iPad (Safari)
              </div>
              <p className="text-[11px] text-duoGray-pencil leading-relaxed">
                V dolní liště Safari klepni na tlačítko <strong>Sdílet</strong> (čtvereček se šipkou nahoru) a vyber <strong>„Přidat na plochu“</strong>.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 border border-duoGray-border">
              <div className="font-feather font-black text-[11px] text-duoGray-charcoal uppercase tracking-wider mb-1">
                🤖 Android (Chrome)
              </div>
              <p className="text-[11px] text-duoGray-pencil leading-relaxed">
                V menu vpravo nahoře (tři tečky) zvol <strong>„Instalovat aplikaci“</strong> nebo <strong>„Přidat na plochu“</strong>.
              </p>
            </div>
            <p className="text-[10px] text-duoGray-faded italic pt-0.5">
              Po přidání se Flexnote spouští na celou obrazovku a funguje 100% offline i v letovém režimu ve škole.
            </p>
          </div>
        )}
      </div>

      {/* Export All Notes Card */}
      {onOpenExport && (
        <button
          onClick={() => {
            playPopSound();
            onOpenExport();
          }}
          className="w-full duo-card p-3.5 bg-white hover:bg-gray-50/80 flex items-center justify-between group transition active:scale-98 cursor-pointer text-left shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sparkBlue-tint text-sparkBlue flex items-center justify-center shrink-0 border-2 border-sparkBlue/30 shadow-xs">
              <Download size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="font-feather font-black text-xs text-duoGray-charcoal">
                Exportovat všechny zápisky
              </div>
              <p className="text-[11px] font-bold text-duoGray-pencil mt-0.5">
                Stažení do zařízení nebo odeslání na e-mail
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-duoGray-pencil group-hover:text-sparkBlue group-hover:translate-x-0.5 transition shrink-0" />
        </button>
      )}

      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        className="w-full duo-btn duo-btn-white py-2.5 px-4 text-xs font-feather font-black uppercase tracking-wider text-[#ff4b4b] hover:bg-red-50 border-2 border-duoGray-border flex items-center justify-center gap-2 cursor-pointer mt-1"
      >
        <LogOut size={16} />
        <span>Odhlásit se</span>
      </button>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full md:max-w-[402px] max-h-[90vh] bg-white rounded-t-[32px] md:rounded-3xl flex flex-col overflow-hidden shadow-2xl border-t-2 md:border-2 border-duoGray-border animate-in slide-in-from-bottom-6 duration-150 p-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <h3 className="font-feather font-black text-[17px] text-duoGray-charcoal flex items-center gap-2">
                <GraduationCap size={20} className="text-eagerGreen" />
                <span>Upravit profil</span>
              </h3>
              <button
                onClick={() => {
                  playPopSound();
                  setEditModalOpen(false);
                }}
                className="p-1.5 rounded-duo border-2 border-duoGray-border hover:bg-gray-100 text-duoGray-charcoal transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3 overflow-y-auto pr-1">
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[#d93838] text-xs font-bold leading-tight animate-in fade-in">
                  {errorMessage}
                </div>
              )}

              {/* Nickname / Username Field with Real-Time Indicator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-feather font-black uppercase text-duoGray-pencil">
                    Přezdívka (Nickname)
                  </label>
                  {usernameStatus === 'checking' && (
                    <span className="text-[10px] font-bold text-duoGray-pencil flex items-center gap-1 animate-pulse">
                      <Loader2 size={12} className="animate-spin text-sparkBlue" />
                      <span>Ověřuji...</span>
                    </span>
                  )}
                  {usernameStatus === 'available' && (
                    <span className="text-[10px] font-feather font-black text-eagerGreen flex items-center gap-1">
                      <CheckCircle2 size={13} className="stroke-[2.5]" />
                      <span>Volná</span>
                    </span>
                  )}
                  {usernameStatus === 'taken' && (
                    <span className="text-[10px] font-feather font-black text-[#ff4b4b] flex items-center gap-1">
                      <XCircle size={13} className="stroke-[2.5]" />
                      <span>Obsazená</span>
                    </span>
                  )}
                  {usernameStatus === 'same' && (
                    <span className="text-[10px] font-bold text-duoGray-pencil">
                      Stávající
                    </span>
                  )}
                </div>

                <div className="relative flex items-center">
                  <AtSign size={16} className="absolute left-3 text-duoGray-faded" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="oliverseidl"
                    required
                    className={`w-full pl-9 pr-9 py-2.5 rounded-xl border-2 focus:outline-none text-xs font-bold text-duoGray-charcoal font-mono transition-colors ${
                      usernameStatus === 'available'
                        ? 'border-eagerGreen bg-green-50/20'
                        : usernameStatus === 'taken'
                        ? 'border-[#ff4b4b] bg-red-50/20'
                        : 'border-duoGray-border focus:border-eagerGreen'
                    }`}
                  />
                  <div className="absolute right-3 flex items-center pointer-events-none">
                    {usernameStatus === 'checking' && (
                      <Loader2 size={15} className="animate-spin text-sparkBlue" />
                    )}
                    {usernameStatus === 'available' && (
                      <CheckCircle2 size={16} className="text-eagerGreen stroke-[2.5]" />
                    )}
                    {usernameStatus === 'taken' && (
                      <XCircle size={16} className="text-[#ff4b4b] stroke-[2.5]" />
                    )}
                  </div>
                </div>

                {/* Status-specific helper text */}
                {usernameStatus === 'taken' && (
                  <span className="text-[10.5px] font-bold text-[#ff4b4b] mt-1 block">
                    Přezdívka @{username} je již obsazená. Zkus přidat číslo nebo změnit název.
                  </span>
                )}
                {usernameStatus === 'available' && (
                  <span className="text-[10.5px] font-bold text-eagerGreen-dark mt-1 block">
                    Skvělé! Přezdívka @{username} je volná.
                  </span>
                )}
                {usernameStatus === 'too_short' && (
                  <span className="text-[10.5px] font-bold text-[#ff9600] mt-1 block">
                    Přezdívka musí mít alespoň 3 znaky.
                  </span>
                )}
                {(usernameStatus === 'idle' || usernameStatus === 'same' || usernameStatus === 'checking') && (
                  <span className="text-[10px] text-duoGray-pencil mt-0.5 block font-bold">
                    Tvá unikátní přezdívka ve Flexnote (bez diakritiky).
                  </span>
                )}
              </div>

              {/* Full Name Field */}
              <div>
                <label className="block text-[11px] font-feather font-black uppercase text-duoGray-pencil mb-1">
                  Celé jméno a příjmení
                </label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-3 text-duoGray-faded" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Oliver Seidl"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-duoGray-border focus:border-eagerGreen focus:outline-none text-xs font-bold text-duoGray-charcoal"
                  />
                </div>
              </div>

              {/* School Field */}
              <div>
                <label className="block text-[11px] font-feather font-black uppercase text-duoGray-pencil mb-1">
                  Škola (ZŠ, SŠ, Gymnázium)
                </label>
                <div className="relative flex items-center">
                  <School size={16} className="absolute left-3 text-duoGray-faded" />
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="např. ZŠ Campanus, Gymnázium Jana Nerudy..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-duoGray-border focus:border-eagerGreen focus:outline-none text-xs font-bold text-duoGray-charcoal"
                  />
                </div>
              </div>

              {/* Grade Field with categorized chips for ZŠ, SŠ and Gymnázia */}
              <div>
                <label className="block text-[11px] font-feather font-black uppercase text-duoGray-pencil mb-1">
                  Třída / Ročník
                </label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="Vyber níže nebo napiš (např. 8.A, 3. ročník, Kvarta)"
                  className="w-full px-3 py-2 rounded-xl border-2 border-duoGray-border focus:border-eagerGreen focus:outline-none text-xs font-bold text-duoGray-charcoal mb-2"
                />

                {/* Categories of chips */}
                <div className="flex flex-col gap-2 bg-[#f9fafb] p-2.5 rounded-xl border border-duoGray-border">
                  {GRADE_CATEGORIES.map((cat) => (
                    <div key={cat.name}>
                      <span className="text-[9.5px] font-feather font-black uppercase text-duoGray-pencil block mb-1">
                        {cat.name}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {cat.grades.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => {
                              playPopSound();
                              setGrade(g);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-feather font-black transition cursor-pointer ${
                              grade === g
                                ? 'bg-eagerGreen text-white shadow-xs'
                                : 'bg-white text-duoGray-pencil hover:text-duoGray-charcoal border border-duoGray-border hover:bg-gray-100'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button (disabled in real time if taken, checking or too short) */}
              <button
                type="submit"
                disabled={isSaveDisabled}
                className={`w-full duo-btn py-3 px-4 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all mt-1 ${
                  isSaveDisabled
                    ? 'bg-gray-200 text-gray-400 border-b-4 border-gray-300 cursor-not-allowed'
                    : 'duo-btn-green cursor-pointer'
                }`}
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Check size={16} className="stroke-[2.5]" />
                    <span>Uložit změny</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

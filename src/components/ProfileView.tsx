import React, { useState } from 'react';
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
} from 'lucide-react';
import { UserProfile, signOutUser, updateUserProfile, checkUsernameAvailability } from '../services/supabase';
import { playPopSound, playSuccessChime } from '../utils/audio';

interface ProfileViewProps {
  user: { id: string; email?: string };
  profile: UserProfile | null;
  totalNotes: number;
  onSignOut: () => void;
  onUpdateProfile?: (updated: UserProfile) => void;
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

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  profile,
  totalNotes,
  onSignOut,
  onUpdateProfile,
}) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [school, setSchool] = useState(profile?.school || '');
  const [grade, setGrade] = useState(profile?.grade || '');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    setSaving(true);

    try {
      // If username changed, check availability
      if (cleanUsername !== profile?.username) {
        const isAvailable = await checkUsernameAvailability(cleanUsername, user.id);
        if (!isAvailable) {
          setErrorMessage(`Přezdívka @${cleanUsername} je již obsazená. Zvol prosím jinou.`);
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
    profile?.school || profile?.grade
      ? `${profile.school || 'Škola'}${profile.grade ? ` • ${profile.grade}` : ''}`
      : 'Škola a ročník nezadány';

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
            <div className="flex items-center gap-1.5 text-xs font-bold text-duoGray-pencil truncate mt-0.5">
              <School size={13} className="text-eagerGreen shrink-0" />
              <span className="truncate">{schoolGradeText}</span>
            </div>

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

      {/* Cloud Sync Status Card */}
      <div className="duo-card p-3.5 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-eagerGreen animate-pulse"></span>
          <span className="font-feather font-black text-xs text-duoGray-charcoal">
            Cloudová synchronizace
          </span>
        </div>
        <span className="text-[11px] font-feather font-black text-eagerGreen bg-storybookGreen px-2 py-0.5 rounded-full border border-eagerGreen/30">
          Online
        </span>
      </div>

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

              {/* Nickname / Username Field */}
              <div>
                <label className="block text-[11px] font-feather font-black uppercase text-duoGray-pencil mb-1">
                  Přezdívka (Nickname)
                </label>
                <div className="relative flex items-center">
                  <AtSign size={16} className="absolute left-3 text-duoGray-faded" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="oliverseidl"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-duoGray-border focus:border-eagerGreen focus:outline-none text-xs font-bold text-duoGray-charcoal font-mono"
                  />
                </div>
                <span className="text-[10px] text-duoGray-pencil mt-0.5 block font-bold">
                  Tvá unikátní přezdívka ve Flexnote (bez diakritiky).
                </span>
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full duo-btn duo-btn-green py-3 px-4 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer mt-1"
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

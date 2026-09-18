import React, { useState, useEffect, useRef } from 'react';
import { School, Search, X, MapPin, Plus, Check } from 'lucide-react';
import { SchoolItem, searchSchools, loadSchools, submitCustomSchool } from '../services/schoolsService';
import { playPopSound } from '../utils/audio';

interface SchoolAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  userId?: string;
  onShowToast?: (title: string, message: string) => void;
}

export const SchoolAutocomplete: React.FC<SchoolAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Vyhledej svou školu (např. Nerudy, Panská, Campanus)...',
  userId,
  onShowToast,
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<SchoolItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Pre-load database in background when component mounts
  useEffect(() => {
    loadSchools().catch(() => {});
  }, []);

  // Search when query changes
  useEffect(() => {
    let isCancelled = false;

    if (!isOpen) return;

    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchSchools(query, undefined, 8)
      .then((res) => {
        if (!isCancelled) {
          setSuggestions(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setSuggestions([]);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [query, isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectSchool = (school: SchoolItem) => {
    playPopSound();
    // Save purely the school name (without city in parentheses as requested by user)
    onChange(school.name);
    setQuery(school.name);
    setCustomMessage(null);
    setIsOpen(false);
  };

  const handleCustomSchool = () => {
    playPopSound();
    const clean = query.trim();
    if (clean) {
      onChange(clean);
      setQuery(clean);
      setIsOpen(false);

      // Submit to moderation queue
      submitCustomSchool(clean, undefined, undefined, userId).then((res) => {
        if (res.isNew) {
          setCustomMessage('Škola uložena. Nový název byl odeslán ke schválení do rejstříku.');
          setTimeout(() => setCustomMessage(null), 5000);
          onShowToast?.('Škola uložena', 'Nový název byl odeslán ke schválení administrátorem.');
        }
      });
    }
  };

  const handleClear = () => {
    playPopSound();
    setQuery('');
    onChange('');
    setCustomMessage(null);
    setIsOpen(true);
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Gymnázium':
        return 'bg-blue-50 text-sparkBlue border-blue-200';
      case 'Základní škola':
        return 'bg-emerald-50 text-eagerGreen-dark border-emerald-200';
      case 'Střední škola':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'VOŠ':
      case 'Konzervatoř':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-duoGray-pencil border-gray-200';
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <School size={16} className="absolute left-3 text-duoGray-pencil pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2.5 rounded-2xl border-2 border-duoGray-border focus:border-eagerGreen focus:outline-none text-xs font-bold text-duoGray-charcoal bg-white transition placeholder:text-duoGray-pencil/70"
        />

        {query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 text-duoGray-pencil flex items-center justify-center transition cursor-pointer"
            title="Vymazat"
          >
            <X size={12} />
          </button>
        ) : (
          <Search size={14} className="absolute right-3 text-duoGray-pencil/50 pointer-events-none" />
        )}
      </div>

      {customMessage && (
        <div className="mt-1.5 px-2.5 py-1 rounded-xl bg-sparkBlue-tint text-sparkBlue text-[10.5px] font-bold flex items-center gap-1.5 animate-in fade-in">
          <Check size={13} className="shrink-0" />
          <span>{customMessage}</span>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border-2 border-duoGray-border border-b-[5px] shadow-xl z-50 overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {query.trim().length < 2 ? (
            <div className="p-3 text-center text-xs font-bold text-duoGray-pencil">
              Začni psát název školy, město nebo čtvrť...
            </div>
          ) : loading ? (
            <div className="p-3 text-center text-xs font-bold text-duoGray-pencil animate-pulse">
              Hledám v databázi MŠMT...
            </div>
          ) : suggestions.length > 0 ? (
            <>
              {suggestions.map((item) => {
                const isSelected = value === item.name;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSchool(item)}
                    className={`w-full p-2.5 px-3 text-left flex items-start justify-between gap-2 transition cursor-pointer hover:bg-storybookGreen/30 ${
                      isSelected ? 'bg-storybookGreen/40' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-feather font-black text-xs text-duoGray-charcoal truncate flex items-center gap-1.5">
                        <span className="truncate">{item.name}</span>
                        {isSelected && (
                          <Check size={13} className="text-eagerGreen-dark shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-duoGray-pencil mt-0.5 truncate">
                        <MapPin size={11} className="shrink-0 text-duoGray-faded" />
                        <span>
                          {item.city}
                          {item.district && item.district !== item.city ? ` • ${item.district}` : ''}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[9.5px] font-feather font-black px-1.5 py-0.5 rounded-md border shrink-0 uppercase tracking-wider ${getCategoryBadgeClass(
                        item.category
                      )}`}
                    >
                      {item.category === 'Základní škola' ? 'ZŠ' : item.category}
                    </span>
                  </button>
                );
              })}

              {/* Option to use custom typed name */}
              {query.trim() && !suggestions.some((s) => s.name.toLowerCase() === query.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={handleCustomSchool}
                  className="w-full p-2.5 px-3 text-left text-xs font-feather font-black text-sparkBlue hover:bg-sparkBlue-tint/40 flex items-center gap-2 border-t border-gray-100 transition cursor-pointer"
                >
                  <Plus size={14} className="shrink-0" />
                  <span className="truncate">Použít vlastní název: &bdquo;{query.trim()}&ldquo;</span>
                </button>
              )}
            </>
          ) : (
            <div className="p-3">
              <div className="text-center text-xs font-bold text-duoGray-pencil mb-2">
                Žádná škola v rejstříku neodpovídá zadání.
              </div>
              <button
                type="button"
                onClick={handleCustomSchool}
                className="w-full py-2 px-3 rounded-xl bg-sparkBlue-tint text-sparkBlue text-xs font-feather font-black flex items-center justify-center gap-1.5 hover:bg-sparkBlue-tint/70 transition cursor-pointer"
              >
                <Plus size={14} />
                <span className="truncate">Uložit jako vlastní školu: &bdquo;{query.trim()}&ldquo;</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

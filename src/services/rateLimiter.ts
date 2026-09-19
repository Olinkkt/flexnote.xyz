/**
 * Client-side rate limiting, cooldown protection, and spending guardrails.
 * Prevents rapid-fire API calls, spam clicks, and runaway AI usage quotas.
 */

export type RateLimitAction =
  | 'ocr_scan'
  | 'generate_quiz'
  | 'generate_flashcards'
  | 'export_email';

interface ActionConfig {
  cooldownMs: number; // Minimum wait between calls (debounce/spam protection)
  maxDaily: number;   // Daily usage cap
  maxHourly?: number; // Hourly usage cap (for sensitive actions like sending email)
  label: string;
}

const ACTION_CONFIGS: Record<RateLimitAction, ActionConfig> = {
  ocr_scan: {
    cooldownMs: 5000,
    maxDaily: 35,
    label: 'Digitalizace zápisku (OCR)',
  },
  generate_quiz: {
    cooldownMs: 4000,
    maxDaily: 30,
    label: 'Generování cvičného testu (AI)',
  },
  generate_flashcards: {
    cooldownMs: 4000,
    maxDaily: 40,
    label: 'Generování kartiček (AI)',
  },
  export_email: {
    cooldownMs: 15000,
    maxDaily: 15,
    maxHourly: 5,
    label: 'Odeslání zápisků na e-mail',
  },
};

interface UsageRecord {
  lastUsedTimestamp: number;
  timestamps: number[];
  dateString: string; // YYYY-MM-DD
}

const STORAGE_KEY_PREFIX = 'flexnote_ratelimit_';

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getRecord(action: RateLimitAction): UsageRecord {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${action}`);
    if (raw) {
      const parsed: UsageRecord = JSON.parse(raw);
      const today = getTodayString();
      if (parsed.dateString === today) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  return {
    lastUsedTimestamp: 0,
    timestamps: [],
    dateString: getTodayString(),
  };
}

function saveRecord(action: RateLimitAction, record: UsageRecord): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${action}`, JSON.stringify(record));
  } catch {
    // ignore local storage errors
  }
}

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
  remainingDaily?: number;
}

/**
 * Checks if an action is permitted by cooldown and daily caps.
 */
export function checkRateLimit(action: RateLimitAction): RateLimitCheckResult {
  const config = ACTION_CONFIGS[action];
  const record = getRecord(action);
  const now = Date.now();

  // 1. Cooldown check (anti-spam / rapid double-click)
  const elapsedSinceLast = now - record.lastUsedTimestamp;
  if (elapsedSinceLast < config.cooldownMs) {
    const waitSec = Math.ceil((config.cooldownMs - elapsedSinceLast) / 1000);
    return {
      allowed: false,
      reason: `Chvilku počkej (${waitSec} s), než akci zopakuješ.`,
      retryAfterSeconds: waitSec,
    };
  }

  // Filter timestamps to last 24h / today
  const oneHourAgo = now - 60 * 60 * 1000;
  const hourlyCount = record.timestamps.filter((t) => t > oneHourAgo).length;

  if (config.maxHourly && hourlyCount >= config.maxHourly) {
    return {
      allowed: false,
      reason: `Dosáhl jsi limitu pro tuto hodinu (max ${config.maxHourly}× za hodinu). Zkus to prosím později.`,
      retryAfterSeconds: 60,
    };
  }

  const dailyCount = record.timestamps.length;
  if (dailyCount >= config.maxDaily) {
    return {
      allowed: false,
      reason: `Dnes jsi vyčerpal denní limit pro ${config.label.toLowerCase()} (max ${config.maxDaily}× za den). Šetříme kapacitu pro všechny studenty. Limit se obnoví zítra.`,
      remainingDaily: 0,
    };
  }

  return {
    allowed: true,
    remainingDaily: config.maxDaily - dailyCount,
  };
}

/**
 * Records execution of an action into localStorage
 */
export function recordRateLimitUsage(action: RateLimitAction): void {
  const record = getRecord(action);
  const now = Date.now();

  record.lastUsedTimestamp = now;
  record.timestamps.push(now);

  saveRecord(action, record);
}

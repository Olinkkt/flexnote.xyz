import { useState, useEffect, useCallback } from 'react';
import { NoteItem } from '../types/notes';
import {
  saveNoteToCloud,
  updateNoteInCloud,
  deleteNoteFromCloud,
} from './supabase';

const QUEUE_STORAGE_KEY = 'flexnote_offline_sync_queue_v25';

export type OfflineAction =
  | {
      id: string;
      type: 'CREATE_NOTE';
      note: NoteItem;
      userId?: string;
      timestamp: number;
    }
  | {
      id: string;
      type: 'UPDATE_NOTE';
      noteId: string;
      updates: Partial<NoteItem>;
      timestamp: number;
    }
  | {
      id: string;
      type: 'DELETE_NOTE';
      noteId: string;
      timestamp: number;
    };

// Listeners for queue updates
type QueueChangeListener = (count: number) => void;
const queueListeners: Set<QueueChangeListener> = new Set();

function notifyQueueChange() {
  const count = getOfflineQueue().length;
  queueListeners.forEach((listener) => {
    try {
      listener(count);
    } catch (e) {
      console.warn('[OfflineSync] listener error:', e);
    }
  });
}

/**
 * Check if the browser currently reports being online
 */
export function isDeviceOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Retrieve pending actions from localStorage
 */
export function getOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[OfflineSync] Failed to read queue:', err);
    return [];
  }
}

/**
 * Save pending actions to localStorage
 */
function saveOfflineQueue(queue: OfflineAction[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    notifyQueueChange();
  } catch (err) {
    console.warn('[OfflineSync] Failed to save queue:', err);
  }
}

/**
 * Add an action to the offline sync queue
 */
export function enqueueOfflineAction(
  action:
    | { type: 'CREATE_NOTE'; note: NoteItem; userId?: string }
    | { type: 'UPDATE_NOTE'; noteId: string; updates: Partial<NoteItem> }
    | { type: 'DELETE_NOTE'; noteId: string }
): void {
  const queue = getOfflineQueue();
  const newAction: OfflineAction = {
    ...action,
    id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: Date.now(),
  };

  // Optimize queue: If deleting a note that was only created offline, just drop the create action
  if (newAction.type === 'DELETE_NOTE') {
    const createIndex = queue.findIndex(
      (a) => a.type === 'CREATE_NOTE' && a.note.id === newAction.noteId
    );
    if (createIndex !== -1) {
      queue.splice(createIndex, 1);
      saveOfflineQueue(queue);
      return;
    }
  }

  // Optimize queue: If updating a note already in queue for creation, merge updates
  if (newAction.type === 'UPDATE_NOTE') {
    const createItem = queue.find(
      (a) => a.type === 'CREATE_NOTE' && a.note.id === newAction.noteId
    ) as ({ type: 'CREATE_NOTE'; note: NoteItem } | undefined);

    if (createItem) {
      createItem.note = { ...createItem.note, ...newAction.updates };
      saveOfflineQueue(queue);
      return;
    }
  }

  queue.push(newAction);
  saveOfflineQueue(queue);
}

/**
 * Clear the queue entirely
 */
export function clearOfflineQueue(): void {
  localStorage.removeItem(QUEUE_STORAGE_KEY);
  notifyQueueChange();
}

/**
 * Flush and synchronize pending actions to Supabase
 */
export async function flushOfflineQueue(
  currentUserId?: string
): Promise<{ syncedCount: number; errors: number }> {
  if (!isDeviceOnline()) {
    return { syncedCount: 0, errors: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, errors: 0 };
  }

  let syncedCount = 0;
  let errors = 0;
  const remaining: OfflineAction[] = [];

  for (const action of queue) {
    try {
      if (action.type === 'CREATE_NOTE') {
        const userId = action.userId || currentUserId;
        await saveNoteToCloud(action.note, userId);
        syncedCount++;
      } else if (action.type === 'UPDATE_NOTE') {
        await updateNoteInCloud(action.noteId, action.updates);
        syncedCount++;
      } else if (action.type === 'DELETE_NOTE') {
        await deleteNoteFromCloud(action.noteId);
        syncedCount++;
      }
    } catch (err) {
      console.warn(`[OfflineSync] Failed to sync action ${action.id}:`, err);
      // Keep action in queue if it's a network error
      remaining.push(action);
      errors++;
    }
  }

  saveOfflineQueue(remaining);
  return { syncedCount, errors };
}

/**
 * React hook to observe online/offline status and manage background synchronization
 */
export function useOfflineSync(
  currentUserId?: string,
  onSyncComplete?: (syncedCount: number) => void
) {
  const [isOnline, setIsOnline] = useState<boolean>(isDeviceOnline());
  const [pendingCount, setPendingCount] = useState<number>(() => getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [justCameOnline, setJustCameOnline] = useState<boolean>(false);

  // Subscribe to queue changes
  useEffect(() => {
    const handleQueueChange = (count: number) => {
      setPendingCount(count);
    };
    queueListeners.add(handleQueueChange);
    return () => {
      queueListeners.delete(handleQueueChange);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    if (!isDeviceOnline() || isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await flushOfflineQueue(currentUserId);
      if (result.syncedCount > 0 && onSyncComplete) {
        onSyncComplete(result.syncedCount);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [currentUserId, isSyncing, onSyncComplete]);

  // Online / Offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustCameOnline(true);
      setTimeout(() => setJustCameOnline(false), 3500);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustCameOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // If online on initial mount and has pending items, attempt flush
    if (navigator.onLine && getOfflineQueue().length > 0) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync]);

  return {
    isOnline,
    justCameOnline,
    pendingCount,
    isSyncing,
    triggerSync,
  };
}

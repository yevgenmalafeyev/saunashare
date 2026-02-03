'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type UserRole = 'admin' | 'user' | 'none';
export type ActiveMode = 'admin' | 'user';

// Maps sessionId -> check-in info (participantId and sessionParticipantId)
export interface CheckInRecord {
  participantId: number;
  sessionParticipantId: number;
}
export type CheckedInSessions = Record<number, CheckInRecord>;

// Maps participantId -> number of times this device has selected that participant
export type ParticipantSelectionHistory = Record<number, number>;

interface AuthContextType {
  role: UserRole;
  activeMode: ActiveMode;
  currentUserId: number | null; // session_participant_id when checked in (most recent)
  checkedInSessions: CheckedInSessions; // all sessions user has checked into
  participantSelectionHistory: ParticipantSelectionHistory; // how many times each participant was selected
  setActiveMode: (mode: ActiveMode) => void;
  setCurrentUserId: (id: number | null) => void;
  addCheckedInSession: (sessionId: number, participantId: number, sessionParticipantId: number) => void;
  getCheckedInSession: (sessionId: number) => CheckInRecord | undefined;
  getParticipantSelectionCount: (participantId: number) => number;
  incrementParticipantSelection: (participantId: number) => void;
  isAdmin: boolean;
  isUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_MODE_KEY = 'banha-active-mode';
const CURRENT_USER_KEY = 'banha-current-user-id';
const CHECKED_IN_SESSIONS_KEY = 'banha-checked-in-sessions';
const PARTICIPANT_SELECTION_HISTORY_KEY = 'banha-participant-selection-history';

interface AuthProviderProps {
  children: ReactNode;
  initialRole: UserRole;
}

// LocalStorage helpers
class LocalStorageHelper {
  static isAvailable(): boolean {
    return typeof window !== 'undefined';
  }

  static getString(key: string): string | null {
    if (!this.isAvailable()) return null;
    return localStorage.getItem(key);
  }

  static getJson<T>(key: string, defaultValue: T): T {
    if (!this.isAvailable()) return defaultValue;
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    try {
      return JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  }

  static setString(key: string, value: string): void {
    if (this.isAvailable()) {
      localStorage.setItem(key, value);
    }
  }

  static setJson<T>(key: string, value: T): void {
    if (this.isAvailable()) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  static remove(key: string): void {
    if (this.isAvailable()) {
      localStorage.removeItem(key);
    }
  }
}

// Compute initial values from localStorage (runs once on hydration)
function getInitialActiveMode(initialRole: UserRole): ActiveMode {
  const storedMode = LocalStorageHelper.getString(ACTIVE_MODE_KEY);
  // Admin users start in admin mode, unless they previously switched to user mode
  if (initialRole === 'admin') {
    return storedMode === 'user' ? 'user' : 'admin';
  }
  return 'user';
}

function getInitialUserId(): number | null {
  const storedUserId = LocalStorageHelper.getString(CURRENT_USER_KEY);
  return storedUserId ? parseInt(storedUserId, 10) : null;
}

function getInitialCheckedInSessions(): CheckedInSessions {
  return LocalStorageHelper.getJson(CHECKED_IN_SESSIONS_KEY, {});
}

function getInitialParticipantSelectionHistory(): ParticipantSelectionHistory {
  return LocalStorageHelper.getJson(PARTICIPANT_SELECTION_HISTORY_KEY, {});
}

export function AuthProvider({ children, initialRole }: AuthProviderProps) {
  const [role] = useState<UserRole>(initialRole);
  const [activeMode, setActiveModeState] = useState<ActiveMode>(() => getInitialActiveMode(initialRole));
  const [currentUserId, setCurrentUserIdState] = useState<number | null>(getInitialUserId);
  const [checkedInSessions, setCheckedInSessionsState] = useState<CheckedInSessions>(getInitialCheckedInSessions);
  const [participantSelectionHistory, setParticipantSelectionHistoryState] = useState<ParticipantSelectionHistory>(getInitialParticipantSelectionHistory);

  const setActiveMode = (mode: ActiveMode) => {
    setActiveModeState(mode);
    LocalStorageHelper.setString(ACTIVE_MODE_KEY, mode);
  };

  const setCurrentUserId = (id: number | null) => {
    setCurrentUserIdState(id);
    if (id !== null) {
      LocalStorageHelper.setString(CURRENT_USER_KEY, id.toString());
    } else {
      LocalStorageHelper.remove(CURRENT_USER_KEY);
    }
  };

  const addCheckedInSession = (sessionId: number, participantId: number, sessionParticipantId: number) => {
    setCheckedInSessionsState((prev) => {
      const updated = { ...prev, [sessionId]: { participantId, sessionParticipantId } };
      LocalStorageHelper.setJson(CHECKED_IN_SESSIONS_KEY, updated);
      return updated;
    });
  };

  const getCheckedInSession = (sessionId: number): CheckInRecord | undefined => {
    return checkedInSessions[sessionId];
  };

  const getParticipantSelectionCount = (participantId: number): number => {
    return participantSelectionHistory[participantId] || 0;
  };

  const incrementParticipantSelection = (participantId: number) => {
    setParticipantSelectionHistoryState((prev) => {
      const updated = { ...prev, [participantId]: (prev[participantId] || 0) + 1 };
      LocalStorageHelper.setJson(PARTICIPANT_SELECTION_HISTORY_KEY, updated);
      return updated;
    });
  };

  const value: AuthContextType = {
    role,
    activeMode,
    currentUserId,
    checkedInSessions,
    participantSelectionHistory,
    setActiveMode,
    setCurrentUserId,
    addCheckedInSession,
    getCheckedInSession,
    getParticipantSelectionCount,
    incrementParticipantSelection,
    isAdmin: role === 'admin',
    isUser: role === 'user' || role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

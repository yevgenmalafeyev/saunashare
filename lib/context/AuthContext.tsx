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

interface AuthContextType {
  role: UserRole;
  activeMode: ActiveMode;
  currentUserId: number | null; // session_participant_id when checked in (most recent)
  checkedInSessions: CheckedInSessions; // all sessions user has checked into
  setActiveMode: (mode: ActiveMode) => void;
  setCurrentUserId: (id: number | null) => void;
  addCheckedInSession: (sessionId: number, participantId: number, sessionParticipantId: number) => void;
  getCheckedInSession: (sessionId: number) => CheckInRecord | undefined;
  isAdmin: boolean;
  isUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_MODE_KEY = 'banha-active-mode';
const CURRENT_USER_KEY = 'banha-current-user-id';
const CHECKED_IN_SESSIONS_KEY = 'banha-checked-in-sessions';

interface AuthProviderProps {
  children: ReactNode;
  initialRole: UserRole;
}

// Compute initial values from localStorage (runs once on hydration)
function getInitialActiveMode(initialRole: UserRole): ActiveMode {
  if (typeof window === 'undefined') return 'user';
  const storedMode = localStorage.getItem(ACTIVE_MODE_KEY);
  if (storedMode === 'admin' && initialRole === 'admin') return 'admin';
  if (initialRole === 'admin') return 'admin';
  return 'user';
}

function getInitialUserId(): number | null {
  if (typeof window === 'undefined') return null;
  const storedUserId = localStorage.getItem(CURRENT_USER_KEY);
  return storedUserId ? parseInt(storedUserId, 10) : null;
}

function getInitialCheckedInSessions(): CheckedInSessions {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(CHECKED_IN_SESSIONS_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

export function AuthProvider({ children, initialRole }: AuthProviderProps) {
  const [role] = useState<UserRole>(initialRole);
  const [activeMode, setActiveModeState] = useState<ActiveMode>(() => getInitialActiveMode(initialRole));
  const [currentUserId, setCurrentUserIdState] = useState<number | null>(getInitialUserId);
  const [checkedInSessions, setCheckedInSessionsState] = useState<CheckedInSessions>(getInitialCheckedInSessions);

  const setActiveMode = (mode: ActiveMode) => {
    setActiveModeState(mode);
    localStorage.setItem(ACTIVE_MODE_KEY, mode);
  };

  const setCurrentUserId = (id: number | null) => {
    setCurrentUserIdState(id);
    if (id !== null) {
      localStorage.setItem(CURRENT_USER_KEY, id.toString());
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  };

  const addCheckedInSession = (sessionId: number, participantId: number, sessionParticipantId: number) => {
    setCheckedInSessionsState((prev) => {
      const updated = { ...prev, [sessionId]: { participantId, sessionParticipantId } };
      localStorage.setItem(CHECKED_IN_SESSIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const getCheckedInSession = (sessionId: number): CheckInRecord | undefined => {
    return checkedInSessions[sessionId];
  };

  const value: AuthContextType = {
    role,
    activeMode,
    currentUserId,
    checkedInSessions,
    setActiveMode,
    setCurrentUserId,
    addCheckedInSession,
    getCheckedInSession,
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

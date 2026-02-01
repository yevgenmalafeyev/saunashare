'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type UserRole = 'admin' | 'user' | 'none';
export type ActiveMode = 'admin' | 'user';

interface AuthContextType {
  role: UserRole;
  activeMode: ActiveMode;
  currentUserId: number | null; // session_participant_id when checked in
  setActiveMode: (mode: ActiveMode) => void;
  setCurrentUserId: (id: number | null) => void;
  isAdmin: boolean;
  isUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_MODE_KEY = 'banha-active-mode';
const CURRENT_USER_KEY = 'banha-current-user-id';

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

export function AuthProvider({ children, initialRole }: AuthProviderProps) {
  const [role] = useState<UserRole>(initialRole);
  const [activeMode, setActiveModeState] = useState<ActiveMode>(() => getInitialActiveMode(initialRole));
  const [currentUserId, setCurrentUserIdState] = useState<number | null>(getInitialUserId);

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

  const value: AuthContextType = {
    role,
    activeMode,
    currentUserId,
    setActiveMode,
    setCurrentUserId,
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

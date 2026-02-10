'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { TelegramContext } from './types';
import './types'; // Import to ensure global Window type is extended

interface TelegramContextType extends TelegramContext {
  submitManualToken: (token: string) => Promise<boolean>;
}

const TelegramCtx = createContext<TelegramContextType | undefined>(undefined);

const TELEGRAM_STATE_KEY = 'banha-telegram-state';

interface TelegramProviderProps {
  children: ReactNode;
  onAuthComplete: (role: 'admin' | 'user') => void;
  onAccessDenied: (telegramUserId: string, username?: string, firstName?: string) => void;
}

/**
 * Detect if we're running inside Telegram Mini App
 */
export function isTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return false;
  // When inside Telegram, initData contains the signed user data
  // When outside Telegram (script loaded but not in TG), initData is empty string
  return typeof webApp.initData === 'string' && webApp.initData.length > 0;
}

/**
 * Get initial state from localStorage
 */
function getStoredState(): Partial<TelegramContext> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(TELEGRAM_STATE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function TelegramProvider({ children, onAuthComplete, onAccessDenied }: TelegramProviderProps) {
  // Don't use stored state for initial auth - always re-authenticate with server
  // Only use stored state for linkedParticipantIds
  const storedState = getStoredState();
  const [state, setState] = useState<TelegramContext>(() => ({
    isInTelegram: false,
    isAuthenticated: false,
    linkedParticipantIds: storedState.linkedParticipantIds ?? [],
  }));
  const [hasTriedAuth, setHasTriedAuth] = useState(false);

  const authenticate = useCallback(async (manualToken?: string) => {
    if (!isTelegramMiniApp()) return false;

    const webApp = window.Telegram!.WebApp;

    try {
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: webApp.initData,
          manualToken,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.accessDenied) {
          // Access denied - user not whitelisted
          onAccessDenied(data.telegramUserId, data.username, data.firstName);
          setState((prev) => ({
            ...prev,
            isInTelegram: true,
            telegramUserId: data.telegramUserId,
            username: data.username,
            firstName: data.firstName,
          }));
          return false;
        }

        // Access granted
        const newState: TelegramContext = {
          isInTelegram: true,
          isAuthenticated: true,
          telegramUserId: data.telegramUserId,
          username: data.username,
          firstName: data.firstName,
          linkedParticipantIds: data.linkedParticipantIds ?? [],
        };
        setState(newState);
        localStorage.setItem(TELEGRAM_STATE_KEY, JSON.stringify(newState));
        onAuthComplete(data.role);
        return true;
      } else {
        const errorData = await response.json();
        console.error('Telegram auth failed:', errorData);
        if (manualToken) {
          // Invalid manual token
          return false;
        }
      }
    } catch (error) {
      console.error('Telegram auth error:', error);
    } finally {
      setHasTriedAuth(true);
    }
    return false;
  }, [onAuthComplete, onAccessDenied]);

  useEffect(() => {
    // Only run in Telegram Mini App
    if (!isTelegramMiniApp() || hasTriedAuth) {
      return;
    }

    const webApp = window.Telegram!.WebApp;

    // Mark that we're in Telegram
    setState((prev) => ({ ...prev, isInTelegram: true }));

    // Tell Telegram we're ready
    webApp.ready();

    // Expand to full height
    webApp.expand();

    // Authenticate with our backend
    authenticate();
  }, [authenticate, hasTriedAuth]);

  const submitManualToken = async (token: string): Promise<boolean> => {
    return authenticate(token);
  };

  return (
    <TelegramCtx.Provider value={{ ...state, submitManualToken }}>
      {children}
    </TelegramCtx.Provider>
  );
}

export function useTelegram(): TelegramContextType {
  const context = useContext(TelegramCtx);
  if (context === undefined) {
    // Return a default context for non-Telegram environments
    return {
      isInTelegram: false,
      isAuthenticated: false,
      linkedParticipantIds: [],
      submitManualToken: async () => false,
    };
  }
  return context;
}

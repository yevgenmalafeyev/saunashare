'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { TelegramContext } from './types';
import './types'; // Import to ensure global Window type is extended

interface TelegramContextType extends TelegramContext {
  linkParticipant: (participantId: number) => Promise<void>;
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
  // Only use stored state for linkedParticipantId
  const storedState = getStoredState();
  const [state, setState] = useState<TelegramContext>(() => ({
    isInTelegram: false,
    isAuthenticated: false,
    linkedParticipantId: storedState.linkedParticipantId,
  }));
  const [, setIsAuthenticating] = useState(false);
  const [hasTriedAuth, setHasTriedAuth] = useState(false);

  const authenticate = useCallback(async (manualToken?: string) => {
    if (!isTelegramMiniApp()) return false;

    const webApp = window.Telegram!.WebApp;
    setIsAuthenticating(true);

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
          linkedParticipantId: data.linkedParticipantId,
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
      setIsAuthenticating(false);
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

  const linkParticipant = async (participantId: number) => {
    if (!state.telegramUserId) return;

    try {
      const response = await fetch('/api/auth/telegram', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramUserId: state.telegramUserId,
          participantId,
        }),
      });

      if (response.ok) {
        const newState = { ...state, linkedParticipantId: participantId };
        setState(newState);
        localStorage.setItem(TELEGRAM_STATE_KEY, JSON.stringify(newState));
      }
    } catch (error) {
      console.error('Failed to link participant:', error);
    }
  };

  const submitManualToken = async (token: string): Promise<boolean> => {
    return authenticate(token);
  };

  return (
    <TelegramCtx.Provider value={{ ...state, linkParticipant, submitManualToken }}>
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
      linkParticipant: async () => {},
      submitManualToken: async () => false,
    };
  }
  return context;
}

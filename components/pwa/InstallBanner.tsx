'use client';

import { useState, useEffect } from 'react';
import { useDeviceDetection } from '@/lib/hooks';
import { useI18n } from '@/lib/context/I18nContext';
import { useAuth } from '@/lib/context/AuthContext';
import { getPwaInstructions } from '@/lib/i18n/pwa-instructions';
import { Button } from '@/components/ui';
import { isTelegramMiniApp } from '@/lib/telegram/context';

const INSTALL_BANNER_DISMISSED_KEY = 'banha-install-banner-dismissed';

export function InstallBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const { deviceType, isStandalone, isMobile } = useDeviceDetection();
  const { locale } = useI18n();
  const { role } = useAuth();

  useEffect(() => {
    // Never show in Telegram Mini App
    if (isTelegramMiniApp()) {
      return;
    }

    // Only show for authenticated users on mobile devices not in standalone mode
    if (!isMobile || isStandalone || role === 'none') {
      return;
    }

    // Check if user has dismissed the banner
    const dismissed = localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY);
    if (dismissed === 'true') {
      return;
    }

    // Small delay to prevent flash
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [isMobile, isStandalone, role]);

  const handleDismiss = (permanent: boolean) => {
    setIsVisible(false);
    if (permanent) {
      localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, 'true');
    }
  };

  if (!isVisible) {
    return null;
  }

  const instructions = getPwaInstructions(locale, deviceType);

  return (
    <div className="fixed inset-0 z-50 bg-stone-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 text-center border-b border-stone-200">
        <div className="text-5xl mb-4">🧖</div>
        <h1 className="text-2xl font-bold text-stone-800">{instructions.title}</h1>
        <p className="text-stone-500 mt-1">{instructions.subtitle}</p>
      </div>

      {/* Instructions */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {instructions.steps.map((step, index) => (
            <div
              key={index}
              className="flex items-start gap-4 bg-white border border-stone-200 rounded-xl p-4"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center font-bold">
                {index + 1}
              </div>
              <p className="text-stone-700 pt-1">{step}</p>
            </div>
          ))}
        </div>

        {/* Device-specific icon hint */}
        <div className="mt-6 text-center text-stone-400 text-sm">
          {deviceType === 'ios' && (
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              <span>Look for the share icon</span>
            </div>
          )}
          {deviceType === 'android' && (
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
              <span>Look for the menu icon</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 p-6 space-y-3 border-t border-stone-200">
        <Button
          className="w-full"
          size="lg"
          onClick={() => handleDismiss(false)}
        >
          {instructions.continueButton}
        </Button>
        <button
          className="w-full text-stone-400 text-sm py-2"
          onClick={() => handleDismiss(true)}
        >
          {instructions.dontShowAgain}
        </button>
      </div>
    </div>
  );
}

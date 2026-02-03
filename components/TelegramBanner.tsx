'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/context/I18nContext';
import { isTelegramBrowser, isIOS, getSystemBrowserUrl } from '@/lib/utils/browserDetection';

export function TelegramBanner() {
  const { t } = useTranslation();
  // Use lazy initialization to detect browser only once on mount
  const [isVisible, setIsVisible] = useState(() => isTelegramBrowser());
  const [copied, setCopied] = useState(false);

  if (!isVisible) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const ios = isIOS();

  const handleOpenBrowser = () => {
    // On Android, try intent:// URL
    const browserUrl = getSystemBrowserUrl(currentUrl);
    if (browserUrl !== currentUrl) {
      window.location.href = browserUrl;
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🌐</div>
          <h2 className="text-xl font-bold text-stone-800 mb-2">
            {t('telegram.title')}
          </h2>
          <p className="text-stone-600 text-sm">
            {t('telegram.description')}
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-sm text-amber-800">
            {ios ? t('telegram.iosInstructions') : t('telegram.androidInstructions')}
          </p>
        </div>

        <div className="space-y-2">
          {!ios && (
            <button
              onClick={handleOpenBrowser}
              className="w-full py-3 px-4 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors"
            >
              {t('telegram.openBrowser')}
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="w-full py-3 px-4 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 transition-colors"
          >
            {copied ? t('telegram.copied') : t('telegram.copyLink')}
          </button>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="w-full text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          {t('pwa.continueToApp')}
        </button>
      </div>
    </div>
  );
}

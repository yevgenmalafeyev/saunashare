'use client';

import { useSyncExternalStore } from 'react';
import type { DeviceType } from '@/lib/i18n/pwa-instructions';

interface DeviceInfo {
  deviceType: DeviceType;
  isStandalone: boolean;
  isMobile: boolean;
}

const defaultDeviceInfo: DeviceInfo = {
  deviceType: 'desktop',
  isStandalone: false,
  isMobile: false,
};

// Cache the computed device info to ensure referential stability
let cachedDeviceInfo: DeviceInfo | null = null;

function getSnapshot(): DeviceInfo {
  if (typeof window === 'undefined') return defaultDeviceInfo;

  // Return cached value if already computed
  if (cachedDeviceInfo !== null) return cachedDeviceInfo;

  const userAgent = navigator.userAgent.toLowerCase();

  // Detect device type
  let deviceType: DeviceType = 'desktop';
  const isMobile = /iphone|ipad|ipod|android|mobile/i.test(userAgent);

  if (/iphone|ipad|ipod/i.test(userAgent)) {
    deviceType = 'ios';
  } else if (/android/i.test(userAgent)) {
    deviceType = 'android';
  }

  // Check if running as standalone PWA
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari specific check
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);

  cachedDeviceInfo = { deviceType, isStandalone, isMobile };
  return cachedDeviceInfo;
}

function getServerSnapshot(): DeviceInfo {
  return defaultDeviceInfo;
}

// Subscribe to display-mode changes (for PWA install)
function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  const handler = () => {
    cachedDeviceInfo = null; // Invalidate cache
    callback();
  };
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}

/**
 * Detect device type and standalone mode
 */
export function useDeviceDetection(): DeviceInfo {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

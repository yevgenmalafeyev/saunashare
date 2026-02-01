'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AuthProvider, type UserRole } from '@/lib/context/AuthContext';
import { I18nProvider } from '@/lib/context/I18nContext';
import { InstallBanner } from '@/components/pwa/InstallBanner';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [role, setRole] = useState<UserRole>('none');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/role')
      .then((res) => res.json())
      .then((data) => {
        setRole(data.role || 'none');
      })
      .catch(() => {
        setRole('none');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Show nothing while loading role to prevent flash
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <I18nProvider>
      <AuthProvider initialRole={role}>
        <InstallBanner />
        {children}
      </AuthProvider>
    </I18nProvider>
  );
}

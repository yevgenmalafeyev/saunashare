'use client';

import { I18nProvider } from '@/lib/context/I18nContext';
import { AccessDeniedWithTokenInput } from '@/components/auth/AccessDeniedWithTokenInput';

export default function ForbiddenPage() {
  return (
    <I18nProvider>
      <AccessDeniedWithTokenInput isTelegram={false} />
    </I18nProvider>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Spinner, Button } from '@/components/ui';
import { useTranslation } from '@/lib/context/I18nContext';
import { useAuth } from '@/lib/context/AuthContext';
import { useTelegram } from '@/hooks/useTelegram';
import { CheckInFlow } from './CheckInFlow';
import type { Session } from '@/lib/types';

const SAUNA_ADDRESS = 'Rua Isadora Duncan 24A, Caparica, Portugal';
const SAUNA_LAT = 38.641891;
const SAUNA_LNG = -9.212057;
const WAZE_URL = `https://waze.com/ul?q=${encodeURIComponent(SAUNA_ADDRESS)}&navigate=yes`;
const GOOGLE_MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(SAUNA_ADDRESS)}`;
const BOLT_URL = `taxify://?action=setPickup&searchTerm=${encodeURIComponent(SAUNA_ADDRESS)}`;
// Uber requires lat/lng + nickname + address for dropoff to display
const UBER_URL = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${SAUNA_LAT}&dropoff[longitude]=${SAUNA_LNG}&dropoff[nickname]=Sauna&dropoff[formatted_address]=${encodeURIComponent(SAUNA_ADDRESS)}`;

const SAUNA_SHORT_ADDRESS = 'Rua Isadora Duncan 24A, Caparica';

function NavigationLinks() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(SAUNA_SHORT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border-2 border-stone-200 rounded-2xl p-6 mb-6">
      <h3 className="text-lg font-semibold text-stone-700 text-center mb-4">
        {t('user.buildRoute')}
      </h3>
      <div className="flex justify-center gap-8">
        <a
          href={WAZE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-all active:scale-95 hover:scale-105"
        >
          <Image
            src="/icons/waze.png"
            alt="Waze"
            width={96}
            height={96}
            className="rounded-xl"
          />
        </a>
        <a
          href={GOOGLE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-all active:scale-95 hover:scale-105"
        >
          <Image
            src="/icons/google-maps.png"
            alt="Google Maps"
            width={96}
            height={96}
            className="rounded-lg"
          />
        </a>
      </div>
      <h3 className="text-lg font-semibold text-stone-700 text-center mt-6 mb-4">
        {t('user.orderTaxi')}
      </h3>
      <div className="flex justify-center gap-8">
        <a
          href={BOLT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-all active:scale-95 hover:scale-105"
        >
          <Image
            src="/bolt.png"
            alt="Bolt"
            width={96}
            height={96}
            className="rounded-xl"
          />
        </a>
        <a
          href={UBER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-all active:scale-95 hover:scale-105"
        >
          <Image
            src="/uber.png"
            alt="Uber"
            width={96}
            height={96}
            className="rounded-xl"
          />
        </a>
      </div>
      <div className="flex items-center justify-center gap-2 mt-4">
        <span className="text-base text-stone-500">{SAUNA_SHORT_ADDRESS}</span>
        <button
          onClick={copyAddress}
          className="p-1 rounded hover:bg-stone-100 active:scale-95 transition-all"
          title={t('billing.copyToClipboard')}
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

interface SessionWithCheckedIn extends Session {
  userSessionParticipantId?: number;
  billingReady?: boolean;
  isToday?: boolean;
}

export function UserDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setCurrentUserId, checkedInSessions, addCheckedInSession, mergeServerSessions } = useAuth();
  const { isInTelegram, linkedParticipantIds } = useTelegram();
  const [sessions, setSessions] = useState<SessionWithCheckedIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showBillIssuedError, setShowBillIssuedError] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        // Build a local merged map BEFORE filtering — avoids stale closure from async setState
        let allCheckedIn: Record<number, { participantId: number; sessionParticipantId: number }> = { ...checkedInSessions };

        // For Telegram users, fetch server-linked sessions and merge into local variable
        if (isInTelegram && linkedParticipantIds.length > 0) {
          try {
            const tgRes = await fetch(`/api/auth/telegram/sessions?participantIds=${linkedParticipantIds.join(',')}`);
            if (tgRes.ok) {
              const serverData = await tgRes.json();
              allCheckedIn = { ...serverData, ...allCheckedIn };
              mergeServerSessions(serverData); // persist for future renders
            }
          } catch {
            // Non-critical — continue with local data
          }
        }

        const res = await fetch('/api/sessions');
        const data = await res.json();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Use allCheckedIn for filtering — no stale closure issue
        const checkedInSessionIds = new Set(Object.keys(allCheckedIn).map(Number));

        const relevantSessions = data.sessions.filter((session: Session & { isToday?: boolean }) => {
          if (session.hidden) return false;

          const sessionDate = new Date(session.createdAt);
          sessionDate.setHours(0, 0, 0, 0);
          session.isToday = sessionDate.getTime() === today.getTime();
          const isCheckedIn = checkedInSessionIds.has(session.id);

          return session.isToday || isCheckedIn;
        });

        // Mark sessions with check-in info and billing status
        for (const session of relevantSessions) {

          // Check if user is checked in from our local merged map
          const checkInRecord = allCheckedIn[session.id];
          if (checkInRecord) {
            session.userSessionParticipantId = checkInRecord.sessionParticipantId;
          }

          // Only fetch billing status for today's sessions (for check-in blocking)
          if (session.isToday && !session.userSessionParticipantId) {
            const billingRes = await fetch(`/api/sessions/${session.id}/billing?type=calculate`);
            const billingData = await billingRes.json();
            session.billingReady = billingData.ready;
          }
        }

        // Sort: today's sessions first, then by date descending
        relevantSessions.sort((a: SessionWithCheckedIn, b: SessionWithCheckedIn) => {
          if (a.isToday && !b.isToday) return -1;
          if (!a.isToday && b.isToday) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setSessions(relevantSessions);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInTelegram, linkedParticipantIds, mergeServerSessions]);

  const handleSessionClick = (session: SessionWithCheckedIn) => {
    if (session.userSessionParticipantId) {
      // Already checked in — set correct currentUserId before navigating
      setCurrentUserId(session.userSessionParticipantId);
      router.push(`/session/${session.id}`);
    } else if (session.billingReady) {
      // Bill already issued, cannot check in
      setShowBillIssuedError(true);
    } else {
      // Show check-in flow
      setSelectedSession(session);
      setShowCheckIn(true);
    }
  };

  const handleCheckIn = (sessionParticipantId: number, participantId: number) => {
    if (selectedSession) {
      setCurrentUserId(sessionParticipantId);
      addCheckedInSession(selectedSession.id, participantId, sessionParticipantId);
      router.push(`/session/${selectedSession.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-stone-800">{t('user.welcome')}</h2>

      <NavigationLinks />

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-500">{t('user.noActiveSessions')}</p>
          <p className="text-sm text-stone-400 mt-2">{t('user.waitForSession')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const sessionDate = new Date(session.createdAt);
            const dateStr = `${sessionDate.getDate().toString().padStart(2, '0')}.${(sessionDate.getMonth() + 1).toString().padStart(2, '0')}.${sessionDate.getFullYear()}`;
            return (
              <button
                key={session.id}
                onClick={() => handleSessionClick(session)}
                className={`w-full text-left border-2 rounded-2xl p-8 transition-colors ${
                  session.isToday
                    ? 'bg-white border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                    : 'bg-stone-50 border-stone-200 hover:border-amber-300 hover:bg-amber-50'
                }`}
              >
                <div>
                  <div className="font-bold text-2xl text-stone-800">{session.name}</div>
                  <div className="text-base text-stone-500 mt-2">
                    {!session.isToday && (
                      <span className="text-stone-400">{dateStr} · </span>
                    )}
                    {t('dashboard.participants', { count: session.participantCount })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedSession && (
        <CheckInFlow
          sessionId={selectedSession.id}
          isOpen={showCheckIn}
          onClose={() => {
            setShowCheckIn(false);
            setSelectedSession(null);
          }}
          onCheckIn={handleCheckIn}
        />
      )}

      {/* Bill already issued error dialog */}
      {showBillIssuedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
            <h3 className="text-2xl font-bold text-stone-800 mb-4">
              {t('user.cannotCheckIn')}
            </h3>
            <p className="text-lg text-stone-600 mb-8">{t('user.billAlreadyIssued')}</p>
            <Button
              className="w-full py-4 text-lg"
              onClick={() => setShowBillIssuedError(false)}
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

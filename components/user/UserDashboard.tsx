'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner, Button } from '@/components/ui';
import { useTranslation } from '@/lib/context/I18nContext';
import { useAuth } from '@/lib/context/AuthContext';
import { CheckInFlow } from './CheckInFlow';
import type { Session } from '@/lib/types';

interface SessionWithCheckedIn extends Session {
  userSessionParticipantId?: number;
  billingReady?: boolean;
}

export function UserDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { currentUserId, setCurrentUserId } = useAuth();
  const [sessions, setSessions] = useState<SessionWithCheckedIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showBillIssuedError, setShowBillIssuedError] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();

        // Filter to only show today's sessions that are not hidden
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaySessions = data.sessions.filter((session: Session) => {
          const sessionDate = new Date(session.createdAt);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate.getTime() === today.getTime() && !session.hidden;
        });

        // Check billing status and if user is already checked in to any session
        for (const session of todaySessions) {
          const [participantsRes, billingRes] = await Promise.all([
            fetch(`/api/sessions/${session.id}/participants`),
            fetch(`/api/sessions/${session.id}/billing?type=calculate`),
          ]);
          const participants = await participantsRes.json();
          const billingData = await billingRes.json();

          session.billingReady = billingData.ready;

          if (currentUserId) {
            const userParticipant = participants.find(
              (p: { id: number }) => p.id === currentUserId
            );
            if (userParticipant) {
              session.userSessionParticipantId = userParticipant.id;
            }
          }
        }

        setSessions(todaySessions);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [currentUserId]);

  const handleSessionClick = (session: SessionWithCheckedIn) => {
    if (session.userSessionParticipantId) {
      // Already checked in, go to session view
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

  const handleCheckIn = (sessionParticipantId: number) => {
    if (selectedSession) {
      setCurrentUserId(sessionParticipantId);
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

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-500">{t('user.noActiveSessions')}</p>
          <p className="text-sm text-stone-400 mt-2">{t('user.waitForSession')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleSessionClick(session)}
              className="w-full text-left bg-white border-2 border-stone-200 rounded-2xl p-8 hover:border-amber-300 hover:bg-amber-50 transition-colors"
            >
              <div>
                <div className="font-bold text-2xl text-stone-800">{session.name}</div>
                <div className="text-base text-stone-500 mt-2">
                  {t('dashboard.participants', { count: session.participantCount })}
                </div>
              </div>
            </button>
          ))}
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

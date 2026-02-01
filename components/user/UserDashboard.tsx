'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui';
import { useTranslation } from '@/lib/context/I18nContext';
import { useAuth } from '@/lib/context/AuthContext';
import { CheckInFlow } from './CheckInFlow';

interface Session {
  id: number;
  name: string;
  hidden: boolean;
  createdAt: string;
  participantCount: number;
  dutyPerson?: 'artur' | 'andrey' | null;
}

interface SessionWithCheckedIn extends Session {
  userSessionParticipantId?: number;
}

export function UserDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { currentUserId, setCurrentUserId } = useAuth();
  const [sessions, setSessions] = useState<SessionWithCheckedIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);

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

        // Check if user is already checked in to any session
        if (currentUserId) {
          for (const session of todaySessions) {
            const participantsRes = await fetch(`/api/sessions/${session.id}/participants`);
            const participants = await participantsRes.json();
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
          <div className="text-5xl mb-4">🧖</div>
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
    </div>
  );
}

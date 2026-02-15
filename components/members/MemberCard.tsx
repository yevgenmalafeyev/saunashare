'use client';

import { useState } from 'react';
import { ChevronRightIcon, CloseIcon } from '@/components/ui/Icons';
import { useTranslation } from '@/lib/context/I18nContext';
import { AddTelegramLinkModal } from './AddTelegramLinkModal';
import type { Member } from '@/lib/types';

interface MemberCardProps {
  member: Member;
  onRefresh: () => void;
}

export function MemberCard({ member, onRefresh }: MemberCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [unlinking, setUnlinking] = useState<number | null>(null);

  const handleUnlink = async (linkId: number) => {
    setUnlinking(linkId);
    try {
      const res = await fetch(`/api/members/${member.id}/telegram-links/${linkId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onRefresh();
      }
    } finally {
      setUnlinking(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center gap-3 text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium text-stone-800 truncate">{member.name}</div>
            <div className="text-xs text-stone-400">
              score: {member.activityScore}
              {member.telegramLinks.length > 0 && (
                <span className="ml-2 text-amber-600">
                  {member.telegramLinks.length} telegram
                </span>
              )}
            </div>
          </div>
          <ChevronRightIcon
            className={`w-5 h-5 text-stone-400 transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
          />
        </button>

        {expanded && (
          <div className="px-4 pb-3 border-t border-stone-100">
            <div className="pt-3 space-y-2">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                {t('members.telegramLinks')}
              </p>

              {member.telegramLinks.length === 0 ? (
                <p className="text-sm text-stone-400">{t('members.noTelegramLinks')}</p>
              ) : (
                <div className="space-y-1">
                  {member.telegramLinks.map((link) => (
                    <div
                      key={link.linkId}
                      className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-stone-700 truncate">
                          {link.telegramFirstName || link.telegramUsername || `ID ${link.telegramUserId}`}
                        </div>
                        {link.telegramUsername && (
                          <div className="text-xs text-stone-400">@{link.telegramUsername}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleUnlink(link.linkId)}
                        disabled={unlinking === link.linkId}
                        className="p-1 text-stone-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <CloseIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowLinkModal(true)}
                className="w-full py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
              >
                {t('members.addTelegramLink')}
              </button>
            </div>
          </div>
        )}
      </div>

      <AddTelegramLinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        participantId={member.id}
        existingTelegramUserIds={member.telegramLinks.map((l) => l.telegramUserId)}
        onLinked={onRefresh}
      />
    </>
  );
}

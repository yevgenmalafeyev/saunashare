'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
  right: number;
  bottom: number;
}

const DEFAULT_POSITION: Position = { right: 24, bottom: 24 };

function getInitialPosition(storageKey: string): Position {
  if (typeof window === 'undefined') return DEFAULT_POSITION;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_POSITION;
}

interface UseDraggablePositionOptions {
  storageKey: string;
  onTap?: () => void;
}

interface UseDraggablePositionResult {
  position: Position;
  isDragging: boolean;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onClick: () => void;
  };
}

export function useDraggablePosition({
  storageKey,
  onTap,
}: UseDraggablePositionOptions): UseDraggablePositionResult {
  const [position, setPosition] = useState<Position>(DEFAULT_POSITION);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef<Position>(DEFAULT_POSITION);
  const hasMoved = useRef(false);

  // Load position on mount
  useEffect(() => {
    setPosition(getInitialPosition(storageKey));
  }, [storageKey]);

  // Save position when it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(position));
    } catch {
      // Ignore errors
    }
  }, [position, storageKey]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    positionStartRef.current = { ...position };
    hasMoved.current = false;
    setIsDragging(true);
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const touch = e.touches[0];
    const deltaX = dragStartRef.current.x - touch.clientX;
    const deltaY = dragStartRef.current.y - touch.clientY;

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      hasMoved.current = true;
    }

    const newRight = Math.max(16, Math.min(window.innerWidth - 72, positionStartRef.current.right + deltaX));
    const newBottom = Math.max(16, Math.min(window.innerHeight - 72, positionStartRef.current.bottom + deltaY));

    setPosition({ right: newRight, bottom: newBottom });
  }, [isDragging]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!hasMoved.current && onTap) {
      onTap();
    }
  }, [onTap]);

  const handleClick = useCallback(() => {
    if (!('ontouchstart' in window) && onTap) {
      onTap();
    }
  }, [onTap]);

  return {
    position,
    isDragging,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onClick: handleClick,
    },
  };
}

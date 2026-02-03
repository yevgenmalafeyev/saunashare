'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
  right: number;
  bottom: number;
}

const DEFAULT_POSITION: Position = { right: 24, bottom: 24 };
const DRAG_THRESHOLD = 10;
const BUTTON_SIZE = 72;
const MIN_MARGIN = 16;

function getInitialPosition(storageKey: string): Position {
  if (typeof window === 'undefined') return DEFAULT_POSITION;
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : DEFAULT_POSITION;
  } catch {
    return DEFAULT_POSITION;
  }
}

function savePosition(storageKey: string, position: Position): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(position));
  } catch {
    // Ignore localStorage errors
  }
}

function clampPosition(right: number, bottom: number): Position {
  return {
    right: Math.max(MIN_MARGIN, Math.min(window.innerWidth - BUTTON_SIZE, right)),
    bottom: Math.max(MIN_MARGIN, Math.min(window.innerHeight - BUTTON_SIZE, bottom)),
  };
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
    savePosition(storageKey, position);
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

    if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
      hasMoved.current = true;
    }

    const newPosition = clampPosition(
      positionStartRef.current.right + deltaX,
      positionStartRef.current.bottom + deltaY
    );

    setPosition(newPosition);
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

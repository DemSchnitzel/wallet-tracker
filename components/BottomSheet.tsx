import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragCurrentDelta = useRef(0);
  const isDragging = useRef(false);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ── Handle drag-to-dismiss (only from the handle bar) ──────────────────────

  const applySheetTranslate = (y: number) => {
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${Math.max(0, y)}px)`;
    }
  };

  const resetSheetTranslate = (animate = true) => {
    if (!sheetRef.current) return;
    if (animate) {
      sheetRef.current.style.transition = 'transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    }
    sheetRef.current.style.transform = 'translateY(0)';
    if (animate) {
      const el = sheetRef.current;
      const clear = () => { el.style.transition = ''; el.removeEventListener('transitionend', clear); };
      el.addEventListener('transitionend', clear);
    }
  };

  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragCurrentDelta.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };

  const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const delta = e.clientY - dragStartY.current;
    dragCurrentDelta.current = delta;
    applySheetTranslate(delta);
  };

  const onHandlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (dragCurrentDelta.current > 100) {
      onClose();
    } else {
      resetSheetTranslate(true);
    }
    dragCurrentDelta.current = 0;
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.8 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] max-h-[87dvh] flex flex-col will-change-transform"
            style={{ boxShadow: '0 -4px 40px rgba(0,0,0,0.10)' }}
          >
            {/* Drag handle */}
            <div
              className="flex justify-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
            >
              <div className="w-10 h-1 rounded-full bg-zinc-200" />
            </div>

            {/* Title */}
            <div className="px-6 pt-1 pb-4 shrink-0">
              <h2 className="text-xl font-medium tracking-tight text-zinc-900">{title}</h2>
            </div>

            {/* Scrollable content */}
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto overscroll-contain px-6 pb-10"
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

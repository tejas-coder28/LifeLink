import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useWordReveal
 *
 * Word-by-word reveal animation for the latest AI message.
 * - Speed: aims to reveal full text in ~600ms regardless of length (min 2 words/frame at 60fps)
 * - Respects prefers-reduced-motion → shows instantly
 * - Completes instantly on: click, Esc key, or when a new message is sent
 * - Only the target message ID animates; older messages render instantly
 *
 * @param {string} text        - Full text to reveal
 * @param {string} messageId   - Unique ID for this message; animation runs when id changes
 * @param {boolean} animate    - Whether to animate (false → instant reveal)
 * @returns {{ displayed: string, done: boolean, skipAnimation: () => void }}
 */
export function useWordReveal(text, messageId, animate) {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const shouldAnimate = animate && !prefersReduced;

  const [displayed, setDisplayed] = useState(shouldAnimate ? '' : (text || ''));
  const [done, setDone] = useState(!shouldAnimate);
  const rafRef = useRef(null);
  const wordIndexRef = useRef(0);
  const wordsRef = useRef([]);
  const frameCountRef = useRef(0);

  const skipAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setDisplayed(text || '');
    setDone(true);
  }, [text]);

  useEffect(() => {
    if (!text) {
      setDisplayed('');
      setDone(true);
      return;
    }

    if (!shouldAnimate) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    // Reset for new message
    const words = text.split(' ');
    wordsRef.current = words;
    wordIndexRef.current = 0;
    frameCountRef.current = 0;
    setDisplayed('');
    setDone(false);

    // Compute words-per-frame: target ~36 frames (600ms @ 60fps) total
    // Min 1 word/frame, max uncapped
    const wordsPerFrame = Math.max(1, Math.ceil(words.length / 36));

    const tick = () => {
      frameCountRef.current++;
      const idx = wordIndexRef.current;
      if (idx >= words.length) {
        setDisplayed(text);
        setDone(true);
        return;
      }
      const nextIdx = Math.min(idx + wordsPerFrame, words.length);
      wordIndexRef.current = nextIdx;
      setDisplayed(words.slice(0, nextIdx).join(' '));

      if (nextIdx < words.length) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayed(text);
        setDone(true);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId]);

  // Listen for Escape key to skip
  useEffect(() => {
    if (done) return;
    const handler = (e) => {
      if (e.key === 'Escape') skipAnimation();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [done, skipAnimation]);

  return { displayed, done, skipAnimation };
}


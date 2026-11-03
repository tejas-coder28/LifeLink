import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * TYPE_SPEED configuration constants for the demo credentials typewriter effect.
 * Exported for tuning.
 */
export const TYPE_SPEED = {
  char: 55,             // Base ms per email character
  jitter: 0.30,         // +-30% random timing jitter
  punctPause: 140,      // Extra pause after '@' and '.' characters
  fieldPause: 300,      // Pause (ms) between email and password fields
  passwordChar: 85,     // Base ms per password character
  pulseDuration: 120,   // Keystroke border pulse duration (ms)
};

/**
 * useTypewriterFill — Simulates a human typing demo credentials into form fields.
 *
 * @param {Object} params
 * @param {Function} params.setEmail - React state setter for email
 * @param {Function} params.setPassword - React state setter for password
 * @param {React.RefObject} params.emailInputRef - Ref to email input DOM element
 * @param {React.RefObject} params.passwordInputRef - Ref to password input DOM element
 * @param {React.RefObject} params.submitButtonRef - Ref to submit button DOM element
 */
export const useTypewriterFill = ({
  setEmail,
  setPassword,
  emailInputRef,
  passwordInputRef,
  submitButtonRef,
}) => {
  const [activeRole, setActiveRole] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [activeField, setActiveField] = useState(null); // 'email' | 'password' | null
  const [pulsingField, setPulsingField] = useState(null);
  const [liveMessage, setLiveMessage] = useState('');

  const timerRef = useRef(null);
  const pulseTimerRef = useRef(null);
  const isMounted = useRef(true);
  const sequenceId = useRef(0);

  // Track component mount status
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  /**
   * Cancel any running typing animation immediately.
   */
  const cancelTypewriter = useCallback(() => {
    sequenceId.current += 1;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pulseTimerRef.current) {
      clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }
    if (isMounted.current) {
      setIsTyping(false);
      setActiveField(null);
      setPulsingField(null);
    }
  }, []);

  // Listen for 'Escape' key globally to cancel typing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isTyping) {
        cancelTypewriter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTyping, cancelTypewriter]);

  /**
   * Triggers a quick border pulse on the currently typed field
   */
  const triggerPulse = useCallback((field) => {
    if (!isMounted.current) return;
    setPulsingField(field);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      if (isMounted.current) {
        setPulsingField(null);
      }
    }, TYPE_SPEED.pulseDuration);
  }, []);

  /**
   * Start typing sequence for a given demo role.
   */
  const startTypewriter = useCallback((roleId, roleLabel, targetEmail, targetPassword) => {
    // Cancel any running animation
    cancelTypewriter();

    const currentSeq = sequenceId.current;

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setActiveRole(roleId);
      setEmail(targetEmail);
      setPassword(targetPassword);
      setLiveMessage(`Filling demo credentials for ${roleLabel}. Ready to sign in.`);
      setTimeout(() => {
        if (isMounted.current && sequenceId.current === currentSeq) {
          submitButtonRef?.current?.focus();
        }
      }, 50);
      return;
    }

    // Sequence start:
    // 1. Mark clicked card selected
    setActiveRole(roleId);
    // 2. Clear both fields
    setEmail('');
    setPassword('');
    setIsTyping(true);
    setActiveField('email');
    setLiveMessage(`Filling demo credentials for ${roleLabel}`);

    // Focus email field
    emailInputRef?.current?.focus();

    let emailIdx = 0;

    const typeNextEmailChar = () => {
      if (!isMounted.current || sequenceId.current !== currentSeq) return;

      if (emailIdx < targetEmail.length) {
        emailIdx += 1;
        setEmail(targetEmail.slice(0, emailIdx));
        triggerPulse('email');

        const prevChar = targetEmail[emailIdx - 1];
        const isPunctuation = prevChar === '@' || prevChar === '.';
        const jitter = (Math.random() * 2 - 1) * TYPE_SPEED.jitter;
        const delay = Math.max(20, TYPE_SPEED.char * (1 + jitter) + (isPunctuation ? TYPE_SPEED.punctPause : 0));

        timerRef.current = setTimeout(typeNextEmailChar, delay);
      } else {
        // Email finished. Pause 300ms, then move to password field
        setActiveField(null);
        timerRef.current = setTimeout(startPasswordPhase, TYPE_SPEED.fieldPause);
      }
    };

    const startPasswordPhase = () => {
      if (!isMounted.current || sequenceId.current !== currentSeq) return;

      setActiveField('password');
      passwordInputRef?.current?.focus();

      let passIdx = 0;

      const typeNextPasswordChar = () => {
        if (!isMounted.current || sequenceId.current !== currentSeq) return;

        if (passIdx < targetPassword.length) {
          passIdx += 1;
          setPassword(targetPassword.slice(0, passIdx));
          triggerPulse('password');

          const jitter = (Math.random() * 2 - 1) * TYPE_SPEED.jitter;
          const delay = Math.max(30, TYPE_SPEED.passwordChar * (1 + jitter));

          timerRef.current = setTimeout(typeNextPasswordChar, delay);
        } else {
          // Password finished. Move focus to submit button
          setIsTyping(false);
          setActiveField(null);
          setPulsingField(null);
          setLiveMessage('Ready to sign in');

          setTimeout(() => {
            if (isMounted.current && sequenceId.current === currentSeq) {
              submitButtonRef?.current?.focus();
            }
          }, 60);
        }
      };

      // Kick off password typing
      typeNextPasswordChar();
    };

    // Kick off email typing
    typeNextEmailChar();
  }, [
    cancelTypewriter,
    setEmail,
    setPassword,
    emailInputRef,
    passwordInputRef,
    submitButtonRef,
    triggerPulse,
  ]);

  return {
    activeRole,
    isTyping,
    activeField,
    pulsingField,
    liveMessage,
    startTypewriter,
    cancelTypewriter,
  };
};

export default useTypewriterFill;

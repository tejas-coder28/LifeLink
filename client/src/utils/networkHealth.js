import axios from 'axios';
import { emitToast, dismissToast } from '../context/ToastContext';

export const FRIENDLY_UNREACHABLE_MSG =
  "Can't reach the LifeLink server. Please check that the backend is running and try again.";
export const UNREACHABLE_TOAST_ID = 'server-unreachable-error';

// Progressive backoff intervals (ms) when backend is unavailable: 5s, 10s, 30s
const BACKOFF_STEPS = [5000, 10000, 30000];

/**
 * NetworkHealthTracker
 *
 * Tracks API reachability and pauses polling/retries when the server is down.
 * Backs off (5s -> 10s -> 30s) and pauses until user interaction or successful /api/health probe.
 */
class NetworkHealthTracker {
  constructor() {
    this.isReachable = true;
    this.failureCount = 0;
    this.listeners = new Set();
    this.probeTimer = null;
    this.isProbing = false;
    this.lastUserActionTime = 0;

    if (typeof window !== 'undefined') {
      const handleUserActivity = () => {
        const now = Date.now();
        if (now - this.lastUserActionTime < 1500) return;
        this.lastUserActionTime = now;

        // If server is currently flagged as down, attempt probe on user action
        if (!this.isReachable && !this.isProbing) {
          this.probeHealth();
        }
      };

      window.addEventListener('click', handleUserActivity, { passive: true });
      window.addEventListener('keydown', handleUserActivity, { passive: true });
      window.addEventListener('focus', handleUserActivity, { passive: true });
    }
  }

  canPoll() {
    return this.isReachable;
  }

  getCurrentDelay() {
    const idx = Math.min(this.failureCount, BACKOFF_STEPS.length - 1);
    return BACKOFF_STEPS[idx];
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(isUp) {
    this.listeners.forEach((fn) => {
      try {
        fn(isUp);
      } catch (e) {
        // Suppress listener error
      }
    });
  }

  reportSuccess() {
    if (!this.isReachable) {
      this.isReachable = true;
      this.failureCount = 0;
      dismissToast(UNREACHABLE_TOAST_ID);
      this.notify(true);
    }
    if (this.probeTimer) {
      clearTimeout(this.probeTimer);
      this.probeTimer = null;
    }
    this.isProbing = false;
  }

  reportFailure(error) {
    const wasReachable = this.isReachable;
    this.isReachable = false;
    this.failureCount += 1;

    if (wasReachable) {
      this.notify(false);
    }

    this.scheduleNextProbe();
  }

  scheduleNextProbe() {
    if (this.probeTimer) {
      clearTimeout(this.probeTimer);
      this.probeTimer = null;
    }

    // Only auto-probe up to 3 times (5s, 10s, 30s), then pause until user action
    if (this.failureCount > BACKOFF_STEPS.length) {
      return;
    }

    const delay = this.getCurrentDelay();
    this.probeTimer = setTimeout(() => {
      this.probeHealth();
    }, delay);
  }

  async probeHealth() {
    if (this.isProbing) return;
    this.isProbing = true;

    try {
      const res = await axios.get('/api/health', {
        timeout: 4000,
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.status === 200) {
        this.reportSuccess();
        return;
      }
    } catch {
      this.failureCount += 1;
      this.scheduleNextProbe();
    } finally {
      this.isProbing = false;
    }
  }
}

export const networkHealth = new NetworkHealthTracker();

/**
 * Creates a smart polling loop that backs off and pauses when the backend is unreachable.
 *
 * @param {Function} callback - Function to execute on poll
 * @param {number} baseIntervalMs - Default polling interval when healthy (default: 5000)
 * @returns {Function} Cancel function to teardown the polling loop
 */
export function createSmartPolling(callback, baseIntervalMs = 5000) {
  let timerId = null;
  let isCancelled = false;

  const tick = async () => {
    if (isCancelled) return;

    if (networkHealth.canPoll()) {
      try {
        await callback();
      } catch {
        // Axios interceptor will trigger reportFailure
      }
    }

    if (isCancelled) return;

    const nextDelay = networkHealth.canPoll() ? baseIntervalMs : networkHealth.getCurrentDelay();
    timerId = setTimeout(tick, nextDelay);
  };

  timerId = setTimeout(tick, baseIntervalMs);

  const unsubscribe = networkHealth.subscribe((isUp) => {
    if (isUp && !isCancelled) {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(tick, 0);
    }
  });

  return () => {
    isCancelled = true;
    if (timerId) clearTimeout(timerId);
    unsubscribe();
  };
}

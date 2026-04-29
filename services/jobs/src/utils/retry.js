/**
 * Exponential-backoff retry wrapper.
 *
 * Retries `fn` up to `maxAttempts` times.  On each failure the wait time
 * doubles: 1s → 2s → 4s …  Jitter (±25 %) is added to prevent thundering-
 * herd when multiple workers hit the same flaky external service.
 *
 * @param {() => Promise<T>} fn          — async function to retry
 * @param {object}           [options]
 * @param {number}           [options.maxAttempts=3]
 * @param {number}           [options.baseDelayMs=1000]
 * @param {string}           [options.label='']       — for log messages
 * @returns {Promise<T>}
 */
export const withRetry = async (fn, { maxAttempts = 3, baseDelayMs = 1000, label = '' } = {}) => {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === maxAttempts) break;

      const base = baseDelayMs * Math.pow(2, attempt - 1);
      // ±25 % jitter
      const jitter = base * 0.25 * (Math.random() * 2 - 1);
      const delay = Math.round(base + jitter);

      console.warn(
        `[Retry${label ? ` ${label}` : ''}] Attempt ${attempt}/${maxAttempts} failed — retrying in ${delay}ms. Error: ${err.message}`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

export type RetryOpts = { 
  tries?: number; 
  baseMs?: number; 
  factor?: number; 
  onRetry?: (err: any, attempt: number) => void 
};

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOpts = {}): Promise<T> {
  const tries = opts.tries ?? 4;
  const base = opts.baseMs ?? 300;
  const factor = opts.factor ?? 2;

  let attempt = 0;
  let lastErr: any;
  
  while (attempt < tries) {
    try { 
      return await fn(); 
    } catch (err: any) {
      lastErr = err; 
      attempt++;
      const status = err?.status ?? err?.response?.status;
      if (status && status < 500 && status !== 429) break; // don't retry bad requests
      if (attempt >= tries) break;
      const delay = base * Math.pow(factor, attempt - 1);
      opts.onRetry?.(err, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

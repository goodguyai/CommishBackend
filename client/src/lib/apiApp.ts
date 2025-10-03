let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  
  const response = await fetch('/api/csrf-token');
  const data = await response.json();
  const token = data.token;
  csrfToken = token;
  return token;
}

export async function api<T = any>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = path.startsWith('http') ? path : path;
  
  // Add CSRF token for non-GET requests
  if (options?.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method)) {
    const token = await getCsrfToken();
    options.headers = {
      ...options.headers,
      'X-CSRF-Token': token,
    };
  }
  
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  return response.json();
}

const DEFAULT_API_BASE_URL = 'http://localhost:4000';

function isLoopbackHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isUsableDevHost(hostname: string | null | undefined): hostname is string {
  return Boolean(hostname && !isLoopbackHost(hostname));
}

function hostFromHostPort(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!trimmed.includes('://') && trimmed.includes(':')) {
    const [host] = trimmed.split(':');
    return isUsableDevHost(host) ? host : null;
  }

  try {
    const normalized = trimmed.includes('://') ? trimmed : `http://${trimmed}`;
    const { hostname } = new URL(normalized);
    return isUsableDevHost(hostname) ? hostname : null;
  } catch {
    return null;
  }
}

function hostFromLinkingUri(linkingUri: string) {
  try {
    const url = new URL(linkingUri);
    const nestedUrl = url.searchParams.get('url');
    if (nestedUrl) {
      const nestedHost = hostFromHostPort(new URL(nestedUrl).hostname);
      if (nestedHost) return nestedHost;
    }
    return hostFromHostPort(url.hostname);
  } catch {
    return null;
  }
}

/** Hostname of the machine running Metro / Expo CLI (LAN IP on physical devices). */
export function extractDevMachineHost(expoConstants: {
  expoConfig?: { hostUri?: string } | null;
  expoGoConfig?: { debuggerHost?: string } | null;
  linkingUri?: string;
  experienceUrl?: string;
}) {
  const candidates = [
    expoConstants.expoConfig?.hostUri,
    expoConstants.expoGoConfig?.debuggerHost,
    expoConstants.linkingUri ? hostFromLinkingUri(expoConstants.linkingUri) : null,
    expoConstants.experienceUrl,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const host = hostFromHostPort(candidate);
    if (host) return host;
  }

  return null;
}

/**
 * In dev, swap localhost/127.0.0.1 for the Metro host so a phone on the same Wi‑Fi
 * can reach the API running on the laptop. Production / explicit LAN URLs are unchanged.
 */
export function resolveApiBaseUrl(
  configuredBaseUrl: string | undefined,
  options?: { dev?: boolean; devMachineHost?: string | null; shouldUseDevMachineHost?: boolean },
) {
  const base = configuredBaseUrl?.trim() || DEFAULT_API_BASE_URL;
  const dev = options?.dev ?? __DEV__;
  if (!dev) return base;

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return base;
  }

  if (!isLoopbackHost(url.hostname)) return base;

  if (options?.shouldUseDevMachineHost === false) return base;

  const devMachineHost = options?.devMachineHost ?? null;
  if (!devMachineHost) return base;

  url.hostname = devMachineHost;
  return url.toString().replace(/\/$/, '');
}

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  checkedAt?: number;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const GITHUB_REPO = 'hongducdev/nodepeeker';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedInfo: UpdateInfo | null = null;
let lastCheckTime = 0;

export function parseSemver(version: string): [number, number, number] {
  const clean = version.trim().replace(/^v/, '');
  const parts = clean.split('.').map((p) => {
    const num = parseInt(p, 10);
    return Number.isFinite(num) ? num : 0;
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function isNewerVersion(remote: string, current: string): boolean {
  const [rMaj, rMin, rPat] = parseSemver(remote);
  const [cMaj, cMin, cPat] = parseSemver(current);

  if (rMaj !== cMaj) return rMaj > cMaj;
  if (rMin !== cMin) return rMin > cMin;
  return rPat > cPat;
}

export function getCurrentVersion(): string {
  try {
    const pkgPath = join(ROOT, 'package.json');
    if (existsSync(pkgPath)) {
      const parsed = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
      return parsed.version ?? '1.0.0';
    }
  } catch {
    // fallback
  }
  return '1.0.0';
}

export async function checkUpdate(force = false): Promise<UpdateInfo> {
  try {
    const now = Date.now();
    const currentVersion = getCurrentVersion();

    if (!force && cachedInfo && now - lastCheckTime < CACHE_TTL_MS) {
      return cachedInfo;
    }

    const defaultResult: UpdateInfo = {
      hasUpdate: false,
      currentVersion,
      checkedAt: now,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    const headers = {
      'User-Agent': 'NodePeeker-Update-Checker',
      Accept: 'application/vnd.github.v3+json',
    };

    // 1. Try releases/latest first
    let res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers,
      signal: controller.signal,
    });

    if (res.ok) {
      clearTimeout(timeout);
      const data = (await res.json()) as { tag_name?: string; html_url?: string };
      const latestTag = data.tag_name ?? '';
      const hasUpdate = isNewerVersion(latestTag, currentVersion);
      cachedInfo = {
        hasUpdate,
        currentVersion,
        latestVersion: latestTag.replace(/^v/, ''),
        releaseUrl: data.html_url ?? `https://github.com/${GITHUB_REPO}/releases`,
        checkedAt: now,
      };
      lastCheckTime = now;
      return cachedInfo;
    }

    // 2. Fallback to tags if no official release is published yet
    res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/tags`, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const tags = (await res.json()) as Array<{ name?: string }>;
      if (Array.isArray(tags) && tags.length > 0 && tags[0].name) {
        const latestTag = tags[0].name;
        const hasUpdate = isNewerVersion(latestTag, currentVersion);
        cachedInfo = {
          hasUpdate,
          currentVersion,
          latestVersion: latestTag.replace(/^v/, ''),
          releaseUrl: `https://github.com/${GITHUB_REPO}/releases`,
          checkedAt: now,
        };
        lastCheckTime = now;
        return cachedInfo;
      }
    }

    cachedInfo = defaultResult;
    lastCheckTime = now;
    return defaultResult;
  } catch {
    return cachedInfo ?? {
      hasUpdate: false,
      currentVersion: getCurrentVersion(),
    };
  }
}

export function getCachedUpdateInfo(): UpdateInfo {
  return cachedInfo ?? {
    hasUpdate: false,
    currentVersion: getCurrentVersion(),
  };
}

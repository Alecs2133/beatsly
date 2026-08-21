import { useEffect, useState } from 'react';

const REPO = 'Alecs2133/beatsly';
const API_URL = `https://api.github.com/repos/${REPO}/releases`;

export interface LatestRelease {
  /** Tag-ul release-ului, ex: "v0.1.6". Absent dacă fetch-ul nu s-a terminat sau a eșuat. */
  tag: string | null;
  /** URL-ul direct de descărcare al installer-ului Windows, dacă a fost găsit. */
  windowsUrl: string | null;
  /** URL-ul direct de descărcare al installer-ului macOS, dacă a fost găsit. */
  macUrl: string | null;
  loading: boolean;
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  draft: boolean;
  published_at: string | null;
  assets: GitHubAsset[];
}

/**
 * Cache la nivel de modul: o singură cerere HTTP pe toată sesiunea de
 * browser, indiferent de câte ori se montează pagina de Download (navigare
 * Home -> Download -> Pricing -> Download etc. în aceeași vizită).
 */
let cache: Promise<GitHubRelease | null> | null = null;

function fetchLatestPublishedRelease(): Promise<GitHubRelease | null> {
  if (!cache) {
    cache = fetch(API_URL, { headers: { Accept: 'application/vnd.github+json' } })
      .then((res) =>
        res.ok ? (res.json() as Promise<GitHubRelease[]>) : Promise.reject(new Error(`GitHub API ${res.status}`))
      )
      .then((releases) => {
        // API-ul public, neautentificat, nu întoarce niciodată draft-uri —
        // dar filtrăm oricum, ca să nu depindem tacit de acel comportament.
        // Nu excludem prerelease-urile: pipeline-ul curent marchează TOATE
        // build-urile astfel (tauri-action `prerelease: true`), iar cererea
        // userului e explicit "ultima versiune încărcată pe GitHub", nu
        // "ultima versiune stabilă".
        const published = releases.filter((r) => !r.draft && r.published_at);
        published.sort(
          (a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime()
        );
        return published[0] ?? null;
      })
      .catch((err) => {
        console.warn('Nu s-a putut obține ultimul release de pe GitHub:', err);
        cache = null; // permite o reîncercare la următorul mount, nu rămânem blocați pe eroare
        return null;
      });
  }
  return cache;
}

function findAsset(release: GitHubRelease | null, pattern: RegExp): string | null {
  return release?.assets.find((a) => pattern.test(a.name))?.browser_download_url ?? null;
}

/**
 * Citește ultimul release PUBLICAT de pe GitHub (nu draft) și întoarce
 * link-urile directe de descărcare pentru Windows și macOS.
 *
 * Elimină nevoia de a resincroniza manual versiunea site-ului cu versiunea
 * aplicației la fiecare release: link-urile devin corecte automat, fără
 * niciun redeploy al site-ului — se actualizează singure la următoarea
 * vizită după ce publici un release nou pe GitHub.
 *
 * Cererea se face direct din browser-ul vizitatorului (GitHub permite CORS
 * pe API-ul public), deci limita de 60 cereri/oră e per-vizitator, nu per-sit
 * — și fiecare vizitator face cel mult o cerere pe sesiune, datorită cache-ului
 * de mai sus.
 */
export function useLatestRelease(): LatestRelease {
  const [state, setState] = useState<LatestRelease>({
    tag: null,
    windowsUrl: null,
    macUrl: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    fetchLatestPublishedRelease().then((release) => {
      if (cancelled) return;
      setState({
        tag: release?.tag_name ?? null,
        windowsUrl: findAsset(release, /setup\.exe$/i),
        macUrl: findAsset(release, /\.dmg$/i),
        loading: false,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

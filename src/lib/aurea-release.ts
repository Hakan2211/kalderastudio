import { createServerFn } from "@tanstack/react-start";

/**
 * Resolves the Aurea downloads from GitHub Releases, so shipping a new build is
 * `gh release create` in the app repo and nothing at all in this one.
 *
 * The button used to point at `/releases/latest`, which 404s while the repo has
 * no published release — a dead link dressed as a download. Here we ask the API
 * for the actual assets, hand the browser URLs that start the file, and print
 * the real version and byte size beside each.
 *
 * Every platform below is discovered, never assumed: a platform is offered only
 * when the release actually carries a matching asset, and the page shows only
 * the ones that came back available. Today electron-builder is configured for
 * `nsis` alone, so macOS resolves to unavailable and simply does not appear —
 * an unbuilt platform advertised beside a working one reads as a broken page.
 * Publish a .dmg and the macOS button appears with no change to this file.
 */
const REPO = "Hakan2211/aurea";
const RELEASES_URL = `https://github.com/${REPO}/releases`;

export type PlatformId = "windows" | "mac";

export type PlatformBuild = {
  id: PlatformId;
  /** Button text: "Download for Windows". */
  label: string;
  /** Sits beside the version: "Windows · 64-bit". */
  spec: string;
  /** The asset URL when there is one, the releases page otherwise. */
  href: string;
  /** True only when `href` is a real installer that will start downloading. */
  available: boolean;
  /** Human-readable size, or the installer kind when we have no asset to measure. */
  size: string;
  /**
   * What this OS will do about an unsigned build, phrased as the way through
   * rather than the complaint — said on the button rather than discovered at
   * the security prompt. The "unsigned" part is stated once for all platforms
   * beside the row, so it is deliberately not repeated here.
   */
  caveat: string;
};

export type AureaBuild = {
  version: string;
  /** ISO date of the release, or null. */
  published: string | null;
  releasesUrl: string;
  platforms: Array<PlatformBuild>;
};

type GhAsset = { name: string; browser_download_url: string; size: number };
type GhRelease = {
  tag_name: string;
  published_at: string | null;
  assets: Array<GhAsset>;
};

/**
 * How each platform recognises its own installer. Adding Linux later is one
 * entry here and one clause in the detector.
 */
const PLATFORMS: Array<{
  id: PlatformId;
  label: string;
  spec: string;
  caveat: string;
  /** Ranked highest-first; the first rule that matches an asset wins. */
  match: Array<(name: string) => boolean>;
}> = [
  {
    id: "windows",
    label: "Windows",
    spec: "Windows · 64-bit",
    // "More info" is the non-obvious half: SmartScreen hides "Run anyway"
    // behind it, and without that hint the warning reads as a dead end.
    caveat: "SmartScreen: More info → Run anyway",
    match: [
      // The named x64 installer, then any non-arm64 .exe. Alphabetical order
      // would hand an ARM build to every desktop that asks, because `arm64`
      // sorts before `x64` — so architecture is ranked, not left to chance.
      (n) => /\.exe$/i.test(n) && /setup|install/i.test(n) && !/arm64/i.test(n),
      (n) => /\.exe$/i.test(n) && !/arm64/i.test(n),
      (n) => /\.exe$/i.test(n),
    ],
  },
  {
    id: "mac",
    label: "macOS",
    spec: "macOS · Apple Silicon",
    // Unsigned and un-notarised, Gatekeeper refuses a plain double-click and
    // says the app "is damaged" — which reads as a corrupt download rather than
    // a signing gap. Give the actual way in.
    caveat: "right-click → Open the first time",
    match: [
      // A universal binary serves both Macs, so it outranks either single-arch
      // build. Failing that prefer arm64: every Mac sold since 2020 is one, and
      // an Intel Mac can at least run it under Rosetta, while the reverse — an
      // x64 dmg on Apple Silicon — is the slower half of the trade.
      (n) => /\.dmg$/i.test(n) && /universal/i.test(n),
      (n) => /\.dmg$/i.test(n) && /arm64|aarch64|apple.?silicon/i.test(n),
      (n) => /\.dmg$/i.test(n),
      (n) => /\.zip$/i.test(n) && /mac|darwin|osx/i.test(n),
    ],
  },
];

/**
 * The macOS spec line has to follow the asset, not the config: shipping a
 * universal or Intel-only dmg while the page reads "Apple Silicon" would send
 * the wrong half of your audience away.
 */
function specForAsset(id: PlatformId, fallbackSpec: string, name: string): string {
  if (id !== "mac") return fallbackSpec;
  if (/universal/i.test(name)) return "macOS · Universal";
  if (/arm64|aarch64|apple.?silicon/i.test(name)) return "macOS · Apple Silicon";
  if (/x64|intel|amd64/i.test(name)) return "macOS · Intel";
  return fallbackSpec;
}

/**
 * A platform with no matching asset in the release. It still comes back in the
 * list — the page decides what to do with "not built", and right now it decides
 * to say nothing at all — but it carries no size, because there is no file to
 * measure and an invented one would be a lie in mono type.
 */
function emptyPlatform(p: (typeof PLATFORMS)[number]): PlatformBuild {
  return {
    id: p.id,
    label: p.label,
    spec: p.spec,
    href: RELEASES_URL,
    available: false,
    size: "",
    caveat: p.caveat,
  };
}

const FALLBACK: AureaBuild = {
  version: "0.0.1",
  published: null,
  releasesUrl: RELEASES_URL,
  platforms: PLATFORMS.map(emptyPlatform),
};

/**
 * The API allows 60 unauthenticated calls an hour *per IP*, and on a serverless
 * host every visitor shares one. A module-level cache rides the warm instance so
 * a traffic spike costs one call per ten minutes rather than one per render;
 * `GITHUB_TOKEN`, if set, lifts the ceiling to 5000 for the cold-start case.
 */
const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; build: AureaBuild } | null = null;

function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${Math.round(mb)} MB`;
}

/** `v0.4.2` and `0.4.2` both read as 0.4.2 on the page. */
function cleanVersion(tag: string): string {
  return tag.replace(/^v/i, "") || FALLBACK.version;
}

/**
 * A release also carries `latest.yml` and blockmaps for the auto-updater, so
 * matching is by ranked rule rather than "first file that looks close" — a
 * rename upstream degrades to "still finds the binary" rather than "offers a
 * blockmap".
 */
function resolvePlatform(
  p: (typeof PLATFORMS)[number],
  assets: Array<GhAsset>,
): PlatformBuild {
  for (const rule of p.match) {
    const hit = assets.find((a) => rule(a.name));
    if (hit) {
      return {
        id: p.id,
        label: p.label,
        spec: specForAsset(p.id, p.spec, hit.name),
        href: hit.browser_download_url,
        available: true,
        size: formatBytes(hit.size),
        caveat: p.caveat,
      };
    }
  }
  return emptyPlatform(p);
}

async function fetchLatest(): Promise<AureaBuild> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "kaldera-studio-site",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  // A slow GitHub must not hold up SSR of a page whose download is one line of
  // it; five seconds then fall back to the releases page.
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers,
    signal: AbortSignal.timeout(5000),
  });

  // 404 is the expected answer while no release is published, not an incident.
  if (!res.ok) return FALLBACK;

  const release = (await res.json()) as GhRelease;
  const assets = release.assets ?? [];

  return {
    version: cleanVersion(release.tag_name ?? ""),
    published: release.published_at ?? null,
    releasesUrl: RELEASES_URL,
    platforms: PLATFORMS.map((p) => resolvePlatform(p, assets)),
  };
}

export const getAureaBuild = createServerFn({ method: "GET" }).handler(
  async (): Promise<AureaBuild> => {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.build;

    try {
      const build = await fetchLatest();
      cache = { at: Date.now(), build };
      return build;
    } catch {
      // Network error, timeout, malformed JSON: the page still renders and the
      // buttons still land somewhere true. Cache the miss briefly so an outage
      // does not turn every render into a five-second wait.
      cache = { at: Date.now(), build: FALLBACK };
      return FALLBACK;
    }
  },
);

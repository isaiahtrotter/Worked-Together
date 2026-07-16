import "server-only";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Bounds worst-case regex cost on a huge page — meta tags always sit near
// the top of <head> anyway, so this never actually loses real tags.
const MAX_HTML_BYTES = 200_000;

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

// Meta tags vary in attribute order (content before property/name is
// common), so parse each tag's attributes as a bag rather than assuming a
// fixed order. Collects every tag up front (keyed by property/name, first
// occurrence wins) so callers can look values up by *preference* order —
// looping and returning on the first name-match found, like the original
// version of this function did, silently returns whichever tag happens to
// sit first in the document instead of the caller's preferred one (this is
// exactly how a Twitter/X profile page's earlier twitter:image — its cover
// banner — got returned ahead of the later, correct og:image — the actual
// avatar).
function collectMetaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  const metaTagRegex = /<meta\s+([^>]*)>/gi;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = metaTagRegex.exec(html))) {
    const attrs: Record<string, string> = {};
    const attrRegex = /([a-zA-Z0-9:_-]+)\s*=\s*["']([^"']*)["']/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(tagMatch[1]))) {
      attrs[attrMatch[1].toLowerCase()] = attrMatch[2];
    }
    const key = (attrs.property ?? attrs.name)?.toLowerCase();
    if (key && attrs.content && !tags.has(key)) {
      tags.set(key, decodeHtmlEntities(attrs.content));
    }
  }
  return tags;
}

function pickByPreference(tags: Map<string, string>, namesInPreferenceOrder: string[]): string | null {
  for (const name of namesInPreferenceOrder) {
    const value = tags.get(name);
    if (value) return value;
  }
  return null;
}

// X/Twitter's og:title/twitter:title on profile pages is the display name
// plus a platform suffix, e.g. "Elon Musk (@elonmusk) on X" — strip that
// suffix so the detected name is just the name.
const TWITTER_TITLE_SUFFIX_REGEX = /\s*\(@[A-Za-z0-9_]+\)\s*(?:on\s+X|\/\s*(?:X|Twitter))\s*$/i;

function cleanDetectedName(name: string | null): string | null {
  if (!name) return name;
  return name.replace(TWITTER_TITLE_SUFFIX_REGEX, "").trim() || null;
}

// Some sites' og:image is the person's actual profile photo (GitHub,
// X/Twitter); on others it's whatever they last posted (Dribbble's og:image
// is their latest shot, not a headshot). A URL explicitly labeled "avatar"
// is a much stronger signal for "this is literally the person's photo," so
// prefer one when the page has it.
// Must end in a real image extension — an earlier version matched anything
// with "avatar" in the URL and picked up a JS asset bundle (e.g.
// "avatar-B9hX8058.js") on one site and a bare preconnect hostname with no
// path at all on another.
const AVATAR_URL_REGEX =
  /https:\/\/[^\s"'<>\\]*avatars?[^\s"'<>\\]*\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s"'<>\\]*)?/i;

function findAvatarUrl(html: string): string | null {
  return html.match(AVATAR_URL_REGEX)?.[0] ?? null;
}

export type DetectedProfile = { name: string | null; imageUrl: string | null };

// Best-effort — pulls a name/photo from a portfolio/social link via its
// Open Graph / Twitter Card meta tags (plus a scan for an explicitly
// avatar-labeled image URL, see findAvatarUrl above). Works generically
// across most sites without needing per-platform API keys, but isn't
// guaranteed: some sites block non-browser fetches or render client-side
// with no usable tags in the raw HTML. Never throws — callers treat a null
// result as "detection didn't work," not an error.
export async function detectProfileFromLink(url: string): Promise<DetectedProfile> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_USER_AGENT, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { name: null, imageUrl: null };

    const fullText = await res.text();
    const html = fullText.slice(0, MAX_HTML_BYTES);

    const tags = collectMetaTags(html);
    const name = cleanDetectedName(pickByPreference(tags, ["og:title", "twitter:title"]));
    const imageUrl =
      findAvatarUrl(html) ?? pickByPreference(tags, ["og:image", "twitter:image"]);
    return { name, imageUrl };
  } catch {
    return { name: null, imageUrl: null };
  }
}

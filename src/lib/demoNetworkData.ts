// Fake profile + connections in the exact shape fetchWidgetData resolves to
// -- fed straight into the real widget engine via NetworkWidget's demoData
// prop. The signed-out marketing page has no live embed_key or Supabase row
// to fetch, so this stands in for it.

// Work-sample wireframes -- the user's own 4 SVGs (Desktop/1.svg,
// "2 (gif).svg", 3.svg, 4.svg), embedded verbatim below rather than
// hand-designed, reused across connections (via index mod 4 in workSample
// below). Each uses the same 3 fixed grayscale tones (#BCBCBC/#686868/
// #393939); `recolor` swaps those for 3 tints of a connection's own accent
// color at render time (see ACCENT below), so a person's work samples read
// as a monochromatic study in "their" color rather than flat grayscale.
function toDataUri(svg: string): string {
  // base64, not encodeURIComponent -- a prior version of this file's SVGs
  // used single-quoted XML attributes, and encodeURIComponent doesn't
  // escape ' (it's in JS's "unreserved" set), so the resulting data URI
  // kept its literal quote characters. Every place this URL ends up (an
  // HTML style attribute, a CSS url() token) uses a quote character as its
  // own delimiter, so the URL was getting truncated at the first literal
  // quote inside it -- rendering nothing, though the element itself still
  // took up layout space. base64's alphabet (A-Za-z0-9+/=) contains no
  // quote characters at all, so this stays safe regardless of source
  // quoting or consuming context.
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function mixHex(hexA: string, hexB: string, w: number): string {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) * w + ((b >> 16) & 255) * (1 - w));
  const g = Math.round(((a >> 8) & 255) * w + ((b >> 8) & 255) * (1 - w));
  const bl = Math.round((a & 255) * w + (b & 255) * (1 - w));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}

function recolor(svg: string, accent: string): string {
  return svg
    .replaceAll("#BCBCBC", mixHex(accent, "#FFFFFF", 0.3))
    .replaceAll("#686868", mixHex(accent, "#FFFFFF", 0.65))
    .replaceAll("#393939", mixHex(accent, "#FFFFFF", 1));
}

// Each connection's accent -- kept in sync with public/network-widget/
// widget.js's PALETTE array, indexed the same way personColor(id) does
// (index 0 is "you"; connections follow in DEMO_WIDGET_DATA.connections
// order), so a person's work-sample color always matches their graph node
// and side-panel accent.
const ACCENT = {
  maya: "#D94F2B",
  sam: "#AC57D6",
  priya: "#128A66",
  leo: "#C2477F",
  ava: "#93A8F2",
  ivy: "#B7C42E",
};

// Fixed filename order (1, 2, 3, 4) -- every connection's Nth work sample
// uses SAMPLE_SVGS[N-1], always, never a random pick. SAMPLE_SVGS[1] (index
// 1, "2 (gif).svg") carries its own baked-in <animate> pulse regardless of
// who uses it; only Ivy's instance is additionally tagged asGif so the
// widget shows a "GIF" badge on hers specifically (see connections below).
const SAMPLE_SVGS = [
  // Desktop/1.svg
  `<svg width="387" height="261" viewBox="0 0 387 261" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_327_2)"><rect width="387" height="261" fill="#BCBCBC"/><circle cx="274" cy="88" r="113" fill="#393939"/><rect x="-9" y="158" width="457" height="157" fill="#686868"/></g><defs><clipPath id="clip0_327_2"><rect width="387" height="261" fill="white"/></clipPath></defs></svg>`,
  // Desktop/2 (gif).svg -- subtle opacity pulse on the circle via native SVG
  // <animate>, a small, real (if tiny) moving image, not just a static
  // frame wearing a ".gif" label.
  `<svg width="387" height="261" viewBox="0 0 387 261" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="387" height="261" fill="#393939"/><rect x="20" y="24" width="74" height="74" fill="#686868"/><circle cx="194" cy="143" r="82" fill="#BCBCBC"><animate attributeName="opacity" values="1;0.55;1" dur="2.4s" repeatCount="indefinite"/></circle></svg>`,
  // Desktop/3.svg
  `<svg width="387" height="261" viewBox="0 0 387 261" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="387" height="261" fill="#393939"/><rect x="61" y="45" width="119" height="136" fill="#BCBCBC"/><rect x="204" y="80" width="119" height="136" fill="#BCBCBC"/></svg>`,
  // Desktop/4.svg
  `<svg width="387" height="261" viewBox="0 0 387 261" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="387" height="261" fill="#686868"/><rect y="48" width="123" height="166" fill="#BCBCBC"/><rect x="132" y="48" width="123" height="166" fill="#BCBCBC"/><rect x="264" y="48" width="123" height="166" fill="#BCBCBC"/></svg>`,
];

function workSample(
  id: string,
  index: number,
  accent: string,
  asGif = false,
): { id: string; url: string; sort_order: number } {
  const svg = recolor(SAMPLE_SVGS[index % SAMPLE_SVGS.length], accent);
  const url = toDataUri(svg) + (asGif ? "#a.gif" : "");
  return { id, url, sort_order: index };
}

export const DEMO_WIDGET_DATA = {
  profile: {
    name: "Jordan Lee",
    bio: "Product designer specializing in fintech and B2B dashboards.",
    website: "jordanlee.design",
    avatar_url: null,
    widget_settings: { theme: "light", corner: "bottom-left", label: "View My Network" },
    workSamples: [],
    endorsements: [
      {
        id: "e1",
        fromId: "maya",
        fromName: "Maya Chen",
        fromAvatarUrl: null,
        text: "Jordan's eye for detail elevated every screen we shipped together.",
      },
      {
        id: "e2",
        fromId: "sam",
        fromName: "Sam Okafor",
        fromAvatarUrl: null,
        text: "One of the few designers who can also talk through the engineering tradeoffs.",
      },
      {
        id: "e3",
        fromId: "ivy",
        fromName: "Ivy Novak",
        fromAvatarUrl: null,
        text: "Jordan and I never had to over-explain a handoff. Just fast, clear collaboration.",
      },
    ],
  },
  connections: [
    {
      id: "maya",
      name: "Maya Chen",
      bio: "Senior Product Designer at Notion.",
      website: "mayachen.design",
      avatar_url: null,
      relationship: "Maya and I designed the onboarding flow together at Notion.",
      endorsesOwner: true,
      endorsements: [
        {
          id: "e4",
          fromId: "you",
          fromName: "Jordan Lee",
          fromAvatarUrl: null,
          text: "Maya elevated every project we worked on together — impeccable taste.",
        },
      ],
      workSamples: [workSample("w1", 0, ACCENT.maya), workSample("w2", 1, ACCENT.maya)],
    },
    {
      id: "sam",
      name: "Sam Okafor",
      bio: "Frontend Engineer at Vercel.",
      website: "samokafor.dev",
      avatar_url: null,
      relationship: "I worked with Sam on the component library at Vercel.",
      endorsesOwner: true,
      endorsements: [],
      workSamples: [workSample("w4", 0, ACCENT.sam), workSample("w5", 1, ACCENT.sam)],
    },
    {
      id: "priya",
      name: "Priya Nair",
      bio: "Art Director, freelance.",
      website: "priyanair.co",
      avatar_url: null,
      relationship: "Priya and I collaborated on brand identity for two startups.",
      endorsesOwner: false,
      endorsements: [],
      workSamples: [
        workSample("w6", 0, ACCENT.priya),
        workSample("w7", 1, ACCENT.priya),
        workSample("w8", 2, ACCENT.priya),
        workSample("w9", 3, ACCENT.priya),
      ],
    },
    {
      id: "leo",
      name: "Leo Fischer",
      bio: "UX Researcher at Linear.",
      website: "leofischer.com",
      avatar_url: null,
      relationship: "I worked with Leo on usability studies at Linear.",
      endorsesOwner: true,
      endorsements: [],
      workSamples: [workSample("w10", 0, ACCENT.leo), workSample("w14", 1, ACCENT.leo)],
    },
    {
      id: "ava",
      name: "Ava Torres",
      bio: "Illustrator & visual designer.",
      website: "avatorres.art",
      avatar_url: null,
      relationship: "Ava and I partnered on editorial illustration for a launch campaign.",
      endorsesOwner: false,
      endorsements: [],
      workSamples: [
        workSample("w11", 0, ACCENT.ava),
        workSample("w12", 1, ACCENT.ava),
        workSample("w13", 2, ACCENT.ava),
      ],
    },
    {
      id: "ivy",
      name: "Ivy Novak",
      bio: "Motion Designer, freelance.",
      website: "ivynovak.studio",
      avatar_url: null,
      relationship: "Ivy and I built the motion system for our marketing site together.",
      endorsesOwner: true,
      endorsements: [],
      workSamples: [
        workSample("w16", 0, ACCENT.ivy),
        workSample("w17", 1, ACCENT.ivy, true),
        workSample("w18", 2, ACCENT.ivy),
        workSample("w19", 3, ACCENT.ivy),
      ],
    },
  ],
};

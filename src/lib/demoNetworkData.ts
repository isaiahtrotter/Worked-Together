// Fake profile + connections in the exact shape fetchWidgetData resolves to
// -- fed straight into the real widget engine via NetworkWidget's demoData
// prop. The signed-out marketing page has no live embed_key or Supabase row
// to fetch, so this stands in for it.

// Simple wireframe "cards" for work samples -- a few flat shapes (never
// more than 4) rendered in a single accent color at varying opacity, on a
// shared neutral canvas. Monochromatic per connection: the accent passed in
// matches that connection's own PALETTE color from
// public/network-widget/widget.js's personColor(id) (see ACCENT below), so
// each person's work samples read as "their" color rather than an unrelated
// per-sample-type palette. Flat SVGs (data URIs, so no network dependency).
// One composition (SAMPLE_SHAPES[3], the messaging one) genuinely animates
// via native SVG <animate> -- a small pulsing "typing…" indicator -- so
// it's a real (if tiny) moving image, not just a static frame wearing a
// ".gif" label.
function placeholder(shapes: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='360'><rect width='480' height='360' fill='#F6F1E9'/>${shapes}</svg>`;
  // base64, not encodeURIComponent -- these SVGs use single-quoted XML
  // attributes throughout, and encodeURIComponent doesn't escape ' (it's in
  // JS's "unreserved" set), so the resulting data URI kept its literal
  // quote characters. Every place this URL ends up (an HTML style
  // attribute, a CSS url() token) uses a quote character as its own
  // delimiter, so the URL was getting truncated at the first literal quote
  // inside it -- rendering nothing, though the element itself still took
  // up layout space (hence "I can scroll, but nothing shows up").
  // base64's alphabet (A-Za-z0-9+/=) contains no quote characters at all,
  // so this is safe in any of those contexts regardless of source quoting.
  return `data:image/svg+xml;base64,${btoa(svg)}`;
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

// Only 4 compositions total -- reused freely across connections (via index
// mod 4 in workSample below) rather than needing a unique design per work
// sample. Each is 2-4 shapes, colored at call time via `accent`.
const SAMPLE_SHAPES: Array<(accent: string) => string> = [
  // 0: two overlapping circles + a solid bar
  (accent) =>
    `<circle cx='150' cy='130' r='65' fill='${accent}' opacity='0.25'/>` +
    `<circle cx='245' cy='175' r='90' fill='${accent}' opacity='0.55'/>` +
    `<rect x='40' y='300' width='400' height='34' rx='17' fill='${accent}'/>`,
  // 1: three ascending bars
  (accent) =>
    `<rect x='140' y='220' width='50' height='100' rx='8' fill='${accent}' opacity='0.4'/>` +
    `<rect x='215' y='170' width='50' height='150' rx='8' fill='${accent}' opacity='0.7'/>` +
    `<rect x='290' y='110' width='50' height='210' rx='8' fill='${accent}'/>`,
  // 2: 2x2 grid
  (accent) =>
    `<rect x='140' y='90' width='90' height='90' rx='14' fill='${accent}' opacity='0.3'/>` +
    `<rect x='250' y='90' width='90' height='90' rx='14' fill='${accent}' opacity='0.55'/>` +
    `<rect x='140' y='200' width='90' height='90' rx='14' fill='${accent}' opacity='0.55'/>` +
    `<rect x='250' y='200' width='90' height='90' rx='14' fill='${accent}'/>`,
  // 3: messaging bubbles -- the one with real animation (pulsing "typing…"
  // dots via SVG <animate>), tagged with the #a.gif fragment wherever it's
  // used below so the widget shows its "GIF" badge. Reserved for Ivy only
  // (see connections below) so the animation is never shown without that
  // label elsewhere.
  (accent) =>
    `<rect x='60' y='70' width='230' height='46' rx='20' fill='${accent}' opacity='0.3'/>` +
    `<rect x='190' y='150' width='230' height='46' rx='20' fill='${accent}' opacity='0.8'/>` +
    `<circle cx='80' cy='240' r='7' fill='${accent}'><animate attributeName='opacity' values='0.3;1;0.3' dur='1.2s' begin='0s' repeatCount='indefinite'/></circle>` +
    `<circle cx='102' cy='240' r='7' fill='${accent}'><animate attributeName='opacity' values='0.3;1;0.3' dur='1.2s' begin='0.2s' repeatCount='indefinite'/></circle>` +
    `<circle cx='124' cy='240' r='7' fill='${accent}'><animate attributeName='opacity' values='0.3;1;0.3' dur='1.2s' begin='0.4s' repeatCount='indefinite'/></circle>`,
];

function workSample(
  id: string,
  index: number,
  accent: string,
  asGif = false,
): { id: string; url: string; sort_order: number } {
  const url = placeholder(SAMPLE_SHAPES[index % SAMPLE_SHAPES.length](accent)) + (asGif ? "#a.gif" : "");
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
      workSamples: [workSample("w4", 2, ACCENT.sam)],
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
        workSample("w9", 0, ACCENT.priya),
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
      workSamples: [workSample("w10", 1, ACCENT.leo)],
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
        workSample("w11", 2, ACCENT.ava),
        workSample("w12", 0, ACCENT.ava),
        workSample("w13", 1, ACCENT.ava),
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
        workSample("w16", 3, ACCENT.ivy, true),
        workSample("w17", 0, ACCENT.ivy),
        workSample("w18", 1, ACCENT.ivy),
        workSample("w19", 2, ACCENT.ivy),
      ],
    },
  ],
};

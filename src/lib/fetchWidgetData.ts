const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function fetchJSON(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json();
}

function fetchWorkSamples(profileId: string) {
  return fetchJSON(
    `work_samples?profile_id=eq.${profileId}&select=*&order=sort_order`,
  );
}

type EndorsementRow = { id: string; from_profile_id: string; to_profile_id: string; text: string };
type EndorserInfo = { name: string; avatar_url: string | null };
export type WidgetEndorsement = {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatarUrl: string | null;
  text: string;
};

// An endorsement is written from someone's own dashboard about any of their
// connections (see saveEndorsement), so "who endorsed X" can include people
// who aren't connections of the widget's own owner (e.g. a mutual connection
// of a connection). Fetched globally by to_profile_id rather than scoped to
// the owner's own connection list, then joined with whatever endorser
// identities aren't already known from this widget's own data.
async function fetchEndorsementsByTarget(
  nodeIds: string[],
  knownProfiles: Map<string, EndorserInfo>,
): Promise<Map<string, WidgetEndorsement[]>> {
  const byTarget = new Map<string, WidgetEndorsement[]>();
  if (!nodeIds.length) return byTarget;

  const rows: EndorsementRow[] = await fetchJSON(
    `endorsements?to_profile_id=in.(${nodeIds.join(",")})&select=*`,
  );
  if (!rows.length) return byTarget;

  const missingIds = Array.from(new Set(rows.map((r) => r.from_profile_id))).filter(
    (id) => !knownProfiles.has(id),
  );
  if (missingIds.length) {
    const extra: { id: string; name: string; avatar_url: string | null }[] = await fetchJSON(
      `profiles?id=in.(${missingIds.join(",")})&select=id,name,avatar_url`,
    );
    extra.forEach((p) => knownProfiles.set(p.id, { name: p.name, avatar_url: p.avatar_url }));
  }

  rows.forEach((row) => {
    const info = knownProfiles.get(row.from_profile_id);
    const list = byTarget.get(row.to_profile_id) ?? [];
    list.push({
      id: row.id,
      fromId: row.from_profile_id,
      fromName: info?.name ?? "Someone",
      fromAvatarUrl: info?.avatar_url ?? null,
      text: row.text,
    });
    byTarget.set(row.to_profile_id, list);
  });
  return byTarget;
}

async function buildConnections(profile: { id: string; name: string; avatar_url: string | null }) {
  const reqFilter =
    `connection_requests?status=eq.accepted&or=(requester_id.eq.${profile.id},recipient_id.eq.${profile.id})&select=*`;
  const requests = await fetchJSON(reqFilter);
  if (!requests.length) {
    return { connections: [], endorsementsByTarget: new Map<string, WidgetEndorsement[]>() };
  }

  const otherIds = requests.map((r: { requester_id: string; recipient_id: string }) =>
    r.requester_id === profile.id ? r.recipient_id : r.requester_id,
  );
  const idList = otherIds.join(",");
  const requestIds = requests.map((r: { id: string }) => r.id).join(",");

  const [otherProfiles, myNotes, allWorkSamples] = await Promise.all([
    fetchJSON(`profiles?id=in.(${idList})&select=*`),
    fetchJSON(
      `connection_notes?connection_request_id=in.(${requestIds})&profile_id=eq.${profile.id}&select=*`,
    ),
    fetchJSON(`work_samples?profile_id=in.(${idList})&select=*&order=sort_order`),
  ]);

  const knownProfiles = new Map<string, EndorserInfo>();
  knownProfiles.set(profile.id, { name: profile.name, avatar_url: profile.avatar_url });
  (otherProfiles as { id: string; name: string; avatar_url: string | null }[]).forEach((p) => {
    knownProfiles.set(p.id, { name: p.name, avatar_url: p.avatar_url });
  });

  const endorsementsByTarget = await fetchEndorsementsByTarget(
    [profile.id, ...otherIds],
    knownProfiles,
  );

  const connections = otherProfiles.map((other: { id: string; name: string; bio: string; website: string; avatar_url: string }) => {
    const req = requests.find(
      (r: { requester_id: string; recipient_id: string }) =>
        r.requester_id === other.id || r.recipient_id === other.id,
    );
    const myNote = req
      ? myNotes.find(
          (n: { connection_request_id: string }) =>
            n.connection_request_id === req.id,
        )
      : null;
    const samples = allWorkSamples.filter(
      (w: { profile_id: string }) => w.profile_id === other.id,
    );
    // Narrower than "endorsements" above -- specifically "did this
    // connection endorse the owner," which is what the star badge on the
    // graph and the hover card mean. An owner-authored endorsement of this
    // connection (the reverse direction) doesn't count here.
    const endorsesOwner = (endorsementsByTarget.get(profile.id) ?? []).some(
      (e) => e.fromId === other.id,
    );
    return {
      id: other.id,
      name: other.name,
      role: "connection",
      bio: other.bio,
      website: other.website,
      avatar_url: other.avatar_url,
      relationship: myNote ? myNote.note : "",
      endorsements: endorsementsByTarget.get(other.id) ?? [],
      endorsesOwner,
      workSamples: samples,
    };
  });

  return { connections, endorsementsByTarget };
}

export async function fetchWidgetData(embedKey: string) {
  const profiles = await fetchJSON(
    `profiles?embed_key=eq.${encodeURIComponent(embedKey)}&select=*`,
  );
  if (!profiles.length) {
    throw new Error("No profile found with that embed_key.");
  }
  const profile = profiles[0];

  const [{ connections, endorsementsByTarget }, workSamples] = await Promise.all([
    buildConnections(profile),
    fetchWorkSamples(profile.id),
  ]);

  profile.workSamples = workSamples;
  profile.endorsements = endorsementsByTarget.get(profile.id) ?? [];
  return { profile, connections };
}

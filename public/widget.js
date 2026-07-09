(function () {
  var thisScript = document.currentScript;
  var embedKey = thisScript.getAttribute("data-embed-key");
  var mode = thisScript.getAttribute("data-mode") === "inline" ? "inline" : "floating";
  var origin = new URL(thisScript.src, window.location.href).origin;

  if (!embedKey) {
    console.error("[worked-together widget] missing data-embed-key attribute");
    return;
  }

  var SUPABASE_URL = "https://qgjoasujljbkdcuyxomh.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnam9hc3VqbGpia2RjdXl4b21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzODM1OTcsImV4cCI6MjA5ODk1OTU5N30.5W62x1cyXVVemxtFzBNXqiXC3Gp74jN8PBHzCPHeBPg";

  function fetchJSON(path) {
    return fetch(SUPABASE_URL + "/rest/v1/" + path, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
    }).then(function (res) {
      if (!res.ok) throw new Error("Request failed: " + path);
      return res.json();
    });
  }

  function fetchWorkSamples(profileId) {
    return fetchJSON(
      "work_samples?profile_id=eq." + profileId + "&select=*&order=sort_order",
    );
  }

  function buildConnections(profile) {
    var reqFilter =
      "connection_requests?status=eq.accepted&or=(requester_id.eq." +
      profile.id +
      ",recipient_id.eq." +
      profile.id +
      ")&select=*";
    return fetchJSON(reqFilter).then(function (requests) {
      if (!requests.length) return [];
      var otherIds = requests.map(function (r) {
        return r.requester_id === profile.id ? r.recipient_id : r.requester_id;
      });
      var idList = otherIds.join(",");
      var requestIds = requests.map(function (r) { return r.id; }).join(",");

      return Promise.all([
        fetchJSON("profiles?id=in.(" + idList + ")&select=*"),
        fetchJSON(
          "endorsements?to_profile_id=eq." + profile.id + "&from_profile_id=in.(" + idList + ")&select=*",
        ),
        fetchJSON(
          "connection_notes?connection_request_id=in.(" + requestIds + ")&profile_id=eq." + profile.id + "&select=*",
        ),
        fetchJSON("work_samples?profile_id=in.(" + idList + ")&select=*&order=sort_order"),
      ]).then(function (results) {
        var otherProfiles = results[0];
        var endorsements = results[1];
        var myNotes = results[2];
        var allWorkSamples = results[3];
        return otherProfiles.map(function (other) {
          var req = requests.find(function (r) {
            return r.requester_id === other.id || r.recipient_id === other.id;
          });
          var end = endorsements.find(function (e) { return e.from_profile_id === other.id; });
          var myNote = req ? myNotes.find(function (n) { return n.connection_request_id === req.id; }) : null;
          var samples = allWorkSamples.filter(function (w) { return w.profile_id === other.id; });
          return {
            id: other.id,
            name: other.name,
            role: "connection",
            bio: other.bio,
            website: other.website,
            avatar_url: other.avatar_url,
            relationship: myNote ? myNote.note : "",
            endorsement: end ? end.text : "",
            workSamples: samples,
          };
        });
      });
    });
  }

  function fetchWidgetData(key) {
    return fetchJSON("profiles?embed_key=eq." + encodeURIComponent(key) + "&select=*").then(
      function (profiles) {
        if (!profiles.length) throw new Error("No profile found with that embed_key.");
        var profile = profiles[0];
        return Promise.all([buildConnections(profile), fetchWorkSamples(profile.id)]).then(
          function (results) {
            profile.workSamples = results[1];
            return { profile: profile, connections: results[0] };
          },
        );
      },
    );
  }

  function injectHead() {
    var preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";
    var preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "anonymous";
    var font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap";
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = origin + "/network-widget/widget.css";
    document.head.appendChild(preconnect1);
    document.head.appendChild(preconnect2);
    document.head.appendChild(font);
    document.head.appendChild(css);
  }

  function injectMarkup() {
    var container = document.createElement("div");
    container.innerHTML = WIDGET_MARKUP;
    var widgetEl = container.firstElementChild;
    if (mode === "inline") {
      // Fills whatever element contains the <script> tag, so the host page
      // controls the size by sizing that container.
      thisScript.parentNode.insertBefore(widgetEl, thisScript);
    } else {
      document.body.appendChild(widgetEl);
    }
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error("Failed to load " + src));
      };
      document.body.appendChild(script);
    });
  }

  var WIDGET_MARKUP =
    '<div id="widget-root" class="corner-bottom-right"><div class="launcher" id="launcher-btn" role="button" aria-label="View My Network"><svg width="22" height="22" viewBox="0 0 64 64" style="flex-shrink:0;"><line x1="32" y1="32" x2="14" y2="18" stroke="rgba(0,0,0,0.25)" stroke-width="2.5"/><line x1="32" y1="32" x2="50" y2="16" stroke="rgba(0,0,0,0.25)" stroke-width="2.5"/><line x1="32" y1="32" x2="16" y2="46" stroke="rgba(0,0,0,0.25)" stroke-width="2.5"/><line x1="32" y1="32" x2="48" y2="48" stroke="rgba(0,0,0,0.25)" stroke-width="2.5"/><circle class="launcher-dot" cx="14" cy="18" r="6" fill="#D94F2B"/><circle class="launcher-dot" cx="50" cy="16" r="6" fill="#AC57D6"/><circle class="launcher-dot" cx="16" cy="46" r="6" fill="#128A66"/><circle class="launcher-dot" cx="48" cy="48" r="6" fill="#C2477F"/><circle cx="32" cy="32" r="9" fill="#1D69E0"/></svg><span class="launcher-label">View My Network</span></div><div class="panel-expanded"><div id="ring-app" style="position:relative;width:100%;height:100%;overflow:hidden;"><div id="dot-highlight-layer" style="position:absolute;inset:0;pointer-events:none;z-index:0;"></div><div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div><button id="resize-handle" aria-label="Resize" style="position:absolute;top:14px;left:14px;width:30px;height:30px;padding:0;border-radius:99px;border:none;display:flex;align-items:center;justify-content:center;cursor:nwse-resize;z-index:3;touch-action:none;"><span id="resize-icon"></span></button><div style="position:absolute;top:12px;right:12px;display:flex;align-items:center;gap:6px;z-index:2;"><button id="theme-toggle-btn" class="proto-btn wm-label" style="padding:8px 12px;border-radius:99px;border:none;display:flex;align-items:center;gap:6px;cursor:pointer;"><span id="theme-icon"></span><span id="theme-label">Light</span></button><button id="widget-close-btn" class="proto-btn" type="button" aria-label="Close" style="width:30px;height:30px;padding:0;border-radius:99px;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;"><span id="widget-close-icon"></span></button></div><svg id="graph-svg" width="100%" height="100%" style="display:block;position:relative;z-index:1;"></svg><div id="canvas-links"><a href="#" id="add-owner-btn" class="page-link proto-btn" style="padding:8px 12px;border-radius:99px;border-bottom:none;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg><span id="add-owner-label">Add me</span></a><a href="#" id="share-network-btn" class="page-link proto-btn" style="padding:8px 12px;border-radius:99px;border-bottom:none;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.3"/><circle cx="18" cy="6" r="2.3"/><circle cx="12" cy="18" r="2.3"/><line x1="7.7" y1="7.3" x2="10.5" y2="16.2"/><line x1="16.3" y1="7.3" x2="13.5" y2="16.2"/><line x1="8.3" y1="6" x2="15.7" y2="6"/></svg><span>Create your network</span></a></div><div id="hover-card" style="position:absolute;display:none;pointer-events:none;z-index:2;width:188px;border-radius:10px;padding:12px 14px;box-sizing:border-box;"></div><div id="panel-backdrop"></div><div id="side-panel" style="position:absolute;top:0;right:0;width:300px;max-width:82%;height:100%;transform:translateX(100%);transition:transform .3s ease;box-sizing:border-box;overflow-y:auto;overflow-x:hidden;z-index:2;"><div id="panel-content"></div></div></div></div></div>';

  function boot() {
    injectHead();
    injectMarkup();

    Promise.all([
      fetchWidgetData(embedKey),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"),
      loadScript(origin + "/network-widget/widget.js"),
    ])
      .then(function (results) {
        window.__initNetworkWidget(results[0], { mode: mode });
      })
      .catch(function (err) {
        console.error("[worked-together widget] failed to load:", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

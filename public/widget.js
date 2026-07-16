(function () {
  var thisScript = document.currentScript;
  var embedKey = thisScript.getAttribute("data-embed-key");
  var mode = thisScript.getAttribute("data-mode") === "inline" ? "inline" : "floating";
  var corner = thisScript.getAttribute("data-corner") || "bottom-right";
  var label = thisScript.getAttribute("data-label") || null;
  var showIcon = thisScript.getAttribute("data-icon") !== "false";
  var iconEmoji = thisScript.getAttribute("data-icon-emoji") || null;
  var hideLauncher = thisScript.getAttribute("data-hide-launcher") === "true";
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
    var buttonFont = document.createElement("link");
    buttonFont.rel = "stylesheet";
    buttonFont.href = "https://fonts.googleapis.com/css2?family=Geist:wght@600&display=swap";
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = origin + "/network-widget/widget.css";
    document.head.appendChild(preconnect1);
    document.head.appendChild(preconnect2);
    document.head.appendChild(font);
    document.head.appendChild(buttonFont);
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
    '<div id="widget-root" class="corner-bottom-right"><div class="launcher" id="launcher-btn" role="button" aria-label="View My Network"><svg width="25" height="14" viewBox="0 0 25 14" fill="none" style="flex-shrink:0;" xmlns="http://www.w3.org/2000/svg"><path d="M1.83142 1.18462C2.46521 -0.0329248 4.88956 -0.366307 7.24548 0.439507C8.45198 0.852243 9.4059 1.4845 9.96521 2.16607C9.95051 1.92031 9.99862 1.68096 10.1156 1.45611C10.7492 0.238515 13.1728 -0.0956274 15.5287 0.710015C17.8846 1.51581 19.2812 3.15643 18.6478 4.37408C18.6324 4.40374 18.6146 4.43238 18.597 4.46099C19.4985 4.39843 20.5433 4.53304 21.5746 4.8858C23.9303 5.69171 25.3264 7.33227 24.6927 8.54986C24.2005 9.49537 22.6291 9.90445 20.848 9.66412C22.4649 10.5378 23.3085 11.818 22.7894 12.8155C22.1555 14.0329 19.7321 14.3663 17.3763 13.5606C16.4454 13.2422 15.6662 12.7915 15.101 12.2901C15.088 12.4709 15.0409 12.6475 14.9535 12.8155C14.3197 14.0329 11.8962 14.3662 9.54041 13.5606C7.18438 12.7548 5.78761 11.1142 6.42126 9.89654C6.4592 9.82367 6.50372 9.75404 6.55408 9.68755C5.58769 9.80774 4.42129 9.68846 3.27087 9.29498C0.915004 8.4891 -0.480927 6.84855 0.15271 5.63091C0.662638 4.65175 2.32993 4.2457 4.18884 4.54302C2.3048 3.67511 1.26956 2.26433 1.83142 1.18462ZM16.2084 5.54498C15.3078 5.60701 14.2648 5.47243 13.2347 5.12017C12.0271 4.70713 11.0723 4.0739 10.5131 3.39166C10.5281 3.63803 10.4809 3.87819 10.3636 4.10357C9.85362 5.08314 8.1853 5.48839 6.32556 5.19048C8.21077 6.05833 9.24601 7.4698 8.68396 8.54986C8.64633 8.62212 8.60198 8.69091 8.55212 8.75689C9.51833 8.63685 10.6843 8.75808 11.8344 9.15142C12.7647 9.46962 13.5436 9.91992 14.1088 10.421C14.1218 10.2404 14.1699 10.0643 14.2572 9.89654C14.7493 8.95099 16.3209 8.5411 18.1019 8.7813C16.4855 7.90762 15.6415 6.62822 16.1605 5.63091C16.1756 5.60188 16.1913 5.573 16.2084 5.54498Z" fill="black"/></svg><span id="launcher-icon-emoji" style="display:none;font-size:16px;line-height:1;"></span><span class="launcher-label">View My Network</span></div><div class="panel-expanded"><div id="ring-app" style="position:relative;width:100%;height:100%;overflow:hidden;"><div id="dot-highlight-layer" style="position:absolute;inset:0;pointer-events:none;z-index:0;"></div><div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div><button id="resize-toggle-btn" aria-label="Show resize handle" style="display:none;position:absolute;top:14px;left:14px;width:30px;height:30px;padding:0;border-radius:99px;border:none;align-items:center;justify-content:center;cursor:pointer;z-index:3;"><span id="resize-toggle-icon"></span></button><button id="resize-handle" aria-label="Resize" style="position:absolute;top:14px;left:14px;width:30px;height:30px;padding:0;border-radius:99px;border:none;display:flex;align-items:center;justify-content:center;cursor:nwse-resize;z-index:3;touch-action:none;"><span id="resize-icon"></span></button><div style="position:absolute;top:12px;right:12px;display:flex;align-items:center;gap:6px;z-index:2;"><button id="theme-toggle-btn" class="proto-btn wm-label" style="padding:8px 12px;border-radius:99px;border:none;display:flex;align-items:center;gap:6px;cursor:pointer;"><span id="theme-icon"></span><span id="theme-label">Light</span></button><button id="widget-close-btn" class="proto-btn" type="button" aria-label="Close" style="width:30px;height:30px;padding:0;border-radius:99px;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;"><span id="widget-close-icon"></span></button></div><svg id="graph-svg" width="100%" height="100%" style="display:block;position:relative;z-index:1;"></svg><div id="canvas-links"><a href="#" id="add-owner-btn" class="page-link proto-btn" style="padding:8px 12px;border-radius:99px;border-bottom:none;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg><span id="add-owner-label">Add me</span></a><a href="#" id="share-network-btn" class="page-link proto-btn" style="padding:8px 12px;border-radius:99px;border-bottom:none;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.3"/><circle cx="18" cy="6" r="2.3"/><circle cx="12" cy="18" r="2.3"/><line x1="7.7" y1="7.3" x2="10.5" y2="16.2"/><line x1="16.3" y1="7.3" x2="13.5" y2="16.2"/><line x1="8.3" y1="6" x2="15.7" y2="6"/></svg><span>Made with Linkenode</span></a></div><div id="hover-card" style="position:absolute;display:none;pointer-events:none;z-index:2;width:188px;border-radius:10px;padding:12px 14px;box-sizing:border-box;"></div><div id="panel-backdrop"></div><div id="side-panel" style="position:absolute;top:0;right:0;width:300px;max-width:82%;height:100%;transform:translateX(100%);transition:transform .3s ease;box-sizing:border-box;overflow-y:auto;overflow-x:hidden;z-index:2;"><div id="panel-content"></div></div></div></div></div>';

  // Lets any element anywhere on the page open the widget, e.g.
  // <a href="#" data-network-widget-open>View my network</a> — no JS
  // required from the embedding site. Delegated on document so it also
  // picks up elements added after this script runs.
  function wireOpenTriggers() {
    document.addEventListener("click", function (e) {
      var trigger = e.target.closest && e.target.closest("[data-network-widget-open]");
      if (!trigger) return;
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("worked-together:open"));
    });
  }

  function boot() {
    injectHead();
    injectMarkup();
    wireOpenTriggers();

    Promise.all([
      fetchWidgetData(embedKey),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"),
      loadScript(origin + "/network-widget/widget.js"),
    ])
      .then(function (results) {
        window.__initNetworkWidget(results[0], {
          mode: mode,
          corner: corner,
          label: label,
          icon: showIcon,
          iconEmoji: iconEmoji,
          hideLauncher: hideLauncher,
          appOrigin: origin,
        });
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

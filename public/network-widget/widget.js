      window.__initNetworkWidget = function (widgetData, options) {
        options = options || {};
        var settings = (widgetData.profile && widgetData.profile.widget_settings) || {};
        var mode = options.mode || "floating";
        var initialTheme = options.theme || settings.theme || "light";
        var cornerRadius = options.cornerRadius != null ? options.cornerRadius : (settings.cornerRadius != null ? settings.cornerRadius : 24);

        // shadow used to be a boolean (on/off); now it's a 0-100 intensity.
        // Coerce old saved boolean values so existing profiles keep working.
        var shadowRaw = options.shadow != null ? options.shadow : (settings.shadow != null ? settings.shadow : 60);
        var shadowIntensity = typeof shadowRaw === "boolean" ? (shadowRaw ? 60 : 0) : shadowRaw;

        var btnFontSize = options.buttonFontSize != null ? options.buttonFontSize : (settings.buttonFontSize != null ? settings.buttonFontSize : 13);
        var btnFontWeight = options.buttonFontWeight != null ? options.buttonFontWeight : (settings.buttonFontWeight != null ? settings.buttonFontWeight : 600);
        var btnLetterSpacing = options.buttonLetterSpacing != null ? options.buttonLetterSpacing : (settings.buttonLetterSpacing != null ? settings.buttonLetterSpacing : 0);
        var btnPaddingX = options.buttonPaddingX != null ? options.buttonPaddingX : (settings.buttonPaddingX != null ? settings.buttonPaddingX : 16);
        var btnPaddingY = options.buttonPaddingY != null ? options.buttonPaddingY : (settings.buttonPaddingY != null ? settings.buttonPaddingY : 14);
        var btnBorderColor = options.buttonBorderColor || settings.buttonBorderColor || "rgba(0,0,0,0.1)";
        var btnBorderWidth = options.buttonBorderWidth != null ? options.buttonBorderWidth : (settings.buttonBorderWidth != null ? settings.buttonBorderWidth : 1);
        var btnBorderRadius = options.buttonBorderRadius != null ? options.buttonBorderRadius : (settings.buttonBorderRadius != null ? settings.buttonBorderRadius : 14);
        var btnBg = options.buttonBackgroundColor || settings.buttonBackgroundColor || "#faf9f6";
        var btnHoverStyle = options.buttonHoverStyle || settings.buttonHoverStyle || "scale";

        // Keep in sync with FONT_OPTIONS in src/components/dashboard/EmbedDesigner.tsx.
        var FONT_OPTIONS = {
          system: { family: "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif", google: null },
          inter: { family: "'Inter',sans-serif", google: "Inter:wght@400;500;600;700" },
          roboto: { family: "'Roboto',sans-serif", google: "Roboto:wght@400;500;700" },
          poppins: { family: "'Poppins',sans-serif", google: "Poppins:wght@400;500;600;700" },
          montserrat: { family: "'Montserrat',sans-serif", google: "Montserrat:wght@400;500;600;700" },
          "space-grotesk": { family: "'Space Grotesk',sans-serif", google: "Space+Grotesk:wght@400;500;600;700" },
          "dm-sans": { family: "'DM Sans',sans-serif", google: "DM+Sans:wght@400;500;700" },
          "work-sans": { family: "'Work Sans',sans-serif", google: "Work+Sans:wght@400;500;600;700" },
          nunito: { family: "'Nunito',sans-serif", google: "Nunito:wght@400;600;700" },
          "playfair-display": { family: "'Playfair Display',serif", google: "Playfair+Display:wght@400;600;700" },
          merriweather: { family: "'Merriweather',serif", google: "Merriweather:wght@400;700" },
          lora: { family: "'Lora',serif", google: "Lora:wght@400;500;600;700" },
          "space-mono": { family: "'Space Mono',monospace", google: "Space+Mono:wght@400;700" },
          "jetbrains-mono": { family: "'JetBrains Mono',monospace", google: "JetBrains+Mono:wght@400;500;700" },
          oswald: { family: "'Oswald',sans-serif", google: "Oswald:wght@400;500;600;700" },
          "bebas-neue": { family: "'Bebas Neue',sans-serif", google: "Bebas+Neue" },
        };
        var btnFontFamilyKey = options.buttonFontFamily || settings.buttonFontFamily || "system";
        var btnFontOption = FONT_OPTIONS[btnFontFamilyKey] || FONT_OPTIONS.system;
        if (btnFontOption.google && !document.getElementById("wt-btn-font-link")) {
          var fontLink = document.createElement("link");
          fontLink.id = "wt-btn-font-link";
          fontLink.rel = "stylesheet";
          fontLink.href =
            "https://fonts.googleapis.com/css2?family=" + btnFontOption.google + "&display=swap";
          document.head.appendChild(fontLink);
        }

        var svg = d3.select("#graph-svg");
        var container = document.getElementById("ring-app");
        var panel = document.getElementById("side-panel");
        var panelContent = document.getElementById("panel-content");
        var backdrop = document.getElementById("panel-backdrop");
        var widgetRoot = document.getElementById("widget-root");
        var launcherBtn = document.getElementById("launcher-btn");

        if (mode === "inline") {
          widgetRoot.classList.add("mode-inline");
        }
        widgetRoot.style.setProperty("--wt-radius", cornerRadius + "px");
        if (shadowIntensity > 0) {
          var shadowOffsetY = Math.round(8 + (shadowIntensity / 100) * 12);
          var shadowBlur = Math.round(20 + (shadowIntensity / 100) * 40);
          var shadowOpacity = ((shadowIntensity / 100) * 0.25).toFixed(3);
          widgetRoot.style.setProperty(
            "--wt-shadow",
            "0 " + shadowOffsetY + "px " + shadowBlur + "px rgba(0,0,0," + shadowOpacity + ")",
          );
        } else {
          widgetRoot.style.setProperty("--wt-shadow", "none");
        }
        widgetRoot.style.setProperty("--wt-btn-font-size", btnFontSize + "px");
        widgetRoot.style.setProperty("--wt-btn-font-weight", btnFontWeight);
        widgetRoot.style.setProperty("--wt-btn-letter-spacing", btnLetterSpacing + "px");
        widgetRoot.style.setProperty("--wt-btn-padding-x", btnPaddingX + "px");
        widgetRoot.style.setProperty("--wt-btn-padding-y", btnPaddingY + "px");
        widgetRoot.style.setProperty("--wt-btn-border-color", btnBorderColor);
        widgetRoot.style.setProperty("--wt-btn-border-width", btnBorderWidth + "px");
        widgetRoot.style.setProperty("--wt-btn-radius", btnBorderRadius + "px");
        widgetRoot.style.setProperty("--wt-btn-bg", btnBg);
        widgetRoot.style.setProperty("--wt-btn-font-family", btnFontOption.family);

        ["hover-lift", "hover-glow", "hover-darken", "hover-none"].forEach(function (c) {
          widgetRoot.classList.remove(c);
        });
        if (btnHoverStyle !== "scale") {
          widgetRoot.classList.add("hover-" + btnHoverStyle);
        }

        if (mode === "floating") {
          var corner = options.corner || settings.corner || "bottom-right";
          ["bottom-right", "bottom-left", "top-right", "top-left"].forEach(function (c) {
            widgetRoot.classList.remove("corner-" + c);
          });
          widgetRoot.classList.add("corner-" + corner);

          var hideLauncher =
            options.hideLauncher != null ? options.hideLauncher : !!settings.hideLauncher;
          if (hideLauncher) {
            widgetRoot.classList.add("hide-launcher");
          }
        }

        var launcherLabelText = options.label || settings.label;
        if (launcherLabelText) {
          var launcherLabelEl = launcherBtn.querySelector(".launcher-label");
          if (launcherLabelEl) launcherLabelEl.textContent = launcherLabelText;
        }

        var showIcon =
          options.icon != null ? options.icon : settings.icon != null ? settings.icon : true;
        var iconEmoji = options.iconEmoji || settings.iconEmoji || "";
        var launcherIconSvgEl = launcherBtn.querySelector("svg");
        var launcherIconEmojiEl = document.getElementById("launcher-icon-emoji");
        if (!showIcon) {
          if (launcherIconSvgEl) launcherIconSvgEl.style.display = "none";
          if (launcherIconEmojiEl) launcherIconEmojiEl.style.display = "none";
        } else if (iconEmoji) {
          if (launcherIconSvgEl) launcherIconSvgEl.style.display = "none";
          if (launcherIconEmojiEl) {
            launcherIconEmojiEl.textContent = iconEmoji;
            launcherIconEmojiEl.style.display = "";
          }
        } else {
          if (launcherIconSvgEl) launcherIconSvgEl.style.display = "";
          if (launcherIconEmojiEl) launcherIconEmojiEl.style.display = "none";
        }

        // In the dashboard's own live preview these should just be inert —
        // clicking them shouldn't navigate the settings page you're editing
        // away to the login screen. Real third-party embeds (via
        // public/widget.js) always pass disableCallToAction: false.
        var disableCallToAction = !!options.disableCallToAction;
        var loginUrl = (options.appOrigin || "") + "/";
        var addOwnerBtnEl = document.getElementById("add-owner-btn");
        var shareNetworkBtnEl = document.getElementById("share-network-btn");
        if (disableCallToAction) {
          if (addOwnerBtnEl) addOwnerBtnEl.addEventListener("click", function (e) { e.preventDefault(); });
          if (shareNetworkBtnEl) shareNetworkBtnEl.addEventListener("click", function (e) { e.preventDefault(); });
        } else {
          if (addOwnerBtnEl) addOwnerBtnEl.href = loginUrl;
          if (shareNetworkBtnEl) shareNetworkBtnEl.href = loginUrl;
        }

        var width = container.clientWidth || 460,
          height = container.clientHeight || 560;

        var MONO = "'Space Mono',ui-monospace,SFMono-Regular,Menlo,monospace";
        var THEMES = {
          light: {
            canvasBg: "#EFEEEC",
            panelBg: "#F7F6F3",
            chip: "#E4E3DF",
            dot: "rgba(0,0,0,0.15)",
            border: "rgba(0,0,0,0.09)",
            borderStrong: "rgba(0,0,0,0.20)",
            textPrimary: "#1C1C1A",
            textSecondary: "#55544F",
            textMuted: "#8A887F",
            surface1: "#E9E8E4",
            shadow: "rgba(0,0,0,0.16)",
            lineColor: "#1C1C1A",
          },
          dark: {
            canvasBg: "#1E1E1C",
            panelBg: "#282826",
            chip: "#343431",
            dot: "rgba(255,255,255,0.18)",
            border: "rgba(255,255,255,0.10)",
            borderStrong: "rgba(255,255,255,0.22)",
            textPrimary: "#F1EFE8",
            textSecondary: "#B4B2A9",
            textMuted: "#8A887F",
            surface1: "#343431",
            shadow: "rgba(0,0,0,0.5)",
            lineColor: "#F1EFE8",
          },
        };

        var currentTheme = "light";
        var currentPanelId = null;

        // ---- Data comes from Supabase now, not hardcoded ----
        // widgetData is passed in by widget-loader.js after it fetches
        // the profile + connections for this specific embed_key.
        var profile = widgetData.profile;
        var rawConnections = widgetData.connections || [];

        var db = {};
        db.you = {
          id: "you",
          name: profile.name,
          role: "owner",
          bio: profile.bio,
          website: profile.website,
          avatarOverride: profile.avatar_url || null,
          workSamples: profile.workSamples || [],
          endorsements: profile.endorsements || [],
        };

        rawConnections.forEach(function (c) {
          db[c.id] = {
            id: c.id,
            name: c.name,
            role: "connection",
            bio: c.bio,
            website: c.website,
            endorsements: c.endorsements || [],
            relationship: c.relationship || null,
            avatarOverride: c.avatar_url || null,
            workSamples: c.workSamples || [],
          };
        });

        var ownerConnections = rawConnections.map(function (c) {
          return c.id;
        });
        // Peer-to-peer lines between contacts (who-knows-who) are a
        // future enhancement -- v1 only draws owner -> contact lines.
        var extraEdges = [];

        // Show the real portfolio owner's name in the "Add ___" prompt
        var addOwnerLabel = document.getElementById("add-owner-label");
        if (addOwnerLabel) {
          addOwnerLabel.textContent = "Add " + db.you.name;
        }



        var nodes = [Object.assign({}, db.you)].concat(
          ownerConnections.map(function (id) {
            return Object.assign({}, db[id]);
          }),
        );
        var links = ownerConnections
          .map(function (id) {
            return { source: "you", target: id };
          })
          .concat(
            extraEdges.map(function (e) {
              return { source: e[0], target: e[1] };
            }),
          );

        var adjacency = {};
        links.forEach(function (l) {
          (adjacency[l.source] = adjacency[l.source] || {})[l.target] = true;
          (adjacency[l.target] = adjacency[l.target] || {})[l.source] = true;
        });

        var PALETTE = [
          "#1D69E0",
          "#D94F2B",
          "#AC57D6",
          "#128A66",
          "#C2477F",
          "#93A8F2",
          "#B7C42E",
          "#E8873A",
          "#7C3AED",
          "#0EA5A0",
          "#DB2777",
          "#5B8DEF",
          "#D4A017",
          "#16A34A",
        ];
        var personColors = {};
        nodes.forEach(function (n, i) {
          personColors[n.id] = PALETTE[i % PALETTE.length];
        });

        function personColor(id) {
          return personColors[id] || PALETTE[0];
        }
        function mixHex(hexA, hexB, w) {
          var a = parseInt(hexA.slice(1), 16),
            b = parseInt(hexB.slice(1), 16);
          var r = Math.round(
            ((a >> 16) & 255) * w + ((b >> 16) & 255) * (1 - w),
          );
          var g = Math.round(((a >> 8) & 255) * w + ((b >> 8) & 255) * (1 - w));
          var bl = Math.round((a & 255) * w + (b & 255) * (1 - w));
          return (
            "#" + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)
          );
        }
        function idOf(x) {
          return x && typeof x === "object" ? x.id : x;
        }
        function nodeRadius(d) {
          return d.id === "you" ? 22 : 15;
        }
        function initialsOf(name) {
          return name
            .split(" ")
            .map(function (p) {
              return p[0];
            })
            .join("");
        }
        function avatarUrl(seed) {
          // Real users can set their own photo (avatar_url in the database).
          // Fall back to an auto-generated avatar if they haven't set one.
          var person = db[seed];
          return (
            (person && person.avatarOverride) ||
            "https://api.dicebear.com/10.x/glyphs/png?seed=" +
              encodeURIComponent(seed) +
              "&size=128"
          );
        }
        function easeOutBack(t) {
          var c1 = 1.70158,
            c3 = c1 + 1;
          return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        }

        var ICON_PATHS = {
          x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>',
          external:
            '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
          chat: '<path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-4-1L3 21l1-5.5a8.5 8.5 0 0 1 17-4Z"/>',
          code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
          sun: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4" y1="12" x2="2" y2="12"/><line x1="22" y1="12" x2="20" y2="12"/><line x1="19.07" y1="4.93" x2="17.66" y2="6.34"/><line x1="6.34" y1="17.66" x2="4.93" y2="19.07"/><line x1="19.07" y1="19.07" x2="17.66" y2="17.66"/><line x1="6.34" y1="6.34" x2="4.93" y2="4.93"/>',
          moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>',
          resize:
            '<line x1="21" y1="3" x2="3" y2="21"/><polyline points="21 9 21 3 15 3"/><polyline points="3 15 3 21 9 21"/>',
        };
        function icon(name, size) {
          return (
            '<svg viewBox="0 0 24 24" width="' +
            (size || 16) +
            '" height="' +
            (size || 16) +
            '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;">' +
            ICON_PATHS[name] +
            "</svg>"
          );
        }
        function starIcon(size, color) {
          return (
            '<svg width="' +
            size +
            '" height="' +
            size +
            '" viewBox="0 0 24 24" style="display:block;flex-shrink:0;"><polygon points="12 2 15 8.5 22 9.5 17 14.5 18.5 21.5 12 18 5.5 21.5 7 14.5 2 9.5 9 8.5" fill="' +
            (color || "#F5C518") +
            '"/></svg>'
          );
        }
        function starPoints(outerR, innerR) {
          var pts = [];
          for (var i = 0; i < 10; i++) {
            var r = i % 2 === 0 ? outerR : innerR;
            var a = -Math.PI / 2 + (i * Math.PI) / 5;
            pts.push(
              (r * Math.cos(a)).toFixed(2) + "," + (r * Math.sin(a)).toFixed(2),
            );
          }
          return pts.join(" ");
        }

        function thumbnailSVG(variant, colors) {
          var c1 = colors[0],
            c2 = colors[1],
            c3 = colors[2];
          if (variant === "A")
            return (
              '<svg viewBox="0 0 160 120" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="160" height="120" fill="' +
              c1 +
              '"/><circle cx="115" cy="35" r="50" fill="' +
              c2 +
              '"/><rect x="0" y="78" width="160" height="42" fill="' +
              c3 +
              '"/></svg>'
            );
          if (variant === "C")
            return (
              '<svg viewBox="0 0 160 120" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="160" height="120" fill="' +
              c3 +
              '"/><rect x="18" y="18" width="58" height="58" fill="' +
              c1 +
              '"/><rect x="88" y="38" width="54" height="70" fill="' +
              c2 +
              '"/></svg>'
            );
          return (
            '<svg viewBox="0 0 160 120" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="160" height="120" fill="' +
            c1 +
            '"/><circle class="thumb-pulse" cx="80" cy="62" r="28" fill="' +
            c2 +
            '"/><rect x="12" y="12" width="28" height="28" fill="' +
            c3 +
            '"/></svg>'
          );
        }

        var GRID = { spacingX: 95, spacingY: 90, offsetX: 60, offsetY: 70 };
        var focusedId = "you",
          hoveredId = null;
        var camera, linkGroup, nodeGroup, bgRect;
        var nodeById = {};
        var currentTx = 0,
          currentTy = 0;
        var txMin = 0,
          txMax = 0,
          tyMin = 0,
          tyMax = 0;
        var velX = 0,
          velY = 0,
          momentumRAF = null;

        function clamp(v, lo, hi) {
          if (lo > hi) {
            return (lo + hi) / 2;
          }
          return Math.max(lo, Math.min(hi, v));
        }

        function dotBackground(t) {
          return "radial-gradient(" + t.dot + " 1.4px, transparent 1.4px)";
        }

        function applyTheme(mode) {
          currentTheme = mode;
          var t = THEMES[mode];
          container.classList.toggle("wm-dark", mode === "dark");
          container.style.backgroundColor = t.canvasBg;
          container.style.backgroundImage = dotBackground(t);
          container.style.backgroundSize = "22px 22px";
          var highlightLayer = document.getElementById("dot-highlight-layer");
          if (highlightLayer) {
            var highlightDotColor =
              mode === "dark" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.92)";
            highlightLayer.style.backgroundImage =
              "radial-gradient(" + highlightDotColor + " 1.4px, transparent 1.4px)";
            highlightLayer.style.backgroundSize = "22px 22px";
          }
          container.style.setProperty("--link-color", t.textMuted);
          var addOwnerBtn = document.getElementById("add-owner-btn");
          if (addOwnerBtn) {
            addOwnerBtn.style.background = t.chip;
            addOwnerBtn.style.color = t.textSecondary;
          }
          var shareNetworkBtn = document.getElementById("share-network-btn");
          if (shareNetworkBtn) {
            shareNetworkBtn.style.background = t.chip;
            shareNetworkBtn.style.color = t.textSecondary;
          }
          container.style.setProperty("--link-hover-color", t.textPrimary);
          document.querySelectorAll(".corner").forEach(function (c) {
            c.style.borderColor = t.borderStrong;
          });
          var resizeHandle = document.getElementById("resize-handle");
          resizeHandle.style.color = t.textSecondary;
          resizeHandle.style.background = t.chip;
          document.getElementById("resize-icon").innerHTML = icon("resize", 13);
          var resizeToggleBtn = document.getElementById("resize-toggle-btn");
          resizeToggleBtn.style.color = t.textSecondary;
          resizeToggleBtn.style.background = t.chip;
          document.getElementById("resize-toggle-icon").innerHTML = icon("resize", 13);
          var toggleBtn = document.getElementById("theme-toggle-btn");
          toggleBtn.style.color = t.textSecondary;
          toggleBtn.style.background = t.chip;
          var closeBtn = document.getElementById("widget-close-btn");
          closeBtn.style.color = t.textSecondary;
          closeBtn.style.background = t.chip;
          document.getElementById("widget-close-icon").innerHTML = icon(
            "x",
            14,
          );
          document.getElementById("theme-icon").innerHTML = icon(
            mode === "light" ? "sun" : "moon",
            12,
          );
          document.getElementById("theme-label").textContent =
            mode === "light" ? "Light" : "Dark";
          panel.style.background = t.panelBg;
          panel.style.borderLeft = "1px solid " + t.border;
          var panelIsOpen =
            panel.style.transform === "translateX(0px)" ||
            panel.style.transform === "translateX(0)";
          panel.style.boxShadow = panelIsOpen
            ? "-10px 0 30px " + t.shadow
            : "none";
          linkGroup.selectAll(".edge-path").style("stroke", t.lineColor);
          linkGroup.selectAll(".edge-junction").style("fill", t.lineColor);
          nodeGroup.selectAll("circle.line-mask").style("fill", t.canvasBg);
          nodeGroup
            .selectAll("circle.ring")
            .style("stroke", t.textPrimary)
            .style("fill", t.canvasBg);
          nodeGroup.selectAll("circle.main").style("stroke", t.canvasBg);
          nodeGroup
            .selectAll("text.label")
            .style("fill", t.textSecondary)
            .style("stroke", t.canvasBg);
          nodeGroup
            .selectAll(".endorse-badge circle")
            .style("stroke", t.canvasBg);
          if (
            panel.style.transform === "translateX(0px)" ||
            panel.style.transform === "translateX(0)"
          ) {
            openPanel(focusedId);
          }
        }

        bgRect = svg
          .append("rect")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", width)
          .attr("height", height)
          .attr("fill", "transparent")
          .style("cursor", "grab");

        camera = svg.append("g");
        linkGroup = camera.append("g");
        nodeGroup = camera.append("g");
        var patternDefs = svg.append("defs");

        var zoomK = 1,
          ZOOM_MIN = 0.55,
          ZOOM_MAX = 1.25;

        function applyTransform(x, y) {
          camera.attr(
            "transform",
            "translate(" + x + "," + y + ") scale(" + zoomK + ")",
          );
          container.style.backgroundPosition = x + "px " + y + "px";
          container.style.backgroundSize =
            22 * zoomK + "px " + 22 * zoomK + "px";
          var highlightLayer = document.getElementById("dot-highlight-layer");
          if (highlightLayer) {
            highlightLayer.style.backgroundPosition = x + "px " + y + "px";
            highlightLayer.style.backgroundSize =
              22 * zoomK + "px " + 22 * zoomK + "px";
          }
        }

        function computeBounds() {
          var margin = 50;
          var xs = nodes.map(function (n) {
            return n.x;
          });
          var ys = nodes.map(function (n) {
            return n.y;
          });
          var minX = Math.min.apply(null, xs),
            maxX = Math.max.apply(null, xs);
          var minY = Math.min.apply(null, ys),
            maxY = Math.max.apply(null, ys);
          txMin = margin - maxX * zoomK;
          txMax = width - margin - minX * zoomK;
          tyMin = margin - maxY * zoomK;
          tyMax = height - margin - minY * zoomK;
        }

        function refreshTransforms() {
          nodeGroup.selectAll("g.person").attr("transform", function (d) {
            var s = d.id === hoveredId ? 1.15 : 1;
            return "translate(" + d.x + "," + d.y + ") scale(" + s + ")";
          });
        }

        function routeEdge(s, t) {
          var dx = t.x - s.x,
            dy = t.y - s.y;
          if (Math.abs(dx) < 1 || Math.abs(dy) < 1) {
            return {
              d: "M" + s.x + "," + s.y + " L" + t.x + "," + t.y,
              junction: { x: (s.x + t.x) / 2, y: (s.y + t.y) / 2 },
            };
          }
          var sx = dx > 0 ? 1 : -1,
            sy = dy > 0 ? 1 : -1;
          var c = Math.min(16, Math.abs(dx) / 2, Math.abs(dy) / 2);
          var d =
            "M" +
            s.x +
            "," +
            s.y +
            " L" +
            (t.x - sx * c) +
            "," +
            s.y +
            " L" +
            t.x +
            "," +
            (s.y + sy * c) +
            " L" +
            t.x +
            "," +
            t.y;
          return {
            d: d,
            junction: { x: t.x - (sx * c) / 2, y: s.y + (sy * c) / 2 },
          };
        }

        function updateLinks() {
          linkGroup.selectAll("g.edge").each(function (l) {
            var s = nodeById[l.source],
              t = nodeById[l.target];
            var route = routeEdge(s, t);
            var g = d3.select(this);
            g.select(".edge-path").attr("d", route.d);
            g.select(".edge-data").attr("d", route.d);
            g.select(".edge-end-a")
              .attr("x", s.x - 3)
              .attr("y", s.y - 3);
            g.select(".edge-end-b")
              .attr("x", t.x - 3)
              .attr("y", t.y - 3);
            g.select(".edge-junction")
              .attr("x", route.junction.x - 2.5)
              .attr("y", route.junction.y - 2.5);
            var grad = document.getElementById("edge-grad-" + l.eid);
            if (grad) {
              grad.setAttribute("x1", s.x);
              grad.setAttribute("y1", s.y);
              grad.setAttribute("x2", t.x);
              grad.setAttribute("y2", t.y);
            }
          });
        }

        function assignGridPositions() {
          var centerCol = 2,
            centerRow = 2;
          var ringOffsets = [
            [0, -1],
            [1, -1],
            [1, 0],
            [1, 1],
            [0, 1],
            [-1, 1],
            [-1, 0],
            [-1, -1],
            [0, -2],
            [2, 0],
            [0, 2],
            [-2, 0],
            [2, -2],
          ];
          var others = nodes.filter(function (n) {
            return n.id !== "you";
          });
          others.forEach(function (n, i) {
            var off = ringOffsets[i % ringOffsets.length];
            n.gridCol = centerCol + off[0];
            n.gridRow = centerRow + off[1];
          });
          nodes.forEach(function (n) {
            if (n.id === "you") {
              n.gridCol = centerCol;
              n.gridRow = centerRow;
            }
            n.x = GRID.offsetX + n.gridCol * GRID.spacingX;
            n.y = GRID.offsetY + n.gridRow * GRID.spacingY;
            nodeById[n.id] = n;
          });
        }

        function animateNodeTo(d, tx, ty) {
          var fromX = d.x,
            fromY = d.y,
            start = null,
            duration = 320;
          requestAnimationFrame(function step(ts) {
            if (!start) start = ts;
            var tt = Math.min((ts - start) / duration, 1);
            var eased = easeOutBack(tt);
            d.x = fromX + (tx - fromX) * eased;
            d.y = fromY + (ty - fromY) * eased;
            refreshTransforms();
            updateLinks();
            if (tt < 1) {
              requestAnimationFrame(step);
            } else {
              computeBounds();
            }
          });
        }

        function render() {
          links.forEach(function (l, i) {
            l.eid = i;
          });

          links.forEach(function (l) {
            if (document.getElementById("edge-grad-" + l.eid)) return;
            var grad = patternDefs
              .append("linearGradient")
              .attr("id", "edge-grad-" + l.eid)
              .attr("gradientUnits", "userSpaceOnUse");
            grad
              .append("stop")
              .attr("offset", "0%")
              .attr("stop-color", personColor(l.source));
            grad
              .append("stop")
              .attr("offset", "100%")
              .attr("stop-color", personColor(l.target));
          });

          var linkSel = linkGroup.selectAll("g.edge").data(links, function (d) {
            return d.source + "-" + d.target;
          });
          var linkEnter = linkSel
            .enter()
            .append("g")
            .attr("class", function (d) {
              return (
                "edge " +
                (d.source === "you" || d.target === "you"
                  ? "owner-edge"
                  : "peer-edge")
              );
            })
            .style("opacity", function (d) {
              return d.source === "you" || d.target === "you" ? 1 : 0;
            });

          linkEnter
            .append("path")
            .attr("class", "edge-data")
            .attr("stroke-dasharray", "2 11")
            .style("stroke", function (d) {
              return "url(#edge-grad-" + d.eid + ")";
            });

          linkEnter
            .append("path")
            .attr("class", "edge-path")
            .style("fill", "none")
            .attr("stroke-width", function (d) {
              return d.source === "you" || d.target === "you" ? 1.6 : 1.4;
            })
            .style("opacity", function (d) {
              return d.source === "you" || d.target === "you" ? 0.6 : 0.7;
            });

          linkEnter
            .append("rect")
            .attr("class", "edge-marker edge-end-a")
            .attr("width", 6)
            .attr("height", 6)
            .style("fill", function (d) {
              return personColor(d.source);
            });
          linkEnter
            .append("rect")
            .attr("class", "edge-marker edge-end-b")
            .attr("width", 6)
            .attr("height", 6)
            .style("fill", function (d) {
              return personColor(d.target);
            });
          linkEnter
            .append("rect")
            .attr("class", "edge-marker edge-junction")
            .attr("width", 5)
            .attr("height", 5);

          var nodeSel = nodeGroup
            .selectAll("g.person")
            .data(nodes, function (d) {
              return d.id;
            });
          var enter = nodeSel
            .enter()
            .append("g")
            .attr("class", "person")
            .style("cursor", "pointer")
            .style("opacity", 0)
            .call(
              d3
                .drag()
                .clickDistance(5)
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended),
            )
            .on("click", function (event, d) {
              event.stopPropagation();
              hideHoverCard();
              panTo(d.id, false);
            })
            .on("mouseenter", function (event, d) {
              hoveredId = d.id;
              refreshTransforms();
              highlightEgo(d.id);
              showHoverCard(d);
            })
            .on("mouseleave", function () {
              hoveredId = null;
              refreshTransforms();
              clearHighlight();
              hideHoverCard();
            });

          enter.append("circle").attr("class", "line-mask");
          enter.append("circle").attr("class", "ring");
          enter.append("circle").attr("class", "main");
          var avatarFO = enter
            .filter(function (d) {
              return d.id === "you";
            })
            .append("foreignObject")
            .attr("class", "avatar-fo")
            .attr("x", function (d) {
              return -nodeRadius(d);
            })
            .attr("y", function (d) {
              return -nodeRadius(d);
            })
            .attr("width", function (d) {
              return 2 * nodeRadius(d);
            })
            .attr("height", function (d) {
              return 2 * nodeRadius(d);
            })
            .style("pointer-events", "none")
            .style("overflow", "visible");
          avatarFO
            .append("xhtml:div")
            .style("width", "100%")
            .style("height", "100%")
            .style("border-radius", "50%")
            .style("background-image", "url(" + avatarUrl("you") + ")")
            .style("background-size", "cover")
            .style("background-position", "center");
          enter
            .append("text")
            .attr("class", "label")
            .attr("text-anchor", "middle")
            .style("font-size", "9px")
            .style("fill", THEMES[currentTheme].textSecondary)
            .style("pointer-events", "none");

          enter
            .select("circle.line-mask")
            .attr("r", function (d) {
              return nodeRadius(d) + 5;
            })
            .style("fill", THEMES[currentTheme].canvasBg)
            .style("stroke", "none")
            .style("opacity", 0);

          enter
            .select("circle.ring")
            .attr("r", function (d) {
              return nodeRadius(d) + 4;
            })
            .style("fill", THEMES[currentTheme].canvasBg)
            .style("stroke", THEMES[currentTheme].textPrimary)
            .attr("stroke-width", 1.6);

          enter
            .select("circle.main")
            .attr("r", function (d) {
              return nodeRadius(d);
            })
            .style("fill", function (d) {
              return personColor(d.id);
            })
            .style("stroke", THEMES[currentTheme].canvasBg)
            .attr("stroke-width", 3);

          enter
            .select("text.label")
            .attr("y", function (d) {
              return nodeRadius(d) + 14;
            })
            .text(function (d) {
              return d.name.split(" ")[0].toLowerCase();
            });

          var badgeEnter = enter
            .filter(function (d) {
              var endorsements = db[d.id].endorsements;
              return !!(endorsements && endorsements.length > 0);
            })
            .append("g")
            .attr("class", "endorse-badge")
            .attr("transform", function (d) {
              var off = nodeRadius(d) * 0.72;
              return "translate(" + off + "," + -off + ")";
            })
            .style("pointer-events", "none");
          badgeEnter
            .append("circle")
            .attr("r", 6)
            .style("fill", "#F5C518")
            .style("stroke", function () {
              return THEMES[currentTheme].canvasBg;
            })
            .attr("stroke-width", 1.5);
          badgeEnter
            .append("polygon")
            .attr("points", starPoints(3.2, 1.4))
            .style("fill", "#8A6100");

          var particleEnter = enter
            .append("g")
            .attr("class", "dither-particles")
            .style("pointer-events", "none");
          particleEnter.each(function (d) {
            var g = d3.select(this);
            var C = personColor(d.id);
            var count = 9;
            for (var i = 0; i < count; i++) {
              var angle = Math.random() * Math.PI * 2;
              var baseR = nodeRadius(d) + 2 + Math.random() * 3;
              var travel = 9 + Math.random() * 10;
              var ex = (Math.cos(angle) * travel).toFixed(1) + "px";
              var ey = (Math.sin(angle) * travel).toFixed(1) + "px";
              var size = 1.3 + Math.random() * 1.5;
              g.append("rect")
                .attr("class", "dither-dot")
                .attr("x", Math.cos(angle) * baseR - size / 2)
                .attr("y", Math.sin(angle) * baseR - size / 2)
                .attr("width", size)
                .attr("height", size)
                .style("fill", C)
                .style("--ex", ex)
                .style("--ey", ey)
                .style(
                  "animation-delay",
                  (Math.random() * 0.6).toFixed(2) + "s",
                );
            }
          });

          enter.each(function (d, i) {
            var el = this;
            setTimeout(function () {
              d3.select(el).style("opacity", 1);
            }, i * 45);
          });

          refreshTransforms();
          updateLinks();
          refreshRing();
        }

        function refreshRing() {
          nodeGroup
            .selectAll("g.person")
            .select("circle.ring")
            .style("opacity", function (d) {
              return d.id === focusedId ? 0.6 : 0;
            })
            .classed("ring-focused", function (d) {
              return d.id === focusedId;
            });
          nodeGroup
            .selectAll("g.person")
            .select("circle.line-mask")
            .style("opacity", function (d) {
              return d.id === focusedId ? 1 : 0;
            });
        }

        var hoverCard = document.getElementById("hover-card");

        function showHoverCard(d) {
          var t = THEMES[currentTheme];
          var C = personColor(d.id);
          var rows = "";
          var linkTextStyle =
            "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;";
          if (d.website)
            rows +=
              '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:' +
              t.textPrimary +
              ';margin-top:6px;">' +
              '<span style="flex-shrink:0;display:flex;">' +
              icon("external", 12) +
              "</span>" +
              '<span style="' +
              linkTextStyle +
              '">' +
              d.website +
              "</span></div>";
          var endorsementCount = (d.endorsements || []).length;
          if (endorsementCount > 0)
            rows +=
              '<div class="wm-label" style="display:flex;align-items:center;gap:6px;color:#8A6100;margin-top:10px;">' +
              starIcon(12) +
              "<span>" +
              endorsementCount +
              " endorsement" +
              (endorsementCount === 1 ? "" : "s") +
              "</span></div>";

          hoverCard.style.background = t.panelBg;
          hoverCard.style.border = "none";
          hoverCard.style.borderRadius = "14px";
          hoverCard.style.boxShadow = "0 8px 24px " + t.shadow;
          var relationshipHtml = d.relationship
            ? '<p style="font-size:11.5px;line-height:1.25;color:' +
              C +
              ';font-weight:700;margin:8px 0 0;">' +
              d.relationship +
              "</p>"
            : "";
          var bioHtml =
            d.id === "you"
              ? '<p style="font-size:11px;line-height:1.5;color:' +
                t.textSecondary +
                ';margin:8px 0 0;">' +
                d.bio +
                "</p>"
              : "";
          hoverCard.innerHTML =
            '<div style="display:flex;align-items:center;gap:7px;">' +
            '<span style="width:8px;height:8px;border-radius:2px;transform:rotate(45deg);background:' +
            C +
            ';flex-shrink:0;"></span>' +
            '<span style="font-weight:600;font-size:13px;letter-spacing:-0.01em;color:' +
            t.textPrimary +
            ';">' +
            d.name +
            "</span>" +
            "</div>" +
            relationshipHtml +
            bioHtml +
            rows;

          hoverCard.style.display = "block";
          var w = hoverCard.offsetWidth,
            h = hoverCard.offsetHeight;
          var sx = d.x * zoomK + currentTx,
            sy = d.y * zoomK + currentTy;

          var neigh = adjacency[d.id] || {};
          var avgX = 0,
            avgY = 0,
            count = 0;
          Object.keys(neigh).forEach(function (nid) {
            var n = nodeById[nid];
            if (n) {
              avgX += n.x;
              avgY += n.y;
              count++;
            }
          });
          var awayX = 1,
            awayY = 0;
          if (count > 0) {
            avgX /= count;
            avgY /= count;
            awayX = d.x - avgX;
            awayY = d.y - avgY;
            var mag = Math.sqrt(awayX * awayX + awayY * awayY) || 1;
            awayX /= mag;
            awayY /= mag;
          }

          var left, top;
          if (Math.abs(awayX) >= Math.abs(awayY)) {
            left = awayX >= 0 ? sx + 26 : sx - 26 - w;
            top = sy - h / 2;
          } else {
            left = sx - w / 2;
            top = awayY >= 0 ? sy + 22 : sy - 22 - h;
          }
          left = clamp(left, 8, width - w - 8);
          top = clamp(top, 8, height - h - 8);
          hoverCard.style.left = left + "px";
          hoverCard.style.top = top + "px";
          requestAnimationFrame(function () {
            hoverCard.classList.add("show");
          });
        }

        function hideHoverCard() {
          hoverCard.classList.remove("show");
          hoverCard.style.display = "none";
        }

        function isOwnerEdge(l) {
          return l.source === "you" || l.target === "you";
        }

        function highlightEgo(id) {
          var neigh = adjacency[id] || {};
          nodeGroup
            .selectAll("g.person")
            .style("opacity", function (n) {
              return n.id === id || neigh[n.id] ? 1 : 0.3;
            })
            .style("filter", function (n) {
              return n.id === id || neigh[n.id] ? "none" : "blur(2px)";
            });
          linkGroup
            .selectAll("g.edge")
            .classed("active", function (l) {
              return l.source === id || l.target === id;
            })
            .style("opacity", function (l) {
              if (l.source === id || l.target === id) return 1;
              return isOwnerEdge(l) ? 0.18 : 0;
            });
        }
        function clearHighlight() {
          nodeGroup
            .selectAll("g.person")
            .style("opacity", 1)
            .style("filter", "none");
          linkGroup
            .selectAll("g.edge")
            .classed("active", false)
            .style("opacity", function (l) {
              return isOwnerEdge(l) ? 1 : 0;
            });
        }

        function dragstarted(event, d) {
          hideHoverCard();
        }
        function dragged(event, d) {
          if (!d._raised) {
            d3.select(this).raise();
            d._raised = true;
          }
          d.x = event.x;
          d.y = event.y;
          refreshTransforms();
          updateLinks();
        }
        function dragended(event, d) {
          d._raised = false;
          var col = Math.max(
            0,
            Math.round((d.x - GRID.offsetX) / GRID.spacingX),
          );
          var row = Math.max(
            0,
            Math.round((d.y - GRID.offsetY) / GRID.spacingY),
          );
          animateNodeTo(
            d,
            GRID.offsetX + col * GRID.spacingX,
            GRID.offsetY + row * GRID.spacingY,
          );
        }

        function runMomentum() {
          velX *= 0.92;
          velY *= 0.92;
          if (Math.abs(velX) < 0.4 && Math.abs(velY) < 0.4) {
            momentumRAF = null;
            return;
          }
          currentTx = clamp(currentTx + velX, txMin, txMax);
          currentTy = clamp(currentTy + velY, tyMin, tyMax);
          applyTransform(currentTx, currentTy);
          momentumRAF = requestAnimationFrame(runMomentum);
        }

        var isPanning = false;
        var bgDrag = d3
          .drag()
          .on("start", function () {
            if (momentumRAF) {
              cancelAnimationFrame(momentumRAF);
              momentumRAF = null;
            }
            velX = 0;
            velY = 0;
            isPanning = true;
            if (highlightLayerEl) highlightLayerEl.style.opacity = 0;
            hideHoverCard();
            bgRect.style("cursor", "grabbing");
          })
          .on("drag", function (event) {
            velX = event.dx;
            velY = event.dy;
            currentTx = clamp(currentTx + event.dx, txMin, txMax);
            currentTy = clamp(currentTy + event.dy, tyMin, tyMax);
            applyTransform(currentTx, currentTy);
          })
          .on("end", function () {
            isPanning = false;
            bgRect.style("cursor", "grab");
            if (Math.abs(velX) > 1 || Math.abs(velY) > 1) {
              momentumRAF = requestAnimationFrame(runMomentum);
            }
          });
        bgRect.call(bgDrag);

        var highlightLayerEl = document.getElementById("dot-highlight-layer");
        if (highlightLayerEl) {
          container.addEventListener("mousemove", function (e) {
            if (isPanning) return;
            var rect = container.getBoundingClientRect();
            var mx = e.clientX - rect.left;
            var my = e.clientY - rect.top;
            highlightLayerEl.style.setProperty("--mx", mx + "px");
            highlightLayerEl.style.setProperty("--my", my + "px");
            highlightLayerEl.style.opacity = 1;
          });
          container.addEventListener("mouseleave", function () {
            highlightLayerEl.style.opacity = 0;
          });
        }

        function panTo(id, instant, skipPanel) {
          if (momentumRAF) {
            cancelAnimationFrame(momentumRAF);
            momentumRAF = null;
          }
          focusedId = id;
          refreshRing();
          var node = nodeById[id];
          if (node) {
            var targetX = clamp(width / 2 - node.x * zoomK, txMin, txMax);
            var targetY = clamp(height / 2 - node.y * zoomK, tyMin, tyMax);
            if (instant) {
              currentTx = targetX;
              currentTy = targetY;
              applyTransform(targetX, targetY);
            } else {
              var fromX = currentTx,
                fromY = currentTy,
                start = null,
                duration = 550;
              currentTx = targetX;
              currentTy = targetY;
              requestAnimationFrame(function step(ts) {
                if (!start) start = ts;
                var tt = Math.min((ts - start) / duration, 1);
                var eased = easeOutBack(tt);
                applyTransform(
                  fromX + (targetX - fromX) * eased,
                  fromY + (targetY - fromY) * eased,
                );
                if (tt < 1) requestAnimationFrame(step);
              });
            }
          }
          if (!skipPanel) openPanel(id);
        }

        function pillHTML(color, t) {
          return (
            '<span class="wm-pill" style="background:linear-gradient(180deg,' +
            color +
            " 0%," +
            mixHex(color, t.panelBg, 0.35) +
            " 60%," +
            t.chip +
            ' 100%);"></span>'
          );
        }
        function wmLabel(t, text, extra) {
          return (
            '<div style="display:flex;align-items:center;gap:7px;margin:0 0 7px;color:' +
            t.textMuted +
            ';" ><span class="wm-label">' +
            text +
            "</span>" +
            (extra || "") +
            "</div>"
          );
        }
        function openPanel(id) {
          currentPanelId = id;
          var person = db[id];
          var t = THEMES[currentTheme];
          var roleLabel = person.role === "owner" ? "Portfolio owner" : "";
          var C = personColor(id);
          var badge = {
            bg: mixHex(C, t.panelBg, 0.18),
            text: mixHex(C, t.textPrimary, 0.6),
          };
          var avatar = C;
          var avatarImg = avatarUrl(id);
          var workColors = [
            mixHex(C, t.panelBg, 0.22),
            mixHex(C, t.panelBg, 0.55),
            C,
          ];

          var linkRows = "";
          if (person.website)
            linkRows +=
              '<a href="https://' +
              person.website +
              '" target="_blank" class="profile-link" style="display:flex;align-items:center;gap:8px;padding:8px 6px;color:' +
              t.textPrimary +
              ';text-decoration:none;font-size:13px;">' +
              icon("external", 16) +
              person.website +
              "</a>";

          var tileStyle =
            "width:100%;aspect-ratio:4/3;overflow:hidden;border-radius:10px;pointer-events:none;background-size:cover;background-position:center;";
          var showcase = "";
          var workSamples = person.workSamples || [];
          if (workSamples.length > 0) {
            var tiles = workSamples
              .map(function (sample) {
                var isGif = /\.gif($|\?)/i.test(sample.url || "");
                return (
                  '<div style="' +
                  tileStyle +
                  "background-image:url(" +
                  sample.url +
                  ');position:relative;">' +
                  (isGif
                    ? '<span style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.55);color:#fff;font-size:9px;padding:1px 5px;border-radius:4px;letter-spacing:0.03em;">GIF</span>'
                    : "") +
                  "</div>"
                );
              })
              .join("");
            showcase =
              '<div style="padding:0 18px;">' +
              wmLabel(t, "Recent work") +
              "</div>" +
              '<div id="showcase-row" class="showcase-row" style="display:flex;flex-direction:column;gap:8px;padding:0 18px 20px;margin:0;">' +
              tiles +
              "</div>";
          }

          // Anyone who has endorsed this person, from anywhere in the
          // system -- not just endorsers who happen to also be a connection
          // of whoever's widget is being viewed (see fetchEndorsementsByTarget
          // in fetchWidgetData.ts). Shown for every node, including "you".
          var allEndorsementsHtml = "";
          var personEndorsements = person.endorsements || [];
          if (personEndorsements.length > 0) {
            var items = personEndorsements
              .map(function (e) {
                var ecolor = personColor(e.fromId);
                var eAvatar =
                  e.fromAvatarUrl ||
                  "https://api.dicebear.com/10.x/glyphs/png?seed=" +
                    encodeURIComponent(e.fromId) +
                    "&size=128";
                return (
                  '<div style="display:flex;gap:10px;padding:13px 0;border-top:1px solid ' +
                  t.border +
                  ';">' +
                  '<div style="width:26px;height:26px;border-radius:50%;flex-shrink:0;background-color:' +
                  ecolor +
                  ";background-image:url(" +
                  eAvatar +
                  ');background-size:cover;background-position:center;"></div>' +
                  '<div style="flex:1;min-width:0;">' +
                  '<p class="wm-label" style="margin:2px 0 5px;color:' +
                  t.textPrimary +
                  ';">' +
                  e.fromName +
                  "</p>" +
                  '<p style="font-size:12.5px;line-height:1.5;margin:0;color:' +
                  t.textSecondary +
                  ';">\u201C' +
                  e.text +
                  "\u201D</p>" +
                  "</div>" +
                  "</div>"
                );
              })
              .join("");
            allEndorsementsHtml =
              '<div style="padding:2px 18px 10px;">' +
              wmLabel(t, "Endorsed by", starIcon(11)) +
              items +
              "</div>";
          }

          var relBlock = person.relationship
            ? '<p style="font-size:12.5px;line-height:1.3;color:' +
              C +
              ';font-weight:700;margin:0 0 18px;">' +
              person.relationship +
              "</p>"
            : "";

          panelContent.innerHTML =
            '<div style="position:relative;padding:16px 18px 0;">' +
            '<div style="width:64px;height:64px;border-radius:50%;background-color:' +
            avatar +
            ";background-image:url(" +
            avatarImg +
            ');background-size:cover;background-position:center;"></div>' +
            '<button id="close-panel" type="button" style="position:absolute;top:16px;right:14px;width:26px;height:26px;min-width:26px;min-height:26px;padding:0;margin:0;line-height:1;box-sizing:border-box;border-radius:50%;background:' +
            t.chip +
            ";color:" +
            t.textSecondary +
            ';border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2;">' +
            icon("x", 15) +
            "</button>" +
            "</div>" +
            '<div style="padding:14px 18px 0 18px;">' +
            (roleLabel
              ? '<div style="margin-bottom:10px;">' +
                '<span class="wm-label" style="color:' +
                t.textMuted +
                ';">' +
                roleLabel +
                "</span>" +
                "</div>"
              : "") +
            '<p style="font-weight:400;font-size:25px;letter-spacing:-0.02em;line-height:1.1;margin:0 0 3px;color:' +
            t.textPrimary +
            ';font-family:-apple-system,BlinkMacSystemFont,sans-serif;">' +
            person.name +
            "</p>" +
            // Placeholder (unclaimed) profiles never get a bio set, so this
            // is often empty -- skip the line rather than rendering "null".
            (person.bio
              ? '<p style="font-size:12.5px;color:' +
                t.textSecondary +
                ';margin:0 0 20px;">' +
                person.bio +
                "</p>"
              : "") +
            relBlock +
            '<div style="border-top:1px solid ' +
            t.border +
            ';padding:16px 0 20px;">' +
            linkRows +
            "</div>" +
            "</div>" +
            showcase +
            allEndorsementsHtml;

          document
            .getElementById("close-panel")
            .addEventListener("click", closePanel);

          panel.style.transform = "translateX(0)";
          panel.style.boxShadow = "-10px 0 30px " + t.shadow;
          backdrop.classList.add("show");
        }

        function closePanel() {
          currentPanelId = null;
          panel.style.transform = "translateX(100%)";
          panel.style.boxShadow = "none";
          backdrop.classList.remove("show");
        }

        backdrop.addEventListener("click", closePanel);

        // Lets the dashboard's own live preview push profile edits (name,
        // bio, website, work samples) straight into the already-rendered
        // widget instead of waiting on a save + full re-fetch/re-init.
        window.__updateNetworkWidgetOwner = function (patch) {
          if (!db.you) return;
          Object.assign(db.you, patch);

          var ownerNode = nodes.filter(function (n) {
            return n.id === "you";
          })[0];
          if (ownerNode) Object.assign(ownerNode, patch);

          if (patch.name !== undefined) {
            var addOwnerLabel = document.getElementById("add-owner-label");
            if (addOwnerLabel) addOwnerLabel.textContent = "Add " + db.you.name;
          }

          if (currentPanelId === "you") {
            openPanel("you");
          }
        };

        document
          .getElementById("theme-toggle-btn")
          .addEventListener("click", function (e) {
            e.stopPropagation();
            applyTheme(currentTheme === "light" ? "dark" : "light");
          });

        /* bounded scroll-wheel zoom, anchored to the canvas center */
        container.addEventListener(
          "wheel",
          function (e) {
            if (panel.contains(e.target)) return;
            e.preventDefault();
            hideHoverCard();
            var oldK = zoomK;
            zoomK = clamp(
              zoomK * Math.exp(-e.deltaY * 0.0015),
              ZOOM_MIN,
              ZOOM_MAX,
            );
            if (zoomK === oldK) return;
            var cx = width / 2,
              cy = height / 2;
            currentTx = cx - (cx - currentTx) * (zoomK / oldK);
            currentTy = cy - (cy - currentTy) * (zoomK / oldK);
            computeBounds();
            currentTx = clamp(currentTx, txMin, txMax);
            currentTy = clamp(currentTy, tyMin, tyMax);
            applyTransform(currentTx, currentTy);
          },
          { passive: false },
        );

        assignGridPositions();
        render();
        applyTheme(initialTheme);
        computeBounds();
        panTo("you", true, true);

        if (mode === "inline") {
          widgetRoot.classList.add("expanded");
        }

        /* ---- floating launcher expand/collapse ---- */
        function expandWidget() {
          widgetRoot.classList.add("expanded");
        }
        function collapseWidget() {
          if (mode === "inline") return;
          widgetRoot.classList.remove("expanded");
        }

        // Lets any element anywhere on the host page open the widget, e.g.
        // <a data-network-widget-open>View my network</a> (wired up
        // automatically by public/widget.js), or custom code via
        // document.dispatchEvent(new CustomEvent("worked-together:open")).
        document.addEventListener("worked-together:open", expandWidget);

        launcherBtn.addEventListener("pointerup", function (e) {
          e.stopPropagation();
          expandWidget();
        });
        document
          .getElementById("widget-close-btn")
          .addEventListener("click", function (e) {
            e.stopPropagation();
            collapseWidget();
          });

        /* ---- resize the canvas by dragging the top-left handle ---- */
        var panelExpandedEl = document.querySelector(".panel-expanded");

        function resizeCanvas(newW, newH) {
          width = newW;
          height = newH;
          bgRect.attr("width", width).attr("height", height);
          computeBounds();
          currentTx = clamp(currentTx, txMin, txMax);
          currentTy = clamp(currentTy, tyMin, tyMax);
          applyTransform(currentTx, currentTy);
        }

        var suppressOutsideClick = false;

        function startResize(clientX, clientY) {
          hideHoverCard();
          var startX = clientX,
            startY = clientY;
          var startW = panelExpandedEl.offsetWidth,
            startH = panelExpandedEl.offsetHeight;
          var maxW = Math.min(720, window.innerWidth - 40);
          var maxH = Math.min(820, window.innerHeight - 40);

          function move(cx, cy) {
            var dx = cx - startX,
              dy = cy - startY;
            var newW = clamp(startW - dx, 340, maxW);
            var newH = clamp(startH - dy, 420, maxH);
            panelExpandedEl.style.width = newW + "px";
            panelExpandedEl.style.height = newH + "px";
            resizeCanvas(newW, newH);
          }
          function finishResize() {
            suppressOutsideClick = true;
            setTimeout(function () {
              suppressOutsideClick = false;
            }, 60);
            if (widgetRoot.classList.contains("mode-inline")) {
              widgetRoot.classList.remove("show-resize");
            }
          }
          function onMouseMove(e) {
            move(e.clientX, e.clientY);
          }
          function onMouseUp() {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            finishResize();
          }
          function onTouchMove(e) {
            move(e.touches[0].clientX, e.touches[0].clientY);
            e.preventDefault();
          }
          function onTouchEnd() {
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            finishResize();
          }
          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
          document.addEventListener("touchmove", onTouchMove, {
            passive: false,
          });
          document.addEventListener("touchend", onTouchEnd);
        }

        document
          .getElementById("resize-handle")
          .addEventListener("mousedown", function (e) {
            e.preventDefault();
            e.stopPropagation();
            startResize(e.clientX, e.clientY);
          });
        document.getElementById("resize-handle").addEventListener(
          "touchstart",
          function (e) {
            e.stopPropagation();
            startResize(e.touches[0].clientX, e.touches[0].clientY);
          },
          { passive: true },
        );

        document
          .getElementById("resize-toggle-btn")
          .addEventListener("click", function (e) {
            e.stopPropagation();
            widgetRoot.classList.add("show-resize");
          });

        function syncMobileState() {
          if (window.innerWidth <= 480) {
            panelExpandedEl.style.width = "";
            panelExpandedEl.style.height = "";
            requestAnimationFrame(function () {
              resizeCanvas(container.clientWidth, container.clientHeight);
            });
          }
        }
        window.addEventListener("resize", syncMobileState);

        document.addEventListener("click", function (e) {
          if (suppressOutsideClick) return;
          // Don't collapse immediately after an external "open" trigger
          // (e.g. <a data-network-widget-open>) expanded it in this same click.
          if (e.target.closest && e.target.closest("[data-network-widget-open]")) {
            return;
          }
          if (
            widgetRoot.classList.contains("expanded") &&
            !widgetRoot.contains(e.target)
          ) {
            collapseWidget();
          }
        });
      };

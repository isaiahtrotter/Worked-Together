(function(){
  var svg = d3.select('#graph-svg');
  var container = document.getElementById('ring-app');
  var panel = document.getElementById('side-panel');
  var panelContent = document.getElementById('panel-content');
  var backdrop = document.getElementById('panel-backdrop');
  var widgetRoot = document.getElementById('widget-root');
  var launcherBtn = document.getElementById('launcher-btn');

  var width = container.clientWidth || 460, height = container.clientHeight || 560;

  var MONO = "'Space Mono',ui-monospace,SFMono-Regular,Menlo,monospace";
  var THEMES = {
    light: { canvasBg:'#EFEEEC', panelBg:'#F7F6F3', chip:'#E4E3DF', dot:'rgba(0,0,0,0.15)', border:'rgba(0,0,0,0.09)', borderStrong:'rgba(0,0,0,0.20)', textPrimary:'#1C1C1A', textSecondary:'#55544F', textMuted:'#8A887F', surface1:'#E9E8E4', shadow:'rgba(0,0,0,0.16)', lineColor:'#1C1C1A' },
    dark:  { canvasBg:'#1E1E1C', panelBg:'#282826', chip:'#343431', dot:'rgba(255,255,255,0.18)', border:'rgba(255,255,255,0.10)', borderStrong:'rgba(255,255,255,0.22)', textPrimary:'#F1EFE8', textSecondary:'#B4B2A9', textMuted:'#8A887F', surface1:'#343431', shadow:'rgba(0,0,0,0.5)', lineColor:'#F1EFE8' }
  };

  var currentTheme = 'light';

  var db = {
    you:   { id:'you',   name:'Isaiah Trotter',   role:'owner',     title:'Product designer',          bio:'Building small, useful tools and writing about design systems.',          website:'isaiahtrotter.design',  twitter:'isaiahtrotter',    github:null },
    maya:  { id:'maya',  name:'Maya Chen',    role:'designer',  title:'UI designer at Formless',   bio:'Obsessed with type and grids. Occasional illustrator.',                    website:'mayachen.co',       twitter:'mayadesigns',  github:null, endorsement:'Isaiah has an incredible eye for detail and always pushes our design system forward. Every review makes the work sharper.', relationship:'I have collaborated with Maya on 3 client projects (2022–2025)' },
    sam:   { id:'sam',   name:'Sam Okafor',   role:'developer', title:'Frontend engineer',         bio:'Open source maintainer, mostly living in React and CSS.',                  website:'samokafor.dev',     twitter:'samokafor',    github:'samokafor', endorsement:'Working with Isaiah taught me how much craft matters in design-to-engineering handoff. Nothing ever gets lost in translation.', relationship:'I paired with Sam on the same open-source project for two years' },
    priya: { id:'priya', name:'Priya Nair',   role:'designer',  title:'Freelance brand designer',  bio:'Helping startups find a voice. Coffee-powered.',                           website:'priyanair.studio',  twitter:'priyacreates', github:null, relationship:'I worked with Priya rebranding two startups, most recently a fintech launch' },
    theo:  { id:'theo',  name:'Theo Marsh',   role:'developer', title:'Indie hacker',              bio:'Shipping something new every month, mostly regretting naming things.',    website:'theomarsh.xyz',     twitter:'theobuilds',   github:'theomarsh', relationship:'Theo and I are building a weekend side project this year — a small habit-tracking app' },
    ravi:  { id:'ravi',  name:'Ravi Desai',   role:'developer', title:'Backend engineer',          bio:'Databases, distributed systems, and too much coffee.',                    website:'ravidesai.dev',     twitter:'ravidesai',    github:'ravidesai', endorsement:'One of the few designers who actually understands backend constraints. A genuine pleasure to build alongside.', relationship:'I partnered with Ravi on backend architecture for a client launch' },
    lena:  { id:'lena',  name:'Lena Petrova', role:'designer',  title:'Motion designer',           bio:'Making interfaces feel alive, one micro-interaction at a time.',          website:'lenapetrova.com',   twitter:'lenamoves',    github:null, relationship:'I met Lena through Figma Config, and we collaborate regularly' },
    nina:  { id:'nina',  name:'Nina Torres',  role:'developer', title:'Full-stack developer',      bio:'Building weird little web experiments and writing about them.',          website:'ninatorres.dev',    twitter:'ninacodes',    github:'ninatorres', relationship:'Nina and I co-taught a workshop on frontend experiments at a local meetup' },
    omar:  { id:'omar',  name:'Omar Farouk',  role:'designer',  title:'Design systems lead',       bio:'Tokens, components, and trying to keep everyone consistent.',             website:'omarfarouk.design', twitter:'omarsystems',  github:null, relationship:'I worked with Omar building out the design system now used across three product teams' },
    zack:  { id:'zack',  name:'Zack Reyes',   role:'developer', title:'Platform engineer',         bio:'Keeps the servers happy and the deploys boring.',                         website:'zackreyes.dev',     twitter:'zackruns',     github:'zackreyes', relationship:'Zack and I have shipped three product launches together' },
    ines:  { id:'ines',  name:'Ines Costa',   role:'designer',  title:'Visual designer',           bio:'Loves bold color and even bolder type choices.',                          website:'inescosta.design',  twitter:'inesdraws',    github:null, endorsement:'Isaiah brings so much color and energy into every project. Meetings are more fun and the work is always better for it.', relationship:'I frequently collaborate with Ines on brand and illustration work' },
    felix: { id:'felix', name:'Felix Bauer',  role:'developer', title:'Mobile engineer',           bio:'iOS by day, tinkering with Rust by night.',                                website:'felixbauer.dev',    twitter:'felixbuilds',  github:'felixbauer', relationship:'I worked with Felix on a mobile app redesign that shipped last spring' },
    aria:  { id:'aria',  name:'Aria Kim',     role:'designer',  title:'Illustrator and designer',  bio:'Draws little creatures in the margins of every project.',                 website:'ariakim.art',       twitter:'ariadraws',    github:null, relationship:'I occasionally help Aria with illustration projects' },
    kai:   { id:'kai',   name:'Kai Nakamura', role:'developer', title:'Data engineer',             bio:'Pipes data from A to B and tries to keep it clean along the way.',        website:'kainakamura.dev',   twitter:'kaiflows',     github:'kainakamura', relationship:'I partnered with Kai on a data visualization project for an internal analytics tool' }
  };

  var ownerConnections = ['maya','sam','priya','theo','ravi','lena','nina','omar','zack','ines','felix','aria','kai'];
  var endorserIds = ownerConnections.filter(function(id){ return !!db[id].endorsement; });
  var extraEdges = [
    ['maya','sam'],['maya','lena'],['sam','theo'],['theo','ravi'],['ravi','lena'],['lena','omar'],
    ['omar','priya'],['priya','theo'],['sam','nina'],['nina','zack'],['zack','felix'],['felix','kai'],
    ['kai','aria'],['aria','ines'],['ines','omar']
  ];

  var nodes = [Object.assign({}, db.you)].concat(ownerConnections.map(function(id){ return Object.assign({}, db[id]); }));
  var links = ownerConnections.map(function(id){ return {source:'you', target:id}; })
    .concat(extraEdges.map(function(e){ return {source:e[0], target:e[1]}; }));

  var adjacency = {};
  links.forEach(function(l){
    (adjacency[l.source] = adjacency[l.source] || {})[l.target] = true;
    (adjacency[l.target] = adjacency[l.target] || {})[l.source] = true;
  });

  var PALETTE = ['#1D69E0','#D94F2B','#AC57D6','#128A66','#C2477F','#93A8F2','#B7C42E','#E8873A','#7C3AED','#0EA5A0','#DB2777','#5B8DEF','#D4A017','#16A34A'];
  var personColors = {};
  nodes.forEach(function(n,i){ personColors[n.id] = PALETTE[i % PALETTE.length]; });

  function personColor(id){ return personColors[id] || PALETTE[0]; }
  function mixHex(hexA, hexB, w){
    var a = parseInt(hexA.slice(1),16), b = parseInt(hexB.slice(1),16);
    var r = Math.round(((a>>16)&255)*w + ((b>>16)&255)*(1-w));
    var g = Math.round(((a>>8)&255)*w + ((b>>8)&255)*(1-w));
    var bl = Math.round((a&255)*w + (b&255)*(1-w));
    return '#'+((1<<24)+(r<<16)+(g<<8)+bl).toString(16).slice(1);
  }
  function idOf(x){ return (x && typeof x === 'object') ? x.id : x; }
  function nodeRadius(d){ return d.id==='you' ? 22 : 15; }
  function initialsOf(name){ return name.split(' ').map(function(p){ return p[0]; }).join(''); }
  var AVATAR_OVERRIDES = { you: 'data:image/jpeg;base64,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' };
  function avatarUrl(seed){ return AVATAR_OVERRIDES[seed] || ('https://api.dicebear.com/10.x/glyphs/png?seed='+encodeURIComponent(seed)+'&size=128'); }
  function easeOutBack(t){ var c1=1.70158, c3=c1+1; return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2); }

  var ICON_PATHS = {
    x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    chat: '<path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-4-1L3 21l1-5.5a8.5 8.5 0 0 1 17-4Z"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4" y1="12" x2="2" y2="12"/><line x1="22" y1="12" x2="20" y2="12"/><line x1="19.07" y1="4.93" x2="17.66" y2="6.34"/><line x1="6.34" y1="17.66" x2="4.93" y2="19.07"/><line x1="19.07" y1="19.07" x2="17.66" y2="17.66"/><line x1="6.34" y1="6.34" x2="4.93" y2="4.93"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>',
    resize: '<line x1="21" y1="3" x2="3" y2="21"/><polyline points="21 9 21 3 15 3"/><polyline points="3 15 3 21 9 21"/>'
  };
  function icon(name, size){
    return '<svg viewBox="0 0 24 24" width="'+(size||16)+'" height="'+(size||16)+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;">'+ICON_PATHS[name]+'</svg>';
  }
  function starIcon(size, color){
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" style="display:block;flex-shrink:0;"><polygon points="12 2 15 8.5 22 9.5 17 14.5 18.5 21.5 12 18 5.5 21.5 7 14.5 2 9.5 9 8.5" fill="'+(color||'#F5C518')+'"/></svg>';
  }
  function starPoints(outerR, innerR){
    var pts = [];
    for(var i=0;i<10;i++){
      var r = i%2===0 ? outerR : innerR;
      var a = -Math.PI/2 + i*Math.PI/5;
      pts.push((r*Math.cos(a)).toFixed(2)+','+(r*Math.sin(a)).toFixed(2));
    }
    return pts.join(' ');
  }

  function thumbnailSVG(variant, colors){
    var c1=colors[0], c2=colors[1], c3=colors[2];
    if(variant==='A') return '<svg viewBox="0 0 160 120" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="160" height="120" fill="'+c1+'"/><circle cx="115" cy="35" r="50" fill="'+c2+'"/><rect x="0" y="78" width="160" height="42" fill="'+c3+'"/></svg>';
    if(variant==='C') return '<svg viewBox="0 0 160 120" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="160" height="120" fill="'+c3+'"/><rect x="18" y="18" width="58" height="58" fill="'+c1+'"/><rect x="88" y="38" width="54" height="70" fill="'+c2+'"/></svg>';
    return '<svg viewBox="0 0 160 120" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="160" height="120" fill="'+c1+'"/><circle class="thumb-pulse" cx="80" cy="62" r="28" fill="'+c2+'"/><rect x="12" y="12" width="28" height="28" fill="'+c3+'"/></svg>';
  }

  var GRID = { spacingX: 95, spacingY: 90, offsetX: 60, offsetY: 70 };
  var focusedId = 'you', hoveredId = null;
  var camera, linkGroup, nodeGroup, bgRect;
  var nodeById = {};
  var currentTx = 0, currentTy = 0;
  var txMin = 0, txMax = 0, tyMin = 0, tyMax = 0;
  var velX = 0, velY = 0, momentumRAF = null;

  function clamp(v,lo,hi){ if(lo>hi){ return (lo+hi)/2; } return Math.max(lo, Math.min(hi, v)); }

  function dotBackground(t){
    return 'radial-gradient('+t.dot+' 1.4px, transparent 1.4px)';
  }

  function applyTheme(mode){
    currentTheme = mode;
    var t = THEMES[mode];
    container.classList.toggle('wm-dark', mode==='dark');
    container.style.backgroundColor = t.canvasBg;
    container.style.backgroundImage = dotBackground(t);
    container.style.backgroundSize = '22px 22px';
    container.style.setProperty('--link-color', t.textMuted);
    container.style.setProperty('--link-hover-color', t.textPrimary);
    document.querySelectorAll('.corner').forEach(function(c){ c.style.borderColor = t.borderStrong; });
    var resizeHandle = document.getElementById('resize-handle');
    resizeHandle.style.color = t.textSecondary; resizeHandle.style.background = t.chip;
    document.getElementById('resize-icon').innerHTML = icon('resize', 13);
    var toggleBtn = document.getElementById('theme-toggle-btn');
    toggleBtn.style.color = t.textSecondary; toggleBtn.style.background = t.chip;
    var closeBtn = document.getElementById('widget-close-btn');
    closeBtn.style.color = t.textSecondary; closeBtn.style.background = t.chip;
    document.getElementById('widget-close-icon').innerHTML = icon('x', 14);
    document.getElementById('theme-icon').innerHTML = icon(mode==='light' ? 'sun' : 'moon', 12);
    document.getElementById('theme-label').textContent = mode==='light' ? 'Light' : 'Dark';
    panel.style.background = t.panelBg;
    panel.style.borderLeft = '1px solid '+t.border;
    var panelIsOpen = panel.style.transform === 'translateX(0px)' || panel.style.transform === 'translateX(0)';
    panel.style.boxShadow = panelIsOpen ? ('-10px 0 30px '+t.shadow) : 'none';
    linkGroup.selectAll('.edge-path').style('stroke', t.lineColor);
    linkGroup.selectAll('.edge-junction').style('fill', t.lineColor);
    nodeGroup.selectAll('circle.ring').style('stroke', t.textPrimary);
    nodeGroup.selectAll('circle.main').style('stroke', t.canvasBg);
    nodeGroup.selectAll('text.label').style('fill', t.textSecondary).style('stroke', t.canvasBg);
    nodeGroup.selectAll('.endorse-badge circle').style('stroke', t.canvasBg);
    if(panel.style.transform === 'translateX(0px)' || panel.style.transform === 'translateX(0)'){ openPanel(focusedId); }
  }

  bgRect = svg.append('rect')
    .attr('x',0).attr('y',0).attr('width',width).attr('height',height)
    .attr('fill','transparent')
    .style('cursor','grab');

  camera = svg.append('g');
  linkGroup = camera.append('g');
  nodeGroup = camera.append('g');
  var patternDefs = svg.append('defs');

  var zoomK = 1, ZOOM_MIN = 0.55, ZOOM_MAX = 1.25;

  function applyTransform(x,y){
    camera.attr('transform','translate('+x+','+y+') scale('+zoomK+')');
    container.style.backgroundPosition = x+'px '+y+'px';
    container.style.backgroundSize = (22*zoomK)+'px '+(22*zoomK)+'px';
  }

  function computeBounds(){
    var margin = 50;
    var xs = nodes.map(function(n){ return n.x; });
    var ys = nodes.map(function(n){ return n.y; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    txMin = margin - maxX*zoomK; txMax = width - margin - minX*zoomK;
    tyMin = margin - maxY*zoomK; tyMax = height - margin - minY*zoomK;
  }

  function refreshTransforms(){
    nodeGroup.selectAll('g.person').attr('transform', function(d){
      var s = d.id===hoveredId ? 1.15 : 1;
      return 'translate('+d.x+','+d.y+') scale('+s+')';
    });
  }

  function routeEdge(s,t){
    var dx = t.x - s.x, dy = t.y - s.y;
    if(Math.abs(dx) < 1 || Math.abs(dy) < 1){
      return { d: 'M'+s.x+','+s.y+' L'+t.x+','+t.y, junction: {x:(s.x+t.x)/2, y:(s.y+t.y)/2} };
    }
    var sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    var c = Math.min(16, Math.abs(dx)/2, Math.abs(dy)/2);
    var d = 'M'+s.x+','+s.y+
            ' L'+(t.x - sx*c)+','+s.y+
            ' L'+t.x+','+(s.y + sy*c)+
            ' L'+t.x+','+t.y;
    return { d: d, junction: {x: t.x - sx*c/2, y: s.y + sy*c/2} };
  }

  function updateLinks(){
    linkGroup.selectAll('g.edge').each(function(l){
      var s = nodeById[l.source], t = nodeById[l.target];
      var route = routeEdge(s,t);
      var g = d3.select(this);
      g.select('.edge-path').attr('d', route.d);
      g.select('.edge-data').attr('d', route.d);
      g.select('.edge-end-a').attr('x', s.x-3).attr('y', s.y-3);
      g.select('.edge-end-b').attr('x', t.x-3).attr('y', t.y-3);
      g.select('.edge-junction').attr('x', route.junction.x-2.5).attr('y', route.junction.y-2.5);
      var grad = document.getElementById('edge-grad-'+l.eid);
      if(grad){
        grad.setAttribute('x1', s.x); grad.setAttribute('y1', s.y);
        grad.setAttribute('x2', t.x); grad.setAttribute('y2', t.y);
      }
    });
  }

  function assignGridPositions(){
    var centerCol = 2, centerRow = 2;
    var ringOffsets = [
      [0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],
      [0,-2],[2,0],[0,2],[-2,0],[2,-2]
    ];
    var others = nodes.filter(function(n){ return n.id !== 'you'; });
    others.forEach(function(n, i){
      var off = ringOffsets[i % ringOffsets.length];
      n.gridCol = centerCol + off[0];
      n.gridRow = centerRow + off[1];
    });
    nodes.forEach(function(n){
      if(n.id==='you'){ n.gridCol = centerCol; n.gridRow = centerRow; }
      n.x = GRID.offsetX + n.gridCol * GRID.spacingX;
      n.y = GRID.offsetY + n.gridRow * GRID.spacingY;
      nodeById[n.id] = n;
    });
  }

  function animateNodeTo(d, tx, ty){
    var fromX = d.x, fromY = d.y, start = null, duration = 320;
    requestAnimationFrame(function step(ts){
      if(!start) start = ts;
      var tt = Math.min((ts-start)/duration, 1);
      var eased = easeOutBack(tt);
      d.x = fromX + (tx-fromX)*eased;
      d.y = fromY + (ty-fromY)*eased;
      refreshTransforms();
      updateLinks();
      if(tt<1){ requestAnimationFrame(step); } else { computeBounds(); }
    });
  }

  function render(){
    links.forEach(function(l,i){ l.eid = i; });

    links.forEach(function(l){
      if(document.getElementById('edge-grad-'+l.eid)) return;
      var grad = patternDefs.append('linearGradient')
        .attr('id','edge-grad-'+l.eid)
        .attr('gradientUnits','userSpaceOnUse');
      grad.append('stop').attr('offset','0%').attr('stop-color', personColor(l.source));
      grad.append('stop').attr('offset','100%').attr('stop-color', personColor(l.target));
    });

    var linkSel = linkGroup.selectAll('g.edge').data(links, function(d){ return d.source+'-'+d.target; });
    var linkEnter = linkSel.enter().append('g')
      .attr('class', function(d){ return 'edge ' + ((d.source==='you'||d.target==='you') ? 'owner-edge' : 'peer-edge'); })
      .style('opacity', function(d){ return (d.source==='you'||d.target==='you') ? 1 : 0; });

    linkEnter.append('path')
      .attr('class','edge-data')
      .attr('stroke-dasharray','2 11')
      .style('stroke', function(d){ return 'url(#edge-grad-'+d.eid+')'; });

    linkEnter.append('path')
      .attr('class','edge-path')
      .style('fill','none')
      .attr('stroke-width', function(d){ return (d.source==='you'||d.target==='you') ? 1.6 : 1.4; })
      .style('opacity', function(d){ return (d.source==='you'||d.target==='you') ? 0.6 : 0.7; });

    linkEnter.append('rect').attr('class','edge-marker edge-end-a').attr('width',6).attr('height',6)
      .style('fill', function(d){ return personColor(d.source); });
    linkEnter.append('rect').attr('class','edge-marker edge-end-b').attr('width',6).attr('height',6)
      .style('fill', function(d){ return personColor(d.target); });
    linkEnter.append('rect').attr('class','edge-marker edge-junction').attr('width',5).attr('height',5);

    var nodeSel = nodeGroup.selectAll('g.person').data(nodes, function(d){ return d.id; });
    var enter = nodeSel.enter().append('g')
      .attr('class','person')
      .style('cursor','pointer')
      .style('opacity', 0)
      .call(d3.drag().clickDistance(5).on('start', dragstarted).on('drag', dragged).on('end', dragended))
      .on('click', function(event,d){ event.stopPropagation(); hideHoverCard(); panTo(d.id, false); })
      .on('mouseenter', function(event,d){ hoveredId = d.id; refreshTransforms(); highlightEgo(d.id); showHoverCard(d); })
      .on('mouseleave', function(){ hoveredId = null; refreshTransforms(); clearHighlight(); hideHoverCard(); });

    enter.append('circle').attr('class','ring');
    enter.append('circle').attr('class','main');
    var avatarFO = enter.filter(function(d){ return d.id==='you'; })
      .append('foreignObject').attr('class','avatar-fo')
      .attr('x', function(d){ return -nodeRadius(d); })
      .attr('y', function(d){ return -nodeRadius(d); })
      .attr('width', function(d){ return 2*nodeRadius(d); })
      .attr('height', function(d){ return 2*nodeRadius(d); })
      .style('pointer-events','none').style('overflow','visible');
    avatarFO.append('xhtml:div')
      .style('width','100%').style('height','100%').style('border-radius','50%')
      .style('background-image', 'url('+avatarUrl('you')+')')
      .style('background-size','cover').style('background-position','center');
    enter.append('text').attr('class','label')
      .attr('text-anchor','middle')
      .style('font-size','9px').style('fill', THEMES[currentTheme].textSecondary).style('pointer-events','none');

    enter.select('circle.ring')
      .attr('r', function(d){ return nodeRadius(d)+4; })
      .style('fill','none').style('stroke', THEMES[currentTheme].textPrimary)
      .attr('stroke-width',1.3);

    enter.select('circle.main')
      .attr('r', function(d){ return nodeRadius(d); })
      .style('fill', function(d){ return personColor(d.id); })
      .style('stroke', THEMES[currentTheme].canvasBg).attr('stroke-width',2.5);

    enter.select('text.label')
      .attr('y', function(d){ return nodeRadius(d)+14; })
      .text(function(d){ return d.name.split(' ')[0].toLowerCase(); });

    var badgeEnter = enter.filter(function(d){ return !!db[d.id].endorsement; })
      .append('g').attr('class','endorse-badge')
      .attr('transform', function(d){ var off = nodeRadius(d)*0.72; return 'translate('+off+','+(-off)+')'; })
      .style('pointer-events','none');
    badgeEnter.append('circle').attr('r',6).style('fill','#F5C518').style('stroke', function(){ return THEMES[currentTheme].canvasBg; }).attr('stroke-width',1.5);
    badgeEnter.append('polygon').attr('points', starPoints(3.2,1.4)).style('fill','#8A6100');

    var particleEnter = enter.append('g').attr('class','dither-particles').style('pointer-events','none');
    particleEnter.each(function(d){
      var g = d3.select(this);
      var C = personColor(d.id);
      var count = 9;
      for(var i=0;i<count;i++){
        var angle = Math.random()*Math.PI*2;
        var baseR = nodeRadius(d) + 2 + Math.random()*3;
        var travel = 9 + Math.random()*10;
        var ex = (Math.cos(angle)*travel).toFixed(1)+'px';
        var ey = (Math.sin(angle)*travel).toFixed(1)+'px';
        var size = 1.3 + Math.random()*1.5;
        g.append('rect')
          .attr('class','dither-dot')
          .attr('x', Math.cos(angle)*baseR - size/2)
          .attr('y', Math.sin(angle)*baseR - size/2)
          .attr('width', size).attr('height', size)
          .style('fill', C)
          .style('--ex', ex).style('--ey', ey)
          .style('animation-delay', (Math.random()*0.6).toFixed(2)+'s');
      }
    });

    enter.each(function(d,i){
      var el = this;
      setTimeout(function(){ d3.select(el).style('opacity', 1); }, i*45);
    });

    refreshTransforms();
    updateLinks();
    refreshRing();
  }

  function refreshRing(){
    nodeGroup.selectAll('g.person').select('circle.ring')
      .style('opacity', function(d){ return d.id===focusedId ? 0.6 : 0; })
      .classed('ring-focused', function(d){ return d.id===focusedId; });
  }

  var hoverCard = document.getElementById('hover-card');

  function showHoverCard(d){
    var t = THEMES[currentTheme];
    var C = personColor(d.id);
    var rows = '';
    if(d.website) rows += '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:'+t.textPrimary+';margin-top:6px;">'+icon('external',12)+'<span>'+d.website+'</span></div>';
    if(d.twitter) rows += '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:'+t.textSecondary+';margin-top:4px;">'+icon('chat',12)+'<span>@'+d.twitter+'</span></div>';
    if(d.github)  rows += '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:'+t.textSecondary+';margin-top:4px;">'+icon('code',12)+'<span>'+d.github+'</span></div>';
    if(d.endorsement) rows += '<div class="wm-label" style="display:flex;align-items:center;gap:6px;color:#8A6100;margin-top:10px;">'+starIcon(12)+'<span>Endorses Isaiah</span></div>';
    if(d.id==='you' && endorserIds.length>0) rows += '<div class="wm-label" style="display:flex;align-items:center;gap:6px;color:#8A6100;margin-top:10px;">'+starIcon(12)+'<span>'+endorserIds.length+' endorsement'+(endorserIds.length===1?'':'s')+'</span></div>';

    hoverCard.style.background = t.panelBg;
    hoverCard.style.border = 'none';
    hoverCard.style.borderRadius = '14px';
    hoverCard.style.boxShadow = '0 8px 24px '+t.shadow;
    var relationshipHtml = d.relationship
      ? '<p style="font-size:11.5px;line-height:1.25;color:'+C+';font-weight:700;margin:8px 0 0;">'+d.relationship+'</p>'
      : '';
    var bioHtml = d.id==='you' ? '<p style="font-size:11px;line-height:1.5;color:'+t.textSecondary+';margin:8px 0 0;">'+d.bio+'</p>' : '';
    hoverCard.innerHTML =
      '<div style="display:flex;align-items:center;gap:7px;">'+
        '<span style="width:8px;height:8px;border-radius:2px;transform:rotate(45deg);background:'+C+';flex-shrink:0;"></span>'+
        '<span style="font-weight:600;font-size:13px;letter-spacing:-0.01em;color:'+t.textPrimary+';">'+d.name+'</span>'+
      '</div>'+
      relationshipHtml+
      bioHtml+
      rows;

    hoverCard.style.display = 'block';
    var w = hoverCard.offsetWidth, h = hoverCard.offsetHeight;
    var sx = d.x*zoomK + currentTx, sy = d.y*zoomK + currentTy;

    var neigh = adjacency[d.id] || {};
    var avgX = 0, avgY = 0, count = 0;
    Object.keys(neigh).forEach(function(nid){
      var n = nodeById[nid];
      if(n){ avgX += n.x; avgY += n.y; count++; }
    });
    var awayX = 1, awayY = 0;
    if(count > 0){
      avgX /= count; avgY /= count;
      awayX = d.x - avgX; awayY = d.y - avgY;
      var mag = Math.sqrt(awayX*awayX + awayY*awayY) || 1;
      awayX /= mag; awayY /= mag;
    }

    var left, top;
    if(Math.abs(awayX) >= Math.abs(awayY)){
      left = awayX >= 0 ? sx + 26 : sx - 26 - w;
      top = sy - h/2;
    } else {
      left = sx - w/2;
      top = awayY >= 0 ? sy + 22 : sy - 22 - h;
    }
    left = clamp(left, 8, width - w - 8);
    top = clamp(top, 8, height - h - 8);
    hoverCard.style.left = left+'px';
    hoverCard.style.top = top+'px';
    requestAnimationFrame(function(){ hoverCard.classList.add('show'); });
  }

  function hideHoverCard(){
    hoverCard.classList.remove('show');
    hoverCard.style.display = 'none';
  }

  function isOwnerEdge(l){ return l.source==='you' || l.target==='you'; }

  function highlightEgo(id){
    var neigh = adjacency[id] || {};
    nodeGroup.selectAll('g.person')
      .style('opacity', function(n){ return (n.id===id || neigh[n.id]) ? 1 : 0.3; })
      .style('filter', function(n){ return (n.id===id || neigh[n.id]) ? 'none' : 'blur(2px)'; });
    linkGroup.selectAll('g.edge')
      .classed('active', function(l){ return (l.source===id||l.target===id); })
      .style('opacity', function(l){
        if(l.source===id || l.target===id) return 1;
        return isOwnerEdge(l) ? 0.18 : 0;
      });
  }
  function clearHighlight(){
    nodeGroup.selectAll('g.person').style('opacity', 1).style('filter','none');
    linkGroup.selectAll('g.edge').classed('active', false)
      .style('opacity', function(l){ return isOwnerEdge(l) ? 1 : 0; });
  }

  function dragstarted(event,d){ hideHoverCard(); }
  function dragged(event,d){
    if(!d._raised){ d3.select(this).raise(); d._raised = true; }
    d.x = event.x; d.y = event.y;
    refreshTransforms();
    updateLinks();
  }
  function dragended(event,d){
    d._raised = false;
    var col = Math.max(0, Math.round((d.x - GRID.offsetX) / GRID.spacingX));
    var row = Math.max(0, Math.round((d.y - GRID.offsetY) / GRID.spacingY));
    animateNodeTo(d, GRID.offsetX + col*GRID.spacingX, GRID.offsetY + row*GRID.spacingY);
  }

  function runMomentum(){
    velX *= 0.92; velY *= 0.92;
    if(Math.abs(velX) < 0.4 && Math.abs(velY) < 0.4){ momentumRAF = null; return; }
    currentTx = clamp(currentTx+velX, txMin, txMax);
    currentTy = clamp(currentTy+velY, tyMin, tyMax);
    applyTransform(currentTx, currentTy);
    momentumRAF = requestAnimationFrame(runMomentum);
  }

  var bgDrag = d3.drag()
    .on('start', function(){
      if(momentumRAF){ cancelAnimationFrame(momentumRAF); momentumRAF=null; }
      velX = 0; velY = 0;
      hideHoverCard();
      bgRect.style('cursor','grabbing');
    })
    .on('drag', function(event){
      velX = event.dx; velY = event.dy;
      currentTx = clamp(currentTx+event.dx, txMin, txMax);
      currentTy = clamp(currentTy+event.dy, tyMin, tyMax);
      applyTransform(currentTx, currentTy);
    })
    .on('end', function(){
      bgRect.style('cursor','grab');
      if(Math.abs(velX) > 1 || Math.abs(velY) > 1){ momentumRAF = requestAnimationFrame(runMomentum); }
    });
  bgRect.call(bgDrag);

  function panTo(id, instant, skipPanel){
    if(momentumRAF){ cancelAnimationFrame(momentumRAF); momentumRAF=null; }
    focusedId = id;
    refreshRing();
    var node = nodeById[id];
    if(node){
      var targetX = clamp(width/2 - node.x*zoomK, txMin, txMax);
      var targetY = clamp(height/2 - node.y*zoomK, tyMin, tyMax);
      if(instant){
        currentTx = targetX; currentTy = targetY;
        applyTransform(targetX, targetY);
      } else {
        var fromX = currentTx, fromY = currentTy, start = null, duration = 550;
        currentTx = targetX; currentTy = targetY;
        requestAnimationFrame(function step(ts){
          if(!start) start = ts;
          var tt = Math.min((ts-start)/duration, 1);
          var eased = easeOutBack(tt);
          applyTransform(fromX+(targetX-fromX)*eased, fromY+(targetY-fromY)*eased);
          if(tt<1) requestAnimationFrame(step);
        });
      }
    }
    if(!skipPanel) openPanel(id);
  }

  function setupDragScroll(row){
    if(!row) return;
    var isDown = false, startX = 0, startScroll = 0;
    var targetScroll = row.scrollLeft;
    var scrollRAF = null;

    function animateScroll(){
      var current = row.scrollLeft;
      var diff = targetScroll - current;
      if(Math.abs(diff) < 0.5){ row.scrollLeft = targetScroll; scrollRAF = null; return; }
      row.scrollLeft = current + diff * 0.18;
      scrollRAF = requestAnimationFrame(animateScroll);
    }

    row.addEventListener('mousedown', function(e){
      if(scrollRAF){ cancelAnimationFrame(scrollRAF); scrollRAF = null; }
      isDown = true; row.style.cursor = 'grabbing';
      startX = e.pageX; startScroll = row.scrollLeft;
      targetScroll = row.scrollLeft;
    });
    row.addEventListener('mousemove', function(e){
      if(!isDown) return;
      e.preventDefault();
      row.scrollLeft = startScroll - (e.pageX - startX);
      targetScroll = row.scrollLeft;
    });
    row.addEventListener('mouseup', function(){ isDown = false; row.style.cursor = 'grab'; targetScroll = row.scrollLeft; });
    row.addEventListener('mouseleave', function(){ isDown = false; row.style.cursor = 'grab'; });

    row.addEventListener('wheel', function(e){
      if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){
        e.preventDefault();
        var maxScroll = row.scrollWidth - row.clientWidth;
        targetScroll = clamp(targetScroll + e.deltaY, 0, maxScroll);
        if(!scrollRAF) scrollRAF = requestAnimationFrame(animateScroll);
      }
    }, { passive: false });
  }

  function pillHTML(color, t){
    return '<span class="wm-pill" style="background:linear-gradient(180deg,'+color+' 0%,'+mixHex(color, t.panelBg, 0.35)+' 60%,'+t.chip+' 100%);"></span>';
  }
  function wmLabel(t, text, extra){
    return '<div style="display:flex;align-items:center;gap:7px;margin:0 0 7px;color:'+t.textMuted+';" ><span class="wm-label">'+text+'</span>'+(extra||'')+'</div>';
  }
  function endorsementBlock(t, label, quote, color){
    return wmLabel(t, label, starIcon(11))+
      '<div style="background:'+t.surface1+';border-radius:10px;padding:11px 13px;font-size:12.5px;line-height:1.5;color:'+t.textPrimary+';margin-bottom:16px;">\u201C'+quote+'\u201D</div>';
  }

  function openPanel(id){
    var person = db[id];
    var t = THEMES[currentTheme];
    var roleLabel = person.role==='owner' ? 'Portfolio owner' : (person.role==='designer' ? 'Designer' : 'Developer');
    var C = personColor(id);
    var badge = { bg: mixHex(C, t.panelBg, 0.18), text: mixHex(C, t.textPrimary, 0.6) };
    var banner = mixHex(C, t.panelBg, 0.32);
    var avatar = C;
    var avatarImg = avatarUrl(id);
    var workColors = [ mixHex(C, t.panelBg, 0.22), mixHex(C, t.panelBg, 0.55), C ];

    var linkRows = '';
    if(person.website) linkRows += '<a href="https://'+person.website+'" target="_blank" class="profile-link" style="display:flex;align-items:center;gap:8px;padding:8px 6px;color:'+t.textPrimary+';text-decoration:none;font-size:13px;">'+icon('external',16)+person.website+'</a>';
    if(person.twitter) linkRows += '<a href="https://twitter.com/'+person.twitter+'" target="_blank" class="profile-link" style="display:flex;align-items:center;gap:8px;padding:8px 6px;color:'+t.textPrimary+';text-decoration:none;font-size:13px;">'+icon('chat',16)+'@'+person.twitter+'</a>';
    if(person.github)  linkRows += '<a href="https://github.com/'+person.github+'" target="_blank" class="profile-link" style="display:flex;align-items:center;gap:8px;padding:8px 6px;color:'+t.textPrimary+';text-decoration:none;font-size:13px;">'+icon('code',16)+person.github+'</a>';

    var tileStyle = 'flex:0 0 62%;aspect-ratio:4/3;overflow:hidden;border-radius:10px;pointer-events:none;';
    var showcase = '';
    if(id !== 'you'){
      showcase =
        '<div style="padding:0 18px;">'+wmLabel(t,'Recent work')+'</div>'+
        '<div id="showcase-row" class="showcase-row" style="display:flex;gap:4px;overflow-x:auto;padding:0 18px 20px;margin:0;cursor:grab;">'+
          '<div style="'+tileStyle+'">'+thumbnailSVG('A', workColors)+'</div>'+
          '<div style="'+tileStyle+'position:relative;">'+thumbnailSVG('D', workColors)+
            '<span style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.55);color:#fff;font-size:9px;padding:1px 5px;border-radius:4px;letter-spacing:0.03em;">GIF</span></div>'+
          '<div style="'+tileStyle+'">'+thumbnailSVG('C', workColors)+'</div>'+
        '</div>';
    }

    var endorsementHtml = person.endorsement ? endorsementBlock(t, 'Endorses Isaiah Trotter', person.endorsement, C) : '';

    var allEndorsementsHtml = '';
    if(id==='you' && endorserIds.length>0){
      var items = endorserIds.map(function(eid){
        var ep = db[eid], ecolor = personColor(eid);
        return '<div style="display:flex;gap:10px;padding:13px 0;border-top:1px solid '+t.border+';">'+
          '<div style="width:26px;height:26px;border-radius:50%;flex-shrink:0;background-color:'+ecolor+';background-image:url('+avatarUrl(eid)+');background-size:cover;background-position:center;"></div>'+
          '<div style="flex:1;min-width:0;">'+
            '<p class="wm-label" style="margin:2px 0 5px;color:'+t.textPrimary+';">'+ep.name+'</p>'+
            '<p style="font-size:12.5px;line-height:1.5;margin:0;color:'+t.textSecondary+';">\u201C'+ep.endorsement+'\u201D</p>'+
          '</div>'+
        '</div>';
      }).join('');
      allEndorsementsHtml =
        '<div style="padding:2px 18px 10px;">'+
          wmLabel(t, 'Endorsed by', starIcon(11)) +
          items +
        '</div>';
    }

    var sunrise =
      'radial-gradient(120% 130% at 22% 118%, '+mixHex('#F5C518', C, 0.55)+'CC 0%, transparent 52%),'+
      'radial-gradient(110% 120% at 82% 108%, '+C+'B3 0%, transparent 58%),'+
      'linear-gradient(158deg, #C9D8EA 0%, '+mixHex(C, '#C9D8EA', 0.35)+' 100%)';

    var relBlock = person.relationship
      ? '<p style="font-size:12.5px;line-height:1.3;color:'+C+';font-weight:700;margin:0 0 18px;">'+person.relationship+'</p>'
      : '';

    panelContent.innerHTML =
      '<div style="position:relative;height:104px;">'+
        '<div style="position:absolute;inset:0;background:'+sunrise+';"></div>'+
        '<button id="close-panel" type="button" style="position:absolute;top:12px;right:12px;width:26px;height:26px;min-width:26px;min-height:26px;padding:0;margin:0;line-height:1;box-sizing:border-box;border-radius:50%;background:rgba(0,0,0,0.4);color:#fff;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2;">'+icon('x',15)+'</button>'+
        '<div style="position:absolute;left:18px;top:72px;width:64px;height:64px;border-radius:50%;background-color:'+avatar+';background-image:url('+avatarImg+');background-size:cover;background-position:center;z-index:2;box-shadow:0 0 0 3px '+t.panelBg+';"></div>'+
      '</div>'+
      '<div style="padding:44px 18px 0 18px;">'+
        '<div style="margin-bottom:10px;">'+
          '<span class="wm-label" style="color:'+t.textMuted+';">'+roleLabel+'</span>'+
        '</div>'+
        '<p style="font-weight:400;font-size:25px;letter-spacing:-0.02em;line-height:1.1;margin:0 0 3px;color:'+t.textPrimary+';font-family:-apple-system,BlinkMacSystemFont,sans-serif;">'+person.name+'</p>'+
        '<p style="font-size:12.5px;color:'+t.textSecondary+';margin:0 0 20px;">'+person.title+' &middot; '+person.bio+'</p>'+
        relBlock +
        endorsementHtml +
        '<div style="border-top:1px solid '+t.border+';padding:16px 0 20px;">'+linkRows+'</div>'+
      '</div>'+
      showcase +
      allEndorsementsHtml;

    document.getElementById('close-panel').addEventListener('click', closePanel);
    setupDragScroll(document.getElementById('showcase-row'));

    panel.style.transform = 'translateX(0)';
    panel.style.boxShadow = '-10px 0 30px '+t.shadow;
    backdrop.classList.add('show');
  }

  function closePanel(){
    panel.style.transform = 'translateX(100%)';
    panel.style.boxShadow = 'none';
    backdrop.classList.remove('show');
  }

  backdrop.addEventListener('click', closePanel);

  document.getElementById('theme-toggle-btn').addEventListener('click', function(e){
    e.stopPropagation();
    applyTheme(currentTheme==='light' ? 'dark' : 'light');
  });

  /* bounded scroll-wheel zoom, anchored to the canvas center */
  container.addEventListener('wheel', function(e){
    if(panel.contains(e.target)) return;
    e.preventDefault();
    hideHoverCard();
    var oldK = zoomK;
    zoomK = clamp(zoomK * Math.exp(-e.deltaY * 0.0015), ZOOM_MIN, ZOOM_MAX);
    if(zoomK === oldK) return;
    var cx = width/2, cy = height/2;
    currentTx = cx - (cx - currentTx) * (zoomK/oldK);
    currentTy = cy - (cy - currentTy) * (zoomK/oldK);
    computeBounds();
    currentTx = clamp(currentTx, txMin, txMax);
    currentTy = clamp(currentTy, tyMin, tyMax);
    applyTransform(currentTx, currentTy);
  }, { passive: false });

  assignGridPositions();
  render();
  applyTheme('light');
  computeBounds();
  panTo('you', true, true);

  /* ---- floating launcher expand/collapse ---- */
  function expandWidget(){ widgetRoot.classList.add('expanded'); }
  function collapseWidget(){ widgetRoot.classList.remove('expanded'); }

  launcherBtn.addEventListener('pointerup', function(e){ e.stopPropagation(); expandWidget(); });
  document.getElementById('widget-close-btn').addEventListener('click', function(e){ e.stopPropagation(); collapseWidget(); });

  /* ---- resize the canvas by dragging the top-left handle ---- */
  var panelExpandedEl = document.querySelector('.panel-expanded');

  function resizeCanvas(newW, newH){
    width = newW; height = newH;
    bgRect.attr('width', width).attr('height', height);
    computeBounds();
    currentTx = clamp(currentTx, txMin, txMax);
    currentTy = clamp(currentTy, tyMin, tyMax);
    applyTransform(currentTx, currentTy);
  }

  var suppressOutsideClick = false;

  function startResize(clientX, clientY){
    hideHoverCard();
    var startX = clientX, startY = clientY;
    var startW = panelExpandedEl.offsetWidth, startH = panelExpandedEl.offsetHeight;
    var maxW = Math.min(720, window.innerWidth - 40);
    var maxH = Math.min(820, window.innerHeight - 40);

    function move(cx, cy){
      var dx = cx - startX, dy = cy - startY;
      var newW = clamp(startW - dx, 340, maxW);
      var newH = clamp(startH - dy, 420, maxH);
      panelExpandedEl.style.width = newW+'px';
      panelExpandedEl.style.height = newH+'px';
      resizeCanvas(newW, newH);
    }
    function finishResize(){
      suppressOutsideClick = true;
      setTimeout(function(){ suppressOutsideClick = false; }, 60);
    }
    function onMouseMove(e){ move(e.clientX, e.clientY); }
    function onMouseUp(){
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      finishResize();
    }
    function onTouchMove(e){ move(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }
    function onTouchEnd(){
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      finishResize();
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive:false });
    document.addEventListener('touchend', onTouchEnd);
  }

  document.getElementById('resize-handle').addEventListener('mousedown', function(e){
    e.preventDefault(); e.stopPropagation();
    startResize(e.clientX, e.clientY);
  });
  document.getElementById('resize-handle').addEventListener('touchstart', function(e){
    e.stopPropagation();
    startResize(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive:true });

  function syncMobileState(){
    if(window.innerWidth <= 480){
      panelExpandedEl.style.width = '';
      panelExpandedEl.style.height = '';
      requestAnimationFrame(function(){
        resizeCanvas(container.clientWidth, container.clientHeight);
      });
    }
  }
  window.addEventListener('resize', syncMobileState);

  document.addEventListener('click', function(e){
    if(suppressOutsideClick) return;
    if(widgetRoot.classList.contains('expanded') && !widgetRoot.contains(e.target)){
      collapseWidget();
    }
  });
})();

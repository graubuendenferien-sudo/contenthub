/* Contenthub: Touren entlang der Wege zeichnen ("Einrasten").
   Liest das Wegenetz (OpenStreetMap-Wege) aus den Vektorkacheln des Kartenservers (topo.pmtiles, Ebene "roads"),
   baut daraus im Browser ein Netz und sucht zwischen zwei Klicks den kuerzesten Weg.
   Wird nach app.js, map-config.js und hub-ext.js geladen. Ohne Wegenetz oder bei zu kleinem Massstab
   bleibt das Zeichnen wie bisher (gerade Linie). */
(function(){
  'use strict';

  /* ---------- Reiner Rechenteil (ohne Browser testbar) ---------- */
  const KX=lat=>Math.cos(lat*Math.PI/180)*111320,KY=110540;
  function dist(a,b){const k=KX((a.y+b.y)/2),dx=(a.x-b.x)*k,dy=(a.y-b.y)*KY;return Math.sqrt(dx*dx+dy*dy)}
  const EXCL=new Set(['rail','ferry','highway','aerialway','other_rail']);
  const FACTOR={other:1,path:1,minor_road:1.1,medium_road:1.4,major_road:2};

  function Graph(){this.xs=[];this.ys=[];this.adj=[];this.segs=[];this.grid=new Map()}
  Graph.prototype.node=function(x,y){
    const cs=2e-5,cx=Math.floor(x/cs),cy=Math.floor(y/cs);
    for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){
      const l=this.grid.get((cx+i)+'_'+(cy+j));
      if(l)for(let q=0;q<l.length;q++){const n=l[q];if(Math.abs(this.xs[n]-x)<1.5e-5&&Math.abs(this.ys[n]-y)<1e-5)return n}
    }
    const n=this.xs.length;this.xs.push(x);this.ys.push(y);this.adj.push([]);
    const key=cx+'_'+cy;let l=this.grid.get(key);if(!l){l=[];this.grid.set(key,l)}l.push(n);return n;
  };
  Graph.prototype.line=function(coords,f){
    let prev=-1;
    for(let i=0;i<coords.length;i++){
      const n=this.node(coords[i][0],coords[i][1]);
      if(prev>=0&&n!==prev){
        const w=dist({x:this.xs[prev],y:this.ys[prev]},{x:this.xs[n],y:this.ys[n]})*f;
        this.adj[prev].push([n,w]);this.adj[n].push([prev,w]);this.segs.push([prev,n,f]);
      }
      prev=n;
    }
  };
  /* Naechster Punkt auf einer Wegstrecke, innerhalb maxM Metern */
  Graph.prototype.nearest=function(p,maxM){
    let best=null;const k=KX(p.y);
    for(let i=0;i<this.segs.length;i++){
      const s=this.segs[i],ax=this.xs[s[0]],ay=this.ys[s[0]],bx=this.xs[s[1]],by=this.ys[s[1]];
      const ex=(bx-ax)*k,ey=(by-ay)*KY,px=(p.x-ax)*k,py=(p.y-ay)*KY,l2=ex*ex+ey*ey;
      let t=l2>0?(px*ex+py*ey)/l2:0;t=Math.max(0,Math.min(1,t));
      const dx=px-t*ex,dy=py-t*ey,d=Math.sqrt(dx*dx+dy*dy);
      if(d<=maxM&&(!best||d<best.d))best={d,seg:i,t,x:ax+(bx-ax)*t,y:ay+(by-ay)*t};
    }
    return best;
  };
  function heapPush(h,v){h.push(v);let i=h.length-1;while(i>0){const p=(i-1)>>1;if(h[p][0]<=h[i][0])break;const t=h[p];h[p]=h[i];h[i]=t;i=p}}
  function heapPop(h){const top=h[0],last=h.pop();if(h.length){h[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<h.length&&h[l][0]<h[m][0])m=l;if(r<h.length&&h[r][0]<h[m][0])m=r;if(m===i)break;const t=h[m];h[m]=h[i];h[i]=t;i=m}}return top}
  Graph.prototype.dijkstra=function(s,t){
    const n=this.xs.length,d=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),h=[];
    d[s]=0;heapPush(h,[0,s]);
    while(h.length){
      const [du,u]=heapPop(h);if(du>d[u])continue;if(u===t)break;
      const a=this.adj[u];for(let i=0;i<a.length;i++){const v=a[i][0],nd=du+a[i][1];if(nd<d[v]){d[v]=nd;prev[v]=u;heapPush(h,[nd,v])}}
    }
    if(d[t]===Infinity)return null;
    const path=[];for(let u=t;u!==-1;u=prev[u])path.push(u);return path.reverse();
  };
  /* Weg von p nach q; Rueckgabe: Punkte inkl. Start und Ziel (auf den Weg projiziert) oder null */
  Graph.prototype.route=function(p,q,maxM){
    const sp=this.nearest(p,maxM),sq=sp&&this.nearest(q,maxM);
    if(!sp||!sq)return null;
    const N0=this.xs.length,touched=new Set();
    const addV=(sn)=>{
      const s=this.segs[sn.seg],v=this.xs.length;this.xs.push(sn.x);this.ys.push(sn.y);this.adj.push([]);
      [s[0],s[1]].forEach(r=>{const w=dist({x:this.xs[r],y:this.ys[r]},{x:sn.x,y:sn.y})*s[2];this.adj[v].push([r,w]);this.adj[r].push([v,w]);touched.add(r)});
      return v;
    };
    const vs=addV(sp),vt=addV(sq);
    if(sp.seg===sq.seg){const f=this.segs[sp.seg][2],w=dist(sp,sq)*f;this.adj[vs].push([vt,w]);this.adj[vt].push([vs,w])}
    const path=this.dijkstra(vs,vt);
    const out=path?path.map(i=>({x:this.xs[i],y:this.ys[i]})):null;
    this.xs.length=N0;this.ys.length=N0;this.adj.length=N0;
    touched.forEach(r=>{this.adj[r]=this.adj[r].filter(e=>e[0]<N0)});
    return out;
  };
  function addFeatures(g,features){
    for(const f of features){
      const p=f.properties||{},kind=p.kind;
      if(EXCL.has(kind))continue;
      const fac=FACTOR[kind]||1.2,gm=f.geometry;if(!gm)continue;
      if(gm.type==='LineString')g.line(gm.coordinates,fac);
      else if(gm.type==='MultiLineString')gm.coordinates.forEach(c=>g.line(c,fac));
    }
    return g;
  }
  const core={Graph,addFeatures,dist};

  if(typeof S==='undefined'||typeof M==='undefined'||typeof ACT==='undefined'||typeof trackChanged==='undefined'){
    if(typeof module!=='undefined')module.exports=core;
    return;
  }

  /* ---------- Einbindung in den Hub ---------- */
  const SN=window.SNAP={on:true,minZoom:13,tolPx:24,_core:core};
  try{const v=localStorage.getItem('hub.snap');if(v!==null)SN.on=v==='1'}catch(e){}

  let lastToast=0;
  function say(t){const n=Date.now();if(n-lastToast<4000)return;lastToast=n;toast(t)}
  const isTour=()=>!!(S.draft&&S.draft.type==='tour');
  const active=()=>SN.on&&M.ready&&M.server&&M.map;
  function tolM(){const m=M.map,z=m.getZoom(),lat=m.getCenter().lat;return SN.tolPx*40075016.686*Math.cos(lat*Math.PI/180)/(512*Math.pow(2,z))}
  function buildGraph(){
    try{const fs=M.map.querySourceFeatures('topo',{sourceLayer:'roads'});if(!fs||!fs.length)return null;
      const g=addFeatures(new Graph(),fs);return g.segs.length?g:null}
    catch(e){console.warn('Wegenetz nicht lesbar',e);return null}
  }
  const pt=(p,a)=>{const o={x:+(+p.x).toFixed(6),y:+(+p.y).toFixed(6),z:null};if(a)o.a=true;return o};
  /* Punkte von "from" (ohne) bis "to" (mit), dem Weg folgend oder gerade */
  function leg(g,from,to){
    if(g){
      const r=g.route(from,to,tolM());
      if(r&&r.length>1){
        const pts=simplify(r.map(p=>({x:p.x,y:p.y})),3);
        const out=pts.slice(1).map(p=>pt(p));out[out.length-1].a=true;return{pts:out,snapped:true};
      }
    }
    return{pts:[pt(to,true)],snapped:false};
  }
  function snapPoint(g,p){const n=g&&g.nearest(p,tolM());return n?{x:n.x,y:n.y}:p}

  /* ---- neu geklickte Punkte abfangen ---- */
  let seen=0,seenId=null,queue=[],working=false;
  const origSD=syncDraft;
  syncDraft=function(){
    origSD();
    const D=S.draft;if(!D||D.type!=='tour')return;
    seen=D.track.length;seenId=D.id;
    if(!M.ready||!D.track.some(p=>p.a))return;
    /* Nur Ankerpunkte als ziehbare Punkte zeigen, nicht jeden Wegknick */
    M.vx.forEach(m=>m.remove());M.vx=[];
    const tk=D.track;
    tk.forEach((p,i)=>{
      if(!p.a)return;
      const first=i===0,lastp=i===tk.length-1,el=document.createElement('div');
      el.className='vx'+(first?' a':lastp?' z':'');el.title=first?'Start':lastp?'Ziel':'Wegpunkt (ziehen verschiebt, Route folgt dem Weg)';
      el.addEventListener('click',e=>e.stopPropagation());
      const m=new maplibregl.Marker({element:el,draggable:true}).setLngLat([p.x,p.y]).addTo(M.map);
      m.on('dragend',()=>moveAnchor(p,m.getLngLat()));M.vx.push(m);
    });
  };
  const origRE=renderEditor;
  renderEditor=function(keep){
    origRE(keep);
    const D=S.draft;if(D&&D.type==='tour'){seen=D.track.length;seenId=D.id;decorate()}
  };
  const origTC=trackChanged;
  trackChanged=function(keepWp){
    const D=S.draft;
    if(D&&D.type==='tour'&&S.drawing&&active()){
      const tk=D.track,n=tk.length;
      if(seenId===D.id&&n===seen+1&&!tk[n-1].a){
        queue.push({D,p:tk.pop()});pump();return;
      }
    }
    return origTC(keepWp);
  };
  async function pump(){
    if(working)return;working=true;
    try{
      while(queue.length){
        const {D,p}=queue.shift();
        if(S.draft!==D)continue;
        const tk=D.track;
        if(M.map.getZoom()<SN.minZoom){say('Bitte näher heranzoomen (ab Zoom '+SN.minZoom+'), dann folgt die Route den Wegen. Der Punkt wurde ohne Einrasten gesetzt.');tk.push(pt(p,true));origTC();continue}
        const g=buildGraph();
        if(!g){say('Das Wegenetz ist hier noch nicht geladen. Der Punkt wurde ohne Einrasten gesetzt.');tk.push(pt(p,true));origTC();continue}
        if(!tk.length){const s=snapPoint(g,p);tk.push(pt(s,true));origTC();continue}
        const r=leg(g,tk[tk.length-1],p);
        if(!r.snapped)say('Kein Weg zwischen den beiden Punkten gefunden. Es wurde eine gerade Linie gesetzt.');
        r.pts.forEach(x=>tk.push(x));origTC();
      }
    }finally{working=false}
  }

  /* ---- Ankerpunkt verschieben: angrenzende Abschnitte neu berechnen ---- */
  async function moveAnchor(anchor,ll){
    const D=S.draft;if(!D||D.type!=='tour')return;
    const tk=D.track,i=tk.indexOf(anchor);if(i<0)return;
    let pi=-1,ni=-1;
    for(let j=i-1;j>=0;j--)if(tk[j].a){pi=j;break}
    for(let j=i+1;j<tk.length;j++)if(tk[j].a){ni=j;break}
    let np={x:ll.lng,y:ll.lat},g=null;
    if(active()&&M.map.getZoom()>=SN.minZoom){g=buildGraph();np=snapPoint(g,np)}
    const head=tk.slice(0,pi+1);let mid=[],tail=tk.slice(ni<0?i+1:ni+1);
    if(pi>=0)mid=mid.concat(leg(g,tk[pi],np).pts);else mid=[pt(np,true)];
    if(ni>=0)mid=mid.concat(leg(g,mid[mid.length-1],tk[ni]).pts);
    if(S.draft!==D)return;
    D.track=head.concat(mid,tail);
    trackChanged(true);
  }

  /* ---- Rueckgaengig und "Zum Start schliessen" ---- */
  const origUndo=ACT.tundo,origLoop=ACT.tloop;
  ACT.tundo=function(b,e){
    const tk=S.draft&&S.draft.track;
    if(!tk||!tk.some(p=>p.a))return origUndo(b,e);
    let j=tk.length-2;while(j>=0&&!tk[j].a)j--;
    tk.length=j+1;trackChanged();
  };
  ACT.tloop=async function(b,e){
    const D=S.draft,tk=D&&D.track;
    if(!tk||tk.length<3||!tk.some(p=>p.a)||!active())return origLoop(b,e);
    if(dist(tk[0],tk[tk.length-1])<=5)return;
    const g=M.map.getZoom()>=SN.minZoom?buildGraph():null;
    const r=leg(g,tk[tk.length-1],tk[0]);
    if(S.draft!==D)return;
    r.pts.forEach(x=>tk.push(x));
    if(!r.snapped)say('Kein Weg zurück zum Start gefunden. Es wurde eine gerade Linie gesetzt.');
    origTC();
  };

  /* ---- Schalter, Wegenetz-Anzeige, Hinweistext ---- */
  ACT.snaptog=function(){
    SN.on=!SN.on;try{localStorage.setItem('hub.snap',SN.on?'1':'0')}catch(e){}
    $$('[data-act="snaptog"]').forEach(x=>{x.setAttribute('aria-pressed',String(SN.on));x.textContent=SN.on?'Einrasten an Wegen: an':'Einrasten an Wegen: aus'});
    vis();if(typeof setMode==='function')setMode();
    toast(SN.on?'Die Route folgt beim Zeichnen den Wegen (ab Zoom '+SN.minZoom+').':'Einrasten aus: Punkte werden frei gesetzt.');
  };
  function decorate(){
    const d=$('[data-act="draw"]');if(!d||$('[data-act="snaptog"]'))return;
    const b=document.createElement('button');b.type='button';b.className='btn sm';b.dataset.act='snaptog';
    b.setAttribute('aria-pressed',String(SN.on));b.textContent=SN.on?'Einrasten an Wegen: an':'Einrasten an Wegen: aus';
    b.title='Die Route folgt beim Zeichnen den Wegen. Für Skitouren und Routen abseits der Wege ausschalten.';
    d.after(b);
  }
  function ensureLayer(){
    const m=M.map;if(!m||!m.getSource('topo')||m.getLayer('paths-hint'))return;
    try{m.addLayer({id:'paths-hint',type:'line',source:'topo','source-layer':'roads',minzoom:12,
      filter:['!',['in',['get','kind'],['literal',['rail','ferry','highway','aerialway','other_rail']]]],
      layout:{'line-cap':'round','line-join':'round',visibility:'none'},
      paint:{'line-color':'#d9480f','line-opacity':0.6,'line-width':['interpolate',['linear'],['zoom'],12,1,16,2.5],'line-dasharray':[2,1.5]}},
      m.getLayer('tours-case')?'tours-case':undefined);vis()}
    catch(e){console.warn('Wegenetz-Ebene nicht hinzugefügt',e)}
  }
  function vis(){
    const m=M.map;if(!m||!m.getLayer('paths-hint'))return;
    m.setLayoutProperty('paths-hint','visibility',(S.drawing&&isTour()&&SN.on)?'visible':'none');
  }
  const origSetMode=setMode;
  setMode=function(){
    origSetMode();vis();
    const h=$('#modeHint');
    if(h&&!h.hidden&&S.drawing&&isTour()&&SN.on)h.textContent='Zeichnen aktiv: Klick setzt den nächsten Punkt, die Route folgt den gestrichelten Wegen (ab Zoom '+SN.minZoom+') · Punkte lassen sich ziehen (Esc beendet)';
  };
  let hooked=null;
  setInterval(()=>{
    if(M.map&&M.map!==hooked){
      hooked=M.map;
      hooked.on('load',ensureLayer);hooked.on('styledata',()=>{if(!hooked.getLayer('paths-hint'))ensureLayer()});
      if(M.ready)ensureLayer();
    }
  },400);
})();

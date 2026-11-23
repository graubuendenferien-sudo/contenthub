/* Contenthub: Touren entlang der Wege zeichnen ("Einrasten"), Fassung 2.
   Wegnetz:
   1. swisstopo Basiskarte (swissTLM3D, Ebene "transportation") ueber den Kartenserver (/vt/…), falls verfuegbar.
   2. Sonst OpenStreetMap aus topo.pmtiles (Ebene "roads").
   Die Kacheln werden unabhaengig von der Kartenanzeige in voller Detailstufe geladen,
   Kachelraender und Abzweigungen werden verbunden, dann wird der guenstigste Weg gesucht.
   Wird nach app.js, map-config.js und hub-ext.js geladen. */
(function(){
  'use strict';

  /* ================= Rechenteil (ohne Browser testbar) ================= */
  const KX=lat=>Math.cos(lat*Math.PI/180)*111320,KY=110540;
  function dist(a,b){const k=KX((a.y+b.y)/2),dx=(a.x-b.x)*k,dy=(a.y-b.y)*KY;return Math.sqrt(dx*dx+dy*dy)}

  /* ---- Vektorkacheln (Mapbox Vector Tile) lesen, nur Linien einer Ebene ---- */
  const TD=typeof TextDecoder!=='undefined'?new TextDecoder():null;
  function R(b,p,e){this.b=b;this.p=p||0;this.e=e==null?b.length:e}
  R.prototype.v=function(){let r=0,s=1,c;do{c=this.b[this.p++];r+=(c&127)*s;s*=128}while(c&128);return r};
  R.prototype.skip=function(w){if(w===0)this.v();else if(w===1)this.p+=8;else if(w===2){const l=this.v();this.p+=l}else if(w===5)this.p+=4;else throw new Error('Kachel unlesbar')};
  R.prototype.str=function(){const l=this.v(),s=this.b.subarray(this.p,this.p+l);this.p+=l;return TD?TD.decode(s):Buffer.from(s).toString('utf8')};
  const zz=n=>n%2?-(n+1)/2:n/2;
  function readValue(b,p,e){
    const r=new R(b,p,e);let v=null;const dv=new DataView(b.buffer,b.byteOffset,b.byteLength);
    while(r.p<r.e){const t=r.v(),f=Math.floor(t/8),w=t&7;
      if(f===1)v=r.str();else if(f===2){v=dv.getFloat32(r.p,true);r.p+=4}else if(f===3){v=dv.getFloat64(r.p,true);r.p+=8}
      else if(f===4||f===5)v=r.v();else if(f===6)v=zz(r.v());else if(f===7)v=!!r.v();else r.skip(w)}
    return v;
  }
  function clipSeg(a,b,E){
    let t0=0,t1=1;const dx=b[0]-a[0],dy=b[1]-a[1];
    const P=[-dx,dx,-dy,dy],Q=[a[0],E-a[0],a[1],E-a[1]];
    for(let i=0;i<4;i++){if(P[i]===0){if(Q[i]<0)return null}else{const t=Q[i]/P[i];if(P[i]<0){if(t>t1)return null;if(t>t0)t0=t}else{if(t<t0)return null;if(t<t1)t1=t}}}
    return{t0,t1,p:[a[0]+t0*dx,a[1]+t0*dy],q:[a[0]+t1*dx,a[1]+t1*dy]};
  }
  function clipLine(pts,E){
    const out=[];let cur=null;
    for(let i=1;i<pts.length;i++){
      const c=clipSeg(pts[i-1],pts[i],E);
      if(!c){cur=null;continue}
      if(cur&&c.t0===0)cur.push(c.q);else{cur=[c.p,c.q];out.push(cur)}
      if(c.t1<1)cur=null;
    }
    return out.filter(l=>l.length>1);
  }
  /* Liefert [{props, lines:[[[lon,lat],…]]}] fuer die Linien der Ebene "layer", auf die Kachel zugeschnitten */
  function decodeTile(buf,layer,z,x,y){
    const b=buf instanceof Uint8Array?buf:new Uint8Array(buf),r=new R(b),out=[],n=Math.pow(2,z);
    while(r.p<r.e){
      const t=r.v();if(t!==26){r.skip(t&7);continue}
      const len=r.v(),end=r.p+len,L=new R(b,r.p,end);r.p=end;
      let name=null,ext=4096;const keys=[],vals=[],feats=[];
      while(L.p<L.e){const lt=L.v(),f=Math.floor(lt/8),w=lt&7;
        if(f===1){name=L.str();if(name!==layer)break}
        else if(f===2){const l=L.v();feats.push([L.p,L.p+l]);L.p+=l}
        else if(f===3)keys.push(L.str());
        else if(f===4){const l=L.v();vals.push(readValue(b,L.p,L.p+l));L.p+=l}
        else if(f===5)ext=L.v();else L.skip(w)}
      if(name!==layer)continue;
      for(const [fs,fe] of feats){
        const F=new R(b,fs,fe);let type=0,tags=[],geom=[];
        while(F.p<F.e){const ft=F.v(),f=Math.floor(ft/8),w=ft&7;
          if(f===2||f===4){const l=F.v(),e2=F.p+l,arr=[];while(F.p<e2)arr.push(F.v());if(f===2)tags=arr;else geom=arr}
          else if(f===3)type=F.v();else F.skip(w)}
        if(type!==2)continue;
        const props={};for(let i=0;i+1<tags.length;i+=2)props[keys[tags[i]]]=vals[tags[i+1]];
        const lines=[];let cx=0,cy=0,cur=null;
        for(let i=0;i<geom.length;){const c=geom[i++],id=c&7,cnt=c>>3;
          if(id===1||id===2){for(let k=0;k<cnt;k++){cx+=zz(geom[i++]);cy+=zz(geom[i++]);if(id===1){cur=[];lines.push(cur)}cur.push([cx,cy])}}}
        const ll=[];
        for(const l of lines)for(const c of clipLine(l,ext))ll.push(c.map(p=>{const lon=(x+p[0]/ext)/n*360-180,yy=Math.PI*(1-2*(y+p[1]/ext)/n);return[lon,Math.atan(Math.sinh(yy))*180/Math.PI]}));
        if(ll.length)out.push({props,lines:ll});
      }
    }
    return out;
  }

  /* ---- Wegnetz als Graph ---- */
  const CS=0.001;
  function Graph(){this.xs=[];this.ys=[];this.adj=[];this.ea=[];this.eb=[];this.ef=[];this.ew=[];this.live=[];this.nx=[];this.ng=new Map();this.eg=new Map()}
  Graph.prototype.node=function(x,y){
    const cs=2e-5,cx=Math.floor(x/cs),cy=Math.floor(y/cs);
    for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const l=this.ng.get((cx+i)+'_'+(cy+j));
      if(l)for(const n of l)if(Math.abs(this.xs[n]-x)<1.5e-5&&Math.abs(this.ys[n]-y)<1e-5)return n}
    const n=this.xs.length;this.xs.push(x);this.ys.push(y);this.adj.push([]);
    const k=cx+'_'+cy;let l=this.ng.get(k);if(!l)this.ng.set(k,l=[]);l.push(n);return n;
  };
  Graph.prototype.edge=function(a,b,f,noIndex,nox){
    const i=this.ea.length,w=dist({x:this.xs[a],y:this.ys[a]},{x:this.xs[b],y:this.ys[b]})*f;
    this.ea.push(a);this.eb.push(b);this.ef.push(f);this.ew.push(w);this.live.push(true);this.nx.push(!!nox);this.adj[a].push(i);this.adj[b].push(i);
    if(!noIndex){const x0=Math.floor(Math.min(this.xs[a],this.xs[b])/CS),x1=Math.floor(Math.max(this.xs[a],this.xs[b])/CS),y0=Math.floor(Math.min(this.ys[a],this.ys[b])/CS),y1=Math.floor(Math.max(this.ys[a],this.ys[b])/CS);
      for(let cx=x0;cx<=x1;cx++)for(let cy=y0;cy<=y1;cy++){const k=cx+'_'+cy;let l=this.eg.get(k);if(!l)this.eg.set(k,l=[]);l.push(i)}}
    return i;
  };
  Graph.prototype.line=function(coords,f,nox){let prev=-1;for(const c of coords){const n=this.node(c[0],c[1]);if(prev>=0&&n!==prev)this.edge(prev,n,f,false,nox);prev=n}};
  /* Kreuzungen ohne gemeinsamen Punkt verbinden (nicht bei Bruecken und Tunneln) */
  Graph.prototype.cross=function(){
    const hits=new Map(),done=new Set();let cnt=0;
    const k=this.xs.length?KX(this.ys[0]):1;
    for(const l of this.eg.values()){
      if(l.length<2)continue;
      for(let i=0;i<l.length;i++){const e1=l[i];if(!this.live[e1]||this.nx[e1])continue;
        const a1=this.ea[e1],b1=this.eb[e1];
        for(let j=i+1;j<l.length;j++){const e2=l[j];if(!this.live[e2]||this.nx[e2])continue;
          const a2=this.ea[e2],b2=this.eb[e2];if(a1===a2||a1===b2||b1===a2||b1===b2)continue;
          const key=e1<e2?e1+'_'+e2:e2+'_'+e1;if(done.has(key))continue;done.add(key);
          const px=this.xs[a1]*k,py=this.ys[a1]*KY,rx=this.xs[b1]*k-px,ry=this.ys[b1]*KY-py;
          const qx=this.xs[a2]*k,qy=this.ys[a2]*KY,sx=this.xs[b2]*k-qx,sy=this.ys[b2]*KY-qy;
          const den=rx*sy-ry*sx;if(Math.abs(den)<1e-9)continue;
          const t=((qx-px)*sy-(qy-py)*sx)/den,u=((qx-px)*ry-(qy-py)*rx)/den;
          const ep=1e-6;if(t<-ep||t>1+ep||u<-ep||u>1+ep)continue;
          const te=t<ep||t>1-ep,ue=u<ep||u>1-ep;if(te&&ue)continue;
          let x,y;
          if(te){const n=t<ep?a1:b1;x=this.xs[n];y=this.ys[n]}else if(ue){const n=u<ep?a2:b2;x=this.xs[n];y=this.ys[n]}
          else{x=this.xs[a1]+t*(this.xs[b1]-this.xs[a1]);y=this.ys[a1]+t*(this.ys[b1]-this.ys[a1])}
          if(!te){let h=hits.get(e1);if(!h)hits.set(e1,h=[]);h.push([t,x,y])}
          if(!ue){let h=hits.get(e2);if(!h)hits.set(e2,h=[]);h.push([u,x,y])}
          cnt++;
        }}
    }
    for(const [e,h] of hits){
      if(!this.live[e])continue;h.sort((p,q)=>p[0]-q[0]);
      const a=this.ea[e],b=this.eb[e],f=this.ef[e];this.live[e]=false;let prev=a;
      for(const [,x,y] of h){const n=this.node(x,y);if(n!==prev)this.edge(prev,n,f);prev=n}
      if(prev!==b)this.edge(prev,b,f);
    }
    return cnt;
  };
  Graph.prototype.degree=function(n){let d=0;for(const e of this.adj[n])if(this.live[e])d++;return d};
  Graph.prototype.nearest=function(p,maxM,skip){
    const rx=maxM/KX(p.y),ry=maxM/KY,seen=new Set();let best=null;const k=KX(p.y);
    for(let cx=Math.floor((p.x-rx)/CS);cx<=Math.floor((p.x+rx)/CS);cx++)for(let cy=Math.floor((p.y-ry)/CS);cy<=Math.floor((p.y+ry)/CS);cy++){
      const l=this.eg.get(cx+'_'+cy);if(!l)continue;
      for(const e of l){if(seen.has(e)||!this.live[e]||(skip&&skip.has(e)))continue;seen.add(e);
        const a=this.ea[e],b=this.eb[e],ax=this.xs[a],ay=this.ys[a],ex=(this.xs[b]-ax)*k,ey=(this.ys[b]-ay)*KY,px=(p.x-ax)*k,py=(p.y-ay)*KY,l2=ex*ex+ey*ey;
        let t=l2>0?(px*ex+py*ey)/l2:0;t=Math.max(0,Math.min(1,t));const dx=px-t*ex,dy=py-t*ey,d=Math.sqrt(dx*dx+dy*dy);
        if(d<=maxM&&(!best||d<best.d))best={d,e,t,x:ax+(this.xs[b]-ax)*t,y:ay+(this.ys[b]-ay)*t}}}
    return best;
  };
  /* Lose Wegenden mit benachbarten Wegen verbinden (Abzweigungen ohne gemeinsamen Punkt, Kachelraender) */
  Graph.prototype.heal=function(tolM){
    const N=this.xs.length;let joined=0;
    for(let n=0;n<N;n++){
      if(this.degree(n)!==1)continue;
      const own=new Set(this.adj[n]);
      /* auch die naechsten Kanten derselben Linie ausschliessen, damit keine Abkuerzung entsteht */
      for(const e of this.adj[n]){const o=this.ea[e]===n?this.eb[e]:this.ea[e];for(const e2 of this.adj[o])own.add(e2)}
      const h=this.nearest({x:this.xs[n],y:this.ys[n]},tolM,own);if(!h)continue;
      const a=this.ea[h.e],b=this.eb[h.e],f=this.ef[h.e];
      const da=dist(h,{x:this.xs[a],y:this.ys[a]}),db=dist(h,{x:this.xs[b],y:this.ys[b]});
      let m;
      if(da<0.5)m=a;else if(db<0.5)m=b;
      else{m=this.xs.length;this.xs.push(h.x);this.ys.push(h.y);this.adj.push([]);this.live[h.e]=false;this.edge(a,m,f);this.edge(m,b,f)}
      if(m!==n){this.edge(n,m,1);joined++}
    }
    return joined;
  };
  function hpush(h,v){h.push(v);let i=h.length-1;while(i>0){const p=(i-1)>>1;if(h[p][0]<=h[i][0])break;[h[p],h[i]]=[h[i],h[p]];i=p}}
  function hpop(h){const top=h[0],last=h.pop();if(h.length){h[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<h.length&&h[l][0]<h[m][0])m=l;if(r<h.length&&h[r][0]<h[m][0])m=r;if(m===i)break;[h[m],h[i]]=[h[i],h[m]];i=m}}return top}
  Graph.prototype.dijkstra=function(s,t){
    const n=this.xs.length,d=new Float64Array(n).fill(Infinity),pv=new Int32Array(n).fill(-1),h=[];d[s]=0;hpush(h,[0,s]);
    while(h.length){const [du,u]=hpop(h);if(du>d[u])continue;if(u===t)break;
      for(const e of this.adj[u]){if(!this.live[e])continue;const v=this.ea[e]===u?this.eb[e]:this.ea[e],nd=du+this.ew[e];if(nd<d[v]){d[v]=nd;pv[v]=u;hpush(h,[nd,v])}}}
    if(d[t]===Infinity)return null;const p=[];for(let u=t;u!==-1;u=pv[u])p.push(u);return p.reverse();
  };
  Graph.prototype.route=function(p,q,maxM){
    const sp=this.nearest(p,maxM),sq=sp&&this.nearest(q,maxM);if(!sp||!sq)return null;
    const N0=this.xs.length,E0=this.ea.length,touched=new Set();
    const tmp=s=>{const v=this.xs.length;this.xs.push(s.x);this.ys.push(s.y);this.adj.push([]);
      const a=this.ea[s.e],b=this.eb[s.e];this.edge(v,a,this.ef[s.e],true);this.edge(v,b,this.ef[s.e],true);touched.add(a);touched.add(b);return v};
    const vs=tmp(sp),vt=tmp(sq);if(sp.e===sq.e)this.edge(vs,vt,this.ef[sp.e],true);
    const path=this.dijkstra(vs,vt),out=path?path.map(i=>({x:this.xs[i],y:this.ys[i]})):null;
    this.xs.length=this.ys.length=this.adj.length=N0;['ea','eb','ef','ew','live','nx'].forEach(k=>{this[k].length=E0});
    touched.forEach(r=>{this.adj[r]=this.adj[r].filter(e=>e<E0)});
    return out;
  };

  /* ---- Wegarten bewerten (Faktor = Umweg, den man in Kauf nimmt; null = nicht begehbar) ---- */
  const SW_EXCL=new Set(['motorway','rail','transit','aerialway','ferry','cable_car','funicular','bus_guideway','raceway','busway']);
  const SW_F={path:1,track:1,minor:1.15,service:1.15,tertiary:1.4,secondary:1.7,primary:2.2,trunk:4};
  function swissFactor(p){const c=p.class;if(!c||SW_EXCL.has(c))return null;let f=SW_F[c]||1.3;
    if(p.is_route===1||p.is_route===true||p.sac_scale)f*=0.85;if(p.brunnel==='tunnel'&&c!=='path')f*=2;return f}
  function swissNox(p){return p.brunnel==='bridge'||p.brunnel==='tunnel'||(p.layer!=null&&p.layer!==0)}
  function osmNox(p){return !!(p.is_bridge||p.is_tunnel||p.bridge||p.tunnel)}
  const OSM_EXCL=new Set(['highway','rail','ferry','aerialway','other_rail']);
  const OSM_F={path:1,other:1,minor_road:1.1,medium_road:1.4,major_road:2};
  function osmFactor(p){const k=p.kind;if(!k||OSM_EXCL.has(k))return null;return OSM_F[k]||1.2}
  function buildGraph(tiles,factor,healM,noxFn){
    const g=new Graph();
    for(const t of tiles)for(const ft of t){const f=factor(ft.props);if(f==null)continue;const nx=noxFn?noxFn(ft.props):false;for(const l of ft.lines)g.line(l,f,nx)}
    g.cross();g.heal(healM==null?3:healM);return g;
  }
  function tileRange(w,s,e,n,z){
    const N=Math.pow(2,z),tx=lon=>Math.floor((lon+180)/360*N),ty=lat=>{const r=lat*Math.PI/180;return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*N)};
    const x0=tx(w),x1=tx(e),y0=ty(n),y1=ty(s),out=[];for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)out.push([x,y]);return out;
  }
  const core={Graph,decodeTile,clipLine,buildGraph,swissFactor,osmFactor,swissNox,osmNox,tileRange,dist};

  if(typeof S==='undefined'||typeof M==='undefined'||typeof ACT==='undefined'||typeof trackChanged==='undefined'){
    if(typeof module!=='undefined')module.exports=core;
    return;
  }

  /* ================= Einbindung in den Hub ================= */
  const SN=window.SNAP={on:true,minZoom:12,tolPx:24,maxTiles:40,src:null,state:'init',_core:core};
  try{const v=localStorage.getItem('hub.snap');if(v!==null)SN.on=v==='1'}catch(e){}
  const SWISS_PATHS=['/vt/tiles/ch.swisstopo.base.vt/v1.0.0/{z}/{x}/{y}.pbf','/vt/tiles/ch.swisstopo.leichte-basiskarte.vt/v3.0.1/{z}/{x}/{y}.pbf'];

  async function fetchPbf(url){
    const r=await fetch(url);
    if(r.status===204||r.status===404)return new Uint8Array(0);
    if(!r.ok)throw new Error('HTTP '+r.status);
    let b=new Uint8Array(await r.arrayBuffer());
    if(b.length>2&&b[0]===0x1f&&b[1]===0x8b){
      if(typeof DecompressionStream==='undefined')throw new Error('Browser kann gzip nicht entpacken');
      b=new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    }
    return b;
  }
  function mkSwiss(path){
    const base=CFG.mapBase+path;
    return{name:'swisstopo',label:'swisstopo (swissTLM3D)',z:14,layer:'transportation',factor:swissFactor,nox:swissNox,tmpl:base,
      raw:(z,x,y)=>fetchPbf(base.replace('{z}',z).replace('{x}',x).replace('{y}',y))};
  }
  function mkOsm(){
    const pm=new pmtiles.PMTiles(CFG.mapBase+CFG.own.topo);
    return{name:'osm',label:'OpenStreetMap',z:15,layer:'roads',factor:osmFactor,nox:osmNox,
      raw:async(z,x,y)=>{const r=await pm.getZxy(z,x,y);return r&&r.data?new Uint8Array(r.data):new Uint8Array(0)}};
  }
  const TEST=[9.531,46.851];
  async function probe(src){
    const t=tileRange(TEST[0],TEST[1],TEST[0],TEST[1],src.z)[0];
    const fs=decodeTile(await src.raw(src.z,t[0],t[1]),src.layer,src.z,t[0],t[1]);
    return fs.some(f=>src.factor(f.props)!=null);
  }
  async function initSource(){
    SN.state='init';SN.src=null;
    if(SN.forceSource!=='osm')for(const p of SWISS_PATHS){try{const s=mkSwiss(p);if(await probe(s)){SN.src=s;break}}catch(e){console.info('swisstopo-Wegnetz nicht erreichbar unter',p,e.message)}}
    if(!SN.src&&window.pmtiles){try{const s=mkOsm();if(await probe(s))SN.src=s}catch(e){console.warn('OSM-Wegnetz nicht lesbar',e)}}
    SN.state=SN.src?'ok':'none';SN.cache=new Map();
    console.info('Wegnetz für Einrasten:',SN.src?SN.src.label:'keines');
    statusUI();ensureLayer();
  }
  function tile(z,x,y){
    const src=SN.src,k=src.name+'/'+z+'/'+x+'/'+y;
    if(!SN.cache.has(k)){
      if(SN.cache.size>400)SN.cache.delete(SN.cache.keys().next().value);
      SN.cache.set(k,src.raw(z,x,y).then(b=>decodeTile(b,src.layer,z,x,y)).catch(e=>{SN.cache.delete(k);throw e}));
    }
    return SN.cache.get(k);
  }
  async function graphFor(pts,marginM){
    const src=SN.src;let w=180,s=90,e=-180,n=-90;
    pts.forEach(p=>{w=Math.min(w,p.x);e=Math.max(e,p.x);s=Math.min(s,p.y);n=Math.max(n,p.y)});
    const lat=(s+n)/2,mx=marginM/KX(lat),my=marginM/KY;
    let z=src.z,tl=tileRange(w-mx,s-my,e+mx,n+my,z);
    while(tl.length>SN.maxTiles&&z>13){z--;tl=tileRange(w-mx,s-my,e+mx,n+my,z)}
    if(tl.length>SN.maxTiles)return{tooFar:true};
    const tiles=await Promise.all(tl.map(t=>tile(z,t[0],t[1])));
    return{g:buildGraph(tiles,src.factor,3,src.nox)};
  }

  let lastToast=0;
  function say(t){const n=Date.now();if(n-lastToast<3500)return;lastToast=n;toast(t)}
  const isTour=()=>!!(S.draft&&S.draft.type==='tour');
  const active=()=>SN.on&&M.ready&&M.server&&M.map&&SN.src;
  function tolM(){const m=M.map,z=m.getZoom(),lat=m.getCenter().lat,px=SN.tolPx*40075016.686*Math.cos(lat*Math.PI/180)/(512*Math.pow(2,z));return Math.max(8,Math.min(80,px))}
  const pt=(p,a)=>{const o={x:+(+p.x).toFixed(6),y:+(+p.y).toFixed(6),z:null};if(a)o.a=true;return o};
  function busy(on){const h=$('#modeHint');if(!h)return;if(on){h.hidden=false;h.textContent='Weg wird gesucht …'}else setMode()}

  /* Abschnitt von "from" (ohne) bis "to" (mit) */
  async function leg(from,to){
    if(!active()||M.map.getZoom()<SN.minZoom)return{pts:[pt(to,true)],snapped:false,why:'zoom'};
    const tol=tolM(),d=dist(from,to);
    for(const m of [Math.max(500,d*0.35),Math.max(1500,d*1.0)]){
      let r;try{r=await graphFor([from,to],m)}catch(e){console.warn('Wegnetz-Kacheln nicht geladen',e);return{pts:[pt(to,true)],snapped:false,why:'load'}}
      if(r.tooFar)return{pts:[pt(to,true)],snapped:false,why:'far'};
      const path=r.g.route(from,to,tol);
      if(path&&path.length>1){
        const sp=simplify(path.map(p=>({x:p.x,y:p.y})),2);
        const out=sp.slice(1).map(p=>pt(p));out[out.length-1].a=true;return{pts:out,snapped:true};
      }
      if(!r.g.nearest(from,tol)||!r.g.nearest(to,tol))return{pts:[pt(to,true)],snapped:false,why:'offpath'};
    }
    return{pts:[pt(to,true)],snapped:false,why:'nopath'};
  }
  async function snapFirst(p){
    if(!active()||M.map.getZoom()<SN.minZoom)return p;
    try{const r=await graphFor([p],300);const h=r.g&&r.g.nearest(p,tolM());return h?{x:h.x,y:h.y}:p}catch(e){return p}
  }
  const WHY={zoom:'Bitte näher heranzoomen (ab Zoom '+12+'), dann folgt die Route den Wegen. Der Punkt wurde ohne Einrasten gesetzt.',
    load:'Das Wegnetz konnte nicht geladen werden. Der Punkt wurde ohne Einrasten gesetzt.',
    far:'Die Punkte liegen zu weit auseinander. Bitte Zwischenpunkte setzen. Es wurde eine gerade Linie gesetzt.',
    offpath:'Kein Weg in der Nähe des Klicks. Es wurde eine gerade Linie gesetzt.',
    nopath:'Zwischen den Punkten wurde keine Wegverbindung gefunden. Es wurde eine gerade Linie gesetzt.'};

  /* ---- neu geklickte Punkte abfangen ---- */
  let seen=0,seenId=null,queue=[],working=false;
  const origSD=syncDraft;
  syncDraft=function(){
    origSD();
    const D=S.draft;if(!D||D.type!=='tour')return;
    seen=D.track.length;seenId=D.id;
    if(!M.ready||!D.track.some(p=>p.a))return;
    M.vx.forEach(m=>m.remove());M.vx=[];
    const tk=D.track;
    tk.forEach((p,i)=>{
      if(!p.a&&i!==0&&i!==tk.length-1)return;
      const first=i===0,lastp=i===tk.length-1,el=document.createElement('div');
      el.className='vx'+(first?' a':lastp?' z':'');el.title=first?'Start':lastp?'Ziel':'Wegpunkt (ziehen verschiebt, Route folgt dem Weg)';
      el.addEventListener('click',e=>e.stopPropagation());
      const m=new maplibregl.Marker({element:el,draggable:true}).setLngLat([p.x,p.y]).addTo(M.map);
      m.on('dragend',()=>moveAnchor(p,m.getLngLat()));M.vx.push(m);
    });
  };
  const origRE=renderEditor;
  renderEditor=function(keep){origRE(keep);const D=S.draft;if(D&&D.type==='tour'){seen=D.track.length;seenId=D.id;decorate()}};
  const origTC=trackChanged;
  trackChanged=function(keepWp){
    const D=S.draft;
    if(D&&D.type==='tour'&&S.drawing&&active()){
      const tk=D.track,n=tk.length;
      if(seenId===D.id&&n===seen+1&&!tk[n-1].a){queue.push({D,p:tk.pop()});seen=tk.length;pump();return}
    }
    return origTC(keepWp);
  };
  async function pump(){
    if(working)return;working=true;
    try{
      while(queue.length){
        const {D,p}=queue.shift();if(S.draft!==D)continue;
        const tk=D.track;busy(true);
        if(!tk.length){const s=await snapFirst(p);if(S.draft!==D)continue;tk.push(pt(s,true));origTC();continue}
        const r=await leg(tk[tk.length-1],p);if(S.draft!==D)continue;
        if(!r.snapped)say(WHY[r.why]||WHY.nopath);
        r.pts.forEach(x=>tk.push(x));origTC();
      }
    }finally{working=false;busy(false)}
  }

  /* ---- Ankerpunkt verschieben ---- */
  async function moveAnchor(anchor,ll){
    const D=S.draft;if(!D||D.type!=='tour')return;
    const tk=D.track,i=tk.indexOf(anchor);if(i<0)return;
    let pi=-1,ni=-1;
    for(let j=i-1;j>=0;j--)if(tk[j].a||j===0){pi=j;break}
    for(let j=i+1;j<tk.length;j++)if(tk[j].a||j===tk.length-1){ni=j;break}
    busy(true);
    try{
      const np=await snapFirst({x:ll.lng,y:ll.lat});
      let mid=[];
      if(pi>=0)mid=mid.concat((await leg(tk[pi],np)).pts);else mid=[pt(np,true)];
      if(ni>=0)mid=mid.concat((await leg(mid[mid.length-1],tk[ni])).pts);
      if(S.draft!==D)return;
      const head=tk.slice(0,pi+1),tail=ni>=0?tk.slice(ni+1):[];
      D.track=head.concat(mid,tail);
    }finally{busy(false)}
    trackChanged(true);
  }

  /* ---- Rueckgaengig und "Zum Start schliessen" ---- */
  const origUndo=ACT.tundo,origLoop=ACT.tloop;
  ACT.tundo=function(b,e){
    const tk=S.draft&&S.draft.track;
    if(!tk||!tk.some(p=>p.a))return origUndo(b,e);
    let j=tk.length-2;while(j>0&&!tk[j].a)j--;
    tk.length=Math.max(0,j+1);trackChanged();
  };
  ACT.tloop=async function(b,e){
    const D=S.draft,tk=D&&D.track;
    if(!tk||tk.length<2||!active())return origLoop(b,e);
    if(dist(tk[0],tk[tk.length-1])<=5)return;
    busy(true);let r;try{r=await leg(tk[tk.length-1],tk[0])}finally{busy(false)}
    if(S.draft!==D)return;
    r.pts.forEach(x=>tk.push(x));if(!r.snapped)say(WHY[r.why]||WHY.nopath);origTC();
  };

  /* ---- Schalter, Anzeige ---- */
  ACT.snaptog=function(){
    SN.on=!SN.on;try{localStorage.setItem('hub.snap',SN.on?'1':'0')}catch(e){}
    statusUI();vis();setMode();
    toast(SN.on?'Die Route folgt beim Zeichnen den Wegen (ab Zoom '+SN.minZoom+').':'Einrasten aus: Punkte werden frei gesetzt.');
  };
  function statusUI(){
    $$('[data-act="snaptog"]').forEach(x=>{x.setAttribute('aria-pressed',String(SN.on));x.textContent=SN.on?'Einrasten an Wegen: an':'Einrasten an Wegen: aus'});
    const s=$('#snapSrc');if(s)s.textContent=SN.state==='init'?'Wegnetz wird geprüft …':SN.src?'Wegnetz: '+SN.src.label:'Kein Wegnetz verfügbar – Punkte werden frei gesetzt.';
  }
  function decorate(){
    const d=$('[data-act="draw"]');if(!d||$('[data-act="snaptog"]'))return;
    const b=document.createElement('button');b.type='button';b.className='btn sm';b.dataset.act='snaptog';
    b.title='Die Route folgt beim Zeichnen den Wegen. Für Skitouren und Routen abseits der Wege ausschalten.';d.after(b);
    const tools=d.parentNode,p=document.createElement('p');p.className='hint';p.id='snapSrc';p.setAttribute('aria-live','polite');tools.after(p);
    statusUI();
  }
  function ensureLayer(){
    const m=M.map;if(!m||!M.ready)return;
    if(m.getLayer('paths-hint'))m.removeLayer('paths-hint');
    if(m.getSource('snap-paths'))m.removeSource('snap-paths');
    const before=m.getLayer('tours-case')?'tours-case':undefined;
    const paint={'line-color':'#d9480f','line-opacity':0.65,'line-width':['interpolate',['linear'],['zoom'],12,1,16,2.5],'line-dasharray':[2,1.5]};
    try{
      if(SN.src&&SN.src.name==='swisstopo'){
        m.addSource('snap-paths',{type:'vector',tiles:[SN.src.tmpl],minzoom:0,maxzoom:14,bounds:CFG.chBounds,attribution:'Wegnetz © swisstopo'});
        m.addLayer({id:'paths-hint',type:'line',source:'snap-paths','source-layer':'transportation',minzoom:12,
          filter:['!',['in',['get','class'],['literal',[...SW_EXCL]]]],layout:{'line-cap':'round','line-join':'round',visibility:'none'},paint},before);
      }else if(m.getSource('topo')){
        m.addLayer({id:'paths-hint',type:'line',source:'topo','source-layer':'roads',minzoom:12,
          filter:['!',['in',['get','kind'],['literal',[...OSM_EXCL]]]],layout:{'line-cap':'round','line-join':'round',visibility:'none'},paint},before);
      }
      vis();
    }catch(e){console.warn('Wegnetz-Ebene nicht hinzugefügt',e)}
  }
  function vis(){const m=M.map;if(!m||!m.getLayer('paths-hint'))return;m.setLayoutProperty('paths-hint','visibility',(S.drawing&&isTour()&&SN.on)?'visible':'none')}
  const origSetMode=setMode;
  setMode=function(){
    origSetMode();vis();
    const h=$('#modeHint');
    if(h&&!h.hidden&&S.drawing&&isTour()&&SN.on&&SN.src)h.textContent='Zeichnen aktiv: Klick setzt den nächsten Punkt, die Route folgt den gestrichelten Wegen ('+SN.src.label+') · Punkte lassen sich ziehen (Esc beendet)';
  };
  let hooked=null,started=false;
  setInterval(()=>{
    if(M.map&&M.map!==hooked){hooked=M.map;const h=hooked;
      h.on('load',()=>{ensureLayer()});
      h.on('styledata',()=>{if(M.ready&&!h.getLayer('paths-hint'))ensureLayer()});
      if(M.ready)ensureLayer()}
    if(!started&&M.ready&&M.server){started=true;initSource()}
  },400);
})();

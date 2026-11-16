/\* Contenthub map adapter for map.graubuenden.ch handover endpoints. \*/
(function(){
  'use strict';
  if(typeof CFG==='undefined'||typeof DEM==='undefined'||typeof M==='undefined')return;
  CFG.mapBase='[https://map.graubuenden.ch](https://map.graubuenden.ch)';
  CFG.own.sat='/tiles/swissimage/{z}/{x}/{y}.jpeg';
  CFG.own.dem='/tiles/terrarium/{z}/{x}/{y}.png';
  CFG.own.sprite='/sprites/v4/light';
  CFG.chBounds=\[5.1,45.3,11.6,48.3\];

  DEM.z=13;
  DEM.url=function(x,y){return CFG.mapBase+CFG.own.dem.replace('{z}',this.z).replace('{x}',x).replace('{y}',y)};
  DEM.tile=function(x,y){
    const key=x+'/'+y;
    if(!this.cache.has(key))this.cache.set(key,(async()=&gt;{
      const r=await fetch(this.url(x,y));if(!r.ok)throw new Error('Höhenkachel HTTP '+r.status);
      const bmp=await createImageBitmap(await r.blob()),c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;
      const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(bmp,0,0);
      return{w:bmp.width,h:bmp.height,d:g.getImageData(0,0,bmp.width,bmp.height).data}
    })().catch(e=&gt;{console.warn('Höhenkachel nicht verfügbar',e);return null}));
    return this.cache.get(key)
  };
  DEM.init=async function(){
    this.ok=false;this.cache.clear();
    try{const t=await this.tile(4312,2886);if(!t)throw new Error('Testkachel bei Chur fehlt');this.ok=true}
    catch(e){this.cache.clear();console.warn('DEM nicht verfügbar',e)}
  };
  DEM.at=async function(lon,lat){
    if(!this.ok||lon&lt;5.1||lon&gt;11.6||lat&lt;45.3||lat&gt;48.3)return null;
    const n=2\**this.z,fx=(lon+180)/360*n,s=Math.sin(lat*Math.PI/180),fy=(0.5-Math.log((1+s)/(1-s))/(4*Math.PI))\*n;
    const tx=Math.floor(fx),ty=Math.floor(fy),t=await this.tile(tx,ty);if(!t)return null;
    const px=Math.min(t.w-1,Math.floor((fx-tx)\*t.w)),py=Math.min(t.h-1,Math.floor((fy-ty)*t.h)),i=(py*t.w+px)\*4;
    const z=t.d\[i\]*256+t.d\[i+1\]+t.d\[i+2\]/256-32768;
    return z&gt;-100&amp;&amp;z&lt;5000?Math.round(z*10)/10:null
  };

  buildStyle=function(){
    const b=CFG.mapBase,base=basemaps.layers('topo',basemaps.namedFlavor('light'),{lang:'de'});
    const st={version:8,glyphs:b+CFG.own.glyphs,sprite:b+CFG.own.sprite,sources:{
      topo:{type:'vector',url:'pmtiles://'+b+CFG.own.topo,attribution:'© OpenStreetMap contributors, Protomaps'},
      sat:{type:'raster',tiles:\[b+CFG.own.sat\],tileSize:256,maxzoom:20,bounds:CFG.chBounds,attribution:'© swisstopo'},
      dem:{type:'raster-dem',tiles:\[b+CFG.own.dem\],tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'Mapzen Terrain Tiles (AWS)'},
      tours:{type:'geojson',data:{type:'FeatureCollection',features:\[\]}},
      draft:{type:'geojson',data:{type:'FeatureCollection',features:\[\]}}
    },layers:\[{id:'bg',type:'background',paint:{'background-color':'#e6e9e1'}}\]};
    const firstSymbol=base.findIndex(l=&gt;l.type==='symbol'),cut=firstSymbol&lt;0?base.length:firstSymbol;
    st.layers.push(...base.slice(0,cut),
      {id:'hill',type:'hillshade',source:'dem',paint:{'hillshade-exaggeration':0.25}},
      {id:'sat',type:'raster',source:'sat',layout:{visibility:'none'}},
      ...base.slice(cut),
      {id:'tours-case',type:'line',source:'tours',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fff','line-width':7}},
      {id:'tours-line',type:'line',source:'tours',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#17705c','line-width':3.5}},
      {id:'draft-case',type:'line',source:'draft',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fff','line-width':8}},
      {id:'draft-line',type:'line',source:'draft',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#d9480f','line-width':4}});
    return st
  };
  setSrv=function(){
    const ok=M.server;$('#srvPill').classList.toggle('ok',ok);
    $('#srvTxt').textContent=ok?'Kartenserver verbunden'+(DEM.ok?' · Höhenmodell aktiv':''):'Kartenserver nicht verbunden';
    $('#attr').textContent=ok?'© OpenStreetMap contributors, Protomaps · Luftbild: © swisstopo · Höhenmodell: Mapzen Terrain Tiles (AWS)':'Orientierungsraster – Basiskarte folgt mit Kartenserver'
  };
  const start=initMap;
  initMap=async function(){const css=$('#mlcss');if(css)css.remove();return start()};
  setTimeout(()=&gt;initMap(),0);
})();
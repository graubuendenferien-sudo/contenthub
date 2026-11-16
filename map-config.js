(function(){
  'use strict';
  if(typeof CFG==='undefined'||typeof DEM==='undefined'||typeof M==='undefined')return;
  CFG.mapBase='https:'+'//map.graubuenden.ch';
  CFG.own.sat='/tiles/swissimage/{z}/{x}/{y}.jpeg';
  CFG.own.dem='/tiles/terrarium/{z}/{x}/{y}.png';
  CFG.own.sprite='/sprites/v4/light';
  CFG.chBounds=Array.of(5.1,45.3,11.6,48.3);

  DEM.z=13;
  DEM.url=function(x,y){return CFG.mapBase+CFG.own.dem.replace('{z}',this.z).replace('{x}',x).replace('{y}',y)};
  DEM.tile=function(x,y){
    var key=x+'/'+y;
    if(!this.cache.has(key)){
      var url=this.url(x,y);
      this.cache.set(key,(async function(){
        var r=await fetch(url);
        if(!r.ok)throw new Error('Höhenkachel HTTP '+r.status);
        var bmp=await createImageBitmap(await r.blob()),c=document.createElement('canvas');
        c.width=bmp.width;c.height=bmp.height;
        var g=c.getContext('2d',{willReadFrequently:true});g.drawImage(bmp,0,0);
        return{w:bmp.width,h:bmp.height,d:g.getImageData(0,0,bmp.width,bmp.height).data}
      })().catch(function(e){console.warn('Höhenkachel nicht verfügbar',e);return null}));
    }
    return this.cache.get(key)
  };
  DEM.init=async function(){
    this.ok=false;this.cache.clear();
    try{var t=await this.tile(4312,2886);if(!t)throw new Error('Testkachel bei Chur fehlt');this.ok=true}
    catch(e){this.cache.clear();console.warn('DEM nicht verfügbar',e)}
  };
  DEM.at=async function(lon,lat){
    if(!this.ok)return null;
    var n=2**this.z,fx=(lon+180)/360*n,s=Math.sin(lat*Math.PI/180);
    var fy=(0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*n;
    var tx=Math.floor(fx),ty=Math.floor(fy),t=await this.tile(tx,ty);if(!t)return null;
    var px=Math.min(t.w-1,Math.floor((fx-tx)*t.w));
    var py=Math.min(t.h-1,Math.floor((fy-ty)*t.h));
    var i=(py*t.w+px)*4,z=t.d.at(i)*256+t.d.at(i+1)+t.d.at(i+2)/256-32768;
    if(!Number.isFinite(z))return null;
    return Math.round(z*10)/10
  };

  buildStyle=function(){
    var b=CFG.mapBase,base=basemaps.layers('topo',basemaps.namedFlavor('light'),{lang:'de'});
    var st={version:8,glyphs:b+CFG.own.glyphs,sprite:b+CFG.own.sprite,sources:{
      topo:{type:'vector',url:'pmtiles://'+b+CFG.own.topo,attribution:'OpenStreetMap contributors, Protomaps'},
      sat:{type:'raster',tiles:Array.of(b+CFG.own.sat),tileSize:256,maxzoom:20,bounds:CFG.chBounds,attribution:'swisstopo'},
      dem:{type:'raster-dem',tiles:Array.of(b+CFG.own.dem),tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'Mapzen Terrain Tiles AWS'},
      tours:{type:'geojson',data:{type:'FeatureCollection',features:Array.of()}},
      draft:{type:'geojson',data:{type:'FeatureCollection',features:Array.of()}}
    },layers:Array.of({id:'bg',type:'background',paint:{'background-color':'#e6e9e1'}})};
    var firstSymbol=base.findIndex(function(l){return l.type==='symbol'});
    var cut=firstSymbol===-1?base.length:firstSymbol;
    st.layers=st.layers.concat(base.slice(0,cut));
    st.layers.push({id:'hill',type:'hillshade',source:'dem',paint:{'hillshade-exaggeration':0.25}});
    st.layers.push({id:'sat',type:'raster',source:'sat',layout:{visibility:'none'}});
    st.layers=st.layers.concat(base.slice(cut));
    st.layers.push(
      {id:'tours-case',type:'line',source:'tours',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fff','line-width':7}},
      {id:'tours-line',type:'line',source:'tours',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#17705c','line-width':3.5}},
      {id:'draft-case',type:'line',source:'draft',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fff','line-width':8}},
      {id:'draft-line',type:'line',source:'draft',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#d9480f','line-width':4}}
    );
    return st
  };
  setSrv=function(){
    var ok=M.server;$('#srvPill').classList.toggle('ok',ok);
    $('#srvTxt').textContent=ok?'Kartenserver verbunden'+(DEM.ok?' · Höhenmodell aktiv':''):'Kartenserver nicht verbunden';
    $('#attr').textContent=ok?'OpenStreetMap contributors, Protomaps · Luftbild: swisstopo · Höhenmodell: Mapzen Terrain Tiles AWS':'Orientierungsraster – Basiskarte folgt mit Kartenserver'
  };
  var oldMapMsg=mapMsg;
  mapMsg=function(t,retry){
    if(t&&t.indexOf('Kartenserver ist nur per HTTP')!==-1)return;
    oldMapMsg(t,retry)
  };
  var start=initMap;
  initMap=async function(){var css=$('#mlcss');if(css)css.remove();return start()};
  setTimeout(function(){initMap()},0);
})();

/* Contenthub: Infocenter-Objekte (discover.swiss) als schlanke Liste.
   - Laedt die Uebersicht aus der Tabelle ds_index (nur Typ, Name, Ort, Koordinate, Qualitaet, Datum).
   - Beim Anklicken wird der vollstaendige Datensatz ueber die Datenbank aus dem Infocenter geholt
     (der Schluessel bleibt auf dem Server).
   - Aenderungen werden als eigene Kopie gespeichert ("Kopie anlegen"), wahlweise als Master-Objekt
     (Confidence 20 statt 1).
   Wird nach app.js, hub-ext.js und ds-import.js geladen, ds-lite-open.js direkt danach. app.js bleibt unveraendert. */
(function(){
  'use strict';
  if(window.PARTNER||typeof S==='undefined'||typeof DB==='undefined'||typeof HUB==='undefined'||typeof fromDS==='undefined')return;

  const PAGE=1000,STEP=500,CONF_STD=1,CONF_MASTER=20;
  const COLORS={event:'#c0392f',food:'#b96a00',offer:'#23639c',poi:'#5a4aa6',tour:'#17705c',webcam:'#1d2422'};
  const DAYNUM={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};
  let LITE=[],TOKEN={},loading=false,NOLITE=false,OVR=null,lastGeo={type:'FeatureCollection',features:[]};
  S.liteLimit=STEP;
  HUB.STATUS.infocenter='Infocenter';

  const strip=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const txt=v=>typeof v==='string'?v:v&&typeof v==='object'?(v.de||v.en||Object.values(v).find(x=>typeof x==='string')||''):'';
  const isLite=it=>!!(it&&it.dsLite);
  const newId=()=>typeof uid==='function'?uid():'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);

  /* ---------- Anmeldung robuster: Erneuerung nur einmal gleichzeitig,
     bei Netzwerkfehlern (z. B. nach dem Ruhezustand) wiederholen statt abmelden ---------- */
  if(DB.refresh&&!DB.refresh._safe){
    const origRefresh=DB.refresh;let inflight=null;
    DB.refresh=function(){
      if(inflight)return inflight;
      inflight=(async()=>{
        for(let i=0;;i++){
          try{return await origRefresh.call(DB)}
          catch(e){if(i>=4||!(e instanceof TypeError))throw e;await new Promise(r=>setTimeout(r,1500*(i+1)))}
        }
      })().finally(()=>{inflight=null});
      return inflight;
    };
    DB.refresh._safe=true;
  }

  /* ---------- Statuszeile unter dem Filter ---------- */
  let state='idle',stateMsg='';
  function stateUI(){
    let el=$('#liteState');
    const panel=$('#panel');if(!panel)return;
    if(!el){el=document.createElement('div');el.id='liteState';el.className='hint';el.setAttribute('aria-live','polite');el.style.margin='6px 0 0';panel.appendChild(el)}
    if(!DB.sess){el.innerHTML='Nicht angemeldet – die Infocenter-Objekte erscheinen erst nach der Anmeldung. <button type="button" class="btn sm" data-act="login">Anmelden</button>';el.hidden=false;return}
    if(state==='loading'){el.textContent='Infocenter-Objekte werden geladen …';el.hidden=false;return}
    if(state==='error'){el.innerHTML='Infocenter-Objekte konnten nicht geladen werden ('+esc(stateMsg)+'). <button type="button" class="btn sm" data-act="litereload">Erneut laden</button>';el.hidden=false;return}
    if(state==='ok'){el.textContent=LITE.length.toLocaleString('de-CH')+' Infocenter-Objekte geladen.';el.hidden=false;return}
    el.hidden=true;
  }

  /* ---------- Uebersicht laden ---------- */
  function toLite(r){
    const add=r.additional_type||'',t=r.type;
    return{id:'ds:'+r.ds_id,dsId:r.ds_id,dsLite:true,dsEndpoint:r.endpoint,dsType:r.ds_type,dsAdd:add,dsQuality:r.quality||0,dsProjects:r.projects||[],
      type:t,status:'infocenter',source:'discover.swiss',sourceId:r.ds_id,
      name:{de:r.name||r.ds_id},short:{},description:{},
      additionalType:t==='poi'?(r.ds_type==='SkiResort'?'Place:_':(r.ds_type||'Place')+':'+(add||'_')):add,
      address:{street:'',zip:r.zip||'',city:r.place||''},geo:{lat:r.lat,lon:r.lon,ele:null},
      contact:{phone:'',email:'',url:''},image:{url:'',alt:'',credit:'',licence:''},attrs:{},
      track:[],computed:{},schedule:[],location:'',hours:[],hoursNote:{},
      created:r.modified||r.synced_at,modified:r.modified||r.synced_at};
  }
  async function loadLite(attempt){
    attempt=attempt||0;
    if(!DB.sess){stateUI();return}
    if(loading)return;loading=true;state='loading';stateUI();
    try{
      const rows=[];let off=0,done=false;
      while(!done&&off<60000){
        const batch=await Promise.all([0,1,2,3].map(k=>DB.req('ds_index?select=ds_id,endpoint,type,ds_type,additional_type,name,place,zip,lat,lon,quality,modified,synced_at,projects&order=ds_id&limit='+PAGE+'&offset='+(off+k*PAGE))));
        batch.forEach(b=>{rows.push(...(b||[]));if(!b||b.length<PAGE)done=true});
        off+=4*PAGE;
      }
      LITE=rows.map(toLite);TOKEN={};state='ok';projUI();
      renderAll();
    }catch(e){
      console.warn('Infocenter-Uebersicht nicht geladen',e);
      state='error';stateMsg=e.message||'Fehler';
      loading=false;stateUI();
      if(DB.sess&&attempt<2){setTimeout(()=>loadLite(attempt+1),3000*(attempt+1))}
      return;
    }
    finally{loading=false}
    stateUI();
  }
  ACT.litereload=function(){loadLite(0)};
  function merge(){
    if(!DB.sess){LITE=[];if(state!=='loading')state='idle'}
    if(S.items._lite===TOKEN)return;
    const own=S.items.filter(i=>!i.dsLite);
    S.items=LITE.length?own.concat(LITE):own;S.items._lite=TOKEN;
  }

  /* ---------- Liste, Filter, Qualitaet ---------- */
  const origFiltered0=filtered;
  /* Filter Infocenter-Projekt: leer = kein Filter; sonst nur Infocenter-Objekte dieses Projekts */
  function origFiltered(){
    const f=origFiltered0();const pr=S.dsProject||'';
    return pr?f.filter(i=>i.dsLite&&(i.dsProjects||[]).includes(pr)):f;
  }
  filtered=function(){
    if(OVR){const o=OVR;OVR=null;return o}
    const f=origFiltered();return NOLITE?f.filter(i=>!i.dsLite):f;
  };
  function projUI(){
    const fs=$('#fStatus');if(!fs)return;
    let sel=$('#fProject');
    if(!sel){
      sel=document.createElement('select');sel.id='fProject';sel.title='Infocenter-Projekt';sel.setAttribute('aria-label','Infocenter-Projekt');
      sel.addEventListener('change',e=>{S.dsProject=e.target.value;S.liteLimit=STEP;renderList()});
      fs.insertAdjacentElement('afterend',sel);
    }
    const cnt={};LITE.forEach(i=>(i.dsProjects||[]).forEach(p=>{cnt[p]=(cnt[p]||0)+1}));
    const list=Object.keys(cnt).sort((a,b)=>(a!=='grf-web')-(b!=='grf-web')||a.localeCompare(b));
    const cur=S.dsProject||'';
    sel.innerHTML='<option value="">Alle Infocenter-Projekte</option>'+list.map(p=>'<option value="'+esc(p)+'">Projekt '+esc(p)+' ('+cnt[p].toLocaleString('de-CH')+')</option>').join('');
    sel.value=list.includes(cur)?cur:'';S.dsProject=sel.value;
    sel.hidden=!list.length;
  }
  const origValidate=validate;
  validate=function(it){return isLite(it)?{errs:[],rec:[],score:it.dsQuality}:origValidate(it)};
  const origPointOf=pointOf;
  pointOf=function(it){if(isLite(it)){const g=it.geo;return g&&g.lat!=null&&g.lon!=null?[+g.lon,+g.lat]:null}return origPointOf(it)};
  const origInfo=info;
  info=function(it){
    if(!isLite(it))return origInfo(it);
    const g=it.geo,c=g&&g.lat!=null?(+g.lat).toFixed(5)+', '+(+g.lon).toFixed(5):'keine Koordinate';
    return c+(it.address.zip?' · PLZ '+it.address.zip:'');
  };
  const origLabel=typeLabel;
  typeLabel=function(it){
    if(!isLite(it))return origLabel(it);
    if(it.dsType==='SkiResort')return 'Skigebiet';
    try{
      if(it.type==='poi'){const[c,s]=it.additionalType.split(':');const f=(CLS[c]||[]).find(x=>x[0]===(s||'_'));if(f)return f[1]}
      else{const f=(CLS[TYPES[it.type].cls]||[]).find(x=>x[0]===(it.dsAdd||'_'));if(f)return f[1]}
    }catch(e){}
    return it.dsAdd||it.dsType||TYPES[it.type].label;
  };

  function sortKeyFn(){const sk=S.sort[0];return it=>sk==='name'?nm(it).toLowerCase():sk==='type'?it.type:sk==='q'?validate(it).score:it.modified}
  const origRenderList=renderList;
  renderList=function(){
    merge();
    let total=0,cut=false;
    if(S.view==='table'){
      const full=origFiltered(),key=sortKeyFn(),sd=S.sort[1];total=full.length;
      if(total>S.liteLimit){
        const k=full.map(it=>[key(it),it]);
        k.sort((a,b)=>a[0]<b[0]?-sd:a[0]>b[0]?sd:0);
        OVR=k.slice(0,S.liteLimit).map(x=>x[1]);cut=true;
      }
    }
    try{origRenderList()}finally{OVR=null}
    stateUI();
    const old=$('#liteMore');if(old)old.remove();
    if(cut){
      const c=$('#fCount');if(c)c.textContent=total.toLocaleString('de-CH')+' von '+S.items.length.toLocaleString('de-CH');
      const d=document.createElement('div');d.id='liteMore';d.className='tools';d.style.cssText='justify-content:center;margin:12px 0 24px';
      d.innerHTML='<span class="hint">'+S.liteLimit.toLocaleString('de-CH')+' von '+total.toLocaleString('de-CH')+' Treffern angezeigt. Suche oder Filter grenzen die Liste ein.</span> <button type="button" class="btn sm" data-act="litemore">Weitere '+STEP+' anzeigen</button>';
      const w=$('#tableWrap');if(w)w.appendChild(d);
    }
  };
  ACT.litemore=function(){S.liteLimit+=STEP;renderList()};
  const origRenderAll=renderAll;
  renderAll=function(){merge();origRenderAll()};

  /* Statusfilter "Infocenter" */
  const fs=$('#fStatus');
  if(fs&&!fs.querySelector('option[value="infocenter"]')){const op=document.createElement('option');op.value='infocenter';op.textContent='Infocenter (discover.swiss)';fs.appendChild(op)}

  /* Export: nur eigene Eintraege, keine Uebersichtszeilen */
  if(typeof exportText==='function'){
    const origExport=exportText;
    exportText=function(){const keep=S.items;S.items=keep.filter(i=>!i.dsLite);try{return origExport()}finally{S.items=keep}};
  }

  /* ---------- Karte: Infocenter-Objekte als Punkte-Ebene ---------- */
  let boundMap=null;
  function ensureLayer(){
    const m=M.map;if(!m||!M.ready)return false;
    try{
      if(!m.getSource('dslite'))m.addSource('dslite',{type:'geojson',data:lastGeo});
      if(!m.getLayer('dslite-pts'))m.addLayer({id:'dslite-pts',type:'circle',source:'dslite',paint:{
        'circle-color':['match',['get','t'],'event',COLORS.event,'food',COLORS.food,'offer',COLORS.offer,'poi',COLORS.poi,'tour',COLORS.tour,'webcam',COLORS.webcam,'#555'],
        'circle-radius':['interpolate',['linear'],['zoom'],7,2.5,11,4.5,15,7],
        'circle-stroke-color':'#fff','circle-stroke-width':['interpolate',['linear'],['zoom'],7,0.5,12,1.5],'circle-opacity':0.85}});
      if(boundMap!==m){boundMap=m;
        m.on('click','dslite-pts',e=>{if(S.pick||S.drawing)return;const f=e.features&&e.features[0];if(f)openEditor(f.properties.id)});
        m.on('mouseenter','dslite-pts',e=>{m.getCanvas().style.cursor='pointer';const f=e.features&&e.features[0];if(f)m.getCanvas().title=f.properties.n||''});
        m.on('mouseleave','dslite-pts',()=>{m.getCanvas().style.cursor='';m.getCanvas().title=''});
        m.on('styledata',()=>{if(M.ready&&!m.getLayer('dslite-pts'))ensureLayer()});
      }
      return true;
    }catch(e){console.warn('Infocenter-Ebene nicht hinzugefügt',e);return false}
  }
  const origSyncMap=syncMap;
  syncMap=function(){
    NOLITE=true;try{origSyncMap()}finally{NOLITE=false}
    if(!M.ready)return;
    const D=S.draft;
    lastGeo={type:'FeatureCollection',features:filtered().filter(it=>it.dsLite&&(!D||it.id!==D.id)&&it.geo.lat!=null).map(it=>({type:'Feature',properties:{id:it.id,t:it.type,n:nm(it)},geometry:{type:'Point',coordinates:[+it.geo.lon,+it.geo.lat]}}))};
    if(ensureLayer()){const s=M.map.getSource('dslite');if(s)s.setData(lastGeo)}
    if(typeof mapInfo==='function')mapInfo();
  };

  /* Fuer ds-lite-open.js (Oeffnen und Kopie anlegen) */
  window.DSLITE={CONF_STD,CONF_MASTER,DAYNUM,strip,txt,isLite,newId,loadLite,stateUI};
})();

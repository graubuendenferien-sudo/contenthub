/* Contenthub: Infocenter-Objekte oeffnen und als Kopie speichern (Teil 2 zu ds-lite.js).
   - Holt den vollstaendigen Datensatz ueber die Datenbank aus dem Infocenter.
   - "Kopie anlegen", wahlweise als Master-Objekt (Confidence 20 statt 1).
   Wird direkt nach ds-lite.js geladen. */
(function(){
  'use strict';
  if(!window.DSLITE)return;
  const {CONF_STD,CONF_MASTER,DAYNUM,strip,txt,isLite,newId,loadLite,stateUI}=window.DSLITE;

  /* ---------- Detail aus dem Infocenter holen ---------- */
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function fetchDetail(dsId){
    const ids=await DB.req('rpc/ds_fetch',{method:'POST',body:JSON.stringify({p_id:dsId})});
    const reqs=Object.values(ids||{});
    for(let i=0;i<45;i++){
      await wait(i<3?600:1000);
      const r=await DB.req('rpc/ds_fetch_result',{method:'POST',body:JSON.stringify({p_reqs:reqs})});
      if(r&&r.pending===0)return r.data||{};
    }
    throw new Error('Das Infocenter antwortet nicht.');
  }
  function buildItem(lite,data){
    const de=data.de;
    if(!de||de.error)throw new Error(de&&de.error?de.error:'Keine Daten erhalten.');
    const it=fromDS(de);if(!it)throw new Error('Dieser Typ kann nicht angezeigt werden.');
    /* Weitere Sprachen */
    ['fr','it','en'].forEach(l=>{
      const o=data[l];if(!o||o.error)return;
      if(Array.isArray(o.availableDataLanguage)&&!o.availableDataLanguage.includes(l))return;
      [['name','name'],['description','description'],['short','disambiguatingDescription']].forEach(([k,src])=>{const v=strip(txt(o[src]));if(v){it[k]=it[k]||{};it[k][l]=v}});
    });
    /* Ort einer Veranstaltung */
    const loc=Array.isArray(de.location)?de.location[0]:de.location;
    if((!it.geo||it.geo.lat==null)&&loc&&loc.geo&&loc.geo.latitude!=null)it.geo={lat:+loc.geo.latitude,lon:+loc.geo.longitude,ele:loc.geo.elevation!=null?+loc.geo.elevation:null};
    if(loc&&loc.address&&it.address&&!it.address.city){const a=loc.address;it.address={street:a.streetAddress||'',zip:a.postalCode||'',city:a.addressLocality||''}}
    /* Wiederkehrende Termine */
    if(it.type==='event'&&Array.isArray(de.eventSchedule)){
      de.eventSchedule.forEach((s,i)=>{
        const sc=it.schedule&&it.schedule[i];if(!sc||!Array.isArray(s.byDay)||!s.byDay.length)return;
        const sd=String(s.startDate||'').slice(0,10),ed=String(s.endDate||'').slice(0,10);if(!(ed>sd))return;
        const days=[...new Set(s.byDay.map(x=>DAYNUM[String(x).split('/').pop().toLowerCase()]).filter(x=>x!=null))];
        Object.assign(sc,{repeat:'weekly',byDay:days,until:ed,endDate:''});
      });
    }
    /* Tourverlauf als Text "lon,lat,ele lon,lat,ele" */
    if(it.type==='tour'&&(!it.track||!it.track.length)&&de.geoShape&&typeof de.geoShape.line==='string'){
      it.track=de.geoShape.line.trim().split(/\s+/).map(p=>p.split(',').map(Number)).filter(c=>c.length>=2&&isFinite(c[0])&&isFinite(c[1]))
        .map(c=>c.length>2&&isFinite(c[2])?{x:c[0],y:c[1],z:c[2],s:'import'}:{x:c[0],y:c[1],z:null});
    }
    it.id=lite.id;it.dsId=lite.dsId;it.dsView=true;it.status='draft';it.modified=lite.modified;it.confidence=CONF_STD;
    delete it.ownerOrg;delete it.dsLite;
    return it;
  }
  let opening=null;
  const origOpen=openEditor;
  openEditor=function(idOrItem,isNew){
    const src=typeof idOrItem==='string'?S.items.find(i=>i.id===idOrItem):idOrItem;
    if(!isLite(src))return origOpen(idOrItem,isNew);
    if(S.draft&&S.dirty){toast('Ungespeicherte Änderungen – bitte zuerst speichern oder verwerfen.');return}
    if(!DB.sess){toast('Bitte anmelden, um Infocenter-Objekte zu öffnen.');return}
    if(opening===src.id)return;
    opening=src.id;toast('«'+nm(src)+'» wird aus dem Infocenter geladen …');
    (async()=>{
      try{
        const data=await fetchDetail(src.dsId);
        if(opening!==src.id)return;
        if(S.draft&&S.dirty)return;
        origOpen(buildItem(src,data),false);
      }catch(e){toast('Infocenter-Objekt konnte nicht geladen werden: '+e.message)}
      finally{if(opening===src.id)opening=null}
    })();
  };

  /* ---------- Formular: Hinweis, "Kopie anlegen", Master-Objekt ---------- */
  function decorate(){
    const D=S.draft,ed=$('#ed');
    ['#dsLiteNote','#dsMasterBox'].forEach(q=>{const o=$(q);if(o)o.remove()});
    const sv=$('#drawer .df [data-act="save"]'),dl=$('#delBtn');
    if(sv)sv.textContent=D&&D.dsView?'Kopie anlegen':'Speichern';
    if(!D||!ed)return;
    if(D.dsView){
      if(dl)dl.hidden=true;
      $('#dTitle').textContent=TYPES[D.type].label+' aus dem Infocenter';
      const n=document.createElement('div');n.id='dsLiteNote';n.className='note';
      n.innerHTML='<b>Infocenter-Objekt aus discover.swiss</b> (ID '+esc(D.dsId)+'). Das Original wird hier nicht verändert. '+
        'Mit «Kopie anlegen» speichern Sie Ihre Fassung als eigenen Eintrag Ihrer Organisation. '+
        'Ohne Häkchen erhält die Kopie Confidence '+CONF_STD+', als Master-Objekt Confidence '+CONF_MASTER+' – im Infocenter überschreibt die höhere Confidence die tiefere.';
      ed.insertBefore(n,ed.firstChild);
    }else if(D.copyOf){
      const n=document.createElement('div');n.id='dsLiteNote';n.className='hint';
      n.textContent='Kopie des Infocenter-Objekts '+D.copyOf+' · Confidence '+(D.confidence||CONF_STD)+((D.confidence||0)>=CONF_MASTER?' (Master-Objekt)':'');
      ed.insertBefore(n,ed.firstChild);
    }
    if((D.dsView||D.copyOf)&&sv&&!sv.hidden){
      const lab=document.createElement('label');lab.id='dsMasterBox';lab.style.cssText='display:inline-flex;align-items:center;gap:6px;margin-right:10px;font-size:13px;cursor:pointer';
      lab.title='Confidence '+CONF_MASTER+' statt '+CONF_STD+': Diese Fassung hat im Infocenter Vorrang vor Fassungen mit tieferer Confidence.';
      lab.innerHTML='<input type="checkbox" id="dsMaster"'+((D.confidence||0)>=CONF_MASTER?' checked':'')+'> als Master-Objekt markieren';
      sv.parentNode.insertBefore(lab,sv.previousElementSibling&&sv.previousElementSibling.dataset.act==='close'?sv.previousElementSibling:sv);
      lab.querySelector('input').addEventListener('change',e=>{
        if(S.draft!==D)return;D.confidence=e.target.checked?CONF_MASTER:CONF_STD;
        if(!D.dsView)S.dirty=true;
        const h=$('#dsLiteNote');if(h&&D.copyOf)h.textContent='Kopie des Infocenter-Objekts '+D.copyOf+' · Confidence '+D.confidence+(D.confidence>=CONF_MASTER?' (Master-Objekt)':'');
      });
    }
  }
  const origRE=renderEditor;
  renderEditor=function(keep){origRE(keep);decorate()};

  const origSave=ACT.save,origDel=ACT.del;
  ACT.save=async function(b,e){
    const D=S.draft;
    if(D&&D.dsView){
      if(!DB.sess){toast('Bitte anmelden, um eine Kopie anzulegen.');return}
      if(!HUB.me){toast('Ihr Konto ist noch keiner Destination zugeordnet. Eine Kopie ist nicht möglich.');return}
      const m=$('#dsMaster');
      D.confidence=m&&m.checked?CONF_MASTER:CONF_STD;
      D.copyOf=D.dsId;D.source='copy';D.id=newId();D.ownerOrg=HUB.me.org_id;D.created=new Date().toISOString();
      if(!D.status||D.status==='infocenter')D.status='draft';
      delete D.dsView;delete D.dsLite;
      S.isNew=true;
      if(typeof save==='function')await save();else origSave(b,e);
      if(S.items.some(i=>i.id===D.id))toast('Kopie angelegt (Confidence '+D.confidence+'). Sie finden sie unter Ihren Einträgen.');
      return;
    }
    return origSave(b,e);
  };
  ACT.del=function(b,e){
    if(S.draft&&S.draft.dsView){toast('Infocenter-Objekte können hier nicht gelöscht werden.');return}
    return origDel(b,e);
  };

  /* ---------- Start und Neuladen ---------- */
  const origPull=pull;
  pull=async function(){await origPull();await loadLite()};
  if(DB.sess)loadLite();else stateUI();
})();

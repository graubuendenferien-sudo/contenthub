/* Contenthub: Infocenter-Objekte oeffnen und als Entwurf im Hub speichern (Teil 2 zu ds-lite.js).
   - Holt den vollstaendigen Datensatz ueber die Datenbank aus dem Infocenter.
   - "Als Entwurf speichern": bleibt nur im Hub (hubOnly), geht nie ans Infocenter.
   - "Als Kopie speichern": wird spaeter ans Infocenter uebermittelt, wahlweise als Master-Objekt (Confidence 20 statt 1).
   - Loeschen mit deutlicher Rueckfrage.
   - Touren: Hoehen und Kennzahlen aus dem Infocenter werden nicht uebernommen (Urheberrecht),
     sondern aus dem eigenen Hoehenmodell (map.graubuenden.ch) neu berechnet.
   - Dauer auch fuer Touren ohne bekannte Tourart ("Route" u. a.): Annahme Wandern oder gewaehlte Berechnungsart (timeProfile).
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
    /* Aktivitaet aus den Infocenter-Kategorien (fuer die Berechnung der Dauer) */
    if(it.type==='tour'){const ap=profFromCats(de.category);if(ap)it.autoProfile=ap}
    it.id=lite.id;it.dsId=lite.dsId;it.dsView=true;it.status='draft';it.modified=lite.modified;it.confidence=CONF_STD;
    delete it.ownerOrg;delete it.dsLite;
    return it;
  }
  /* Kategorien (discover.swiss Themen-SUI) -> Berechnungsart; spezifischere Codes zuerst */
  function profFromCats(cats){
    const ids=(Array.isArray(cats)?cats:[]).map(c=>String(c&&c.identifier||'')).filter(Boolean);
    const has=re=>ids.some(i=>re.test(i));
    if(has(/^sui_011014$/))return 'ski';
    if(has(/^sui_011007$/))return 'xc';
    if(has(/^sui_011011$/)||has(/^sui_011020$/))return 'snow';
    if(has(/^sui_0102/))return 'bike';
    if(has(/^sui_0101/))return 'hike';
    return null;
  }
  /* ---------- Touren: eigene Berechnung statt kopierter Werte ---------- */
  const hasForeign=D=>D&&D.type==='tour'&&Array.isArray(D.track)&&D.track.some(p=>p.s==='import');
  function stripForeign(D){
    D.track=D.track.map(p=>({x:p.x,y:p.y,z:null}));
    delete D.computed;delete D.timeOverride;D.ownCalc=true;
  }
  async function recalcOwn(D){
    if(typeof recalcTour!=='function'||S.draft!==D)return false;
    await recalcTour();
    return S.draft===D&&D.computed&&D.computed.ascent!=null;
  }
  async function ensureOwn(D){
    const ok=await recalcOwn(D);
    if(S.draft!==D)return;
    if(ok){S.isNew=false;await save()}
    else toast('Kopierte Höhenwerte wurden entfernt. Für Aufstieg, Abstieg und Höhen braucht es den Kartenserver mit Höhenmodell – bitte verbinden und den Eintrag erneut speichern.');
  }

  /* ---------- Dauer: Berechnungsart fuer Touren ohne bekannte Tourart ---------- */
  const PROF_LABEL={hike:'Wandern',snow:'Winterwandern / Schneeschuh',ski:'Skitour',xc:'Langlauf',bike:'Velo / Bike'};
  const DEFAULT_PROF={Route:'hike'};
  const unmapped=D=>!(typeof TOURMAP!=='undefined'&&TOURMAP[D.additionalType||'']);
  if(typeof tourStats==='function'&&typeof TOURP!=='undefined'&&typeof calcTime==='function'){
    const origTS=tourStats;
    tourStats=function(D,prof){
      const c=origTS(D,prof);
      if(!D||!unmapped(D)||!c.length)return c;
      const key=D.timeProfile||D.autoProfile||DEFAULT_PROF[D.additionalType||''],tp=key&&TOURP[key];
      if(tp){c.time=calcTime(c.length,c.ascent,c.descent,tp);c.timeRule=tp.l+(D.timeProfile?'':D.autoProfile?' (aus der Kategorie im Infocenter)':' (Annahme – Berechnungsart unten anpassen)')}
      return c;
    };
  }
  if(typeof renderTourStats==='function'){
    const origRTS=renderTourStats;
    renderTourStats=function(){
      origRTS();
      const D=S.draft,box=$('#tourStats');
      if(!D||D.type!=='tour'||!box||!unmapped(D)||D.dsView)return;
      if(HUB.canEdit&&!HUB.canEdit(D))return;
      const cur=D.timeProfile||D.autoProfile||DEFAULT_PROF[D.additionalType||'']||'';
      const wrap=document.createElement('label');wrap.className='f';wrap.style.marginTop='10px';
      wrap.innerHTML='<span>Dauer berechnen als</span><select id="tourProf"><option value="">– keine Berechnung –</option>'+
        Object.entries(PROF_LABEL).map(([k,l])=>'<option value="'+k+'"'+(k===cur?' selected':'')+'>'+l+'</option>').join('')+'</select>';
      box.appendChild(wrap);
      wrap.querySelector('select').addEventListener('change',e=>{
        if(S.draft!==D)return;
        const v=e.target.value;
        if(v)D.timeProfile=v;else if(D.autoProfile||DEFAULT_PROF[D.additionalType||''])D.timeProfile='none';else delete D.timeProfile;
        S.dirty=true;
        if(typeof recalcTour==='function')recalcTour();else{D.computed=tourStats(D);renderTourStats()}
      });
    };
  }

  let opening=null;
  const origOpen=openEditor;
  openEditor=function(idOrItem,isNew){
    const src=typeof idOrItem==='string'?S.items.find(i=>i.id===idOrItem):idOrItem;
    if(!isLite(src)){
      const r=origOpen(idOrItem,isNew),D=S.draft;
      /* Bestehende Kopien mit uebernommenen Hoehen: einmalig neu berechnen */
      if(D&&D.copyOf&&!D.ownCalc&&hasForeign(D)&&(!HUB.canEdit||HUB.canEdit(D))){
        stripForeign(D);S.dirty=true;renderEditor(true);
        toast('Höhenwerte aus dem Infocenter wurden entfernt und werden neu berechnet …');
        ensureOwn(D);
      }else if(typeof calcTime==='function'&&typeof TOURP!=='undefined'&&D&&D.type==='tour'&&D.computed&&D.computed.time==null&&D.computed.length&&unmapped(D)&&(!HUB.canEdit||HUB.canEdit(D))){
        /* Gespeicherte Tour ohne Dauer: Dauer nachrechnen (Speichern noetig) */
        const c=D.computed,key=D.timeProfile||D.autoProfile||DEFAULT_PROF[D.additionalType||''],tp=key&&TOURP[key];
        if(tp){c.time=calcTime(c.length,c.ascent,c.descent,tp);c.timeRule=tp.l+(D.timeProfile?'':D.autoProfile?' (aus der Kategorie im Infocenter)':' (Annahme – Berechnungsart unten anpassen)');S.dirty=true;renderEditor(true);toast('Die Dauer wurde berechnet. Bitte speichern.')}
      }
      return r;
    }
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

  /* ---------- Formular: Hinweis, Entwurf oder Kopie, Master-Objekt ---------- */
  function decorate(){
    const D=S.draft,ed=$('#ed');
    ['#dsLiteNote','#dsMasterBox','#dsDraftBtn'].forEach(q=>{const o=$(q);if(o)o.remove()});
    const sv=$('#drawer .df [data-act="save"]'),dl=$('#delBtn');
    if(sv)sv.textContent=D&&D.dsView?'Als Kopie speichern':'Speichern';
    if(!D||!ed)return;
    if(D.dsView){
      if(dl)dl.hidden=true;
      $('#dTitle').textContent=TYPES[D.type].label+' aus dem Infocenter';
      const n=document.createElement('div');n.id='dsLiteNote';n.className='note';
      n.innerHTML='<b>Infocenter-Objekt aus discover.swiss</b> (ID '+esc(D.dsId)+'). Das Original wird hier nicht verändert. '+
        '<br>«Als Entwurf speichern»: Ihre Fassung bleibt nur im Hub und wird nie ans Infocenter übermittelt. '+
        '<br>«Als Kopie speichern»: Ihre Fassung wird später ans Infocenter übermittelt – mit Confidence '+CONF_STD+', als Master-Objekt mit Confidence '+CONF_MASTER+' (die höhere Confidence überschreibt die tiefere).';
      ed.insertBefore(n,ed.firstChild);
      if(sv&&!sv.hidden){
        const db=document.createElement('button');db.type='button';db.id='dsDraftBtn';db.className='btn';db.dataset.act='dssavedraft';
        db.textContent='Als Entwurf speichern';db.title='Nur im Hub speichern, nie ans Infocenter übermitteln';
        sv.parentNode.insertBefore(db,sv);
      }
    }else if(D.copyOf){
      const n=document.createElement('div');n.id='dsLiteNote';n.className='hint';
      n.textContent=D.hubOnly?'Entwurf auf Basis des Infocenter-Objekts '+D.copyOf+' · nur im Hub, wird nicht ans Infocenter übermittelt':
        'Kopie des Infocenter-Objekts '+D.copyOf+' · Confidence '+(D.confidence||CONF_STD)+((D.confidence||0)>=CONF_MASTER?' (Master-Objekt)':'');
      ed.insertBefore(n,ed.firstChild);
    }
    if((D.dsView||D.copyOf&&!D.hubOnly)&&sv&&!sv.hidden){
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
  let asDraft=false;
  ACT.dssavedraft=function(b,e){asDraft=true;return ACT.save(b,e)};
  ACT.save=async function(b,e){
    const D=S.draft,hubOnly=asDraft;asDraft=false;
    if(D&&D.dsView){
      if(!DB.sess){toast('Bitte anmelden, um einen Entwurf zu speichern.');return}
      if(!HUB.me){toast('Ihr Konto ist noch keiner Destination zugeordnet. Speichern ist nicht möglich.');return}
      const m=$('#dsMaster');
      D.confidence=!hubOnly&&m&&m.checked?CONF_MASTER:CONF_STD;
      if(hubOnly)D.hubOnly=true;else delete D.hubOnly;
      D.copyOf=D.dsId;D.source='copy';D.id=newId();D.ownerOrg=HUB.me.org_id;D.created=new Date().toISOString();
      D.status='draft';
      delete D.dsView;delete D.dsLite;
      const tour=hasForeign(D)||D.type==='tour';
      if(tour&&Array.isArray(D.track))stripForeign(D);
      S.isNew=true;
      if(typeof save==='function')await save();else origSave(b,e);
      if(tour&&S.items.some(i=>i.id===D.id)){await ensureOwn(D);if(S.draft===D&&D.computed&&D.computed.ascent!=null)toast((hubOnly?'Als Entwurf':'Als Kopie')+' gespeichert. Länge und Höhenwerte wurden aus dem eigenen Höhenmodell neu berechnet.');return}
      if(S.items.some(i=>i.id===D.id))toast(hubOnly?'Als Entwurf gespeichert. Er bleibt nur im Hub und wird nicht ans Infocenter übermittelt.':
        'Als Kopie gespeichert (Confidence '+D.confidence+'). Sie wird später ans Infocenter übermittelt; bis dahin ändert sich dort nichts.');
      return;
    }
    return origSave(b,e);
  };
  ACT.del=function(b,e){
    const D=S.draft;if(!D)return;
    if(D.dsView){toast('Infocenter-Objekte können hier nicht gelöscht werden.');return}
    if(!window.confirm('«'+nm(D)+'» wirklich löschen?\n\nDer Eintrag wird aus dem Hub entfernt.'+(D.copyOf?' Das Original im Infocenter bleibt unverändert.':'')))return;
    ACT.del.armed=true;
    return origDel(b,e);
  };

  /* ---------- Start und Neuladen ---------- */
  const origPull=pull;
  pull=async function(){await origPull();await loadLite()};
  if(DB.sess)loadLite();else stateUI();
})();

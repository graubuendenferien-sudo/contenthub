/* Contenthub-Erweiterung: Organisationen, Rollen, Status, Schreibschutz, Freigabe, Bild-Upload.
   Wird nach app.js und map-config.js geladen. Die Rechte werden in der Datenbank durchgesetzt;
   diese Datei sorgt nur fuer die passende Anzeige. */
(function(){
  'use strict';
  if(typeof DB==='undefined'||typeof S==='undefined'||typeof F==='undefined'||typeof ACT==='undefined')return;

  const HUB=window.HUB={me:null,orgs:{},owner:{},partner:!!window.PARTNER};
  const STATUS={draft:'Entwurf',submitted:'Eingereicht',changes_requested:'Zur Überarbeitung',published:'Publiziert',rejected:'Abgelehnt',archived:'Archiviert'};
  const OWN_STATUS=['draft','published','archived'];
  HUB.STATUS=STATUS;

  function jwtSub(t){try{const p=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(p)).sub||null}catch(e){return null}}
  function ownerOf(it){return it?(it.ownerOrg||HUB.owner[it.id]||null):null}
  function orgName(id){return id?(HUB.orgs[id]||'Unbekannte Organisation'):''}
  function canEdit(it){if(HUB.partner)return true;if(!it||it.demo)return true;if(!DB.sess)return true;if(!HUB.me)return false;const o=ownerOf(it);return HUB.me.role==='admin'||!o||o===HUB.me.org_id}
  function canReview(it){return !HUB.partner&&!!HUB.me&&(HUB.me.role==='admin'||HUB.me.role==='approver')&&canEdit(it)}
  HUB.canEdit=canEdit;HUB.ownerOf=ownerOf;

  async function loadHub(){
    HUB.me=null;HUB.orgs={};
    if(!DB.sess){userUI();return}
    try{
      const orgs=await DB.req('organisations?select=id,name&order=name');
      (orgs||[]).forEach(o=>{HUB.orgs[o.id]=o.name});
      const sub=jwtSub(DB.sess.access_token);
      if(sub){const p=await DB.req('profiles?select=org_id,role&user_id=eq.'+encodeURIComponent(sub));HUB.me=(p&&p[0])||null}
    }catch(e){console.warn('Organisation konnte nicht geladen werden',e)}
    userUI();
  }

  /* Eintraege mit Eigentuemerin und Status aus der Datenbank laden */
  DB.fetchAll=async function(){
    const out=[];
    for(let off=0;off<20000;off+=1000){
      const rows=await this.req('items?select=data,status,owner_org&order=updated_at.desc&limit=1000&offset='+off);
      rows.forEach(r=>{const d=r.data;if(!d)return;d.status=r.status;d.ownerOrg=r.owner_org;HUB.owner[d.id]=r.owner_org;out.push(d)});
      if(rows.length<1000)break;
    }
    return out;
  };

  const origPull=pull;
  pull=async function(){
    await loadHub();
    await origPull();
    if(HUB.partner||!DB.sess||!DB.online)return;
    if(!HUB.me){toast('Ihr Konto ist noch keiner Destination zugeordnet. Lesen ist möglich, Speichern nicht.');return}
    const n=S.items.filter(i=>i.status==='submitted'&&canReview(i)).length;
    if(n)toast(n===1?'1 Eintrag wartet auf Ihre Freigabe (Filter «Eingereicht»).':n+' Einträge warten auf Ihre Freigabe (Filter «Eingereicht»).');
  };

  const origUserUI=userUI;
  userUI=function(){
    origUserUI();
    if(DB.sess&&HUB.me){const t=$('#userTxt');t.textContent=DB.sess.email+' · '+orgName(HUB.me.org_id)+' · Abmelden'}
  };

  const origNewItem=newItem;
  newItem=function(type){const it=origNewItem(type);if(HUB.me&&!HUB.partner)it.ownerOrg=HUB.me.org_id;return it};

  /* Statusauswahl im Formular */
  const origSel=F.sel;
  F.sel=function(k,l,opts,o){
    if(k==='status'&&S.draft){
      if(HUB.partner)return '';
      const cur=S.draft.status;let list=OWN_STATUS.slice();
      if(cur&&!list.includes(cur))list.unshift(cur);
      if(cur==='submitted'&&HUB.me&&HUB.me.role==='editor')list=[cur];
      opts=list.map(s=>[s,STATUS[s]||s]);
    }
    return origSel.call(F,k,l,opts,o);
  };

  /* Statusfilter ergaenzen */
  const fs=$('#fStatus');
  if(fs){['submitted','changes_requested','rejected','archived'].forEach(s=>{if(!fs.querySelector('option[value="'+s+'"]')){const op=document.createElement('option');op.value=s;op.textContent=STATUS[s];fs.appendChild(op)}})}

  /* Liste: Status und Eigentuemerin anzeigen */
  const origRenderList=renderList;
  renderList=function(){
    origRenderList();
    $$('#tableWrap tr[data-id]').forEach(tr=>{
      const it=S.items.find(i=>i.id===tr.dataset.id);if(!it)return;
      const st=tr.children[6]&&tr.children[6].querySelector('.tag');
      if(st){st.textContent=STATUS[it.status]||it.status;st.classList.toggle('pub',it.status==='published')}
      const o=ownerOf(it),cell=tr.children[1];
      if(o&&cell&&HUB.me&&o!==HUB.me.org_id){const sp=document.createElement('span');sp.className='tag';sp.textContent=orgName(o);cell.appendChild(document.createTextNode(' '));cell.appendChild(sp)}
    });
  };

  /* Freigabe: Angaben zur Einreichung und Aktionen */
  function reviewBox(D){
    const box=document.createElement('div');box.id='hubReview';box.className='note';
    box.innerHTML='<b>Von einem Partner eingereicht – wartet auf Freigabe.</b><div id="revInfo" style="margin:6px 0">Angaben zur Einreichung werden geladen …</div>'+
      '<label class="f"><span>Begründung (Pflicht bei Zurückweisen und Ablehnen, geht an den Partner)</span><textarea id="revComment" rows="2"></textarea></label>'+
      '<div class="tools" style="margin:8px 0 0"><button type="button" class="btn pri sm" data-act="review" data-a="approve">Freigeben und publizieren</button>'+
      '<button type="button" class="btn sm" data-act="review" data-a="return">Zur Überarbeitung zurückweisen</button>'+
      '<button type="button" class="btn dan sm" data-act="review" data-a="reject">Ablehnen</button></div>';
    DB.req('partner_submissions?select=contact_name,contact_email,plz,review_comment&item_id=eq.'+encodeURIComponent(D.id)).then(rows=>{
      const el=$('#revInfo');if(!el||S.draft!==D)return;const r=rows&&rows[0];
      el.textContent=r?'Eingereicht von '+r.contact_name+' ('+r.contact_email+'), PLZ '+r.plz+'.'+(r.review_comment?' Letzte Rückmeldung: '+r.review_comment:''):'Keine Angaben zur Einreichung vorhanden.';
    }).catch(()=>{const el=$('#revInfo');if(el)el.textContent='Angaben zur Einreichung konnten nicht geladen werden.'});
    return box;
  }
  ACT.review=async function(b){
    const D=S.draft;if(!D)return;
    if(S.dirty){toast('Bitte zuerst Ihre Änderungen speichern, dann freigeben.');return}
    const a=b.dataset.a,c=($('#revComment')||{}).value||'';
    if(a!=='approve'&&c.trim().length<3){toast('Bitte eine Begründung angeben.');const t=$('#revComment');if(t)t.focus();return}
    $$('#hubReview button').forEach(x=>{x.disabled=true});
    try{
      const r=await DB.req('rpc/review_submission',{method:'POST',body:JSON.stringify({p_item_id:D.id,p_action:a,p_comment:c.trim()||null})});
      const it=S.items.find(i=>i.id===D.id);if(it)it.status=r.status;
      closeEditor();
      toast(a==='approve'?'Eintrag freigegeben und publiziert.':a==='return'?'Eintrag zur Überarbeitung zurückgewiesen.':'Eintrag abgelehnt.');
    }catch(e){$$('#hubReview button').forEach(x=>{x.disabled=false});toast('Freigabe fehlgeschlagen: '+e.message)}
  };

  /* Formular: Eigentuemerin anzeigen, fremde Eintraege sperren */
  function decorateEditor(){
    const D=S.draft,ed=$('#ed');if(!D||!ed||HUB.partner)return;
    const lock=!canEdit(D),o=ownerOf(D);
    ['#hubOwner','#hubReview'].forEach(q=>{const old=$(q);if(old)old.remove()});
    if(DB.sess&&(o||lock)){
      const box=document.createElement('div');box.id='hubOwner';box.className=lock?'note':'hint';
      box.textContent=!HUB.me?'Ihr Konto ist noch keiner Destination zugeordnet. Dieser Eintrag kann nur gelesen werden.':
        lock?'Eintrag von '+orgName(o)+'. Sie können ihn ansehen, aber nicht bearbeiten.':'Eigentümerin: '+orgName(o);
      ed.insertBefore(box,ed.firstChild);
    }
    if(lock){$$('input,select,textarea,button',ed).forEach(el=>{if(el.dataset.act!=='jsonprev')el.disabled=true})}
    if(D.status==='submitted'&&canReview(D)&&!S.isNew)ed.insertBefore(reviewBox(D),ed.firstChild);
    const sv=$('#drawer .df [data-act="save"]'),dl=$('#delBtn');
    if(sv)sv.hidden=lock;if(dl)dl.hidden=lock;
  }
  const origRenderEditor=renderEditor;
  renderEditor=function(keep){origRenderEditor(keep);decorateEditor()};

  const origSave=ACT.save,origDel=ACT.del;
  ACT.save=function(b,e){
    if(S.draft&&!canEdit(S.draft)){toast('Dieser Eintrag gehört einer anderen Destination und kann nicht gespeichert werden.');return}
    if(S.draft&&HUB.me&&!S.draft.ownerOrg)S.draft.ownerOrg=HUB.me.org_id;
    return origSave(b,e);
  };
  ACT.del=function(b,e){
    if(S.draft&&!canEdit(S.draft)){toast('Dieser Eintrag gehört einer anderen Destination und kann nicht gelöscht werden.');return}
    return origDel(b,e);
  };

  /* ===================== Bild-Upload ===================== */
  const IMG_TYPES=['image/jpeg','image/png','image/webp'],MAX_EDGE=2560,MAX_BYTES=10*1024*1024;
  const origSecImage=secImage;
  secImage=function(){
    const html=origSecImage(),u=S.draft&&S.draft.image&&S.draft.image.url||'';
    const own=u.indexOf(CFG.sb.url+'/storage/v1/object/public/media/')===0;
    const extra='<div class="tools" style="margin-top:10px"><button type="button" class="btn sm" data-act="imgpick">Bild hochladen</button>'+
      '<input type="file" id="imgFile" data-file="image" accept="image/jpeg,image/png,image/webp" hidden></div>'+
      '<p class="hint" id="imgMsg" aria-live="polite">JPEG, PNG oder WebP. Grosse Bilder werden automatisch verkleinert.</p>'+
      (own?'<img src="'+esc(u)+'" alt="" style="max-width:220px;max-height:150px;border-radius:8px;border:1px solid var(--line)">':'');
    const i=html.lastIndexOf('</');
    return i>0?html.slice(0,i)+extra+html.slice(i):html+extra;
  };
  ACT.imgpick=function(){
    if(!HUB.partner){
      if(!DB.sess){toast('Bitte zuerst anmelden, um Bilder hochzuladen.');return}
      if(!HUB.me){toast('Ihr Konto ist noch keiner Destination zugeordnet.');return}
    }
    const f=$('#imgFile');if(f)f.click();
  };
  async function shrink(file){
    let bmp;try{bmp=await createImageBitmap(file)}catch(e){throw new Error('Die Datei ist kein lesbares Bild.')}
    const big=Math.max(bmp.width,bmp.height);
    if(big<=MAX_EDGE&&file.size<=2.5*1024*1024)return{blob:file,type:file.type};
    const f=Math.min(1,MAX_EDGE/big),c=document.createElement('canvas');
    c.width=Math.round(bmp.width*f);c.height=Math.round(bmp.height*f);
    const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(bmp,0,0,c.width,c.height);
    const blob=await new Promise(res=>c.toBlob(res,'image/jpeg',0.85));
    if(!blob)throw new Error('Das Bild konnte nicht verkleinert werden.');
    return{blob,type:'image/jpeg'};
  }
  async function uploadImage(file){
    const D=S.draft,msg=()=>$('#imgMsg'),say=t=>{const m=msg();if(m)m.textContent=t};
    if(!D||!file)return;
    if(!IMG_TYPES.includes(file.type)){say('Nur JPEG, PNG oder WebP sind möglich.');return}
    try{
      say('Bild wird vorbereitet …');
      const r=await shrink(file);
      if(r.blob.size>MAX_BYTES){say('Das Bild ist auch verkleinert grösser als 10 MB.');return}
      const headers={apikey:CFG.sb.key,'Content-Type':r.type,'Cache-Control':'max-age=31536000'};
      let folder='partner';
      if(!HUB.partner){
        if(DB.sess.exp-Date.now()<60000)await DB.refresh();
        headers.Authorization='Bearer '+DB.sess.access_token;folder=HUB.me.org_id;
      }
      const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[r.type];
      const path=folder+'/'+D.id+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)+'.'+ext;
      say('Bild wird hochgeladen …');
      const resp=await fetch(CFG.sb.url+'/storage/v1/object/media/'+path,{method:'POST',headers,body:r.blob});
      if(!resp.ok){const j=await resp.json().catch(()=>({}));throw new Error(j.message||j.error||('HTTP '+resp.status))}
      if(S.draft!==D)return;
      D.image.url=CFG.sb.url+'/storage/v1/object/public/media/'+path;S.dirty=true;
      renderEditor(true);updQual();
      say('Bild hochgeladen. Bitte Bildbeschreibung und Urheber ergänzen und danach speichern.');
    }catch(e){say('Upload fehlgeschlagen: '+e.message)}
  }
  document.addEventListener('change',e=>{const t=e.target;if(t&&t.dataset&&t.dataset.file==='image'){const f=t.files&&t.files[0];if(f)uploadImage(f)}});

  /* Start: Organisation laden und Liste neu aufbauen */
  if(HUB.partner)return;
  if(DB.sess)pull();else userUI();
})();

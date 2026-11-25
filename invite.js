/* Contenthub: Mitarbeitende einladen und Passwort festlegen.
   - Admins und Freigeber sehen im Menue "Mitarbeitende einladen". Die Datenbank erzeugt einen
     persoenlichen Einladungslink (24 Stunden gueltig), der per E-Mail weitergegeben wird.
   - Wer ueber einen solchen Link kommt, legt hier sein Passwort fest und ist danach angemeldet.
   Wird nach app.js und hub-ext.js geladen. app.js bleibt unveraendert. */
(function(){
  'use strict';
  if(window.PARTNER||typeof DB==='undefined'||typeof HUB==='undefined'||typeof dialog!=='function')return;

  const ROLES={editor:'Bearbeiter/in',approver:'Freigeber/in',admin:'Admin'};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const canInvite=()=>!!(DB.sess&&HUB.me&&(HUB.me.role==='admin'||HUB.me.role==='approver'));

  /* ---------- 1. Rueckkehr ueber Einladungs- oder Passwort-Link ---------- */
  const hp=new URLSearchParams((location.hash||'').replace(/^#/,''));
  if(hp.get('access_token')||hp.get('error')){
    try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  }
  const tok=hp.get('access_token'),typ=hp.get('type')||'';
  if(tok&&['invite','recovery','signup','magiclink'].includes(typ)){
    setTimeout(()=>pwDialog({access_token:tok,refresh_token:hp.get('refresh_token')||'',expires_in:+hp.get('expires_in')||3600},typ),0);
  }else if(hp.get('error')){
    const d=hp.get('error_code')==='otp_expired'?'Der Link ist abgelaufen oder wurde bereits verwendet. Bitte eine neue Einladung anfordern.':(hp.get('error_description')||'Der Link ist ungültig.');
    setTimeout(()=>toast(d),0);
  }

  function pwDialog(t,typ){
    dialog(typ==='invite'?'Willkommen im Contenthub':'Neues Passwort festlegen',
      `<p class="hint">${typ==='invite'?'Legen Sie Ihr Passwort fest. Danach sind Sie angemeldet.':'Legen Sie ein neues Passwort fest.'} Mindestens 10 Zeichen.</p>
      <form id="pwForm" class="g" style="gap:12px">
        <label class="f"><span>Neues Passwort</span><input id="pw1" type="password" autocomplete="new-password" minlength="10" required></label>
        <label class="f"><span>Passwort wiederholen</span><input id="pw2" type="password" autocomplete="new-password" minlength="10" required></label>
        <div class="f"><button class="btn pri" type="submit" id="pwGo">Passwort speichern</button></div>
      </form><div id="pwMsg" aria-live="polite"></div>`);
    const msg=m=>{$('#pwMsg').innerHTML=m?`<div class="note err" role="alert">${esc(m)}</div>`:''};
    $('#pwForm').addEventListener('submit',async e=>{
      e.preventDefault();
      const a=$('#pw1').value,b=$('#pw2').value,btn=$('#pwGo');
      if(a.length<10){msg('Das Passwort braucht mindestens 10 Zeichen.');return}
      if(a!==b){msg('Die beiden Passwörter stimmen nicht überein.');return}
      btn.disabled=true;btn.textContent='Speichern …';msg('');
      try{
        const r=await fetch(CFG.sb.url+'/auth/v1/user',{method:'PUT',headers:{apikey:CFG.sb.key,Authorization:'Bearer '+t.access_token,'Content-Type':'application/json'},body:JSON.stringify({password:a})});
        const j=await r.json().catch(()=>({}));
        if(!r.ok){
          const m=j.msg||j.message||j.error_description||'';
          throw new Error(r.status===401?'Der Link ist abgelaufen. Bitte eine neue Einladung anfordern.':/same|different/i.test(m)?'Bitte ein anderes Passwort als bisher wählen.':/weak|short|characters/i.test(m)?'Das Passwort ist zu schwach. Bitte länger oder vielfältiger wählen.':(m||'Speichern fehlgeschlagen ('+r.status+').'));
        }
        DB.sess={access_token:t.access_token,refresh_token:t.refresh_token,email:j.email||'',exp:Date.now()+t.expires_in*1000};
        DB.keep();closeDialog();userUI();
        toast('Passwort gespeichert. Sie sind angemeldet.');
        try{await pull()}catch(err){}
      }catch(err){btn.disabled=false;btn.textContent='Passwort speichern';msg(err.message)}
    });
  }

  /* ---------- 2. Menuepunkt "Mitarbeitende einladen" ---------- */
  function navBtn(){
    const nav=$('#nav');if(!nav)return;
    const b=$('#invBtn');
    if(canInvite()&&!b){
      const x=document.createElement('button');x.id='invBtn';x.type='button';x.dataset.act='invite';
      x.innerHTML=(typeof svg==='function'?svg('set'):'')+'Mitarbeitende einladen';
      nav.appendChild(x);
    }else if(!canInvite()&&b)b.remove();
  }
  const origChrome=renderChrome;
  renderChrome=function(){origChrome.apply(this,arguments);navBtn()};
  const origUserUI=userUI;
  userUI=function(){origUserUI.apply(this,arguments);navBtn()};

  ACT.invite=function(){
    if(!canInvite()){toast('Einladen können nur Admins und Freigeber/innen.');return}
    const admin=HUB.me.role==='admin';
    const orgs=Object.entries(HUB.orgs||{}).filter(([id])=>admin||id===HUB.me.org_id).sort((a,b)=>a[1].localeCompare(b[1]));
    const roles=Object.entries(ROLES).filter(([k])=>admin||k!=='admin');
    dialog('Mitarbeitende einladen',
      `<p class="hint">Der Hub erzeugt einen persönlichen Link. Schicken Sie ihn der Person per E-Mail; sie legt damit ihr Passwort fest. Der Link ist 24 Stunden gültig und nur einmal verwendbar.</p>
      <form id="invForm" class="g" style="gap:12px">
        <label class="f"><span>Name</span><input id="invName" type="text" autocomplete="off" required maxlength="200"></label>
        <label class="f"><span>E-Mail</span><input id="invMail" type="email" autocomplete="off" required maxlength="200"></label>
        <label class="f"><span>Organisation</span><select id="invOrg">${orgs.map(([id,n])=>`<option value="${esc(id)}"${id===HUB.me.org_id?' selected':''}>${esc(n)}</option>`).join('')}</select></label>
        <label class="f"><span>Rolle</span><select id="invRole">${roles.map(([k,n])=>`<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
        <p class="hint" style="margin:0">Bearbeiter/in: erfasst und bearbeitet Einträge. Freigeber/in: zusätzlich Partner-Einreichungen freigeben und Mitarbeitende einladen. Admin: alles, für alle Organisationen.</p>
        <div class="f"><button class="btn pri" type="submit" id="invGo">Einladungslink erzeugen</button></div>
      </form><div id="invOut" aria-live="polite"></div>`);
    const out=$('#invOut');
    $('#invForm').addEventListener('submit',async e=>{
      e.preventDefault();
      const btn=$('#invGo'),name=$('#invName').value.trim(),mail=$('#invMail').value.trim(),org=$('#invOrg').value,role=$('#invRole').value;
      btn.disabled=true;btn.textContent='Link wird erzeugt …';out.innerHTML='';
      try{
        const r=await DB.req('rpc/invite_member',{method:'POST',body:JSON.stringify({p_email:mail,p_name:name,p_org:org,p_role:role})});
        let res=null;
        for(let i=0;i<40;i++){
          await wait(i<3?500:1000);
          res=await DB.req('rpc/invite_result',{method:'POST',body:JSON.stringify({p_req:r.req})});
          if(res&&!res.pending)break;
        }
        if(!res||res.pending)throw new Error('Der Anmeldedienst antwortet nicht. Bitte erneut versuchen.');
        if(res.error)throw new Error(/already|registered/i.test(res.error)?'Für diese E-Mail-Adresse besteht bereits ein Konto.':res.error);
        showLink(res,name,orgs.find(o=>o[0]===org)?.[1]||'',ROLES[role]);
        btn.textContent='Weitere Person einladen';btn.disabled=false;
      }catch(err){
        out.innerHTML=`<div class="note err" role="alert">${esc(err.message)}</div>`;
        btn.disabled=false;btn.textContent='Einladungslink erzeugen';
      }
    });
    function showLink(res,name,orgName,roleName){
      const neu=res.type==='invite';
      const subj='Ihr Zugang zum Contenthub Graubünden';
      const body=`Guten Tag ${name}\n\nSie wurden für den Contenthub Graubünden freigeschaltet (${orgName}, ${roleName}).\n\n`+
        `Bitte öffnen Sie innerhalb von 24 Stunden diesen persönlichen Link und legen Sie ${neu?'Ihr':'ein neues'} Passwort fest:\n${res.link}\n\n`+
        `Danach melden Sie sich jeweils hier an: https://graubuendenferien-sudo.github.io/contenthub/\n\nFreundliche Grüsse`;
      out.innerHTML=`<div class="note" style="margin-top:12px">
        <b>${neu?'Einladung erstellt':'Konto besteht bereits – Link zum Festlegen eines neuen Passworts erstellt'}</b> für ${esc(res.email)}.
        Berechtigung: ${esc(orgName)}, ${esc(roleName)}.
        <label class="f" style="margin-top:8px"><span>Persönlicher Link (nicht weiter teilen)</span><input id="invLink" type="text" readonly value="${esc(res.link)}"></label>
        <div class="tools" style="margin-top:8px;gap:8px;display:flex;flex-wrap:wrap">
          <a class="btn pri" id="invMailto" href="mailto:${encodeURIComponent(res.email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}">E-Mail öffnen</a>
          <button type="button" class="btn" id="invCopy">Link kopieren</button>
        </div></div>`;
      $('#invCopy').addEventListener('click',async()=>{
        const i=$('#invLink');
        try{await navigator.clipboard.writeText(i.value);toast('Link kopiert.')}catch(e){i.select();toast('Bitte mit Ctrl+C kopieren.')}
      });
    }
  };

  navBtn();
})();

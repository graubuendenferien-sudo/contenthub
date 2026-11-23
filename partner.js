/* Partnerformular: Externe Partner erfassen einen Eintrag ohne Konto und reichen ihn zur Freigabe ein.
   Nutzt die Formulare des Contenthubs. Wird nach app.js, map-config.js und hub-ext.js geladen.
   Die Postleitzahl wird nicht mehr am Anfang abgefragt, sondern aus der Adresse im Formular uebernommen. */
(function(){
  'use strict';
  if(!window.PARTNER||typeof HUB==='undefined'||typeof ACT==='undefined')return;

  const P={name:'',email:'',plz:'',web:'',token:null,comment:'',items:[],busy:false};

  /* Hub-Oberflaeche ausblenden, Sitzung und Liste der Destination nicht verwenden */
  const st=document.createElement('style');
  st.textContent='.side,#burger,#userPill,#srvPill,.menuwrap,.stats,#panel,#tableWrap,#delBtn{display:none!important}.app{grid-template-columns:1fr!important}';
  document.head.appendChild(st);
  document.title='Eintrag einreichen – Contenthub Graubünden';
  Object.defineProperty(S,'items',{get(){return P.items},set(){},configurable:true});
  DB.sess=null;
  closeDialog();
  const crumb=$('.crumb');if(crumb)crumb.innerHTML='<b>Contenthub Graubünden</b> · Eintrag einreichen';
  const top=$('.top');
  if(top){const b=document.createElement('button');b.className='btn pri';b.type='button';b.dataset.act='pstart';b.textContent='Neuen Eintrag einreichen';top.appendChild(b)}

  async function rpc(fn,body){
    const r=await fetch(CFG.sb.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:CFG.sb.key,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>null);
    if(!r.ok)throw new Error((j&&j.message)||('Fehler '+r.status));
    return j;
  }
  function waitMap(){return new Promise(res=>{const t0=Date.now();(function tick(){if(M.ready||Date.now()-t0>4000)res();else setTimeout(tick,150)})()})}

  function startDialog(){
    if(S.draft&&S.dirty){toast('Sie haben einen offenen Eintrag. Bitte zuerst einreichen oder verwerfen.');return}
    P.token=null;P.comment='';
    const opts=Object.keys(TYPES).map(k=>'<option value="'+k+'">'+esc(TYPES[k].label)+'</option>').join('');
    dialog('Eintrag einreichen',
      '<p class="hint">Erfassen Sie Ihr Angebot für Graubünden. Die zuständige Destination prüft den Eintrag, bevor er veröffentlicht wird.</p>'+
      '<form id="pForm" class="g" style="gap:12px">'+
      '<label class="f"><span>Was möchten Sie erfassen?</span><select id="pType">'+opts+'</select></label>'+
      '<label class="f"><span>Ihr Name</span><input id="pName" required maxlength="200" autocomplete="name" value="'+esc(P.name)+'"></label>'+
      '<label class="f"><span>Ihre E-Mail</span><input id="pMail" type="email" required maxlength="200" autocomplete="email" value="'+esc(P.email)+'"></label>'+
      '<label style="position:absolute;left:-9999px" aria-hidden="true">Website<input id="pWeb" tabindex="-1" autocomplete="off"></label>'+
      '<p class="hint">Ihr Name und Ihre E-Mail werden nur für Rückfragen zu diesem Eintrag verwendet und der zuständigen Destination angezeigt.</p>'+
      '<div class="f"><button class="btn pri" type="submit">Weiter zum Formular</button></div></form>'+
      '<div id="pMsg" aria-live="polite"></div>');
    $('#pForm').addEventListener('submit',e=>{
      e.preventDefault();
      const name=$('#pName').value.trim(),mail=$('#pMail').value.trim(),type=$('#pType').value;
      P.name=name;P.email=mail;P.web=$('#pWeb').value;
      closeDialog();
      openEditor(newItem(type),true);
    });
  }
  ACT.pstart=startDialog;

  function doneDialog(r){
    const link=location.origin+location.pathname+'?t='+encodeURIComponent(P.token);
    const txt=r.status==='published'?'Ihr Eintrag wurde gespeichert und veröffentlicht. Zuständig ist '+esc(r.organisation)+'.':
      'Ihr Eintrag wurde an '+esc(r.organisation)+' zur Prüfung gesendet. Er wird veröffentlicht, sobald die Destination ihn freigegeben hat.';
    dialog('Vielen Dank',
      '<div class="note ok">'+txt+'</div>'+
      '<p class="hint">Bitte bewahren Sie Ihren persönlichen Link auf. Damit sehen Sie den Stand und können den Eintrag überarbeiten, falls die Destination Rückfragen hat.</p>'+
      '<label class="f"><span>Ihr persönlicher Link</span><input id="pLink" readonly value="'+esc(link)+'"></label>'+
      '<div class="tools" style="margin-top:10px"><button type="button" class="btn" data-act="plink">Link kopieren</button><button type="button" class="btn pri" data-act="pstart">Weiteren Eintrag erfassen</button></div>');
  }
  ACT.plink=function(){const i=$('#pLink');if(!i)return;i.select();(navigator.clipboard?navigator.clipboard.writeText(i.value):Promise.reject()).then(()=>toast('Link kopiert.')).catch(()=>toast('Link ist markiert – mit Ctrl/Cmd + C kopieren.'))};

  /* Formular anpassen */
  const prevRenderEditor=renderEditor;
  renderEditor=function(keep){
    prevRenderEditor(keep);
    const ed=$('#ed'),sv=$('#drawer .df [data-act="save"]');
    if(sv){sv.textContent=P.token?'Erneut einreichen':'Einreichen';sv.hidden=false}
    const old=$('#pNote');if(old)old.remove();
    if(ed){const n=document.createElement('div');n.id='pNote';n.className=P.comment?'note':'hint';
      n.textContent=P.comment?'Rückmeldung der Destination: '+P.comment:'Bitte füllen Sie die Pflichtangaben aus (inklusive Postleitzahl bei der Adresse) und klicken Sie danach auf «Einreichen». Anhand der Postleitzahl wird die zuständige Destination bestimmt.';
      ed.insertBefore(n,ed.firstChild)}
  };

  ACT.del=function(){};
  ACT.save=async function(){
    const D=S.draft;if(!D||P.busy)return;
    const v=validate(D);
    if(v.errs.length){S.errs=v.errs;showErrs();$('#ed').scrollTop=0;toast('Bitte die markierten Pflichtangaben ergänzen ('+v.errs.length+' offen).');return}
    const zip=String((D.address&&D.address.zip)||'').trim();
    if(!/^[0-9]{4}$/.test(zip)){toast('Bitte bei der Adresse eine Postleitzahl mit 4 Ziffern angeben. Sie bestimmt die zuständige Destination.');return}
    P.plz=zip;
    const c=clone(D);if(c.computed)delete c.computed.profile;c.modified=new Date().toISOString();
    P.busy=true;const sv=$('#drawer .df [data-act="save"]');if(sv){sv.disabled=true;sv.textContent='Wird eingereicht …'}
    try{
      const r=await rpc('partner_submit',{p_item:c,p_contact_name:P.name,p_contact_email:P.email,p_plz:P.plz,p_token:P.token,p_website:P.web||''});
      P.token=r.token;P.comment='';S.dirty=false;closeEditor();doneDialog(r);
    }catch(e){toast('Einreichen fehlgeschlagen: '+e.message)}
    P.busy=false;const b=$('#drawer .df [data-act="save"]');if(b){b.disabled=false;b.textContent=P.token?'Erneut einreichen':'Einreichen'}
  };

  /* Start: persoenlicher Link oder neuer Eintrag */
  const tok=new URLSearchParams(location.search).get('t');
  if(tok){
    rpc('partner_load',{p_token:tok}).then(async r=>{
      P.name=r.contact_name;P.email=r.contact_email;P.plz=r.plz;
      const label=(HUB.STATUS&&HUB.STATUS[r.status])||r.status;
      if(!r.editable){
        dialog('Stand Ihres Eintrags','<div class="note '+(r.status==='published'?'ok':'')+'">Status: <b>'+esc(label)+'</b>'+(r.comment?'<br>Rückmeldung der Destination: '+esc(r.comment):'')+'</div>'+
          '<div class="tools"><button type="button" class="btn pri" data-act="pstart">Neuen Eintrag erfassen</button></div>');
        return;
      }
      P.token=tok;P.comment=r.status==='changes_requested'?(r.comment||'Die Destination bittet um eine Überarbeitung.'):'';
      await waitMap();
      openEditor(Object.assign(newItem(r.item.type),r.item),false);
    }).catch(e=>{dialog('Link nicht gültig','<div class="note err" role="alert">'+esc(e.message)+'</div><div class="tools"><button type="button" class="btn pri" data-act="pstart">Neuen Eintrag erfassen</button></div>')});
  }else startDialog();
})();

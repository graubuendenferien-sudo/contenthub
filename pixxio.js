/* Contenthub: Bilder aus pixx.io (Mediaspace graubuenden.px.media) auswaehlen.
   Nutzt das pixx.io Plugin SDK im iframe. Die Anmeldung bei pixx.io erfolgt im Fenster selbst.
   Uebernommen wird ein Direct Link (das Bild bleibt in pixx.io) samt Beschreibung, Urheber und Lizenzhinweis.
   Wird nach app.js, map-config.js und hub-ext.js geladen. */
(function(){
  'use strict';
  if(typeof S==='undefined'||typeof ACT==='undefined'||typeof secImage==='undefined')return;
  if(window.PARTNER)return; /* Partner haben kein pixx.io-Konto */

  const APP_ID='1795074215applicationCont5EA9N51Dav';
  const ORIGIN='https://plugin.pixx.io';
  const PX=window.PIXXIO={open:false,draft:null};

  function sdkUrl(){
    const q=new URLSearchParams();
    q.set('applicationId',APP_ID);
    q.set('useDirectLinks','true');
    q.set('multiSelect','false');
    ['jpg','jpeg','png','webp','tif','tiff','heic'].forEach(t=>q.append('allowedFileTypes',t));
    ['jpg','webp','png'].forEach(t=>q.append('allowedDownloadFormats',t));
    q.set('selectButtonText','Bild übernehmen');
    q.append('hideLinks','help');
    return ORIGIN+'/static/v1/de/media?'+q.toString();
  }

  /* Bildbereich: Knopf ergaenzen */
  const prevSecImage=secImage;
  secImage=function(){
    const html=prevSecImage(),D=S.draft;
    const pid=D&&D.image&&D.image.pixxioId;
    const extra='<div class="tools" style="margin-top:6px"><button type="button" class="btn sm" data-act="pxopen">Aus pixx.io wählen</button></div>'+
      (pid?'<p class="hint">Bild aus pixx.io (Datei-ID '+esc(String(pid))+'). Es wird direkt aus pixx.io geladen.</p>':'');
    const i=html.lastIndexOf('</');
    return i>0?html.slice(0,i)+extra+html.slice(i):html+extra;
  };

  /* Fenster */
  function frameEl(){return document.getElementById('pxFrame')}
  function send(method,parameters){const f=frameEl();if(f&&f.contentWindow)f.contentWindow.postMessage({receiver:'pixxio-plugin-sdk',method,parameters:parameters||[]},ORIGIN)}
  function close(){
    const o=document.getElementById('pxOverlay');if(o)o.remove();
    PX.open=false;PX.draft=null;
    const b=document.querySelector('[data-act="pxopen"]');if(b)b.focus();
  }
  ACT.pxopen=function(){
    if(!S.draft){return}
    if(PX.open)return;
    PX.open=true;PX.draft=S.draft;
    const o=document.createElement('div');o.id='pxOverlay';
    o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','Bild aus pixx.io wählen');
    o.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(23,32,29,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    o.innerHTML='<div style="background:#fff;border-radius:12px;width:min(1100px,100%);height:min(780px,100%);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)">'+
      '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line,#ddd)"><b style="flex:1">Bild aus pixx.io wählen</b>'+
      '<span id="pxMsg" class="hint" aria-live="polite">Wird geladen … Bitte bei Bedarf mit Ihrem pixx.io-Konto anmelden.</span>'+
      '<button type="button" class="x" data-act="pxclose" aria-label="Schliessen" style="font-size:22px;background:none;border:0;cursor:pointer">×</button></div>'+
      '<iframe id="pxFrame" title="pixx.io Mediaspace" src="'+sdkUrl()+'" style="flex:1;width:100%;border:0" allow="clipboard-write"></iframe></div>';
    o.addEventListener('click',e=>{if(e.target===o)close()});
    document.body.appendChild(o);
    const fr=frameEl();if(fr)fr.focus();
  };
  ACT.pxclose=close;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&PX.open){e.stopPropagation();close()}},true);

  /* Metadaten auswerten */
  function pick(meta,re){
    if(!meta)return '';
    for(const k of Object.keys(meta)){if(re.test(k)){const v=meta[k];const s=Array.isArray(v)?v.join(', '):(v==null?'':String(v));if(s.trim())return s.trim()}}
    return '';
  }
  function apply(file){
    const D=PX.draft;
    if(!D||S.draft!==D){close();toast('Das Formular wurde inzwischen geschlossen. Bitte erneut auswählen.');return}
    if(!file||!file.directLink){toast('pixx.io hat keinen Link geliefert.');return}
    if(!D.image)D.image={url:'',alt:'',credit:'',licence:''};
    const img=D.image,meta=file.metadata||{};
    img.url=file.directLink;
    img.pixxioId=file.id;
    const alt=pick(meta,/alt|bildbeschreibung/i)||file.description||file.subject||'';
    if(alt&&!String(img.alt||'').trim())img.alt=alt.slice(0,300);
    let credit=pick(meta,/copyright|urheber|fotograf|photographer|credit|autor|author|creator/i);
    const lic=(file.licenseReleases||[]).map(l=>l&&l.licenseRelease&&(l.licenseRelease.name||(l.licenseRelease.license&&l.licenseRelease.license.provider))).filter(Boolean);
    if(!credit&&file.licenseReleases&&file.licenseReleases[0]){const pr=file.licenseReleases[0].licenseRelease&&file.licenseReleases[0].licenseRelease.license&&file.licenseReleases[0].licenseRelease.license.provider;if(pr)credit=pr}
    if(credit)img.credit=credit.slice(0,200);
    const exp=(file.licenseReleases||[]).map(l=>l&&l.expires).filter(Boolean).sort()[0];
    img.pixxio={id:file.id,fileName:file.fileName||'',width:file.originalWidth||null,height:file.originalHeight||null,licences:lic,licenceExpires:exp||null,taken:new Date().toISOString()};
    S.dirty=true;
    close();
    renderEditor(true);if(typeof updQual==='function')updQual();
    const miss=[];if(!String(img.alt||'').trim())miss.push('Bildbeschreibung');if(!String(img.credit||'').trim())miss.push('Urheber');
    let t='Bild aus pixx.io übernommen.';
    if(exp)t+=' Lizenz gültig bis '+String(exp).slice(0,10)+'.';
    t+=miss.length?' Bitte '+miss.join(' und ')+' ergänzen und speichern.':' Bitte prüfen und speichern.';
    toast(t);
  }

  window.addEventListener('message',e=>{
    if(e.origin!==ORIGIN)return;
    const d=e.data;if(!d||d.sender!=='pixxio-plugin-sdk')return;
    const msg=document.getElementById('pxMsg'),say=t=>{if(msg)msg.textContent=t};
    switch(d.method){
      case 'onSdkReady':
        say('Bild auswählen und «Bild übernehmen» klicken.');
        send('useDirectLinks',[true]);
        send('setButtonText',['Bild übernehmen']);
        break;
      case 'loginSuccess':say('Angemeldet. Bild auswählen und «Bild übernehmen» klicken.');break;
      case 'directLinksCreated':{const files=(d.parameters&&d.parameters[0])||[];apply(files[0]);break}
      case 'downloadFiles':{
        /* Sollte wegen Direct Links nicht vorkommen; dann Download-Link nicht dauerhaft verwenden */
        send('setDownloadFailed');say('pixx.io hat keinen Direct Link erzeugt. Bitte den pixx.io-Support fragen, ob Direct Links für diese Anwendung freigeschaltet sind.');break}
      case 'onError':{const er=(d.parameters&&d.parameters[0])||{};say('Fehler von pixx.io: '+(er.errorMessage||'unbekannt'));console.warn('pixx.io',er);break}
      default:break;
    }
  });
})();

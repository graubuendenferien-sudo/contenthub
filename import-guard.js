/* Import-Schutz: Importieren nur mit Anmeldung, sichtbare Erfolgs- bzw. Fehlermeldung.
   Wird nach app.js und hub-ext.js geladen. app.js bleibt unveraendert. */
(function(){
  'use strict';
  if(window.PARTNER||typeof doImport==='undefined'||typeof persist==='undefined'||typeof HUB==='undefined'||typeof dialog==='undefined')return;
  const origImport=doImport,origPersist=persist;

  /* Prueft in der Datenbank, wie viele der importierten Eintraege wirklich vorhanden sind */
  async function verify(ids){
    let found=0;
    for(let i=0;i<ids.length;i+=60){
      const part=ids.slice(i,i+60).map(x=>'"'+String(x).replace(/"/g,'')+'"').join(',');
      const rows=await DB.req('items?select=id&id=in.('+encodeURIComponent(part)+')');
      found+=(rows||[]).length;
    }
    return found;
  }
  const closeBtn='<div class="tools" style="margin-top:12px"><button type="button" class="btn pri" data-act="dlgclose">Schliessen</button></div>';

  doImport=async function(text){
    if(!DB.sess){
      closeDialog();
      loginDialog('Bitte zuerst anmelden. Ohne Anmeldung werden importierte Einträge nicht in der Datenbank gespeichert. Wählen Sie die Datei nach der Anmeldung erneut aus.');
      return;
    }
    if(!HUB.me){
      closeDialog();
      dialog('Import nicht möglich','<div class="note err" role="alert">Ihr Konto ist noch keiner Destination zugeordnet. Importierte Einträge könnten nicht gespeichert werden.</div>'+closeBtn);
      return;
    }
    let res=null;
    persist=async function(items,what){
      const ok=await origPersist(items,what);
      if(what==='Import')res={ok:ok,ids:items.map(i=>i.id)};
      return ok;
    };
    try{await origImport(text)}finally{persist=origPersist}
    if(!res)return; /* Fehler beim Einlesen: Meldung steht bereits im Importfenster */
    const n=res.ids.length;
    if(!res.ok){
      dialog('Import nicht gespeichert','<div class="note err" role="alert"><b>Die '+n+' Einträge wurden nicht in der Datenbank gespeichert.</b> Sie sind nur vorübergehend in diesem Browserfenster sichtbar und gehen beim Neuladen verloren. Bitte prüfen Sie die Anmeldung und versuchen Sie es erneut.</div>'+closeBtn);
      return;
    }
    let found=null;
    try{found=await verify(res.ids)}catch(e){found=null}
    let body;
    if(found===n)body='<div class="note ok" role="status"><b>Import erfolgreich.</b> '+n+(n===1?' Eintrag wurde':' Einträge wurden')+' in der Datenbank gespeichert. Kontrolle: Alle '+n+' sind in der Datenbank vorhanden.</div>';
    else if(found===null)body='<div class="note ok" role="status"><b>Import abgeschlossen.</b> '+n+' Einträge wurden an die Datenbank gesendet. Die Kontrolle war nicht möglich.</div>';
    else body='<div class="note err" role="alert"><b>Import unvollständig.</b> Nur '+found+' von '+n+' Einträgen sind in der Datenbank vorhanden. Bitte importieren Sie die Datei erneut.</div>';
    dialog(found!==null&&found!==n?'Import unvollständig':'Import erfolgreich',body+closeBtn);
  };
})();

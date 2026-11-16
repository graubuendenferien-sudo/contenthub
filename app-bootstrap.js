/\* Load the app and its map adapter together, before the app's startup call. \*/
(async function(){
  const report=message=&gt;{
    const box=document.getElementById('mapMsg'),text=document.getElementById('mapMsgTxt'),retry=document.getElementById('mapRetry');
    if(text)text.textContent=message;if(box)box.hidden=false;if(retry)retry.hidden=true;
  };
  try{
    const v='maps-bootstrap-1';
    const \[appRes,mapRes\]=await Promise.all(\[
      fetch('app.js?v='+v,{cache:'no-store'}),
      fetch('map-config.js?v='+v,{cache:'no-store'})
    \]);
    if(!appRes.ok||!mapRes.ok)throw new Error('App- oder Kartenkonfiguration nicht verfügbar.');
    const \[app,adapter\]=await Promise.all(\[appRes.text(),mapRes.text()\]);
    const marker='DB.load();userUI();renderAll();initMap();';
    const at=app.lastIndexOf(marker);
    if(at&lt;0)throw new Error('Startpunkt der App wurde nicht gefunden.');
    const script=document.createElement('script');
    script.textContent=app.slice(0,at)+adapter+'\\n'+app.slice(at);
    document.body.appendChild(script);
  }catch(error){
    console.error('Contenthub konnte nicht gestartet werden:',error);
    report('Der Contenthub konnte nicht vollständig geladen werden. Bitte Seite neu laden oder später erneut versuchen.');
  }
})();
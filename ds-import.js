/\* discover.swiss-Import: Kategorien uebernehmen und anzeigen, Skigebiete als Ausflugsziel einlesen.
   Wird nach app.js und hub-ext.js geladen. app.js bleibt unveraendert.
   Eintraege aus dem automatischen Abruf (Supabase) kommen ohne berechnete Tourdaten an;
   diese werden hier beim Anzeigen nachgerechnet. \*/
(function(){
  'use strict';
  if(typeof fromDS==='undefined'||typeof renderEditor==='undefined')return;
  const origFromDS=fromDS;
  const txt=v=&gt;typeof v==='string'?v:v&amp;&amp;typeof v==='object'?(v.de||v\['de-CH'\]||Object.values(v).find(x=&gt;typeof x==='string')||''):'';

  function cats(o){
    const raw=\[\].concat(o.category||\[\],o.categories||\[\]);
    const out=\[\],seen={};
    raw.forEach(c=&gt;{
      if(!c)return;
      const id=typeof c==='string'?c:(c.identifier||'');
      const name=typeof c==='string'?'':txt(c.name);
      const k=id||name;if(!k||seen\[k\])return;seen\[k\]=1;
      out.push({id:id,name:name||id});
    });
    return out;
  }

  fromDS=function(o){
    if(!o)return null;
    const t=String(o.type||o\['@type'\]||'').split('/').pop();
    let it;
    if(t==='SkiResort'){
      it=origFromDS(Object.assign({},o,{type:'Place',additionalType:''}));
      if(it)it.additionalType='Place:\_';
    }else it=origFromDS(o);
    if(!it)return null;
    it.dsType=t;
    it.dsCategories=cats(o);
    if(o\['@id'\])it.dsUrl=o\['@id'\];
    return it;
  };

  function ensureStats(it){
    if(!it||it.type!=='tour'||!Array.isArray(it.track)||it.track.length&lt;2)return;
    if(it.computed&amp;&amp;it.computed.length!=null)return;
    try{it.computed=tourStats(it);if(it.computed)delete it.computed.profile}catch(e){}
  }

  /\* Typbezeichnung: Skigebiete als solche anzeigen \*/
  if(typeof typeLabel!=='undefined'){
    const origLabel=typeLabel;
    typeLabel=function(it){return it&amp;&amp;it.dsType==='SkiResort'?'Skigebiet':origLabel(it)};
  }

  /\* Liste: Kategorien in der Infospalte \*/
  if(typeof info!=='undefined'){
    const origInfo=info;
    info=function(it){
      ensureStats(it);
      const base=origInfo(it)||'';
      const c=(it&amp;&amp;it.dsCategories||\[\]).map(x=&gt;x.name).filter(Boolean).slice(0,2).join(', ');
      return c?(base?base+' · ':'')+c:base;
    };
  }

  /\* Formular: Kategorien aus discover.swiss anzeigen \*/
  const origRender=renderEditor;
  renderEditor=function(keep){
    if(S.draft)ensureStats(S.draft);
    origRender(keep);
    const D=S.draft,ed=$('#ed');
    const old=$('#dsCats');if(old)old.remove();
    if(!D||!ed||!D.dsCategories||!D.dsCategories.length)return;
    const box=document.createElement('div');box.id='dsCats';box.className='hint';
    box.textContent='Kategorien aus discover.swiss: '+D.dsCategories.map(x=&gt;x.name).join(', ');
    ed.insertBefore(box,ed.firstChild);
  };
})();
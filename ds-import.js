/* discover.swiss-Import: Kategorien uebernehmen und anzeigen, Skigebiete als Ausflugsziel einlesen.
   Wird nach app.js und hub-ext.js geladen. app.js bleibt unveraendert. */
(function(){
  'use strict';
  if(typeof fromDS==='undefined'||typeof renderEditor==='undefined')return;
  const origFromDS=fromDS;
  const txt=v=>typeof v==='string'?v:v&&typeof v==='object'?(v.de||v['de-CH']||Object.values(v).find(x=>typeof x==='string')||''):'';

  function cats(o){
    const raw=[].concat(o.category||[],o.categories||[]);
    const out=[],seen={};
    raw.forEach(c=>{
      if(!c)return;
      const id=typeof c==='string'?c:(c.identifier||'');
      const name=typeof c==='string'?'':txt(c.name);
      const k=id||name;if(!k||seen[k])return;seen[k]=1;
      out.push({id:id,name:name||id});
    });
    return out;
  }

  fromDS=function(o){
    if(!o)return null;
    const t=String(o.type||o['@type']||'').split('/').pop();
    let it;
    if(t==='SkiResort'){
      it=origFromDS(Object.assign({},o,{type:'Place',additionalType:''}));
      if(it)it.additionalType='Place:_';
    }else it=origFromDS(o);
    if(!it)return null;
    it.dsType=t;
    it.dsCategories=cats(o);
    if(o['@id'])it.dsUrl=o['@id'];
    return it;
  };

  /* Typbezeichnung: Skigebiete als solche anzeigen */
  if(typeof typeLabel!=='undefined'){
    const origLabel=typeLabel;
    typeLabel=function(it){return it&&it.dsType==='SkiResort'?'Skigebiet':origLabel(it)};
  }

  /* Liste: Kategorien in der Infospalte */
  if(typeof info!=='undefined'){
    const origInfo=info;
    info=function(it){
      const base=origInfo(it)||'';
      const c=(it&&it.dsCategories||[]).map(x=>x.name).filter(Boolean).slice(0,2).join(', ');
      return c?(base?base+' · ':'')+c:base;
    };
  }

  /* Formular: Kategorien aus discover.swiss anzeigen */
  const origRender=renderEditor;
  renderEditor=function(keep){
    origRender(keep);
    const D=S.draft,ed=$('#ed');
    const old=$('#dsCats');if(old)old.remove();
    if(!D||!ed||!D.dsCategories||!D.dsCategories.length)return;
    const box=document.createElement('div');box.id='dsCats';box.className='hint';
    box.textContent='Kategorien aus discover.swiss: '+D.dsCategories.map(x=>x.name).join(', ');
    ed.insertBefore(box,ed.firstChild);
  };
})();

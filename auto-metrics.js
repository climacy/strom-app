// Métrés automatiques visibles dans le formulaire Ferblanterie.
// On n'associe jamais un bord OFEN à un larmier/faîtage/rive sans validation humaine.
(() => {
  function counts(check){const out={Velux:0,Cheminée:0,Lucarne:0,Ventilation:0};for(const o of check?.obstacles||[])if(Object.prototype.hasOwnProperty.call(out,o.type))out[o.type]++;return out}
  function perimeter(points){if(!Array.isArray(points)||points.length<2)return 0;let s=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];s+=Math.hypot(b[0]-a[0],b[1]-a[1])}return Math.round(s*100)/100}
  function obstaclePerimeter(check,type){return Math.round((check?.obstacles||[]).filter(o=>!type||o.type===type).reduce((s,o)=>s+perimeter(o.points),0)*100)/100}
  function setAuto(rows,label,qty,unit,source){if(qty==null||!Number.isFinite(Number(qty)))return;const r=rows.find(x=>x.label===label);if(!r)return;if(r.qty===''||r.auto){r.qty=String(qty);r.unit=unit;r.auto=true;r.autoSource=source}}
  function buildFerblanterieRows(input,m,check){
    let rows=(input||[]).filter(r=>r.section!=='Métrés calculés automatiquement').map(r=>({...r}));
    if(!m)return rows;
    const c=counts(check),selected=check?.selectedArea??m.area,obs=check?.obstacleArea??0,net=check?.netArea??m.area;

    // Correspondances métier certaines.
    setAuto(rows,'Démontage toiture',net,'m²',check?.validated?'Surface nette validée par Ström':'Surface toiture OFEN');
    if(c.Cheminée)setAuto(rows,'Cheminées',c.Cheminée,'pce','Cheminées dessinées dans le calepinage');
    if(c.Ventilation)setAuto(rows,'Ventilations',c.Ventilation,'pce','Ventilations dessinées dans le calepinage');
    if(c.Lucarne)setAuto(rows,'Entourages des lucarnes',c.Lucarne,'pce','Lucarnes dessinées dans le calepinage');

    // Références géométriques calculables sans interprétation.
    const refs=[
      ['Surface brute toiture OFEN',m.area,'m²','Somme des pans OFEN'],
      ['Surface des pans retenus',selected,'m²','Pans conservés par Ström'],
      ['Surface totale des obstacles',obs,'m²','Polygones obstacles dessinés'],
      ['Surface nette toiture',net,'m²','Pans retenus moins obstacles'],
      ['Linéaire extérieur toiture',m.exterior,'m','Bords extérieurs calculés depuis les polygones OFEN'],
      ['Linéaire jonctions entre pans',m.shared,'m','Segments communs entre pans'],
      ['Linéaire total des bords toiture',m.totalLinear,'m','Bords extérieurs + jonctions']
    ];
    if(c.Velux)refs.push(['Nombre de Velux',c.Velux,'pce','Velux dessinés']);
    if(c.Cheminée)refs.push(['Nombre de cheminées',c.Cheminée,'pce','Cheminées dessinées']);
    if(c.Lucarne)refs.push(['Nombre de lucarnes',c.Lucarne,'pce','Lucarnes dessinées']);
    if(c.Ventilation)refs.push(['Nombre de ventilations',c.Ventilation,'pce','Ventilations dessinées']);
    if((check?.obstacles||[]).length)refs.push(['Linéaire autour de tous les obstacles',obstaclePerimeter(check),'m','Somme des périmètres des obstacles']);
    if(c.Velux)refs.push(['Linéaire autour des Velux',obstaclePerimeter(check,'Velux'),'m','Périmètre des Velux dessinés']);
    if(c.Cheminée)refs.push(['Linéaire autour des cheminées',obstaclePerimeter(check,'Cheminée'),'m','Périmètre des cheminées dessinées']);
    if(c.Lucarne)refs.push(['Linéaire autour des lucarnes',obstaclePerimeter(check,'Lucarne'),'m','Périmètre des lucarnes dessinées']);
    if(c.Ventilation)refs.push(['Linéaire autour des ventilations',obstaclePerimeter(check,'Ventilation'),'m','Périmètre des ventilations dessinées']);
    const autoRows=refs.filter(x=>x[1]!=null&&Number.isFinite(Number(x[1]))).map(([label,qty,unit,source])=>({section:'Métrés calculés automatiquement',label,qty:String(qty),unit,auto:true,autoSource:source,internalMetric:true}));
    return [...autoRows,...rows];
  }

  // Remplace l'ouverture Ferblanterie pour garantir que les métrés sont réellement rendus,
  // même lorsqu'un ancien brouillon est déjà enregistré dans localStorage.
  const originalOpenMeasure=openMeasure;
  openMeasure=function(key){
    if(key!=='ferblanterie')return originalOpenMeasure(key);
    measureTrade=key;
    const state=currentProject.trades?.[key];
    let data=state?.rows||template(key);
    data=buildFerblanterieRows(data,currentProject.roofMetrics,currentProject.roofCheck?.validated?currentProject.roofCheck:null);
    $('#measureTitle').textContent=trades[key].name;
    $('#measureMeta').textContent=currentProject.address+(currentProject.roofCheck?.validated?` · surface nette toiture ${currentProject.roofCheck.netArea} m²`:'');
    $('#measureStatus').textContent='';
    renderMeasure(data);
    show('stromMeasure');
  };

  // Après une nouvelle validation toiture, recalculer aussi les anciennes lignes Ferblanterie.
  const originalApply=applyAutoFerblanterie;
  applyAutoFerblanterie=function(rows,m,check){return buildFerblanterieRows(originalApply(rows,m,check),m,check)};

  // Les métrés de référence sont internes : ils ne sont pas affichés à l'entreprise comme prestations.
  const originalActiveRows=activeRows;
  activeRows=function(state){return originalActiveRows(state).filter(r=>r.section!=='Métrés calculés automatiquement'&&!r.internalMetric)};
})();
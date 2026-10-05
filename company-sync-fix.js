// Synchronisation Ström -> portail entreprise.
// Les prestations renseignées par Ström ET les métrés automatiques utiles sont visibles côté entreprise.
(() => {
  const isFilled=r=>r&&r.qty!==''&&num(r.qty)!==null;

  // Les lignes automatiques calculées font partie du bordereau visible dès qu'elles ont une quantité.
  // On exclut seulement les références purement techniques qui ne sont pas des prestations chiffrables.
  activeRows=function(state){
    return (state?.rows||[]).filter(isFilled).filter(r=>{
      if(!r.internalMetric)return true;
      // Ces métrés sont volontairement proposés à l'entreprise comme lignes chiffrables de référence.
      return [
        'Surface nette toiture',
        'Linéaire extérieur toiture',
        'Linéaire jonctions entre pans',
        'Linéaire total des bords toiture',
        'Nombre de Velux',
        'Nombre de cheminées',
        'Nombre de lucarnes',
        'Nombre de ventilations',
        'Linéaire autour de tous les obstacles',
        'Linéaire autour des Velux',
        'Linéaire autour des cheminées',
        'Linéaire autour des lucarnes',
        'Linéaire autour des ventilations'
      ].includes(r.label);
    });
  };

  const saveBtn=$('#saveRoofCheck');
  if(saveBtn){
    saveBtn.onclick=()=>{
      roofDraft.validated=true;
      roofDraft.validatedAt=new Date().toISOString();
      const ps=getProjects(),p=ps.find(x=>x.id===currentProject.id);
      if(!p)return;
      p.roofCheck=roofDraft;
      const old=p.trades?.ferblanterie;
      if(old?.rows){
        const wasPublished=old.published===true;
        old.rows=applyAutoFerblanterie(old.rows,p.roofMetrics,roofDraft);
        old.published=wasPublished;
        old.updatedAt=new Date().toISOString();
      }
      putProjects(ps);currentProject=p;openStromProject();
    };
  }

  const companyBtn=$('#companyFind');
  if(companyBtn){
    companyBtn.onclick=()=>{
      if(!selected.company||!companyTrade)return;
      const p=getProjects().find(x=>x.key===projectKey(selected.company.label));
      const state=p?.trades?.[companyTrade];
      if(!p){$('#companyStatus').textContent='Aucun projet Ström n’est disponible pour cette adresse.';return}
      if(!state){$('#companyStatus').textContent=`Le projet existe, mais aucun bordereau ${trades[companyTrade].name} n’a encore été préparé.`;return}
      if(!state.published){const filled=(state.rows||[]).filter(isFilled).length;$('#companyStatus').textContent=filled?`Le bordereau ${trades[companyTrade].name} contient ${filled} ligne(s) renseignée(s), mais il est encore en brouillon côté Ström. Il faut cliquer sur « Valider et rendre disponible ».`:`Le bordereau ${trades[companyTrade].name} est encore en brouillon et ne contient aucune quantité publiée.`;return}
      currentProject=p;
      // Recalcule à l'ouverture pour que les métrés automatiques ajoutés après une ancienne publication apparaissent aussi.
      if(companyTrade==='ferblanterie'){
        state.rows=applyAutoFerblanterie(state.rows||template('ferblanterie'),p.roofMetrics,p.roofCheck?.validated?p.roofCheck:null);
        const ps=getProjects(),stored=ps.find(x=>x.id===p.id);if(stored?.trades?.ferblanterie){stored.trades.ferblanterie.rows=state.rows;putProjects(ps)}
      }
      openCompanyQuote(state);
    };
  }
})();
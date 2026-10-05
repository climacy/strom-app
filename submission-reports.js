/* Réception et rapports consolidés des soumissions entreprise.
   Extension volontairement isolée : aucun calcul de métrés n'est modifié. */
(() => {
  const STORE='strom-company-submissions-v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch(e){return[]}};
  const write=v=>localStorage.setItem(STORE,JSON.stringify(v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>new Intl.NumberFormat('fr-CH',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0)+' CHF';
  const companyKey=c=>(String(c.vat||'').trim()||String(c.email||'').trim()||String(c.name||'').trim()).toLowerCase();

  function currentOffer(){
    if(!currentProject||!companyTrade)return null;
    const rows=[];
    document.querySelectorAll('#companyRows .row').forEach(r=>{
      const priceRaw=r.querySelector('.unit-price')?.value??'';
      if(priceRaw==='')return;
      // Quantité modifiable par l'entreprise (.company-qty) sinon quantité verrouillée par Ström.
      const editable=r.querySelector('.company-qty');
      const qty=Number(editable?editable.value:r.querySelector('.locked-qty')?.textContent.replace('🔒','').trim())||0;
      const price=Number(priceRaw)||0;
      rows.push({
        label:r.querySelector('.designation')?.textContent.trim()||'',
        qty,
        unit:r.querySelector('.locked-unit')?.textContent.replace('🔒','').trim()||'',
        unitPrice:price,
        total:qty*price
      });
    });
    return {
      projectId:currentProject.id,
      projectKey:currentProject.key,
      projectAddress:currentProject.address,
      company:{
        name:document.querySelector('#companyName')?.value.trim()||'Entreprise non renseignée',
        contact:document.querySelector('#contactName')?.value.trim()||'',
        email:document.querySelector('#email')?.value.trim()||'',
        vat:document.querySelector('#vat')?.value.trim()||''
      },
      tradeKey:companyTrade,
      tradeName:trades[companyTrade]?.name||companyTrade,
      rows,
      notes:document.querySelector('#companyNotes')?.value.trim()||'',
      submittedAt:new Date().toISOString()
    };
  }

  window.stromSubmitCompanyOffer=()=>{
    const offer=currentOffer(); if(!offer)return;
    if(!offer.rows.length){
      document.querySelector('#sendStatus').textContent='Aucun prix n’a été renseigné : aucune soumission n’a été enregistrée.';
      return;
    }
    const all=read(),ck=companyKey(offer.company);
    let dossier=all.find(x=>x.projectId===offer.projectId&&companyKey(x.company)===ck);
    if(!dossier){
      dossier={id:'S'+Date.now(),projectId:offer.projectId,projectKey:offer.projectKey,projectAddress:offer.projectAddress,company:offer.company,trades:{},createdAt:offer.submittedAt};
      all.push(dossier);
    }
    dossier.company=offer.company;
    dossier.projectAddress=offer.projectAddress;
    dossier.trades[offer.tradeKey]={name:offer.tradeName,rows:offer.rows,notes:offer.notes,submittedAt:offer.submittedAt};
    dossier.updatedAt=offer.submittedAt;
    write(all);
    document.querySelector('#sendStatus').textContent='✓ Soumission transmise. Ce poste a été ajouté au dossier consolidé de votre entreprise.';
  };

  function projectDossiers(){
    if(!currentProject)return[];
    return read().filter(x=>x.projectId===currentProject.id||x.projectKey===currentProject.key);
  }
  function dossierTotal(d){return Object.values(d.trades||{}).reduce((s,t)=>s+(t.rows||[]).reduce((a,r)=>a+(Number(r.total)||0),0),0)}
  function tradeTotal(t){return(t.rows||[]).reduce((s,r)=>s+(Number(r.total)||0),0)}

  function renderHub(){
    const box=document.querySelector('#stromSubmissions'),count=document.querySelector('#submissionCount');
    if(!box||!currentProject)return;
    const ds=projectDossiers().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
    count.textContent=ds.length+(ds.length>1?' reçues':' reçue');
    if(!ds.length){box.innerHTML='<div class="empty-state">Aucune soumission reçue pour ce projet.</div>';return}
    box.innerHTML=ds.map(d=>{
      const ts=Object.values(d.trades||{});
      const tags=ts.map(t=>'<span class="submission-tag">✓ '+esc(t.name)+'</span>').join('');
      const date=d.updatedAt?new Date(d.updatedAt).toLocaleDateString('fr-CH'):'';
      return '<article class="submission-card"><div><h3>'+esc(d.company?.name||'Entreprise')+'</h3><div class="submission-meta">'+ts.length+' poste(s) remis · mise à jour '+esc(date)+'</div><div class="submission-tags">'+tags+'</div></div><div class="submission-total"><small>Total HT renseigné</small><strong>'+fmt(dossierTotal(d))+'</strong><div class="submission-actions"><button class="secondary view-submission" data-id="'+esc(d.id)+'">Voir l’offre</button><button class="primary pdf-submission" data-id="'+esc(d.id)+'">PDF</button></div></div></article>'
    }).join('')+(ds.length>1?'<div class="comparison-launch"><div><span class="eyebrow">ANALYSE DES OFFRES</span><h3>Comparer les entreprises</h3><p>Compare automatiquement uniquement les postes remis en commun.</p></div><button class="primary" id="compareSubmissions">Ouvrir le comparatif →</button></div>':'');
    box.querySelectorAll('.view-submission').forEach(b=>b.onclick=()=>openReport(b.dataset.id,false));
    box.querySelectorAll('.pdf-submission').forEach(b=>b.onclick=()=>openReport(b.dataset.id,true));
    const compare=box.querySelector('#compareSubmissions');if(compare)compare.onclick=openComparison;
  }

  function pctGap(a,b){
    a=Number(a)||0;b=Number(b)||0;
    if(!a&&!b)return '0,0 %';
    const base=Math.min(a,b);if(!base)return '—';
    return new Intl.NumberFormat('fr-CH',{minimumFractionDigits:1,maximumFractionDigits:1}).format(Math.abs(a-b)/base*100)+' %';
  }
  function commonTradeKeys(ds){
    if(ds.length<2)return[];
    const count={};ds.forEach(d=>Object.keys(d.trades||{}).forEach(k=>count[k]=(count[k]||0)+1));
    return Object.keys(count).filter(k=>count[k]>=2);
  }
  function openComparison(){
    const ds=projectDossiers(),keys=commonTradeKeys(ds);
    const m=ensureModal(),paper=m.querySelector('#reportPaper');
    if(!keys.length){
      paper.innerHTML='<div class="report-brand">STRÖM</div><div class="report-kicker">COMPARATIF DES SOUMISSIONS</div><h1 class="report-title">'+esc(currentProject.address)+'</h1><div class="empty-state">Aucun poste n’a encore été remis par au moins deux entreprises. Le comparatif apparaîtra dès qu’un même poste aura été chiffré par plusieurs sociétés.</div>';
      m.classList.add('open');return;
    }
    const sections=keys.map((key,idx)=>{
      const participants=ds.filter(d=>d.trades?.[key]);
      const labels=[...new Set(participants.flatMap(d=>(d.trades[key].rows||[]).map(r=>r.label)))];
      const heads=participants.map(d=>'<th colspan="2">'+esc(d.company?.name||'Entreprise')+'</th>').join('');
      const subheads=participants.map(()=>'<th>PU</th><th>Total</th>').join('');
      const rows=labels.map(label=>{
        const vals=participants.map(d=>(d.trades[key].rows||[]).find(r=>r.label===label));
        const prices=vals.filter(Boolean).map(r=>Number(r.unitPrice)||0);
        const gap=prices.length>=2?pctGap(Math.min(...prices),Math.max(...prices)):'—';
        const first=vals.find(Boolean);
        return '<tr><td>'+esc(label)+'</td><td>'+esc(first?.qty??'—')+' '+esc(first?.unit??'')+'</td>'+vals.map(r=>'<td>'+(r?fmt(r.unitPrice):'—')+'</td><td>'+(r?fmt(r.total):'—')+'</td>').join('')+'<td class="gap-cell">'+gap+'</td></tr>'
      }).join('');
      const totals=participants.map(d=>tradeTotal(d.trades[key]));
      const totalGap=totals.length>=2?pctGap(Math.min(...totals),Math.max(...totals)):'—';
      return '<section class="report-section comparison-section"><div class="report-section-head"><b>'+String(idx+1).padStart(2,'0')+' · '+esc(participants[0].trades[key].name).toUpperCase()+'</b><span>'+participants.length+' entreprises comparées</span></div><div class="comparison-scroll"><table class="report-table comparison-table"><thead><tr><th rowspan="2">Désignation</th><th rowspan="2">Quantité</th>'+heads+'<th rowspan="2">Écart PU</th></tr><tr>'+subheads+'</tr></thead><tbody>'+rows+'<tr class="comparison-total-row"><td colspan="2"><b>TOTAL DU POSTE</b></td>'+participants.map((d,i)=>'<td colspan="2"><b>'+fmt(totals[i])+'</b></td>').join('')+'<td><b>'+totalGap+'</b></td></tr></tbody></table></div></section>'
    }).join('');
    const companyNames=ds.map(d=>esc(d.company?.name||'Entreprise')).join(' · ');
    paper.innerHTML='<div class="report-brand">STRÖM</div><div class="report-kicker">COMPARATIF DES SOUMISSIONS</div><h1 class="report-title">'+esc(currentProject.address)+'</h1><div class="report-address">'+companyNames+'</div><div class="comparison-summary"><strong>'+keys.length+'</strong><span>poste(s) en commun comparé(s)</span></div>'+sections+'<div class="report-footer"><span>STRÖM · Analyse comparative des offres</span><span>'+esc(currentProject.address)+'</span></div>';
    m.classList.add('open');
  }

  function ensureModal(){
    let m=document.querySelector('#submissionReportModal'); if(m)return m;
    m=document.createElement('div');m.id='submissionReportModal';m.className='report-modal';
    m.innerHTML='<div class="report-sheet"><div class="report-toolbar"><strong>Rapport de soumission</strong><div><button id="reportPrint">Imprimer / PDF</button> <button id="reportClose">Fermer</button></div></div><div id="reportPaper" class="report-paper"></div></div>';
    document.body.appendChild(m);
    m.querySelector('#reportClose').onclick=()=>m.classList.remove('open');
    m.querySelector('#reportPrint').onclick=()=>window.print();
    m.onclick=e=>{if(e.target===m)m.classList.remove('open')};
    return m;
  }

  function openReport(id,printNow){
    const d=read().find(x=>x.id===id);if(!d)return;
    const m=ensureModal(),paper=m.querySelector('#reportPaper');
    const tradesHtml=Object.entries(d.trades||{}).map(([key,t],i)=>{
      const rows=(t.rows||[]).map(r=>'<tr><td>'+esc(r.label)+'</td><td>'+esc(r.qty)+'</td><td>'+esc(r.unit)+'</td><td>'+fmt(r.unitPrice)+'</td><td>'+fmt(r.total)+'</td></tr>').join('');
      const notes=t.notes?'<div class="report-notes"><b>Remarques / exclusions · '+esc(t.name)+'</b><br>'+esc(t.notes)+'</div>':'';
      return '<section class="report-section"><div class="report-section-head"><b>'+String(i+1).padStart(2,'0')+' · '+esc(t.name).toUpperCase()+'</b><strong>'+fmt(tradeTotal(t))+'</strong></div><table class="report-table"><thead><tr><th>Désignation</th><th>Qté</th><th>Unité</th><th>Prix unitaire</th><th>Total</th></tr></thead><tbody>'+rows+'</tbody></table>'+notes+'</section>'
    }).join('');
    const last=d.updatedAt?new Date(d.updatedAt).toLocaleDateString('fr-CH'):'';
    paper.innerHTML='<div class="report-brand">STRÖM</div><div class="report-kicker">RAPPORT CONSOLIDÉ DE SOUMISSION</div><h1 class="report-title">'+esc(d.projectAddress)+'</h1><div class="report-address">Offre entreprise · '+esc(last)+'</div><div class="report-info"><div><span>Maître du bordereau</span><strong>Ström SA</strong><small>Crissier · Suisse</small></div><div><span>Entreprise</span><strong>'+esc(d.company?.name||'—')+'</strong><small>'+esc(d.company?.contact||'')+'</small></div><div><span>Contact</span><strong>'+esc(d.company?.email||'—')+'</strong><small>'+esc(d.company?.vat||'')+'</small></div></div>'+tradesHtml+'<div class="report-grand"><span>TOTAL HT</span><strong>'+fmt(dossierTotal(d))+'</strong></div><div class="report-footer"><span>STRÖM · Soumissions professionnelles</span><span>'+esc(d.projectAddress)+'</span></div>';
    m.classList.add('open');
    if(printNow)setTimeout(()=>window.print(),120);
  }

  const originalOpen=window.openStromProject;
  if(typeof originalOpen==='function')window.openStromProject=function(){originalOpen();renderHub()};
  document.addEventListener('click',e=>{if(e.target?.closest?.('.project-item'))setTimeout(renderHub,0)});
})();

// Extensions du calepinage Ström : duplication + déplacement par clic ou glisser-déposer.
(() => {
  let movingObstacleIndex = null;
  let dragState = null;

  function centroid(points) {
    if (!Array.isArray(points) || !points.length) return null;
    return [points.reduce((s,p)=>s+p[0],0)/points.length, points.reduce((s,p)=>s+p[1],0)/points.length];
  }
  function svgEventWorld(e) {
    const box=roofOrthoBox(), svg=$('#roofSvg'); if(!box||!svg)return null;
    const rect=svg.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width*1000, y=(e.clientY-rect.top)/rect.height*650;
    return svgToWorld(box,x,y);
  }
  function moveBy(index,de,dn){const o=roofDraft?.obstacles?.[index];if(!o?.points)return;o.points=o.points.map(([e,n])=>[e+de,n+dn]);o.area=Math.round(polyArea(o.points)*100)/100}
  function moveToWorld(index,target){const o=roofDraft?.obstacles?.[index],c=centroid(o?.points);if(!o||!c)return;moveBy(index,target[0]-c[0],target[1]-c[1])}
  function cloneObstacle(index){const source=roofDraft?.obstacles?.[index];if(!source?.points?.length)return;const copy=JSON.parse(JSON.stringify(source));copy.id='O'+Date.now()+Math.random().toString(36).slice(2,6);copy.points=source.points.map(p=>[p[0],p[1]]);copy.area=Math.round(polyArea(copy.points)*100)/100;roofDraft.obstacles.push(copy);movingObstacleIndex=roofDraft.obstacles.length-1;roofMode='moveObstacle';obstaclePoints=[];$('#roofHelp').textContent=`Copie de « ${source.type} » créée. Cliquez où la placer, ou faites-la ensuite glisser directement.`;renderRoofEditor()}
  function startMove(index){const o=roofDraft?.obstacles?.[index];if(!o?.points?.length)return;movingObstacleIndex=index;roofMode='moveObstacle';obstaclePoints=[];$('#roofHelp').textContent=`Déplacement de « ${o.type} ». Cliquez sur son nouvel emplacement.`;renderRoofEditor()}

  const baseRenderRoofEditor=renderRoofEditor;
  renderRoofEditor=function(){
    baseRenderRoofEditor();
    const svg=$('#roofSvg'),box=roofOrthoBox();
    if(svg&&box&&roofDraft?.obstacles){
      // Les polygones obstacles sont rendus dans le même ordre que roofDraft.obstacles.
      const polys=[...svg.querySelectorAll('.roof-obstacle')];
      polys.forEach((poly,i)=>{
        poly.style.pointerEvents='all';poly.style.cursor='grab';poly.dataset.obstacleIndex=i;
        poly.onpointerdown=e=>{
          if(roofMode==='obstacle')return;
          e.preventDefault();e.stopPropagation();
          const w=svgEventWorld(e);if(!w)return;
          dragState={index:i,last:w,moved:false};poly.style.cursor='grabbing';
          try{poly.setPointerCapture(e.pointerId)}catch{}
        };
        poly.onpointermove=e=>{
          if(!dragState||dragState.index!==i)return;
          const w=svgEventWorld(e);if(!w)return;
          const de=w[0]-dragState.last[0],dn=w[1]-dragState.last[1];
          if(Math.hypot(de,dn)>.001)dragState.moved=true;
          moveBy(i,de,dn);dragState.last=w;
          // Déplacement visuel immédiat sans attendre le relâchement.
          const pts=roofDraft.obstacles[i].points.map(p=>worldToSvg(box,p[0],p[1]));
          poly.setAttribute('points',pts.map(p=>p.join(',')).join(' '));
        };
        poly.onpointerup=e=>{
          if(!dragState||dragState.index!==i)return;
          try{poly.releasePointerCapture(e.pointerId)}catch{}
          const moved=dragState.moved;dragState=null;poly.style.cursor='grab';
          if(moved){movingObstacleIndex=null;roofMode='pan';$('#roofHelp').textContent='Obstacle déplacé. Vous pouvez le reprendre directement et le faire glisser à nouveau.';renderRoofEditor()}
        };
      });
    }
    const list=$('#obstacleList');if(!list||!roofDraft?.obstacles?.length)return;
    list.innerHTML=roofDraft.obstacles.map((o,i)=>`<div class="obstacle-item obstacle-item-actions"><div><strong>${i+1}. ${o.type}</strong><small>${o.area} m² · 4 points${movingObstacleIndex===i?' · à placer':''}</small></div><div class="obstacle-actions-mini"><button type="button" class="move-obstacle" data-i="${i}" title="Déplacer">↔</button><button type="button" class="duplicate-obstacle" data-i="${i}" title="Dupliquer">⧉</button><button type="button" class="delete-obstacle" data-i="${i}" title="Supprimer">×</button></div></div>`).join('');
    list.querySelectorAll('.duplicate-obstacle').forEach(b=>b.onclick=e=>{e.stopPropagation();cloneObstacle(+b.dataset.i)});
    list.querySelectorAll('.move-obstacle').forEach(b=>b.onclick=e=>{e.stopPropagation();startMove(+b.dataset.i)});
    list.querySelectorAll('.delete-obstacle').forEach(b=>b.onclick=e=>{e.stopPropagation();const i=+b.dataset.i;roofDraft.obstacles.splice(i,1);if(movingObstacleIndex===i)movingObstacleIndex=null;else if(movingObstacleIndex!=null&&movingObstacleIndex>i)movingObstacleIndex--;renderRoofEditor()});
  };

  $('#roofSvg').onclick=e=>{
    if(dragState)return;
    const world=svgEventWorld(e);if(!world)return;
    if(roofMode==='moveObstacle'&&movingObstacleIndex!=null){const moved=roofDraft.obstacles[movingObstacleIndex];moveToWorld(movingObstacleIndex,world);const label=moved?.type||'Obstacle';movingObstacleIndex=null;roofMode='pan';$('#togglePanMode').classList.add('active-tool');$('#addObstacleMode').classList.remove('active-tool');$('#obstacleEditor').classList.add('hidden');$('#roofHelp').textContent=`${label} placé. Vous pouvez maintenant le faire glisser directement sur la carte.`;renderRoofEditor();return}
    if(roofMode!=='obstacle')return;
    obstaclePoints.push(world);if(obstaclePoints.length<4){$('#roofHelp').textContent=`Obstacle : point ${obstaclePoints.length}/4 placé. Cliquez sur le coin suivant.`;renderRoofEditor();return}
    const points=obstaclePoints.slice(0,4),area=Math.round(polyArea(points)*100)/100;roofDraft.obstacles.push({id:'O'+Date.now(),type:$('#obstacleType').value,points,area});obstaclePoints=[];renderRoofEditor();$('#roofHelp').textContent=`Obstacle ajouté (${area} m²). Faites-le glisser directement pour ajuster sa position, ou dupliquez-le avec ⧉.`
  };
  const dims=document.querySelector('.obstacle-dims');if(dims)dims.style.display='none';const editorText=document.querySelector('#obstacleEditor p');if(editorText)editorText.textContent='Cliquez sur les 4 coins de l’obstacle directement sur la photo aérienne.';
})();
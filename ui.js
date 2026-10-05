/* STRÖM · couche d'interface (présentation uniquement).
   - Ne modifie aucune donnée, aucun calcul, aucun localStorage.
   - N'écrase aucune fonction existante : observe le DOM et l'habille.
   - Toutes les opérations sont idempotentes. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const icon = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

  /* ---------- Fil d'étapes dans la barre du haut ---------- */
  const FLOWS = {
    company: { label: 'Espace entreprise', steps: [['tradeStep', 'Poste'], ['companySearch', 'Adresse'], ['companyQuote', 'Bordereau'], ['companyReviewStep', 'Envoi']] },
    strom: { label: 'Espace Ström', steps: [['stromStart', 'Projet'], ['stromRoofCheck', 'Toiture'], ['stromProject', 'Postes'], ['stromMeasure', 'Métré']] }
  };
  let lastPanel = null;
  function renderFlow() {
    const active = document.querySelector('.panel.active');
    const id = active?.id || 'home';
    if (id === lastPanel) return;
    lastPanel = id;
    const nav = $('#flowSteps'), tag = $('#headerTag');
    const flowKey = Object.keys(FLOWS).find(k => FLOWS[k].steps.some(s => s[0] === id));
    if (!flowKey) {
      nav.innerHTML = '';
      tag.textContent = 'Soumissions professionnelles';
      tag.removeAttribute('data-space');
      return;
    }
    const flow = FLOWS[flowKey], idx = flow.steps.findIndex(s => s[0] === id);
    tag.textContent = flow.label;
    tag.dataset.space = flowKey;
    nav.innerHTML = flow.steps.map(([, label], i) => {
      const state = i < idx ? 'done' : i === idx ? 'current' : 'todo';
      const mark = i < idx ? icon('check') : String(i + 1);
      return (i ? '<span class="flow-sep"></span>' : '') +
        `<span class="flow-step ${state}"${state === 'current' ? ' aria-current="step"' : ''}><i>${mark}</i><span>${label}</span></span>`;
    }).join('');
  }

  /* ---------- Icônes des postes (remplace les emojis restants) ---------- */
  const TRADE_SVG = {
    'Isolation et sous-couverture': '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 24 24 10l18 14"/><path d="M10 31l3-4 3 4 3-4 3 4 3-4 3 4 3-4 3 4 3-4 3 4"/><path d="M8 37h32"/></svg>',
    'Démontage': '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 36 30 18"/><path d="m27 11 10 10-4 4-10-10z"/><path d="M33 33h7v7h-7zM28 38l-3 3M38 28l3-3"/></svg>',
    'Couverture': '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 33 14 14h23l4 19z"/><path d="M13 20h25M12 26h27"/></svg>'
  };
  const GENERIC_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 24 24 10l17 14"/><path d="M12 21v16h24V21"/></svg>';
  function decorateTrades() {
    document.querySelectorAll('.trade').forEach(card => {
      const ic = card.querySelector('.icon');
      if (ic && !ic.querySelector('svg')) {
        const name = card.querySelector('b')?.textContent.trim() || '';
        ic.innerHTML = TRADE_SVG[name] || GENERIC_SVG;
      }
    });
    document.querySelectorAll('#stromTradeGrid .trade').forEach(card => {
      const p = card.querySelector('p'); if (!p) return;
      const raw = p.textContent.trim();
      const state = /Disponible/i.test(raw) ? 'published' : /Brouillon/i.test(raw) ? 'draft' : /validé/i.test(raw) ? 'ready' : 'todo';
      if (card.dataset.state !== state) card.dataset.state = state;
      const clean = raw.replace(/^[✓⚡]\s*/u, '');
      if (clean !== raw) p.textContent = clean;
    });
  }

  /* ---------- Résultats d'adresse ---------- */
  function decoratePins() {
    document.querySelectorAll('.address-result .pin').forEach(pin => {
      if (!pin.querySelector('svg')) pin.innerHTML = icon('pin');
    });
  }

  /* ---------- Cadenas du bordereau entreprise ---------- */
  function decorateLocks() {
    document.querySelectorAll('#companyRows .locked-qty, #companyRows .locked-unit').forEach(el => {
      if (el.querySelector('.ui-lock')) return;
      const value = el.textContent.replace('🔒', '').trim();
      el.innerHTML = icon('lock', 'ui-lock') + '<span></span>';
      el.lastChild.textContent = value; // textContent reste lisible par la logique existante
    });
    document.querySelectorAll('#companyRows .editable-qty > span').forEach(el => {
      if (!el.querySelector('svg')) el.innerHTML = icon('unlock', 'ui-lock');
    });
  }

  /* ---------- Tonalité des messages de statut ---------- */
  function decorateStatus() {
    document.querySelectorAll('.status').forEach(el => {
      const raw = el.textContent;
      const t = raw.trim();
      let tone = '';
      if (t) {
        if (/…$/.test(t)) tone = 'loading';
        else if (/^✓/.test(t)) tone = 'success';
        else if (/aucun|indisponible|brouillon|n’a|n'a|impossible|encore|erreur/i.test(t)) tone = 'warn';
        else tone = 'success';
      }
      if (tone) { if (el.dataset.tone !== tone) el.dataset.tone = tone; }
      else if (el.hasAttribute('data-tone')) el.removeAttribute('data-tone');
      const clean = raw.replace(/^\s*✓\s*/u, '');
      if (clean !== raw) el.textContent = clean;
    });
  }

  /* ---------- Progression des prix (bordereau entreprise) ---------- */
  function decorateQuoteProgress() {
    const footer = document.querySelector('#companyQuote .quote-footer'); if (!footer) return;
    let prog = footer.querySelector('.quote-progress');
    if (!prog) { prog = document.createElement('span'); prog.className = 'quote-progress'; footer.insertBefore(prog, footer.firstChild); }
    const rows = [...document.querySelectorAll('#companyRows .row')];
    let priced = 0;
    rows.forEach(r => {
      const has = (r.querySelector('.unit-price')?.value ?? '') !== '';
      if (has) priced++;
      const v = has ? '1' : '0';
      if (r.dataset.priced !== v) r.dataset.priced = v;
    });
    const html = rows.length ? `<b>${priced}</b> / ${rows.length} prix renseignés` : '';
    if (prog.innerHTML !== html) prog.innerHTML = html;
  }

  /* ---------- Barre d'outils toiture (injectée par roof-professional.js) ---------- */
  const TOOL_ICONS = { pan: 'hand', toggle: 'layers', obstacle: 'square-plus', erase: 'eraser', line: 'line', proAutoTiles: 'zap', proLeft: 'chev-left', proRight: 'chev-right', proUp: 'chev-up', proDown: 'chev-down', proResetOffset: 'target' };
  const ARROW_LABELS = { proLeft: 'Décaler à gauche', proRight: 'Décaler à droite', proUp: 'Décaler vers le haut', proDown: 'Décaler vers le bas' };
  function decorateRoofToolbar() {
    const bar = $('#proRoofToolbar'); if (!bar) return;
    bar.querySelectorAll('button').forEach(b => {
      if (b.dataset.ui) return;
      const key = b.dataset.mode || b.id, ic = TOOL_ICONS[key];
      if (!ic) return;
      b.dataset.ui = '1';
      if (ARROW_LABELS[key]) { b.innerHTML = icon(ic); b.title = ARROW_LABELS[key]; b.setAttribute('aria-label', ARROW_LABELS[key]); return; }
      const label = b.textContent.replace(/^[^\p{L}]+/u, '').trim();
      b.innerHTML = icon(ic) + '<span></span>';
      b.lastChild.textContent = label;
    });
    document.querySelectorAll('.pro-zoom button').forEach(b => {
      const t = { proZoomIn: 'Zoomer', proZoomOut: 'Dézoomer', proZoomReset: 'Vue initiale' }[b.id];
      if (t && !b.title) { b.title = t; b.setAttribute('aria-label', t); }
    });
  }

  /* ---------- Boutons des rapports ---------- */
  function decorateReport() {
    const p = $('#reportPrint'), c = $('#reportClose');
    if (p && !p.dataset.ui) { p.dataset.ui = '1'; p.innerHTML = icon('printer') + '<span>Imprimer / PDF</span>'; p.style.display = 'inline-flex'; p.style.alignItems = 'center'; p.style.gap = '8px'; }
    if (c && !c.dataset.ui) { c.dataset.ui = '1'; c.innerHTML = icon('x') + '<span>Fermer</span>'; c.style.display = 'inline-flex'; c.style.alignItems = 'center'; c.style.gap = '8px'; }
  }

  /* ---------- Repères visuels : quantités vides, prix non renseignés ---------- */
  function decorateHints() {
    document.querySelectorAll('#measureRows .measure-qty:not([placeholder])').forEach(i => i.setAttribute('placeholder', '—'));
    document.querySelectorAll('#companySummary tbody tr').forEach(tr => {
      const un = tr.children[2]?.textContent.trim() === 'Non renseigné';
      if (tr.classList.contains('unpriced') !== un) tr.classList.toggle('unpriced', un);
    });
  }

  /* ---------- Libellés générés en capitales -> casse de phrase ---------- */
  function decorateCaps() {
    document.querySelectorAll('.eyebrow, .report-kicker').forEach(el => {
      if (el.children.length) return;
      const t = el.textContent;
      if (t.length > 3 && t === t.toUpperCase() && /[A-Z]/.test(t)) el.textContent = t.charAt(0) + t.slice(1).toLowerCase();
    });
  }

  /* ---------- Titres de section : nombre de lignes + repère PV ---------- */
  function decorateSections() {
    document.querySelectorAll('#measureRows .section-title, #companyRows .section-title').forEach(h => {
      let n = 0, el = h.nextElementSibling;
      while (el && !el.classList.contains('section-title')) { if (el.classList.contains('measure-row') || el.classList.contains('row')) n++; el = el.nextElementSibling; }
      const count = n + (n > 1 ? ' lignes' : ' ligne');
      if (h.dataset.count !== count) h.dataset.count = count; // attribut seulement : le texte du titre reste intact
      const t = h.textContent, kind = /photovolta/i.test(t) ? 'pv' : /automatiquement/i.test(t) ? 'auto' : '';
      if ((h.dataset.kind || '') !== kind) { if (kind) h.dataset.kind = kind; else delete h.dataset.kind; }
    });
  }

  /* ---------- Plan de toiture : tailles constantes à l'écran, quel que soit le zoom ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  /* Position des étiquettes déplacées à la main : décalage par rapport au centre du pan (préférence d'affichage). */
  const LABEL_KEY = 'strom-ui-pan-labels-v1';
  const readLabels = () => { try { return JSON.parse(localStorage.getItem(LABEL_KEY) || '{}'); } catch { return {}; } };
  const writeLabels = v => { try { localStorage.setItem(LABEL_KEY, JSON.stringify(v)); } catch {} };
  const projKey = () => { try { return String(currentProject?.id || currentProject?.key || ''); } catch { return ''; } };
  let labelOffsets = readLabels();
  let labelDrag = null;
  function decorateRoof() {
    const svg = $('#roofSvg'); if (!svg || !svg.closest('.panel.active')) return;
    const vb = svg.viewBox.baseVal, rect = svg.getBoundingClientRect();
    if (!vb || !vb.width || !rect.width) return;
    const k = 1 / Math.min(rect.width / vb.width, rect.height / vb.height); // unités SVG par pixel écran
    const px = v => (v * k).toFixed(3);
    svg.querySelectorAll('.pro-vertex').forEach(c => {
      c.setAttribute('r', px(4.5));
      // zone de prise invisible plus large (même data-vertex : la logique de glisser reste celle d'origine)
      let hit = c.nextElementSibling;
      if (!hit || !hit.classList.contains('ui-vertex-hit')) { hit = document.createElementNS(NS, 'circle'); hit.setAttribute('class', 'ui-vertex-hit'); hit.dataset.vertex = c.dataset.vertex; c.after(hit); }
      hit.setAttribute('cx', c.getAttribute('cx')); hit.setAttribute('cy', c.getAttribute('cy')); hit.setAttribute('r', px(11));
    });
    svg.querySelectorAll('.pro-draft-point').forEach(c => c.setAttribute('r', px(3.5)));
    svg.querySelectorAll('.obstacle-draft-point').forEach(c => c.setAttribute('r', px(4)));
    svg.querySelectorAll('.roof-obstacle-badge').forEach(c => c.setAttribute('r', px(8)));
    svg.querySelectorAll('.roof-obstacle-number,.obstacle-draft-number').forEach(t => t.setAttribute('font-size', px(10)));
    // Numéros d'obstacle : petite pastille
    svg.querySelectorAll('.pro-obstacle-label').forEach(t => {
      if (!t.dataset.cy) { t.dataset.cx = t.getAttribute('x'); t.dataset.cy = String(Number(t.getAttribute('y')) - 4); }
      t.setAttribute('y', t.dataset.cy); t.setAttribute('font-size', px(10));
      let dot = t.previousElementSibling;
      if (!dot || !dot.classList.contains('ui-ob-badge')) { dot = document.createElementNS(NS, 'circle'); dot.setAttribute('class', 'ui-ob-badge'); t.before(dot); }
      dot.setAttribute('cx', t.dataset.cx); dot.setAttribute('cy', t.dataset.cy); dot.setAttribute('r', px(8));
    });
    // Zones de raccord / factices : partie des pans retenus non couverte par un module entier (hachurée)
    decorateFactices(svg, vb, k);
    decorateCoverage();
    // Étiquettes de pans : placées HORS de la toiture, reliées au pan par un trait fin.
    const labels = [...svg.querySelectorAll('.pro-pan-label')];
    if (!labels.length) return;
    const verts = [];
    svg.querySelectorAll('.roof-pan').forEach(pg => { for (const pt of pg.points) verts.push([pt.x, pt.y]); });
    if (!verts.length) return;
    const xs = verts.map(v => v[0]), ys = verts.map(v => v[1]);
    const C = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    const placed = [];
    labels.forEach((t, li) => {
      if (!t.dataset.pan) {
        const m = t.textContent.match(/PAN\s*(\d+)\s*·\s*(.+)/i); if (!m) return;
        t.dataset.pan = m[1]; t.dataset.area = m[2].trim();
        t.dataset.cx = t.getAttribute('x'); t.dataset.cy = t.getAttribute('y');
        const poly = svg.querySelector(`.roof-pan[data-i="${Number(m[1]) - 1}"]`), off = !!poly?.classList.contains('disabled');
        t.textContent = '';
        const a = document.createElementNS(NS, 'tspan'); a.textContent = 'Pan ' + m[1];
        const b = document.createElementNS(NS, 'tspan'); b.setAttribute('class', 'sub'); b.textContent = off ? 'exclu' : t.dataset.area;
        t.append(a, b); t.setAttribute('text-anchor', 'middle'); if (off) t.classList.add('off');
        const mk = (tag, cls) => { const el = document.createElementNS(NS, tag); el.setAttribute('class', cls); return el; };
        t._ui = { line: mk('line', 'ui-pan-leader'), dot: mk('circle', 'ui-pan-anchor'), pill: mk('rect', 'ui-pan-pill' + (off ? ' off' : '')) };
        svg.append(t._ui.line, t._ui.dot, t._ui.pill, t); // au premier plan, mais hors du toit
        const pill = t._ui.pill, pan = t.dataset.pan;
        pill.addEventListener('pointerdown', ev => {
          ev.stopPropagation(); ev.preventDefault(); // ne déclenche ni dessin ni déplacement de vue
          labelDrag = { pan, id: ev.pointerId }; pill.setPointerCapture(ev.pointerId); pill.classList.add('dragging');
        });
        pill.addEventListener('pointermove', ev => {
          if (!labelDrag || labelDrag.pan !== pan) return;
          const m = svg.getScreenCTM(); if (!m) return;
          const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
          const w = pt.matrixTransform(m.inverse()), key = projKey();
          (labelOffsets[key] ||= {})[pan] = [w.x - Number(t.dataset.cx), w.y - Number(t.dataset.cy)];
          decorateRoof();
        });
        const end = ev => { if (!labelDrag || labelDrag.pan !== pan) return; labelDrag = null; pill.classList.remove('dragging'); try { pill.releasePointerCapture(ev.pointerId); } catch {} writeLabels(labelOffsets); };
        pill.addEventListener('pointerup', end); pill.addEventListener('pointercancel', end);
        pill.addEventListener('dblclick', ev => { ev.stopPropagation(); const key = projKey(); if (labelOffsets[key]) { delete labelOffsets[key][pan]; writeLabels(labelOffsets); decorateRoof(); } });
        pill.addEventListener('click', ev => ev.stopPropagation());
      }
      if (!t._ui) return;
      const [a, b] = t.children; if (!a || !b) return;
      const cx = Number(t.dataset.cx), cy = Number(t.dataset.cy);
      t.setAttribute('font-size', px(11));
      a.setAttribute('dy', '0'); b.setAttribute('dy', '1.2em');
      a.setAttribute('x', 0); b.setAttribute('x', 0); t.setAttribute('y', 0);
      const bb0 = t.getBBox(), padX = 7 * k, padY = 4 * k, W = bb0.width + 2 * padX, H = bb0.height + 2 * padY;
      // direction : du centre de la toiture vers le centre du pan
      let d = [cx - C[0], cy - C[1]], L = Math.hypot(d[0], d[1]);
      if (L < 1e-6) { const ang = -Math.PI / 2 + li * 2.4; d = [Math.cos(ang), Math.sin(ang)]; } else d = [d[0] / L, d[1] / L];
      const R = Math.max(...verts.map(v => (v[0] - C[0]) * d[0] + (v[1] - C[1]) * d[1]));
      const half = Math.abs(d[0]) * W / 2 + Math.abs(d[1]) * H / 2;
      let dist = R + 18 * k + half, X, Y;
      for (let guard = 0; guard < 12; guard++) {
        X = C[0] + d[0] * dist; Y = C[1] + d[1] * dist;
        X = Math.min(Math.max(X, W / 2 + 4 * k), vb.width - W / 2 - 4 * k);
        Y = Math.min(Math.max(Y, H / 2 + 4 * k), vb.height - H / 2 - 4 * k);
        const hit = placed.some(r => Math.abs(r.X - X) < (r.W + W) / 2 + 4 * k && Math.abs(r.Y - Y) < (r.H + H) / 2 + 4 * k);
        if (!hit) break; dist += H + 6 * k;
      }
      const manual = labelOffsets[projKey()]?.[t.dataset.pan];
      if (manual) { X = cx + manual[0]; Y = cy + manual[1]; }
      placed.push({ X, Y, W, H });
      // texte centré dans la pastille
      a.setAttribute('x', X); b.setAttribute('x', X);
      t.setAttribute('y', Y - (bb0.y + bb0.height / 2));
      const { line, dot, pill } = t._ui;
      pill.setAttribute('x', X - W / 2); pill.setAttribute('y', Y - H / 2);
      pill.setAttribute('width', W); pill.setAttribute('height', H); pill.setAttribute('rx', px(6));
      // trait du pan jusqu'au bord de la pastille
      const ex = X - cx, ey = Y - cy, tEdge = Math.min(Math.abs(ex) > 1e-9 ? (W / 2) / Math.abs(ex) : Infinity, Math.abs(ey) > 1e-9 ? (H / 2) / Math.abs(ey) : Infinity);
      line.setAttribute('x1', cx); line.setAttribute('y1', cy);
      line.setAttribute('x2', X - ex * Math.min(1, tEdge)); line.setAttribute('y2', Y - ey * Math.min(1, tEdge));
      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('r', px(3));
    });
  }
  function decorateFactices(svg, vb, k) {
    const tiles = [...svg.querySelectorAll('.pro-tile')];
    let layer = svg.querySelector('.ui-factice');
    if (!tiles.length) { layer?.remove(); svg.querySelector('#uiDefs')?.remove(); return; }
    let defs = svg.querySelector('#uiDefs');
    if (!defs) {
      defs = document.createElementNS(NS, 'defs'); defs.id = 'uiDefs';
      defs.innerHTML = '<pattern id="uiFacticePat" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="ui-fp-bg"/><line class="ui-fp-line" x1="0" y1="0" x2="0"/></pattern><mask id="uiFacticeMask" maskUnits="userSpaceOnUse" x="0" y="0"></mask>';
      svg.prepend(defs);
    }
    const pat = defs.querySelector('pattern'), s = 7 * k;
    pat.setAttribute('width', s); pat.setAttribute('height', s);
    const bg = pat.querySelector('rect'); bg.setAttribute('width', s); bg.setAttribute('height', s);
    const ln = pat.querySelector('line'); ln.setAttribute('y2', s); ln.setAttribute('stroke-width', 1.6 * k);
    const mask = defs.querySelector('mask'); mask.setAttribute('width', vb.width); mask.setAttribute('height', vb.height);
    const poly = (el, fill) => `<polygon points="${el.getAttribute('points')}" fill="${fill}"/>`;
    const mhtml =
      [...svg.querySelectorAll('.roof-pan:not(.disabled)')].map(e => poly(e, '#fff')).join('') +
      tiles.map(e => poly(e, '#000')).join('') +
      [...svg.querySelectorAll('.pro-obstacle')].map(e => poly(e, '#000')).join('');
    if (mask._html !== mhtml) { mask.innerHTML = mhtml; mask._html = mhtml; } // idempotent : évite toute boucle d'observation
    if (!layer) {
      layer = document.createElementNS(NS, 'rect'); layer.setAttribute('class', 'ui-factice');
      layer.setAttribute('fill', 'url(#uiFacticePat)'); layer.setAttribute('mask', 'url(#uiFacticeMask)');
      const pans = svg.querySelectorAll('.roof-pan'); (pans[pans.length - 1] || svg.firstChild).after(layer);
    }
    layer.setAttribute('width', vb.width); layer.setAttribute('height', vb.height);
  }
  const MODULE_M2 = { 'Clim 455': 1.128 * 1.756, 'Clim 225': 1.128 * 0.878, 'Clim 110': 1.128 * 0.439 };
  function decorateCoverage() {
    const box = $('#proRoofInfo'); if (!box) return;
    let modules = 0;
    box.querySelectorAll(':scope > div').forEach(d => { const name = d.querySelector('span')?.textContent.trim(); if (MODULE_M2[name]) modules += (Number(d.querySelector('b')?.textContent) || 0) * MODULE_M2[name]; });
    let net = 0;
    try {
      const off = new Set(roofDraft?.disabledPans || []);
      net = (currentProject?.roofGeometry || []).filter(r => !off.has(r.index)).reduce((a, r) => a + (Number(r.area) || 0), 0) - (roofDraft?.obstacles || []).reduce((a, o) => a + (Number(o.area) || 0), 0);
    } catch { return; }
    if (net <= 0) return;
    const rest = Math.max(0, net - modules), pct = Math.min(100, modules / net * 100);
    const html = `<div class="ui-cov"><span>Surface modules</span><b>${modules.toFixed(1)} m²</b></div><div class="ui-cov"><span><i class="ui-hatch"></i>Raccords / factices</span><b>${rest.toFixed(1)} m²</b></div><div class="ui-cov strong"><span>Couverture active</span><b>${pct.toFixed(0)} %</b></div>`;
    let wrap = box.querySelector('.ui-cov-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'ui-cov-wrap'; box.insertBefore(wrap, box.querySelector('small')); }
    if (wrap.innerHTML !== html) wrap.innerHTML = html;
  }
  const roofSvg = $('#roofSvg');
  if (roofSvg) {
    // Synchrone (avant l'affichage) pour éviter tout clignotement pendant les glisser-déposer.
    new MutationObserver(() => { try { decorateRoof(); } catch (e) { console.warn('ui.js', e); } })
      .observe(roofSvg, { childList: true, attributes: true, attributeFilter: ['style', 'viewBox'] });
    window.addEventListener('resize', () => requestAnimationFrame(decorateRoof));
  }

  /* ---------- Boucle ---------- */
  let scheduled = false;
  function run() {
    scheduled = false;
    try {
      renderFlow(); decorateTrades(); decoratePins(); decorateLocks();
      decorateStatus(); decorateQuoteProgress(); decorateCaps(); decorateHints(); decorateSections(); decorateRoof(); decorateRoofToolbar(); decorateReport();
    } catch (e) { /* l'habillage ne doit jamais bloquer l'application */ console.warn('ui.js', e); }
  }
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(run); } };
  new MutationObserver(schedule).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  document.addEventListener('input', e => { if (e.target.closest?.('#companyRows')) schedule(); });

  /* Échap ferme la modale de métrage et les rapports (même effet qu'un clic sur le fond). */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('#incompleteModal.open')) $('#modalEdit')?.click();
    else if ($('#submissionReportModal.open')) $('#reportClose')?.click();
  });

  run();
})();

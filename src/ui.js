// src/ui.js
import {
  formatValue, uniqueSorted,
  isUrlLike, isBlankish, findHeader,
  normalizeImageUrl, PLACEHOLDER_IMG
} from './utils.js';
import { state } from './store.js';
import {
  IMAGE_FIELDS,
  SHOW_DETAILS
} from './config.js';

import {
  prepareAnchors, scoreRow, buildSegments, segColor
} from './score.js';

export function setStatus(msg, kind='ok'){
  const el = document.getElementById('status');
  if (el){ el.textContent = msg; el.className = `status ${kind}`; }
}
export function setDiag(txt){
  const el = document.getElementById('diag');
  if (el) el.textContent = txt || '';
}
export function setOptions(el, options, firstLabel){
  el.innerHTML = '';
  const first = document.createElement('option');
  first.value = ''; first.textContent = firstLabel; el.appendChild(first);
  for (const o of options){
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = o; el.appendChild(opt);
  }
}
export function renderSkeleton(n=6){
  const grid = document.getElementById('grid'); grid.innerHTML='';
  for (let i=0;i<n;i++){
    const s = document.createElement('div'); s.className='skeleton'; grid.appendChild(s);
  }
}

/* ===== helpers for image field ===== */
function headerFor(aliases){ return findHeader(state.headers, aliases) || null; }
function valueAt(row, header){ return header ? row._raw[header] : undefined; }

function getImage(row){
  const h = headerFor(IMAGE_FIELDS);
  const raw = valueAt(row, h);
  const norm = normalizeImageUrl(raw);
  return isUrlLike(norm) ? norm : null;
}

// click/keyboard toggle
function isInteractive(target, rowEl){
  const el = target.closest('a, button, select, input, textarea, [role="button"]');
  return !!(el && el !== rowEl);
}
function toggleRow(rowEl, expand){
  const willExpand = expand != null ? expand : !rowEl.classList.contains('expanded');
  rowEl.classList.toggle('expanded', willExpand);
  rowEl.setAttribute('aria-expanded', String(willExpand));
}

export function render(){
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const { search } = state.filters || {};
  const sortChoice = (state.filters?.sort || '').toLowerCase();

  let rows = [...state.rows];

  // Text search (kept)
  const q = (search||'').trim().toLowerCase();
  if (q){ rows = rows.filter(r => Object.values(r).some(v => (v||'').toString().toLowerCase().includes(q))); }

  // === dataset-wide anchors (for stable scoring) ===
  const anchors = prepareAnchors(state.rows, state.headers);

  // Score each row once
  const withScore = rows.map(r => {
    const s = scoreRow(r, state.headers, anchors);
    return { row: r, ...s };
  });

  // ---- choose metric for sort + group
  let metricKey = 'overall';
  if (sortChoice.startsWith('reward')) metricKey = 'rewards';
  else if (sortChoice.startsWith('annual')) metricKey = 'annual';

  const getMetricValue = (it) => {
    switch (metricKey){
      case 'rewards': return it.rewardScore;       // 0..5
      case 'annual':  return it.feeScore;          // 0..5 (higher=better)
      default:        return it.total;             // overall
    }
  };
  const metricLabel = (
    metricKey === 'rewards' ? 'Rewards' :
    metricKey === 'annual'  ? 'Annual Fee' :
    'Score'
  );

  // Sort by chosen metric (desc), tie-breaker by Card name
  withScore.sort((a,b) => {
    const da = getMetricValue(a), db = getMetricValue(b);
    const dt = db - da;
    return dt !== 0 ? dt : (a.row.card||'').localeCompare(b.row.card||'');
  });

  grid.innerHTML = '';
  if (withScore.length === 0){
    empty.style.display = 'block';
    return;
  } else {
    empty.style.display = 'none';
  }

  // Group by the chosen metric (1-decimal buckets)
  const groups = new Map();
  for (const it of withScore){
    const v = Number(getMetricValue(it).toFixed(1));
    if (!groups.has(v)) groups.set(v, []);
    groups.get(v).push(it);
  }
  const bucketValues = Array.from(groups.keys()).sort((a,b) => b - a);

  // Render each group header + rows
  bucketValues.forEach((bucket, groupIdx) => {
    const divider = document.createElement('div');
    divider.className = 'group-divider';
    divider.innerHTML = `
      <div class="gd-n">${groupIdx + 1}</div>
      <div class="gd-title">Crypto Card Rank <span class="rule"></span></div>
      <div class="gd-ds">${metricLabel}</div>
      <div></div>
    `;
    divider.style.pointerEvents = 'none';
    grid.appendChild(divider);

    groups.get(bucket).forEach((it, idx) => {
      const { row: r, display } = it;
      const imgUrl = getImage(r);

      // Segments (Rewards + Annual Fee + auto)
      const segs = buildSegments(r, state.headers, anchors);
      const segTotal = segs.reduce((s, x) => s + (Number.isFinite(x.value) ? x.value : 0), 0) || 1;

      const rowEl = document.createElement('section');
      rowEl.className = 'row clickable';
      rowEl.setAttribute('tabindex', '0');
      rowEl.setAttribute('role', 'button');
      rowEl.setAttribute('aria-expanded', 'false');

      const inner = document.createElement('div');
      inner.className = 'row-inner';

      // Col 1: image
      const left = document.createElement('div');
      left.className = 'row-left';
      const src = imgUrl || PLACEHOLDER_IMG;
      left.innerHTML = `<img src="${src}" alt="${formatValue(r.card)} thumbnail"
        onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">`;
      inner.appendChild(left);

      // Col 2: name
      const mid = document.createElement('div');
      mid.className = 'row-mid';
      mid.innerHTML = `<div class="row-title">${formatValue(r.card)}</div>`;
      inner.appendChild(mid);

      // Col 3: number shown = OVERALL display (unchanged)
      const scoreEl = document.createElement('div');
      scoreEl.className = 'row-score';
      scoreEl.textContent = display.toFixed(1).replace(/\.0$/, '');
      inner.appendChild(scoreEl);

      // Col 4: breakdown bar
      const right = document.createElement('div');
      right.className = 'row-right';
      const bar = document.createElement('div');
      bar.className = 'breakdown';

      if (segs.length){
        segs.forEach((s, i) => {
          const val = Number(s.value) || 0;
          const pct = Math.max(2, Math.round((val / segTotal) * 100));
          const seg = document.createElement('div');
          seg.className = 'seg';
          seg.style.width = `${pct}%`;
          seg.style.background = segColor(i);
          seg.innerHTML = `${s.label}<small>${val.toFixed(1).replace(/\.0$/, '')}</small>`;
          bar.appendChild(seg);
        });
      } else {
        const seg = document.createElement('div');
        seg.className = 'seg';
        seg.style.width = '100%';
        seg.style.background = 'rgba(255,255,255,.10)';
        seg.textContent = 'No breakdown';
        bar.appendChild(seg);
      }

      right.appendChild(bar);
      inner.appendChild(right);
      rowEl.appendChild(inner);

      // Details
      if (SHOW_DETAILS){
        const details = document.createElement('div');
        details.className = 'row-details';
        const items = [];

        const EXCLUDE_DETAILS = new Set(['Card','Card Name','Name','Product','Card_name']);
        state.headers.forEach(h => {
          if (EXCLUDE_DETAILS.has(h)) return;
          const v = r._raw[h];
          if (v === undefined || v === null || String(v).trim()==='') return;
          items.push(
            `<div class="kv-row"><div class="kv-key">${h}</div><div class="kv-val">${
              isUrlLike(v) ? `<a href="${v}" target="_blank" rel="noopener">${v}</a>` : formatValue(v)
            }</div></div>`
          );
        });

        if (items.length){
          details.innerHTML = `<div class="kv">${items.join('')}</div>`;
          const detailsId = `row-details-${bucket}-${idx}`;
          details.id = detailsId;
          rowEl.setAttribute('aria-controls', detailsId);
          rowEl.appendChild(details);
        }
      }

      // Expand/collapse handlers
      const onRowClick = (e) => {
        if (e.defaultPrevented) return;
        if (isInteractive(e.target, rowEl)) return;
        toggleRow(rowEl);
      };
      const onRowKey = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleRow(rowEl);
        }
      };
      rowEl.addEventListener('click', onRowClick);
      rowEl.addEventListener('keydown', onRowKey);
      rowEl.querySelectorAll('a, button, select, input, textarea, [role="button"]').forEach(el => {
        el.addEventListener('click', ev => ev.stopPropagation());
      });

      grid.appendChild(rowEl);
    });
  });

  // Footer meta (optional)
  const metaEl = document.getElementById('meta');
  if (metaEl) metaEl.textContent =
    `${withScore.length} card${withScore.length!==1?'s':''} shown • Rank by: ${metricLabel}`;
}

// src/ui.js
export function buildControlsOptions(){
  const sortEl = document.getElementById('sort');
  sortEl.innerHTML = '';

  const options = [
    'Overall (sum of scores)',  // sorts by overall total
    'Rewards',                  // sorts by rewardScore
    'Annual Fee'                // sorts by feeScore (higher=better)
  ];
  options.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    sortEl.appendChild(opt);
  });

  if (!state.filters) state.filters = {};
  if (!state.filters.sort) state.filters.sort = options[0];
  sortEl.value = state.filters.sort;
}


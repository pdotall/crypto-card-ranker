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
  if (el) { el.textContent = msg; el.className = `status ${kind}`; }
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

/* formatting helpers for the row-score cell */
function fmtPct(n){
  if (!Number.isFinite(n)) return '—';
  const d = Math.abs(n) < 1 ? 2 : 1;
  return `${Number(n).toFixed(d).replace(/\.0$/, '')}%`;
}
function fmtMoneyPerYear(n){
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n);
  return `$${rounded.toLocaleString('en-US')}/yr`;
}

export function render(){
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');

  let rows = [...state.rows];

  // Filters (search + legacy dropdowns, if any were set)
  const { search, issuer, network, country } = (state.filters || {});
  const q = (search||'').trim().toLowerCase();
  if (q){ rows = rows.filter(r => Object.values(r).some(v => (v||'').toString().toLowerCase().includes(q))); }
  if (issuer){ rows = rows.filter(r => (r.issuer||'') === issuer); }
  if (network){ rows = rows.filter(r => (r.network||'') === network); }
  if (country){ rows = rows.filter(r => (r.country||'') === country); }

  // === Score anchors and per-row scores ===
  const anchors = prepareAnchors(state.rows, state.headers);

  const withScore = rows.map(r => {
    const s = scoreRow(r, state.headers, anchors);
    // scoreRow returns: { base, fee, feeScore, rewards, rewardScore, total, display }
    return { row: r, ...s };
  });

  // === Sort based on the selected pill ===
  const mode = (state.filters && state.filters.sort) || 'Overall (sum of scores)';
  const isOverall = mode.toLowerCase().startsWith('overall');
  const isRewards = mode === 'Rewards';
  const isAnnual  = mode === 'Annual Fee';

  withScore.sort((a,b) => {
    if (isRewards){
      const d = (b.rewards || 0) - (a.rewards || 0);
      return d !== 0 ? d : (a.row.card||'').localeCompare(b.row.card||'');
    }
    if (isAnnual){
      const d = (a.fee || 0) - (b.fee || 0); // cheaper first
      return d !== 0 ? d : (a.row.card||'').localeCompare(b.row.card||'');
    }
    // Overall
    const d = (b.total || 0) - (a.total || 0);
    return d !== 0 ? d : (a.row.card||'').localeCompare(b.row.card||'');
  });

  // === Grouping for the rank headers ===
  // Overall: group by displayed overall (1 decimal) so ties cluster.
  // Rewards: group by rewards rounded to 0.1
  // Annual:  group by fee rounded to whole dollars
  const groupKey = it => {
    if (isRewards) return Math.round((it.rewards || 0) * 10) / 10;
    if (isAnnual)  return Math.round(it.fee || 0);
    return it.display; // overall (1-dec)
  };

  grid.innerHTML = '';
  if (withScore.length === 0){
    if (empty) empty.style.display = 'block';
    const metaEl0 = document.getElementById('meta'); if (metaEl0) metaEl0.textContent = `0 cards shown`;
    return;
  } else {
    if (empty) empty.style.display = 'none';
  }

  // build groups
  const groups = new Map();
  for (const it of withScore){
    const k = groupKey(it);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }
  const keys = Array.from(groups.keys()).sort((a,b) => {
    if (isRewards) return b - a;     // high % first
    if (isAnnual)  return a - b;     // low fee first
    return b - a;                     // overall high first
  });

  const label = isOverall ? 'Score' : isRewards ? 'Rewards' : 'Annual Fee';

  // Render
  keys.forEach((k, groupIdx) => {
    const divider = document.createElement('div');
    divider.className = 'group-divider';
    divider.innerHTML = `
      <div class="gd-n">${groupIdx + 1}</div>
      <div class="gd-title">Crypto Card Rank <span class="rule"></span></div>
      <div class="gd-ds">${label}</div>
      <div></div>
    `;
    divider.style.pointerEvents = 'none';
    grid.appendChild(divider);

    groups.get(k).forEach((it, idx) => {
      const { row: r } = it;
      const imgUrl = getImage(r);

      // segments: keep Rewards + Annual Fee (scores 0..5) + auto ones
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

      // Col 3: score / metric value display
      const scoreCell = document.createElement('div');
      scoreCell.className = 'row-score';
      if (isRewards){
        scoreCell.textContent = fmtPct(it.rewards || 0);          // e.g., 4.4%
      } else if (isAnnual){
        scoreCell.textContent = fmtMoneyPerYear(it.fee || 0);     // e.g., $95/yr
      } else {
        scoreCell.textContent = (it.display ?? it.total ?? 0)
          .toFixed(1).replace(/\.0$/, '');                        // overall score
      }
      inner.appendChild(scoreCell);

      // Col 4: breakdown bar (unchanged)
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
          seg.dataset.key = s.key;           // allows CSS targeting if desired
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
          if (v === undefined || isBlankish(v)) return;
          items.push(
            `<div class="kv-row"><div class="kv-key">${h}</div><div class="kv-val">${
              isUrlLike(v) ? `<a href="${v}" target="_blank" rel="noopener">${v}</a>` : formatValue(v)
            }</div></div>`
          );
        });

        if (items.length){
          details.innerHTML = `<div class="kv">${items.join('')}</div>`;
          const detailsId = `row-details-${groupIdx}-${idx}`;
          details.id = detailsId;
          rowEl.setAttribute('aria-controls', detailsId);
          rowEl.appendChild(details);
        }
      }

      // Click/keyboard handlers
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

  // meta text stays generic
  const metaEl = document.getElementById('meta');
  if (metaEl) metaEl.textContent =
    `${withScore.length} card${withScore.length!==1?'s':''} shown • Sort: ${mode}`;
}

export function buildControlsOptions(){
  const issuerEl = document.getElementById('issuer');
  const networkEl = document.getElementById('network');
  const countryEl = document.getElementById('country');

  setOptions(issuerEl, uniqueSorted(state.rows.map(r=>r.issuer)), 'All issuers');
  setOptions(networkEl, uniqueSorted(state.rows.map(r=>r.network)), 'All networks');
  setOptions(countryEl, uniqueSorted(state.rows.map(r=>r.country)), 'All countries');

  const sortEl = document.getElementById('sort'); sortEl.innerHTML = '';
  ['Overall (sum of scores)','Rewards','Annual Fee'].forEach(o=>{
    const opt = document.createElement('option'); opt.value=o; opt.textContent=o; sortEl.appendChild(opt);
  });

  if (!state.filters) state.filters = {};
  if (!state.filters.sort) state.filters.sort = 'Overall (sum of scores)';
  sortEl.value = state.filters.sort;
}

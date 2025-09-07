// src/ui.js
import {
  formatValue, uniqueSorted,
  isUrlLike, isBlankish, findHeader,
  normalizeImageUrl, PLACEHOLDER_IMG
} from './utils.js';
import { state } from './store.js';
import { IMAGE_FIELDS } from './config.js';
import { prepareAnchors, scoreRow } from './score.js';

/* ----------------- small helpers ----------------- */
export function setStatus(msg, kind = 'ok'){
  const el = document.getElementById('status');
  if (el){ el.textContent = msg; el.className = `status ${kind}`; }
}
export function setDiag(txt){
  const el = document.getElementById('diag');
  if (el) el.textContent = txt || '';
}
export function setOptions(el, options, firstLabel){
  if (!el) return;
  el.innerHTML = '';
  const first = document.createElement('option');
  first.value = ''; first.textContent = firstLabel; el.appendChild(first);
  for (const o of options){
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = o; el.appendChild(opt);
  }
}
export function renderSkeleton(n = 6){
  const grid = document.getElementById('grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i=0;i<n;i++){
    const s = document.createElement('div');
    s.className = 'skeleton';
    grid.appendChild(s);
  }
}

/* ---- sheet header helpers ---- */
function headerFor(aliases){ return findHeader(state.headers || [], aliases) || null; }
function valueAt(row, header){ return header ? row._raw[header] : undefined; }

function getImage(row){
  const h = headerFor(IMAGE_FIELDS);
  const raw = valueAt(row, h);
  const norm = normalizeImageUrl(raw);
  return isUrlLike(norm) ? norm : null;
}

function formatCurrency(n){
  if (!Number.isFinite(n)) return '';
  const fixed = Math.round(n) === n ? n.toString() : n.toFixed(2);
  return '$' + fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* =========================================================
   TABLE RENDER
   ========================================================= */
export function render(){
  const grid  = document.getElementById('grid');
  const empty = document.getElementById('empty');
  if (!grid) return;

  try{
    let rows = Array.isArray(state.rows) ? [...state.rows] : [];
    const headers = Array.isArray(state.headers) ? state.headers : [];

    // ---- filters (search + chips + legacy) ----
    const q = (state.filters?.search || '').trim().toLowerCase();
    if (q){
      rows = rows.filter(r =>
        Object.values(r).some(v => (v||'').toString().toLowerCase().includes(q))
      );
    }

    const chips = Array.isArray(state.filters?.chips) ? state.filters.chips : [];
    if (chips.length){
      rows = rows.filter(r=>{
        const hay = Object.values(r).join('|').toLowerCase();
        return chips.every(tag => hay.includes(String(tag).toLowerCase()));
      });
    }

    if (state.filters?.issuer){
      rows = rows.filter(r => (r.issuer||'') === state.filters.issuer);
    }
    if (state.filters?.network){
      rows = rows.filter(r => (r.network||'') === state.filters.network);
    }
    if (state.filters?.country){
      rows = rows.filter(r => (r.country||'') === state.filters.country);
    }

    if (!rows.length){
      grid.innerHTML = '';
      if (empty) empty.style.display = 'block';
      setDiag('No rows to show (check filters or sheet).');
      return;
    } else {
      if (empty) empty.style.display = 'none';
      setDiag('');
    }

    // ---- anchors + scoring for every row ----
    const anchors = prepareAnchors(state.rows || [], headers);
    const items   = rows.map(r => ({ row: r, ...scoreRow(r, headers, anchors) }));

    // ---- sorting chosen in the pill ----
    const sortBy = state.filters?.sort || 'Overall (sum of scores)';
    items.sort((a,b) => {
      if (sortBy.startsWith('Overall'))  return (b.total - a.total) || (a.row.card||'').localeCompare(b.row.card||'');
      if (sortBy === 'Rewards')          return (b.rewards - a.rewards) || (b.rewardScore - a.rewardScore);
      if (sortBy === 'Annual Fee')       return (b.feeScore - a.feeScore) || (a.fee - b.fee);
      return (b.total - a.total);
    });

    // ---- define columns (image + name + metric + rest of CSV) ----
    const imageHeader = headerFor(IMAGE_FIELDS);

    // hide duplicates + unwanted cols
    const EXCLUDE = new Set([
      'Card','Card Name','Name','Product','Card_name',
      'id','name','logoUrl',
      imageHeader
    ]);

    const columns = [
      {
        key: '__img__', label: '', class: 'cimg',
        render: it => {
          const src = getImage(it.row) || PLACEHOLDER_IMG;
          return `<img src="${src}" alt="${formatValue(it.row.card)}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">`;
        }
      },
      { key: '__card__', label: 'Card', class: 'card', render: it => formatValue(it.row.card) }
    ];

    if (sortBy.startsWith('Overall')){
      columns.push({
        key: '__score__', label: 'Score', class: 'num',
        render: it => {
          const v = Number.isFinite(it.display) ? it.display : it.total;
          return Number.isFinite(v) ? (''+Number(v).toFixed(1)).replace(/\.0$/, '') : '—';
        }
      });
    } else if (sortBy === 'Rewards'){
      columns.push({
        key: '__rewards__', label: 'Rewards', class: 'num',
        render: it => Number.isFinite(it.rewards) ? `${Number(it.rewards).toFixed(1).replace(/\.0$/, '')}%` : '—'
      });
    } else if (sortBy === 'Annual Fee'){
      columns.push({
        key: '__fee__', label: 'Annual Fee', class: 'num',
        render: it => Number.isFinite(it.fee) ? `${formatCurrency(it.fee)}/yr` : '—'
      });
    }

    // Append remaining CSV columns (except excluded)
    headers.forEach(h => {
      if (!h || EXCLUDE.has(h)) return;
      columns.push({
        key: `raw:${h}`, label: h,
        render: it => {
          const v = it.row._raw[h];
          if (v === undefined || isBlankish(v)) return '';
          return isUrlLike(v) ? `<a href="${v}" target="_blank" rel="noopener">${v}</a>` : formatValue(v);
        }
      });
    });

    // ---- build DOM table ----
    const wrap  = document.createElement('div'); wrap.className = 'table-wrap';
    const table = document.createElement('table'); table.className = 'rank-table datagrid';

    // head
    const thead = document.createElement('thead');
    const trh   = document.createElement('tr');
    columns.forEach(c => {
      const th = document.createElement('th');
      th.textContent = c.label || '';
      if (c.class) th.classList.add(c.class);
      trh.appendChild(th);
    });
    thead.appendChild(trh);

    // body
    const tbody = document.createElement('tbody');
    items.forEach(it => {
      const tr = document.createElement('tr');
      columns.forEach(c => {
        const td = document.createElement('td');
        if (c.class) td.classList.add(c.class);
        td.innerHTML = c.render(it);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    wrap.appendChild(table);

    grid.innerHTML = '';
    grid.appendChild(wrap);

  } catch (err){
    console.error('[ui.render] error:', err);
    setDiag('Render error: ' + (err?.message || String(err)));
    if (grid) grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
  }
}

/* =========================================================
   Controls: build sort options (and keep legacy selects happy)
   ========================================================= */
export function buildControlsOptions(){
  // legacy selects (hidden in your HTML/CSS but keep them populated)
  const issuerEl  = document.getElementById('issuer');
  const networkEl = document.getElementById('network');
  const countryEl = document.getElementById('country');

  if (issuerEl)  setOptions(issuerEl,  uniqueSorted((state.rows||[]).map(r=>r.issuer)),  'All issuers');
  if (networkEl) setOptions(networkEl, uniqueSorted((state.rows||[]).map(r=>r.network)), 'All networks');
  if (countryEl) setOptions(countryEl, uniqueSorted((state.rows||[]).map(r=>r.country)), 'All countries');

  // Sort pill options
  const sortEl = document.getElementById('sort');
  if (!sortEl) return;

  const choices = [
    'Overall (sum of scores)',
    'Rewards',
    'Annual Fee'
  ];
  sortEl.innerHTML = '';
  choices.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = o;
    sortEl.appendChild(opt);
  });

  if (!state.filters) state.filters = {};
  if (!state.filters.sort) state.filters.sort = choices[0];
  sortEl.value = state.filters.sort;
}

/* =========================================================
   Search chips — BETWEEN search & sort
   ========================================================= */
let chipListEl = null;

function renderChips(){
  if (!chipListEl) return;
  const chips = Array.isArray(state.filters?.chips) ? state.filters.chips : [];
  chipListEl.innerHTML = chips.map((txt, i)=>(
    `<span class="chip"><span class="chip__text">${formatValue(txt)}</span><button class="chip__x" type="button" data-index="${i}" aria-label="Remove chip">×</button></span>`
  )).join('');
}

function addChip(text){
  const t = String(text || '').trim();
  if (!t) return;
  if (!state.filters) state.filters = {};
  if (!Array.isArray(state.filters.chips)) state.filters.chips = [];
  const exists = state.filters.chips.some(x => String(x).toLowerCase() === t.toLowerCase());
  if (!exists) state.filters.chips.push(t);
  renderChips();
  render();
}

function removeChipAt(index){
  if (!Array.isArray(state.filters?.chips)) return;
  state.filters.chips.splice(index, 1);
  renderChips();
  render();
}

export function initSearchChips(){
  const filters = document.querySelector('.filters');
  const searchCtl = document.querySelector('.control-search');
  const input   = document.getElementById('search');
  if (!filters || !searchCtl || !input) return;

  if (!state.filters) state.filters = {};
  if (!Array.isArray(state.filters.chips)) state.filters.chips = [];

  // remove any legacy inline chip list
  const oldInline = searchCtl.querySelector('#chipList');
  if (oldInline) oldInline.remove();

  // create chips row immediately after the search control
  let row = document.getElementById('chipRow');
  if (!row){
    row = document.createElement('div');
    row.id = 'chipRow';
    row.className = 'chips-row';                  // <-- match CSS
    if (searchCtl.nextSibling) {
      filters.insertBefore(row, searchCtl.nextSibling);
    } else {
      filters.appendChild(row);
    }
  }
  chipListEl = row;

  // Enter -> chip
  const addFromInput = () => {
    const raw = input.value.trim();
    if (!raw) return;
    addChip(raw);
    input.value = '';
  };
  input.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter'){
      e.preventDefault();
      addFromInput();
    }
  });

  // remove chip (event delegation)
  chipListEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip__x');     // <-- match CSS
    if (!btn) return;
    const idx = Number(btn.dataset.index);
    if (!Number.isNaN(idx)) removeChipAt(idx);
  });

  renderChips();
}

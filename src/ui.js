// src/ui.js
import { parseNumberLike, formatValue, uniqueSorted } from './utils.js';
import { state } from './store.js';

export function setStatus(msg, kind='ok'){
  const el = document.getElementById('status');
  el.textContent = msg; el.className = `status ${kind}`;
}
export function setDiag(txt){
  document.getElementById('diag').textContent = txt || '';
}
export function setOptions(el, options, firstLabel){
  el.innerHTML = ''; const first = document.createElement('option');
  first.value = ''; first.textContent = firstLabel; el.appendChild(first);
  for(const o of options){
    const opt = document.createElement('option'); opt.value = o; opt.textContent = o; el.appendChild(opt);
  }
}
export function renderSkeleton(n=8){
  const grid = document.getElementById('grid'); grid.innerHTML='';
  for(let i=0;i<n;i++){ const s = document.createElement('div'); s.className='skeleton'; grid.appendChild(s);}
}
export function render(){
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const { search, issuer, network, country } = state.filters;

  let rows = [...state.rows];
  const q = (search||'').trim().toLowerCase();
  if(q){ rows = rows.filter(r => Object.values(r).some(v => (v||'').toString().toLowerCase().includes(q))); }
  if(issuer){ rows = rows.filter(r => (r.issuer||'') === issuer); }
  if(network){ rows = rows.filter(r => (r.network||'') === network); }
  if(country){ rows = rows.filter(r => (r.country||'') === country); }

  const sort = state.sort;
  const numericSort = (getter, dir='desc') => rows.sort((a,b) => {
    const va = parseNumberLike(getter(a)); const vb = parseNumberLike(getter(b));
    if(isNaN(va) && isNaN(vb)) return 0; if(isNaN(va)) return 1; if(isNaN(vb)) return -1; return dir==='asc' ? va - vb : vb - va;
  });
  if(sort === 'Card (A–Z)') rows.sort((a,b) => (a.card||'').localeCompare(b.card||''));
  else if(sort === 'Rewards (high→low)') numericSort(r=>r.rewards,'desc');
  else if(sort === 'Annual Fee (low→high)') numericSort(r=>r.annualFee,'asc');
  else if(sort === 'FX Fee (low→high)') numericSort(r=>r.fxFee,'asc');

  grid.innerHTML = '';
  if(rows.length === 0){ empty.style.display='block'; document.getElementById('meta').textContent = `0 cards shown`; return; } else { empty.style.display='none'; }

  for(const r of rows){
    const card = document.createElement('article'); card.className = 'card';
    card.innerHTML = `
      <div class="card-head">
        <div class="badge">${formatValue(r.network || r.issuer || 'CARD')}</div>
        <div class="title">${formatValue(r.card)}</div>
      </div>
      <div class="kv">
        ${r.issuer?`<div class="kv-row"><div class="kv-key">Issuer</div><div class="kv-val">${formatValue(r.issuer)}</div></div>`:''}
        ${r.country?`<div class="kv-row"><div class="kv-key">Country</div><div class="kv-val">${formatValue(r.country)}</div></div>`:''}
        ${r.rewards?`<div class="kv-row"><div class="kv-key">Rewards</div><div class="kv-val">${formatValue(r.rewards)}</div></div>`:''}
        ${r.annualFee?`<div class="kv-row"><div class="kv-key">Annual Fee</div><div class="kv-val">${formatValue(r.annualFee)}</div></div>`:''}
        ${r.fxFee?`<div class="kv-row"><div class="kv-key">FX Fee</div><div class="kv-val">${formatValue(r.fxFee)}</div></div>`:''}
        ${r.stake?`<div class="kv-row"><div class="kv-key">Stake Required</div><div class="kv-val">${formatValue(r.stake)}</div></div>`:''}
        ${r.limits?`<div class="kv-row"><div class="kv-key">Limits</div><div class="kv-val">${formatValue(r.limits)}</div></div>`:''}
      </div>
      <div class="card-actions">
        ${r.link ? `<a class="link" href="${r.link}" target="_blank" rel="noopener">Learn more ↗</a>` : `<div class="link" style="opacity:.6;">No link</div>`}
      </div>`;
    grid.appendChild(card);
  }
  document.getElementById('meta').textContent = `${rows.length} card${rows.length!==1?'s':''} shown • Source synced`;
}

export function buildControlsOptions(){
  const issuerEl = document.getElementById('issuer');
  const networkEl = document.getElementById('network');
  const countryEl = document.getElementById('country');
  setOptions(issuerEl, uniqueSorted(state.rows.map(r=>r.issuer)), 'All issuers');
  setOptions(networkEl, uniqueSorted(state.rows.map(r=>r.network)), 'All networks');
  setOptions(countryEl, uniqueSorted(state.rows.map(r=>r.country)), 'All countries');
  const sortEl = document.getElementById('sort'); sortEl.innerHTML = '';
  ['Card (A–Z)','Rewards (high→low)','Annual Fee (low→high)','FX Fee (low→high)'].forEach(o=>{
    const opt = document.createElement('option'); opt.value=o; opt.textContent=o; sortEl.appendChild(opt);
  });
}

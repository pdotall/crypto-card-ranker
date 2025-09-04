// src/app.js
import { loadCsvText } from './net.js';
import { ingestCsvResults } from './parse.js';
import { state } from './store.js';
import { renderSkeleton, render, buildControlsOptions } from './ui.js';

async function load(){
  // show skeleton and hide any previous error
  renderSkeleton();
  const errEl = document.getElementById('error');
  if (errEl) errEl.style.display = 'none';

  try{
    const csvText = await loadCsvText();
    const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    if (results.errors && results.errors.length){
      console.warn('CSV parse warnings', results.errors);
    }

    ingestCsvResults(results);
    buildControlsOptions();   // fills the Sort pill with: Overall / Rewards / Annual Fee
    render();                 // initial render
  }catch(err){
    console.error(err);
    const e = document.getElementById('error');
    if (e){
      e.style.display = 'block';
      e.textContent = `Couldn't load the sheet. ${err?.message || err}`;
    }
  }
}

function onInput(id, handler){
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', handler);
}
function onChange(id, handler){
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', handler);
}

function wireControls(){
  // Search box
  onInput('search', (e) => {
    state.filters.search = e.target.value;
    render();
  });

  // Sort pill (dropdown)
  onChange('sort', (e) => {
    state.filters.sort = e.target.value;  // keep in filters
    render();
  });

  // These may not exist anymore, but keep robust no-ops in case:
  onChange('issuer',  (e) => { state.filters.issuer  = e.target.value; render(); });
  onChange('network', (e) => { state.filters.network = e.target.value; render(); });
  onChange('country', (e) => { state.filters.country = e.target.value; render(); });
}

// Boot
wireControls();
load();

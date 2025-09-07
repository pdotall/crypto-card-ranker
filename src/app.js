// src/app.js
import { loadCsvText } from './net.js';
import { ingestCsvResults } from './parse.js';
import { state } from './store.js';
import { setStatus, renderSkeleton, render, buildControlsOptions, initSearchChips } from './ui.js';
import { runTests } from './tests.js';

async function load(){
  renderSkeleton(); document.getElementById('error').style.display='none'; setStatus('Loading…','ok');
  try{
    const csvText = await loadCsvText();
    const results = Papa.parse(csvText, { header:true, skipEmptyLines:true });
    if(results.errors && results.errors.length){ console.warn('CSV parse warnings', results.errors); }
    ingestCsvResults(results);
    buildControlsOptions();
    initSearchChips();           // <-- add this
    setStatus('');               // hide any load banner if you keep #status
    render();
  }catch(err){
    console.error(err);
    document.getElementById('error').style.display='block';
    setStatus(`Load failed: ${err.message||err}`,'bad');
  }
}

function wireControls(){
  // Chips handle Enter-to-add and removal; we do NOT live-filter on every keystroke now.
  const searchEl = document.getElementById('search');
  if (searchEl){
    searchEl.addEventListener('input', (e)=>{ /* optional: live typing, no filter yet */ });
  }

  // Hidden legacy controls (safe guards)
  const issuerEl  = document.getElementById('issuer');
  const networkEl = document.getElementById('network');
  const countryEl = document.getElementById('country');
  issuerEl  && issuerEl.addEventListener('change',  e=>{ state.filters.issuer  = e.target.value; render(); });
  networkEl && networkEl.addEventListener('change', e=>{ state.filters.network = e.target.value; render(); });
  countryEl && countryEl.addEventListener('change', e=>{ state.filters.country = e.target.value; render(); });

  // Sort pill
  const sortEl = document.getElementById('sort');
  sortEl && sortEl.addEventListener('change', (e)=>{ 
    if (!state.filters) state.filters = {};
    state.filters.sort = e.target.value; 
    render(); 
  });

  // Optional (hidden) buttons
  const reloadBtn = document.getElementById('reload');
  reloadBtn && reloadBtn.addEventListener('click', () => load());
  const testBtn = document.getElementById('runTests');
  testBtn && testBtn.addEventListener('click', runTests);
}

wireControls();
load();

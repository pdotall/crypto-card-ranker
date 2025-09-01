// src/app.js
import { loadCsvText } from './net.js';
import { ingestCsvResults } from './parse.js';
import { state } from './store.js';
import { setStatus, renderSkeleton, render, buildControlsOptions } from './ui.js';
import { runTests } from './tests.js';

async function load(){
  renderSkeleton(); document.getElementById('error').style.display='none'; setStatus('Loading…','ok');
  try{
    const csvText = await loadCsvText();
    const results = Papa.parse(csvText, { header:true, skipEmptyLines:true });
    if(results.errors && results.errors.length){ console.warn('CSV parse warnings', results.errors); }
    ingestCsvResults(results);
    buildControlsOptions();
    setStatus('Loaded successfully.');
    render();
  }catch(err){ console.error(err); document.getElementById('error').style.display='block'; setStatus(`Load failed: ${err.message||err}`,'bad'); }
}

function wireControls(){
  document.getElementById('search').addEventListener('input', (e)=>{ state.filters.search = e.target.value; render(); });
  document.getElementById('issuer').addEventListener('change', (e)=>{ state.filters.issuer = e.target.value; render(); });
  document.getElementById('network').addEventListener('change', (e)=>{ state.filters.network = e.target.value; render(); });
  document.getElementById('country').addEventListener('change', (e)=>{ state.filters.country = e.target.value; render(); });
  document.getElementById('sort').addEventListener('change', (e)=>{ state.sort = e.target.value; render(); });
  document.getElementById('reload').addEventListener('click', () => load());
  document.getElementById('runTests').addEventListener('click', runTests);
}

wireControls();
load();

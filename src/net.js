// src/net.js
import { SHEET_PUBHTML_URL, SAMPLE_CSV } from './config.js';
import { toCsvUrl, toGvizCsvUrl, sanitizeTextCsv } from './utils.js';
import { setStatus, setDiag } from './ui.js';

export async function fetchText(url, {timeoutMs=10000}={}){
  const ctrl = new AbortController();
  const id = setTimeout(()=>ctrl.abort(), timeoutMs);
  try{
    const res = await fetch(url, {signal: ctrl.signal, redirect: 'follow'});
    if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const text = await res.text(); return sanitizeTextCsv(text);
  } finally { clearTimeout(id); }
}
export async function loadCsvText(){
  const primary = toCsvUrl(SHEET_PUBHTML_URL);
  const alt = toGvizCsvUrl(SHEET_PUBHTML_URL);
  document.getElementById('sheetLink').href = SHEET_PUBHTML_URL;
  const diag = [];
  try{ diag.push(`Trying primary: ${primary}`); const t = await fetchText(primary); setDiag(diag.join('\n')); return t; }
  catch(e1){
    diag.push(`Primary failed: ${e1 && e1.message ? e1.message : e1}`);
    try{ diag.push(`Trying alt (gviz csv): ${alt}`); const t2 = await fetchText(alt); setDiag(diag.join('\n')); return t2; }
    catch(e2){
      diag.push(`Alt failed: ${e2 && e2.message ? e2.message : e2}`);
      diag.push('Falling back to embedded SAMPLE_CSV');
      setStatus('Google Sheet unreachable — showing demo data. Check Publish-to-web and CORS.', 'warn');
      setDiag(diag.join('\n'));
      return SAMPLE_CSV;
    }
  }
}

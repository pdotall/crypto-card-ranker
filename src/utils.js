// src/utils.js
import { ALIASES } from './config.js';

export function toCsvUrl(pubHtmlUrl){
  try{
    const u = new URL(pubHtmlUrl);
    u.pathname = u.pathname.replace('/pubhtml','/pub');
    if(!u.searchParams.has('output')) u.searchParams.set('output','csv');
    if(!u.searchParams.has('single')) u.searchParams.set('single','true');
    u.searchParams.set('_ts', Date.now().toString());
    return u.toString();
  }catch(e){ return pubHtmlUrl; }
}
export function toGvizCsvUrl(pubHtmlUrl){
  try{
    const u = new URL(pubHtmlUrl);
    u.pathname = u.pathname.replace('/pubhtml','/gviz/tq');
    u.searchParams.set('tqx','out:csv');
    u.searchParams.set('_ts', Date.now().toString());
    return u.toString();
  }catch(e){ return pubHtmlUrl; }
}
export function bomless(text){ return text.replace(/^\uFEFF/, ''); }
export function sanitizeTextCsv(t){ return bomless((t||'').trim()); }

export function findHeader(headers, aliases){
  for(const a of aliases){
    const h = headers.find(x => String(x).trim().toLowerCase() === a.trim().toLowerCase());
    if(h) return h;
  }
  return null;
}
export function buildHeaderMap(headers){
  const map = {}; for(const key in ALIASES){ map[key] = findHeader(headers, ALIASES[key]); } return map;
}

export function parseNumberLike(s){
  if(s == null) return NaN; const t = String(s).trim();
  if(!t || /n\/?a|not\s*available|—|^-$/.test(t.toLowerCase())) return NaN;
  if(/free/i.test(t)) return 0;
  const m = t.replace(/\$/g,'').replace(/,|\s/g,'').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}
export function formatValue(v){ return (v ?? '').toString(); }
export function uniqueSorted(values){
  return Array.from(new Set(values.filter(Boolean).map(v => v.toString().trim()))).sort((a,b) => a.localeCompare(b));
}

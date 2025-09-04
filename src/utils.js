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
  const map = {};
  for(const key in ALIASES){ map[key] = findHeader(headers, ALIASES[key]); }
  return map;
}

export function parseNumberLike(s){
  if(s == null) return NaN;
  const t = String(s).trim();
  if(!t || /n\/?a|not\s*available|—|^-$/.test(t.toLowerCase())) return NaN;
  if(/free/i.test(t)) return 0;
  const m = t.replace(/\$/g,'').replace(/,|\s/g,'').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}
export function formatValue(v){ return (v ?? '').toString(); }
export function uniqueSorted(values){
  return Array.from(new Set(values.filter(Boolean).map(v => v.toString().trim()))).sort((a,b) => a.localeCompare(b));
}

// NEW: helpers for dynamic card rendering
export function prettyLabel(h){
  const spaced = String(h)
    .replace(/[_-]+/g,' ')
    .replace(/([a-z])([A-Z])/g,'$1 $2');
  return spaced.trim().replace(/\s+/g,' ').replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1));
}
export function isUrlLike(v){
  try{
    const u = new URL(String(v));
    return u.protocol === 'http:' || u.protocol === 'https:';
  }catch{ return false; }
}
export function isBlankish(v){
  if(v == null) return true;
  const t = String(v).trim();
  return !t || /^n\/?a$/i.test(t) || /^-$/.test(t) || /^—$/.test(t);
}
// Turn common share links into direct image URLs when possible
export function normalizeImageUrl(u){
  if(!u) return null;
  const s = String(u).trim();
  try{
    const url = new URL(s);

    // Google Drive: https://drive.google.com/file/d/ID/view?...  or ...open?id=ID
    if (url.hostname.includes('drive.google.com')) {
      const m = url.pathname.match(/\/file\/d\/([^/]+)/);
      const id = m ? m[1] : (url.searchParams.get('id') || null);
      if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
    }

    // Dropbox:  ?dl=0  →  ?raw=1  (direct file)
    if (url.hostname.includes('dropbox.com')) {
      url.searchParams.delete('dl');
      url.searchParams.set('raw','1');
      return url.toString();
    }

    return s; // default: unchanged
  } catch {
    return s;
  }
}

// Small fallback thumbnail if the image can't be loaded
export const PLACEHOLDER_IMG =
  'https://dummyimage.com/64x44/1b2550/ffffff.png&text=%E2%88%8E';

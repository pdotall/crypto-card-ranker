// src/parse.js
import { buildHeaderMap } from './utils.js';
import { state } from './store.js';

export function normalizeRows(raw, map){
  return raw.map(r => ({
    _raw: r,
    card: map.card ? r[map.card] : (r['Card'] || r['Name'] || ''),
    issuer: map.issuer ? r[map.issuer] : '',
    network: map.network ? r[map.network] : '',
    country: map.country ? r[map.country] : '',
    rewards: map.rewards ? r[map.rewards] : '',
    annualFee: map.annualFee ? r[map.annualFee] : '',
    fxFee: map.fxFee ? r[map.fxFee] : '',
    stake: map.stake ? r[map.stake] : '',
    limits: map.limits ? r[map.limits] : '',
    link: map.link ? r[map.link] : ''
  }));
}

export function ingestCsvResults(results){
  const rows = results.data;
  const headers = results.meta.fields || Object.keys(rows[0]||{});
  const map = buildHeaderMap(headers);
  state.raw = rows; state.headers = headers; state.map = map; state.rows = normalizeRows(rows, map);
}

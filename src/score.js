// src/score.js
import {
  parseNumberLike, prettyLabel, findHeader
} from './utils.js';
import {
  DS_FIELDS, SEGMENT_KEYS, SEGMENT_DETECT, SEGMENT_MAX, BAR_COLORS
} from './config.js';

/* ----------------------------
   Header helpers / lookups
-----------------------------*/
function headerFor(headers, aliases){
  return findHeader(headers, aliases) || null;
}

// DS from CSV (defaults to 0 if missing)
function getBaseDS(row, headers){
  const h = headerFor(headers, DS_FIELDS);
  const raw = h ? row._raw[h] : undefined;
  const n = parseNumberLike(raw);
  return Number.isNaN(n) ? 0 : n;
}

/* ----------------------------
   Annual Fee (inverse 0..5)
-----------------------------*/
export const FEE_ALIASES = [
  'Annual Fee USD','Annual Fee ($)','Annual_Fee_USD','Annual Fee','annual_fee_usd'
];
function getAnnualFee(row, headers){
  const h = headerFor(headers, FEE_ALIASES);
  const raw = h ? row._raw[h] : undefined;
  const n = parseNumberLike(raw);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}
export function computeAnnualFeeScore(fee, maxFee){
  if (fee <= 0) return 5;
  if (!maxFee || maxFee <= 0) return 5; // all zero/missing → 5 for all
  const s = 5 * (1 - (fee / maxFee));
  return Math.max(0, Math.min(5, s));
}

/* ----------------------------
   Rewards max pct (direct 0..5)
-----------------------------*/
export const REWARD_ALIASES = [
  'Rewards max pct','Rewards Max %','Rewards Max Pct','Max Rewards %',
  'Rewards Max','Max % Rewards','Rewards (max %)','Rewards % Max','Rewards Pct Max',
  'Max Cashback %','Cashback Max %'
];

let REWARDS_HEADER_CACHE = null;
function findRewardsHeader(headers){
  if (REWARDS_HEADER_CACHE !== null) return REWARDS_HEADER_CACHE;

  // try loose/exact aliases first
  const exact = headerFor(headers, REWARD_ALIASES);
  if (exact){
    REWARDS_HEADER_CACHE = exact;
    return REWARDS_HEADER_CACHE;
  }

  // fallback fuzzy
  let best = null, bestScore = -Infinity;
  const scoreName = (name) => {
    const s = (name || '').toLowerCase();
    let sc = 0;
    if (/\breward|cashback\b/.test(s)) sc += 5; else return -999;
    if (/max|maximum|up\s*to|top/.test(s)) sc += 2;
    if (/%|\bpct\b|percent|percentage/.test(s)) sc += 2;
    if (/\bapr\b/.test(s)) sc -= 6;
    if (/annual|fee/.test(s)) sc -= 3;
    return sc;
  };
  headers.forEach(h => {
    const sc = scoreName(h);
    if (sc > bestScore){ bestScore = sc; best = h; }
  });
  REWARDS_HEADER_CACHE = bestScore > 0 ? best : null;
  return REWARDS_HEADER_CACHE;
}

function getRewardsPct(row, headers){
  const h = findRewardsHeader(headers);
  if (!h) return 0;
  const raw = row._raw[h];
  const n = parseNumberLike(raw); // handles "5%", "Up to 3.5 %", etc.
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}
export function computeRewardsScore(val, minVal, maxVal){
  if (maxVal <= minVal){
    return maxVal <= 0 ? 0 : 5;
  }
  const s = 5 * ((val - minVal) / (maxVal - minVal));
  return Math.max(0, Math.min(5, s));
}

/* ----------------------------
   Anchors (dataset-wide)
-----------------------------*/
export function prepareAnchors(allRows, headers){
  const maxAnnualFee = allRows.reduce((m, r) => Math.max(m, getAnnualFee(r, headers)), 0);

  let minRewards = Infinity, maxRewards = -Infinity;
  allRows.forEach(r => {
    const v = getRewardsPct(r, headers);
    if (v < minRewards) minRewards = v;
    if (v > maxRewards) maxRewards = v;
  });
  if (!Number.isFinite(minRewards)) minRewards = 0;
  if (!Number.isFinite(maxRewards)) maxRewards = 0;

  return {
    maxAnnualFee,
    minRewards,
    maxRewards,
    rewardsHeader: findRewardsHeader(headers)
  };
}

/* ----------------------------
   Per-row scoring
-----------------------------*/
export function scoreRow(row, headers, anchors){
  const base     = getBaseDS(row, headers);
  const fee      = getAnnualFee(row, headers);
  const feeScore = computeAnnualFeeScore(fee, anchors.maxAnnualFee);
  const rewards  = getRewardsPct(row, headers);
  const rewardScore = computeRewardsScore(rewards, anchors.minRewards, anchors.maxRewards);

  const total   = base + feeScore + rewardScore;
  const display = Number(total.toFixed(1));

  return { base, fee, feeScore, rewards, rewardScore, total, display };
}

/* ----------------------------
   Breakdown segments
-----------------------------*/
export function buildSegments(row, headers, anchors){
  const segs = [];

  // 1) Logic segments (prominent first)
  const { feeScore, rewardScore } = scoreRow(row, headers, anchors);
  segs.push(
    { key: '__rewards_score__', label: 'Rewards', value: Number(rewardScore.toFixed(1)) },
    { key: '__annual_fee_score__', label: 'Annual Fee', value: Number(feeScore.toFixed(1)) }
  );

  // 2) Auto-detected score-like columns from CSV (exclude DS columns)
  let autoHeaders = SEGMENT_KEYS.length
    ? SEGMENT_KEYS.filter(k => headers.includes(k))
    : headers.filter(h => SEGMENT_DETECT.test(h) && h !== headerFor(headers, DS_FIELDS));

  for (const h of autoHeaders){
    const v = row._raw[h];
    const n = parseNumberLike(v);
    if (!Number.isNaN(n) && n > 0){
      segs.push({ key: h, label: prettyLabel(h.replace(/^score[:\s-]*/i,'')), value: n });
      if (segs.length >= SEGMENT_MAX) break;
    }
  }

  return segs;
}

export function segColor(i){ return BAR_COLORS[i % BAR_COLORS.length]; }

// src/tests.js
import {
  toCsvUrl, toGvizCsvUrl, parseNumberLike, buildHeaderMap,
  prettyLabel, isUrlLike
} from './utils.js';
import { normalizeRows } from './parse.js';
import { setStatus, setDiag } from './ui.js';

export function assert(cond, msg){ if(!cond) throw new Error('Test failed: '+msg); }

export function runTests(){
  const out=[];
  try{
    // URL builders
    const u1 = toCsvUrl('https://docs.google.com/spreadsheets/d/e/abc/pubhtml?gid=0&single=true');
    assert(u1.includes('/pub'), 'toCsvUrl should switch to /pub');
    assert(u1.includes('output=csv'), 'toCsvUrl adds output=csv');

    const u2 = toGvizCsvUrl('https://docs.google.com/spreadsheets/d/e/abc/pubhtml?gid=0&single=true');
    assert(u2.includes('/gviz/tq'), 'toGvizCsvUrl path');
    assert(u2.includes('tqx=out:csv'), 'toGviz tqx');

    // Numbers
    assert(parseNumberLike('$1,234.56')===1234.56, 'parse currency');
    assert(parseNumberLike('Free')===0, 'parse Free as 0');
    assert(Number.isNaN(parseNumberLike('—')), 'dash is NaN');

    // Header mapping + normalization
    const headers=['Card','Issuer','FX Fee'];
    const map = buildHeaderMap(headers);
    assert(map.card==='Card' && map.issuer==='Issuer' && map.fxFee==='FX Fee','header mapping');

    const rows = normalizeRows([{Card:'X',Issuer:'Y','FX Fee':'0%'}], map);
    assert(rows[0].card==='X' && rows[0].issuer==='Y' && rows[0].fxFee==='0%','normalize rows');

    // NEW: label + URL helpers
    assert(prettyLabel('annual_feeUSD')==='Annual Feeusd','prettyLabel formats title');
    assert(isUrlLike('https://example.com') && !isUrlLike('not a url'),'isUrlLike basic');

    out.push('All tests passed.');
    setStatus('Self-tests passed.','ok');
  }catch(e){
    out.push(String(e));
    setStatus('Some tests failed — see Diagnostics.','warn');
  }
  setDiag(out.join('\n'));
}

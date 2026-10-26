/* ============================================================================
   Procreate brush settings decoder
   Reads Brush.archive values through the parameter schema (adapted from
   aumlette-lab/procreate-brush-decoder v1.7, MIT) and turns them into the
   labels, units and groupings Procreate's Brush Studio shows.
   ========================================================================== */

/* Brush Studio order. "Preview" settings live under Properties in Procreate. */
const PANELS = [
  ['Stroke Path','Stroke path'], ['Stabilization','Stabilization'], ['Taper','Taper'],
  ['Shape','Shape'], ['Grain','Grain'], ['Rendering','Rendering'], ['Wet Mix','Wet mix'],
  ['Color Dynamics','Color dynamics'], ['Dynamics','Dynamics'], ['Apple Pencil','Apple Pencil'],
  ['Properties','Properties'], ['Materials','Materials'], ['Dual Brush','Dual brush']
];
/* Settings Procreate stores but the reference schema doesn't map. */
const SCHEMA_EXTRA = [
  {pn:'Shape', s:'Invert Shape', p:['$top.root.shapeInverted'], t:'bool', g:'on/off', f:'True/False', d:'$undefined'},
  {pn:'Grain', s:'Invert Grain', p:['$top.root.grainInverted'], t:'bool', g:'on/off', f:'True/False', d:'$undefined'},
  {pn:'Properties', s:'Size Slider', p:['$top.root.paintSize'], t:'float', g:'0-100%', f:'round(raw*100)', d:'$undefined'},
  {pn:'Properties', s:'Opacity Slider', p:['$top.root.paintOpacity'], t:'float', g:'0-100%', f:'round(raw*100)', d:'$undefined'}
];
const BLEND_PAIRS = new Set(['grainBlendMode','blendMode','burntEdgesBlendMode','dualBlendMode']);
const NEUTRAL = new Set(['None','Normal','No filtering','Touch only','Off','Default (linear)']);
const KEEP_CASE = ['StreamLine','Apple Pencil','3D','X','Y','ABR','HSB'];

function dParseDefault(d){
  if(d===undefined||d===null) return d;
  if(typeof d!=='string') return d;
  const t=d.trim();
  if(!t || t==='$undefined') return undefined;
  if(t==='true') return true; if(t==='false') return false; if(t==='null') return null;
  if(!isNaN(Number(t))) return Number(t);
  if(/^[\[{]/.test(t)){ try{ return JSON.parse(t); }catch(_){} }
  return d;
}
function dMatch(pattern,raws){
  if(!Array.isArray(pattern)||pattern.length!==raws.length) return false;
  return pattern.every((exp,i)=>{ const act=raws[i]; if(exp===null) return true;
    if(typeof exp==='boolean'&&typeof act==='number') return (act!==0)===exp;
    if(typeof exp==='number'&&typeof act==='boolean') return (exp!==0)===act;
    return act===exp; });
}
const FORMULA_CACHE=new Map();
function dEval(formula,raw){
  let fn=FORMULA_CACHE.get(formula);
  if(fn===undefined){
    try{ fn=new Function('raw','round','floor','ceil','abs','sqrt','SQRT','PI','pi','clamp',
      '"use strict";return ('+formula.replace(/\^/g,'**')+');'); }catch(_){ fn=null; }
    FORMULA_CACHE.set(formula,fn);
  }
  if(!fn) return null;
  try{ const pi=()=>Math.PI; return fn(raw,Math.round,Math.floor,Math.ceil,Math.abs,Math.sqrt,Math.sqrt,pi,pi,(x,a,b)=>Math.min(Math.max(x,a),b)); }
  catch(_){ return null; }
}
function dColorWords(s){ return String(s).replace(/Colour/g,'Color').replace(/colour/g,'color').replace(/Texturised/g,'Texturized').replace(/\bSaturate\b/g,'Saturation'); }
function dSentence(s){
  s=dColorWords(s).trim(); if(!s) return s;
  const keep=new Map(); KEEP_CASE.forEach((k,i)=>{ if(s.includes(k)){ const tok='\u0001'+i+'\u0001'; keep.set(tok,k); s=s.split(k).join(tok); } });
  s=s.charAt(0).toUpperCase()+s.slice(1).replace(/\b([A-Z])([a-z]+)/g,(m,a,b)=>a.toLowerCase()+b);
  s=s.charAt(0).toUpperCase()+s.slice(1);
  keep.forEach((v,k)=>{ s=s.split(k).join(v); });
  return s;
}
/* Split "Stamp Color Jitter - Hue" style labels into a subgroup + item, per Brush Studio layout. */
const LABEL_OVERRIDE={'Moving/Texturised':'Grain behavior','Moving/Texturized':'Grain behavior'};
function dLabel(pn,s){
  s=dColorWords(s).replace(/\s+$/,''); if(LABEL_OVERRIDE[s]) s=LABEL_OVERRIDE[s];
  let sub='', item=s, m;
  if(s.includes(' - ')){ [sub,item]=s.split(' - '); }
  else if(pn==='Taper'){
    if((m=s.match(/^Pressure Taper (.+)$/))){ sub='Pressure taper'; item=m[1]; }
    else if((m=s.match(/^Touch Taper (.+)$/))||(m=s.match(/^Touch (.+)$/))){ sub='Touch taper'; item=m[1]; }
    else if(/^(Start|End) Length$/.test(s)){ sub='Pressure taper'; }
    else sub='Taper properties';
  }
  else if(pn==='Stabilization'){
    if((m=s.match(/^(StreamLine|Stabilization|Motion Filtering) (.+)$/))){ sub=m[1]; item=m[2]; }
  }
  else if(pn==='Dynamics'){ if((m=s.match(/^(Speed|Jitter) (.+)$/))){ sub=m[1]; item=m[2]; } }
  else if(pn==='Materials'){ if((m=s.match(/^(Metallic|Roughness) (.+)$/))){ sub=m[1]; item=m[2]; } }
  else if(pn==='Apple Pencil'){
    if(s==='Tilt Angle'){ sub='Tilt'; item='Angle'; }
    else if(/^(Cursor Outline|Hover)/.test(s)){ sub='Hover'; item=s.replace(/^Hover - /,''); }
    else if(s==='Pressure Curve'){ sub='Pressure'; item='Curve'; }
  }
  else if(pn==='Preview'){ sub='Brush preview'; item=s; }
  else if(pn==='Stroke Path' && /^Jitter /.test(s)){ sub='Jitter'; item=s.replace(/^Jitter /,''); }
  else if(pn==='Stroke Path' && /^Spacing/.test(s)){ sub='Spacing'; item=s==='Spacing'?'Amount':'Jitter'; }
  return {sub:sub?dSentence(sub):'', label:dSentence(item)};
}
function dRange(g){
  if(typeof g!=='string') return null;
  const m=g.replace(/\s/g,'').match(/^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)(%?)$/);
  return m?{min:+m[1],max:+m[2],pct:!!m[3]}:null;
}
function dNum(v){ return Math.round(v*10)/10; }
function dSourceName(raw,hasFile,kind){
  const r=(typeof raw==='string')?raw.trim():'';
  if(r && r!=='$null'){
    const nm=r.replace(/^.*\//,'').replace(/^Brush-Preset-/,'').replace(/\.(png|jpe?g)$/i,'').replace(/[-_]+/g,' ');
    return {v:'Procreate library: '+dSentence(nm), note:'Built into Procreate, not stored in this file', active:true};
  }
  return hasFile ? {v:'Imported image', note:`Stored in this brush as ${kind}.png`, active:true} : {v:'None', active:false};
}
function dCurve(raws){
  const pts=[];
  raws.forEach(p=>{ let x,y; if(Array.isArray(p)){ [x,y]=p; } else if(typeof p==='string'){ const n=p.match(/-?\d*\.?\d+(?:e-?\d+)?/gi); if(n&&n.length>=2){ x=+n[0]; y=+n[1]; } }
    if(isFinite(x)&&isFinite(y)) pts.push([x,y]); });
  return pts;
}

/* Decode one schema entry. Returns null when the brush has no value and the schema gives no default. */
function decodeEntry(e,archive,ctx){
  const paths=Array.isArray(e.p)?e.p:[e.p];
  const raws=paths.map(p=>{ try{ return resolvePath(archive,p); }catch(_){ return undefined; } })
                  .map(v=>(v&&typeof v==='object'&&'NS.time' in v)?v['NS.time']:v);
  const key0=String(paths[0]).split('.').pop();
  if(paths.length>=2 && BLEND_PAIRS.has(key0) && typeof raws[0]==='number' && raws[1]===undefined)
    raws[1] = raws[0]===19?34 : raws[0]===25?0 : raws[0];
  if(e.t==='curve'){
    const pts=dCurve(raws);
    return pts.length>=2 ? {kind:'curve',pts,v:'Custom curve',active:true} : {kind:'enum',v:'Default (linear)',active:false};
  }
  const def=dParseDefault(e.d);
  const allMissing=raws.every(v=>v===undefined);
  if(allMissing && def===undefined) return null;
  const vals=raws.map((v,i)=>v!==undefined?v:(Array.isArray(def)?def[i]:def));
  const raw=vals.length===1?vals[0]:vals;
  const out={raw, isDefault:allMissing};
  const f=e.f, g=e.g;

  if(e.t==='str'){
    const isShape=/shape/i.test(paths[0]);
    return Object.assign(out,{kind:'source'},dSourceName(raw, isShape?ctx.hasShape:ctx.hasGrain, isShape?'Shape':'Grain'));
  }
  if(f && typeof f==='object' && !Array.isArray(f)){
    let label=null; for(const [k,pat] of Object.entries(f)){ if(dMatch(pat,vals)){ label=k; break; } }
    if(label===null) return Object.assign(out,{kind:'enum',v:'Unrecognized ('+[].concat(raw).join(', ')+')',active:true});
    label=dSentence(label.replace(/\+/g,' and '));
    return Object.assign(out,{kind:'enum',v:label,active:!NEUTRAL.has(label)});
  }
  const fs=typeof f==='string'?f.trim():'';
  if(e.t==='bool' || fs==='True/False' || /^raw\s*==/.test(fs)){
    const on = fs && /^raw\s*==/.test(fs) ? !!dEval(fs,raw) : !(raw===0||raw===false||raw===null||raw==='0');
    return Object.assign(out,{kind:'bool',on,v:on?'On':'Off',active:on});
  }
  if(/^\s*\d+\s*=\s*[^=]/.test(fs)){
    const map={}; fs.split(/,\s*/).forEach(pair=>{ const m=pair.match(/^\s*(\d+)\s*=\s*(.+)$/); if(m) map[m[1]]=m[2].trim(); });
    let label=map[String(Math.round(+raw))];
    if(e.s==='Classic Taper') label = (+raw===0)?'On':'Off';
    label = label==null ? String(raw) : dSentence(label);
    return Object.assign(out,{kind:e.s==='Classic Taper'?'bool':'enum',on:label==='On',v:label,active:!NEUTRAL.has(label)});
  }
  if(/^if Raw/i.test(fs)){ // Roundness: 1 = perfect circle
    const n=Math.round((+raw)*100);
    return Object.assign(out,{kind:'pct',n,min:0,max:100,unit:'%',v:n+'%',active:true});
  }
  if(typeof raw==='number' || Array.isArray(raw)){
    let n = fs ? dEval(fs,raw) : (typeof raw==='number'?raw:null);
    if(typeof n==='boolean') return Object.assign(out,{kind:'bool',on:n,v:n?'On':'Off',active:n});
    if(typeof n!=='number'||!isFinite(n)) return Object.assign(out,{kind:'enum',v:[].concat(raw).map(x=>typeof x==='number'?dNum(x):x).join(', '),active:true});
    const r=dRange(g); const deg=(typeof g==='string' && /^0-(360|90)$/.test(g.replace(/\s/g,'')));
    const unit = r&&r.pct ? '%' : deg ? '°' : '';
    n=dNum(n); if(r && r.min>=1 && n<r.min) n=r.min;
    return Object.assign(out,{kind:r?'pct':'num',n,min:r?r.min:0,max:r?r.max:0,unit,v:n+unit,active:n!==0});
  }
  return Object.assign(out,{kind:'enum',v:String(raw),active:true});
}

/* Decode a whole brush into Brush Studio panels plus "About this brush" details. */
function decodeBrush(archive,ctx){
  const by={};
  for(const e of PARAM_SCHEMA.concat(SCHEMA_EXTRA)){
    let d; try{ d=decodeEntry(e,archive,ctx); }catch(_){ d=null; }
    if(!d) continue;
    const pnKey = e.pn==='Preview' ? 'Properties' : e.pn;
    const lab=dLabel(e.pn,e.s);
    (by[pnKey]=by[pnKey]||[]).push(Object.assign(d,lab,{key:e.pn+'/'+e.s}));
  }
  const panels=PANELS.filter(([k])=>by[k] && (k!=='Dual Brush'||ctx.isDual)).map(([k,label])=>({id:k.toLowerCase().replace(/\s+/g,'-'),label,rows:by[k]}));
  const get=k=>{ try{ return resolvePath(archive,'$top.root.'+k); }catch(_){ return undefined; } };
  const cd=get('creationDate'); const t=cd&&typeof cd==='object'?cd['NS.time']:(cd instanceof Date?(cd.getTime()-978307200000)/1000:undefined);
  const author=cleanName(get('authorName'));
  return { panels, about:{ author, created: typeof t==='number'? new Date(978307200000+t*1000) : null, fromAbr: get('importedFromABR')===true } };
}

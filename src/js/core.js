
/* ============================================================================
   Spectator: client-side Procreate & Photoshop brush previewer / packager
   Modules:  bplist reader → NSKeyedArchiver resolve → param decode
             Procreate (.brush/.brushset) reader · ABR reader (beta)
             image export (PNG/JPEG/WEBP/TIFF/PDF) · brushset packager
   ========================================================================== */

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const toast = (() => { const t=$('#toast'); let h; return (m)=>{t.textContent=m;t.classList.add('show');clearTimeout(h);h=setTimeout(()=>t.classList.remove('show'),2600);}; })();
const uid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&0x3|0x8)).toString(16);}).toUpperCase();

/* ---------- binary plist (bplist00) reader ---------- */
function parseBplist(buf){
  const dv = new DataView(buf), bytes = new Uint8Array(buf);
  if (String.fromCharCode(...bytes.slice(0,6)) !== 'bplist') throw new Error('not a binary plist');
  const len = buf.byteLength;
  const offsetSize = dv.getUint8(len-26);
  const refSize    = dv.getUint8(len-25);
  const numObjects = Number(dv.getBigUint64(len-24));
  const topObject  = Number(dv.getBigUint64(len-16));
  const tableOff   = Number(dv.getBigUint64(len-8));
  const readSized = (p,sz)=>{let v=0;for(let i=0;i<sz;i++)v=v*256+dv.getUint8(p+i);return v;};
  const offsets=[]; for(let i=0;i<numObjects;i++) offsets.push(readSized(tableOff+i*offsetSize, offsetSize));
  const seen = new Array(numObjects);
  function readObj(idx){
    if(seen[idx]!==undefined) return seen[idx];
    let p = offsets[idx];
    const marker = dv.getUint8(p++); const hi = marker>>4, lo = marker&0x0f;
    let val;
    if(marker===0x00) val=null;
    else if(marker===0x08) val=false;
    else if(marker===0x09) val=true;
    else if(hi===0x1){ const n=1<<lo; let v=0; for(let i=0;i<n;i++)v=v*256+dv.getUint8(p+i); val=v; }
    else if(hi===0x2){ const n=1<<lo; val = (n===4)?dv.getFloat32(p):dv.getFloat64(p); }
    else if(hi===0x3){ val = new Date(978307200000 + dv.getFloat64(p)*1000); } // Apple epoch
    else if(hi===0x4){ let cnt=lo; if(lo===0x0f){const r=readLen(p);cnt=r.cnt;p=r.p;} val = new Uint8Array(buf, p, cnt).slice(); }
    else if(hi===0x5){ let cnt=lo; if(lo===0x0f){const r=readLen(p);cnt=r.cnt;p=r.p;} val = ascii(p,cnt); }
    else if(hi===0x6){ let cnt=lo; if(lo===0x0f){const r=readLen(p);cnt=r.cnt;p=r.p;} let s=''; for(let i=0;i<cnt;i++)s+=String.fromCharCode(dv.getUint16(p+i*2)); val=s; }
    else if(hi===0x8){ const n=lo+1; let v=0; for(let i=0;i<n;i++)v=v*256+dv.getUint8(p+i); val={__uid:v}; }
    else if(hi===0xA){ let cnt=lo; if(lo===0x0f){const r=readLen(p);cnt=r.cnt;p=r.p;} val=[]; seen[idx]=val; for(let i=0;i<cnt;i++)val.push(readObj(readSized(p+i*refSize,refSize))); }
    else if(hi===0xD){ let cnt=lo; if(lo===0x0f){const r=readLen(p);cnt=r.cnt;p=r.p;} val={}; seen[idx]=val; const keys=[]; for(let i=0;i<cnt;i++)keys.push(readObj(readSized(p+i*refSize,refSize))); for(let i=0;i<cnt;i++)val[keys[i]]=readObj(readSized(p+(cnt+i)*refSize,refSize)); }
    else val=null;
    seen[idx]=val; return val;
  }
  function readLen(p){ const m=dv.getUint8(p++); const n=1<<(m&0x0f); let cnt=0; for(let i=0;i<n;i++)cnt=cnt*256+dv.getUint8(p+i); return {cnt,p:p+n}; }
  function ascii(p,n){ let s=''; for(let i=0;i<n;i++)s+=String.fromCharCode(dv.getUint8(p+i)); return s; }
  const root = readObj(topObject);
  return {root, objects:seen};
}

/* ---------- NSKeyedArchiver path resolver ---------- */
function deref(v, archive){ return (v && typeof v==='object' && '__uid' in v) ? archive.root['$objects'][v.__uid] : v; }
function resolvePath(archive, path){
  // path like "$top.root.plotSpacing" ; handle [i] and escaped \.
  let clean = path.replace(/^\$top\.?/,'');
  const segs=[]; let cur='';
  for(let i=0;i<clean.length;i++){const c=clean[i];
    if(c==='\\'){cur+=clean[++i]||'';continue;}
    if(c==='.'){if(cur){segs.push(cur);cur='';}continue;}
    cur+=c;
  } if(cur)segs.push(cur);
  let node = deref(archive.root['$top'], archive); // top dict
  for(let seg of segs){
    if(node==null) return undefined;
    const m = seg.match(/^(.+?)\[(\d+)\]$/);
    if(m){ node = deref(node[m[1]], archive); node = node ? deref(node[+m[2]], archive) : undefined; }
    else { node = deref(node[seg], archive); }
  }
  return node;
}

function cleanName(v){ return (typeof v==='string' && v.trim() && v!=='$null') ? v.trim() : null; }
function brushName(archive){
  for(const k of ['name','brushName','paintName','title']){
    const v = cleanName(resolvePath(archive, '$top.root.'+k));
    if(v) return v;
  }
  try{ const root = deref(deref(archive.root['$top'],archive).root, archive);
    for(const k in root){ if(/name/i.test(k) && !/path/i.test(k)){ const v=cleanName(deref(root[k],archive)); if(v) return v; } }
  }catch(_){}
  return null;
}
function brushDates(archive){
  const d={};
  // Procreate brushes rarely store dates internally; surface any Date objects found at root.
  const root = deref(archive.root['$top'], archive);
  const r = root && deref(root.root, archive);
  if(r){ for(const k in r){ const v=deref(r[k],archive); if(v instanceof Date){ d[k]=v; } } }
  return d;
}

/* ---------- ZIP helpers (Procreate) ---------- */
async function loadZip(buf){ return await JSZip.loadAsync(buf); }
function blobUrl(blob){ return URL.createObjectURL(blob); }

async function readProcreateBrush(zip, prefix){
  const at = name => zip.file(prefix+name);
  const item = { id:uid(), name:null, params:null, dates:{}, files:{}, type:'pro', isDual:false };
  // collect every file in this brush folder for faithful repackaging
  zip.forEach((path,e)=>{ if(!e.dir && path.startsWith(prefix)) item.files[path.slice(prefix.length)] = e; });
  const thumb = at('QuickLook/Thumbnail.png');
  if(thumb) item.thumbUrl = blobUrl(await thumb.async('blob'));
  const shape = at('Shape.png'); if(shape){ item.shapeBlob = await shape.async('blob'); item.shapeUrl = blobUrl(item.shapeBlob); }
  const grain = at('Grain.png'); if(grain){ item.grainBlob = await grain.async('blob'); item.grainUrl = blobUrl(item.grainBlob); }
  // secondary (dual) brush source lives in a Sub01/ subfolder
  const subShape = zip.file(prefix+'Sub01/Shape.png'); if(subShape){ item.subShapeBlob = await subShape.async('blob'); item.subShapeUrl = blobUrl(item.subShapeBlob); item.isDual = true; }
  const subGrain = zip.file(prefix+'Sub01/Grain.png'); if(subGrain){ item.subGrainBlob = await subGrain.async('blob'); item.subGrainUrl = blobUrl(item.subGrainBlob); item.isDual = true; }
  const sig = at('Signature/SignaturePicture.png'); if(sig){ item.sigUrl = blobUrl(await sig.async('blob')); }
  const arch = at('Brush.archive');
  if(arch){
    try{
      const ab = await arch.async('arraybuffer');
      item.archiveBuf = ab;
      const archive = parseBplist(ab);
      item.name = brushName(archive);
      const dec = decodeBrush(archive,{hasShape:!!item.shapeBlob, hasGrain:!!item.grainBlob, isDual:item.isDual});
      item.panels = dec.panels; item.about = dec.about;
    }catch(e){ console.warn('archive parse failed', e); }
  }
  if(!item.thumbUrl && item.shapeUrl) item.thumbUrl = item.shapeUrl; // fallback preview
  return item;
}

async function readBrushFile(file){
  const buf = await file.arrayBuffer();
  const zip = await loadZip(buf);
  const item = await readProcreateBrush(zip, '');
  item.source = file.name; item.sourceModified = file.lastModified;
  if(!item.name) item.name = file.name.replace(/\.brush$/i,'');
  return [item];
}

/* Procreate writes brushset.plist as an XML plist, while Brush.archive is a
   binary plist. Sniffing the header and handling both is what keeps set order correct. */
function plistNodeToJS(node){
  switch(node.nodeName){
    case 'true':    return true;
    case 'false':   return false;
    case 'integer': return parseInt(node.textContent.trim(),10);
    case 'real':    return parseFloat(node.textContent.trim());
    case 'string':  return node.textContent;
    case 'data':    return node.textContent.trim();
    case 'date':    return new Date(node.textContent.trim());
    case 'array': {
      const out=[];
      for(const c of node.childNodes){ if(c.nodeType===1) out.push(plistNodeToJS(c)); }
      return out;
    }
    case 'dict': {
      const out={}; let key=null;
      for(const c of node.childNodes){
        if(c.nodeType!==1) continue;
        if(c.nodeName==='key') key=c.textContent;
        else if(key!==null){ out[key]=plistNodeToJS(c); key=null; }
      }
      return out;
    }
    default: return null;
  }
}
function parsePlistXML(text){
  const doc = new DOMParser().parseFromString(text,'application/xml');
  const err = doc.getElementsByTagName('parsererror');
  if(err && err.length) throw new Error('XML plist parse error');
  const plist = doc.getElementsByTagName('plist')[0];
  const root = plist ? Array.from(plist.childNodes).find(n=>n.nodeType===1) : null;
  if(!root) throw new Error('empty plist');
  return plistNodeToJS(root);
}
/* Read brushset.plist in EITHER format -> {order, name} */
async function readBrushsetManifest(entry){
  const ab = await entry.async('arraybuffer');
  const head = new TextDecoder('ascii').decode(new Uint8Array(ab.slice(0,8)));
  if(head === 'bplist00'){                       // binary plist
    const pl = parseBplist(ab);
    return brushsetOrder(pl);
  }
  const text = new TextDecoder('utf-8').decode(new Uint8Array(ab));   // XML plist
  const obj = parsePlistXML(text);
  const arr = obj && Array.isArray(obj.brushes) ? obj.brushes.filter(s=>typeof s==='string') : null;
  return { order: (arr && arr.length) ? arr : null,
           name: (obj && typeof obj.name==='string') ? obj.name : null };
}

function bsDeref(v, pl){
  const objs = pl.root && pl.root['$objects'];
  return (objs && v && typeof v==='object' && '__uid' in v) ? objs[v.__uid] : v;
}
function bsArray(v, pl){
  v = bsDeref(v, pl);
  if(Array.isArray(v)) return v;
  if(v && typeof v==='object' && Array.isArray(v['NS.objects'])) return v['NS.objects'];
  return null;
}
/* Brushset order is authoritative. brushset.plist comes in two shapes:
   a plain plist {name, brushes:[...]} OR an NSKeyedArchiver archive.
   Handle both, or we silently fall back to arbitrary ZIP order. */
function brushsetOrder(pl){
  let arr=null, name=null;
  if(pl.root && pl.root['$objects'] && pl.root['$top']){          // NSKeyedArchiver form
    const top = bsDeref(pl.root['$top'], pl);
    const root = top && bsDeref(top.root, pl);
    if(root && typeof root==='object'){
      arr = bsArray(root.brushes, pl);
      const n = bsDeref(root.name, pl);
      if(typeof n==='string' && n!=='$null') name=n;
    }
  }
  if(!arr && pl.root){                                            // plain plist form
    arr = bsArray(pl.root.brushes, pl);
    if(typeof pl.root.name==='string') name=pl.root.name;
  }
  if(!arr) return {order:null, name};
  const order = arr.map(e=>{const v=bsDeref(e,pl);return typeof v==='string'?v:null;}).filter(Boolean);
  return {order: order.length?order:null, name};
}

async function readBrushset(file){
  const buf = await file.arrayBuffer();
  const zip = await loadZip(buf);

  // every top-level folder that actually holds a brush (excludes Reset/ and Sub01/)
  const present=[];
  zip.forEach((path,e)=>{ const m=path.match(/^([^/]+)\/Brush\.archive$/); if(m && !e.dir) present.push(m[1]); });

  // authoritative order + set name from brushset.plist (case-insensitive lookup)
  let order=null, setName=null;
  let plistFile = zip.file('brushset.plist');
  if(!plistFile){ const hit = zip.file(/(^|\/)brushset\.plist$/i); if(hit && hit.length) plistFile = hit[0]; }
  if(plistFile){
    try{
      const r = await readBrushsetManifest(plistFile);
      order = r.order; setName = r.name;
    }catch(e){ console.warn('brushset.plist parse failed', e); }
  }

  if(order){
    // keep only folders that exist, then append any strays the plist omitted
    const set = new Set(present);
    order = order.filter(f=>set.has(f));
    for(const f of present) if(!order.includes(f)) order.push(f);
  } else {
    console.warn('brushset.plist order unavailable - using archive order');
    order = present;
  }

  const items=[];
  for(const folder of order){
    const pre = String(folder).replace(/\/$/,'')+'/';
    try{
      const it = await readProcreateBrush(zip, pre);
      it.source = file.name; it.sourceModified = file.lastModified;
      it.folderName = String(folder); it.setName = setName||null;
      if(!it.name) it.name = file.name.replace(/\.brushset$/i,'') + ' \u00b7 ' + String(folder).slice(0,8);
      items.push(it);
    }catch(e){ console.warn('brush in set failed', e); }
  }
  return items;
}

/* ---------- ABR reader (beta): extract sampled tip bitmaps ---------- */
function decodePackBits(src, expected){
  const out = new Uint8Array(expected); let o=0, i=0;
  while(i<src.length && o<expected){
    let n = src[i++];
    if(n<128){ const c=n+1; for(let k=0;k<c&&i<src.length&&o<expected;k++) out[o++]=src[i++]; }
    else if(n>128){ const c=257-n; const v=src[i++]; for(let k=0;k<c&&o<expected;k++) out[o++]=v; }
  }
  return out;
}
function grayBitmapToPNGBlob(gray, w, h){
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
  const ctx=cv.getContext('2d'); const img=ctx.createImageData(w,h);
  for(let i=0;i<w*h;i++){ const v=gray[i]; img.data[i*4]=img.data[i*4+1]=img.data[i*4+2]=v; img.data[i*4+3]=255; }
  ctx.putImageData(img,0,0);
  return new Promise(res=>cv.toBlob(res,'image/png'));
}
async function readAbr(file){
  const buf = await file.arrayBuffer(); const dv=new DataView(buf); const u8=new Uint8Array(buf);
  const items=[]; const version=dv.getUint16(0);
  const str=(p,n)=>{let s='';for(let i=0;i<n;i++)s+=String.fromCharCode(u8[p+i]);return s;};
  try{
    if(version>=6){
      let p=4; // version(2)+subversion(2)
      while(p+12<=buf.byteLength){
        if(str(p,4)!=='8BIM'){ p++; continue; }
        const key=str(p+4,4); const len=dv.getUint32(p+8); const start=p+12, end=start+len;
        if(key==='samp'){
          let q=start, idx=0;
          while(q+4<=end){
            const recLen=dv.getUint32(q); q+=4; const recEnd=q+recLen + (recLen&1);
            try{
              // brush id (pascal string), then optional fields, then intermediate header
              // scan within record for a plausible 31-byte header: ver,len,unk,top,left,bottom,right,depth(2),comp(1)
              let hp=q;
              // skip a leading pascal-ish id if present
              // search for header by trying offsets until rect is sane
              let found=null;
              for(let off=q; off<Math.min(q+64,recEnd-31); off++){
                const top=dv.getInt32(off+12),left=dv.getInt32(off+16),bot=dv.getInt32(off+20),right=dv.getInt32(off+24);
                const depth=dv.getUint16(off+28), comp=dv.getUint8(off+30);
                const w=right-left, h=bot-top;
                if(w>0&&h>0&&w<8192&&h<8192&&(depth===8||depth===16)&&(comp===0||comp===1)){ found={off,w,h,depth,comp,top,left,bot,right}; break; }
              }
              if(found){
                const {w,h,comp}=found; let dp=found.off+31; const total=w*h; let gray;
                if(comp===0){ gray=u8.slice(dp, dp+total); }
                else { // per-row PackBits: first h*2 bytes are row byte-lengths
                  const rowLens=[]; for(let r=0;r<h;r++){rowLens.push(dv.getUint16(dp)); dp+=2;}
                  gray=new Uint8Array(total);
                  for(let r=0;r<h;r++){ const rl=rowLens[r]; const row=decodePackBits(u8.slice(dp,dp+rl), w); gray.set(row.slice(0,w), r*w); dp+=rl; }
                }
                const blob = await grayBitmapToPNGBlob(gray,w,h);
                const it = { id:uid(), type:'abr', name:file.name.replace(/\.abr$/i,'')+' · '+(idx+1), source:file.name, sourceModified:file.lastModified,
                             shapeBlob:blob, shapeUrl:blobUrl(blob), thumbUrl:blobUrl(blob), abrW:w, abrH:h };
                items.push(it);
              }
            }catch(e){ /* skip this record */ }
            q=recEnd; idx++;
            if(idx>500) break;
          }
        }
        p=end;
      }
    } else {
      // v1/v2 rarely used now — flag unsupported but don't crash
    }
  }catch(e){ console.warn('abr parse error', e); }
  if(!items.length){
    items.push({ id:uid(), type:'abr', name:file.name.replace(/\.abr$/i,''), source:file.name, sourceModified:file.lastModified, undecodable:true });
  }
  return items;
}

/* =========================== STATE + RENDER =========================== */
const state = { items: [] };

async function ingest(files){
  for(const f of files){
    const ext = (f.name.split('.').pop()||'').toLowerCase();
    try{
      let arr=[];
      if(ext==='brush') arr=await readBrushFile(f);
      else if(ext==='brushset') arr=await readBrushset(f);
      else if(ext==='abr') arr=await readAbr(f);
      else { toast('Skipped '+f.name+' (unsupported)'); continue; }
      state.items.push(...arr);
    }catch(e){ console.error(e); toast('Failed: '+f.name); }
  }
  render();
}


function esc(s){return (s+'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
const selected = ()=> state.items.filter(i=>i.selected);


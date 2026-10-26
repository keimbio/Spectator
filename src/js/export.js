/* ---------- info modal ---------- */

function dl(it,what){ return (it.name||'brush').replace(/[^\w.-]+/g,'_')+'_'+what; }

/* ---------- image rendering for export (v3.3) ---------- */
function loadImg(url){ return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;}); }

/* colour helpers */
function hexToRgb(h){ h=String(h).replace('#',''); if(h.length===3) h=h.replace(/./g,c=>c+c); const n=parseInt(h,16)||0; return [n>>16&255,n>>8&255,n&255]; }
function rgbToHex(r,g,b){ return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('').toUpperCase(); }
function relLum(hex){ return hexToRgb(hex).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}).reduce((a,v,i)=>a+v*[0.2126,0.7152,0.0722][i],0); }
const isLight = hex => relLum(hex) > 0.18;   // equal-contrast point between black and white

/* Per-brush asset cache: decoded image, content bounds, stroke tone */
const xpCache=new Map();
async function xpAsset(it){
  let c=xpCache.get(it.id); if(c) return c;
  c={img:null,bbox:null,light:true};
  if(it.thumbUrl){ try{ c.img=await loadImg(it.thumbUrl); Object.assign(c,xpAnalyse(c.img)); }catch(_){ c.img=null; } }
  xpCache.set(it.id,c); return c;
}
/* Bounding box of the visible stroke (alpha, or difference from the corner colour for opaque images) */
function xpAnalyse(img){
  const W=img.naturalWidth||img.width, H=img.naturalHeight||img.height;
  const k=Math.min(1,320/Math.max(W,H)), w=Math.max(1,Math.round(W*k)), h=Math.max(1,Math.round(H*k));
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
  const ctx=cv.getContext('2d',{willReadFrequently:true}); ctx.drawImage(img,0,0,w,h);
  const d=ctx.getImageData(0,0,w,h).data;
  let alpha=false; for(let i=3;i<d.length;i+=28){ if(d[i]<250){alpha=true;break;} }
  const r0=d[0],g0=d[1],b0=d[2]; let x0=w,y0=h,x1=-1,y1=-1,lum=0,cnt=0;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=(y*w+x)*4;
    const on=alpha ? d[i+3]>12 : (Math.abs(d[i]-r0)+Math.abs(d[i+1]-g0)+Math.abs(d[i+2]-b0))>36;
    if(on){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; lum+=d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114; cnt++; } }
  if(x1<0) return {bbox:{x:0,y:0,w:W,h:H},light:true};
  const p=2; x0=Math.max(0,x0-p); y0=Math.max(0,y0-p); x1=Math.min(w-1,x1+p); y1=Math.min(h-1,y1+p);
  return { bbox:{x:x0/k,y:y0/k,w:(x1-x0+1)/k,h:(y1-y0+1)/k}, light:(lum/cnt)>90 || !alpha };
}

/* ---------- export settings ---------- */
const XP_KEY='spectator.export.v1';
const XP_DEF={fmt:'png',layout:'grid',gridCols:0,gridRows:0,stackCols:1,stackOut:'one',stripRows:1,stripOut:'one',
  bg:'black',bgCustom:'#3F6E57',ink:'auto',inkCustom:'#DDA527',caption:true,trim:true,tile:512,gap:16};
const xp={s:Object.assign({},XP_DEF),page:0,plan:null,timer:0,token:0,busy:false,tab:'img'};
try{ const sv=JSON.parse(localStorage.getItem(XP_KEY)||'null'); if(sv&&typeof sv==='object') for(const k in XP_DEF) if(k in sv && typeof sv[k]===typeof XP_DEF[k]) xp.s[k]=sv[k]; }catch(_){}
function xpSave(){ try{ localStorage.setItem(XP_KEY,JSON.stringify(xp.s)); }catch(_){} }
const ALPHA_FMT={png:1,webp:1,tiff:1};
const FMT_EXT={png:'png',jpeg:'jpg',webp:'webp',tiff:'tif',pdf:'pdf'};
function xpBgMode(){ return (xp.s.bg==='none' && !ALPHA_FMT[xp.s.fmt]) ? 'black' : xp.s.bg; }
function xpBgHex(){ const m=xpBgMode(); return m==='none'?null : m==='white'?'#FFFFFF' : m==='black'?'#000000' : xp.s.bgCustom; }
function xpInkHex(){ const s=xp.s; if(s.ink==='original') return null; if(s.ink==='custom') return s.inkCustom; const bg=xpBgHex(); return (bg && isLight(bg)) ? '#000000' : null; }

/* ---------- layout planning (pure geometry; same plan drives preview and export) ---------- */
function xpSplitEven(n,k){ const out=[], base=Math.floor(n/k), extra=n%k; let at=0; for(let g=0;g<k;g++){ const len=base+(g<extra?1:0); if(!len) break; out.push(Array.from({length:len},(_,j)=>at+j)); at+=len; } return out; }
function xpGridDims(n){ const s=xp.s; let C=s.gridCols|0, R=s.gridRows|0;
  if(!C&&!R){ C=Math.ceil(Math.sqrt(n)); R=Math.ceil(n/C); } else if(C&&!R){ R=Math.ceil(n/C); } else if(!C&&R){ C=Math.ceil(n/R); }
  return {C:Math.max(1,Math.min(C,n)), R:Math.max(1,R)}; }
function xpPlan(items){
  const s=xp.s, W=s.tile, gap=s.gap, n=items.length;
  const fs=Math.max(11,Math.min(72,Math.round(W*0.042))), capH=s.caption?Math.round(fs*1.8):0;
  const m=items.map(it=>{ const a=xpCache.get(it.id)||{};
    if(!a.img) return {it,a,cw:Math.round(W*0.5),ch:Math.round(W*0.12)};
    const iw=a.img.naturalWidth, ih=a.img.naturalHeight, k=W/Math.max(iw,ih);   // identical scale rule for every layout
    const b=s.trim ? a.bbox : {x:0,y:0,w:iw,h:ih};
    return {it,a,b,cw:Math.max(1,Math.round(b.w*k)),ch:Math.max(1,Math.round(b.h*k))}; });
  const minW=s.caption?Math.round(W*0.45):1;
  const cellW=s.trim?Math.max(minW,...m.map(x=>x.cw)):W;
  const cellH=(s.trim?Math.max(...m.map(x=>x.ch)):W)+capH;
  const sheets=[]; const add=(cells,cols,rows,tag,own)=>sheets.push({cells,cols,rows,tag,own});
  if(s.layout==='separate'){ m.forEach((_,i)=>add([{i,c:0,r:0}],1,1,i,true)); }
  else if(s.layout==='grid'){
    const {C,R}=xpGridDims(n), per=C*R;
    for(let p=0;p*per<n;p++){ const cells=[]; for(let j=0;j<per&&p*per+j<n;j++) cells.push({i:p*per+j,c:j%C,r:Math.floor(j/C)});
      add(cells,Math.min(C,cells.length),Math.ceil(cells.length/C),'grid'+(n>per?'-'+(p+1):'')); }
  } else {
    const vert=s.layout==='stack', K=Math.max(1,Math.min(n,vert?s.stackCols:s.stripRows));
    const groups=xpSplitEven(n,K), split=(vert?s.stackOut:s.stripOut)==='split' && groups.length>1;
    const cellOf=(i,g,k)=>vert?{i,c:g,r:k}:{i,c:k,r:g};
    if(split) groups.forEach((g,gi)=>add(g.map((i,k)=>cellOf(i,0,k)), vert?1:g.length, vert?g.length:1, (vert?'stack-column-':'strip-row-')+(gi+1)));
    else { const cells=[]; groups.forEach((g,gi)=>g.forEach((i,k)=>cells.push(cellOf(i,gi,k))));
      const long=Math.max(...groups.map(g=>g.length)); add(cells, vert?groups.length:long, vert?long:groups.length, vert?'stack':'strip'); }
  }
  for(const sh of sheets){
    if(sh.own){ const x=m[sh.cells[0].i]; sh.cw=s.trim?Math.max(x.cw,minW):W; sh.ch=(s.trim?x.ch:W)+capH; }
    else { sh.cw=cellW; sh.ch=cellH; }
    sh.w=2*gap+sh.cols*sh.cw+(sh.cols-1)*gap; sh.h=2*gap+sh.rows*sh.ch+(sh.rows-1)*gap;
  }
  return {m,sheets,gap,fs,capH,n};
}

/* recolour a stroke: brightness becomes opacity, so texture survives on any background */
function xpTint(mm,hex,f){
  const w=Math.max(1,Math.round(mm.cw*f)), h=Math.max(1,Math.round(mm.ch*f));
  const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d',{willReadFrequently:true});
  x.imageSmoothingQuality='high'; x.drawImage(mm.a.img,mm.b.x,mm.b.y,mm.b.w,mm.b.h,0,0,w,h);
  const d=x.getImageData(0,0,w,h), p=d.data, [R,G,B]=hexToRgb(hex), useL=mm.a.light;
  for(let i=0;i<p.length;i+=4){ if(!p[i+3]) continue; if(useL) p[i+3]=Math.round(p[i+3]*(p[i]*0.299+p[i+1]*0.587+p[i+2]*0.114)/255); p[i]=R; p[i+1]=G; p[i+2]=B; }
  x.putImageData(d,0,0); return c;
}
function xpCaption(ctx,text,x,y,w,fs,capH,bg){
  ctx.save(); ctx.font=`600 ${fs}px "Hanken Grotesk",system-ui,sans-serif`; ctx.textBaseline='middle';
  const padX=bg?0:Math.round(fs*0.45), maxW=w-padX*2; let t=String(text).trim()||'Brush';
  if(ctx.measureText(t).width>maxW){ while(t.length>1 && ctx.measureText(t+'…').width>maxW) t=t.slice(0,-1); t=t.trimEnd()+'…'; }
  const cy=y+capH*0.42;
  if(!bg){ const tw=ctx.measureText(t).width; ctx.fillStyle='rgba(0,0,0,.6)'; ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x,cy-fs*0.78,tw+padX*2,fs*1.56,fs*0.35); else ctx.rect(x,cy-fs*0.78,tw+padX*2,fs*1.56);
    ctx.fill(); ctx.fillStyle='#fff'; }
  else ctx.fillStyle=isLight(bg)?'rgba(0,0,0,.8)':'rgba(255,255,255,.86)';
  ctx.fillText(t,x+padX,cy); ctx.restore();
}
function xpRender(plan,idx,f){
  const s=xp.s, sh=plan.sheets[idx], cv=document.createElement('canvas');
  cv.width=Math.max(1,Math.round(sh.w*f)); cv.height=Math.max(1,Math.round(sh.h*f));
  const ctx=cv.getContext('2d'); ctx.imageSmoothingQuality='high'; ctx.setTransform(f,0,0,f,0,0);
  const bg=xpBgHex(), ink=xpInkHex();
  if(bg){ ctx.fillStyle=bg; ctx.fillRect(0,0,sh.w,sh.h); }
  for(const cell of sh.cells){
    const mm=plan.m[cell.i], x=plan.gap+cell.c*(sh.cw+plan.gap), y=plan.gap+cell.r*(sh.ch+plan.gap);
    if(mm.a.img){ const dx=x+(sh.cw-mm.cw)/2, dy=y+plan.capH+(sh.ch-plan.capH-mm.ch)/2;
      if(ink) ctx.drawImage(xpTint(mm,ink,f),dx,dy,mm.cw,mm.ch);
      else ctx.drawImage(mm.a.img,mm.b.x,mm.b.y,mm.b.w,mm.b.h,dx,dy,mm.cw,mm.ch); }
    if(s.caption) xpCaption(ctx,mm.it.name,x,y,sh.cw,plan.fs,plan.capH,bg);
  }
  return cv;
}

function tiffEncode(cv,alpha){ // baseline uncompressed TIFF, RGB or RGBA (unassociated alpha), little-endian
  const w=cv.width,h=cv.height, px=cv.getContext('2d').getImageData(0,0,w,h).data, spp=alpha?4:3;
  let data; if(alpha) data=new Uint8Array(px.buffer.slice(0)); else { data=new Uint8Array(w*h*3); for(let i=0,j=0;i<px.length;i+=4,j+=3){data[j]=px[i];data[j+1]=px[i+1];data[j+2]=px[i+2];} }
  const nTags=alpha?11:10, ifdSize=2+nTags*12+4, bpsOff=8+ifdSize, stripOff=bpsOff+spp*2;
  const ab=new ArrayBuffer(stripOff+data.length), dv=new DataView(ab), u8=new Uint8Array(ab);
  dv.setUint16(0,0x4949,true); dv.setUint16(2,42,true); dv.setUint32(4,8,true);
  let o=8; dv.setUint16(o,nTags,true); o+=2;
  const tag=(id,type,cnt,val)=>{dv.setUint16(o,id,true);dv.setUint16(o+2,type,true);dv.setUint32(o+4,cnt,true);if(type===3&&cnt===1)dv.setUint16(o+8,val,true);else dv.setUint32(o+8,val,true);o+=12;};
  tag(256,4,1,w); tag(257,4,1,h); tag(258,3,spp,bpsOff); tag(259,3,1,1); tag(262,3,1,2);
  tag(273,4,1,stripOff); tag(277,3,1,spp); tag(278,4,1,h); tag(279,4,1,data.length); tag(284,3,1,1);
  if(alpha) tag(338,3,1,2);
  dv.setUint32(o,0,true);
  for(let i=0;i<spp;i++) dv.setUint16(bpsOff+i*2,8,true);
  u8.set(data,stripOff);
  return new Blob([ab],{type:'image/tiff'});
}
function cvToBlob(cv,fmt,alpha){ if(fmt==='tiff') return Promise.resolve(tiffEncode(cv,!!alpha)); const mime=fmt==='jpeg'?'image/jpeg':fmt==='webp'?'image/webp':'image/png'; return new Promise(r=>cv.toBlob(r,mime,0.92)); }
function saveBlob(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); }

async function exportPDF(canvases,name){
  const { jsPDF }=window.jspdf; let pdf;
  canvases.forEach((cv,i)=>{ const o=cv.width>cv.height?'l':'p';
    if(i===0) pdf=new jsPDF({orientation:o,unit:'px',format:[cv.width,cv.height]}); else pdf.addPage([cv.width,cv.height],o);
    pdf.addImage(cv.toDataURL('image/png'),'PNG',0,0,cv.width,cv.height); });
  pdf.save(name);
}
function safe(s){return (s+'').replace(/[^\w.-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80)||'brush';}

/* ---------- shape + grain export ---------- */
async function exportShapeGrain(){
  const items=selected().filter(i=>i.shapeBlob||i.grainBlob); if(!items.length){ toast('No shape/grain in selection'); return; }
  const zip=new JSZip();
  for(const it of items){ const base=safe(it.name||'brush');
    if(it.shapeBlob) zip.file(base+'_shape.png', it.shapeBlob);
    if(it.grainBlob) zip.file(base+'_grain.png', it.grainBlob);
  }
  saveBlob(await zip.generateAsync({type:'blob'}),'shape-grain.zip'); toast('Exported shape/grain PNGs');
}

/* ---------- repackage: selected Procreate brushes → .brushset ---------- */
function bplistWrite(obj){
  // minimal bplist00 encoder for { string: (string | [string,...]) }
  const objects=[]; const indexOf=new Map();
  function add(v){ // returns index
    if(typeof v==='string'){ if(indexOf.has('S:'+v))return indexOf.get('S:'+v); const i=objects.length; objects.push({t:'s',v}); indexOf.set('S:'+v,i); return i; }
    if(Array.isArray(v)){ const refs=v.map(add); const i=objects.length; objects.push({t:'a',refs}); return i; }
    // dict
    const keys=Object.keys(v); const kr=keys.map(k=>add(k)); const vr=keys.map(k=>add(v[k])); const i=objects.length; objects.push({t:'d',kr,vr}); return i;
  }
  const top=add(obj);
  // serialize
  const chunks=[]; let pos=8; const offsets=[];
  const enc=new TextEncoder();
  function push(bytes){ chunks.push(bytes); pos+=bytes.length; }
  // header
  chunks.push(enc.encode('bplist00')); 
  const refSize=objects.length<256?1:2;
  function intBytes(n,sz){ const b=new Uint8Array(sz); for(let i=sz-1;i>=0;i--){b[i]=n&0xff;n>>=8;} return b; }
  for(let i=0;i<objects.length;i++){ offsets[i]=pos; const o=objects[i];
    if(o.t==='s'){ const sb=enc.encode(o.v); // ascii if all <128 else utf16
      let ascii=true; for(const c of o.v) if(c.charCodeAt(0)>127){ascii=false;break;}
      if(ascii){ const len=sb.length; if(len<15){push(Uint8Array.of(0x50|len));} else {push(Uint8Array.of(0x5f)); push(Uint8Array.of(0x10)); push(intBytes(len,1));} push(sb); }
      else { const arr=[...o.v]; const len=arr.length; if(len<15){push(Uint8Array.of(0x60|len));} else {push(Uint8Array.of(0x6f));push(Uint8Array.of(0x10));push(intBytes(len,1));} const u=new Uint8Array(len*2); for(let j=0;j<len;j++){const cc=arr[j].charCodeAt(0);u[j*2]=cc>>8;u[j*2+1]=cc&0xff;} push(u); }
    } else if(o.t==='a'){ const len=o.refs.length; if(len<15)push(Uint8Array.of(0xA0|len)); else {push(Uint8Array.of(0xAf));push(Uint8Array.of(0x10));push(intBytes(len,1));} for(const r of o.refs)push(intBytes(r,refSize)); }
    else { const len=o.kr.length; if(len<15)push(Uint8Array.of(0xD0|len)); else {push(Uint8Array.of(0xDf));push(Uint8Array.of(0x10));push(intBytes(len,1));} for(const r of o.kr)push(intBytes(r,refSize)); for(const r of o.vr)push(intBytes(r,refSize)); }
  }
  const tableOff=pos; const offSize=tableOff<256?1:tableOff<65536?2:4;
  for(let i=0;i<objects.length;i++) push(intBytes(offsets[i],offSize));
  const trailer=new Uint8Array(32); trailer[6]=offSize; trailer[7]=refSize;
  const dv=new DataView(trailer.buffer); dv.setBigUint64(8,BigInt(objects.length)); dv.setBigUint64(16,BigInt(top)); dv.setBigUint64(24,BigInt(tableOff));
  chunks.push(trailer);
  let totalLen=0; chunks.forEach(c=>totalLen+=c.length); const out=new Uint8Array(totalLen); let off=0; chunks.forEach(c=>{out.set(c,off);off+=c.length;});
  return out;
}
async function packBrushset(){
  const items=selected().filter(i=>i.type==='pro' && i.files); if(!items.length){ toast('Select Procreate brushes to package'); return; }
  const name=($('#setName').value||'My Brushes').trim();
  const zip=new JSZip(); const folders=[];
  for(const it of items){ const folder=uid(); folders.push(folder);
    for(const path in it.files){ const e=it.files[path]; zip.file(folder+'/'+path, await e.async('uint8array')); }
  }
  const plist=bplistWrite({ name, brushes:folders });
  zip.file('brushset.plist', plist);
  saveBlob(await zip.generateAsync({type:'blob'}), safe(name)+'.brushset');
  toast('Packaged '+items.length+' brushes → '+name+'.brushset');
}
async function splitToBrush(){
  const items=selected().filter(i=>i.type==='pro' && i.files); if(!items.length){ toast('Select Procreate brushes'); return; }
  const zip=new JSZip();
  for(const it of items){ const inner=new JSZip();
    for(const path in it.files){ inner.file(path, await it.files[path].async('uint8array')); }
    const bb=await inner.generateAsync({type:'uint8array'});
    zip.file(safe(it.name||'brush')+'.brush', bb);
  }
  saveBlob(await zip.generateAsync({type:'blob'}), 'individual-brushes.zip');
  toast('Exported '+items.length+' .brush files (zipped)');
}

/* ---------- .abr tips → PNG (the reliable Photoshop route) ---------- */
async function abrTipsToPng(){
  const items=selected().filter(i=>i.type==='abr' && i.shapeBlob); if(!items.length){ toast('Select decoded .abr brushes'); return; }
  const zip=new JSZip();
  for(const it of items){ zip.file(safe(it.name||'tip')+'.png', it.shapeBlob); }
  saveBlob(await zip.generateAsync({type:'blob'}),'abr-tips.zip');
  toast('Exported '+items.length+' tip PNGs — in Photoshop: Edit ▸ Define Brush Preset');
}
/* ---------- .abr → .brush (experimental, template-based) ---------- */
async function abrToBrush(){
  const abrs=selected().filter(i=>i.type==='abr' && i.shapeBlob);
  const template=state.items.find(i=>i.type==='pro' && i.files && i.files['Brush.archive']);
  if(!abrs.length){ toast('Select decoded .abr brushes'); return; }
  if(!template){ toast('Load one Procreate .brush as a template first (see note)'); return; }
  const zip=new JSZip();
  for(const it of abrs){ const inner=new JSZip();
    for(const path in template.files){ // copy template, swap shape
      if(/Shape\.png$/i.test(path)) inner.file(path, await it.shapeBlob.arrayBuffer());
      else inner.file(path, await template.files[path].async('uint8array'));
    }
    zip.file(safe(it.name||'converted')+'.brush', await inner.generateAsync({type:'uint8array'}));
  }
  saveBlob(await zip.generateAsync({type:'blob'}),'abr-to-brush.zip');
  toast('Experimental: created .brush files using template engine — verify in Procreate');
}



/* ---------------- export window: preview, controls, export (v3.3) ---------------- */
const fmtN=n=>Math.round(n).toLocaleString();
function xpEnsure(items){ return Promise.all(items.map(xpAsset)); }
function xpLimits(plan){
  const W=Math.max(...plan.sheets.map(s=>s.w)), H=Math.max(...plan.sheets.map(s=>s.h)), A=Math.max(...plan.sheets.map(s=>s.w*s.h));
  if(W>32767||H>32767||A>268e6) return {W,H,block:'Too large for one image. Lower the tile width or add more columns or rows.'};
  if(W>16384||H>16384||A>16777216) return {W,H,warn:'Very large image. Safari may fail to save it; Chrome and Firefox are fine.'};
  return {W,H};
}
function xpBaseName(items){ const src=[...new Set(items.map(i=>i.source||''))]; return src.length===1&&src[0] ? safe(src[0].replace(/\.(brushset|brush|abr)$/i,'')) : 'spectator'; }

function xpSync(){
  const s=xp.s, n=selected().length, alphaOK=!!ALPHA_FMT[s.fmt], bgMode=xpBgMode();
  $$('#export-modal [data-x]').forEach(b=>{ const k=b.dataset.x; const cur=k==='bg'?bgMode:String(s[k]); const on=cur===b.dataset.v; b.setAttribute('aria-checked',on); b.tabIndex=on?0:-1; });
  $('[data-x="bg"][data-v="none"]').disabled=!alphaOK;
  const bn=$('#bgNote'); bn.hidden=alphaOK; bn.textContent=alphaOK?'':`${s.fmt.toUpperCase()} can't store transparency${s.bg==='none'?', so black is used':''}.`;
  $('#swBg').style.background=s.bgCustom; $('#swInk').style.background=s.inkCustom;
  const bg=xpBgHex(); let note;
  if(s.ink==='auto') note=!bg?'Strokes stay white on a transparent background.':isLight(bg)?'Strokes turn black so they show on this light background.':'Strokes stay white on this dark background.';
  else if(s.ink==='original') note='Strokes exactly as Procreate renders them (usually white).';
  else { note=`Strokes recolored to ${s.inkCustom.toUpperCase()}.`; if(bg){ const a=relLum(bg),b=relLum(s.inkCustom); if((Math.max(a,b)+.05)/(Math.min(a,b)+.05)<1.8) note+=' Low contrast against the background.'; } }
  $('#inkNote').textContent=note;
  ['separate','grid','stack','strip'].forEach(l=>$('#arr-'+l).hidden=s.layout!==l);
  $$('#export-modal .step').forEach(st=>{ const k=st.dataset.step, auto=!!st.dataset.auto, v=s[k]|0, max=Math.max(1,n);
    const inp=st.querySelector('input'); if(document.activeElement!==inp) inp.value=(auto&&!v)?'Auto':v;
    st.querySelector('[data-d="-1"]').disabled=v<=(auto?0:1); st.querySelector('[data-d="1"]').disabled=v>=max; });
  $('#xTile').value=s.tile; $('#oTile').textContent=s.tile+' px'; $('#xGap').value=s.gap; $('#oGap').textContent=s.gap+' px';
  $$('#export-modal [data-xb]').forEach(c=>c.checked=!!s[c.dataset.xb]);
  const btn=$('#doExportImg'); if(!xp.busy) btn.textContent=n?`Export ${n} preview${n===1?'':'s'}`:'Export previews';
  btn.disabled=!n||xp.busy;
  $$('.xtab').forEach(t=>{ const on=t.dataset.tab===xp.tab; t.classList.toggle('on',on); t.setAttribute('aria-selected',on); });
  $('#xTitle').textContent=xp.tab==='img'?'Export previews':'Export brushes';
  $('#xpane-img').hidden=xp.tab!=='img'; $('#xpane-src').hidden=xp.tab!=='src'; $('#xfoot').hidden=xp.tab!=='img';
}
function xpHints(plan){
  const s=xp.s, n=plan.n, N=plan.sheets.length, pl=k=>k===1?'':'s';
  if(s.layout==='grid'){ const {C,R}=xpGridDims(n), auto=!s.gridCols&&!s.gridRows;
    $('#hint-grid').textContent=`${C} × ${R} per image${auto?' (auto)':''}. ${n} brush${n===1?'':'es'} → ${N} image${pl(N)}.`+(N>1?' Extra brushes continue on the next image.':''); }
  if(s.layout==='stack'||s.layout==='strip'){ const vert=s.layout==='stack', K=Math.max(1,Math.min(n,vert?s.stackCols:s.stripRows)), g=xpSplitEven(n,K), L=Math.max(...g.map(x=>x.length));
    $('#hint-'+s.layout).textContent=`${g.length} ${vert?'column':'row'}${pl(g.length)} of up to ${L} brush${L===1?'':'es'}, read in set order.`; }
}
function xpSchedule(d){ clearTimeout(xp.timer); xp.timer=setTimeout(xpRefresh,d==null?90:d); }
function xpChanged(d){ xpSave(); xpSync(); xpSchedule(d); }
async function xpRefresh(){
  if(!$('#export-modal').classList.contains('show')||xp.tab!=='img') return;
  const tok=++xp.token, items=selected(), msg=$('#xpMsg'); xpSync();
  if(!items.length){ msg.textContent='Select brushes to preview the export.'; $('#xpSum').innerHTML=''; $('#xpPager').hidden=true; return; }
  if(items.some(it=>!xpCache.has(it.id))) msg.textContent='Rendering preview…';
  await xpEnsure(items); try{ await document.fonts.load('600 16px "Hanken Grotesk"'); }catch(_){}
  if(tok!==xp.token) return;
  msg.textContent='';
  const plan=xp.plan=xpPlan(items), N=plan.sheets.length; xp.page=Math.max(0,Math.min(xp.page,N-1));
  const sh=plan.sheets[xp.page], st=$('#xpStage'), sw=Math.max(80,st.clientWidth-32), sht=Math.max(80,st.clientHeight-32);
  const fit=Math.min(1,sw/sh.w,sht/sh.h), dpr=Math.min(2,window.devicePixelRatio||1);
  const cv=xpRender(plan,xp.page,fit*dpr); cv.id='xpCanvas';
  cv.style.width=Math.max(1,Math.round(sh.w*fit))+'px'; cv.style.height=Math.max(1,Math.round(sh.h*fit))+'px';
  $('#xpCanvas').replaceWith(cv); st.classList.toggle('transparent',!xpBgHex());
  const pg=$('#xpPager'); pg.hidden=N<2;
  if(N>1){ $('#xpPage').textContent=`${xp.s.fmt==='pdf'?'Page':'Image'} ${xp.page+1} of ${N}`+(sh.own?` · ${plan.m[sh.cells[0].i].it.name||'Brush'}`:'');
    $('#xpPrev').disabled=xp.page===0; $('#xpNext').disabled=xp.page>=N-1; }
  xpHints(plan);
  const s=xp.s, lim=xpLimits(plan), F=s.fmt.toUpperCase();
  const what=s.fmt==='pdf'?`${N}-page PDF`:N>1?`${N} ${F} images in a .zip`:`1 ${F} image`;
  const same=plan.sheets.every(x=>x.w===sh.w&&x.h===sh.h);
  const dims=same?`${fmtN(sh.w)} × ${fmtN(sh.h)} px`:`up to ${fmtN(lim.W)} × ${fmtN(lim.H)} px`;
  $('#xpSum').innerHTML=`<b>${what}</b>, ${dims}`+(lim.block?`<span class="e">${lim.block}</span>`:lim.warn?`<span class="w">${lim.warn}</span>`:'');
  $('#doExportImg').disabled=!!lim.block||xp.busy;
}

async function exportImages(){
  const items=selected(); if(!items.length){ toast('Select some brushes first'); return; }
  if(xp.busy) return;
  const btn=$('#doExportImg'); xp.busy=true; btn.classList.add('busy'); btn.disabled=true; btn.innerHTML='<span class="spin"></span> Exporting…';
  try{
    try{ await document.fonts.load('600 24px "Hanken Grotesk"'); }catch(_){}
    await xpEnsure(items);
    const plan=xpPlan(items), lim=xpLimits(plan); if(lim.block){ toast(lim.block); return; }
    const s=xp.s, base=xpBaseName(items), ext=FMT_EXT[s.fmt], alpha=!xpBgHex()&&!!ALPHA_FMT[s.fmt], w=String(plan.n).length;
    const kind=s.layout==='separate'?'brushes':plan.sheets[0].tag.split('-')[0];
    const files=[];
    for(let i=0;i<plan.sheets.length;i++){ const sh=plan.sheets[i];
      const nm=sh.own ? (plan.n===1?safe(plan.m[0].it.name):String(i+1).padStart(w,'0')+'_'+safe(plan.m[sh.cells[0].i].it.name)) : base+'-'+sh.tag;
      files.push({cv:xpRender(plan,i,1),name:nm}); await new Promise(r=>setTimeout(r)); }
    let out;
    if(s.fmt==='pdf'){ out=base+'-'+kind+'.pdf'; await exportPDF(files.map(f=>f.cv),out); }
    else if(files.length===1){ out=files[0].name+'.'+ext; saveBlob(await cvToBlob(files[0].cv,s.fmt,alpha),out); }
    else { const zip=new JSZip(); for(const f of files) zip.file(f.name+'.'+ext,await cvToBlob(f.cv,s.fmt,alpha));
      out=base+'-'+kind+'.zip'; saveBlob(await zip.generateAsync({type:'blob'}),out); }
    toast(`Exported ${items.length} preview${items.length===1?'':'s'} to ${out}`);
  }catch(e){ console.error(e); toast('Export failed: '+(e&&e.message||e)); }
  finally{ xp.busy=false; btn.classList.remove('busy'); xpSync(); xpSchedule(0); }
}

function xpTab(t){ xp.tab=t; cpClose(); xpSync(); if(t==='img') xpSchedule(0); }
function xpStep(st,d){ const k=st.dataset.step, auto=!!st.dataset.auto, max=Math.max(1,selected().length);
  xp.s[k]=Math.max(auto?0:1,Math.min(max,(xp.s[k]|0)+d)); xp.page=0; xpChanged(); }
function xpInit(){
  const M=$('#export-modal');
  M.addEventListener('click',e=>{
    const b=e.target.closest('[data-x]');
    if(b&&!b.disabled){ const k=b.dataset.x, v=b.dataset.v, pk=b.dataset.pick;
      if(pk){ if(CP.anchor===b&&!$('#cpick').hidden){ cpClose(); return; }
        xp.s[k]=v; cpOpen(b,xp.s[pk],hex=>{ xp.s[pk]=hex; xp.s[k]='custom'; xpChanged(60); }); }
      else { xp.s[k]=v; cpClose(); }
      if(k==='layout'||k==='stackOut'||k==='stripOut') xp.page=0;
      xpChanged(); return; }
    const sb=e.target.closest('.step button'); if(sb&&!sb.disabled){ xpStep(sb.closest('.step'),+sb.dataset.d); return; }
    const tb=e.target.closest('.xtab'); if(tb){ xpTab(tb.dataset.tab); return; }
  });
  M.addEventListener('keydown',e=>{
    const r=e.target.closest('[role=radio]'); if(!r) return;
    const dir={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[e.key]; if(!dir) return;
    const all=[...r.parentElement.querySelectorAll('[role=radio]:not(:disabled)')]; const nx=all[(all.indexOf(r)+dir+all.length)%all.length];
    if(nx&&!nx.dataset.pick){ e.preventDefault(); nx.focus(); nx.click(); } else if(nx){ e.preventDefault(); nx.focus(); }
  });
  $$('#export-modal .step input').forEach(inp=>{
    const st=inp.closest('.step'), commit=()=>{ const k=st.dataset.step, auto=!!st.dataset.auto, max=Math.max(1,selected().length), v=parseInt(inp.value,10);
      xp.s[k]=isNaN(v)?(auto?0:1):Math.max(auto?0:1,Math.min(max,v)); xp.page=0; xpChanged(); };
    inp.addEventListener('change',commit); inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ inp.blur(); }
      if(e.key==='ArrowUp'||e.key==='ArrowDown'){ e.preventDefault(); xpStep(st,e.key==='ArrowUp'?1:-1); } });
    inp.addEventListener('focus',()=>inp.select());
  });
  $$('#export-modal [data-xr]').forEach(r=>r.addEventListener('input',()=>{ xp.s[r.dataset.xr]=+r.value; xpChanged(140); }));
  $$('#export-modal [data-xb]').forEach(c=>c.addEventListener('change',()=>{ xp.s[c.dataset.xb]=c.checked; xpChanged(); }));
  $('#xpPrev').onclick=()=>{ xp.page--; xpSchedule(0); }; $('#xpNext').onclick=()=>{ xp.page++; xpSchedule(0); };
  if(window.ResizeObserver) new ResizeObserver(()=>xpSchedule(120)).observe($('#xpStage'));
  $('.xctl').addEventListener('scroll',cpPlace,{passive:true}); window.addEventListener('resize',cpPlace);
  cpInit(); xpSync();
}

/* ---------------- colour picker ---------------- */
const CP={hsv:[0,0,1],cb:null,anchor:null,lib:'spectator',q:'',start:null,libs:{},names:null};
function cpParse(lib){ return CP.libs[lib]||(CP.libs[lib]=CP_RAW[lib].split('|').map(e=>({hex:e.slice(0,6),name:e.slice(6)}))); }
function cpLookup(hex){ if(!CP.names){ CP.names=new Map(); ['resene','pantone','spectator'].forEach(l=>cpParse(l).forEach(c=>CP.names.set(c.hex,c.name))); } return CP.names.get(hex.replace('#','').toLowerCase())||''; }
function hsvToRgb(h,s,v){ const f=n=>{ const k=(n+h/60)%6; return v-v*s*Math.max(0,Math.min(k,4-k,1)); }; return [f(5),f(3),f(1)].map(x=>Math.round(x*255)); }
function rgbToHsv(r,g,b){ r/=255; g/=255; b/=255; const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn; let h=0;
  if(d){ h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4; h*=60; if(h<0) h+=360; } return [h,mx?d/mx:0,mx]; }
const cpCurrent=()=>rgbToHex(...hsvToRgb(...CP.hsv));
const clamp01=v=>Math.max(0,Math.min(1,v));
function cpSetHex(hex,emit,name){ const [r,g,b]=hexToRgb(hex), hsv=rgbToHsv(r,g,b); if(hsv[1]===0||hsv[2]===0) hsv[0]=CP.hsv[0]; CP.hsv=hsv; cpPaint(name); if(emit) cpEmit(); }
function cpPaint(name){ const hex=cpCurrent(), [h,s,v]=CP.hsv, P=$('#cpick');
  P.style.setProperty('--cph',Math.round(h)); const k=$('#cpSVk'); k.style.left=(s*100)+'%'; k.style.top=((1-v)*100)+'%'; k.style.background=hex;
  $('#cpHuek').style.left=(h/360*100)+'%'; $('#cpHuek').style.background=`hsl(${Math.round(h)},100%,50%)`; $('#cpHue').setAttribute('aria-valuenow',Math.round(h));
  $('#cpChip').style.background=hex; if(document.activeElement!==$('#cpHex')) $('#cpHex').value=hex;
  const nm=name||cpLookup(hex); $('#cpName').textContent=nm?`${nm}  ${hex}`:hex; }
function cpEmit(){ CP.cb&&CP.cb(cpCurrent()); }
function cpRecents(){ try{ return JSON.parse(localStorage.getItem('spectator.recentColours')||'[]').filter(h=>/^#[0-9A-F]{6}$/i.test(h)).slice(0,12); }catch(_){ return []; } }
function cpGrid(){
  const q=CP.q.trim().toLowerCase().replace(/^#/,''), list=cpParse(CP.lib).filter(c=>!q||c.name.toLowerCase().includes(q)||c.hex.startsWith(q));
  $('#cpGrid').innerHTML=list.length?list.map(c=>`<button class="cp-sw" style="background:#${c.hex}" data-hex="${c.hex}" data-name="${esc(c.name)}" title="${esc(c.name)} #${c.hex.toUpperCase()}" aria-label="${esc(c.name)}"></button>`).join('')
    :`<p class="cp-none">No colors match “${esc(CP.q)}”.</p>`;
  $('#cpRecent').innerHTML=cpRecents().map(h=>`<button class="cp-sw" style="background:${h}" data-hex="${h.slice(1)}" title="${h}" aria-label="Recent ${h}"></button>`).join('');
  $$('.cp-tab').forEach(t=>t.classList.toggle('on',t.dataset.lib===CP.lib));
}
function cpPlace(){ const P=$('#cpick'), a=CP.anchor; if(P.hidden||!a) return;
  const r=a.getBoundingClientRect(), pw=P.offsetWidth, ph=P.offsetHeight;
  let left=Math.min(Math.max(8,r.left+r.width-pw),innerWidth-pw-8), top=r.bottom+8;
  if(top+ph>innerHeight-8) top=Math.max(8,r.top-ph-8);
  P.style.left=left+'px'; P.style.top=top+'px'; }
function cpOpen(anchor,hex,cb){ CP.anchor=anchor; CP.cb=null; CP.start=hex; CP.q=''; $('#cpSearch').value='';
  cpSetHex(hex,false); CP.cb=cb; const P=$('#cpick'); P.hidden=false; cpGrid(); cpPlace(); anchor.setAttribute('aria-expanded','true');
  setTimeout(()=>$('#cpHex').focus({preventScroll:true}),0); }
function cpClose(){ const P=$('#cpick'); if(!P||P.hidden) return; P.hidden=true;
  const hex=cpCurrent(); if(CP.cb&&hex!==String(CP.start).toUpperCase()){ const rec=cpRecents().filter(h=>h.toUpperCase()!==hex); rec.unshift(hex); try{ localStorage.setItem('spectator.recentColours',JSON.stringify(rec.slice(0,12))); }catch(_){} }
  if(CP.anchor) CP.anchor.setAttribute('aria-expanded','false'); CP.cb=null; CP.anchor=null; }
function cpDrag(el,fn){ el.addEventListener('pointerdown',e=>{ e.preventDefault(); el.setPointerCapture(e.pointerId); fn(e);
  const mv=ev=>fn(ev), up=()=>{ el.removeEventListener('pointermove',mv); el.removeEventListener('pointerup',up); el.removeEventListener('pointercancel',up); };
  el.addEventListener('pointermove',mv); el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up); }); }
function cpInit(){
  const P=$('#cpick');
  cpDrag($('#cpSV'),e=>{ const r=$('#cpSV').getBoundingClientRect(); CP.hsv[1]=clamp01((e.clientX-r.left)/r.width); CP.hsv[2]=1-clamp01((e.clientY-r.top)/r.height); cpPaint(); cpEmit(); });
  cpDrag($('#cpHue'),e=>{ const r=$('#cpHue').getBoundingClientRect(); CP.hsv[0]=clamp01((e.clientX-r.left)/r.width)*359.9; cpPaint(); cpEmit(); });
  $('#cpHue').addEventListener('keydown',e=>{ const d={ArrowRight:5,ArrowUp:5,ArrowLeft:-5,ArrowDown:-5}[e.key]; if(!d) return; e.preventDefault(); CP.hsv[0]=(CP.hsv[0]+d+360)%360; cpPaint(); cpEmit(); });
  $('#cpHex').addEventListener('input',e=>{ const v=e.target.value.trim(); if(/^#?[0-9a-f]{6}$/i.test(v)) cpSetHex(v.startsWith('#')?v:'#'+v,true); });
  $('#cpHex').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); cpClose(); } });
  $('#cpHex').addEventListener('blur',()=>{ $('#cpHex').value=cpCurrent(); });
  const pickSw=e=>{ const b=e.target.closest('.cp-sw'); if(b) cpSetHex('#'+b.dataset.hex,true,b.dataset.name); };
  $('#cpGrid').addEventListener('click',pickSw); $('#cpRecent').addEventListener('click',pickSw);
  $('#cpGrid').addEventListener('mouseover',e=>{ const b=e.target.closest('.cp-sw'); if(b) $('#cpName').textContent=`${b.dataset.name}  #${b.dataset.hex.toUpperCase()}`; });
  $('#cpGrid').addEventListener('mouseleave',()=>cpPaint());
  $('#cpSearch').addEventListener('input',e=>{ CP.q=e.target.value; cpGrid(); });
  $$('.cp-tab').forEach(t=>t.onclick=()=>{ CP.lib=t.dataset.lib; cpGrid(); });
  $('#cpDone').onclick=()=>{ const a=CP.anchor; cpClose(); a&&a.focus(); };
  if('EyeDropper' in window){ const d=$('#cpDrop'); d.hidden=false; d.onclick=()=>new EyeDropper().open().then(r=>cpSetHex(r.sRGBHex,true)).catch(()=>{}); }
  document.addEventListener('pointerdown',e=>{ if(!P.hidden&&!P.contains(e.target)&&!(CP.anchor&&CP.anchor.contains(e.target))) cpClose(); },true);
  window.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!P.hidden){ e.preventDefault(); e.stopImmediatePropagation(); const a=CP.anchor; cpClose(); a&&a.focus(); } },true);
}


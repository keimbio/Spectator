/* =============================================================================
   Main window: settings & appearance, brush grid, brush info, wiring
   ========================================================================== */
const svgI = id => `<svg class="i" aria-hidden="true"><use href="#i-${id}"/></svg>`;

/* ---------------- settings & appearance ---------------- */
const ST_KEY = 'spectator.settings.v1';
const ST_DEF = { mode:'dark', theme:'spectator', bg:'aura', dim:0.5, font:'hanken', size:1 };
const st = Object.assign({}, ST_DEF);
try{ const v=JSON.parse(localStorage.getItem(ST_KEY)||'null'); if(v&&typeof v==='object') for(const k in ST_DEF) if(typeof v[k]===typeof ST_DEF[k]) st[k]=v[k]; }catch(_){}
function stSave(){ try{ localStorage.setItem(ST_KEY,JSON.stringify(st)); }catch(_){} }

/* Uploaded background lives in IndexedDB (images are too big for localStorage). */
const idb = {
  db: null,
  open(){ return this.db || (this.db = new Promise((res,rej)=>{ const r=indexedDB.open('spectator',1); r.onupgradeneeded=()=>r.result.createObjectStore('kv'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); })); },
  async get(k){ try{ const db=await this.open(); return await new Promise((res,rej)=>{ const q=db.transaction('kv').objectStore('kv').get(k); q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error); }); }catch(_){ return undefined; } },
  async set(k,v){ const db=await this.open(); return new Promise((res,rej)=>{ const t=db.transaction('kv','readwrite'); t.objectStore('kv').put(v,k); t.oncomplete=res; t.onerror=()=>rej(t.error); }); },
  async del(k){ try{ const db=await this.open(); return await new Promise(res=>{ const t=db.transaction('kv','readwrite'); t.objectStore('kv').delete(k); t.oncomplete=res; t.onerror=res; }); }catch(_){} }
};
let customBgUrl = null;
const sysDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const curMode = () => st.mode==='system' ? (sysDark&&!sysDark.matches?'light':'dark') : st.mode;

function applyAppearance(){
  const th = THEMES.find(t=>t.id===st.theme) || THEMES[0], mode = curMode(), root=document.documentElement;
  const T = themeTokens(th, mode);
  for(const k in T) root.style.setProperty('--'+k, T[k]);
  root.dataset.scheme = mode; root.style.colorScheme = mode;
  root.style.setProperty('--font', FONTS[st.font] || FONTS.hanken);
  root.style.setProperty('--fs-scale', st.size);
  root.style.setProperty('--dim', st.dim);
  const layer=$('#bg-layer'); let url=null;
  if(st.bg==='custom') url=customBgUrl;
  else { const b=BACKGROUNDS.find(x=>x.id===st.bg); if(b) url='assets/backgrounds/'+b.file; }
  document.body.classList.toggle('bg-aura', st.bg==='aura' || (st.bg==='custom' && !url));
  layer.style.backgroundImage = url ? `url("${url}")` : '';
  const meta=document.querySelector('meta[name=theme-color]'); if(meta) meta.content=T.bg;
  if($('#settings-modal').classList.contains('show')) stRender();
}
function stRender(){
  $$('#settings-modal [data-mode]').forEach(b=>b.setAttribute('aria-checked', b.dataset.mode===st.mode));
  $('#themeGrid').innerHTML = THEMES.map(t=>`<button role="radio" aria-checked="${t.id===st.theme}" data-theme="${t.id}">
      <span class="sw5">${[t.light,t.accent,t.accent2,t.deep,t.dark].map(c=>`<i style="background:${c}"></i>`).join('')}</span><b>${esc(t.name)}</b></button>`).join('');
  const tiles=[`<button role="radio" class="plain" data-bg="none" aria-checked="${st.bg==='none'}" style="background:var(--bg)"><span>None</span></button>`,
    `<button role="radio" data-bg="aura" aria-checked="${st.bg==='aura'}" style="background-color:var(--bg);background-image:var(--aura)"><span>Aura</span></button>`]
    .concat(BACKGROUNDS.map(b=>`<button role="radio" data-bg="${b.id}" aria-checked="${st.bg===b.id}" data-file="${esc(b.file)}" style="background-image:url('assets/backgrounds/thumbs/${esc(b.file)}'),url('assets/backgrounds/${esc(b.file)}')"><span>${esc(b.label)}</span></button>`));
  if(customBgUrl) tiles.push(`<button role="radio" data-bg="custom" aria-checked="${st.bg==='custom'}" style="background-image:url('${customBgUrl}')"><span>Your image</span></button>`);
  tiles.push(`<button class="up" data-upload="1"><span>${svgI('plus')}${customBgUrl?'Replace image':'Upload image'}</span></button>`);
  $('#bgGrid').innerHTML=tiles.join('');
  $$('#bgGrid [data-file]').forEach(b=>{ const im=new Image(); im.onerror=()=>b.classList.add('missing'); im.src='assets/backgrounds/'+b.dataset.file; });
  $('#stDim').value=st.dim; $('#oDim').textContent=Math.round(st.dim*100)+'%';
  $('#stFont').value=st.font; $('#stSize').value=st.size; $('#oSize').textContent=Math.round(st.size*100)+'%';
}
function stSet(k,v){ st[k]=v; stSave(); applyAppearance(); }
function stInit(){
  const M=$('#settings-modal');
  M.addEventListener('click',e=>{
    const m=e.target.closest('.modes [data-mode]'); if(m){ stSet('mode',m.dataset.mode); return; }
    const t=e.target.closest('#themeGrid [data-theme]'); if(t){ stSet('theme',t.dataset.theme); return; }
    const b=e.target.closest('#bgGrid [data-bg]'); if(b){ stSet('bg',b.dataset.bg); return; }
    if(e.target.closest('[data-upload]')) $('#bg-upload').click();
  });
  M.addEventListener('keydown',e=>{ const r=e.target.closest('[role=radio]'); if(!r) return; const d={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[e.key]; if(!d) return;
    const all=[...r.parentElement.querySelectorAll('[role=radio]')], nx=all[(all.indexOf(r)+d+all.length)%all.length]; e.preventDefault(); nx.click(); requestAnimationFrame(()=>{ const sel=r.parentElement.parentElement.querySelector('[aria-checked=true]'); sel&&sel.focus(); }); });
  $('#stDim').addEventListener('input',e=>stSet('dim',+e.target.value));
  $('#stSize').addEventListener('input',e=>stSet('size',+e.target.value));
  $('#stFont').addEventListener('change',e=>stSet('font',e.target.value));
  $('#stReset').onclick=()=>{ Object.assign(st,ST_DEF); stSave(); applyAppearance(); toast('Settings reset'); };
  $('#bg-upload').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    if(!/^image\//.test(f.type)){ toast('Choose an image file'); return; }
    try{ await idb.set('customBg',f); }catch(_){ toast("Couldn't save the image in this browser; it will last until you reload"); }
    if(customBgUrl) URL.revokeObjectURL(customBgUrl); customBgUrl=URL.createObjectURL(f); stSet('bg','custom'); };
  if(sysDark) sysDark.addEventListener('change',()=>{ if(st.mode==='system') applyAppearance(); });
}

/* ---------------- brush grid ---------------- */
const VIEW_KEY='spectator.view.v1';
const view={mode:'grid',cols:{grid:4,list:1}};
try{ const v=JSON.parse(localStorage.getItem(VIEW_KEY)||'null'); if(v&&v.cols){ view.mode=v.mode==='list'?'list':'grid'; view.cols.grid=+v.cols.grid||4; view.cols.list=+v.cols.list||1; } }catch(_){}
const MAXCOLS={grid:6,list:2};
let lastClicked=-1;
function setName(it){ return it.setName || (it.source||'').replace(/\.(brushset|brush|abr)$/i,'') || 'Brush'; }
function effCols(){ const g=$('#brush-grid'), w=(g&&g.clientWidth)||1200, min=view.mode==='list'?420:190; return Math.max(1,Math.min(view.cols[view.mode],Math.floor((w+16)/min)||1)); }
function render(){
  const g=$('#brush-grid'), has=state.items.length>0;
  $('#empty').hidden=has; $('#toolbar').hidden=!has; $('#panelHint').hidden=!has;
  g.classList.toggle('list',view.mode==='list');
  g.style.gridTemplateColumns=`repeat(${effCols()},minmax(0,1fr))`;
  g.innerHTML=state.items.map((it,i)=>{
    const nm=esc(it.name||'Brush');
    const badges=(it.type==='abr'?'<span class="badge">ABR</span>':'')+(it.isDual?'<span class="badge dual">Dual</span>':'');
    return `<article class="card${it.selected?' sel':''}" data-i="${i}">
      <button class="thumb" data-act="sel" aria-pressed="${!!it.selected}" aria-label="Select ${nm}">${badges?`<span class="badges">${badges}</span>`:''}${it.thumbUrl?`<img src="${it.thumbUrl}" alt="" loading="lazy">`:'<span class="none">No preview</span>'}</button>
      <button class="chk" data-act="sel" tabindex="-1" aria-hidden="true"><svg><use href="#i-check"/></svg></button>
      <div class="meta"><div class="txt"><div class="nm" title="${nm}">${nm}</div><div class="set">${svgI('set')}<span title="${esc(it.source||'')}">${esc(setName(it))}</span></div></div>
      <button class="infobtn" data-act="info" aria-label="Brush details for ${nm}">${svgI('info')}</button></div></article>`;
  }).join('');
  const sel=selected().length;
  $('#loadedCount').textContent=state.items.length; $('#selCount').textContent=sel;
  $('#ebCount').textContent=$('#epCount').textContent=sel||'';
  $('#exportBrushesBtn').disabled=$('#exportPreviewsBtn').disabled=!sel;
  if($('#export-sub')) $('#export-sub').textContent=`${sel} brush${sel===1?'':'es'} selected`;
  renderViewCtl();
}
function renderViewCtl(){
  $('#vGrid').setAttribute('aria-pressed',view.mode==='grid'); $('#vList').setAttribute('aria-pressed',view.mode==='list');
  const max=MAXCOLS[view.mode];
  $('#colpills').innerHTML=Array.from({length:max},(_,k)=>`<button class="colpill" data-c="${k+1}" aria-pressed="${view.cols[view.mode]===k+1}" aria-label="${k+1} column${k?'s':''}">${k+1}</button>`).join('');
}
function saveView(){ try{ localStorage.setItem(VIEW_KEY,JSON.stringify(view)); }catch(_){} }
function gridClick(e){
  const card=e.target.closest('.card'); if(!card) return; const i=+card.dataset.i, it=state.items[i]; const act=e.target.closest('[data-act]'); if(!act) return;
  if(act.dataset.act==='info'){ openInfo(it); return; }
  if(e.shiftKey && lastClicked>=0){ const [a,b]=[Math.min(lastClicked,i),Math.max(lastClicked,i)]; const v=!it.selected; for(let k=a;k<=b;k++) state.items[k].selected=v; }
  else it.selected=!it.selected;
  lastClicked=i; render();
  const nb=$(`#brush-grid .card[data-i="${i}"] .thumb`); nb&&nb.focus({preventScroll:true});
}

/* ---------------- brush info ---------------- */
let biShowAll=false, biItem=null, biObs=null;
function fmtDate(d){ try{ return d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); }catch(_){ return String(d); } }
function biValue(r){
  if(r.kind==='pct'){
    const span=r.max-r.min||1, bip=r.min<0;
    const style = bip ? (r.n>=0?`left:50%;width:${Math.min(50,r.n/r.max*50)}%`:`right:50%;width:${Math.min(50,-r.n/(-r.min)*50)}%`) : `left:0;width:${Math.max(0,Math.min(100,(r.n-r.min)/span*100))}%`;
    return `<span class="meter${bip?' bi':''}" aria-hidden="true"><i style="${style}"></i></span><span class="num">${esc(r.v)}</span>`;
  }
  if(r.kind==='bool') return `<span class="state ${r.on?'on':'off'}">${r.on?'On':'Off'}</span>`;
  if(r.kind==='curve'){
    const W=120,H=64,p=6, pts=r.pts.slice().sort((a,b)=>a[0]-b[0]);
    const d=pts.map((q,k)=>(k?'L':'M')+(p+q[0]*(W-2*p)).toFixed(1)+' '+(H-p-q[1]*(H-2*p)).toFixed(1)).join(' ');
    return `<svg class="curve" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pressure curve"><path d="${d}"/></svg>`;
  }
  if(r.kind==='num') return `<span class="num">${esc(r.v)}</span>`;
  return `<span class="tag">${esc(r.v)}</span>`;
}
function biRows(rows){
  const out=[], groups=new Map();
  rows.forEach(r=>{ const k=r.sub||''; if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(r); });
  groups.forEach((rs,sub)=>{
    out.push(`<div class="bi-grp">${sub?`<h5>${esc(sub)}</h5>`:''}${rs.map(r=>`<div class="row${r.active?'':' off'}"><div class="k">${esc(r.label)}${r.note?`<small>${esc(r.note)}</small>`:''}</div><div class="v">${biValue(r)}</div></div>`).join('')}</div>`);
  });
  return out.join('');
}
function biRenderSettings(){
  const it=biItem, panels=(it.panels||[]).map(p=>({...p,shown:biShowAll?p.rows:p.rows.filter(r=>r.active)})).filter(p=>p.shown.length);
  if(!it.panels){
    $('#biNav').innerHTML=''; $('#biAllWrap').hidden=true;
    $('#biScroll').innerHTML=`<p class="bi-empty">${it.type==='abr'?'Photoshop .abr files store a brush tip image, not Procreate settings. Use Export brushes to turn tips into PNGs.':"This brush's settings couldn't be read."}</p>`;
    return;
  }
  $('#biNav').innerHTML=panels.map((p,k)=>`<button data-sec="${p.id}" class="${k?'':'on'}">${esc(p.label)}<i>${p.shown.length}</i></button>`).join('');
  $('#biAll').checked=biShowAll; $('#biAllWrap').hidden=false;
  $('#biScroll').innerHTML=panels.length?panels.map(p=>`<section class="bi-sec" id="bi-${p.id}" data-sec="${p.id}"><h4>${esc(p.label)}<small>${biShowAll?`${p.rows.filter(r=>r.active).length} of ${p.rows.length} in use`:`${p.shown.length} in use`}</small></h4>${biRows(p.shown)}</section>`).join(''):'<p class="bi-empty">No settings in use.</p>';
  if(biObs) biObs.disconnect();
  if('IntersectionObserver' in window){
    biObs=new IntersectionObserver(ents=>{ const vis=ents.filter(x=>x.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
      if(vis){ $$('#biNav [data-sec]').forEach(b=>b.classList.toggle('on',b.dataset.sec===vis.target.dataset.sec)); } },{root:$('#biScroll'),rootMargin:'0px 0px -70% 0px'});
    $$('#biScroll .bi-sec').forEach(s=>biObs.observe(s));
  }
}
function media(title,sub,url,file,wide){
  return `<figure class="media${wide?' wide':''}" style="margin:0"><div class="pic">${url?`<img src="${url}" alt="${esc(title)}">`:`<span class="none">${esc(sub||'Not stored in this file')}</span>`}</div>
    <figcaption class="cap"><b>${esc(title)}${sub&&url?`<small>${esc(sub)}</small>`:''}</b>${url?`<a href="${url}" download="${esc(file)}.png" aria-label="Save ${esc(title)} as PNG" title="Save as PNG">${svgI('save')}${wide?'Save':''}</a>`:''}</figcaption></figure>`;
}
function openInfo(it){
  biItem=it;
  const rows=(it.panels||[]).flatMap(p=>p.rows), find=k=>rows.find(r=>r.key===k);
  const shp=find('Shape/Shape Source'), grn=find('Grain/Grain Source');
  $('#biName').textContent=it.name||'Brush';
  $('#biChips').innerHTML=[`<span class="chip acc">${it.type==='abr'?'Photoshop .abr':'Procreate'}</span>`, it.isDual?'<span class="chip dual">Dual brush</span>':'',
    `<span class="chip">${svgI('set')}${esc(setName(it))}</span>`].join('');
  const ab=it.about||{}, facts=[['Author',ab.author],['Created',ab.created?fmtDate(ab.created):null],['Brush set',setName(it)],['File',it.source],
    ['Imported from',ab.fromAbr?'Photoshop .abr':null],['Tip size',it.abrW?`${it.abrW} × ${it.abrH} px`:null],['File modified',it.sourceModified?fmtDate(new Date(it.sourceModified)):null]].filter(f=>f[1]);
  const shortSrc=r=>!r?'':r.v.replace(/^Procreate library: /,'Library: ').replace(/^Imported image$/,'Imported');
  $('#biAside').innerHTML=[
    media('Stroke preview','',it.thumbUrl,dl(it,'preview'),true),
    `<div class="media-pair">${media('Shape',shp?shortSrc(shp):'',it.shapeUrl,dl(it,'shape'))}${media('Grain',grn?shortSrc(grn):'',it.grainUrl,dl(it,'grain'))}</div>`,
    it.isDual?`<p class="aside-h">Secondary brush</p><div class="media-pair">${media('Shape','',it.subShapeUrl,dl(it,'shape_secondary'))}${media('Grain','',it.subGrainUrl,dl(it,'grain_secondary'))}</div>`:'',
    `<p class="aside-h">About this brush</p><dl class="facts">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`,
    it.sigUrl?`<div class="sig"><img src="${it.sigUrl}" alt="Author signature"></div>`:''
  ].join('');
  biRenderSettings();
  openModal('info-modal'); $('#biScroll').scrollTop=0; $('#biAside').scrollTop=0;
}

/* ---------------- modals ---------------- */
let lastFocus=null;
function openModal(id){
  lastFocus=document.activeElement; const m=document.getElementById(id); m.classList.add('show');
  if(id==='export-modal'){ xp.page=0; xpSync(); requestAnimationFrame(()=>xpRefresh()); }
  if(id==='settings-modal') stRender();
  requestAnimationFrame(()=>{ const f=m.querySelector('[data-close].btn'); f&&f.focus({preventScroll:true}); });
}
function closeModal(m){ if(!m) return; m.classList.remove('show'); if(m.id==='export-modal') cpClose(); if(lastFocus&&lastFocus.focus) lastFocus.focus({preventScroll:true}); }

/* ---------------- wiring ---------------- */
function uiInit(){
  $('#verBtn').href=REPO_URL+'/releases'; $('#verBtn').querySelector('.ver').textContent=APP_VERSION; $('#ghBtn').href=REPO_URL;
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.closest('.modal'))));
  $$('.modal').forEach(m=>m.addEventListener('click',e=>{ if(e.target.classList.contains('modal-backdrop')) closeModal(m); }));
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') $$('.modal.show').forEach(closeModal); });

  const fileInput=$('#file-input'), pick=()=>fileInput.click();
  fileInput.onchange=e=>{ ingest([...e.target.files]); fileInput.value=''; };
  $('#importBtn').onclick=pick; $('#empty').onclick=pick;
  const panel=$('#panel'); let depth=0;
  panel.addEventListener('dragenter',e=>{ e.preventDefault(); depth++; panel.classList.add('drag'); });
  panel.addEventListener('dragover',e=>e.preventDefault());
  panel.addEventListener('dragleave',()=>{ if(--depth<=0){ depth=0; panel.classList.remove('drag'); } });
  panel.addEventListener('drop',e=>{ e.preventDefault(); depth=0; panel.classList.remove('drag'); ingest([...e.dataTransfer.files]); });

  $('#exportPreviewsBtn').onclick=()=>{ xp.tab='img'; openModal('export-modal'); };
  $('#exportBrushesBtn').onclick=()=>{ xp.tab='src'; openModal('export-modal'); };
  $('#settingsBtn').onclick=()=>openModal('settings-modal');

  $('#brush-grid').addEventListener('click',gridClick);
  $('#biAll').onchange=e=>{ biShowAll=e.target.checked; biRenderSettings(); };
  $('#selAll').onclick=()=>{ state.items.forEach(i=>i.selected=true); render(); };
  $('#selNone').onclick=()=>{ state.items.forEach(i=>i.selected=false); render(); };
  $('#selPro').onclick=()=>{ state.items.forEach(i=>i.selected=(i.type==='pro')); render(); };
  $('#clearAll').onclick=()=>{ const n=state.items.length; state.items=[]; lastClicked=-1; render(); toast(`Removed ${n} brush${n===1?'':'es'}`); };
  $('#vGrid').onclick=()=>{ view.mode='grid'; saveView(); render(); };
  $('#vList').onclick=()=>{ view.mode='list'; saveView(); render(); };
  $('#colpills').addEventListener('click',e=>{ const b=e.target.closest('[data-c]'); if(!b) return; view.cols[view.mode]=+b.dataset.c; saveView(); render(); });
  let rz; window.addEventListener('resize',()=>{ clearTimeout(rz); rz=setTimeout(()=>{ $('#brush-grid').style.gridTemplateColumns=`repeat(${effCols()},minmax(0,1fr))`; },120); });
  $('#biNav').addEventListener('click',e=>{ const b=e.target.closest('[data-sec]'); if(!b) return; const s=document.getElementById('bi-'+b.dataset.sec); if(s) $('#biScroll').scrollTo({top:s.offsetTop-4}); $$('#biNav [data-sec]').forEach(x=>x.classList.toggle('on',x===b)); });
  const tb=$('#topbar'); window.addEventListener('scroll',()=>tb.classList.toggle('stuck',window.scrollY>8),{passive:true});

  $('#doExportImg').onclick=exportImages;
  $('#doExportShapeGrain').onclick=exportShapeGrain;
  $('#doSplitBrush').onclick=splitToBrush;
  $('#doPackBrushset').onclick=packBrushset;
  $('#doAbrTip').onclick=abrTipsToPng;
  $('#doAbrToBrush').onclick=abrToBrush;
  xpInit(); stInit();
  applyAppearance(); render();
  idb.get('customBg').then(b=>{ if(b instanceof Blob){ customBgUrl=URL.createObjectURL(b); if(st.bg==='custom') applyAppearance(); } else if(st.bg==='custom'){ st.bg='aura'; applyAppearance(); } });
}
uiInit();

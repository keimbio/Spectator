/* =============================================================================
   COLOR THEMES: add or edit themes here.
   -----------------------------------------------------------------------------
   Each theme needs a name and six colors. Everything else (surfaces, borders,
   muted text, the light-mode version, text contrast) is worked out for you.

     light    text color in dark mode; page color in light mode
     accent   main highlight: Import button, selected brushes, sliders
     accent2  second highlight: blends into accent for gradients and badges
     deep     supporting color: chips, info badges, the aura background
     shade    tints the panels and cards (use dark again for a neutral look)
     dark     page color in dark mode; text color in light mode

   Optional: gradient: ['#hex','#hex','#hex'] overrides the accent gradient.
   To add a theme, copy one block, give it a new id and name, change the six
   colors, then rebuild (see INSTRUCTIONS.md, "Add a color theme").
   ========================================================================== */
const THEMES = [
  { id:'spectator', name:'Spectator',
    light:'#EACEA0', accent:'#E5A667', accent2:'#DDA527', deep:'#256D71', shade:'#3A3128', dark:'#1B1815',
    gradient:['#E5A667','#CC823F','#A84B25'] },
  { id:'aquamarine', name:'Aquamarine',
    light:'#AFC8FD', accent:'#8DEFC5', accent2:'#AFC8FD', deep:'#3A5874', shade:'#4B394F', dark:'#0D2401' },
  { id:'burnt-peach', name:'Burnt peach',
    light:'#FAFCD9', accent:'#FA6B40', accent2:'#B0C228', deep:'#535B1C', shade:'#4D1027', dark:'#4D1027' },
  { id:'sunlit-clay', name:'Sunlit clay',
    light:'#CCF7E4', accent:'#DE9F57', accent2:'#F1F6B1', deep:'#186B58', shade:'#300321', dark:'#300321' },
  { id:'twilight', name:'Twilight indigo',
    light:'#C5979D', accent:'#4B8F8C', accent2:'#C5979D', deep:'#484D6D', shade:'#2C365E', dark:'#2B193D' }
];

/* ---------- color math (sRGB) ---------- */
function tHex(c){ return rgbToHex(c[0],c[1],c[2]); }
function tMix(a,b,t){ const A=hexToRgb(a),B=hexToRgb(b); return tHex(A.map((v,i)=>v+(B[i]-v)*t)); }
function tContrast(a,b){ const x=relLum(a),y=relLum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
/* Move `c` toward `toward` until it reaches `ratio` contrast against `bg`. */
function tEnsure(c,bg,ratio,toward){ let out=c; for(let i=1;i<=20 && tContrast(out,bg)<ratio;i++) out=tMix(c,toward,i/20); return out; }
function tRgba(hex,a){ const [r,g,b]=hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

/* Build the CSS custom properties for one theme in one mode. */
function themeTokens(th,mode){
  const T={}, dark=mode!=='light', shade=th.shade||th.dark;
  if(dark){
    const bg=tMix(th.dark,'#000000',.45);
    T.bg=bg;
    T.panel=tMix(tMix(bg,shade,.35),th.light,.035);
    T.surface=tMix(tMix(bg,shade,.45),th.light,.075);
    T['surface-2']=tMix(tMix(bg,shade,.25),th.light,.02);
    T.line=tMix(T.panel,th.light,.12); T['line-2']=tMix(T.panel,th.light,.22);
    T.ink=tMix(th.light,'#FFFFFF',.55);
    T['ink-2']=tEnsure(tMix(th.light,T.panel,.3),T.panel,5.2,'#FFFFFF');
    T['ink-3']=tEnsure(tMix(th.light,T.panel,.52),T.panel,3.4,'#FFFFFF');
    T.accent=tEnsure(th.accent,T.panel,3.2,'#FFFFFF');
    T['accent-2']=tEnsure(th.accent2,T.panel,3.2,'#FFFFFF');
    T.deep=tEnsure(th.deep,T.panel,2.2,'#FFFFFF');
    T.stage=tMix(bg,'#000000',.25);
    T['check-a']=tMix(bg,th.light,.05); T['check-b']=tMix(bg,th.light,.1);
    T.scrim=tRgba(tMix(bg,'#000000',.4),.72);
    T.shadow='0 22px 48px rgba(0,0,0,.5)'; T['shadow-soft']='0 12px 26px rgba(0,0,0,.4)';
  } else {
    const bg=tMix(th.light,'#FFFFFF',.55);
    T.bg=bg;
    T.panel=tMix(th.light,'#FFFFFF',.86);
    T.surface=tMix(th.light,'#FFFFFF',.93);
    T['surface-2']=tMix(th.light,'#FFFFFF',.72);
    T.line=tMix(T.panel,th.dark,.12); T['line-2']=tMix(T.panel,th.dark,.22);
    T.ink=tMix(th.dark,'#000000',.4);
    T['ink-2']=tEnsure(tMix(th.dark,T.panel,.3),T.panel,5.2,'#000000');
    T['ink-3']=tEnsure(tMix(th.dark,T.panel,.48),T.panel,3.4,'#000000');
    T.accent=tEnsure(th.accent,T.panel,3.2,th.dark);
    T['accent-2']=tEnsure(th.accent2,T.panel,3,th.dark);
    T.deep=tEnsure(th.deep,T.panel,3,th.dark);
    // Brush previews are white strokes, so preview wells stay dark in light mode too.
    T.stage=tMix(th.dark,'#000000',.55);
    T['check-a']=tMix(T.stage,th.light,.05); T['check-b']=tMix(T.stage,th.light,.1);
    T.scrim=tRgba(tMix(th.dark,'#000000',.3),.45);
    T.shadow='0 22px 48px rgba(0,0,0,.16)'; T['shadow-soft']='0 10px 24px rgba(0,0,0,.12)';
  }
  T['accent-ink']=isLight(T.accent)?tMix(th.dark,'#000000',.5):'#FFFFFF';
  T['accent-soft']=tRgba(T.accent,dark?.14:.12);
  const g=th.gradient&&!dark?th.gradient.map(c=>tEnsure(c,T.panel,2.4,th.dark)):th.gradient;
  T.grad=g?`linear-gradient(135deg,${g.join(',')})`:`linear-gradient(135deg,${T.accent} 0%,${tMix(T.accent,T['accent-2'],.55)} 100%)`;
  T['grad-ink']=T['accent-ink'];
  T['grad-text']=g?`linear-gradient(135deg,${g.join(',')})`:`linear-gradient(135deg,${T.accent},${T['accent-2']})`;
  T['grad-2']=`linear-gradient(135deg,${T['accent-2']},${T.deep})`;
  T['grad-3']=`linear-gradient(135deg,${T.deep},${tMix(T.deep,T.accent,.5)})`;
  T.aura=[
    `radial-gradient(1100px 620px at 82% -8%, ${tRgba(th.accent,dark?.20:.30)} 0%, transparent 60%)`,
    `radial-gradient(900px 560px at -6% 22%, ${tRgba(th.deep,dark?.30:.22)} 0%, transparent 58%)`,
    `radial-gradient(1000px 700px at 55% 112%, ${tRgba(th.accent2,dark?.16:.26)} 0%, transparent 60%)`,
    `radial-gradient(700px 500px at 100% 70%, ${tRgba(shade,dark?.35:.18)} 0%, transparent 60%)`
  ].join(',');
  T['panel-a']=tRgba(T.panel,.9);
  return T;
}

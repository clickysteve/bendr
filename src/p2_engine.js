/* ---------------- shaders ---------------- */
const VS = "#version 300 es\n" +
"void main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2));" +
" gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }";

const COMMON = "#version 300 es\nprecision highp float;\nout vec4 O;\nuniform vec2 u_res;\n" +
"float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }\n" +
"vec3 rgb2yiq(vec3 c){ return vec3(dot(c,vec3(0.299,0.587,0.114)), dot(c,vec3(0.596,-0.274,-0.322)), dot(c,vec3(0.211,-0.523,0.312))); }\n" +
"vec3 yiq2rgb(vec3 y){ return vec3(y.x+0.956*y.y+0.621*y.z, y.x-0.272*y.y-0.647*y.z, y.x-1.106*y.y+1.703*y.z); }\n";

/* shared keyer: luma or chroma key with threshold/softness/invert */
const KEYFN =
"float keyOf(vec3 c, float mode, float hue, float th, float soft, float inv){\n" +
"  float v;\n" +
"  if(mode<0.5){ v = dot(c, vec3(0.299,0.587,0.114)); }\n" +
"  else {\n" +
"    vec3 yq = rgb2yiq(c);\n" +
"    float ang = atan(yq.z, yq.y);\n" +
"    float target = (hue*2.0-1.0)*3.14159;\n" +
"    float d = abs(atan(sin(ang-target), cos(ang-target)))/3.14159;\n" +
"    v = (1.0-d)*smoothstep(0.02,0.25,length(yq.yz));\n" +
"  }\n" +
"  float k = smoothstep(th-soft*0.5-0.001, th+soft*0.5+0.001, v);\n" +
"  return mix(k, 1.0-k, clamp(inv,0.0,1.0));\n}\n";

/* pass 1: A/B mix + feedback + frame-store echo */
const FS_FB = COMMON + KEYFN +
"uniform sampler2D u_src; uniform sampler2D u_srcB; uniform sampler2D u_prev; uniform sampler2D u_delayT;\n" +
"uniform float u_srcAspect,u_srcBAspect,u_hasSrc,u_hasB,u_hasDelay,u_time,u_mixMode,u_keyMode;\n" +
"uniform float u_fbAmount,u_fbZoom,u_fbRotate,u_fbHue,u_fbShiftX,u_fbShiftY,u_fbMode;\n" +
"uniform float u_abMix,u_echo,u_keyThresh,u_keySoft,u_keyInv,u_keyHue,u_keyFb;\n" +
"uniform float u_srcZoom,u_srcX,u_srcY,u_srcRot,u_edgeMode;\n" +
"vec3 fitSample(sampler2D tx, vec2 uv, float srcA, float outA){\n" +
"  vec2 p = uv-0.5;\n" +
"  if(srcA>outA){ p.y *= srcA/outA; } else { p.x *= outA/srcA; }\n" +
"  p += 0.5;\n" +
"  if(u_edgeMode>1.5){ vec2 t = fract(p*0.5)*2.0; p = 1.0-abs(t-1.0); }\n" +
"  else if(u_edgeMode>0.5){ p = fract(p); }\n" +
"  else if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0) return vec3(0.0);\n" +
"  return texture(tx, p).rgb;\n}\n" +
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  float outA = u_res.x/u_res.y;\n" +
"  /* frame transform: position / zoom / rotate the picture inside the raster */\n" +
"  vec2 fuv = uv-0.5;\n" +
"  float fa = u_srcRot*3.14159;\n" +
"  float fc = cos(fa), fs = sin(fa);\n" +
"  fuv = mat2(fc,-fs,fs,fc)*fuv;\n" +
"  fuv /= pow(8.0, u_srcZoom);\n" +
"  fuv += 0.5 - vec2(u_srcX, u_srcY)*1.5;\n" +
"  vec3 a = (u_hasSrc>0.5) ? fitSample(u_src, fuv, u_srcAspect, outA) : vec3(0.0);\n" +
"  vec3 src = a;\n" +
"  if(u_hasB>0.5 && u_abMix>0.001){\n" +
"    vec3 b = fitSample(u_srcB, fuv, u_srcBAspect, outA);\n" +
"    float m;\n" +
"    if(u_mixMode<0.5) m = u_abMix;\n" +
"    else m = u_abMix * keyOf(a, (u_mixMode<1.5)?0.0:1.0, u_keyHue, u_keyThresh, u_keySoft, u_keyInv);\n" +
"    src = mix(a, b, clamp(m,0.0,1.0));\n" +
"  }\n" +
"  vec2 p = uv-0.5;\n" +
"  float ang = u_fbRotate*1.0;\n" +
"  float ca = cos(ang), sa = sin(ang);\n" +
"  p = mat2(ca,-sa,sa,ca)*p;\n" +
"  p *= (1.0 - u_fbZoom*0.3);\n" +
"  p += vec2(u_fbShiftX,u_fbShiftY)*0.3;\n" +
"  vec3 prev = texture(u_prev, p+0.5).rgb;\n" +
"  float ha = u_fbHue*1.2;\n" +
"  vec3 py = rgb2yiq(prev);\n" +
"  float hc=cos(ha), hs=sin(ha);\n" +
"  py.yz = mat2(hc,-hs,hs,hc)*py.yz;\n" +
"  prev = yiq2rgb(py);\n" +
"  float fbA = u_fbAmount * mix(1.0, keyOf(src, u_keyMode, u_keyHue, u_keyThresh, u_keySoft, u_keyInv), u_keyFb);\n" +
"  vec3 col;\n" +
"  if(u_fbMode>0.5) col = max(src, prev*fbA);\n" +
"  else col = mix(src, prev, fbA);\n" +
"  if(u_hasDelay>0.5) col = mix(col, texture(u_delayT, uv).rgb, u_echo);\n" +
"  O = vec4(col,1.0);\n}\n";

/* pass 2: the bent signal path — physical sync model + NTSC + tape */
const FS_SIG = COMMON + KEYFN +
"uniform sampler2D u_tex; uniform sampler2D u_dispT;\n" +
"uniform float u_time,u_frame,u_bypass,u_rows,u_rollBar;\n" +
"uniform float u_vrollpos,u_humpos;\n" +
"uniform float u_jitter,u_humBar;\n" +
"uniform float u_chromaBleed,u_chromaDelay,u_rainbow,u_dotCrawl,u_ringing,u_signalNoise,u_chromaNoise;\n" +
"uniform float u_lumaBleed,u_bleedDir,u_vBleed;\n" +
"uniform float u_dropout,u_genLoss;\n" +
"uniform float u_keyMode,u_keyThresh,u_keySoft,u_keyInv,u_keyHue,u_keyFx;\n" +
"float lum(vec2 p){ return dot(texture(u_tex, fract(p)).rgb, vec3(0.299,0.587,0.114)); }\n" +
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  if(u_bypass>0.5){ O = texture(u_tex,uv); return; }\n" +
"  float t = u_time;\n" +
"  /* per-scanline sync signal from the CPU PLL model: x=displacement y=AGC gain z=noise gain */\n" +
"  float row = uv.y*u_rows;\n" +
"  int i0 = clamp(int(row),0,int(u_rows)-1);\n" +
"  int i1 = min(i0+1,int(u_rows)-1);\n" +
"  vec4 D = mix(texelFetch(u_dispT,ivec2(i0,0),0), texelFetch(u_dispT,ivec2(i1,0),0), fract(row));\n" +
"  float dx = D.x, rowGain = D.y, noiseG = D.z;\n" +
"  float rowI = floor(uv.y*u_res.y);\n" +
"  dx += (h21(vec2(rowI, floor(t*479.0)))-0.5)*0.0018*u_jitter;\n" +
"  /* interlace comb shimmer */\n" +
"  float dy = u_vrollpos + ((mod(u_frame,2.0)<1.0)?0.5:-0.5)*(0.25+0.75*u_jitter)/u_res.y;\n" +
"  vec2 suv = vec2(uv.x+dx, fract(uv.y+dy));\n" +
"  /* ---- composite / NTSC decode ---- */\n" +
"  float px = 1.0/u_res.x;\n" +
"  vec3 c0 = rgb2yiq(texture(u_tex, fract(suv)).rgb);\n" +
"  float y = c0.x;\n" +
"  float yl = lum(suv-vec2(2.0*px,0.0)), yr = lum(suv+vec2(2.0*px,0.0));\n" +
"  y += u_ringing*1.4*(y - 0.5*(yl+yr));\n" +
"  vec2 iq = vec2(0.0);\n" +
"  float spread = mix(0.6, 11.0, u_chromaBleed);\n" +
"  float cdel = u_chromaDelay*10.0*px;\n" +
"  for(int i=0;i<9;i++){\n" +
"    float fi = float(i)-2.5;\n" +
"    vec2 sp = fract(suv + vec2(fi*spread*px - cdel, 0.0));\n" +
"    iq += rgb2yiq(texture(u_tex, sp).rgb).yz;\n" +
"  }\n" +
"  iq /= 9.0;\n" +
"  float edge = lum(suv+vec2(px,0.0)) - lum(suv-vec2(px,0.0));\n" +
"  float ph = suv.x*u_res.x*1.85 + rowI*2.3 + t*10.0;\n" +
"  iq += u_rainbow*edge*2.6*vec2(sin(ph), cos(ph*0.93));\n" +
"  float crawl = sin(suv.x*u_res.x*3.14159 + rowI*3.14159 + t*7.0);\n" +
"  y += u_dotCrawl*length(iq)*crawl*0.35;\n" +
"  float ys = 0.25*(lum(suv-vec2(3.0*px,0.0)) + lum(suv+vec2(3.0*px,0.0)) + lum(suv-vec2(6.0*px,0.0)) + lum(suv+vec2(6.0*px,0.0)));\n" +
"  y = mix(y, ys, u_genLoss*0.7);\n" +
"  iq *= 1.0 - u_genLoss*0.45;\n" +
"  /* luma bleed: hot signal smears along the scan direction */\n" +
"  if(u_lumaBleed>0.003){\n" +
"    float bdir = (u_bleedDir>=0.0)?1.0:-1.0;\n" +
"    float bstep = (2.0+9.0*abs(u_bleedDir))*px*bdir;\n" +
"    float fall = 0.22*(1.05-u_lumaBleed);\n" +
"    float acc = y;\n" +
"    for(int k=1;k<=6;k++){\n" +
"      float tk = lum(suv - vec2(float(k)*bstep, 0.0)) - float(k)*fall;\n" +
"      acc = max(acc, tk);\n" +
"    }\n" +
"    y = mix(y, acc, min(1.0, u_lumaBleed*1.4));\n" +
"  }\n" +
"  /* vertical bleed: colour drips across scanlines */\n" +
"  if(u_vBleed>0.003){\n" +
"    float pyx = 1.0/u_res.y;\n" +
"    vec2 iqv = vec2(0.0);\n" +
"    float wsum = 0.0;\n" +
"    for(int k=1;k<=4;k++){\n" +
"      float w = 1.0/float(k);\n" +
"      iqv += w*rgb2yiq(texture(u_tex, fract(suv + vec2(0.0, float(k)*(1.0+u_vBleed*5.0)*pyx))).rgb).yz;\n" +
"      wsum += w;\n" +
"    }\n" +
"    iq = mix(iq, iqv/wsum, u_vBleed*0.75);\n" +
"  }\n" +
"  /* ---- analogue noise: bandwidth-limited along the line, streaky by row ---- */\n" +
"  float nx = suv.x*u_res.x/3.5;\n" +
"  float nseed = rowI*7.13 + floor(t*61.0)*13.7;\n" +
"  float nb = mix(h21(vec2(floor(nx),nseed)), h21(vec2(floor(nx)+1.0,nseed)), smoothstep(0.0,1.0,fract(nx)));\n" +
"  float streak = smoothstep(0.55,0.95,h21(vec2(rowI, floor(t*61.0)+3.0)));\n" +
"  y += (nb-0.5)*(u_signalNoise*(0.22+0.85*streak) + noiseG*0.55 + u_genLoss*0.1);\n" +
"  y += (h21(suv*u_res+fract(t)*vec2(31.7,17.3))-0.5)*u_signalNoise*0.1;\n" +
"  iq += (vec2(h21(vec2(floor(nx)*1.7,nseed+31.0)), h21(vec2(floor(nx)*2.3,nseed+57.0)))-0.5)*u_chromaNoise*0.55;\n" +
"  iq *= 1.0/(1.0+noiseG*2.5);\n" +
"  /* dropouts — comet-tail streaks */\n" +
"  float dr = h21(vec2(rowI*1.31, floor(t*24.0)));\n" +
"  if(dr < u_dropout*0.05){\n" +
"    float xs = h21(vec2(rowI, floor(t*24.0)+7.0));\n" +
"    float len = 0.06 + h21(vec2(rowI,99.0))*0.5;\n" +
"    float f = (suv.x-xs)/len;\n" +
"    if(f>0.0 && f<1.0){ float k = pow(1.0-f,1.8)*0.95; y = mix(y,1.05,k); iq *= 1.0-k; }\n" +
"  }\n" +
"  /* hum bar */\n" +
"  float hb = smoothstep(0.18,0.0,abs(fract(uv.y-u_humpos)-0.5))*u_humBar;\n" +
"  y -= hb*0.25;\n" +
"  /* vertical blanking bar rolls through when v-hold slips */\n" +
"  float bw2 = min(suv.y, 1.0-suv.y);\n" +
"  float bar = smoothstep(0.05,0.018,bw2)*u_rollBar;\n" +
"  if(bar>0.001){ float syncp = 0.03 + 0.2*h21(vec2(floor(suv.x*32.0), rowI)); y = mix(y, syncp, bar*0.92); iq *= 1.0-bar*0.9; }\n" +
"  /* AGC breathing */\n" +
"  y = (y-0.02)*rowGain + 0.02 - (1.0-rowGain)*0.06;\n" +
"  vec3 wet = yiq2rgb(vec3(y,iq));\n" +
"  /* keyer: apply the damage only inside (or outside) the key */\n" +
"  if(u_keyFx>0.001){\n" +
"    vec3 dry = texture(u_tex, uv).rgb;\n" +
"    float km = keyOf(dry, u_keyMode, u_keyHue, u_keyThresh, u_keySoft, u_keyInv);\n" +
"    wet = mix(dry, wet, 1.0 - u_keyFx*(1.0-km));\n" +
"  }\n" +
"  O = vec4(wet, 1.0);\n}\n";

/* pass 3: bent enhancer + colour stage */
const FS_COL = COMMON + KEYFN +
"uniform sampler2D u_tex;\n" +
"uniform float u_time,u_bypass,u_saturation,u_hue,u_brightness,u_contrast,u_posterize,u_solarize,u_glow;\n" +
"uniform float u_colorize,u_colorBands,u_colorSweep,u_lumaHue,u_sharpEcho,u_echoSpace,u_rgbSep,u_invFlick;\n" +
"uniform float u_rGain,u_gGain,u_bGain;\n" +
"uniform float u_keyMode,u_keyThresh,u_keySoft,u_keyInv,u_keyHue,u_keyFx,u_showKey;\n" +
"float lum(vec2 p){ return dot(texture(u_tex, clamp(p,0.0,1.0)).rgb, vec3(0.299,0.587,0.114)); }\n" +
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  if(u_showKey>0.5){ float km = keyOf(texture(u_tex,uv).rgb, u_keyMode, u_keyHue, u_keyThresh, u_keySoft, u_keyInv); O = vec4(vec3(km),1.0); return; }\n" +
"  if(u_bypass>0.5){ O=texture(u_tex,uv); return; }\n" +
"  float px = 1.0/u_res.x;\n" +
"  /* bent enhancer: RGB channel split */\n" +
"  float sep = u_rgbSep*20.0*px;\n" +
"  vec3 c;\n" +
"  c.r = texture(u_tex, uv+vec2(sep,0.0)).r;\n" +
"  c.g = texture(u_tex, uv).g;\n" +
"  c.b = texture(u_tex, uv-vec2(sep,0.0)).b;\n" +
"  /* enhancer front panel: per-channel gain knobs */\n" +
"  c *= vec3(u_rGain, u_gGain, u_bGain);\n" +
"  /* bent enhancer: sharpness circuit driven into oscillation — repeated edge ghosts */\n" +
"  if(u_sharpEcho>0.001){\n" +
"    float y0 = dot(c, vec3(0.299,0.587,0.114));\n" +
"    float sp = (2.0+u_echoSpace*22.0)*px;\n" +
"    float e = 0.0; float w = 1.0;\n" +
"    for(int k=1;k<=5;k++){ w *= 0.72; e += w*(y0 - lum(uv - vec2(float(k)*sp, 0.0))); }\n" +
"    c += u_sharpEcho*2.2*e*vec3(1.25,1.0,1.45);\n" +
"  }\n" +
"  vec3 y = rgb2yiq(c);\n" +
"  /* luma-driven hue slew (colours chase brightness) */\n" +
"  float ha = u_hue*6.2832 + clamp(y.x,0.0,1.0)*u_lumaHue*6.2832;\n" +
"  float hc=cos(ha), hs=sin(ha);\n" +
"  y.yz = mat2(hc,-hs,hs,hc)*y.yz;\n" +
"  y.yz *= u_saturation;\n" +
"  y.x = (y.x-0.5)*u_contrast + 0.5 + u_brightness*0.5;\n" +
"  c = yiq2rgb(y);\n" +
"  /* bent enhancer: luma-keyed rainbow colorizer */\n" +
"  if(u_colorize>0.001){\n" +
"    float hph = clamp(y.x,0.0,1.2)*u_colorBands + u_time*u_colorSweep*0.55;\n" +
"    vec3 pal = 0.5+0.5*cos(6.2832*(hph + vec3(0.0,0.33,0.67)));\n" +
"    pal *= 0.3+1.0*smoothstep(0.02,0.85,y.x);\n" +
"    c = mix(c, pal, u_colorize);\n" +
"  }\n" +
"  if(u_solarize>0.001){ c = mix(c, abs(1.0-abs(1.0-2.0*c)), u_solarize); }\n" +
"  /* bent enhancer: flickering luma-keyed inversion */\n" +
"  if(u_invFlick>0.001){\n" +
"    float gate = step(fract(u_time*(1.5+13.0*u_invFlick)), 0.5);\n" +
"    float thr = 0.45+0.3*sin(u_time*0.9);\n" +
"    float m = gate*step(thr, dot(c,vec3(0.333)));\n" +
"    c = mix(c, 1.0-c, m*min(1.0,u_invFlick*1.6));\n" +
"  }\n" +
"  if(u_posterize>0.001){ float L = 2.0 + (1.0-u_posterize)*14.0; c = mix(c, floor(c*L+0.5)/L, min(u_posterize*2.0,1.0)); }\n" +
"  c += c*c*u_glow*0.8;\n" +
"  if(u_keyFx>0.001){\n" +
"    vec3 dry = texture(u_tex, uv).rgb;\n" +
"    float km = keyOf(dry, u_keyMode, u_keyHue, u_keyThresh, u_keySoft, u_keyInv);\n" +
"    c = mix(dry, c, 1.0 - u_keyFx*(1.0-km));\n" +
"  }\n" +
"  O = vec4(clamp(c,0.0,1.4), 1.0);\n}\n";

/* pass 4: CRT to screen */
const FS_CRT = COMMON +
"uniform sampler2D u_tex;\n" +
"uniform vec2 u_procRes;\n" +
"uniform float u_scanlines,u_aperture,u_curvature,u_vignette,u_time;\n" +
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  vec2 p = uv*2.0-1.0;\n" +
"  p *= 1.0 + u_curvature*0.09*dot(p,p);\n" +
"  vec2 cuv = p*0.5+0.5;\n" +
"  if(cuv.x<0.0||cuv.x>1.0||cuv.y<0.0||cuv.y>1.0){ O=vec4(0.0,0.0,0.0,1.0); return; }\n" +
"  vec3 c = texture(u_tex, cuv).rgb;\n" +
"  float scan = 1.0 - u_scanlines*0.4*(0.5+0.5*cos(cuv.y*u_procRes.y*6.2832));\n" +
"  c *= scan;\n" +
"  float m = mod(gl_FragCoord.x, 3.0);\n" +
"  vec3 mask = vec3(m<1.0?1.0:0.6, (m>=1.0&&m<2.0)?1.0:0.6, m>=2.0?1.0:0.6);\n" +
"  c *= mix(vec3(1.0), mask*1.25, u_aperture*0.7);\n" +
"  c *= 1.0 - u_vignette*0.9*pow(length(p*0.75), 2.6);\n" +
"  O = vec4(c,1.0);\n}\n";

/* ---------------- parameter registry ---------------- */
const SECTIONS = [
  {id:"mixer",    name:"INPUT MIXER — VIDEO A/B", cls:"mag"},
  {id:"morph",    name:"PRESET MORPH",      cls:"mag"},
  {id:"frame",    name:"FRAME / POSITION",  cls:"mag"},
  {id:"enhancer", name:"BENT ENHANCER",     cls:"mag"},
  {id:"feedback", name:"FEEDBACK / RESCAN", cls:"mag"},
  {id:"time",     name:"TIME BASE",         cls:"mag"},
  {id:"keyer",    name:"KEYER",             cls:"cyan"},
  {id:"signal",   name:"COMPOSITE SIGNAL",  cls:""},
  {id:"sync",     name:"SYNC CORRUPTION",   cls:""},
  {id:"vhs",      name:"TAPE TRANSPORT",    cls:""},
  {id:"color",    name:"COLOUR STAGE",      cls:"cyan"},
  {id:"crt",      name:"CRT DISPLAY",       cls:"cyan"},
];
const PDEF = [
  ["abMix","A>B MIX","mixer",0,1,0],
  ["morph","MORPH A>B","morph",0,1,0],

  ["srcZoom","ZOOM","frame",-1,1,0],
  ["srcX","POS X","frame",-1,1,0],
  ["srcY","POS Y","frame",-1,1,0],
  ["srcRot","ROTATE","frame",-1,1,0],

  ["echo","ECHO","time",0,1,0],
  ["delayF","DELAY FRM","time",1,29,3],
  ["stutter","STUTTER","time",0,1,0],

  ["keyThresh","THRESHOLD","keyer",0,1,0.5],
  ["keySoft","SOFTNESS","keyer",0.01,1,0.2],
  ["keyInv","INVERT","keyer",0,1,0],
  ["keyHue","KEY HUE","keyer",0,1,0.33],
  ["keyFx","KEY>FX","keyer",0,1,0],
  ["keyFb","KEY>FB","keyer",0,1,0],

  ["colorize","RAINBOW MAP","enhancer",0,1,0],
  ["colorBands","MAP BANDS","enhancer",0.3,5,1.5],
  ["colorSweep","MAP SWEEP","enhancer",0,1,0.15],
  ["lumaHue","LUMA HUE","enhancer",0,1,0],
  ["sharpEcho","EDGE RING","enhancer",0,1,0],
  ["echoSpace","RING SPACE","enhancer",0,1,0.3],
  ["rgbSep","RGB SPLIT","enhancer",0,1,0],
  ["invFlick","INV FLICKER","enhancer",0,1,0],

  ["fbAmount","AMOUNT","feedback",0,0.97,0],
  ["fbZoom","ZOOM","feedback",-1,1,0],
  ["fbRotate","ROTATE","feedback",-1,1,0],
  ["fbHue","HUE SPIN","feedback",0,1,0],
  ["fbShiftX","SHIFT X","feedback",-1,1,0],
  ["fbShiftY","SHIFT Y","feedback",-1,1,0],

  ["chromaBleed","CHR BLEED","signal",0,1,0.25],
  ["chromaDelay","CHR DELAY","signal",-1,1,0],
  ["lumaBleed","LUMA BLEED","signal",0,1,0],
  ["bleedDir","BLEED DIR","signal",-1,1,0.5],
  ["vBleed","V BLEED","signal",0,1,0],
  ["rainbow","RAINBOW","signal",0,1,0.1],
  ["dotCrawl","DOT CRAWL","signal",0,1,0.1],
  ["ringing","RINGING","signal",0,1,0.15],
  ["signalNoise","LUMA NOISE","signal",0,1,0.05],
  ["chromaNoise","CHR NOISE","signal",0,1,0.05],

  ["hWobble","H WOBBLE","sync",0,1,0.05],
  ["wobbleFreq","WOB FREQ","sync",0,1,0.2],
  ["tear","TEAR","sync",0,1,0],
  ["tearSize","TEAR SIZE","sync",0,1,0.4],
  ["vRoll","V ROLL","sync",-1,1,0],
  ["jitter","JITTER","sync",0,1,0.1],
  ["humBar","HUM BAR","sync",0,1,0.1],

  ["tracking","TRACKING","vhs",0,1,0],
  ["dropout","DROPOUT","vhs",0,1,0],
  ["headSwitch","HEAD SW","vhs",0,1,0.3],
  ["tapeWow","TAPE WOW","vhs",0,1,0.15],
  ["genLoss","GEN LOSS","vhs",0,1,0.1],

  ["rGain","RED GAIN","color",0,2,1],
  ["gGain","GREEN GAIN","color",0,2,1],
  ["bGain","BLUE GAIN","color",0,2,1],
  ["saturation","SATURATE","color",0,2.5,1],
  ["hue","HUE","color",0,1,0],
  ["brightness","BRIGHT","color",-1,1,0],
  ["contrast","CONTRAST","color",0.2,2.5,1],
  ["posterize","POSTERIZE","color",0,1,0],
  ["solarize","SOLARIZE","color",0,1,0],
  ["glow","GLOW","color",0,1,0.15],

  ["scanlines","SCANLINES","crt",0,1,0.18],
  ["aperture","RGB MASK","crt",0,1,0.12],
  ["curvature","CURVATURE","crt",0,1,0.3],
  ["vignette","VIGNETTE","crt",0,1,0.35],
];
const P = {};           // id -> param object
const PLIST = [];
for(const [id,name,sec,min,max,def] of PDEF){
  const p = {id,name,sec,min,max,def,base:def,cur:def};
  P[id]=p; PLIST.push(p);
}
let fbTrailMode = false;   // false=MIX  true=TRAIL(lighten)
let rescanMode = false;    // true = feedback taps the CRT-processed output (full rescan)
let chainSwap = false;     // true = colour/enhancer stage runs BEFORE the tape/sync stage
let keyChroma = false;     // keyer mode: false=luma true=chroma
let mixMode = 0;           // A/B mixer: 0=fade 1=luma key 2=chroma key
let edgeMode = 0;          // frame edge: 0=black 1=tile 2=mirror
let showKeyMatte = false;  // keyer matte viewer

/* ---------------- GL engine ---------------- */
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl2", {preserveDrawingBuffer:true, antialias:false, alpha:false});
if(!gl){ document.body.innerHTML = "<p style='padding:40px;font-family:monospace'>WebGL2 not available in this browser.</p>"; throw new Error("no webgl2"); }

function makeShader(type, src){
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
    const log = gl.getShaderInfoLog(s);
    console.error("SHADER ERROR:\n"+log);
    toast("Shader error — see console", true);
    throw new Error(log);
  }
  return s;
}
function makeProg(fsSrc){
  const p = gl.createProgram();
  gl.attachShader(p, makeShader(gl.VERTEX_SHADER, VS));
  gl.attachShader(p, makeShader(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return {prog:p, loc:{}};
}
function U(pr, name){
  if(!(name in pr.loc)) pr.loc[name] = gl.getUniformLocation(pr.prog, name);
  return pr.loc[name];
}
const progFB = makeProg(FS_FB), progSIG = makeProg(FS_SIG), progCOL = makeProg(FS_COL), progCRT = makeProg(FS_CRT);

function makeRT(w,h){
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return {tex, fbo, w, h};
}
let procW=1280, procH=720;
let rtA, rtB, finalA, finalB, rtCRT;
let ring=null, ringW=0, ringFilled=0;
const RING_N = 30;
function clearRing(){
  if(ring){ for(const rt of ring){ gl.deleteTexture(rt.tex); gl.deleteFramebuffer(rt.fbo); } }
  ring=null; ringW=0; ringFilled=0;
}
function ensureRing(){
  if(!ring){ ring=[]; for(let i=0;i<RING_N;i++) ring.push(makeRT(procW,procH)); ringW=0; ringFilled=0; }
}
function allocRTs(){
  for(const rt of [rtA,rtB,finalA,finalB,rtCRT]) if(rt){ gl.deleteTexture(rt.tex); gl.deleteFramebuffer(rt.fbo); }
  rtA = makeRT(procW,procH); rtB = makeRT(procW,procH);
  finalA = makeRT(procW,procH); finalB = makeRT(procW,procH);
  rtCRT = makeRT(procW,procH);
  clearRing();
}
function setProcRes(h){
  procH = h; procW = Math.round(h*16/9/2)*2;
  allocRTs();
}
setProcRes(720);

function makeSrcTex(){
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,2,2,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(16));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
const srcTex = makeSrcTex();
const srcTexB = makeSrcTex();

/* per-scanline sync model texture (written by CPU each frame) */
const SROWS = 576;
const dispTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, dispTex);
gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,SROWS,1,0,gl.RGBA,gl.FLOAT,null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

function setParamUniforms(pr){
  for(const p of PLIST){
    const loc = U(pr, "u_"+p.id);
    if(loc) gl.uniform1f(loc, p.cur);
  }
}
function draw(){ gl.drawArrays(gl.TRIANGLES, 0, 3); }

/* animated signal state */
let vrollpos=0, trackpos=0.7, humpos=0, frameNo=0, bypass=0;
let srcAspect=16/9, hasSrc=0;

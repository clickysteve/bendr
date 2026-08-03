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

/* pass 1 (per channel): source framing + feedback + frame-store echo */
const FS_FB = COMMON + KEYFN +
"uniform sampler2D u_src; uniform sampler2D u_prev; uniform sampler2D u_delayT;\n" +
"uniform float u_srcAspect,u_hasSrc,u_hasDelay,u_time,u_keyMode;\n" +
"uniform float u_fbAmount,u_fbZoom,u_fbRotate,u_fbHue,u_fbShiftX,u_fbShiftY,u_fbMode;\n" +
"uniform float u_echo,u_keyThresh,u_keySoft,u_keyInv,u_keyHue,u_keyFb;\n" +
"uniform float u_srcZoom,u_srcX,u_srcY,u_srcRot,u_edgeMode;\n" +
"uniform float u_kaleido,u_kaleidoN,u_kaleidoRot,u_kaleidoX,u_kaleidoY;\n" +
"uniform float u_fbShearX,u_fbShearY,u_fbGainR,u_fbGainG,u_fbGainB,u_fbSat,u_fbVal,u_fbPost,u_fbChromOff;\n" +
"uniform float u_fbBlur,u_fbBlur2,u_fbSharp,u_fbDrive,u_fbPivot,u_fbThresh,u_fbThreshSoft;\n" +
"uniform float u_fbNoise,u_fbNoiseScale,u_fbRoll,u_fbJitter;\n" +
"uniform float u_fbWrap,u_fbMirror,u_fbBlend,u_fbNL,u_fbInvert,u_autoGain;\n" +
"vec2 wrapUV(vec2 p){\n" +
"  if(u_fbWrap>1.5){ vec2 t=fract(p*0.5)*2.0; return 1.0-abs(t-1.0); }\n" +
"  if(u_fbWrap>0.5) return fract(p);\n" +
"  return clamp(p, 0.0, 1.0);\n}\n" +
"vec3 tapPrev(vec2 p){ return texture(u_prev, wrapUV(p)).rgb; }\n" +
"vec3 blurPrev(vec2 p, float r){\n" +
"  if(r<0.002) return tapPrev(p);\n" +
"  vec2 px = r*9.0/u_res;\n" +
"  vec3 a = tapPrev(p)*0.28;\n" +
"  a += tapPrev(p+vec2(px.x,0))*0.12 + tapPrev(p-vec2(px.x,0))*0.12;\n" +
"  a += tapPrev(p+vec2(0,px.y))*0.12 + tapPrev(p-vec2(0,px.y))*0.12;\n" +
"  a += tapPrev(p+px*0.7)*0.06 + tapPrev(p-px*0.7)*0.06;\n" +
"  a += tapPrev(p+vec2(px.x,-px.y)*0.7)*0.06 + tapPrev(p+vec2(-px.x,px.y)*0.7)*0.06;\n" +
"  return a/1.0;\n}\n" +
"vec3 nonlin(vec3 c){\n" +
"  c = (c - u_fbPivot)*u_fbDrive + u_fbPivot;\n" +
"  if(u_fbNL<0.5) return clamp(c, 0.0, 1.0);\n" +
"  if(u_fbNL<1.5) return vec3(0.5) + tanh((c-0.5)*1.9)*0.5;\n" +
"  if(u_fbNL<2.5) return fract(max(c,0.0));\n" +
"  vec3 f = abs(fract(max(c,0.0)*0.5)*2.0-1.0); return f;\n}\n" +
"vec2 frameXf(vec2 uv, float rot, float zoom, float px, float py){\n" +
"  vec2 q = uv-0.5;\n" +
"  float a = rot*3.14159;\n" +
"  float c = cos(a), s = sin(a);\n" +
"  q = mat2(c,-s,s,c)*q;\n" +
"  q /= pow(8.0, zoom);\n" +
"  return q + 0.5 - vec2(px,py)*1.5;\n}\n" +
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
"  vec2 kuv = uv;\n" +
"  if(u_kaleido>0.003){\n" +
"    vec2 ctr = vec2(0.5) + vec2(u_kaleidoX, u_kaleidoY)*0.5;\n" +
"    vec2 q = (uv - ctr) * vec2(u_res.x/u_res.y, 1.0);\n" +
"    float ang = atan(q.y, q.x) + u_kaleidoRot*3.14159;\n" +
"    float rad = length(q);\n" +
"    float seg = 6.28318/max(2.0, floor(u_kaleidoN));\n" +
"    ang = mod(ang, seg);\n" +
"    ang = abs(ang - seg*0.5);\n" +
"    vec2 f = ctr + vec2(cos(ang), sin(ang))*rad / vec2(u_res.x/u_res.y, 1.0);\n" +
"    kuv = mix(uv, f, clamp(u_kaleido,0.0,1.0));\n" +
"  }\n" +
"  vec2 fuv = frameXf(kuv, u_srcRot, u_srcZoom, u_srcX, u_srcY);\n" +
"  vec3 src = (u_hasSrc>0.5) ? fitSample(u_src, fuv, u_srcAspect, outA) : vec3(0.0);\n" +
"  /* ---- feedback loop warp ---- */\n" +
"  vec2 p = uv-0.5;\n" +
"  if(u_fbMirror>0.5){\n" +
"    if(u_fbMirror<1.5) p.x = abs(p.x);\n" +
"    else if(u_fbMirror<2.5) p.y = abs(p.y);\n" +
"    else p = abs(p);\n" +
"  }\n" +
"  float ang = u_fbRotate*1.0;\n" +
"  float ca = cos(ang), sa = sin(ang);\n" +
"  p = mat2(ca,-sa,sa,ca)*p;\n" +
"  p += vec2(p.y*u_fbShearX*0.4, p.x*u_fbShearY*0.4);\n" +
"  p *= (1.0 - u_fbZoom*0.3);\n" +
"  p += vec2(u_fbShiftX,u_fbShiftY)*0.3;\n" +
"  p.y += u_fbRoll*0.05;\n" +
"  if(u_fbJitter>0.003 && h21(vec2(floor(u_time*60.0),7.0)) < u_fbJitter*0.4) p.y += 0.01;\n" +
"  p += 0.5;\n" +
"  /* ---- loop filter: blur, DoG sharpen ---- */\n" +
"  vec3 prev = blurPrev(p, u_fbBlur);\n" +
"  if(u_fbSharp>0.003 || u_fbBlur2>0.003){\n" +
"    vec3 wide = blurPrev(p, max(u_fbBlur2, u_fbBlur*3.0+0.05));\n" +
"    prev += (prev - wide)*u_fbSharp;\n" +
"  }\n" +
"  /* ---- chromatic displacement in the loop ---- */\n" +
"  if(abs(u_fbChromOff)>0.003){\n" +
"    float co = u_fbChromOff*6.0/u_res.x;\n" +
"    prev.r = tapPrev(p+vec2(co,0.0)).r;\n" +
"    prev.b = tapPrev(p-vec2(co,0.0)).b;\n" +
"  }\n" +
"  /* ---- colour per pass ---- */\n" +
"  float ha = u_fbHue*1.2;\n" +
"  vec3 py = rgb2yiq(prev);\n" +
"  float hc=cos(ha), hs=sin(ha);\n" +
"  py.yz = mat2(hc,-hs,hs,hc)*py.yz;\n" +
"  py.yz *= u_fbSat;\n" +
"  py.x *= u_fbVal;\n" +
"  prev = yiq2rgb(py);\n" +
"  prev *= vec3(u_fbGainR, u_fbGainG, u_fbGainB) * u_autoGain;\n" +
"  if(u_fbInvert>0.5) prev = 1.0-prev;\n" +
"  if(u_fbPost>0.003){ float L=2.0+(1.0-u_fbPost)*14.0; prev = mix(prev, floor(prev*L+0.5)/L, min(u_fbPost*2.0,1.0)); }\n" +
"  if(u_fbThresh>0.003){\n" +
"    float lv = dot(prev, vec3(0.299,0.587,0.114));\n" +
"    float k = smoothstep(u_fbThresh-u_fbThreshSoft, u_fbThresh+u_fbThreshSoft, lv);\n" +
"    prev = mix(prev*0.15, prev, k);\n" +
"  }\n" +
"  if(u_fbNoise>0.003){\n" +
"    float ns = mix(120.0, 6.0, u_fbNoiseScale);\n" +
"    vec3 n3 = vec3(h21(floor(uv*ns)+fract(u_time)*17.0),\n" +
"                   h21(floor(uv*ns)+fract(u_time)*31.0+5.0),\n" +
"                   h21(floor(uv*ns)+fract(u_time)*43.0+9.0)) - 0.5;\n" +
"    prev += n3*u_fbNoise*0.06;\n" +
"  }\n" +
"  prev = nonlin(prev);\n" +
"  /* ---- inject the live source ---- */\n" +
"  float fbA = u_fbAmount * mix(1.0, keyOf(src, u_keyMode, u_keyHue, u_keyThresh, u_keySoft, u_keyInv), u_keyFb);\n" +
"  vec3 col;\n" +
"  if(u_fbMode>0.5) col = max(src, prev*fbA);\n" +
"  else if(u_fbBlend<0.5) col = mix(src, prev, fbA);\n" +
"  else if(u_fbBlend<1.5) col = src + prev*fbA;\n" +
"  else if(u_fbBlend<2.5) col = 1.0-(1.0-src)*(1.0-prev*fbA);\n" +
"  else if(u_fbBlend<3.5) col = max(src, prev*fbA);\n" +
"  else if(u_fbBlend<4.5) col = mix(src, min(src, prev), fbA);\n" +
"  else col = mix(src, abs(src-prev), fbA);\n" +
"  if(u_hasDelay>0.5) col = mix(col, texture(u_delayT, uv).rgb, u_echo);\n" +
"  O = vec4(clamp(col, -0.5, 2.0),1.0);\n}\n";

/* mixer: combines the two fully-processed channels — fader, wipes, keys, blends */
const FS_MIX = COMMON + KEYFN +
"uniform sampler2D u_texA; uniform sampler2D u_texB;\n" +
"uniform float u_mixMode,u_hasB,u_abMix;\n" +
"uniform float u_wipeSoft,u_wipeDetail,u_wipeX,u_wipeY,u_wipeInv;\n" +
"uniform float u_mixKeyThresh,u_mixKeySoft,u_mixKeyInv,u_mixKeyHue;\n" +
"float wipeField(vec2 uv, float mode, float outA){\n" +
"  vec2 c = uv - 0.5 - vec2(u_wipeX, u_wipeY)*0.5;\n" +
"  float n = 2.0 + floor(u_wipeDetail*14.0);\n" +
"  if(mode<1.5) return uv.x;\n" +
"  if(mode<2.5) return 1.0-uv.y;\n" +
"  if(mode<3.5) return (uv.x + (1.0-uv.y))*0.5;\n" +
"  if(mode<4.5) return max(abs(c.x)*2.0, abs(c.y)*2.0);\n" +
"  if(mode<5.5) return clamp(length(c*vec2(outA,1.0))*1.9, 0.0, 1.0);\n" +
"  if(mode<6.5) return abs(c.x)*2.0;\n" +
"  if(mode<7.5) return abs(c.y)*2.0;\n" +
"  if(mode<8.5) return fract(uv.x*n);\n" +
"  if(mode<9.5) return fract(uv.y*n);\n" +
"  if(mode<10.5){ float a = atan(c.y, c.x)/6.2832 + 0.5; return fract(a); }\n" +
"  if(mode<11.5) return fract((uv.x + uv.y)*n*0.5);\n" +
"  if(mode<12.5) return h21(floor(uv*vec2(n*2.0, n)));\n" +
"  return 0.0;\n}\n" +
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  float outA = u_res.x/u_res.y;\n" +
"  vec3 a = texture(u_texA, uv).rgb;\n" +
"  if(u_hasB<0.5 || u_abMix<0.0005){ O = vec4(a,1.0); return; }\n" +
"  vec3 b = texture(u_texB, uv).rgb;\n" +
"  vec3 src;\n" +
"  float mm = u_mixMode;\n" +
"  if(mm < 0.5){ src = mix(a, b, u_abMix); }\n" +
"  else if(mm < 12.5){\n" +
"    float d = wipeField(uv, mm, outA);\n" +
"    if(u_wipeInv>0.5) d = 1.0-d;\n" +
"    float sw = max(u_wipeSoft*0.5, 0.002);\n" +
"    float m = smoothstep(d-sw, d+sw, u_abMix*(1.0+2.0*sw)-sw);\n" +
"    src = mix(a, b, m);\n" +
"  }\n" +
"  else if(mm < 13.5){ src = mix(a, b, u_abMix*keyOf(a,0.0,u_mixKeyHue,u_mixKeyThresh,u_mixKeySoft,u_mixKeyInv)); }\n" +
"  else if(mm < 14.5){ src = mix(a, b, u_abMix*keyOf(a,1.0,u_mixKeyHue,u_mixKeyThresh,u_mixKeySoft,u_mixKeyInv)); }\n" +
"  else if(mm < 15.5){ src = a + b*u_abMix; }\n" +
"  else if(mm < 16.5){ src = mix(a, abs(a-b), u_abMix); }\n" +
"  else if(mm < 17.5){ src = mix(a, a*b*1.6, u_abMix); }\n" +
"  else if(mm < 18.5){ src = mix(a, 1.0-(1.0-a)*(1.0-b), u_abMix); }\n" +
"  else { src = mix(a, max(a,b), u_abMix); }\n" +
"  O = vec4(clamp(src,0.0,1.6),1.0);\n}\n";

/* pass 2: the bent signal path — physical sync model + NTSC + tape */
const FS_SIG = COMMON + KEYFN +
"uniform sampler2D u_tex; uniform sampler2D u_dispT;\n" +
"uniform float u_time,u_frame,u_bypass,u_rows,u_rollBar;\n" +
"uniform float u_vrollpos,u_humpos;\n" +
"uniform float u_jitter,u_humBar;\n" +
"uniform float u_chromaBleed,u_chromaDelay,u_rainbow,u_dotCrawl,u_ringing,u_signalNoise,u_chromaNoise;\n" +
"uniform float u_lumaBleed,u_bleedDir,u_vBleed;\n" +
"uniform float u_dropout,u_genLoss,u_genCount,u_dropoutLen,u_chromaLoss;\n" +
"uniform float u_tapeSpeed,u_edgeDmg,u_printThru,u_hiss,u_stillNoise,u_shuttleNz;\n" +
"uniform float u_chanIdx,u_tpStill,u_tpShuttle;\n" +
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
"  int ci = int(u_chanIdx);\n" +
"  vec4 D = mix(texelFetch(u_dispT,ivec2(i0,ci),0), texelFetch(u_dispT,ivec2(i1,ci),0), fract(row));\n" +
"  float dx = D.x, rowGain = D.y, noiseG = D.z, hfl = clamp(D.w,0.0,1.0);\n" +
"  /* generation loss compounds: each dub costs bandwidth, adds noise, loses chroma */\n" +
"  float gEff = 1.0 - pow(1.0 - clamp(u_genLoss,0.0,0.98)*0.5, max(u_genCount,1.0));\n" +
"  float sp = u_tapeSpeed;\n" +
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
"  float spread = mix(0.6, 11.0, u_chromaBleed)*(1.0 + sp*1.7 + gEff*1.1 + hfl*2.2);\n" +
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
"  y = mix(y, ys, clamp(gEff*0.7 + sp*0.35 + hfl*0.9, 0.0, 1.0));\n" +
"  iq *= 1.0 - clamp(gEff*0.45 + sp*0.25 + hfl*0.7, 0.0, 1.0);\n" +
"  /* chroma loss: the colour-under signal gives up before the luma does */\n" +
"  if(u_chromaLoss>0.003){\n" +
"    float cs = h21(vec2(rowI*0.37, floor(t*3.0)));\n" +
"    float band = smoothstep(1.0-u_chromaLoss, 1.02-u_chromaLoss, cs);\n" +
"    iq *= 1.0 - u_chromaLoss*(0.45+0.55*band);\n" +
"  }\n" +
"  /* print-through: a faint pre-echo of the picture bleeding off the next tape layer */\n" +
"  if(u_printThru>0.003){\n" +
"    vec3 gh = rgb2yiq(texture(u_tex, fract(suv+vec2(0.004*u_printThru, 0.055*u_printThru))).rgb);\n" +
"    y += (gh.x-0.5)*u_printThru*0.22;\n" +
"  }\n" +
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
"  y += (nb-0.5)*(u_signalNoise*(0.22+0.85*streak) + noiseG*0.55 + gEff*0.14 + sp*0.05);\n" +
"  /* tape hiss: fine, uncorrelated, sits in the luma */\n" +
"  if(u_hiss>0.003) y += (h21(uv*u_res*1.7+fract(t)*vec2(91.3,57.1))-0.5)*u_hiss*0.28;\n" +
"  y += (h21(suv*u_res+fract(t)*vec2(31.7,17.3))-0.5)*u_signalNoise*0.1;\n" +
"  iq += (vec2(h21(vec2(floor(nx)*1.7,nseed+31.0)), h21(vec2(floor(nx)*2.3,nseed+57.0)))-0.5)*u_chromaNoise*0.55;\n" +
"  iq *= 1.0/(1.0+noiseG*2.5);\n" +
"  /* dropouts — comet-tail streaks */\n" +
"  float dr = h21(vec2(rowI*1.31, floor(t*24.0)));\n" +
"  if(dr < u_dropout*0.05*(1.0+sp*1.5)){\n" +
"    float xs = h21(vec2(rowI, floor(t*24.0)+7.0));\n" +
"    float len = (0.06 + h21(vec2(rowI,99.0))*0.5)*(0.25+u_dropoutLen*2.4);\n" +
"    float f = (suv.x-xs)/len;\n" +
"    if(f>0.0 && f<1.0){ float k = pow(1.0-f,1.8)*0.95; y = mix(y,1.05,k); iq *= 1.0-k; }\n" +
"  }\n" +
"  /* edge damage: the top and bottom of the tape wears first */\n" +
"  if(u_edgeDmg>0.003){\n" +
"    float ed = smoothstep(0.10*u_edgeDmg+0.02, 0.0, min(uv.y, 1.0-uv.y));\n" +
"    float en = h21(vec2(floor(suv.x*u_res.x/2.0), rowI+floor(t*50.0)*3.0));\n" +
"    y = mix(y, en*0.9, ed*u_edgeDmg);\n" +
"    iq *= 1.0 - ed*u_edgeDmg;\n" +
"  }\n" +
"  /* still-frame: the noise bar a deck parks across a paused field */\n" +
"  float stAmt = max(u_stillNoise, u_tpStill);\n" +
"  if(stAmt>0.003){\n" +
"    float bp = fract(0.5 + t*0.03);\n" +
"    float bd = abs(fract(uv.y - bp + 0.5) - 0.5);\n" +
"    float bm = smoothstep(0.045*stAmt+0.004, 0.0, bd);\n" +
"    float bn = h21(vec2(floor(suv.x*u_res.x/2.5), rowI*1.7+floor(t*50.0)*11.0));\n" +
"    y = mix(y, bn, bm*0.95); iq *= 1.0-bm*0.9;\n" +
"  }\n" +
"  /* shuttle: bands of head-crossing noise march through the picture */\n" +
"  float shA = max(u_shuttleNz, abs(u_tpShuttle));\n" +
"  if(shA>0.003){\n" +
"    float dir = (u_tpShuttle<0.0)?-1.0:1.0;\n" +
"    float nb2 = 3.0 + floor(shA*7.0);\n" +
"    float ph2 = fract(uv.y*nb2 - t*dir*1.6);\n" +
"    float bm2 = smoothstep(0.55, 0.98, ph2)*shA;\n" +
"    float sn = h21(vec2(floor(suv.x*u_res.x/2.0), rowI+floor(t*50.0)*7.0));\n" +
"    y = mix(y, sn*0.85, bm2*0.9); iq *= 1.0-bm2*0.85;\n" +
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
"uniform float u_contour,u_contourBands,u_contourWidth,u_contourHue,u_contourFill;\n" +
"uniform float u_lumaSteps,u_stepCount,u_dither;\n" +
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
"  /* ---- flatten: quantise luma into hard steps for solid colour fields ---- */\n" +
"  if(u_lumaSteps>0.003){\n" +
"    float L0 = dot(c, vec3(0.299,0.587,0.114));\n" +
"    float N = max(2.0, floor(u_stepCount));\n" +
"    float dth = 0.0;\n" +
"    if(u_dither>0.003){\n" +
"      ivec2 bp = ivec2(mod(gl_FragCoord.xy, 4.0));\n" +
"      float bayer[16] = float[16](0.0,8.0,2.0,10.0, 12.0,4.0,14.0,6.0, 3.0,11.0,1.0,9.0, 15.0,7.0,13.0,5.0);\n" +
"      dth = (bayer[bp.y*4+bp.x]/16.0 - 0.5)*u_dither/N;\n" +
"    }\n" +
"    float Lq = floor((L0+dth)*N + 0.5)/N;\n" +
"    vec3 flat_ = (L0 > 0.001) ? c*(Lq/max(L0,0.001)) : vec3(Lq);\n" +
"    c = mix(c, clamp(flat_,0.0,1.6), u_lumaSteps);\n" +
"  }\n" +
"  /* ---- contour: draw the isolines between luma bands (bent-enhancer outlines) ---- */\n" +
"  if(u_contour>0.003){\n" +
"    /* smooth the luma first so grain doesn't spawn false isolines */\n" +
"    vec2 sp = 1.4/u_res;\n" +
"    float L1 = dot(c, vec3(0.299,0.587,0.114))*0.36;\n" +
"    L1 += dot(texture(u_tex, uv+vec2( sp.x,0.0)).rgb, vec3(0.299,0.587,0.114))*0.16;\n" +
"    L1 += dot(texture(u_tex, uv+vec2(-sp.x,0.0)).rgb, vec3(0.299,0.587,0.114))*0.16;\n" +
"    L1 += dot(texture(u_tex, uv+vec2(0.0, sp.y)).rgb, vec3(0.299,0.587,0.114))*0.16;\n" +
"    L1 += dot(texture(u_tex, uv+vec2(0.0,-sp.y)).rgb, vec3(0.299,0.587,0.114))*0.16;\n" +
"    float b = L1*u_contourBands;\n" +
"    float g = length(vec2(dFdx(b), dFdy(b))) + 1e-4;\n" +
"    float f = fract(b);\n" +
"    float dist = min(f, 1.0-f)/g;\n" +
"    float line = 1.0 - smoothstep(u_contourWidth*0.5, u_contourWidth*0.5+1.0, dist);\n" +
"    float band = floor(b);\n" +
"    vec3 lc = 0.5+0.5*cos(6.2832*(band/u_contourBands*1.5 + u_contourHue + vec3(0.0,0.33,0.67)));\n" +
"    lc = mix(vec3(1.0), lc, smoothstep(0.0,0.15,u_contourHue));\n" +
"    vec3 bg = c*u_contourFill;\n" +
"    c = mix(c, mix(bg, lc, line), u_contour);\n" +
"  }\n" +
"  c += c*c*u_glow*0.8;\n" +
"  if(u_keyFx>0.001){\n" +
"    vec3 dry = texture(u_tex, uv).rgb;\n" +
"    float km = keyOf(dry, u_keyMode, u_keyHue, u_keyThresh, u_keySoft, u_keyInv);\n" +
"    c = mix(dry, c, 1.0 - u_keyFx*(1.0-km));\n" +
"  }\n" +
"  O = vec4(clamp(c,0.0,1.4), 1.0);\n}\n";

/* MASTER OUTPUT — display model, phosphor, overlays, output transform */
const FS_CRT = COMMON +
"uniform sampler2D u_tex; uniform sampler2D u_persist;\n" +
"uniform vec2 u_procRes;\n" +
"uniform float u_scanlines,u_beamWidth,u_beamShape,u_aperture,u_maskDark,u_curvature,u_cornerRound;\n" +
"uniform float u_vignette,u_time,u_outModel,u_hasPersist;\n" +
"uniform float u_bloom,u_bloomRad,u_halation,u_defocus,u_grain;\n" +
"uniform float u_outGamma,u_outBright,u_outContrast,u_outSat,u_outWarmth,u_blackLevel,u_whiteClip;\n" +
"uniform float u_phosphor,u_hvSag;\n" +
"uniform float u_letterbox,u_pillarbox,u_bezel,u_glassRefl,u_dust,u_scratches,u_ovMoire,u_rollShutter,u_safeArea;\n" +
"float lum3(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }\n" +
/* --- shadow-mask families --- */
"vec3 maskAt(vec2 fc, float model){\n" +
"  float dark = 1.0 - u_maskDark*0.55;\n" +
"  if(model<1.5){ float m = mod(fc.x, 3.0);\n" +                                    /* aperture grille */
"    return vec3(m<1.0?1.0:dark, (m>=1.0&&m<2.0)?1.0:dark, m>=2.0?1.0:dark); }\n" +
"  if(model<2.5){ vec2 g = floor(fc/vec2(3.0,6.0));\n" +                            /* slot mask */
"    float off = mod(g.y,2.0)*1.5;\n" +
"    float m = mod(fc.x+off, 3.0);\n" +
"    float v = mod(fc.y, 6.0) < 5.0 ? 1.0 : dark;\n" +
"    return vec3(m<1.0?1.0:dark, (m>=1.0&&m<2.0)?1.0:dark, m>=2.0?1.0:dark)*v; }\n" +
"  if(model<3.5){ vec2 q = fc/vec2(6.0,6.0);\n" +                                   /* shadow (dot triad) */
"    vec2 f = fract(q)-0.5;\n" +
"    float r = length(f);\n" +
"    float tri = mod(floor(q.x)+floor(q.y)*2.0, 3.0);\n" +
"    vec3 t = vec3(tri<0.5?1.0:dark, (tri>=0.5&&tri<1.5)?1.0:dark, tri>=1.5?1.0:dark);\n" +
"    return t*(1.0-smoothstep(0.28,0.5,r)*u_maskDark); }\n" +
"  if(model<4.5){ float m = mod(fc.x, 2.0);\n" +                                    /* LCD stripe */
"    return mix(vec3(1.0), vec3(m<1.0?1.06:dark), 0.85); }\n" +
"  return vec3(1.0);\n}\n" +
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  vec2 p = uv*2.0-1.0;\n" +
"  /* geometry: barrel + HV sag (picture breathes wider as it gets brighter) */\n" +
"  float sag = 0.0;\n" +
"  if(u_hvSag>0.003){ sag = u_hvSag*0.035*(lum3(texture(u_tex, vec2(0.5)).rgb)+0.35); }\n" +
"  p *= 1.0 + u_curvature*0.09*dot(p,p) - sag;\n" +
"  vec2 cuv = p*0.5+0.5;\n" +
"  /* rounded corners / tube edge */\n" +
"  vec2 ab = abs(p) - vec2(1.0 - u_cornerRound*0.18);\n" +
"  float corner = length(max(ab,0.0)) - u_cornerRound*0.18;\n" +
"  if(cuv.x<0.0||cuv.x>1.0||cuv.y<0.0||cuv.y>1.0 || corner>0.0){ O=vec4(0.0,0.0,0.0,1.0); return; }\n" +
"  /* rolling shutter beat against the field rate */\n" +
"  if(u_rollShutter>0.003){ cuv.y += sin((uv.y*3.0 + u_time*0.7)*3.14159)*u_rollShutter*0.004; }\n" +
"  vec3 c = texture(u_tex, clamp(cuv,0.0,1.0)).rgb;\n" +
"  /* phosphor persistence */\n" +
"  if(u_phosphor>0.003 && u_hasPersist>0.5){\n" +
"    vec3 pv = texture(u_persist, clamp(cuv,0.0,1.0)).rgb;\n" +
"    c = max(c, pv*u_phosphor);\n" +
"  }\n" +
"  /* defocus + bloom + halation */\n" +
"  if(u_defocus>0.003 || u_bloom>0.003){\n" +
"    vec2 px = 1.0/u_res;\n" +
"    vec3 blur = vec3(0.0); float wsum = 0.0;\n" +
"    float rad = (1.5 + u_bloomRad*16.0);\n" +
"    for(int i=0;i<12;i++){\n" +
"      float a = float(i)*0.5236;\n" +
"      float r = (1.0 + mod(float(i),3.0))*0.45;\n" +
"      vec2 off = vec2(cos(a), sin(a))*rad*r*px;\n" +
"      float w = 1.0/(1.0+r*1.4);\n" +
"      blur += texture(u_tex, clamp(cuv+off,0.0,1.0)).rgb*w; wsum += w;\n" +
"    }\n" +
"    blur /= max(wsum, 0.0001);\n" +
"    c = mix(c, blur, u_defocus*0.85);\n" +
"    if(u_bloom>0.003){\n" +
"      vec3 hot = max(blur - 0.42, 0.0)*1.9;\n" +
"      vec3 tint = mix(vec3(1.0), vec3(1.25,0.62,0.42), u_halation);\n" +
"      c += hot*u_bloom*1.5*tint;\n" +
"    }\n" +
"  }\n" +
"  /* ---- display model ---- */\n" +
"  float model = u_outModel;\n" +
"  if(model > 0.5){\n" +
"    /* beam profile scanlines (Lottes-style: gaussian beam whose width tracks brightness) */\n" +
"    float lines = u_procRes.y;\n" +
"    float fy = fract(cuv.y*lines) - 0.5;\n" +
"    float bright = lum3(c);\n" +
"    float w = u_beamWidth*(0.35 + 0.65*mix(1.0, bright, u_beamShape));\n" +
"    float beam = exp(-(fy*fy)/max(0.005, w*w*0.22));\n" +
"    c *= mix(1.0, beam*1.35, u_scanlines);\n" +
"    c *= mix(vec3(1.0), maskAt(gl_FragCoord.xy, model), u_aperture);\n" +
"    if(model>4.5) c = mix(c, vec3(lum3(c)), 0.85);\n" +                 /* mono monitor */
"    if(model>5.5) c *= vec3(0.75,1.0,0.8);\n" +                          /* green screen */
"  }\n" +
"  /* ---- output transform ---- */\n" +
"  c = max(c - u_blackLevel, 0.0);\n" +
"  c = pow(max(c,0.0), vec3(1.0/max(0.05,u_outGamma)));\n" +
"  c = (c-0.5)*u_outContrast + 0.5 + u_outBright;\n" +
"  float L = lum3(c);\n" +
"  c = mix(vec3(L), c, u_outSat);\n" +
"  c *= mix(vec3(1.0), vec3(1.12,1.0,0.86), max(u_outWarmth,0.0)) * mix(vec3(1.0), vec3(0.86,1.0,1.14), max(-u_outWarmth,0.0));\n" +
"  c = min(c, vec3(u_whiteClip));\n" +
"  /* ---- overlays ---- */\n" +
"  c *= 1.0 - u_vignette*0.9*pow(length(p*0.75), 2.6);\n" +
"  if(u_glassRefl>0.003){\n" +
"    float g = smoothstep(0.75, 0.0, length(uv-vec2(0.28,0.78)));\n" +
"    c += g*u_glassRefl*0.16;\n" +
"    c += smoothstep(0.5,0.0,abs(uv.x-uv.y*0.4-0.15))*u_glassRefl*0.05;\n" +
"  }\n" +
"  if(u_bezel>0.003){\n" +
"    float edge = smoothstep(0.0, 0.06, min(min(cuv.x,1.0-cuv.x), min(cuv.y,1.0-cuv.y)));\n" +
"    c = mix(c*0.15, c, mix(1.0, edge, u_bezel));\n" +
"  }\n" +
"  if(u_ovMoire>0.003){\n" +
"    float mo = sin(gl_FragCoord.x*2.399)*sin(gl_FragCoord.y*2.017);\n" +
"    c *= 1.0 + mo*u_ovMoire*0.18;\n" +
"  }\n" +
"  if(u_dust>0.003){\n" +
"    float d = h21(floor(uv*vec2(180.0,140.0)) + floor(u_time*8.0)*13.0);\n" +
"    if(d > 1.0-u_dust*0.012) c += 0.7;\n" +
"    float dk = h21(floor(uv*vec2(150.0,120.0)) + 77.0);\n" +
"    if(dk > 1.0-u_dust*0.008) c *= 0.25;\n" +
"  }\n" +
"  if(u_scratches>0.003){\n" +
"    float sx = h21(vec2(floor(uv.x*90.0), floor(u_time*3.0)));\n" +
"    if(sx > 1.0-u_scratches*0.05) c += vec3(0.35)*smoothstep(0.0,0.3,uv.y);\n" +
"  }\n" +
"  if(u_grain>0.003){\n" +
"    float gn = h21(gl_FragCoord.xy + fract(u_time)*vec2(37.7,71.3));\n" +
"    c += (gn-0.5)*u_grain*0.16*(0.35+0.65*(1.0-lum3(c)));\n" +
"  }\n" +
"  /* mattes and guides last */\n" +
"  if(u_letterbox>0.001 && (uv.y < u_letterbox || uv.y > 1.0-u_letterbox)) c = vec3(0.0);\n" +
"  if(u_pillarbox>0.001 && (uv.x < u_pillarbox || uv.x > 1.0-u_pillarbox)) c = vec3(0.0);\n" +
"  if(u_safeArea>0.003){\n" +
"    vec2 d90 = abs(uv-0.5)-vec2(0.45,0.45);\n" +
"    vec2 d80 = abs(uv-0.5)-vec2(0.40,0.40);\n" +
"    float g1 = step(-0.002, max(d90.x,d90.y))*step(max(d90.x,d90.y), 0.002);\n" +
"    float g2 = step(-0.002, max(d80.x,d80.y))*step(max(d80.x,d80.y), 0.002);\n" +
"    c = mix(c, vec3(0.2,1.0,0.9), (g1+g2)*u_safeArea*0.8);\n" +
"  }\n" +
"  O = vec4(max(c,0.0),1.0);\n}\n";

/* pass: GLITCH LAB — databending, pixel sort, halftone dropout, drift/FM warp */
const FS_GLITCH = COMMON +
"uniform sampler2D u_tex;\n" +
"uniform float u_time;\n" +
"uniform float u_pixelSort,u_sortThresh,u_blockShift,u_blockSize,u_dotify,u_dotSize,u_driftWarp,u_fmWarp;\n" +
"float lumAt(vec2 p){ return dot(texture(u_tex, fract(p)).rgb, vec3(0.299,0.587,0.114)); }\n" +
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  vec2 suv = uv;\n" +
"  /* channel-driven drift warp — pixels pushed by their own colour */\n" +
"  if(u_driftWarp>0.003){\n" +
"    for(int k=0;k<3;k++){\n" +
"      vec2 w = (texture(u_tex, fract(suv)).rg - 0.5)*u_driftWarp*0.06;\n" +
"      suv += w;\n" +
"    }\n" +
"  }\n" +
"  /* FM warp — scan phase modulated by brightness, contours ripple */\n" +
"  if(u_fmWarp>0.003){\n" +
"    float ph = uv.y*u_res.y*0.35 + lumAt(suv)*u_fmWarp*24.0 + u_time*2.0;\n" +
"    suv.x += sin(ph)*u_fmWarp*0.025;\n" +
"  }\n" +
"  vec3 c = texture(u_tex, fract(suv)).rgb;\n" +
"  /* block trash — databent macroblocks jump and corrupt */\n" +
"  if(u_blockShift>0.003){\n" +
"    float bn = mix(52.0, 7.0, u_blockSize);\n" +
"    vec2 cell = floor(uv*vec2(bn, bn*u_res.y/u_res.x));\n" +
"    float tk = floor(u_time*2.3);\n" +
"    float r1 = h21(cell*1.31 + tk*17.0);\n" +
"    if(r1 < u_blockShift*0.4){\n" +
"      vec2 off = (vec2(h21(cell+31.0+tk), h21(cell+57.0+tk))-0.5)*0.35*u_blockShift;\n" +
"      vec3 bc = texture(u_tex, fract(suv+off)).rgb;\n" +
"      float r2 = h21(cell+99.0);\n" +
"      if(r2<0.22) bc = bc.gbr;\n" +
"      else if(r2<0.38) bc = 1.0-bc;\n" +
"      else if(r2<0.5) bc = floor(bc*3.0+0.5)/3.0;\n" +
"      c = bc;\n" +
"    }\n" +
"  }\n" +
"  /* pixel sort — bright runs stretch into streaks */\n" +
"  if(u_pixelSort>0.003){\n" +
"    float th = u_sortThresh;\n" +
"    float l0 = dot(c, vec3(0.299,0.587,0.114));\n" +
"    if(l0 > th){\n" +
"      float py = 1.0/u_res.y;\n" +
"      float d = 0.0;\n" +
"      for(int k=1;k<=32;k++){\n" +
"        if(lumAt(suv + vec2(0.0, float(k)*2.0*py)) <= th) break;\n" +
"        d += 2.0*py;\n" +
"      }\n" +
"      vec3 sc = texture(u_tex, fract(suv + vec2(0.0, d))).rgb;\n" +
"      c = mix(c, sc, u_pixelSort);\n" +
"    }\n" +
"  }\n" +
"  /* halftone — everything drops out except dots sized by brightness */\n" +
"  if(u_dotify>0.003){\n" +
"    float cellPx = mix(26.0, 6.0, u_dotSize);\n" +
"    vec2 g = uv*u_res/cellPx;\n" +
"    vec2 cc = (floor(g)+0.5)*cellPx/u_res;\n" +
"    vec3 cs = texture(u_tex, cc).rgb;\n" +
"    float lm = dot(cs, vec3(0.299,0.587,0.114));\n" +
"    float r = length(fract(g)-0.5);\n" +
"    float m = smoothstep(lm*0.72+0.06, lm*0.72-0.06, r);\n" +
"    c = mix(c, cs*m, u_dotify);\n" +
"  }\n" +
"  O = vec4(c,1.0);\n}\n";

/* pass: FLOW / MOSH — optical-flow datamosh, melt, swirl, vector trash.
   Holds its own history and advects it along a selectable vector field.
   u_srcPrev is last frame's input, so real motion vectors can be estimated. */
const FS_FLOW = COMMON +
"uniform sampler2D u_tex; uniform sampler2D u_flowPrev; uniform sampler2D u_srcPrev;\n" +
"uniform float u_time,u_flowField,u_flowEdge;\n" +
"uniform float u_mosh,u_moshGate,u_moshVec,u_melt,u_meltDir,u_meltGate;\n" +
"uniform float u_swirl,u_swirlScale,u_swirlSpeed,u_moshBlock,u_moshBlockSize,u_moshRate;\n" +
"uniform float u_timeGrad,u_shearAxis,u_flowCurl,u_flowGain,u_flowSharp;\n" +
"uniform float u_flowNoise,u_flowHue,u_flowFade,u_flowRepel,u_flowStretch;\n" +
"float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);\n" +
"  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }\n" +
"float lm(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }\n" +
"vec2 fedge(vec2 p){\n" +
"  if(u_flowEdge>1.5){ vec2 t=fract(p*0.5)*2.0; return 1.0-abs(t-1.0); }\n" +
"  if(u_flowEdge>0.5) return fract(p);\n" +
"  return clamp(p, 0.0, 1.0);\n}\n" +
"vec3 tapF(vec2 p){ return texture(u_flowPrev, fedge(p)).rgb; }\n" +
"/* single-step Lucas-Kanade: how far did this pixel's brightness pattern travel? */\n" +
"vec2 motionAt(vec2 uv){\n" +
"  vec2 e = 1.5/u_res;\n" +
"  float c  = lm(texture(u_tex, uv).rgb);\n" +
"  float pv = lm(texture(u_srcPrev, uv).rgb);\n" +
"  vec2 g = vec2(lm(texture(u_tex, uv+vec2(e.x,0.0)).rgb) - lm(texture(u_tex, uv-vec2(e.x,0.0)).rgb),\n" +
"                lm(texture(u_tex, uv+vec2(0.0,e.y)).rgb) - lm(texture(u_tex, uv-vec2(0.0,e.y)).rgb));\n" +
"  float d = c - pv;\n" +
"  vec2 mv = -d*g/(dot(g,g)+0.02);\n" +
"  return clamp(mv*e*3.0, vec2(-0.06), vec2(0.06));\n}\n" +
"vec3 hrot(vec3 c, float a){\n" +
"  vec3 q = rgb2yiq(c); float s=sin(a), k=cos(a);\n" +
"  return yiq2rgb(vec3(q.x, q.y*k-q.z*s, q.y*s+q.z*k));\n}\n" +
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  vec3 cur = texture(u_tex, uv).rgb;\n" +
"  float l = lm(cur);\n" +
"  float ar = u_res.y/u_res.x;\n" +
"  vec2 mv = motionAt(uv);\n" +
"  float mmag = length(mv)*26.0;\n" +
"  vec2 v = vec2(0.0);\n" +
"  /* --- the driving vector field --- */\n" +
"  vec2 F = vec2(0.0);\n" +
"  if(u_flowField<0.5){ F = mv*18.0; }\n" +                                      /* MOTION */
"  else if(u_flowField<1.5){\n" +                                                /* CONTOUR: perpendicular to luma gradient */
"    vec2 e = 1.5/u_res;\n" +
"    vec2 g = vec2(lm(texture(u_tex, uv+vec2(e.x,0.0)).rgb) - lm(texture(u_tex, uv-vec2(e.x,0.0)).rgb),\n" +
"                  lm(texture(u_tex, uv+vec2(0.0,e.y)).rgb) - lm(texture(u_tex, uv-vec2(0.0,e.y)).rgb));\n" +
"    F = vec2(-g.y, g.x)*2.2;\n" +
"  }\n" +
"  else if(u_flowField<2.5){\n" +                                               /* CURL NOISE */
"    float e = 0.02;\n" +
"    vec2 np = uv*vec2(4.0, 4.0*ar) + u_time*0.05;\n" +
"    F = vec2(vn(np+vec2(0.0,e)) - vn(np-vec2(0.0,e)), -(vn(np+vec2(e,0.0)) - vn(np-vec2(e,0.0))))/e*0.5;\n" +
"  }\n" +
"  else if(u_flowField<3.5){ F = normalize(uv-0.5+1e-5)*0.7; }\n" +              /* RADIAL */
"  else if(u_flowField<4.5){ vec2 c2 = uv-0.5; F = vec2(-c2.y, c2.x)*2.2; }\n" + /* SPIRAL */
"  else if(u_flowField<5.5){ vec3 q = rgb2yiq(cur); F = q.yz*3.0; }\n" +         /* CHROMA */
"  else { F = vec2(sin(uv.y*22.0+u_time*0.7), sin(uv.x*17.0-u_time*0.5))*0.8; }\n" + /* WEAVE */
"  v += F*u_moshVec*0.006;\n" +
"  /* melt: gravity along an arbitrary angle, gated on brightness */\n" +
"  if(u_melt>0.003){\n" +
"    float a = u_meltDir*3.14159;\n" +
"    float gate = mix(1.0, smoothstep(u_meltGate-0.18, u_meltGate+0.18, l), step(0.001,u_meltGate));\n" +
"    v += vec2(sin(a), -cos(a))*u_melt*(0.15+0.85*l)*gate*0.006;\n" +
"  }\n" +
"  if(u_swirl>0.003){\n" +
"    float e = 0.02;\n" +
"    float sc = 1.0 + u_swirlScale*11.0;\n" +
"    vec2 np = uv*vec2(sc, sc*ar) + u_time*(0.02+u_swirlSpeed*0.5);\n" +
"    float dnx = vn(np+vec2(0.0,e)) - vn(np-vec2(0.0,e));\n" +
"    float dny = vn(np+vec2(e,0.0)) - vn(np-vec2(e,0.0));\n" +
"    v += u_swirl*0.004*vec2(dnx,-dny)/e;\n" +
"  }\n" +
"  /* vector trash: macroblocks shoved by garbage motion vectors */\n" +
"  if(u_moshBlock>0.003){\n" +
"    float bs = mix(46.0, 5.0, u_moshBlockSize);\n" +
"    vec2 cell = floor(uv*vec2(bs, bs*ar));\n" +
"    float tk = floor(u_time*(0.25+u_moshRate*11.0));\n" +
"    vec2 bv = vec2(h21(cell+tk*7.0), h21(cell+tk*13.0))-0.5;\n" +
"    v += u_moshBlock*0.03*bv;\n" +
"  }\n" +
"  /* stretch: displacement grows with distance from centre, so the frame smears outward */\n" +
"  if(abs(u_flowStretch)>0.003) v += (uv-0.5)*u_flowStretch*mmag*0.05;\n" +
"  /* edge repel: push away from contrast so shapes peel apart */\n" +
"  if(abs(u_flowRepel)>0.003){\n" +
"    vec2 e = 1.5/u_res;\n" +
"    vec2 g = vec2(lm(texture(u_tex, uv+vec2(e.x,0.0)).rgb) - lm(texture(u_tex, uv-vec2(e.x,0.0)).rgb),\n" +
"                  lm(texture(u_tex, uv+vec2(0.0,e.y)).rgb) - lm(texture(u_tex, uv-vec2(0.0,e.y)).rgb));\n" +
"    v += g*u_flowRepel*0.05;\n" +
"  }\n" +
"  if(u_flowNoise>0.003){\n" +
"    v += (vec2(h21(uv*u_res+fract(u_time)*vec2(37.1,11.7)), h21(uv*u_res+fract(u_time)*vec2(19.3,53.9)))-0.5)\n" +
"         *u_flowNoise*0.01;\n" +
"  }\n" +
"  /* curl knob rotates the whole field: 0 = as-is, 0.5 = fully perpendicular (orbit instead of drift) */\n" +
"  if(abs(u_flowCurl)>0.003){\n" +
"    float a = u_flowCurl*3.14159;\n" +
"    float s = sin(a), k = cos(a);\n" +
"    v = vec2(v.x*k - v.y*s, v.x*s + v.y*k);\n" +
"  }\n" +
"  v *= u_flowGain;\n" +
"  vec3 prev = tapF(uv+v);\n" +
"  /* re-sharpen: repeated bilinear resampling melts detail, this claws some back */\n" +
"  if(u_flowSharp>0.003){\n" +
"    vec2 e = 1.6/u_res;\n" +
"    vec3 b = (tapF(uv+v+vec2(e.x,0.0)) + tapF(uv+v-vec2(e.x,0.0)) +\n" +
"              tapF(uv+v+vec2(0.0,e.y)) + tapF(uv+v-vec2(0.0,e.y)))*0.25;\n" +
"    prev = max(prev + (prev-b)*u_flowSharp*1.5, vec3(0.0));\n" +
"  }\n" +
"  if(abs(u_flowHue)>0.003) prev = max(hrot(prev, u_flowHue*0.06), vec3(0.0));\n" +
"  prev *= 1.0 - u_flowFade*0.09;\n" +
"  /* how much of the held frame survives */\n" +
"  float pers = max(u_mosh, clamp((u_melt+u_swirl+u_moshBlock+u_moshVec)*0.7, 0.0, 0.92));\n" +
"  /* mosh gate: hold only where the picture is moving (or only where it is still) */\n" +
"  if(abs(u_moshGate)>0.003){\n" +
"    float mg = smoothstep(0.02, 0.32, mmag);\n" +
"    pers *= mix(1.0, (u_moshGate>0.0)?mg:(1.0-mg), abs(u_moshGate));\n" +
"  }\n" +
"  float ax = mix(uv.y, uv.x, clamp(u_shearAxis,0.0,1.0)) - 0.5;\n" +
"  pers = clamp(pers + u_timeGrad*ax*1.4, 0.0, 0.995);\n" +
"  O = vec4(clamp(mix(cur, prev, pers), -0.2, 2.0), 1.0);\n}\n";


/* pass: SIGNAL LAB — techniques adapted from the open-source glitch canon */
const FS_LAB = COMMON +
"uniform sampler2D u_tex;\n" +
"uniform float u_time,u_frame;\n" +
"uniform float u_sparseJit,u_jitThresh,u_ntscArt,u_ntscFringe,u_snow,u_snowAniso;\n" +
"uniform float u_fmAmt,u_fmCarrier,u_slitscan,u_slitDir,u_bitCrush,u_bitScale;\n" +
"uniform float u_bandKey,u_bandN,u_bandHue,u_rowSmear,u_moire,u_moireFreq;\n" +
"uniform float u_fieldMod,u_fieldHue,u_fieldWarp,u_fieldSrc;\n" +
"float lum3(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }\n" +
"float fieldAt(vec2 uv){\n" +
"  if(u_fieldSrc<0.5) return uv.x;\n" +                                   /* H ramp */
"  if(u_fieldSrc<1.5) return 1.0-uv.y;\n" +                               /* V ramp */
"  if(u_fieldSrc<2.5) return clamp(length(uv-0.5)*1.9,0.0,1.0);\n" +      /* radial */
"  if(u_fieldSrc<3.5) return 0.5+0.5*sin(uv.x*20.0+u_time);\n" +          /* h sine */
"  return h21(floor(uv*40.0));\n}\n" +                                     /* noise */
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  vec2 suv = uv;\n" +
"  float fld = fieldAt(uv);\n" +
"  /* field modulation warps space per-pixel (video-rate modulation) */\n" +
"  if(u_fieldMod>0.003 && abs(u_fieldWarp)>0.003)\n" +
"    suv.x += (fld-0.5)*u_fieldWarp*u_fieldMod*0.15;\n" +
"  /* sparse line jitter — only lines past the gate displace, and they displace hard */\n" +
"  if(u_sparseJit>0.003){\n" +
"    float row = floor(uv.y*u_res.y/2.0);\n" +
"    float j = h21(vec2(row, floor(u_time*24.0)))*2.0-1.0;\n" +
"    j *= step(u_jitThresh, abs(j));\n" +
"    suv.x += j*u_sparseJit*0.25;\n" +
"  }\n" +
"  /* FM wobble — image treated as a frequency-modulated carrier */\n" +
"  if(u_fmAmt>0.003){\n" +
"    float car = mix(2.0, 60.0, u_fmCarrier);\n" +
"    float m = lum3(texture(u_tex, fract(suv)).rgb);\n" +
"    suv.x += sin((uv.y*car + m*8.0 + u_time)*3.14159)*u_fmAmt*0.03;\n" +
"  }\n" +
"  /* slitscan — each row (or column) samples a different moment of the frame */\n" +
"  if(u_slitscan>0.003){\n" +
"    float axis = mix(uv.y, uv.x, step(0.5,u_slitDir));\n" +
"    float sh = (axis-0.5)*u_slitscan*0.35;\n" +
"    suv += mix(vec2(sh,0.0), vec2(0.0,sh), step(0.5,u_slitDir));\n" +
"  }\n" +
"  /* row smear — reconstructing rows with the wrong predictor */\n" +
"  if(u_rowSmear>0.003){\n" +
"    float amt = u_rowSmear*0.35;\n" +
"    suv.x -= amt*fract(uv.y*u_res.y*0.5)*0.4;\n" +
"    suv.y -= amt*0.02;\n" +
"  }\n" +
"  vec3 c = texture(u_tex, fract(suv)).rgb;\n" +
"  /* NTSC crosstalk: two scalars for the two canonical composite artefacts */\n" +
"  if(u_ntscArt>0.003 || u_ntscFringe>0.003){\n" +
"    float px = 1.0/u_res.x;\n" +
"    vec3 yq = rgb2yiq(c);\n" +
"    vec3 l = rgb2yiq(texture(u_tex, fract(suv-vec2(px*2.0,0.0))).rgb);\n" +
"    vec3 r = rgb2yiq(texture(u_tex, fract(suv+vec2(px*2.0,0.0))).rgb);\n" +
"    float carrier = sin(suv.x*u_res.x*1.8 + floor(suv.y*u_res.y)*2.4 + u_time*9.0);\n" +
"    /* luma leaking into chroma = artifact colour; chroma leaking into luma = fringing */\n" +
"    yq.yz += (yq.x - 0.5*(l.x+r.x))*u_ntscArt*2.2*vec2(carrier, carrier*0.87);\n" +
"    yq.x  += (length(yq.yz))*u_ntscFringe*carrier*0.5;\n" +
"    c = yiq2rgb(yq);\n" +
"  }\n" +
"  /* snow: sparse shaped transients, clumped by anisotropy */\n" +
"  if(u_snow>0.003){\n" +
"    float row = floor(uv.y*u_res.y);\n" +
"    float lineGate = mix(1.0, step(0.82, h21(vec2(row, floor(u_time*30.0)))), u_snowAniso);\n" +
"    float seed = h21(floor(uv*vec2(u_res.x/3.0, u_res.y)) + fract(u_time)*91.0);\n" +
"    float hit = step(1.0 - u_snow*0.06*lineGate*3.0, seed);\n" +
"    if(hit>0.5){\n" +
"      float tail = fract(uv.x*u_res.x/3.0);\n" +
"      c += vec3(1.0-tail)*u_snow*1.2;\n" +
"    }\n" +
"  }\n" +
"  /* moire — interference against a virtual grid */\n" +
"  if(u_moire>0.003){\n" +
"    float f = mix(40.0, 400.0, u_moireFreq);\n" +
"    float m = sin(uv.x*f)*sin(uv.y*f*1.03+u_time*0.4);\n" +
"    c *= 1.0 + m*u_moire*0.5;\n" +
"  }\n" +
"  /* 1-bit crush: smooth downscale, threshold, hard upscale */\n" +
"  if(u_bitCrush>0.003){\n" +
"    float cell = mix(1.5, 14.0, u_bitScale);\n" +
"    vec2 cuv = (floor(uv*u_res/cell)+0.5)*cell/u_res;\n" +
"    vec3 sm = (texture(u_tex, cuv).rgb\n" +
"             + texture(u_tex, cuv+vec2(cell,0.0)/u_res).rgb\n" +
"             + texture(u_tex, cuv-vec2(cell,0.0)/u_res).rgb\n" +
"             + texture(u_tex, cuv+vec2(0.0,cell)/u_res).rgb\n" +
"             + texture(u_tex, cuv-vec2(0.0,cell)/u_res).rgb)/5.0;\n" +
"    float L = lum3(sm);\n" +
"    ivec2 bp = ivec2(mod(gl_FragCoord.xy/cell, 4.0));\n" +
"    float bayer[16] = float[16](0.0,8.0,2.0,10.0, 12.0,4.0,14.0,6.0, 3.0,11.0,1.0,9.0, 15.0,7.0,13.0,5.0);\n" +
"    float th = bayer[bp.y*4+bp.x]/16.0;\n" +
"    c = mix(c, vec3(step(th, L)), u_bitCrush);\n" +
"  }\n" +
"  /* multi-band sequential keyer: split luma into N bands, colour each */\n" +
"  if(u_bandKey>0.003){\n" +
"    float L = lum3(c);\n" +
"    float N = max(2.0, floor(u_bandN));\n" +
"    float band = floor(L*N);\n" +
"    vec3 bc = 0.5+0.5*cos(6.2832*(band/N + u_bandHue + vec3(0.0,0.33,0.67)));\n" +
"    c = mix(c, bc*(0.35+0.75*band/N), u_bandKey);\n" +
"  }\n" +
"  /* field modulation into hue */\n" +
"  if(u_fieldMod>0.003 && abs(u_fieldHue)>0.003){\n" +
"    vec3 yq = rgb2yiq(c);\n" +
"    float a = fld*u_fieldHue*u_fieldMod*6.2832;\n" +
"    float cc=cos(a), ss=sin(a);\n" +
"    yq.yz = mat2(cc,-ss,ss,cc)*yq.yz;\n" +
"    c = yiq2rgb(yq);\n" +
"  }\n" +
"  O = vec4(c,1.0);\n}\n";

/* pass: plain copy */
const FS_COPY = COMMON +
"uniform sampler2D u_tex;\n" +
"void main(){ O = texture(u_tex, gl_FragCoord.xy/u_res); }\n";

/* ---------------- parameter registry ---------------- */
const SECTIONS = [
  {id:"mixer",    name:"MIX BUS 1 \u00b7 A+B", cls:"mag"},
  {id:"mixer2",   name:"MIX BUS 2 \u00b7 C+D", cls:"mag"},
  {id:"mixerM",   name:"MASTER MIX \u00b7 BUS 1+2", cls:"mag"},
  {id:"morph",    name:"PRESET MORPH",      cls:"mag"},
  {id:"frame",    name:"FRAME / POSITION",  cls:"mag"},
  {id:"enhancer", name:"BENT ENHANCER",     cls:"mag"},
  {id:"feedback", name:"FEEDBACK / RESCAN", cls:"mag"},
  {id:"time",     name:"TIME BASE",         cls:"mag"},
  {id:"contour",  name:"CONTOUR / PALETTE",  cls:"mag"},
  {id:"glitch",   name:"GLITCH LAB",        cls:"mag"},
  {id:"flow",     name:"FLOW / MOSH",       cls:"mag"},
  {id:"keyer",    name:"KEYER",             cls:"cyan"},
  {id:"signal",   name:"COMPOSITE SIGNAL",  cls:""},
  {id:"sync",     name:"SYNC CORRUPTION",   cls:""},
  {id:"vhs",      name:"TAPE TRANSPORT",    cls:""},
  {id:"color",    name:"COLOUR STAGE",      cls:"cyan"},
  {id:"crt",      name:"CRT DISPLAY",       cls:"cyan"},
];
const PDEF = [
  ["abMix","BUS 1 FADER A>B","mixer",0,1,0],
  ["wipeSoft","WIPE SOFT","mixer",0,1,0.03],
  ["wipeDetail","WIPE DETAIL","mixer",0,1,0.3],
  ["wipeX","WIPE CTR X","mixer",-1,1,0],
  ["wipeY","WIPE CTR Y","mixer",-1,1,0],
  ["mixKeyThresh","KEY THRESH","mixer",0,1,0.5],
  ["mixKeySoft","KEY SOFT","mixer",0.01,1,0.2],
  ["mixKeyInv","KEY INVERT","mixer",0,1,0],
  ["mixKeyHue","KEY HUE","mixer",0,1,0.33],

  ["cdMix","BUS 2 FADER C>D","mixer2",0,1,0],
  ["wipeSoft2","WIPE SOFT","mixer2",0,1,0.03],
  ["wipeDetail2","WIPE DETAIL","mixer2",0,1,0.3],
  ["wipeX2","WIPE CTR X","mixer2",-1,1,0],
  ["wipeY2","WIPE CTR Y","mixer2",-1,1,0],
  ["mixKeyThresh2","KEY THRESH","mixer2",0,1,0.5],
  ["mixKeySoft2","KEY SOFT","mixer2",0.01,1,0.2],
  ["mixKeyInv2","KEY INVERT","mixer2",0,1,0],
  ["mixKeyHue2","KEY HUE","mixer2",0,1,0.33],

  ["busMix","MASTER FADER 1>2","mixerM",0,1,0],
  ["wipeSoftM","WIPE SOFT","mixerM",0,1,0.03],
  ["wipeDetailM","WIPE DETAIL","mixerM",0,1,0.3],
  ["wipeXM","WIPE CTR X","mixerM",-1,1,0],
  ["wipeYM","WIPE CTR Y","mixerM",-1,1,0],
  ["mixKeyThreshM","KEY THRESH","mixerM",0,1,0.5],
  ["mixKeySoftM","KEY SOFT","mixerM",0.01,1,0.2],
  ["mixKeyInvM","KEY INVERT","mixerM",0,1,0],
  ["mixKeyHueM","KEY HUE","mixerM",0,1,0.33],

  ["morph","MORPH A>B","morph",0,1,0],

  ["srcZoom","ZOOM","frame",-1,1,0],
  ["srcX","POS X","frame",-1,1,0],
  ["srcY","POS Y","frame",-1,1,0],
  ["srcRot","ROTATE","frame",-1,1,0],
  ["kaleido","KALEIDO","frame",0,1,0],
  ["kaleidoN","FOLD N","frame",2,12,3],
  ["kaleidoRot","FOLD SPIN","frame",-1,1,0],
  ["kaleidoX","FOLD CTR X","frame",-1,1,0],
  ["kaleidoY","FOLD CTR Y","frame",-1,1,0],

  ["echo","ECHO","time",0,1,0],
  ["delayF","DELAY FRM","time",1,29,3],
  ["stutter","STUTTER","time",0,1,0],

  ["contour","CONTOUR","contour",0,1,0],
  ["contourBands","BANDS","contour",2,40,10],
  ["contourWidth","LINE WIDTH","contour",0.2,6,1.2],
  ["contourHue","LINE HUE","contour",0,1,0],
  ["contourFill","KEEP FILL","contour",0,1,0.25],
  ["lumaSteps","FLATTEN","contour",0,1,0],
  ["stepCount","LEVELS","contour",2,16,5],
  ["dither","DITHER","contour",0,1,0],

  ["sparseJit","SPARSE JITTER","lab",0,1,0],
  ["jitThresh","JITTER GATE","lab",0,1,0.7],
  ["ntscArt","NTSC ARTIFACT","lab",0,1,0],
  ["ntscFringe","NTSC FRINGE","lab",0,1,0],
  ["snow","SNOW","lab",0,1,0],
  ["snowAniso","SNOW CLUMP","lab",0,1,0.4],
  ["fmAmt","FM WOBBLE","lab",0,1,0],
  ["fmCarrier","FM CARRIER","lab",0,1,0.35],
  ["slitscan","SLITSCAN","lab",0,1,0],
  ["slitDir","SLIT DIR","lab",0,1,0],
  ["bitCrush","1-BIT CRUSH","lab",0,1,0],
  ["bitScale","CRUSH SCALE","lab",0,1,0.4],
  ["bandKey","BAND KEYER","lab",0,1,0],
  ["bandN","BANDS","lab",2,12,5],
  ["bandHue","BAND HUE","lab",0,1,0.3],
  ["rowSmear","ROW SMEAR","lab",0,1,0],
  ["moire","MOIRE","lab",0,1,0],
  ["moireFreq","MOIRE FREQ","lab",0,1,0.4],
  ["fieldMod","FIELD MOD","lab",0,1,0],
  ["fieldHue","FIELD > HUE","lab",-1,1,0],
  ["fieldWarp","FIELD > WARP","lab",-1,1,0],

  ["pixelSort","PIXEL SORT","glitch",0,1,0],
  ["sortThresh","SORT THRESH","glitch",0,1,0.45],
  ["blockShift","BLOCK TRASH","glitch",0,1,0],
  ["blockSize","BLOCK SIZE","glitch",0,1,0.35],
  ["dotify","HALFTONE","glitch",0,1,0],
  ["dotSize","DOT SIZE","glitch",0,1,0.4],
  ["driftWarp","DRIFT WARP","glitch",0,1,0],
  ["fmWarp","FM WARP","glitch",0,1,0],

  ["mosh","MOSH HOLD","flow",0,0.99,0],
  ["moshGate","MOSH GATE","flow",-1,1,0],
  ["moshVec","P-FRAME PUSH","flow",0,1,0],
  ["flowGain","FLOW GAIN","flow",0,3,1],
  ["flowCurl","CURL / ROTATE","flow",-1,1,0],
  ["melt","MELT","flow",0,1,0],
  ["meltDir","MELT DIR","flow",-1,1,0],
  ["meltGate","MELT GATE","flow",0,1,0],
  ["swirl","SWIRL","flow",0,1,0],
  ["swirlScale","SWIRL SCALE","flow",0,1,0.18],
  ["swirlSpeed","SWIRL SPEED","flow",0,1,0.08],
  ["moshBlock","VECTOR TRASH","flow",0,1,0],
  ["moshBlockSize","TRASH SIZE","flow",0,1,0.68],
  ["moshRate","TRASH RATE","flow",0,1,0.13],
  ["flowStretch","STRETCH","flow",-1,1,0],
  ["flowRepel","EDGE REPEL","flow",-1,1,0],
  ["flowNoise","FLOW NOISE","flow",0,1,0],
  ["flowSharp","RE-SHARP","flow",0,1,0],
  ["flowHue","HUE / PASS","flow",-1,1,0],
  ["flowFade","DECAY / PASS","flow",0,1,0],
  ["timeGrad","TIME SHEAR","flow",-1,1,0],
  ["shearAxis","SHEAR AXIS","flow",0,1,0],

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
  ["fbShearX","SHEAR X","feedback",-1,1,0],
  ["fbShearY","SHEAR Y","feedback",-1,1,0],
  ["fbGainR","GAIN R","feedback",0,1.5,1],
  ["fbGainG","GAIN G","feedback",0,1.5,1],
  ["fbGainB","GAIN B","feedback",0,1.5,1],
  ["fbSat","SAT / PASS","feedback",0.5,1.5,1],
  ["fbVal","VAL / PASS","feedback",0.5,1.5,1],
  ["fbPost","POSTERIZE","feedback",0,1,0],
  ["fbChromOff","CHROMA OFF","feedback",-1,1,0],
  ["fbBlur","BLUR","feedback",0,1,0],
  ["fbBlur2","BLUR 2 (DoG)","feedback",0,1,0],
  ["fbSharp","SHARPEN","feedback",0,2,0],
  ["fbDrive","DRIVE","feedback",0.2,4,1],
  ["fbPivot","PIVOT","feedback",0,1,0.5],
  ["fbThresh","THRESHOLD","feedback",0,1,0],
  ["fbThreshSoft","THRESH SOFT","feedback",0.005,0.5,0.05],
  ["fbNoise","LOOP NOISE","feedback",0,1,0],
  ["fbNoiseScale","NOISE SCALE","feedback",0,1,0.5],
  ["fbRoll","V ROLL / PASS","feedback",-1,1,0],
  ["fbJitter","SYNC JITTER","feedback",0,1,0],
  ["fbAuto","AUTO LEVEL","feedback",0,1,0],

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

  ["tapeSpeed","TAPE SPEED SP>EP","vhs",0,1,0],
  ["tracking","TRACKING","vhs",0,1,0],
  ["trackPhase","TRACK PHASE","vhs",-1,1,0],
  ["trackHunt","SERVO HUNT","vhs",0,1,0],
  ["dropout","DROPOUT","vhs",0,1,0],
  ["dropoutLen","DROPOUT LEN","vhs",0,1,0.35],
  ["chromaLoss","CHROMA LOSS","vhs",0,1,0],
  ["crease","TAPE CREASE","vhs",0,1,0],
  ["creasePos","CREASE POS","vhs",0,1,0.5],
  ["headClog","HEAD CLOG","vhs",0,1,0],
  ["azimuth","AZIMUTH ERR","vhs",0,1,0],
  ["headSwitch","HEAD SW","vhs",0,1,0.3],
  ["tapeWow","TAPE WOW","vhs",0,1,0.15],
  ["wowRate","WOW RATE","vhs",0,1,0.25],
  ["flutter","SCRAPE FLUTTER","vhs",0,1,0],
  ["tapeStretch","TAPE STRETCH","vhs",0,1,0],
  ["edgeDmg","EDGE DAMAGE","vhs",0,1,0],
  ["printThru","PRINT-THROUGH","vhs",0,1,0],
  ["hiss","TAPE HISS","vhs",0,1,0],
  ["stillNoise","STILL FRAME BAR","vhs",0,1,0],
  ["shuttleNz","SHUTTLE BANDS","vhs",0,1,0],
  ["genLoss","GEN LOSS","vhs",0,1,0.1],
  ["genCount","GENERATIONS","vhs",1,12,1],

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
  ["beamWidth","BEAM WIDTH","crt",0.1,3,1],
  ["beamShape","BEAM SHAPE","crt",0,1,0.5],
  ["aperture","MASK STRENGTH","crt",0,1,0.12],
  ["maskDark","MASK DARK","crt",0,1,0.5],
  ["curvature","CURVATURE","crt",0,1,0.3],
  ["cornerRound","CORNER","crt",0,1,0.2],
  ["vignette","VIGNETTE","crt",0,1,0.35],
  ["bloom","BLOOM","crt",0,1,0],
  ["bloomRad","BLOOM SIZE","crt",0,1,0.4],
  ["halation","HALATION","crt",0,1,0],
  ["defocus","DEFOCUS","crt",0,1,0],
  ["grain","FILM GRAIN","crt",0,1,0],
  ["outGamma","GAMMA","crt",0.4,2.5,1],
  ["outBright","BRIGHTNESS","crt",-0.5,0.5,0],
  ["outContrast","CONTRAST","crt",0.3,2.5,1],
  ["outSat","SATURATION","crt",0,2,1],
  ["outWarmth","WARMTH","crt",-1,1,0],
  ["blackLevel","BLACK LEVEL","crt",-0.2,0.3,0],
  ["whiteClip","WHITE CLIP","crt",0.5,1.5,1],
  ["phosphor","PERSISTENCE","crt",0,0.95,0],
  ["hvSag","HV SAG","crt",0,1,0],

  ["letterbox","LETTERBOX","overlay",0,0.4,0],
  ["pillarbox","PILLARBOX","overlay",0,0.4,0],
  ["bezel","BEZEL","overlay",0,1,0],
  ["glassRefl","GLASS GLARE","overlay",0,1,0],
  ["dust","DUST","overlay",0,1,0],
  ["scratches","SCRATCHES","overlay",0,1,0],
  ["ovMoire","SCREEN MOIRE","overlay",0,1,0],
  ["rollShutter","ROLL SHUTTER","overlay",0,1,0],
  ["safeArea","SAFE GUIDES","overlay",0,1,0],
];
/* Master sections are single-instance; everything else exists once per channel. */
const MASTER_SECS = new Set(["mixer","mixer2","mixerM","crt","morph"]);
const CHANNELS = ["A","B","C","D"];
const BUSPAIR = {A:"B", B:"A", C:"D", D:"C"};   // each channel's partner on its mixer bus
const P = {};           // id -> param descriptor
const PLIST = [];       // all params
const CLIST = [];       // per-channel params
const MLIST = [];       // master params
for(const [id,name,sec,min,max,def] of PDEF){
  const p = {id,name,sec,min,max,def,master:MASTER_SECS.has(sec)};
  P[id]=p; PLIST.push(p);
  (p.master ? MLIST : CLIST).push(p);
}
/* values */
const chanBase = {}, chanCur = {};
for(const ch of CHANNELS){ chanBase[ch]={}; chanCur[ch]={}; }
const mBase = {}, mCur = {};
for(const ch of CHANNELS) for(const p of CLIST){ chanBase[ch][p.id]=p.def; chanCur[ch][p.id]=p.def; }
for(const p of MLIST){ mBase[p.id]=p.def; mCur[p.id]=p.def; }

let activeChan = "A";      // which channel the panel is editing
let linkChans = false;     // edit both channels at once

function getBase(id, ch){ const p=P[id]; return p.master ? mBase[id] : chanBase[ch||activeChan][id]; }
function setBase(id, v, ch){
  const p=P[id]; if(!p) return;
  v = Math.min(p.max, Math.max(p.min, v));
  if(p.master){ mBase[id]=v; return; }
  if(ch){ chanBase[ch][id]=v; return; }
  if(linkChans){ for(const c of CHANNELS) chanBase[c][id]=v; }
  else chanBase[activeChan][id]=v;
}
function getCur(id, ch){ const p=P[id]; return p.master ? mCur[id] : chanCur[ch||activeChan][id]; }
function copyChannel(from, to){ for(const p of CLIST) chanBase[to][p.id] = chanBase[from][p.id]; }
let fbTrailMode = false;   // false=MIX  true=TRAIL(lighten)
let rescanMode = false;    // true = feedback taps the CRT-processed output (full rescan)
let chainOrder = ["sig","col","glitch","lab","flow"];    // drag-to-reorder signal chain
let stageEnabled = {sig:true, col:true, glitch:true, lab:true, flow:true};
let keyChroma = false;     // keyer mode: false=luma true=chroma
let mixMode = 0;           // BUS 1 (A/B) transition/blend mode (see MIXMODES)
let wipeInv = false;
let mixMode2 = 0, wipeInv2 = false;   // BUS 2 (C/D)
let mixModeM = 0, wipeInvM = false;   // MASTER (bus 1 / bus 2)
/* the mixer shader has one set of uniform names; each bus feeds it its own params */
const MIXP = ["abMix","wipeSoft","wipeDetail","wipeX","wipeY","mixKeyThresh","mixKeySoft","mixKeyInv","mixKeyHue"];
const MIXBUS = {
  b1: MIXP,
  b2: ["cdMix","wipeSoft2","wipeDetail2","wipeX2","wipeY2","mixKeyThresh2","mixKeySoft2","mixKeyInv2","mixKeyHue2"],
  bM: ["busMix","wipeSoftM","wipeDetailM","wipeXM","wipeYM","mixKeyThreshM","mixKeySoftM","mixKeyInvM","mixKeyHueM"]
};
let fbWrap = 0;        // 0 clamp 1 repeat 2 mirror
let fbMirror = 0;      // 0 none 1 H 2 V 3 quad
let fbBlend = 0;       // 0 mix 1 add 2 screen 3 max 4 min 5 difference
let fbNL = 0;          // 0 clamp 1 tanh 2 wrap 3 fold
let fbInvert = false;  // invert each pass
let fbTap = 0;         // 0 pre-display  1 post-display (rescan)
let flowField = 0;     // FLOW field: 0 motion 1 contour 2 curl-noise 3 radial 4 spiral 5 chroma 6 weave
let flowEdge = 0;      // FLOW edge: 0 clamp 1 repeat 2 mirror
let outModel = 0;      // display model index
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
const progGLITCH = makeProg(FS_GLITCH), progFLOW = makeProg(FS_FLOW), progCOPY = makeProg(FS_COPY);
const progMIX = makeProg(FS_MIX);
const progLAB = makeProg(FS_LAB);

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
const RING_N = 30;

/* Each channel owns its feedback history, flow history and frame ring;
   scratch buffers are shared because channels render one after the other. */
function newChanRT(){
  return {fbPrev:null, fbNext:null, crt:null, flowA:null, flowB:null, flowSrc:null, out:null,
          ring:null, ringW:0, ringFilled:0};
}
const chanRT = {};
for(const ch of CHANNELS) chanRT[ch] = newChanRT();
let scratch1, scratch2, mixOut, busOut1, busOut2, persistA, persistB;
let fieldSrc = 0;   // field-modulation source
const autoGain = {};
for(const ch of CHANNELS) autoGain[ch] = 1;

function freeRT(rt){ if(rt){ gl.deleteTexture(rt.tex); gl.deleteFramebuffer(rt.fbo); } }
function clearRing(c){
  if(c.ring) for(const rt of c.ring) freeRT(rt);
  c.ring=null; c.ringW=0; c.ringFilled=0;
}
function ensureRing(c){
  if(!c.ring){ c.ring=[]; for(let i=0;i<RING_N;i++) c.ring.push(makeRT(procW,procH)); c.ringW=0; c.ringFilled=0; }
}
function allocRTs(){
  for(const ch of CHANNELS){
    const c = chanRT[ch];
    for(const k of ["fbPrev","fbNext","crt","flowA","flowB","flowSrc","out"]) freeRT(c[k]);
    clearRing(c);
    c.fbPrev = makeRT(procW,procH); c.fbNext = makeRT(procW,procH);
    c.crt    = makeRT(procW,procH);
    c.flowA  = makeRT(procW,procH); c.flowB  = makeRT(procW,procH);
    c.flowSrc= makeRT(procW,procH);
    c.out    = makeRT(procW,procH);
  }
  freeRT(scratch1); freeRT(scratch2); freeRT(mixOut); freeRT(busOut1); freeRT(busOut2);
  freeRT(persistA); freeRT(persistB);
  scratch1 = makeRT(procW,procH); scratch2 = makeRT(procW,procH); mixOut = makeRT(procW,procH);
  busOut1 = makeRT(procW,procH); busOut2 = makeRT(procW,procH);
  persistA = makeRT(procW,procH); persistB = makeRT(procW,procH);
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
const srcTex = {};
for(const ch of CHANNELS) srcTex[ch] = makeSrcTex();

/* per-scanline sync model texture (written by CPU each frame) */
const SROWS = 576;
const SCHAN = 4;                 // one row of the sync texture per channel
const dispTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, dispTex);
gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,SROWS,SCHAN,0,gl.RGBA,gl.FLOAT,null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

function setParamUniforms(pr, ch){
  const cc = chanCur[ch||"A"];
  for(const p of PLIST){
    const loc = U(pr, "u_"+p.id);
    if(loc) gl.uniform1f(loc, p.master ? mCur[p.id] : cc[p.id]);
  }
}
function draw(){ gl.drawArrays(gl.TRIANGLES, 0, 3); }

/* animated signal state */
const vrollpos={}, humpos={};
for(const ch of CHANNELS){ vrollpos[ch]=0; humpos[ch]=0; }
let frameNo=0, bypass=0;

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
"uniform float u_flipMode,u_mirrorMode,u_multiN,u_shakeX,u_shakeY;\n" +
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
"  /* FLIP turns the picture over; MIRROR reflects one half onto the other;\n" +
"     MULTI tiles it into a grid. All before the aspect fit, so they act on the\n" +
"     picture rather than on the raster. */\n" +
"  if(u_flipMode>0.5){\n" +
"    if(u_flipMode<1.5) p.x = -p.x;\n" +
"    else if(u_flipMode<2.5) p.y = -p.y;\n" +
"    else p = -p;\n" +
"  }\n" +
"  if(u_multiN>1.5){\n" +
"    float n = floor(u_multiN);\n" +
"    vec2 g = fract((p+0.5)*n);\n" +
"    /* odd cells mirror, so the tiles meet instead of butting hard */\n" +
"    vec2 cell = floor((p+0.5)*n);\n" +
"    if(mod(cell.x,2.0)>0.5) g.x = 1.0-g.x;\n" +
"    if(mod(cell.y,2.0)>0.5) g.y = 1.0-g.y;\n" +
"    p = g-0.5;\n" +
"  }\n" +
"  if(u_mirrorMode>0.5){\n" +
"    if(u_mirrorMode<1.5) p.x = abs(p.x)-0.25;\n" +
"    else if(u_mirrorMode<2.5) p.y = abs(p.y)-0.25;\n" +
"    else p = abs(p)-0.25;\n" +
"  }\n" +
"  p += vec2(u_shakeX, u_shakeY);\n" +
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
/* pass: MIXER — three independent stages, the way a vision mixer actually works.
   TRANSITION decides how the fader reveals B over A (dissolve, wipe, slide,
   stretch). MIX TYPE decides how the two combine where both are visible
   (dissolve, additive, non-additive, difference, multiply, screen). KEY is a
   separate compositing stage on top — luminance, chroma or picture-in-picture.
   Splitting them means you can run a circle wipe AND a key at the same time,
   which one combined dropdown could never express. */
const FS_MIX = COMMON + KEYFN +
"uniform sampler2D u_texA; uniform sampler2D u_texB;\n" +
"uniform float u_mixMode,u_mixBlend,u_mixKey,u_hasB,u_abMix,u_time;\n" +
"uniform float u_wipeSoft,u_wipeDetail,u_wipeX,u_wipeY,u_wipeInv;\n" +
"uniform float u_wipeBord,u_wipeBordCol,u_wipeRep;\n" +
"uniform float u_mixKeyThresh,u_mixKeySoft,u_mixKeyInv,u_mixKeyHue;\n" +
"uniform float u_mixKeyGain,u_mixKeyDens,u_mixKeyEdge,u_mixKeyEdgeCol,u_mixKeyShadow;\n" +
"uniform float u_pipX,u_pipY,u_pipSize,u_pipBorder;\n" +
"uniform sampler2D u_prev; uniform float u_hasPrev;\n" +
"uniform float u_edgeAmt,u_edgeWidth,u_edgeHold,u_edgeSwirl,u_edgeChroma,u_edgeCreep;\n" +
"uniform float u_mixDirt,u_mixDirtRate,u_mixDirtDrop,u_mixDirtCut,u_mixDirtKnock,u_mixDirtNoise;\n" +
"/* the eight back colours a bench mixer offers, in the order they are always\n" +
"   listed: white, yellow, cyan, green, magenta, red, blue, black */\n" +
"vec3 backCol(float i){\n" +
"  int k = int(clamp(floor(i*7.999), 0.0, 7.0));\n" +
"  if(k==0) return vec3(1.0);\n" +
"  if(k==1) return vec3(1.0,1.0,0.0);\n" +
"  if(k==2) return vec3(0.0,1.0,1.0);\n" +
"  if(k==3) return vec3(0.0,1.0,0.0);\n" +
"  if(k==4) return vec3(1.0,0.0,1.0);\n" +
"  if(k==5) return vec3(1.0,0.0,0.0);\n" +
"  if(k==6) return vec3(0.0,0.0,1.0);\n" +
"  return vec3(0.0);\n}\n" +
"vec3 rgb2hsvM(vec3 c){\n" +
"  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);\n" +
"  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\n" +
"  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\n" +
"  float d = q.x - min(q.w, q.y);\n" +
"  return vec3(abs(q.z + (q.w - q.y)/(6.0*d + 1e-10)), d/(q.x + 1e-10), q.x);\n}\n" +
"vec3 hsv2rgbM(vec3 c){\n" +
"  vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0))*6.0 - 3.0);\n" +
"  return c.z * mix(vec3(1.0), clamp(p-1.0, 0.0, 1.0), c.y);\n}\n" +
"float bits(float x, float y, float mode){\n" +
"  int ix = int(clamp(x,0.0,1.0)*255.0), iy = int(clamp(y,0.0,1.0)*255.0);\n" +
"  int r = (mode<0.5) ? (ix ^ iy) : (ix & iy);\n" +
"  return float(r)/255.0;\n}\n" +
"float wipeField(vec2 uv, float mode, float outA){\n" +
"  /* MULTI tiles the whole pattern, the way a bench mixer's x4 / x16 does */\n" +
"  float rep = max(1.0, floor(u_wipeRep + 0.5));\n" +
"  vec2 tu = (rep > 1.5) ? fract(uv*rep) : uv;\n" +
"  vec2 off = vec2(u_wipeX, u_wipeY)*0.5;\n" +
"  vec2 c = tu - 0.5 - off;\n" +
"  /* normalised against the distance to the farthest corner from wherever the\n" +
"     origin has been moved to, so the fader travels evenly to full coverage */\n" +
"  vec2 far = abs(off) + 0.5;\n" +
"  float n = 2.0 + floor(u_wipeDetail*14.0);\n" +
"  if(mode<1.5) return tu.x;\n" +
"  if(mode<2.5) return 1.0-tu.y;\n" +
"  if(mode<3.5) return (tu.x + (1.0-tu.y))*0.5;\n" +
"  if(mode<4.5) return max(abs(c.x)/far.x, abs(c.y)/far.y);\n" +
"  if(mode<5.5) return length(c*vec2(outA,1.0))/max(length(far*vec2(outA,1.0)), 0.0001);\n" +
"  if(mode<6.5) return abs(c.x)/far.x;\n" +
"  if(mode<7.5) return abs(c.y)/far.y;\n" +
"  if(mode<8.5) return fract(tu.x*n);\n" +
"  if(mode<9.5) return fract(tu.y*n);\n" +
"  if(mode<10.5){ float a = atan(c.y, c.x)/6.2832 + 0.5; return fract(a); }\n" +
"  if(mode<11.5) return fract((tu.x + tu.y)*n*0.5);\n" +
"  return h21(floor(tu*vec2(n*2.0, n)));\n}\n" +
"/* SLIDE moves the incoming picture in from an edge; STRETCH squashes it in.\n" +
"   Both are transitions where B is repositioned rather than revealed. */\n" +
"vec2 slideUV(vec2 uv, float dir, float t, out float inside){\n" +
"  vec2 d = dir<0.5 ? vec2(1.0,0.0) : dir<1.5 ? vec2(-1.0,0.0) : dir<2.5 ? vec2(0.0,1.0) : vec2(0.0,-1.0);\n" +
"  vec2 p = uv + d*(1.0-t);\n" +
"  inside = step(0.0,p.x)*step(p.x,1.0)*step(0.0,p.y)*step(p.y,1.0);\n" +
"  return p;\n}\n" +
"vec2 stretchUV(vec2 uv, float dir, float t, out float inside){\n" +
"  float k = max(t, 0.0001);\n" +
"  vec2 p = uv;\n" +
"  if(dir<0.5){ p.x = uv.x/k; }\n" +
"  else if(dir<1.5){ p.x = 1.0-(1.0-uv.x)/k; }\n" +
"  else if(dir<2.5){ p.y = uv.y/k; }\n" +
"  else { p.y = 1.0-(1.0-uv.y)/k; }\n" +
"  inside = step(0.0,p.x)*step(p.x,1.0)*step(0.0,p.y)*step(p.y,1.0);\n" +
"  return p;\n}\n" +
"/* the keyer proper: clip and softness set where the matte turns over, GAIN\n" +
"   sets how hard it turns, DENSITY sets how opaque it can ever get */\n" +
"float keyMatte(vec2 p){\n" +
"  float k = keyOf(texture(u_texB, clamp(p,0.0,1.0)).rgb,\n" +
"                  u_mixKey > 2.5 ? 1.0 : 0.0,\n" +
"                  u_mixKeyHue, u_mixKeyThresh, u_mixKeySoft,\n" +
"                  (u_mixKey < 1.5) ? 1.0-u_mixKeyInv : u_mixKeyInv);\n" +
"  k = pow(clamp(k,0.0,1.0), mix(3.2, 0.3, clamp(u_mixKeyGain,0.0,1.0)));\n" +
"  return k * clamp(u_mixKeyDens, 0.0, 1.0);\n}\n" +
"/* The same coverage calculation the mixer uses, evaluated anywhere on the\n" +
"   frame. The melt stage needs it at neighbouring points to find the boundary\n" +
"   and which way it faces, which is cheap here because the wipe is analytic. */\n" +
"float matteAt(vec2 uv, float mm, float t, float outA){\n" +
"  float m = t, ins = 1.0;\n" +
"  vec2 buv = uv;\n" +
"  if(mm > 0.5 && mm < 12.5){\n" +
"    float d = wipeField(uv, mm, outA);\n" +
"    if(u_wipeInv>0.5) d = 1.0-d;\n" +
"    float sw = max(u_wipeSoft*0.5, 0.002);\n" +
"    m = smoothstep(d-sw, d+sw, t*(1.0+2.0*sw)-sw);\n" +
"  } else if(mm > 12.5 && mm < 16.5){\n" +
"    buv = slideUV(uv, mm-13.0, t, ins); m = ins;\n" +
"  } else if(mm > 16.5 && mm < 20.5){\n" +
"    buv = stretchUV(uv, mm-17.0, t, ins); m = ins;\n" +
"  }\n" +
"  if(u_mixKey > 0.5){\n" +
"    if(u_mixKey < 3.5){\n" +
"      m *= keyMatte(buv);\n" +
"    } else {\n" +
"      float sz = 0.08 + u_pipSize*0.62;\n" +
"      vec2 ctr = vec2(0.5,0.5) + vec2(u_pipX, u_pipY)*0.42;\n" +
"      vec2 hw = vec2(sz*0.5, sz*0.5*outA);\n" +
"      vec2 q = (uv - ctr)/hw;\n" +
"      m = step(max(abs(q.x),abs(q.y)), 1.0)*t;\n" +
"    }\n" +
"  }\n" +
"  return clamp(m, 0.0, 1.0);\n}\n" +
"/* Twenty-four ways for two pictures to meet. The first six keep the indices\n" +
"   they have always had so old patches still load. */\n" +
"vec3 combine(vec3 a, vec3 b, float m, float blend){\n" +
"  if(blend<0.5) return mix(a, b, m);\n" +                 /* DISSOLVE */
"  if(blend<1.5) return a + b*m;\n" +                      /* ADDITIVE  (FAM) */
"  if(blend<2.5) return mix(a, max(a,b), m);\n" +          /* NON-ADD   (NAM) */
"  if(blend<3.5) return mix(a, abs(a-b), m);\n" +          /* DIFFERENCE */
"  if(blend<4.5) return mix(a, a*b*1.6, m);\n" +           /* MULTIPLY */
"  if(blend<5.5) return mix(a, 1.0-(1.0-a)*(1.0-b), m);\n" +   /* SCREEN */
"  if(blend<6.5) return mix(a, min(a,b), m);\n" +          /* DARKEN */
"  if(blend<7.5) return mix(a, a+b-2.0*a*b, m);\n" +       /* EXCLUSION */
"  if(blend<8.5) return mix(a, a-b, m);\n" +              /* SUBTRACT */
"  if(blend<9.5){                                     \n" +   /* OVERLAY */
"    vec3 r = mix(2.0*a*b, 1.0-2.0*(1.0-a)*(1.0-b), step(0.5,a));\n" +
"    return mix(a, r, m); }\n" +
"  if(blend<10.5){                                    \n" +   /* HARD LIGHT */
"    vec3 r = mix(2.0*a*b, 1.0-2.0*(1.0-a)*(1.0-b), step(0.5,b));\n" +
"    return mix(a, r, m); }\n" +
"  if(blend<11.5){                                    \n" +   /* SOFT LIGHT */
"    vec3 r = mix(2.0*a*b + a*a*(1.0-2.0*b), sqrt(max(a,0.0))*(2.0*b-1.0) + 2.0*a*(1.0-b), step(0.5,b));\n" +
"    return mix(a, r, m); }\n" +
"  if(blend<12.5){                                    \n" +   /* VIVID LIGHT */
"    vec3 r = mix(1.0 - (1.0-a)/max(2.0*b, 0.001), a/max(1.0-2.0*(b-0.5), 0.001), step(0.5,b));\n" +
"    return mix(a, clamp(r,0.0,1.6), m); }\n" +
"  if(blend<13.5){                                    \n" +   /* PIN LIGHT */
"    vec3 r = mix(min(a, 2.0*b), max(a, 2.0*(b-0.5)), step(0.5,b));\n" +
"    return mix(a, r, m); }\n" +
"  if(blend<14.5) return mix(a, clamp(a/max(1.0-b, 0.004), 0.0, 1.6), m);\n" +   /* COLOUR DODGE */
"  if(blend<15.5) return mix(a, 1.0-clamp((1.0-a)/max(b, 0.004), 0.0, 1.6), m);\n" + /* COLOUR BURN */
"  if(blend<16.5) return mix(a, clamp(a/max(b, 0.004), 0.0, 1.6), m);\n" +      /* DIVIDE */
"  if(blend<17.5) return mix(a, fract(a + b*1.5), m);\n" +   /* WRAP ADD: the analogue overflow */
"  if(blend<18.5) return mix(a, vec3(bits(a.r,b.r,0.0), bits(a.g,b.g,0.0), bits(a.b,b.b,0.0)), m);\n" +
"  if(blend<19.5) return mix(a, vec3(bits(a.r,b.r,1.0), bits(a.g,b.g,1.0), bits(a.b,b.b,1.0)), m);\n" +
"  vec3 ha = rgb2hsvM(clamp(a,0.0,1.0)), hb = rgb2hsvM(clamp(b,0.0,1.0));\n" +
"  if(blend<20.5) return mix(a, hsv2rgbM(vec3(hb.x, ha.y, ha.z)), m);\n" +   /* HUE */
"  if(blend<21.5) return mix(a, hsv2rgbM(vec3(ha.x, hb.y, ha.z)), m);\n" +   /* SATURATION */
"  if(blend<22.5) return mix(a, hsv2rgbM(vec3(hb.x, hb.y, ha.z)), m);\n" +   /* COLOUR */
"  return mix(a, hsv2rgbM(vec3(ha.x, ha.y, hb.z)), m);\n}\n" +               /* LUMINOSITY */
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  float outA = u_res.x/u_res.y;\n" +
"  if(u_hasB<0.5 || u_abMix<0.0005){ O = vec4(texture(u_texA, uv).rgb,1.0); return; }\n" +
"  float t = u_abMix;\n" +
"  float mm = u_mixMode;\n" +
"  /* ---- 0. the dirty mixer ----\n" +
"     A bench mixer that has been dropped, or had its crossbar chip lifted,\n" +
"     does not fail smoothly. It fires: the switcher jumps to the wrong input\n" +
"     for a field, the timebase is knocked sideways and crawls back, a band of\n" +
"     lines drops out to whatever is on the other side of the crossbar, and the\n" +
"     switching transient sprays noise across the picture. So this runs on an\n" +
"     event clock rather than as a continuous wobble: DIRT decides how often a\n" +
"     tick fires at all, RATE how fast the clock runs, and the four flavours\n" +
"     decide what a firing does. Everything decays inside its own tick. */\n" +
"  float dirtE = 0.0, dirtSeed = 0.0;\n" +
"  vec2 duv = uv;\n" +
"  if(u_mixDirt > 0.002){\n" +
"    float dr = 0.5 + u_mixDirtRate*15.0;\n" +
"    float ph = u_time*dr;\n" +
"    float tk = floor(ph), fr = fract(ph);\n" +
"    dirtSeed = tk;\n" +
"    float fire = step(h21(vec2(tk, 7.71)), clamp(u_mixDirt,0.0,1.0)*0.85);\n" +
"    dirtE = fire * exp(-fr*mix(11.0, 1.6, u_mixDirt));\n" +
"    /* the knock: a horizontal shove that shears down the frame and recovers */\n" +
"    float kn = dirtE*u_mixDirtKnock;\n" +
"    if(kn > 0.0005){\n" +
"      float rowI = floor(uv.y*u_res.y);\n" +
"      float shove = (h21(vec2(tk, 5.53))-0.5)*0.16*kn;\n" +
"      shove *= mix(1.0, 1.0-uv.y, 0.6);\n" +
"      shove += (h21(vec2(rowI, tk*0.77))-0.5)*0.05*kn;\n" +
"      duv.x += shove;\n" +
"      duv.y = fract(duv.y + (h21(vec2(tk, 2.19))-0.5)*0.06*kn);\n" +
"    }\n" +
"  }\n" +
"  vec3 a = texture(u_texA, clamp(duv,0.0,1.0)).rgb;\n" +
"  /* ---- 1. where does B come from, and how much of it shows ---- */\n" +
"  vec2 buv = duv;\n" +
"  float m = t, inside = 1.0, wipeBand = 0.0;\n" +
"  if(mm > 0.5 && mm < 12.5){\n" +
"    float d = wipeField(duv, mm, outA);\n" +
"    if(u_wipeInv>0.5) d = 1.0-d;\n" +
"    float sw = max(u_wipeSoft*0.5, 0.002);\n" +
"    float tt = t*(1.0+2.0*sw)-sw;\n" +
"    m = smoothstep(d-sw, d+sw, tt);\n" +
"    /* BORDER WIPE: a coloured rule laid along the join, as on a bench mixer */\n" +
"    if(u_wipeBord > 0.002){\n" +
"      float bw = 0.004 + u_wipeBord*0.1;\n" +
"      wipeBand = (1.0 - smoothstep(bw*0.45, bw, abs(d - tt))) * step(0.004, t) * step(t, 0.996);\n" +
"    }\n" +
"  } else if(mm > 12.5 && mm < 16.5){\n" +
"    buv = slideUV(duv, mm-13.0, t, inside);\n" +
"    m = inside;\n" +
"  } else if(mm > 16.5 && mm < 20.5){\n" +
"    buv = stretchUV(duv, mm-17.0, t, inside);\n" +
"    m = inside;\n" +
"  }\n" +
"  /* ---- 2. the key stage, independent of the transition ---- */\n" +
"  float border = 0.0, keyEdge = 0.0, keyShad = 0.0;\n" +
"  if(u_mixKey > 0.5){\n" +
"    if(u_mixKey < 3.5){\n" +
"      /* 1 = white luma, 2 = black luma, 3 = chroma. The key is taken from the\n" +
"         incoming picture, so its bright, dark or coloured parts drop out. */\n" +
"      float km = keyMatte(buv);\n" +
"      /* BORDER and SHADOW are the title-edge treatments a bench mixer offers:\n" +
"         the matte is grown outward for an outline, and offset down-right and\n" +
"         darkened for a drop shadow. Both read from the same matte. */\n" +
"      if(u_mixKeyEdge > 0.002){\n" +
"        float r = (0.002 + u_mixKeyEdge*0.02);\n" +
"        vec2 rx = vec2(r/outA, 0.0), ry = vec2(0.0, r);\n" +
"        float g = max(max(keyMatte(buv-rx), keyMatte(buv+rx)),\n" +
"                      max(keyMatte(buv-ry), keyMatte(buv+ry)));\n" +
"        g = max(g, max(keyMatte(buv-rx-ry), keyMatte(buv+rx+ry)));\n" +
"        keyEdge = clamp(g - km, 0.0, 1.0);\n" +
"      }\n" +
"      if(u_mixKeyShadow > 0.002){\n" +
"        float sh = u_mixKeyShadow*0.035;\n" +
"        keyShad = clamp(keyMatte(buv - vec2(sh/outA, -sh)) - km, 0.0, 1.0);\n" +
"      }\n" +
"      m *= km;\n" +
"    } else {\n" +
"      /* picture in picture: B is scaled into a subscreen with a border */\n" +
"      float sz = 0.08 + u_pipSize*0.62;\n" +
"      vec2 ctr = vec2(0.5,0.5) + vec2(u_pipX, u_pipY)*0.42;\n" +
"      vec2 hw = vec2(sz*0.5, sz*0.5*outA);\n" +
"      vec2 q = (duv - ctr)/hw;\n" +
"      buv = q*0.5 + 0.5;\n" +
"      float bw = u_pipBorder*0.16;\n" +
"      float inBox = step(max(abs(q.x),abs(q.y)), 1.0);\n" +
"      border = step(max(abs(q.x),abs(q.y)), 1.0+bw) - inBox;\n" +
"      m = inBox*t;\n" +
"    }\n" +
"  }\n" +
"  /* ---- 3. the melt: treat the boundary itself as a feedback region ----\n" +
"     The matte is sampled at four points a chosen distance away. Where those\n" +
"     four disagree we are standing on the edge, and the direction in which\n" +
"     they disagree is the way the edge faces. That gives a band of controlled\n" +
"     width with a normal, and everything else follows from it: the incoming\n" +
"     picture is dragged along the normal so the seam smears, and the mixer's\n" +
"     own last frame is dissolved back in inside the band, so the smear stays\n" +
"     put and creeps a little further out every frame. That is what makes it\n" +
"     melt instead of blur, and it only happens at the edge. */\n" +
"  float band = 0.0; vec2 en = vec2(0.0);\n" +
"  if(u_edgeAmt > 0.002){\n" +
"    float r = 0.004 + u_edgeWidth*0.085;\n" +
"    vec2 rx = vec2(r/outA, 0.0), ry = vec2(0.0, r);\n" +
"    float mL = matteAt(duv-rx, mm, t, outA), mR = matteAt(duv+rx, mm, t, outA);\n" +
"    float mD = matteAt(duv-ry, mm, t, outA), mU = matteAt(duv+ry, mm, t, outA);\n" +
"    float mn = min(min(mL,mR),min(mD,mU)), mx = max(max(mL,mR),max(mD,mU));\n" +
"    band = clamp((mx-mn)*1.25, 0.0, 1.0);\n" +
"    vec2 g = vec2(mR-mL, mU-mD);\n" +
"    float gl = length(g);\n" +
"    en = (gl > 1e-5) ? g/gl : vec2(0.0);\n" +
"    float sa = u_edgeSwirl*1.5708;\n" +
"    en = vec2(cos(sa)*en.x - sin(sa)*en.y, sin(sa)*en.x + cos(sa)*en.y);\n" +
"    /* CREEP pushes the melt onto the outgoing side, so the shape bleeds into\n" +
"       the background rather than the background eating into the shape */\n" +
"    band *= mix(1.0, 1.0 - clamp(m,0.0,1.0), u_edgeCreep);\n" +
"  }\n" +
"  vec2 bd = en * band * u_edgeAmt * 0.055;\n" +
"  vec3 b = texture(u_texB, clamp(buv + bd, 0.0, 1.0)).rgb;\n" +
"  /* a firing can throw the crossbar to the wrong input for a moment */\n" +
"  if(dirtE > 0.001 && u_mixDirtCut > 0.002){\n" +
"    float want = step(0.5, h21(vec2(dirtSeed, 3.17)));\n" +
"    m = mix(m, want, clamp(dirtE*u_mixDirtCut*1.4, 0.0, 1.0));\n" +
"  }\n" +
"  vec3 src = combine(a, b, clamp(m,0.0,1.0), u_mixBlend);\n" +
"  /* the keyed edge treatments sit on top of the composite */\n" +
"  if(keyShad > 0.001) src = mix(src, src*(1.0 - 0.8*u_mixKeyShadow), keyShad);\n" +
"  if(keyEdge > 0.001) src = mix(src, backCol(u_mixKeyEdgeCol), keyEdge*clamp(u_mixKeyEdge*3.0,0.0,1.0));\n" +
"  if(wipeBand > 0.001) src = mix(src, backCol(u_wipeBordCol), wipeBand*clamp(u_wipeBord*2.5,0.0,1.0));\n" +
"  if(u_hasPrev > 0.5 && band > 0.001 && u_edgeHold > 0.002){\n" +
"    vec2 pd = en * (0.0015 + u_edgeAmt*0.04);\n" +
"    vec3 pv = texture(u_prev, clamp(uv + pd, 0.0, 1.0)).rgb;\n" +
"    if(u_edgeChroma > 0.002){\n" +
"      /* colour runs further than luma, the way it does off a composite edge */\n" +
"      vec3 pc = texture(u_prev, clamp(uv + pd*(1.0+3.0*u_edgeChroma), 0.0, 1.0)).rgb;\n" +
"      vec3 y1 = rgb2yiq(pv), y2 = rgb2yiq(pc);\n" +
"      pv = yiq2rgb(vec3(y1.x, mix(y1.yz, y2.yz, u_edgeChroma)));\n" +
"    }\n" +
"    src = mix(src, pv, clamp(band*u_edgeHold, 0.0, 0.94));\n" +
"  }\n" +
"  if(border > 0.5) src = mix(src, vec3(1.0), t);\n" +
"  /* ---- 4. what is left of a firing: dropped lines and switching noise ---- */\n" +
"  if(dirtE > 0.001){\n" +
"    if(u_mixDirtDrop > 0.002){\n" +
"      float bandH = 2.0 + 26.0*h21(vec2(dirtSeed, 1.31));\n" +
"      float rowb = floor(uv.y*u_res.y/bandH);\n" +
"      float dh = h21(vec2(rowb, dirtSeed*0.77));\n" +
"      float drop = step(1.0 - clamp(u_mixDirtDrop*dirtE*1.3, 0.0, 0.95), dh);\n" +
"      if(drop > 0.5){\n" +
"        /* half the time the line drops through to the other side of the\n" +
"           crossbar, half the time to nothing at all */\n" +
"        float toOther = step(0.5, h21(vec2(rowb*1.7, dirtSeed)));\n" +
"        float sk = (h21(vec2(rowb, dirtSeed*2.3))-0.5)*0.09;\n" +
"        vec3 alt = mix(texture(u_texA, clamp(vec2(uv.x+sk, uv.y),0.0,1.0)).rgb,\n" +
"                       texture(u_texB, clamp(vec2(uv.x+sk, uv.y),0.0,1.0)).rgb, toOther);\n" +
"        float dead = step(0.82, h21(vec2(rowb*3.1, dirtSeed)));\n" +
"        alt = mix(alt, vec3(h21(vec2(floor(uv.x*u_res.x/2.5), rowb+dirtSeed))*0.5), dead);\n" +
"        src = mix(src, alt, clamp(u_mixDirtDrop*1.2, 0.0, 1.0));\n" +
"      }\n" +
"    }\n" +
"    if(u_mixDirtNoise > 0.002){\n" +
"      float nx = floor(uv.x*u_res.x/3.0);\n" +
"      float ny = floor(uv.y*u_res.y);\n" +
"      float nz = h21(vec2(nx + ny*13.7, dirtSeed*7.3)) - 0.5;\n" +
"      src += nz*u_mixDirtNoise*dirtE*1.6;\n" +
"      src = mix(src, vec3(dot(src, vec3(0.299,0.587,0.114))), u_mixDirtNoise*dirtE*0.5);\n" +
"    }\n" +
"  }\n" +
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
/* Horizontal taps must not wrap. The picture genuinely rolls vertically, so
   Y still wraps, but a tap that runs off the left of the line has to read
   the edge rather than the far side of the frame - otherwise the peaking
   filter, the dot crawl and the aperture correction all compare the first
   pixel of a line against the last one and ring hard down both edges. */
"float lum(vec2 p){ return dot(texture(u_tex, vec2(clamp(p.x,0.0,1.0), fract(p.y))).rgb, vec3(0.299,0.587,0.114)); }\n" +
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
"  /* taps that fall outside the frame contribute nothing rather than wrapping\n" +
"     round to the opposite edge, so the bleed fades out at the sides */\n" +
"  float iqw = 0.0;\n" +
"  for(int i=0;i<9;i++){\n" +
"    float fi = float(i)-2.5;\n" +
"    vec2 tp = suv + vec2(fi*spread*px - cdel, 0.0);\n" +
"    float inb = step(0.0, tp.x)*step(tp.x, 1.0);\n" +
"    iq += rgb2yiq(texture(u_tex, clamp(tp, 0.0, 1.0)).rgb).yz * inb;\n" +
"    iqw += inb;\n" +
"  }\n" +
"  iq /= max(iqw, 1.0);\n" +
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
"      float sx = suv.x - float(k)*bstep;\n" +
"      /* nothing to bleed from beyond the edge of the frame */\n" +
"      if(sx < 0.0 || sx > 1.0) continue;\n" +
"      acc = max(acc, lum(vec2(sx, suv.y)) - float(k)*fall);\n" +
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
"      vec2 tp = suv + vec2(0.0, float(k)*(1.0+u_vBleed*5.0)*pyx);\n" +
"      float inb = step(0.0, tp.y)*step(tp.y, 1.0);\n" +
"      iqv += w*inb*rgb2yiq(texture(u_tex, clamp(tp, 0.0, 1.0)).rgb).yz;\n" +
"      wsum += w*inb;\n" +
"    }\n" +
"    iq = mix(iq, iqv/max(wsum, 0.0001), u_vBleed*0.75*step(0.0001, wsum));\n" +
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
"uniform float u_negative,u_negMode,u_monoCol,u_monoHue,u_colorPass,u_passHue,u_passWidth;\n" +
"uniform float u_silhouette,u_silThresh,u_silHue,u_findEdge,u_edgeHue,u_emboss,u_embossDir;\n" +
"float lum(vec2 p){ return dot(texture(u_tex, clamp(p,0.0,1.0)).rgb, vec3(0.299,0.587,0.114)); }\n" +
"vec3 hsv2(float h, float sa, float v){\n" +
"  vec3 k = fract(vec3(h) + vec3(0.0, 2.0/3.0, 1.0/3.0));\n" +
"  return v * mix(vec3(1.0), clamp(abs(k*6.0-3.0)-1.0, 0.0, 1.0), sa);\n}\n" +
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
"  /* ---- the video-mixer effect family ---- */\n" +
"  float lm2 = dot(c, vec3(0.299,0.587,0.114));\n" +
"  /* NEGATIVE: invert brightness, colour, or both */\n" +
"  if(u_negative>0.003){\n" +
"    vec3 nb = vec3(1.0) - c;\n" +
"    vec3 nv;\n" +
"    if(u_negMode < 0.5) nv = nb;\n" +
"    else if(u_negMode < 1.5) nv = clamp(vec3(lm2) + (vec3(lm2) - (c - vec3(lm2))) - vec3(lm2), 0.0, 1.0);\n" +
"    else nv = clamp(c + vec3(1.0 - 2.0*lm2), 0.0, 1.0);\n" +
"    c = mix(c, nv, u_negative);\n" +
"  }\n" +
"  /* COLORPASS: one hue survives, everything else goes monochrome */\n" +
"  if(u_colorPass>0.003){\n" +
"    vec3 q = rgb2yiq(c);\n" +
"    float ang = atan(q.z, q.y)/6.2832 + 0.5;\n" +
"    float d = abs(fract(ang - u_passHue + 0.5) - 0.5)*2.0;\n" +
"    float keep = 1.0 - smoothstep(u_passWidth*0.5, u_passWidth*0.5 + 0.12, d);\n" +
"    keep *= smoothstep(0.02, 0.16, length(q.yz));\n" +
"    c = mix(mix(vec3(lm2), c, keep), c, 1.0 - u_colorPass);\n" +
"  }\n" +
"  /* MONOCOLOR: the whole picture through one colour */\n" +
"  if(u_monoCol>0.003) c = mix(c, hsv2(u_monoHue, 1.0, 1.0)*(0.15 + lm2*1.15), u_monoCol);\n" +
"  /* SILHOUETTE: threshold to a flat colour on black */\n" +
"  if(u_silhouette>0.003){\n" +
"    float sm = smoothstep(u_silThresh-0.06, u_silThresh+0.06, lm2);\n" +
"    c = mix(c, hsv2(u_silHue, 1.0, 1.0)*sm, u_silhouette);\n" +
"  }\n" +
"  /* FINDEDGE: a Sobel outline, coloured, on a dark ground */\n" +
"  if(u_findEdge>0.003){\n" +
"    vec2 e = 1.0/u_res;\n" +
"    float gx = lum(uv+vec2(e.x,0.0)) - lum(uv-vec2(e.x,0.0));\n" +
"    float gy = lum(uv+vec2(0.0,e.y)) - lum(uv-vec2(0.0,e.y));\n" +
"    float g = clamp(length(vec2(gx,gy))*4.5, 0.0, 1.0);\n" +
"    c = mix(c, hsv2(u_edgeHue + g*0.25, 0.9, 1.0)*g, u_findEdge);\n" +
"  }\n" +
"  /* EMBOSS: a directional difference lit from one side */\n" +
"  if(u_emboss>0.003){\n" +
"    float a2 = u_embossDir*6.2832;\n" +
"    vec2 d2 = vec2(cos(a2), sin(a2))*1.6/u_res;\n" +
"    float em = (lum(uv+d2) - lum(uv-d2))*3.0 + 0.5;\n" +
"    c = mix(c, vec3(em)*mix(vec3(1.0), c*1.6, 0.35), u_emboss);\n" +
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
"uniform sampler2D u_osd;\n" +
"uniform float u_lensDist,u_lensCA,u_lensStreak,u_streakHue,u_lensSmudge;\n" +
"uniform float u_lightLeak,u_leakHue,u_gateWeave,u_gateHair,u_stuckPix,u_lcdGrid;\n" +
"uniform float u_osdShow,u_osdGlow;\n" +
"vec3 hsvOut(vec3 c){\n" +
"  vec3 q = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0))*6.0 - 3.0);\n" +
"  return c.z * mix(vec3(1.0), clamp(q-1.0, 0.0, 1.0), c.y);\n}\n" +
"/* value noise: four hashed corners, smoothstep between them. Used for the\n" +
"   smears on the glass and for the gate weave, both of which need something\n" +
"   that drifts rather than fizzes. */\n" +
"float vnoise(vec2 p){\n" +
"  vec2 i = floor(p), f = fract(p);\n" +
"  f = f*f*(3.0-2.0*f);\n" +
"  float a = h21(i), b = h21(i+vec2(1.0,0.0)), c2 = h21(i+vec2(0.0,1.0)), d2 = h21(i+vec2(1.0,1.0));\n" +
"  return mix(mix(a,b,f.x), mix(c2,d2,f.x), f.y);\n}\n" +
"float fbm2(vec2 p){ return vnoise(p)*0.6 + vnoise(p*2.1+7.3)*0.3 + vnoise(p*4.3+13.1)*0.1; }\n" +
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
"  /* the lens, as distinct from the tube: a real barrel or pincushion term\n" +
"     applied to the whole picture, plus the gate weave of a projector whose\n" +
"     registration pins have worn. Both happen before anything is sampled, so\n" +
"     the picture genuinely moves rather than being smeared. */\n" +
"  if(abs(u_lensDist)>0.003){\n" +
"    vec2 dl = cuv-0.5; float r2 = dot(dl,dl);\n" +
"    cuv = 0.5 + dl*(1.0 + u_lensDist*0.9*r2);\n" +
"  }\n" +
"  if(u_gateWeave>0.003){\n" +
"    float tw = u_time*1.7;\n" +
"    vec2 wv = vec2(vnoise(vec2(tw, 3.1))-0.5, vnoise(vec2(tw*0.8+11.0, 7.9))-0.5);\n" +
"    wv += vec2(0.0, (h21(vec2(floor(u_time*24.0), 5.0))-0.5)*0.35);\n" +
"    cuv += wv*u_gateWeave*0.03;\n" +
"  }\n" +
"  /* rounded corners / tube edge */\n" +
"  vec2 ab = abs(p) - vec2(1.0 - u_cornerRound*0.18);\n" +
"  float corner = length(max(ab,0.0)) - u_cornerRound*0.18;\n" +
"  if(cuv.x<0.0||cuv.x>1.0||cuv.y<0.0||cuv.y>1.0 || corner>0.0){ O=vec4(0.0,0.0,0.0,1.0); return; }\n" +
"  /* rolling shutter beat against the field rate */\n" +
"  if(u_rollShutter>0.003){ cuv.y += sin((uv.y*3.0 + u_time*0.7)*3.14159)*u_rollShutter*0.004; }\n" +
"  vec3 c = texture(u_tex, clamp(cuv,0.0,1.0)).rgb;\n" +
"  /* transverse chromatic aberration: the three primaries focus at slightly\n" +
"     different scales, so colour fringes grow towards the corners */\n" +
"  if(u_lensCA>0.003){\n" +
"    vec2 dc = cuv-0.5;\n" +
"    float kr = 1.0 + u_lensCA*0.012, kb = 1.0 - u_lensCA*0.012;\n" +
"    c.r = texture(u_tex, clamp(0.5+dc*kr, 0.0, 1.0)).r;\n" +
"    c.b = texture(u_tex, clamp(0.5+dc*kb, 0.0, 1.0)).b;\n" +
"  }\n" +
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
"      vec2 tp = cuv+off;\n" +
"      /* a tap past the edge of the picture contributes nothing, rather than\n" +
"         returning the edge pixel again and stacking it into a bright rim */\n" +
"      float inb = step(0.0,tp.x)*step(tp.x,1.0)*step(0.0,tp.y)*step(tp.y,1.0);\n" +
"      float w = inb/(1.0+r*1.4);\n" +
"      blur += texture(u_tex, clamp(tp,0.0,1.0)).rgb*w; wsum += w;\n" +
"    }\n" +
"    blur = (wsum > 0.0001) ? blur/wsum : c;\n" +
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
"  /* ---- the lens and the room in front of the screen ---- */\n" +
"  if(u_lensStreak>0.003){\n" +
"    /* anamorphic streak: a horizontal flare off anything hot enough to bloom,\n" +
"       which is the one artefact that reads instantly as a lens rather than a\n" +
"       filter, and it is blue because the coatings that cause it are */\n" +
"    vec3 st = vec3(0.0); float sw = 0.0;\n" +
"    for(int i=1;i<=10;i++){\n" +
"      float o = float(i)*(0.006 + u_bloomRad*0.02);\n" +
"      float ww = 1.0/float(i);\n" +
"      vec2 lp = cuv+vec2(o,0.0), rp = cuv-vec2(o,0.0);\n" +
"      float li = step(0.0,lp.x)*step(lp.x,1.0), ri = step(0.0,rp.x)*step(rp.x,1.0);\n" +
"      st += max(texture(u_tex, clamp(lp,0.0,1.0)).rgb-0.62, 0.0)*ww*li;\n" +
"      st += max(texture(u_tex, clamp(rp,0.0,1.0)).rgb-0.62, 0.0)*ww*ri;\n" +
"      sw += ww*2.0;\n" +
"    }\n" +
"    st /= max(sw, 0.0001);\n" +
"    c += st*u_lensStreak*6.0*mix(vec3(1.0), vec3(0.3,0.55,1.7), u_streakHue);\n" +
"  }\n" +
"  if(u_lensSmudge>0.003){\n" +
"    /* dirty glass. A smear is only visible where something bright is behind\n" +
"       it, which is why this is gated on the highlights rather than laid over\n" +
"       the picture like a texture. */\n" +
"    float sm = fbm2(uv*vec2(5.0,3.0)) * fbm2(uv*vec2(11.0,7.0)+4.4);\n" +
"    sm = smoothstep(0.18, 0.62, sm);\n" +
"    float hl = max(lum3(c)-0.35, 0.0);\n" +
"    c += sm*hl*u_lensSmudge*1.6;\n" +
"    c = mix(c, c*(1.0-sm*0.35), u_lensSmudge*0.4);\n" +
"  }\n" +
"  if(u_lightLeak>0.003){\n" +
"    /* film edge fog: light getting past the felt and fogging one side of the\n" +
"       frame, wandering slowly and breathing */\n" +
"    float ang = u_time*0.043;\n" +
"    vec2 dir = vec2(cos(ang), sin(ang));\n" +
"    float g = clamp(dot(uv-0.5, dir)*1.6 + 0.55, 0.0, 1.0);\n" +
"    g = pow(g, 2.4) * (0.55 + 0.45*sin(u_time*0.61) * 0.5 + 0.225);\n" +
"    g *= 0.75 + 0.25*fbm2(uv*3.0 + u_time*0.05);\n" +
"    c += g*u_lightLeak*1.1*hsvOut(vec3(fract(u_leakHue), 0.75, 1.0));\n" +
"  }\n" +
"  if(u_gateHair>0.003){\n" +
"    /* a hair caught in the gate, hanging from the top and twitching */\n" +
"    float sway = (vnoise(vec2(u_time*1.3, 2.0))-0.5)*0.05;\n" +
"    float hx = 0.26 + sway + sin(uv.y*9.0 + u_time*0.4)*0.02;\n" +
"    float hair = 1.0 - smoothstep(0.0008, 0.0026, abs(uv.x-hx));\n" +
"    hair *= smoothstep(1.0, 0.72, uv.y);\n" +
"    c = mix(c, c*0.12, hair*u_gateHair);\n" +
"  }\n" +
"  if(u_lcdGrid>0.003){\n" +
"    /* a flat panel rather than a tube: a subpixel lattice with a black grid */\n" +
"    vec2 g = fract(gl_FragCoord.xy/3.0);\n" +
"    float gx = smoothstep(0.0,0.16,g.x)*smoothstep(1.0,0.84,g.x);\n" +
"    float gy = smoothstep(0.0,0.22,g.y)*smoothstep(1.0,0.78,g.y);\n" +
"    c *= mix(1.0, gx*gy*1.22, u_lcdGrid);\n" +
"  }\n" +
"  if(u_stuckPix>0.003){\n" +
"    /* dead and stuck pixels. They never move, which is exactly what makes\n" +
"       them read as a fault in the panel and not as noise in the signal. */\n" +
"    vec2 pc = floor(gl_FragCoord.xy);\n" +
"    float r = h21(pc*0.371 + 3.7);\n" +
"    if(r > 1.0 - u_stuckPix*0.0035){\n" +
"      float kind = h21(pc*1.73 + 9.1);\n" +
"      if(kind < 0.42) c = vec3(0.0);\n" +
"      else if(kind < 0.66) c = vec3(1.0);\n" +
"      else if(kind < 0.78) c = vec3(1.0,0.0,0.0);\n" +
"      else if(kind < 0.9) c = vec3(0.0,1.0,0.0);\n" +
"      else c = vec3(0.0,0.0,1.0);\n" +
"    }\n" +
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
"  /* the deck's own display, drawn last because on the machine it is burnt in\n" +
"     after everything else and never obeys the picture's geometry */\n" +
"  if(u_osdShow>0.003){\n" +
"    vec4 od = texture(u_osd, vec2(uv.x, 1.0-uv.y));\n" +
"    if(u_osdGlow>0.003){\n" +
"      vec2 gp = 1.6/u_res;\n" +
"      float ga = 0.0;\n" +
"      for(int i=0;i<8;i++){\n" +
"        float an = float(i)*0.7854;\n" +
"        ga += texture(u_osd, vec2(uv.x,1.0-uv.y) + vec2(cos(an),sin(an))*gp*3.0).a;\n" +
"      }\n" +
"      c += od.rgb*(ga/8.0)*u_osdGlow*0.7*u_osdShow;\n" +
"    }\n" +
"    c = mix(c, od.rgb, od.a*u_osdShow);\n" +
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

/* pass: PATTERN SYNTH — a shape and pattern generator per channel, built like a
   video synthesiser: ramps and oscillators, cross-modulation, a wavefolder, a
   comparator, then a colouriser. No camera, no file: the picture is computed. */
const FS_GEN = COMMON +
"uniform float u_time,u_shape,u_wave,u_colmode;\n" +
"uniform float u_genFreqX,u_genFreqY,u_genPhase,u_genRate,u_genRot,u_genSkew;\n" +
"uniform float u_genFM,u_genPulse,u_genFold,u_genComp,u_genThresh,u_genSoft;\n" +
"uniform float u_genFoldN,u_genCX,u_genCY,u_genWarp,u_genHue,u_genSpread;\n" +
"uniform float u_genSat,u_genBright,u_genBands,u_genZoom;\n" +
"#define TAU 6.2831853\n" +
"float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);\n" +
"  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }\n" +
"vec3 hsv(float h, float s, float v){\n" +
"  vec3 k = fract(vec3(h) + vec3(0.0, 2.0/3.0, 1.0/3.0));\n" +
"  return v * mix(vec3(1.0), clamp(abs(k*6.0-3.0)-1.0, 0.0, 1.0), s);\n}\n" +
"/* the oscillator: one cycle of the selected waveform per unit of phase */\n" +
"float wv(float x){\n" +
"  x = fract(x);\n" +
"  if(u_wave<0.5) return 0.5+0.5*sin(x*TAU);\n" +
"  if(u_wave<1.5) return abs(x*2.0-1.0);\n" +
"  if(u_wave<2.5) return x;\n" +
"  if(u_wave<3.5) return step(0.5, x);\n" +
"  if(u_wave<4.5) return step(1.0-clamp(u_genPulse,0.02,0.98), x);\n" +
"  return h21(vec2(floor(x*48.0), 7.31));\n}\n" +
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  float t = u_time*u_genRate;\n" +
"  float ar = u_res.x/u_res.y;\n" +
"  vec2 p = uv - 0.5 - vec2(u_genCX, u_genCY)*0.5;\n" +
"  p.x *= ar;\n" +
"  float zm = pow(2.0, u_genZoom*2.0);\n" +
"  p *= zm;\n" +
"  float a0 = u_genRot*3.14159;\n" +
"  p = vec2(p.x*cos(a0) - p.y*sin(a0), p.x*sin(a0) + p.y*cos(a0));\n" +
"  p.x += p.y*u_genSkew*2.0;\n" +
"  /* domain warp: the coordinate system itself breathes */\n" +
"  if(u_genWarp>0.003){\n" +
"    p += (vec2(vn(p*3.0 + t*0.2), vn(p*3.0 + 17.3 - t*0.15)) - 0.5)*u_genWarp*1.2;\n" +
"  }\n" +
"  float fx = 0.2 + u_genFreqX*u_genFreqX*40.0;\n" +
"  float fy = 0.2 + u_genFreqY*u_genFreqY*40.0;\n" +
"  float ph = u_genPhase;\n" +
"  float nf = max(1.0, floor(u_genFoldN));\n" +
"  float r = length(p);\n" +
"  float ang = atan(p.y, p.x)/TAU + 0.5;\n" +
"  float f;\n" +
"  if(u_shape<0.5){\n" +                     /* SCAN — two ramps cross-modulating */
"    float b = wv(p.y*fy + t*0.7);\n" +
"    float a = wv(p.x*fx + ph + t + b*u_genFM*3.0);\n" +
"    f = 0.5*(a + b);\n" +
"  } else if(u_shape<1.5){\n" +              /* RADIAL */
"    f = wv(r*fx + ph + t + wv(ang*nf)*u_genFM*2.0);\n" +
"  } else if(u_shape<2.5){\n" +              /* SPIRAL */
"    f = wv(r*fx + ang*nf + ph + t);\n" +
"  } else if(u_shape<3.5){\n" +              /* PLASMA */
"    f = 0.25*(wv(p.x*fx*0.5 + t) + wv(p.y*fy*0.5 - t*0.8)\n" +
"            + wv((p.x+p.y)*fx*0.35 + t*1.3) + wv(r*fy*0.5 - t*0.6));\n" +
"    f = fract(f*(1.0 + u_genFM*3.0));\n" +
"  } else if(u_shape<4.5){\n" +              /* LISSAJOUS */
"    float lx = sin(p.x*fx + t), ly = sin(p.y*fy + t*1.37 + ph*TAU);\n" +
"    f = wv(lx*ly*(0.5 + u_genFM*3.0) + ph);\n" +
"  } else if(u_shape<5.5){\n" +              /* RINGS */
"    f = wv(floor(r*fx*0.5 + t)/max(1.0,nf) + ph);\n" +
"  } else if(u_shape<6.5){\n" +             /* STARBURST */
"    f = wv(ang*nf + ph + t + r*fx*0.06*u_genFM*10.0);\n" +
"  } else if(u_shape<7.5){\n" +             /* GRID */
"    f = max(wv(p.x*fx + ph + t), wv(p.y*fy - t));\n" +
"  } else if(u_shape<8.5){\n" +             /* TUNNEL */
"    float rr = 0.35/max(r, 0.02);\n" +
"    f = 0.5*(wv(rr*fx*0.25 + t) + wv(ang*nf + ph));\n" +
"  } else if(u_shape<9.5){\n" +             /* CELLS */
"    vec2 g = p*max(1.0, fx*0.25);\n" +
"    vec2 gi = floor(g), gf = fract(g);\n" +
"    float md = 8.0;\n" +
"    for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){\n" +
"      vec2 o = vec2(float(x), float(y));\n" +
"      vec2 pt = o + 0.5 + 0.5*vec2(sin(h21(gi+o)*TAU + t*2.0), cos(h21(gi+o+3.1)*TAU + t*1.7));\n" +
"      md = min(md, length(pt - gf));\n" +
"    }\n" +
"    f = wv(md*(0.5 + u_genFM*3.0) + ph);\n" +
"  } else if(u_shape<10.5){\n" +            /* INTERFERENCE — two point sources beating */
"    float d1 = length(p - vec2(0.28, 0.0)), d2 = length(p + vec2(0.28, 0.0));\n" +
"    f = 0.5*(wv(d1*fx + t) + wv(d2*fy - t));\n" +
"  } else {\n" +                            /* POLYGON */
"    float aa = atan(p.y, p.x);\n" +
"    float seg = TAU/nf;\n" +
"    float rp = r*cos(mod(aa, seg) - seg*0.5)/max(cos(seg*0.5), 0.01);\n" +
"    f = wv(rp*fx*0.5 + ph + t);\n" +
"  }\n" +
"  /* wavefolder: keeps folding the signal back on itself, which is where the\n" +
"     hard banded video-synth structure comes from */\n" +
"  if(u_genFold>0.003){\n" +
"    float k = 1.0 + u_genFold*7.0;\n" +
"    f = abs(fract(f*k)*2.0 - 1.0);\n" +
"  }\n" +
"  /* comparator: the hard-edged shape maker */\n" +
"  if(u_genComp>0.003){\n" +
"    float sf = max(0.001, u_genSoft*0.5);\n" +
"    f = mix(f, smoothstep(u_genThresh-sf, u_genThresh+sf, f), u_genComp);\n" +
"  }\n" +
"  f = clamp(f, 0.0, 1.0);\n" +
"  vec3 c;\n" +
"  float sp = u_genSpread;\n" +
"  if(u_colmode<0.5){ c = vec3(f); }\n" +
"  else if(u_colmode<1.5){\n" +             /* RGB PHASE — three channels of the same osc, offset */
"    c = vec3(wv(f + u_genHue), wv(f + u_genHue + sp*0.33), wv(f + u_genHue + sp*0.66));\n" +
"  }\n" +
"  else if(u_colmode<2.5){ c = hsv(u_genHue + f*sp, u_genSat, mix(1.0, f, 0.25)); }\n" +
"  else if(u_colmode<3.5){\n" +             /* DUOTONE */
"    c = mix(hsv(u_genHue, u_genSat, 1.0), hsv(fract(u_genHue+sp*0.5), u_genSat, 1.0), f);\n" +
"  }\n" +
"  else {\n" +                              /* BANDS */
"    float nb = max(2.0, floor(u_genBands));\n" +
"    float q = floor(f*nb)/nb;\n" +
"    c = hsv(u_genHue + q*sp, u_genSat, 1.0);\n" +
"  }\n" +
"  O = vec4(clamp(c*u_genBright, 0.0, 1.0), 1.0);\n}\n";

/* pass: MULTIVIEW — every channel and both buses at once, like a vision mixer's
   preview monitors. 3 x 2 cells: A / B / BUS 1 over C / D / PROGRAM. */
const FS_MULTI = COMMON +
"uniform sampler2D u_a; uniform sampler2D u_b; uniform sampler2D u_c;\n" +
"uniform sampler2D u_d; uniform sampler2D u_b1; uniform sampler2D u_pgm;\n" +
"uniform float u_active, u_liveA, u_liveB, u_liveC, u_liveD;\n" +
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  vec2 g = vec2(3.0, 2.0);\n" +
"  vec2 cell = floor(uv*g);\n" +
"  vec2 luv = fract(uv*g);\n" +
"  /* gl_FragCoord runs bottom-up, so row 0 of the grid is the bottom one */\n" +
"  int row = 1 - int(cell.y);\n" +
"  int idx = row*3 + int(cell.x);\n" +
"  vec3 c;\n" +
"  float lit = 1.0;\n" +
"  if(idx==0){ c = texture(u_a, luv).rgb; lit = u_liveA; }\n" +
"  else if(idx==1){ c = texture(u_b, luv).rgb; lit = u_liveB; }\n" +
"  else if(idx==2){ c = texture(u_b1, luv).rgb; }\n" +
"  else if(idx==3){ c = texture(u_c, luv).rgb; lit = u_liveC; }\n" +
"  else if(idx==4){ c = texture(u_d, luv).rgb; lit = u_liveD; }\n" +
"  else { c = texture(u_pgm, luv).rgb; }\n" +
"  c *= mix(0.18, 1.0, lit);\n" +
"  /* cell borders, and a hot border on the channel you are editing */\n" +
"  vec2 e = min(luv, 1.0-luv)*vec2(u_res.x/3.0, u_res.y/2.0);\n" +
"  float edge = 1.0 - smoothstep(0.0, 1.5, min(e.x, e.y));\n" +
"  float sel = (float(idx) == u_active) ? 1.0 : 0.0;\n" +
"  float hot = 1.0 - smoothstep(0.0, 3.0, min(e.x, e.y));\n" +
"  c = mix(c, vec3(0.09,0.09,0.11), edge*0.85);\n" +
"  c = mix(c, vec3(1.0,0.48,0.09), hot*sel);\n" +
"  O = vec4(c, 1.0);\n}\n";

/* pass: plain copy */
const FS_COPY = COMMON +
"uniform sampler2D u_tex;\n" +
"void main(){ O = texture(u_tex, gl_FragCoord.xy/u_res); }\n";

/* ---------------- parameter registry ---------------- */
/* The panel is laid out in four zones. MIX sits under the channel buttons and
   never moves, because it is the desk. The CHANNEL zone follows the signal path
   and is the only part you can reorder. OUT and TOOLS are pinned at the bottom. */
const SECTIONS = [
  {id:"mixer",    name:"BUS 1 \u00b7 TRANSITION",  cls:"mag",  zone:"mix"},
  {id:"mixer2",   name:"BUS 2 \u00b7 TRANSITION",  cls:"mag",  zone:"mix"},
  {id:"mixerM",   name:"MASTER \u00b7 TRANSITION", cls:"mag",  zone:"mix"},

  {id:"gen",      name:"PATTERN SYNTH",     cls:"cyan", zone:"chain"},
  {id:"frame",    name:"FRAME / POSITION",  cls:"mag",  zone:"chain"},
  {id:"time",     name:"TIME BASE",         cls:"mag",  zone:"chain"},
  {id:"feedback", name:"FEEDBACK / RESCAN", cls:"mag",  zone:"chain"},
  {id:"signal",   name:"COMPOSITE SIGNAL",  cls:"",     zone:"chain"},
  {id:"sync",     name:"SYNC CORRUPTION",   cls:"",     zone:"chain"},
  {id:"vhs",      name:"TAPE TRANSPORT",    cls:"",     zone:"chain"},
  {id:"enhancer", name:"BENT ENHANCER",     cls:"mag",  zone:"chain"},
  {id:"contour",  name:"CONTOUR / PALETTE", cls:"mag",  zone:"chain"},
  {id:"color",    name:"COLOUR STAGE",      cls:"cyan", zone:"chain"},
  {id:"glitch",   name:"GLITCH LAB",        cls:"mag",  zone:"chain"},
  {id:"lab",      name:"SIGNAL LAB",        cls:"mag",  zone:"chain"},
  {id:"flow",     name:"FLOW / MOSH",       cls:"mag",  zone:"chain"},
  {id:"keyer",    name:"KEYER",             cls:"cyan", zone:"chain"},

  {id:"crt",      name:"CRT DISPLAY",       cls:"cyan", zone:"out"},
  {id:"overlay",  name:"OUTPUT OVERLAY",    cls:"cyan", zone:"out"},

  /* morph lives on the PERFORM tab with the snapshots and the recorder,
     because it is the same job: recalling states while it runs */
  {id:"morph",    name:"PRESET MORPH",      cls:"mag",  zone:"perform"},
];
const ZONES = [
  {id:"chain", label:"CHANNEL \u00b7 SIGNAL PATH", note:"Everything belonging to the channel selected above, in the order the signal actually travels: source, framing, frame store, feedback, then the reorderable stages, then the keyer. Drag by the handle to rearrange."},
  {id:"out",   label:"MASTER OUT",          note:"The shared display stage, after the mixer. Every channel ends up here."},
];
const PDEF = [
  ["abMix","BUS 1 FADER","mixer",0,1,0],
  ["wipeSoft","WIPE SOFT","mixer",0,1,0.03],
  ["wipeDetail","WIPE DETAIL","mixer",0,1,0.3],
  ["wipeX","WIPE CTR X","mixer",-1,1,0],
  ["wipeY","WIPE CTR Y","mixer",-1,1,0],
  ["mixKeyThresh","KEY THRESH","mixer",0,1,0.5],
  ["mixKeySoft","KEY SOFT","mixer",0.01,1,0.2],
  ["mixKeyInv","KEY INVERT","mixer",0,1,0],
  ["mixKeyHue","KEY HUE","mixer",0,1,0.33],
  ["pipX","PIP X","mixer",-1,1,0.45],
  ["pipY","PIP Y","mixer",-1,1,-0.45],
  ["pipSize","PIP SIZE","mixer",0,1,0.35],
  ["pipBorder","PIP BORDER","mixer",0,1,0.12],
  ["edgeAmt","EDGE MELT","mixer",0,1,0],
  ["edgeWidth","EDGE WIDTH","mixer",0,1,0.3],
  ["edgeHold","EDGE HOLD","mixer",0,1,0.6],
  ["edgeSwirl","EDGE SWIRL","mixer",-1,1,0],
  ["edgeChroma","EDGE CHROMA","mixer",0,1,0.5],
  ["edgeCreep","EDGE CREEP","mixer",0,1,0.35],
  ["wipeBord","BORDER WIPE","mixer",0,1,0],
  ["wipeBordCol","BORDER COLOUR","mixer",0,1,0],
  ["wipeRep","WIPE MULTI","mixer",1,4,1],
  ["mixKeyGain","KEY GAIN","mixer",0,1,0.5],
  ["mixKeyDens","KEY DENSITY","mixer",0,1,1],
  ["mixKeyEdge","KEY BORDER","mixer",0,1,0],
  ["mixKeyEdgeCol","KEY BORDER COL","mixer",0,1,0],
  ["mixKeyShadow","KEY SHADOW","mixer",0,1,0],
  ["mixDirt","DIRT","mixer",0,1,0],
  ["mixDirtRate","DIRT RATE","mixer",0,1,0.3],
  ["mixDirtDrop","DIRT DROPOUT","mixer",0,1,0.5],
  ["mixDirtCut","DIRT CUT","mixer",0,1,0.4],
  ["mixDirtKnock","DIRT KNOCK","mixer",0,1,0.5],
  ["mixDirtNoise","DIRT NOISE","mixer",0,1,0.35],

  ["cdMix","BUS 2 FADER","mixer2",0,1,0],
  ["wipeSoft2","WIPE SOFT","mixer2",0,1,0.03],
  ["wipeDetail2","WIPE DETAIL","mixer2",0,1,0.3],
  ["wipeX2","WIPE CTR X","mixer2",-1,1,0],
  ["wipeY2","WIPE CTR Y","mixer2",-1,1,0],
  ["mixKeyThresh2","KEY THRESH","mixer2",0,1,0.5],
  ["mixKeySoft2","KEY SOFT","mixer2",0.01,1,0.2],
  ["mixKeyInv2","KEY INVERT","mixer2",0,1,0],
  ["mixKeyHue2","KEY HUE","mixer2",0,1,0.33],
  ["pipX2","PIP X","mixer2",-1,1,0.45],
  ["pipY2","PIP Y","mixer2",-1,1,-0.45],
  ["pipSize2","PIP SIZE","mixer2",0,1,0.35],
  ["pipBorder2","PIP BORDER","mixer2",0,1,0.12],
  ["edgeAmt2","EDGE MELT","mixer2",0,1,0],
  ["edgeWidth2","EDGE WIDTH","mixer2",0,1,0.3],
  ["edgeHold2","EDGE HOLD","mixer2",0,1,0.6],
  ["edgeSwirl2","EDGE SWIRL","mixer2",-1,1,0],
  ["edgeChroma2","EDGE CHROMA","mixer2",0,1,0.5],
  ["edgeCreep2","EDGE CREEP","mixer2",0,1,0.35],
  ["wipeBord2","BORDER WIPE","mixer2",0,1,0],
  ["wipeBordCol2","BORDER COLOUR","mixer2",0,1,0],
  ["wipeRep2","WIPE MULTI","mixer2",1,4,1],
  ["mixKeyGain2","KEY GAIN","mixer2",0,1,0.5],
  ["mixKeyDens2","KEY DENSITY","mixer2",0,1,1],
  ["mixKeyEdge2","KEY BORDER","mixer2",0,1,0],
  ["mixKeyEdgeCol2","KEY BORDER COL","mixer2",0,1,0],
  ["mixKeyShadow2","KEY SHADOW","mixer2",0,1,0],
  ["mixDirt2","DIRT","mixer2",0,1,0],
  ["mixDirtRate2","DIRT RATE","mixer2",0,1,0.3],
  ["mixDirtDrop2","DIRT DROPOUT","mixer2",0,1,0.5],
  ["mixDirtCut2","DIRT CUT","mixer2",0,1,0.4],
  ["mixDirtKnock2","DIRT KNOCK","mixer2",0,1,0.5],
  ["mixDirtNoise2","DIRT NOISE","mixer2",0,1,0.35],

  ["busMix","MASTER FADER","mixerM",0,1,0],
  ["wipeSoftM","WIPE SOFT","mixerM",0,1,0.03],
  ["wipeDetailM","WIPE DETAIL","mixerM",0,1,0.3],
  ["wipeXM","WIPE CTR X","mixerM",-1,1,0],
  ["wipeYM","WIPE CTR Y","mixerM",-1,1,0],
  ["mixKeyThreshM","KEY THRESH","mixerM",0,1,0.5],
  ["mixKeySoftM","KEY SOFT","mixerM",0.01,1,0.2],
  ["mixKeyInvM","KEY INVERT","mixerM",0,1,0],
  ["mixKeyHueM","KEY HUE","mixerM",0,1,0.33],
  ["pipXM","PIP X","mixerM",-1,1,0.45],
  ["pipYM","PIP Y","mixerM",-1,1,-0.45],
  ["pipSizeM","PIP SIZE","mixerM",0,1,0.35],
  ["pipBorderM","PIP BORDER","mixerM",0,1,0.12],
  ["edgeAmtM","EDGE MELT","mixerM",0,1,0],
  ["edgeWidthM","EDGE WIDTH","mixerM",0,1,0.3],
  ["edgeHoldM","EDGE HOLD","mixerM",0,1,0.6],
  ["edgeSwirlM","EDGE SWIRL","mixerM",-1,1,0],
  ["edgeChromaM","EDGE CHROMA","mixerM",0,1,0.5],
  ["edgeCreepM","EDGE CREEP","mixerM",0,1,0.35],
  ["wipeBordM","BORDER WIPE","mixerM",0,1,0],
  ["wipeBordColM","BORDER COLOUR","mixerM",0,1,0],
  ["wipeRepM","WIPE MULTI","mixerM",1,4,1],
  ["mixKeyGainM","KEY GAIN","mixerM",0,1,0.5],
  ["mixKeyDensM","KEY DENSITY","mixerM",0,1,1],
  ["mixKeyEdgeM","KEY BORDER","mixerM",0,1,0],
  ["mixKeyEdgeColM","KEY BORDER COL","mixerM",0,1,0],
  ["mixKeyShadowM","KEY SHADOW","mixerM",0,1,0],
  ["mixDirtM","DIRT","mixerM",0,1,0],
  ["mixDirtRateM","DIRT RATE","mixerM",0,1,0.3],
  ["mixDirtDropM","DIRT DROPOUT","mixerM",0,1,0.5],
  ["mixDirtCutM","DIRT CUT","mixerM",0,1,0.4],
  ["mixDirtKnockM","DIRT KNOCK","mixerM",0,1,0.5],
  ["mixDirtNoiseM","DIRT NOISE","mixerM",0,1,0.35],

  ["morph","MORPH A>B","morph",0,1,0],

  ["genFreqX","FREQ X","gen",0,1,0.18],
  ["genFreqY","FREQ Y","gen",0,1,0.12],
  ["genPhase","PHASE","gen",-1,1,0],
  ["genRate","RATE","gen",-1,1,0.08],
  ["genFM","CROSS MOD","gen",0,1,0],
  ["genFold","WAVEFOLD","gen",0,1,0],
  ["genPulse","PULSE WIDTH","gen",0,1,0.5],
  ["genComp","COMPARATOR","gen",0,1,0],
  ["genThresh","COMP THRESH","gen",0,1,0.5],
  ["genSoft","COMP SOFT","gen",0,1,0.12],
  ["genFoldN","SYMMETRY","gen",1,16,4],
  ["genZoom","SCALE","gen",-1,1,0],
  ["genRot","ROTATE","gen",-1,1,0],
  ["genSkew","SKEW","gen",-1,1,0],
  ["genCX","CENTRE X","gen",-1,1,0],
  ["genCY","CENTRE Y","gen",-1,1,0],
  ["genWarp","DOMAIN WARP","gen",0,1,0],
  ["genHue","HUE","gen",0,1,0.55],
  ["genSpread","HUE SPREAD","gen",0,2,1],
  ["genSat","SATURATION","gen",0,1,0.9],
  ["genBright","BRIGHTNESS","gen",0,1.5,1],
  ["genBands","COLOUR BANDS","gen",2,16,6],

  ["flipMode","FLIP","frame",0,3,0],
  ["mirrorMode","MIRROR","frame",0,3,0],
  ["multiN","MULTI GRID","frame",1,8,1],
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
  ["strobe","STROBE","time",0,1,0],
  ["shake","SHAKE","time",0,1,0],
  ["shakeRate","SHAKE RATE","time",0,1,0.5],

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

  ["tapeSpeed","TAPE SPEED","vhs",0,1,0],
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
  ["negative","NEGATIVE","color",0,1,0],
  ["negMode","NEG MODE","color",0,2,0],
  ["monoCol","MONOCOLOR","color",0,1,0],
  ["monoHue","MONO HUE","color",0,1,0.55],
  ["colorPass","COLORPASS","color",0,1,0],
  ["passHue","PASS HUE","color",0,1,0],
  ["passWidth","PASS WIDTH","color",0,1,0.25],
  ["silhouette","SILHOUETTE","color",0,1,0],
  ["silThresh","SIL THRESH","color",0,1,0.45],
  ["silHue","SIL HUE","color",0,1,0.08],
  ["findEdge","FIND EDGE","color",0,1,0],
  ["edgeHue","EDGE HUE","color",0,1,0.45],
  ["emboss","EMBOSS","color",0,1,0],
  ["embossDir","EMBOSS DIR","color",0,1,0.12],

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
  ["lensDist","LENS DISTORT","overlay",-1,1,0],
  ["lensCA","LENS FRINGE","overlay",0,1,0],
  ["lensStreak","ANAMORPHIC","overlay",0,1,0],
  ["streakHue","STREAK COLOUR","overlay",0,1,1],
  ["lensSmudge","DIRTY GLASS","overlay",0,1,0],
  ["lightLeak","LIGHT LEAK","overlay",0,1,0],
  ["leakHue","LEAK COLOUR","overlay",0,1,0.05],
  ["gateWeave","GATE WEAVE","overlay",0,1,0],
  ["gateHair","GATE HAIR","overlay",0,1,0],
  ["lcdGrid","LCD GRID","overlay",0,1,0],
  ["stuckPix","STUCK PIXELS","overlay",0,1,0],
  ["osdShow","DECK DISPLAY","overlay",0,1,0],
  ["osdSize","DISPLAY SIZE","overlay",0.4,2,1],
  ["osdGlow","DISPLAY GLOW","overlay",0,1,0.5],
];

/* ---------------- per-parameter help ----------------
   What the control does, and enough of the mechanism to know why it behaves
   the way it does. Shown on hover over the parameter name. */
const PHELP = {
  /* ---- mixers (bus 1, bus 2, master) ---- */
  abMix:"Crossfades bus 1's second input over its first (A over B by default, but the two selectors above set which channels the bus is actually mixing). At 0 you see only A, at 1 only B; in between the MODE dropdown decides how they meet — a plain dissolve, one of twelve wipe shapes, a key, or a blend. Run it like a T-bar.",
  cdMix:"The same fader for bus 2, crossfading its second input over its first. Bus 2 only renders at all while the MASTER fader is above zero.",
  busMix:"The master crossfade between the two buses. At 0 you see bus 1 (A/B) and channels C and D cost nothing; push it up and the second bus comes alive and fades in.",
  wipeSoft:"How feathered the wipe edge is. At zero it is a hard cut line; wound up it becomes a soft gradient, which reads as a dissolve that travels.",
  wipeDetail:"Means different things per mode: the number of slats for BLINDS, bars for DIAG BARS, cells for BLOCKS, and the size of the shape for BOX and CIRCLE.",
  wipeX:"Moves the wipe's origin horizontally. A circle wipe with the origin off to one side opens like an iris from that corner.",
  wipeY:"Moves the wipe's origin vertically.",
  mixKeyThresh:"For the LUMA KEY and CHROMA KEY transition modes: the brightness (or hue distance) at which the incoming channel starts to punch through.",
  mixKeySoft:"How gradual the key edge is. Small values give a hard cut-out; large values let the incoming picture bleed through the midtones.",
  mixKeyInv:"Flips the key so the incoming channel appears where it was previously hidden.",
  mixKeyHue:"For CHROMA KEY: which hue is treated as the key colour. 0.33 is green, 0.66 blue, 0 red.",
  pipX:"Horizontal position of the picture-in-picture subscreen, when KEY is set to PIP.",
  pipY:"Vertical position of the subscreen.",
  pipSize:"How large the subscreen is, from a small inset to most of the frame.",
  pipBorder:"Width of the border drawn around the subscreen. Zero for none.",
  edgeAmt:"How hard the seam between the two pictures melts. The mixer works out where the boundary is and which way it faces, then drags the incoming picture along that direction and feeds its own last frame back into the same narrow band. The result is a soft trailing boundary that creeps outward, instead of a clean cut. Zero switches the whole stage off and costs nothing.",
  edgeWidth:"How far either side of the boundary the melt reaches. Small values give a wet-looking rim; large values turn the whole transition into a smear.",
  edgeHold:"How much of the last frame survives inside the band. This is the persistence that turns a smear into a trail. Above about 0.8 it stops settling and keeps building, which is where it starts to look properly bent.",
  edgeSwirl:"Turns the drag direction. At zero the melt runs straight out across the boundary; wound fully either way it runs along it instead, so the edge stirs rather than bleeds.",
  edgeChroma:"Lets colour run further than brightness, the way it does off a composite edge. This is what makes the melt read as analogue rather than as a blur.",
  wipeBord:"Lays a coloured rule along the join, the way a bench mixer's border wipe does. It follows the wipe wherever it goes and disappears when the fader reaches either end.",
  wipeBordCol:"Which of the eight standard back colours the border is drawn in: white, yellow, cyan, green, magenta, red, blue, black, in that order.",
  wipeRep:"Tiles the whole wipe pattern. Two gives four copies, four gives sixteen - the multi-wipe a bench mixer offers, and it works on every pattern rather than a chosen few.",
  mixKeyGain:"How hard the key turns over between transparent and opaque. Low is a long soft ramp, high snaps. Threshold decides where the turn happens, this decides how abrupt it is.",
  mixKeyDens:"The most opaque the key is ever allowed to get. Pulling it back leaves the keyed picture semi-transparent everywhere, which is how a title sits in the picture rather than on top of it.",
  mixKeyEdge:"Grows the key matte outward and fills the growth with a colour, so the keyed shape gets an outline. Small values read as a rule around a title; large ones as a halo.",
  mixKeyEdgeCol:"The colour of that outline, from the same eight back colours.",
  mixKeyShadow:"Offsets a copy of the matte down and to the right and darkens the picture underneath it. A drop shadow, which is what stops a title disappearing into a busy background.",
  mixDirt:"The master control for the dirty mixer, and an event clock rather than a continuous wobble. At zero the whole stage is off. Turned up, the mixer starts firing: the crossbar jumps to the wrong input, the timebase gets knocked sideways, bands of lines drop out and the switching transient sprays noise. This decides how often a firing happens; the five controls under it decide what a firing does.",
  mixDirtRate:"How fast the event clock runs, so how closely spaced the firings are. Slow is an intermittent fault; fast is a mixer that has completely lost the plot.",
  mixDirtDrop:"How much of a firing shows up as dropped lines. Bands of scanlines fall through to the other side of the crossbar, or to nothing at all.",
  mixDirtCut:"How much of a firing throws the whole mix to one input or the other, regardless of where the fader is. This is the switcher glitching rather than the picture degrading.",
  mixDirtKnock:"How hard a firing knocks the timebase. The picture shoves sideways, shears down the frame and crawls back, exactly as it does when a mixer is switched without genlock.",
  mixDirtNoise:"The switching transient: a burst of bandwidth-limited noise across the picture, with the colour dropping out as it hits.",
  edgeCreep:"Which side of the boundary the melt lives on. At zero it sits evenly across the seam. Wound up, it only happens on the outgoing side, so the incoming shape bleeds into the background and the background never eats into the shape.",
  morph:"Blends every slider on the panel between the two snapshots stored with STORE A and STORE B. Put an LFO on this and the whole rig evolves on its own. Touching any individual slider takes that one control back out of the morph.",

  /* ---- frame / position ---- */
  genFreqX:"Horizontal frequency of the oscillator, from a single slow sweep across the frame up to about forty cycles. In the radial and tunnel shapes this becomes the frequency along the radius instead.",
  genFreqY:"Vertical frequency. Set it against FREQ X and the two beat against each other, which is where most patterns come from.",
  genPhase:"Slides the whole pattern along its own waveform. Modulate this rather than the frequency when you want movement without the shape changing.",
  genRate:"How fast the generator animates on its own. Negative runs it backwards. At zero the picture is completely still, which is useful when you want something else to be the only moving thing.",
  genFM:"Cross-modulation: one axis modulates the other. This is the single most productive control here \u2014 a plain grid becomes wavy, then braided, then chaotic, as you wind it up.",
  genFold:"A wavefolder. Instead of clipping the signal when it leaves the range, it folds it back on itself, over and over. This is where the hard banded structure of analogue video synthesis comes from.",
  genPulse:"Duty cycle, for the PULSE waveform only. At the extremes it becomes thin lines on a field; in the middle it is a square wave.",
  genComp:"How much of the comparator is applied. A comparator turns a smooth gradient into a hard-edged shape by asking whether the signal is above or below a threshold \u2014 it is what makes solid graphic shapes rather than washes.",
  genThresh:"Where that comparator trips. Sweep it and shapes grow and shrink.",
  genSoft:"How gradual the comparator edge is. Small values give a hard cut; large values give an airbrushed edge.",
  genFoldN:"Rotational symmetry: the number of arms, segments, sides or spiral turns, depending on the shape.",
  genZoom:"Scales the whole pattern. Because it is applied before everything else, zooming out reveals the structure repeating.",
  genRot:"Rotates the pattern.",
  genSkew:"Shears it, so vertical structures lean.",
  genCX:"Moves the pattern's centre horizontally, which matters for the radial, spiral and tunnel shapes.",
  genCY:"Moves the centre vertically.",
  genWarp:"Warps the coordinate system itself with slow noise before the pattern is drawn, so straight lines bend and breathe rather than staying geometric.",
  genHue:"The base colour. What it does depends on the COLOUR mode: it offsets the phase in RGB PHASE, sets the start of the sweep in HSV, and picks the first ink in DUOTONE.",
  genSpread:"How far the colour travels across the pattern. Small values give a tint, large values give a full spectrum inside one shape.",
  genSat:"Colour intensity of the generator, before anything downstream touches it.",
  genBright:"Output level of the generator.",
  genBands:"For the BANDS colour mode: how many flat colour steps the pattern is quantised into.",
  srcZoom:"Scales this channel's picture inside the raster. Negative pulls it away from the edges and lets the EDGE mode (black, tile or mirror) show.",
  srcX:"Slides the picture horizontally within the frame.",
  srcY:"Slides the picture vertically within the frame.",
  srcRot:"Rotates the picture about its centre before anything else happens to it.",
  kaleido:"Folds the picture into radial symmetry: a wedge is reflected around the centre. Crossfades in, so partial amounts give a ghosted double image.",
  kaleidoN:"How many wedges the fold uses. 3 gives triangles, 6 gives a snowflake, 12 gives a tight rosette.",
  kaleidoRot:"Spins the fold pattern. Modulate this with a slow LFO and the whole composition turns.",
  kaleidoX:"Moves the centre of the fold horizontally, which changes which part of the picture gets repeated.",
  kaleidoY:"Moves the centre of the fold vertically.",

  /* ---- time base ---- */
  echo:"Blends in a frame from the past, held in a thirty-frame ring buffer. Unlike feedback this is a fixed delay, so it ghosts rather than compounds.",
  delayF:"How many frames back ECHO reaches. Modulating this scrubs through the buffer and produces stuttering time-smears.",
  stutter:"Randomly freezes the frame store for a fraction of a second. Higher values make the freezes both more likely and longer, like a decoder losing its footing.",

  /* ---- contour / palette ---- */
  contour:"Draws the isolines between brightness bands — the boundaries where the picture crosses from one band to the next. This is the repeated-outline signature of a bent video enhancer: faces and bodies come back as nested contour lines.",
  contourBands:"How many brightness bands the picture is divided into, and so how many contour lines you get. Few bands give bold outlines; many give dense topographic maps.",
  contourWidth:"Line weight. The line is derived from the gradient of the banded image, so thin values trace only sharp edges while thick ones flood the gentle gradients too.",
  contourHue:"Colours each contour line by which band it belongs to, so the outlines run through a spectrum from shadows to highlights.",
  contourFill:"How much of the original picture survives between the lines. Drop it to zero for pure lines on black.",
  lumaSteps:"Quantises brightness into hard levels, turning gradients into flat poster-like colour fields. Crossfades against the original.",
  stepCount:"How many brightness levels FLATTEN quantises to. Low numbers give big graphic blocks of colour.",
  dither:"Breaks the quantisation steps with an ordered dither pattern, so the bands dissolve into speckle instead of hard edges.",

  /* ---- signal lab ---- */
  sparseJit:"Displaces whole scanlines sideways, but only the ones past the gate — so most of the picture holds still and a few lines snap hard out of place.",
  jitThresh:"The gate for SPARSE JITTER. High values mean fewer lines move, and the ones that do move further.",
  ntscArt:"Cross-luminance: fine detail gets mistaken for colour information the way a composite decoder does, so dense patterns pick up crawling false colour.",
  ntscFringe:"Cross-colour the other way round: saturated edges throw off luminance fringes, giving the ringing halo of a badly filtered composite signal.",
  snow:"Broadband noise, weighted toward the darker parts of the picture the way real RF snow is.",
  snowAniso:"Clumps the snow along the scan direction instead of leaving it as even grain, which is what a weak signal actually looks like.",
  fmAmt:"Frequency-modulates the horizontal sampling position, so the picture ripples as if the timebase itself were wobbling.",
  fmCarrier:"The carrier frequency of that wobble: low is a slow swim, high is a fine shimmer.",
  slitscan:"Each row is sampled from a different moment in time, so movement smears vertically through the frame the way a slit-scan camera records it.",
  slitDir:"Which axis the slit-scan runs along, and which direction time runs in.",
  bitCrush:"Crushes the picture to one bit per channel with an ordered dither, so everything becomes a pattern of pure primaries.",
  bitScale:"The size of the dither cell. Large cells give visible halftone-like structure, small cells give a fine stipple.",
  bandKey:"Splits brightness into bands and tints each one, a multi-band sequential keyer. This is the hard-edged cousin of RAINBOW MAP.",
  bandN:"How many brightness bands the keyer splits into.",
  bandHue:"Rotates the colours assigned to those bands.",
  rowSmear:"Drags each row's colour sideways from the row above, so the picture pulls into horizontal streaks.",
  moire:"Beats a fine grid against the picture, producing interference patterns like a camera pointed at a screen.",
  moireFreq:"The grid spacing, which sets how coarse or fine the interference fringes are.",
  fieldMod:"Video-rate modulation: instead of one value per frame, a field varies across the picture and modulates other things per pixel. The FIELD button chooses its shape.",
  fieldHue:"How much the field shifts hue. Because the field varies across the frame, this paints hue gradients rather than shifting the whole picture.",
  fieldWarp:"How much the field displaces pixels. Combined with a noise field this gives soft per-pixel warping that no frame-rate LFO can reach.",

  /* ---- glitch lab ---- */
  pixelSort:"Sorts runs of pixels by brightness within each column, so bright regions stretch into long vertical streaks. The classic glitch-art smear.",
  sortThresh:"Which pixels count as part of a run. Move it to pick whether shadows, midtones or highlights are the parts that smear.",
  blockShift:"Jumps macroblocks to the wrong place, the way a corrupted codec does when it loses its reference.",
  blockSize:"How big those macroblocks are. Small blocks read as digital fizz; large blocks read as whole chunks of picture in the wrong spot.",
  dotify:"Halftone: reduces the picture to dots whose size follows brightness, like a newspaper screen or a dot-matrix display.",
  dotSize:"The halftone cell size.",
  driftWarp:"Displaces each pixel using its own colour values as the displacement vector, so the picture pushes itself around and colour becomes geometry.",
  fmWarp:"Ripples the picture along contours of brightness, which turns smooth gradients into standing waves.",

  /* ---- flow / mosh ---- */
  mosh:"How much of the held frame survives each pass. This stage keeps its own frame store, so high values freeze the picture while the vector field keeps dragging it — the smear that datamosh is named for. Above about 0.95 it barely refreshes at all.",
  moshGate:"Restricts the holding by motion. Positive means only the moving parts of the frame hold and smear while still areas stay sharp; negative is the opposite, freezing the background and letting movement punch through clean.",
  moshVec:"Pushes the held frame along the vector field chosen with FIELD. On MOTION that field is real optical flow estimated from the picture itself, which is what proper datamosh is: the image stops updating while the movement keeps pulling it apart.",
  flowGain:"Scales the whole vector field at once. Above 1 everything advects further per frame; at 0 the field is switched off and only the holding remains.",
  flowCurl:"Rotates the entire vector field. At 0 the flow points where it naturally points; at 0.5 it is fully perpendicular, so what was drift becomes orbit and what was melting becomes swirl.",
  melt:"Drips the picture along an angle, weighted by brightness, so highlights run further than shadows. Gravity for video.",
  meltDir:"The direction the melt runs. 0 is straight down, and it sweeps all the way around through sideways to upward.",
  meltGate:"Restricts melting to a brightness range, so only the highlights (or only the shadows) run and the rest of the picture stays put.",
  swirl:"Advects the picture through a slowly evolving noise field, so it churns and folds like paint stirred in water.",
  swirlScale:"The size of the noise cells. Small values give one big lazy churn; large values give fine turbulent detail.",
  swirlSpeed:"How fast the noise field itself evolves, separate from how strongly it pushes.",
  moshBlock:"Shoves macroblocks around with garbage motion vectors, like a video call falling apart.",
  moshBlockSize:"How big those blocks are, from fine mosaic to whole slabs of picture.",
  moshRate:"How often new garbage vectors are rolled. Slow rates give lurching held displacements, fast rates give a boiling mess.",
  flowStretch:"Adds a displacement that grows with distance from the centre and scales with how much the picture is moving, so movement tears the frame outward (or inward, when negative).",
  flowRepel:"Pushes pixels along the brightness gradient, away from contrast or into it. Shapes peel apart at their edges.",
  flowNoise:"Adds random jitter to the displacement per pixel, which breaks up the smooth advection into a grainy crawl.",
  flowSharp:"Re-sharpens the held frame each pass. Repeated resampling melts detail away, and this claws some of it back — wound up it rings and etches edges.",
  flowHue:"Rotates the held frame's colour a little on every pass. Because it compounds, held areas cycle through the spectrum while fresh picture stays true.",
  flowFade:"Darkens the held frame slightly each pass, so smears decay instead of persisting forever.",
  timeGrad:"Makes the holding vary from top to bottom of the frame, so one end of the picture is frozen while the other is live.",
  shearAxis:"Whether TIME SHEAR runs vertically (0) or horizontally (1), or somewhere in between.",

  /* ---- keyer ---- */
  keyThresh:"The brightness (or hue distance) that divides the picture into keyed and unkeyed. Turn on VIEW MATTE to see it — white is selected.",
  keySoft:"How gradual the edge of the key is.",
  keyInv:"Swaps which side of the threshold counts as selected.",
  keyHue:"In CHROMA mode, which hue is being keyed. 0.33 is green, 0.66 blue.",
  keyFx:"Applies the whole glitch chain only inside the key, so you can wreck a face and leave the background clean, or the reverse.",
  keyFb:"Grows feedback only inside the key, so the loop blooms out of one part of the picture.",

  /* ---- bent enhancer ---- */
  colorize:"Replaces brightness with a hot posterized rainbow: dark to light becomes a sweep through the spectrum. This is the loudest thing a bent enhancer does.",
  colorBands:"How many times the rainbow wraps across the brightness range. Above 1 the same colours repeat within one gradient, which is where the banded psychedelic look comes from.",
  colorSweep:"Rotates the whole rainbow. Slowly modulated, colours cycle through the picture like a scanning oscillator.",
  lumaHue:"Makes hue chase brightness rather than replacing it, so the original colours stay but lean warm or cool with the light.",
  sharpEcho:"The sharpness circuit driven past stability. A real enhancer's peaking filter, over-driven, rings — so edges throw repeated ghost copies of themselves to one side.",
  echoSpace:"How far apart those ghost edges sit, which is the ringing frequency of that filter.",
  rgbSep:"Pulls the red, green and blue channels apart horizontally, the way a misconverged display or a bad delay line does.",
  invFlick:"Flickers the picture into negative and back. At low values it strobes occasionally; high values invert most of the time.",

  /* ---- feedback / rescan ---- */
  fbAmount:"How much of the previous output is mixed back into the input. This is the master control for the whole loop: below about 0.7 you get trails, above 0.9 the loop starts generating structure of its own.",
  fbZoom:"Scales the fed-back image each pass. Positive zooms in, which builds tunnels receding into the centre; negative zooms out and the picture grows outward.",
  fbRotate:"Rotates the fed-back image each pass. Combined with zoom this produces spirals; on its own with a mirror edge it produces mandalas.",
  fbHue:"Rotates colour a little on every pass, so successive generations of the loop drift through the spectrum and the tunnel becomes a rainbow.",
  fbShiftX:"Translates the loop horizontally each pass, which turns tunnels into plumes leaning to one side.",
  fbShiftY:"Translates the loop vertically each pass.",
  fbShearX:"Shears the loop horizontally, breaking the symmetry so structures lean and stretch instead of staying radial.",
  fbShearY:"Shears the loop vertically.",
  fbGainR:"Red gain per pass. Because it compounds, small imbalances between the three gains build strong colour casts deep in the loop.",
  fbGainG:"Green gain per pass.",
  fbGainB:"Blue gain per pass.",
  fbSat:"Saturation per pass. Slightly above 1 and colour intensifies with depth until it clips into pure hues; below 1 the loop bleaches out.",
  fbVal:"Loop gain — the single most sensitive control here. Just under 1 the loop loses a little energy each pass and settles; at 1 it sustains; above 1 it runs away to white.",
  fbPost:"Posterizes inside the loop, which quantises the feedback into flat bands and makes the structure hard-edged and graphic.",
  fbChromOff:"Displaces the colour channels by different amounts inside the loop, so the tunnel walls separate into chromatic fringes.",
  fbBlur:"Blurs the loop each pass. In a feedback system blur is a diffusion term: it spreads structure outward and stops fine detail from surviving.",
  fbBlur2:"A second, wider blur. The difference between the two blurs is what makes the activator-inhibitor pair that grows Turing patterns — labyrinths, spots and stripes.",
  fbSharp:"Sharpens the loop each pass. Against BLUR this is the activator: it amplifies whatever the blur has not smeared, which is how self-organising patterns emerge.",
  fbDrive:"Pushes the signal into the non-linearity harder before CURVE is applied. Most of the character of a feedback rig comes from what happens at the limits, and this decides how hard you hit them.",
  fbPivot:"The point the drive expands around. Move it to bias whether shadows or highlights get pushed into the curve.",
  fbThresh:"Hard-thresholds the loop into two levels, which is what turns diffusion patterns into crisp cellular structures rather than smoky ones.",
  fbThreshSoft:"How sharp that threshold is. Very small values give hard binary cells; wider values keep grey and the patterns stay soft.",
  fbNoise:"Injects noise into the loop every pass. This is load-bearing, not decorative: with no noise the loop settles into a dead attractor and stops evolving.",
  fbNoiseScale:"The grain size of that noise. Fine noise seeds detail, coarse noise seeds whole new structures.",
  fbRoll:"Rolls the loop vertically a little each pass, so the whole structure creeps up or down the frame like a picture that will not lock.",
  fbJitter:"Randomly displaces the loop from frame to frame, which strobes and breaks up structures before they can settle.",
  fbAuto:"An automatic level servo: it watches the output brightness and pushes the loop gain back toward the middle. Turn it up when you want to run near the edge of runaway without falling over it.",

  /* ---- composite signal ---- */
  chromaBleed:"Colour information in composite video has far less bandwidth than brightness, so it smears sideways. This is that smear, and it is the single most characteristic thing about analogue colour.",
  chromaDelay:"Shifts the colour sideways relative to the brightness, the way a mistimed decoder does — the colour ends up beside the object instead of on it.",
  lumaBleed:"Smears bright signal along the scan direction, as if the amplifier could not settle fast enough after a hot transition.",
  bleedDir:"Which way that smear runs and how far. Negative trails behind, positive leads ahead.",
  vBleed:"Bleeds colour vertically across scanlines, so hues drip down the picture.",
  rainbow:"Cross-colour fringing: fine detail beats against the colour subcarrier and produces shimmering false rainbows on sharp edges.",
  dotCrawl:"The crawling dotted pattern that appears along colour boundaries in composite video, moving frame by frame as the subcarrier phase shifts.",
  ringing:"Overshoot after sharp transitions — the bright edge just after a dark-to-light step. A filter that is not quite critically damped.",
  signalNoise:"Brightness noise, bandwidth-limited along the line and streaky by row, which is what analogue noise actually looks like rather than even grain.",
  chromaNoise:"Noise in the colour channels only, which reads as blotchy shifting tints rather than grain.",

  /* ---- sync corruption ---- */
  hWobble:"A steady sinusoidal wobble in the horizontal timebase, so the picture waves instead of standing still.",
  wobbleFreq:"How many cycles of that wobble fit down the frame. Low values give a slow lean, high values give a fine ripple.",
  tear:"How often the sync circuit loses lock. Each event shears the picture hard at one scanline and then recovers exponentially down the frame — the way a real phase-locked loop grabs back on.",
  tearSize:"How far down the frame each loss of lock takes to recover. Small values snap back immediately; large values drag the shear most of the way down.",
  vRoll:"Vertical hold failure: the picture rolls up or down continuously, with a blanking bar travelling through it.",
  jitter:"Random line-to-line timing error. Even a healthy picture is never perfectly still, and a small amount here is what stops everything looking computer-generated.",
  humBar:"A dark band drifting slowly up the picture from mains hum getting into the signal path.",

  /* ---- tape transport ---- */
  tapeSpeed:"Runs from SP to EP. A slower tape writes the same picture into less tape, so bandwidth collapses: chroma widens, detail goes, dropouts get more likely and head switching gets uglier.",
  tracking:"How badly the head is following the track. Produces a band of noise and timing error that drifts vertically, exactly like a tape that needs its tracking adjusting.",
  trackPhase:"Where the mistracking band sits in the frame. Sweep it and the noise band travels up or down the picture.",
  trackHunt:"Sets the auto-tracking servo searching. The band creeps, overshoots and snaps back rather than sitting still — a deck that cannot decide it has found the track.",
  dropout:"Momentary loss of signal where the tape has shed oxide. Each dropout is a bright comet-tail streak that fades along the line.",
  dropoutLen:"How far those streaks run before they fade.",
  chromaLoss:"The colour-under signal gives up before the luminance does, so the picture desaturates in bands while the brightness survives.",
  crease:"A physical fold in the tape: one band shears hard sideways and jitters frame to frame, with noise where the head lifts off.",
  creasePos:"Where down the frame the crease sits.",
  headClog:"A clogged head produces a band with no RF at all — no detail, no colour, just noise. The band wanders slowly.",
  azimuth:"Azimuth error means alternate head passes read at the wrong angle, so every other line loses its high frequencies. The picture goes soft in a fine interlaced way.",
  headSwitch:"The skew at the very bottom of the frame where the deck switches between heads. Every VHS picture has this; it is one of the most recognisable tells.",
  tapeWow:"Slow speed variation from an uneven transport, which bends the geometry of the picture as it plays.",
  wowRate:"How fast that variation happens, from a long lazy sway to a nervous flutter.",
  flutter:"Scrape flutter: fast, small timing errors from the tape juddering against the guides. Fine, high-frequency, and quite different from wow.",
  tapeStretch:"Stretched tape reads long at the top of the frame, so the geometry leans over as the head comes back around.",
  edgeDmg:"The top and bottom edges of the tape wear first, so those lines break down into noise before the middle does.",
  printThru:"Print-through: the magnetic pattern on one layer bleeds into the layer wound against it, so a faint offset ghost of the picture shows.",
  hiss:"Fine uncorrelated noise in the brightness, the tape's own noise floor.",
  stillNoise:"The noise bar a deck parks across a paused field. Also comes on automatically when you press the STILL transport button.",
  shuttleNz:"Bands of head-crossing noise marching through the picture, as when a deck is shuttling. Also comes on automatically with the shuttle and jog buttons.",
  genLoss:"One generation of dubbing: bandwidth lost, noise added, colour weakened.",
  genCount:"How many times the tape has been dubbed. GEN LOSS compounds across this many generations, so a small loss and a high count gives something far worse than either alone.",

  /* ---- colour stage ---- */
  flipMode:"Turns the picture over: off, left-right, top-bottom, or both. It happens before the framing, so it flips the picture rather than the raster.",
  mirrorMode:"Reflects one half of the picture onto the other: off, horizontal, vertical, or both. Unlike the feedback mirror this works on the source, so it is symmetry you can see before anything else happens.",
  multiN:"Tiles the picture into a grid of repeats, alternate cells mirrored so the tiles meet rather than butting hard against each other. Two gives a quad, eight gives a wall of them.",
  strobe:"Holds each frame for a while before letting the next one through, so motion becomes a series of stills. Wound up it goes from a slight judder to a hard stutter several frames long.",
  shake:"Knocks the picture off its position at random, the way a camera mount does when something hits it.",
  shakeRate:"How often the shake picks a new position. Low is a slow lurch, high is a fast rattle.",
  negative:"Turns the picture into a negative. NEG MODE decides whether brightness, colour, or both are inverted.",
  negMode:"What NEGATIVE inverts: both brightness and colour, colour only (so the picture stays the right way up but the hues flip), or brightness only.",
  monoCol:"Puts the whole picture through a single colour, keeping its brightness. A colour filter over the lens rather than a tint applied to the pixels.",
  monoHue:"Which colour MONOCOLOR uses.",
  colorPass:"Keeps one hue and drops everything else to monochrome. The classic single-red-coat-in-a-black-and-white-street effect, and a good way to pull one element out of a busy picture.",
  passHue:"Which hue survives.",
  passWidth:"How wide a band of hues counts as surviving. Narrow picks one shade, wide keeps a whole family.",
  silhouette:"Thresholds the picture into a flat silhouette of one colour, throwing away everything except the shape.",
  silThresh:"Where the silhouette cuts between shape and ground.",
  silHue:"The colour the silhouette is filled with.",
  findEdge:"Edge detection: outlines on a dark ground, brighter where the picture changes fastest. Related to CONTOUR but this finds gradients rather than brightness bands, so it traces detail rather than bands of tone.",
  edgeHue:"The colour of the outlines, shifting a little with edge strength.",
  emboss:"Lights the picture from one side so it reads as relief cut into a surface.",
  embossDir:"Which direction the emboss is lit from.",
  rGain:"Red channel gain. Unbalancing the three is the quickest way to a strong colour cast.",
  gGain:"Green channel gain.",
  bGain:"Blue channel gain.",
  saturation:"Colour intensity. Above about 1.8 the hues clip into pure primaries, which is a large part of the bent-enhancer look.",
  hue:"Rotates every colour in the picture around the wheel.",
  brightness:"Lifts or drops the whole picture.",
  contrast:"Expands or compresses the range around mid grey.",
  posterize:"Quantises each colour channel to a few levels, so gradients become flat steps.",
  solarize:"Folds the top of the brightness range back down, so highlights invert. Named after the darkroom accident of exposing a print to light mid-development.",
  glow:"Bright areas spill light into their surroundings before the picture reaches the display stage.",

  /* ---- master display ---- */
  scanlines:"Dark gaps between the lines of the raster. The beam profile widens with brightness, so highlights bloom their lines together while shadows stay separated — which is why this reads as a tube rather than as stripes laid on top.",
  beamWidth:"How wide the electron beam is relative to the line pitch. Narrow gives a hard visible raster, wide fills it in.",
  beamShape:"The falloff profile of the beam, from a soft gaussian to a hard-edged bar.",
  aperture:"How strongly the phosphor mask shows. The DISPLAY button chooses which mask: aperture grille, slot, shadow, LCD stripe and so on.",
  maskDark:"How dark the gaps in that mask are. Heavy masks cost real brightness, exactly like the real thing.",
  curvature:"Barrel-distorts the picture as if it were painted on the inside of a curved tube.",
  cornerRound:"Rounds off the corners of the tube.",
  vignette:"Darkens toward the edges, from the beam having further to travel and hitting the phosphor at an angle.",
  bloom:"Light spilling out of bright areas — a real tube cannot contain a hot highlight.",
  bloomRad:"How far that spill reaches.",
  halation:"The warm red-orange ring film gets around highlights, from light scattering back off the film base. This is what makes a rephotographed screen look photographed rather than rendered.",
  defocus:"Softens the whole picture as if the lens (or the tube's focus) were slightly off.",
  grain:"Film grain over the top, the last thing in the chain.",
  outGamma:"The output transfer curve. Below 1 lifts shadows, above 1 crushes them.",
  outBright:"Final brightness offset.",
  outContrast:"Final contrast.",
  outSat:"Final saturation, after everything else.",
  outWarmth:"Tilts the whole picture warm or cool, like a monitor's colour temperature control.",
  blackLevel:"Where black sits. Lift it for the washed-out blacks of a badly set-up monitor; drop it to crush.",
  whiteClip:"Where the picture clips to white. Below 1 the highlights blow out early.",
  phosphor:"Phosphor persistence: each frame leaves a decaying afterglow. This is a display-stage trail, quite different from feedback — it never re-enters the chain.",
  hvSag:"On a real tube the high-voltage supply sags when the picture is bright, so the raster grows. Bright scenes literally get wider.",

  /* ---- output overlay ---- */
  letterbox:"Black bars top and bottom.",
  pillarbox:"Black bars left and right.",
  bezel:"A dark surround with a soft inner edge, as if the picture sat inside a monitor's plastic.",
  glassRefl:"A broad reflection across the glass, as if there were a window behind you.",
  dust:"Dust and dirt sitting on the surface rather than in the picture.",
  scratches:"Vertical scratches, the marks a print picks up running through a projector.",
  ovMoire:"The interference pattern a camera picks up when it photographs a screen.",
  rollShutter:"The horizontal banding a CMOS sensor produces when it photographs a display, from the sensor and the raster running at slightly different rates.",
  safeArea:"Broadcast safe-area guides, for framing. Not an effect — it draws over the picture and is not recorded.",
  lensDist:"Barrel one way, pincushion the other. This is the lens rather than the tube: it bends the whole picture before anything is sampled, so what leaves the frame genuinely leaves rather than being stretched along the edge.",
  lensCA:"Transverse chromatic aberration. Red and blue focus at slightly different scales, so colour fringes appear and grow towards the corners, the way they do on a cheap zoom wide open.",
  lensStreak:"The horizontal flare an anamorphic lens throws off a highlight. Of everything in this section it is the one artefact that reads instantly as a lens and not as a filter.",
  streakHue:"How blue the streak is. All the way up is the coated-glass blue everybody recognises; all the way down leaves it white.",
  lensSmudge:"Smears on the glass. A smudge is only visible where something bright is behind it, so this is driven by the highlights rather than laid over the picture as a texture, which is why it moves with the shot instead of sitting on top of it.",
  lightLeak:"Light getting past the felt and fogging one side of the frame. The direction wanders slowly and the intensity breathes, so it never sits still.",
  leakHue:"The colour of the leak. Low is the orange of daylight through a film can; higher takes it through magenta and into cyan.",
  gateWeave:"Registration weave. The picture drifts and twitches in the gate the way it does on a projector whose pins have worn, with a little per-frame jump on top of the slow drift.",
  gateHair:"A hair caught in the gate, hanging from the top of the frame and twitching. One of those details that does more for believability than any amount of grain.",
  lcdGrid:"A flat panel instead of a tube: a subpixel lattice with a black grid between the cells. Use it with the CRT display model off, or the two masks fight each other.",
  stuckPix:"Dead and stuck pixels. They never move, which is what makes them read as a fault in the panel rather than noise in the signal.",
  osdShow:"The deck\u2019s own on-screen display, burnt in over everything: the transport symbol, a running tape counter and an optional date stamp, in the dot-matrix yellow every camcorder used. Mode and date format are the buttons at the top of this section.",
  osdSize:"How large the display is drawn, relative to the frame.",
  osdGlow:"How much the display blooms. Real burnt-in characters were bright enough to flare slightly against a dark picture.",
};
/* the bus 2 and master mixer controls reuse bus 1's descriptions */
for(const [suffix, note] of [["2"," (bus 2: channels C and D)"], ["M"," (master: bus 1 against bus 2)"]]){
  for(const id of ["wipeSoft","wipeDetail","wipeX","wipeY","mixKeyThresh","mixKeySoft","mixKeyInv","mixKeyHue","pipX","pipY","pipSize","pipBorder",
                   "edgeAmt","edgeWidth","edgeHold","edgeSwirl","edgeChroma","edgeCreep",
                   "wipeBord","wipeBordCol","wipeRep","mixKeyGain","mixKeyDens","mixKeyEdge","mixKeyEdgeCol","mixKeyShadow","mixDirt","mixDirtRate","mixDirtDrop","mixDirtCut","mixDirtKnock","mixDirtNoise"]){
    PHELP[id+suffix] = PHELP[id] + note;
  }
}


/* ---------------- per-section help ---------------- */
const SECHELP = {
  mixer:"Bus 1 of three. Combines the two finished channels A and B with a fader, twenty transition modes, a keyer and the melt stage that softens the seam between them.",
  mixer2:"Bus 2. Identical to bus 1 but for channels C and D. It only renders while the MASTER fader is above zero, so leaving it alone is free.",
  mixerM:"The master crossfade between the two buses, with the same twenty transitions one level up.",
  snap:"Eight whole-rig snapshots with a glide time, and a performance recorder that writes down every control you move so the take can be replayed against other footage.",
  morph:"Snapshot two entire panel states and blend every slider between them. The fastest way to build a long evolving performance.",
  gen:"A shape and pattern generator built like a video synthesiser rather than a list of test cards: ramps and oscillators, cross-modulation, a wavefolder, a comparator and a colouriser. Everything here is modulatable, so it is a moving source rather than a still one.",
  frame:"How this channel's picture sits in the raster, before anything is done to it. Also where the kaleidoscope fold lives.",
  enhancer:"The circuit-bent video enhancer core: a colour processor pushed past its design limits. Rainbow mapping, an oscillating sharpness circuit, channel separation.",
  feedback:"The loop, and the most generative part of the instrument. The output is transformed and fed back into the input, so the picture becomes a dynamical system rather than a filter chain.",
  time:"A bent frame store: a thirty-frame ring buffer you can echo from, scrub through and freeze.",
  contour:"The other bent-enhancer signature. Draws the boundaries between brightness bands, which is what gives those repeated outlines tracing a face or a body.",
  glitch:"Digital corruption rather than analogue: pixel sorting, macroblock databending, halftone and self-displacement warps.",
  flow:"Temporal smear with its own frame store. Holds the picture and advects it along a vector field — including real optical flow estimated from the image, which is what datamosh actually is.",
  keyer:"Selects part of the picture by brightness or hue, then restricts the glitch chain and the feedback to that selection.",
  signal:"Composite encode and decode, with all the bandwidth compromises that implies. This is where the analogue colour character comes from.",
  sync:"The timebase failing. A per-scanline phase-locked loop is simulated on the CPU every frame, so shears recover the way a real circuit grabs lock again.",
  vhs:"A whole tape deck, per channel: transport, tracking servo, head switching, physical tape damage and generation loss.",
  color:"A straightforward colour corrector at the end of the per-channel chain — levels, saturation, hue, and the graphic operations.",
  crt:"The master display stage, shared by everything. Not a filter but a model of a screen: mask geometry, beam profile, persistence, and the output transform.",
  overlay:"Everything between the picture and the eye: the lens, the glass in front of the screen, the panel itself, and the deck's own burnt-in display. Not effects on the signal, but artefacts of whatever it is being watched through.",
  lab:"Techniques from the open-source glitch canon, rebuilt: sparse line jitter, NTSC crosstalk, slitscan, bit crush, moire, and video-rate field modulation.",
  audio:"Sets what the audio-reactive mod sources listen to: each band's frequency range and gain, the input device, and the response time.",
  lfo:"Rates and shapes for the four LFOs, plus tempo and the sync divisions.",
};

/* Master sections are single-instance; everything else exists once per channel. */
const MASTER_SECS = new Set(["mixer","mixer2","mixerM","crt","overlay","morph"]);
const CHANNELS = ["A","B","C","D"];
const BUSPAIR = {A:"B", B:"A", C:"D", D:"C"};   // each channel's partner on its mixer bus
/* COPY / SWAP are free routing: any channel to any other. The bus partner is
   only the default the selector opens on. */
let copyDest = "B";
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
function copyChannel(from, to){
  if(from === to) return;
  for(const p of CLIST) chanBase[to][p.id] = chanBase[from][p.id];
}
function swapChannels(a, b){
  if(a === b) return;
  for(const p of CLIST){ const t = chanBase[a][p.id]; chanBase[a][p.id] = chanBase[b][p.id]; chanBase[b][p.id] = t; }
}
let fbTrailMode = false;   // false=MIX  true=TRAIL(lighten)
let rescanMode = false;    // true = feedback taps the CRT-processed output (full rescan)
let chainOrder = ["sig","col","glitch","lab","flow"];    // drag-to-reorder signal chain
let stageEnabled = {sig:true, col:true, glitch:true, lab:true, flow:true};
let keyChroma = false;     // keyer mode: false=luma true=chroma
let mixMode = 0;           // BUS 1 (A/B) transition/blend mode (see MIXMODES)
let wipeInv = false;
let mixMode2 = 0, wipeInv2 = false;   // BUS 2 (C/D)
let mixModeM = 0, wipeInvM = false;   // MASTER (bus 1 / bus 2)
/* transition, mix type and key are three independent choices per bus */
let mixBlend = 0, mixBlend2 = 0, mixBlendM = 0;
let mixKey = 0,   mixKey2 = 0,   mixKeyM = 0;
/* the mixer shader has one set of uniform names; each bus feeds it its own params */
const MIXP = ["abMix","wipeSoft","wipeDetail","wipeX","wipeY","mixKeyThresh","mixKeySoft","mixKeyInv","mixKeyHue","pipX","pipY","pipSize","pipBorder",
              "edgeAmt","edgeWidth","edgeHold","edgeSwirl","edgeChroma","edgeCreep",
              "wipeBord","wipeBordCol","wipeRep","mixKeyGain","mixKeyDens","mixKeyEdge","mixKeyEdgeCol","mixKeyShadow","mixDirt","mixDirtRate","mixDirtDrop","mixDirtCut","mixDirtKnock","mixDirtNoise"];
const MIXP_EDGE = 13;   /* index of edgeAmt inside a bus's parameter list */
/* which channel feeds each side of each bus — any channel can meet any other */
const busSrc = {b1:["A","B"], b2:["C","D"]};
/* pattern synth mode selectors, one set per channel */
const GEN_SHAPES = ["SCAN","RADIAL","SPIRAL","PLASMA","LISSAJOUS","RINGS","STARBURST","GRID","TUNNEL","CELLS","INTERFERE","POLYGON"];
const GEN_WAVES  = ["SINE","TRIANGLE","SAW","SQUARE","PULSE","S&H"];
const GEN_COLS   = ["MONO","RGB PHASE","HSV SWEEP","DUOTONE","BANDS"];
const genMode = {};
let multiView = false;
const MIXBUS = {
  b1: MIXP,
  b2: ["cdMix","wipeSoft2","wipeDetail2","wipeX2","wipeY2","mixKeyThresh2","mixKeySoft2","mixKeyInv2","mixKeyHue2","pipX2","pipY2","pipSize2","pipBorder2",
       "edgeAmt2","edgeWidth2","edgeHold2","edgeSwirl2","edgeChroma2","edgeCreep2",
       "wipeBord2","wipeBordCol2","wipeRep2","mixKeyGain2","mixKeyDens2","mixKeyEdge2","mixKeyEdgeCol2","mixKeyShadow2","mixDirt2","mixDirtRate2","mixDirtDrop2","mixDirtCut2","mixDirtKnock2","mixDirtNoise2"],
  bM: ["busMix","wipeSoftM","wipeDetailM","wipeXM","wipeYM","mixKeyThreshM","mixKeySoftM","mixKeyInvM","mixKeyHueM","pipXM","pipYM","pipSizeM","pipBorderM",
       "edgeAmtM","edgeWidthM","edgeHoldM","edgeSwirlM","edgeChromaM","edgeCreepM",
       "wipeBordM","wipeBordColM","wipeRepM","mixKeyGainM","mixKeyDensM","mixKeyEdgeM","mixKeyEdgeColM","mixKeyShadowM","mixDirtM","mixDirtRateM","mixDirtDropM","mixDirtCutM","mixDirtKnockM","mixDirtNoiseM"]
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
/* the deck's burnt-in display: which transport symbol, and whether a date
   stamp is drawn with it */
let osdMode = 1;       // 0 REC  1 PLAY  2 PAUSE  3 STOP  4 FF  5 REW
let osdDate = 0;       // 0 none 1 date 2 date + time
let osdCounter = 0;    // running tape counter, seconds
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
const progMULTI = makeProg(FS_MULTI);
const progGEN = makeProg(FS_GEN);
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
let RING_N = 30;

/* Each channel owns its feedback history, flow history and frame ring;
   scratch buffers are shared because channels render one after the other. */
function newChanRT(){
  return {fbPrev:null, fbNext:null, crt:null, flowA:null, flowB:null, flowSrc:null, gen:null, out:null,
          ring:null, ringW:0, ringFilled:0};
}
const chanRT = {};
for(const ch of CHANNELS){ chanRT[ch] = newChanRT(); genMode[ch] = {shape:0, wave:0, col:1}; }
let scratch1, scratch2, mixOut, busOut1, busOut2, persistA, persistB;
/* one frame of history per mixer stage, so the melt stage can read what the
   same stage produced last time. Ping-ponged rather than copied. */
let busHist1, busHist2, mixHist;
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
const CH_RTS = ["fbPrev","fbNext","crt","flowA","flowB","flowSrc","gen","out"];
/* A channel's eight render targets are only allocated once that channel is
   actually used. At 720p that hardly matters; at 2160p each one is 33 MB, so
   allocating all four channels up front would cost a gigabyte for nothing. */
function allocChan(ch){
  const c = chanRT[ch];
  for(const k of CH_RTS) freeRT(c[k]);
  clearRing(c);
  for(const k of CH_RTS) c[k] = makeRT(procW, procH);
  c.allocated = true;
}
function ensureChanRT(ch){
  if(!chanRT[ch].allocated) allocChan(ch);
}
function clearRT(rt){
  if(!rt) return;
  gl.bindFramebuffer(gl.FRAMEBUFFER, rt.fbo);
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT);
}
/* Empty every buffer that feeds itself: the feedback store, the flow stage's
   frame store, the phosphor persistence and the frame ring. A bad frame in any
   of those circulates indefinitely, so this is the way out without touching a
   single parameter. */
function flushBuffers(){
  for(const ch of CHANNELS){
    const c = chanRT[ch];
    if(!c.allocated) continue;
    for(const k of CH_RTS) clearRT(c[k]);
    if(c.ring){ for(const r of c.ring) clearRT(r); c.ringW = 0; c.ringFilled = 0; }
    c.flowLast = -99;
  }
  clearRT(scratch1); clearRT(scratch2); clearRT(mixOut);
  clearRT(busOut1); clearRT(busOut2); clearRT(persistA); clearRT(persistB);
  clearRT(busHist1); clearRT(busHist2); clearRT(mixHist);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function allocRTs(){
  for(const ch of CHANNELS){
    const c = chanRT[ch];
    if(c.allocated) allocChan(ch);
    else { for(const k of CH_RTS) freeRT(c[k]); clearRing(c); }
  }
  freeRT(scratch1); freeRT(scratch2); freeRT(mixOut); freeRT(busOut1); freeRT(busOut2);
  freeRT(persistA); freeRT(persistB);
  freeRT(busHist1); freeRT(busHist2); freeRT(mixHist);
  scratch1 = makeRT(procW,procH); scratch2 = makeRT(procW,procH); mixOut = makeRT(procW,procH);
  busOut1 = makeRT(procW,procH); busOut2 = makeRT(procW,procH);
  persistA = makeRT(procW,procH); persistB = makeRT(procW,procH);
  busHist1 = makeRT(procW,procH); busHist2 = makeRT(procW,procH); mixHist = makeRT(procW,procH);
}
const MAX_TEX = gl.getParameter(gl.MAX_TEXTURE_SIZE);
function setProcRes(h){
  const w = Math.round(h*16/9/2)*2;
  if(w > MAX_TEX){
    if(typeof toast === "function") toast("This machine tops out at "+MAX_TEX+" pixels wide", true);
    return false;
  }
  procH = h; procW = w;
  /* the frame store is the one thing that scales badly: thirty 4K frames is
     four gigabytes, so the ring gets shorter as the raster gets bigger */
  RING_N = h >= 2160 ? 6 : h >= 1440 ? 12 : h >= 1080 ? 20 : 30;
  allocRTs();
  return true;
}
setProcRes(1080);

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
/* stand-in for a channel that has not been allocated yet */
const blackTex = makeSrcTex();
function chanOutTex(ch){ const c = chanRT[ch]; return (c.allocated && c.out) ? c.out.tex : blackTex; }
/* re-entry: a channel can take another channel, a bus, or the programme as its
   source. Whatever it reads is last frame's, exactly like patching a mixer's
   output back into a spare input with a cable. */
const FEED_SRCS = [
  {id:"A", name:"CH A OUT"}, {id:"B", name:"CH B OUT"},
  {id:"C", name:"CH C OUT"}, {id:"D", name:"CH D OUT"},
  {id:"BUS1", name:"BUS 1 OUT"}, {id:"BUS2", name:"BUS 2 OUT"},
  {id:"PGM", name:"PROGRAMME OUT"},
];
function feedTex(id){
  if(id === "BUS1") return busOut1 ? busOut1.tex : blackTex;
  if(id === "BUS2") return busOut2 ? busOut2.tex : blackTex;
  if(id === "PGM")  return mixOut  ? mixOut.tex  : blackTex;
  return chanOutTex(id);
}

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

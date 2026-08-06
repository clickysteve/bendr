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
"  /* A soft key is not a smoothstep. On a real keyer it is a high-gain\n" +
"     amplifier driven into its rails: k = clamp(gain*(v - threshold) + 0.5).\n" +
"     The edge is therefore made of a percentage of the source itself, so noise\n" +
"     in the source becomes noise in the edge and grain becomes grain. A\n" +
"     smoothstep edge is clean in a way nothing else in this signal path is. */\n" +
"  float gain = 1.0/max(soft, 0.0156);\n" +
"  float k = clamp((v - th)*gain + 0.5, 0.0, 1.0);\n" +
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
"uniform float u_fbWrap,u_fbMirror,u_fbBlend,u_fbNL,u_fbInvert,u_autoGain,u_fbFlip;\n" +
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
"  /* sign switch: a reflection, determinant -1, which no rotation can reach.\n" +
"     It is what turns a rotating tunnel into an alternating one, and it is the\n" +
"     axis the classic feedback regimes are organised along. */\n" +
"  if(u_fbFlip>0.5){\n" +
"    if(u_fbFlip<1.5) p.x = -p.x;\n" +
"    else if(u_fbFlip<2.5) p.y = -p.y;\n" +
"    else p = -p;\n" +
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

/* ---------------- the scan processor ----------------
   Every other stage here is a fragment shader: a full-screen triangle, one
   output pixel sampled from one input pixel. This one is not, and it cannot be.

   A scan processor intercepts a monitor's deflection signals before the yoke
   and patches video luminance into the vertical position control, so bright
   parts of the picture physically pull the scan line up the tube. A camera
   re-shoots the tube. The apparent depth is an artefact of photographing a 2D
   deflection, not a 3D scene.

   The part that matters, and the part every digital version misses, is that the
   result is DRAWN rather than sampled. It is a stack of continuous glowing
   lines, and where those lines bunch together you get a bright caustic ridge,
   where they splay apart you get a dark gap. A fragment shader has no notion of
   line density, so a displacement map cannot produce that. So: real geometry,
   accumulated additively, with the beam getting brighter where it sweeps slower
   - because a slower beam deposits more energy per unit length. That one term
   is most of the difference between this and a displacement modifier.

   No vertex buffers. Position comes from gl_VertexID and gl_InstanceID, and
   luminance is fetched in the vertex shader, which WebGL2 guarantees. Lines are
   expanded to ribbons because gl.lineWidth is clamped to 1 on essentially every
   desktop platform. */
const VS_SCAN =
"#version 300 es\n" +
"precision highp float;\n" +
"uniform sampler2D u_tex;\n" +
"uniform vec2 u_res;\n" +
"uniform float u_lines,u_samples,u_time;\n" +
"uniform float u_scanAmt,u_scanWidth,u_scanVel,u_scanTiltX,u_scanTiltY,u_scanPersp;\n" +
"uniform float u_scanCurve,u_scanCollapse,u_scanRevH,u_scanRevV;\n" +
"uniform float u_scanWobAmt,u_scanWobFreq,u_scanWobLock,u_scanLissa,u_scanSkew;\n" +
"out vec3 v_col;\n" +
"out float v_gain;\n" +
"float lum3v(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }\n" +
"/* where the beam is when it is this far along this line, before the ribbon is\n" +
"   built around it. Everything that bends the raster happens here, so it all\n" +
"   composes with everything else. */\n" +
"vec2 beamAt(float sx, float line, out vec3 col){\n" +
"  float u = sx;\n" +
"  float v = line;\n" +
"  if(u_scanRevH > 0.5) u = 1.0 - u;\n" +          /* reverse the horizontal sweep */
"  if(u_scanRevV > 0.5) v = 1.0 - v;\n" +          /* reverse the field */
"  col = texture(u_tex, vec2(u, v)).rgb;\n" +
"  float y = lum3v(col);\n" +
"  vec2 p = vec2(sx*2.0-1.0, (1.0-line)*2.0-1.0);\n" +
"  /* S-curve: the continuous-wind yoke, bending the whole raster */\n" +
"  p.x += sin(p.y*3.14159)*u_scanCurve*0.4;\n" +
"  /* skew, which is the same control a bench monitor calls parallelogram */\n" +
"  p.x += p.y*u_scanSkew*0.5;\n" +
"  /* the deflection oscillators. Locked to a multiple of the field rate the\n" +
"     pattern stands still; detuned it crawls, and that crawl is the whole\n" +
"     gesture of the instrument. */\n" +
"  if(u_scanWobAmt > 0.0005){\n" +
"    float f = floor(u_scanWobFreq*12.0 + 0.5) + (1.0-u_scanWobLock)*fract(u_scanWobFreq*12.0);\n" +
"    float ph = p.y*f*3.14159 + u_time*(1.0-u_scanWobLock)*2.0;\n" +
"    p.x += sin(ph)*u_scanWobAmt*0.5;\n" +
"    if(u_scanLissa > 0.0005) p.y += sin(p.x*f*1.61803*3.14159 + u_time*(1.0-u_scanWobLock)*1.7)*u_scanWobAmt*u_scanLissa*0.5;\n" +
"  }\n" +
"  /* raster collapse: remove the current from one deflection system and the\n" +
"     whole frame smears down onto a single line, or a point */\n" +
"  p.y *= 1.0 - clamp(u_scanCollapse, 0.0, 1.0);\n" +
"  /* and the thing the machine is actually for: luminance into the vertical\n" +
"     position control */\n" +
"  p.y += (y - 0.35)*u_scanAmt*1.6;\n" +
"  /* tilt is what turns a deflection into an apparent surface */\n" +
"  float cx = cos(u_scanTiltX), sx2 = sin(u_scanTiltX);\n" +
"  float cy = cos(u_scanTiltY), sy = sin(u_scanTiltY);\n" +
"  float dz = (y - 0.35)*u_scanAmt*1.6;\n" +
"  vec3 q = vec3(p.x, p.y, dz);\n" +
"  q = vec3(q.x*cy + q.z*sy, q.y, -q.x*sy + q.z*cy);\n" +
"  q = vec3(q.x, q.y*cx - q.z*sx2, q.y*sx2 + q.z*cx);\n" +
"  float w = 1.0 + q.z*u_scanPersp*0.6;\n" +
"  return vec2(q.x, q.y)/max(w, 0.15);\n}\n" +
"void main(){\n" +
"  float line = (float(gl_InstanceID) + 0.5)/u_lines;\n" +
"  int vid = gl_VertexID;\n" +
"  float si = float(vid >> 1);\n" +
"  float side = (vid & 1) == 0 ? -1.0 : 1.0;\n" +
"  float sx = si/(u_samples-1.0);\n" +
"  vec3 col;\n" +
"  vec2 here = beamAt(sx, line, col);\n" +
"  /* the tangent gives two things at once: which way to lay the ribbon, and how\n" +
"     fast the beam is travelling, which is what sets its brightness */\n" +
"  float d = 1.0/(u_samples-1.0);\n" +
"  vec3 tc;\n" +
"  vec2 ahead = beamAt(min(sx+d, 1.0), line, tc);\n" +
"  vec2 back  = beamAt(max(sx-d, 0.0), line, tc);\n" +
"  vec2 tang = ahead - back;\n" +
"  float speed = max(length(tang)/(2.0*d), 0.02);\n" +
"  vec2 nrm = normalize(vec2(-tang.y, tang.x*u_res.x/u_res.y));\n" +
"  float wpx = (0.7 + u_scanWidth*7.0)/u_res.y*2.0;\n" +
"  gl_Position = vec4(here + nrm*side*wpx, 0.0, 1.0);\n" +
"  v_col = col;\n" +
"  /* a slower beam deposits more energy per unit length. Without this you have\n" +
"     a displacement map with extra steps. */\n" +
"  /* a flat, undisplaced line sweeps two NDC units per unit of x, so that is\n" +
"     the reference: gain one where the beam is at nominal speed, brighter\n" +
"     where the displacement slows it, dimmer where it is thrown across */\n" +
"  v_gain = mix(1.0, clamp(2.0/speed, 0.05, 8.0), u_scanVel);\n}\n";

const FS_SCAN =
"#version 300 es\nprecision highp float;\n" +
"in vec3 v_col;\nin float v_gain;\nout vec4 O;\n" +
"uniform float u_scanGain,u_scanMono,u_scanHue;\n" +
"vec3 hsv2s(vec3 c){\n" +
"  vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0))*6.0 - 3.0);\n" +
"  return c.z * mix(vec3(1.0), clamp(p-1.0, 0.0, 1.0), c.y);\n}\n" +
"void main(){\n" +
"  vec3 c = v_col;\n" +
"  float y = dot(c, vec3(0.299,0.587,0.114));\n" +
"  c = mix(c, vec3(y), u_scanMono);\n" +
"  if(u_scanHue > 0.002) c = mix(c, hsv2s(vec3(fract(u_scanHue + y*0.35), 0.85, 1.0))*y, u_scanHue);\n" +
"  O = vec4(c*v_gain*u_scanGain, 1.0);\n}\n";

/* Phosphor persistence, as an accumulator rather than a one-frame echo.
   The reason a CRT trail is coloured rather than grey is that the three P22
   phosphors do not decay at the same rate - green hangs on longest, blue goes
   first - so fast motion leaves a green-tinted wake with a blue leading edge.
   One buffer, three decay constants. */
const FS_PHOS = COMMON +
"uniform sampler2D u_cur; uniform sampler2D u_prev;\n" +
"uniform float u_phosphor,u_phosR,u_phosG,u_phosB;\n" +
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  vec3 c = texture(u_cur, uv).rgb;\n" +
"  vec3 p = texture(u_prev, uv).rgb;\n" +
"  vec3 k = clamp(vec3(u_phosR, u_phosG, u_phosB)*u_phosphor, 0.0, 0.995);\n" +
"  O = vec4(max(c, p*k), 1.0);\n}\n";

/* ---------------- the field domain ----------------
   Analogue video is not frames. It is sixty half-height pictures a second,
   each sampled at a different instant and offset by half a line, and almost
   everything that makes video look like video rather than film comes from
   that. Interlace twitter is why broadcast graphics were always vertically
   soft. The serrated edge on a fast pan is not compression, it is two
   different moments in one frame.

   This holds the previous field and recombines it with the current one, so
   the comb is real temporal aliasing rather than a drawn pattern. */
const FS_FIELD = COMMON +
"uniform sampler2D u_tex; uniform sampler2D u_prevField;\n" +
"uniform float u_ilAmt,u_ilMode,u_ilOrder,u_ilTwitter,u_ilJudder,u_parity,u_time;\n" +
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  vec3 cur = texture(u_tex, uv).rgb;\n" +
"  if(u_ilAmt < 0.003){ O = vec4(cur,1.0); return; }\n" +
"  float line = floor(gl_FragCoord.y);\n" +
"  /* which field this line belongs to, and which field is being written now */\n" +
"  float lineParity = mod(line, 2.0);\n" +
"  float now = u_ilOrder > 0.5 ? 1.0 - u_parity : u_parity;\n" +
"  bool thisField = abs(lineParity - now) < 0.5;\n" +
"  vec3 prev = texture(u_prevField, uv).rgb;\n" +
"  vec3 outc;\n" +
"  if(u_ilMode < 0.5){\n" +
"    /* WEAVE: the two fields simply interleave, so anything that moved between\n" +
"       them serrates. This is what an interlaced signal actually is. */\n" +
"    outc = thisField ? cur : prev;\n" +
"  } else if(u_ilMode < 1.5){\n" +
"    /* BOB: only the current field is real and the gaps are filled from its\n" +
"       neighbours, so the whole picture jitters up and down by half a line at\n" +
"       field rate. Cheap deinterlacers did this and it is unmistakable. */\n" +
"    float py = 1.0/u_res.y;\n" +
"    vec3 a = texture(u_tex, vec2(uv.x, uv.y + (thisField ? 0.0 : (now>0.5? py : -py)))).rgb;\n" +
"    outc = a;\n" +
"  } else {\n" +
"    /* BLEND: average the fields. No comb, but everything that moves ghosts. */\n" +
"    outc = mix(cur, prev, 0.5);\n" +
"  }\n" +
"  /* twitter: a high vertical frequency lands on one field only, so it flickers\n" +
"     at half the frame rate. This is why broadcast graphics were soft. */\n" +
"  if(u_ilTwitter > 0.003){\n" +
"    float py = 1.0/u_res.y;\n" +
"    vec3 up = texture(u_tex, vec2(uv.x, uv.y+py)).rgb;\n" +
"    vec3 dn = texture(u_tex, vec2(uv.x, uv.y-py)).rgb;\n" +
"    vec3 hf = cur - (up+dn)*0.5;\n" +
"    float onThis = thisField ? 1.0 : -1.0;\n" +
"    outc += hf*onThis*u_ilTwitter*1.6;\n" +
"  }\n" +
"  /* 3:2 pulldown: film at 24 into video at 30 means some frames are shown\n" +
"     three fields and some two, and the unevenness is the judder everybody\n" +
"     recognises without being able to name */\n" +
"  if(u_ilJudder > 0.003){\n" +
"    float ph = mod(floor(u_time*24.0), 5.0);\n" +
"    float held = (ph < 2.0) ? 1.0 : 0.0;\n" +
"    outc = mix(outc, prev, held*u_ilJudder*0.85);\n" +
"  }\n" +
"  O = vec4(mix(cur, outc, u_ilAmt), 1.0);\n}\n";

/* ---------------- block transform ----------------
   The artefacts everybody recognises from a badly compressed picture are not
   properties of a file format, they are properties of a transform: an 8x8
   block DCT, coefficients quantised, transformed back. Ringing around edges,
   blocking where the quantiser is coarse, and colour smeared across a block
   because chroma is carried at lower resolution.

   Doing that as a file round-trip in a browser cannot hold a frame rate. Doing
   it as a transform can, if it is separable: eight taps along one axis,
   quantise, invert, then the same down the other. That is not identical to a
   true 2D quantisation - it quantises each axis in turn - but every artefact
   it produces is a real one, in real time, with the quantiser under your hand
   rather than buried in an encoder. */
const FS_DCT = COMMON +
"uniform sampler2D u_tex;\n" +
"uniform float u_axis,u_dctAmt,u_dctQ,u_dctTilt,u_dctChroma,u_dctBlock;\n" +
"const float PI = 3.14159265;\n" +
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  vec3 src = texture(u_tex, uv).rgb;\n" +
"  if(u_dctAmt < 0.003){ O = vec4(src,1.0); return; }\n" +
"  float N = floor(4.0 + u_dctBlock*12.0);\n" +          /* block size, 4 to 16 */
"  vec2 px = 1.0/u_res;\n" +
"  vec2 dir = (u_axis < 0.5) ? vec2(px.x, 0.0) : vec2(0.0, px.y);\n" +
"  float pos = (u_axis < 0.5) ? gl_FragCoord.x : gl_FragCoord.y;\n" +
"  float base = floor(pos/N)*N;\n" +
"  float k = pos - base;\n" +
"  vec3 out3 = vec3(0.0);\n" +
"  /* forward transform, quantise, inverse - all in one pass along this axis */\n" +
"  for(int u=0; u<16; u++){\n" +
"    if(float(u) >= N) break;\n" +
"    float fu = float(u);\n" +
"    vec3 co = vec3(0.0);\n" +
"    for(int x=0; x<16; x++){\n" +
"      if(float(x) >= N) break;\n" +
"      vec2 sp = ((u_axis < 0.5) ? vec2(base+float(x)+0.5, gl_FragCoord.y)\n" +
"                                : vec2(gl_FragCoord.x, base+float(x)+0.5))*px;\n" +
"      co += texture(u_tex, clamp(sp,0.0,1.0)).rgb * cos((2.0*float(x)+1.0)*fu*PI/(2.0*N));\n" +
"    }\n" +
"    co *= (u == 0 ? sqrt(1.0/N) : sqrt(2.0/N));\n" +
"    /* the quantiser gets coarser for higher frequencies, which is the whole\n" +
"       reason compression looks the way it does */\n" +
"    float step = (0.004 + u_dctQ*0.5) * (1.0 + fu*u_dctTilt*2.0);\n" +
"    /* chroma is quantised harder than luma, as it always is */\n" +
"    float y = dot(co, vec3(0.299,0.587,0.114));\n" +
"    vec3 chroma = co - y;\n" +
"    co = y + chroma*(1.0 - u_dctChroma*0.85);\n" +
"    co = floor(co/step + 0.5)*step;\n" +
"    out3 += co * (u == 0 ? sqrt(1.0/N) : sqrt(2.0/N)) * cos((2.0*k+1.0)*fu*PI/(2.0*N));\n" +
"  }\n" +
"  O = vec4(mix(src, out3, u_dctAmt), 1.0);\n}\n";

/* ---------------- time displacement ----------------
   Every other stage here samples the current frame at a different place. This
   one samples a different frame at the same place: each pixel chooses how far
   into the past to look, from a map. A vertical gradient gives you slit-scan.
   The picture's own brightness gives you a self-referential warp where the
   bright parts lag. A per-scanline ramp is exactly what a time-base corrector
   does when it fails, which is why that one drops straight into the sync
   model's vocabulary rather than looking like an effect. */
const FS_TDISP = COMMON +
"uniform sampler2D u_tex;\n" +
"uniform mediump sampler2DArray u_hist;\n" +
"uniform float u_layers,u_head,u_tdAmt,u_tdMap,u_tdSpread,u_tdSoft,u_tdWarp,u_time;\n" +
"void main(){\n" +
"  vec2 uv = gl_FragCoord.xy/u_res;\n" +
"  vec3 cur = texture(u_tex, uv).rgb;\n" +
"  if(u_tdAmt < 0.003){ O = vec4(cur,1.0); return; }\n" +
"  float m;\n" +
"  if(u_tdMap < 0.5)      m = 1.0 - uv.y;\n" +                    /* slit-scan */
"  else if(u_tdMap < 1.5) m = uv.x;\n" +                          /* sweep across */
"  else if(u_tdMap < 2.5) m = dot(cur, vec3(0.299,0.587,0.114));\n" +   /* the picture times itself */
"  else if(u_tdMap < 3.5) m = clamp(length(uv-0.5)*1.6, 0.0, 1.0);\n" + /* out from the centre */
"  else                   m = fract(uv.y*u_res.y/8.0);\n" +       /* per-line: a failing TBC */
"  m = mix(m, fract(m + u_time*0.05), u_tdWarp);\n" +
"  float age = clamp(m, 0.0, 1.0)*u_tdSpread*(u_layers-1.0);\n" +
"  float f = fract(age);\n" +
"  float l0 = mod(u_head - floor(age) + u_layers*2.0, u_layers);\n" +
"  float l1 = mod(l0 - 1.0 + u_layers, u_layers);\n" +
"  vec3 a = texture(u_hist, vec3(uv, l0)).rgb;\n" +
"  vec3 b = texture(u_hist, vec3(uv, l1)).rgb;\n" +
"  vec3 past = mix(a, b, f*u_tdSoft);\n" +
"  O = vec4(mix(cur, past, u_tdAmt), 1.0);\n}\n";

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
    /* nine taps, so the window has to be centred on -4.0. At -2.5 the centre
       of mass sat 1.5 taps right and the chroma slid sideways as it spread. */
"    float fi = float(i)-4.0;\n" +
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
"uniform float u_ampAmt,u_ampBands,u_ampPick,u_ampCol,u_diffAmt,u_diffScale,u_diffPolar;\n" +
"uniform float u_fgPos,u_fgNeg,u_fgZero;\n" +
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
"  /* ---- amplitude classifier ----\n" +
"     A string of comparators against evenly spaced thresholds, producing a set\n" +
"     of discrete binary channels rather than a colour map. The point is not the\n" +
"     posterisation: it is that each band is a separate signal you can isolate,\n" +
"     invert or colour independently, which is a combinatorial space rather than\n" +
"     a look. */\n" +
"  if(u_ampAmt > 0.003){\n" +
"    float n = floor(2.0 + u_ampBands*6.0);\n" +
"    float y = dot(c, vec3(0.299,0.587,0.114));\n" +
"    float bi = floor(clamp(y,0.0,0.999)*n);\n" +
"    vec3 banded;\n" +
"    if(u_ampPick > 0.003){\n" +
"      /* isolate one band as a matte */\n" +
"      float want = floor(clamp(u_ampPick,0.0,0.999)*n);\n" +
"      float on = abs(bi-want) < 0.5 ? 1.0 : 0.0;\n" +
"      banded = mix(vec3(on), c*on, 1.0-u_ampCol);\n" +
"    } else {\n" +
"      float lev = (bi+0.5)/n;\n" +
"      banded = mix(vec3(lev), hsv2(fract(bi/n + u_ampCol), 0.9, lev*1.15), u_ampCol);\n" +
"    }\n" +
"    c = mix(c, banded, u_ampAmt);\n" +
"  }\n" +
"  /* ---- differentiator bank ----\n" +
"     Not one edge detector but a bank of six with progressively longer time\n" +
"     constants, so you can pick how coarse the derivative is. Sharp finds\n" +
"     texture; slow finds shape. */\n" +
"  if(u_diffAmt > 0.003){\n" +
"    float r = pow(2.0, floor(u_diffScale*5.999))/u_res.y;\n" +
"    float cx = lum(uv+vec2(r,0.0)) - lum(uv-vec2(r,0.0));\n" +
"    float cy = lum(uv+vec2(0.0,r)) - lum(uv-vec2(0.0,r));\n" +
"    float mag = length(vec2(cx,cy));\n" +
"    vec3 dv = (u_diffPolar > 0.5)\n" +
"      ? hsv2(fract(atan(cy,cx)/6.2832 + 0.5), 0.9, clamp(mag*4.0,0.0,1.0))\n" +
"      : vec3(clamp(mag*4.0, 0.0, 1.0));\n" +
"    c = mix(c, dv, u_diffAmt);\n" +
"  }\n" +
"  /* ---- function generator ----\n" +
"     A non-linear amplifier with independently shaped response above, below and\n" +
"     around the midpoint. The dead zone is the part nobody implements and the\n" +
"     part where the interesting behaviour lives: widen it and the picture\n" +
"     separates into what is definitely bright, what is definitely dark, and a\n" +
"     flat nothing in between. */\n" +
"  if(abs(u_fgPos) > 0.003 || abs(u_fgNeg) > 0.003 || u_fgZero > 0.003){\n" +
"    vec3 d = c - 0.5;\n" +
"    vec3 dz = max(abs(d) - u_fgZero*0.5, 0.0)*sign(d);\n" +
"    vec3 pos = pow(clamp(dz*2.0, 0.0, 1.0), vec3(exp(-u_fgPos*2.0)))*0.5;\n" +
"    vec3 neg = pow(clamp(-dz*2.0, 0.0, 1.0), vec3(exp(-u_fgNeg*2.0)))*0.5;\n" +
"    c = 0.5 + pos - neg;\n" +
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
"uniform sampler2D u_probeT; uniform float u_probe,u_rows;\n" +
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
"  /* Rounded corners and the raster edge, anti-aliased.\n" +
"     This used to be a hard discard, which put a full-brightness picture texel\n" +
"     immediately against pure black. On bright material that reads as a lit rim\n" +
"     tracing the tube, and every curve stair-steps. The mask is now built in\n" +
"     screen space with fwidth, so the picture fades out across the pixel the\n" +
"     edge actually falls on, the way a real raster does. */\n" +
"  vec2 ab = abs(p) - vec2(1.0 - u_cornerRound*0.18);\n" +
"  float corner = length(max(ab,0.0)) - u_cornerRound*0.18;\n" +
"  float caa = fwidth(corner)*0.75 + 1e-6;\n" +
"  float tube = 1.0 - smoothstep(-caa, caa, corner);\n" +
"  /* the same for the edge of the picture itself: the last texel is not a\n" +
"     bright line, it is where the raster stops */\n" +
"  vec2 ed = min(cuv, 1.0-cuv);\n" +
"  vec2 ew = fwidth(cuv)*0.75 + vec2(1e-6);\n" +
"  tube *= smoothstep(0.0, ew.x, ed.x) * smoothstep(0.0, ew.y, ed.y);\n" +
"  if(tube <= 0.0){ O=vec4(0.0,0.0,0.0,1.0); return; }\n" +
"  /* rolling shutter beat against the field rate */\n" +
"  if(u_rollShutter>0.003){ cuv.y += sin((uv.y*3.0 + u_time*0.7)*3.14159)*u_rollShutter*0.004; }\n" +
"  vec3 c = texture(u_tex, clamp(cuv,0.0,1.0)).rgb;\n" +
"  /* PROBE: put an internal signal on the output instead of the picture. Every\n" +
"     one of these already exists and drives something; none of them was ever\n" +
"     visible. A tool you cannot see inside is a tool you can only use the way\n" +
"     it was designed to be used. */\n" +
"  if(u_probe > 0.5){\n" +
"    float row = clamp(cuv.y, 0.0, 0.999)*u_rows;\n" +
"    vec4 D = texelFetch(u_probeT, ivec2(int(row), 0), 0);\n" +
"    if(u_probe < 1.5){\n" +
"      /* the sync model's per-line displacement, drawn as a trace */\n" +
"      float x = 0.5 + D.x*6.0;\n" +
"      float tr = 1.0 - smoothstep(0.0, 3.0/u_res.x, abs(cuv.x - x));\n" +
"      c = vec3(0.1,0.12,0.16)*step(abs(cuv.x-0.5), 0.0015)\n" +
"        + vec3(0.15,1.0,0.85)*tr;\n" +
"    } else if(u_probe < 2.5){\n" +
"      /* per-line AGC gain and noise, as two stacked bars */\n" +
"      c = vec3(D.y*0.9, D.z*0.9, D.w*0.9);\n" +
"    }\n" +
"  }\n" +
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
"    /* the decay has already been applied in the store, per channel */\n" +
"    c = max(c, texture(u_persist, clamp(cuv,0.0,1.0)).rgb);\n" +
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
"  /* the raster stops here, so everything laid over the picture stops with it */\n" +
"  O = vec4(max(c,0.0)*tube, 1.0);\n}\n";

/* pass: GLITCH LAB — databending, pixel sort, halftone dropout, drift/FM warp */
const FS_GLITCH = COMMON +
"uniform sampler2D u_tex;\n" +
"uniform float u_time;\n" +
"uniform float u_pixelSort,u_sortThresh,u_blockShift,u_blockSize,u_dotify,u_dotSize,u_driftWarp,u_fmWarp;\n" +
/* An analysis tap, not a displacement: where it runs off the frame it has to
   read the edge. Wrapping made the pixel-sort run search find the top of the
   picture below the bottom of it and stretch a false streak from the seam. */
"float lumAt(vec2 p){ return dot(texture(u_tex, clamp(p,0.0,1.0)).rgb, vec3(0.299,0.587,0.114)); }\n" +
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
      /* this one wraps on purpose: a databent macroblock address really does
         fetch from somewhere else in the buffer */
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
"      vec3 sc = texture(u_tex, clamp(suv + vec2(0.0, d), 0.0, 1.0)).rgb;\n" +
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
"uniform float u_pngAmt,u_pngDir,u_pngRun;\n" +
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
"  /* ---- reconstruction filter avalanche ----\n" +
"     A PNG row is not stored as pixels, it is stored as a difference against a\n" +
"     predictor, and the decoder rebuilds it by accumulating. Corrupt one byte\n" +
"     and every pixel after it inherits the error, so a single bad value\n" +
"     avalanches to the edge of the picture. Which direction it runs is decided\n" +
"     by which predictor the row used: SUB accumulates along the line, UP down\n" +
"     the column, AVERAGE diagonally with a soft tail. That directional,\n" +
"     accumulating character is completely unlike a sorting or a smear. */\n" +
"  if(u_pngAmt > 0.003){\n" +
"    vec2 stepv = (u_pngDir < 0.5) ? vec2(1.0/u_res.x, 0.0)\n" +
"               : (u_pngDir < 1.5) ? vec2(0.0, 1.0/u_res.y)\n" +
"               : vec2(1.0/u_res.x, 1.0/u_res.y)*0.7071;\n" +
"    /* where the corruption started on this row or column */\n" +
"    float lane = (u_pngDir < 0.5) ? floor(suv.y*u_res.y) : floor(suv.x*u_res.x);\n" +
"    float hit = h21(vec2(lane, floor(u_time*3.0)));\n" +
"    if(hit < u_pngAmt*0.5){\n" +
"      vec3 acc = vec3(0.0);\n" +
"      float w = 0.0;\n" +
"      float span = 2.0 + u_pngRun*40.0;\n" +
"      for(int i=1;i<=32;i++){\n" +
"        float fi = float(i);\n" +
"        if(fi > span) break;\n" +
"        vec2 tp = suv - stepv*fi;\n" +
"        float inb = step(0.0,tp.x)*step(tp.x,1.0)*step(0.0,tp.y)*step(tp.y,1.0);\n" +
"        /* the error is a difference, so what accumulates is the gradient */\n" +
"        vec3 a1 = texture(u_tex, clamp(tp,0.0,1.0)).rgb;\n" +
"        vec3 a2 = texture(u_tex, clamp(tp - stepv,0.0,1.0)).rgb;\n" +
"        acc += (a1-a2)*inb;\n" +
"        w += inb;\n" +
"      }\n" +
"      float seed = h21(vec2(lane*1.7, 11.0))*2.0-1.0;\n" +
"      c = fract(c + acc*u_pngAmt*1.6 + seed*u_pngAmt*0.25);\n" +
"    }\n" +
"  }\n" +
"  /* NTSC crosstalk: two scalars for the two canonical composite artefacts */\n" +
"  if(u_ntscArt>0.003 || u_ntscFringe>0.003){\n" +
"    float px = 1.0/u_res.x;\n" +
"    vec3 yq = rgb2yiq(c);\n" +
"    vec3 l = rgb2yiq(texture(u_tex, vec2(clamp(suv.x-px*2.0,0.0,1.0), fract(suv.y))).rgb);\n" +
"    vec3 r = rgb2yiq(texture(u_tex, vec2(clamp(suv.x+px*2.0,0.0,1.0), fract(suv.y))).rgb);\n" +
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


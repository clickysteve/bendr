/* ---------------- presets ---------------- */
const PRESETS = [
["CLEAN FEED", {chromaBleed:0.06,rainbow:0,dotCrawl:0,ringing:0.05,signalNoise:0,chromaNoise:0,hWobble:0,jitter:0,humBar:0,headSwitch:0,tapeWow:0,genLoss:0,glow:0.05,scanlines:0.1,aperture:0.05,curvature:0.15,vignette:0.2}, []],
["RAINBOW RITE", {colorize:0.85,colorBands:1.8,colorSweep:0.25,saturation:1.3,glow:0.45,contrast:1.15,chromaBleed:0.3,hWobble:0.07,tapeWow:0.15,jitter:0.1,scanlines:0.3,aperture:0.2,curvature:0.3,vignette:0.35},
 [{src:"drift",dst:"colorBands",amt:0.18},{src:"lfo1",dst:"colorSweep",amt:0.2},{src:"bass",dst:"colorize",amt:0.15},{src:"chaos",dst:"chromaDelay",amt:0.1}]],
["PSYCH WASH", {lumaHue:0.65,rgbSep:0.35,sharpEcho:0.45,echoSpace:0.35,invFlick:0.28,saturation:2.1,posterize:0.3,glow:0.5,contrast:1.3,chromaBleed:0.4,hWobble:0.1,tapeWow:0.2,scanlines:0.3,curvature:0.3,vignette:0.4},
 [{src:"lfo1",dst:"hue",amt:0.35},{src:"chaos",dst:"rgbSep",amt:0.2},{src:"lfo2",dst:"invFlick",amt:0.25},{src:"drift",dst:"lumaHue",amt:0.25}]],
["ENHANCER BURN", {sharpEcho:0.85,echoSpace:0.45,rgbSep:0.22,ringing:0.6,contrast:1.55,saturation:1.6,glow:0.7,solarize:0.2,chromaBleed:0.25,signalNoise:0.08,hWobble:0.06,scanlines:0.35,aperture:0.25,curvature:0.3,vignette:0.4},
 [{src:"drift",dst:"echoSpace",amt:0.3},{src:"lfo2",dst:"sharpEcho",amt:0.2},{src:"mid",dst:"glow",amt:0.3},{src:"lfo1",dst:"hue",amt:0.15}]],
["BROADCAST DECAY", {chromaBleed:0.35,chromaDelay:0.12,rainbow:0.3,dotCrawl:0.3,ringing:0.35,signalNoise:0.12,chromaNoise:0.1,hWobble:0.1,wobbleFreq:0.15,jitter:0.2,humBar:0.25,tapeWow:0.1,headSwitch:0.2,genLoss:0.15,saturation:1.1,glow:0.2,scanlines:0.35,aperture:0.2,curvature:0.35,vignette:0.4},
 [{src:"chaos",dst:"tear",amt:0.12},{src:"drift",dst:"hWobble",amt:0.15},{src:"lfo1",dst:"chromaDelay",amt:0.1}]],
["DEAD DECK", {chromaBleed:0.6,chromaDelay:0.25,rainbow:0.15,dotCrawl:0.2,signalNoise:0.3,chromaNoise:0.25,hWobble:0.2,jitter:0.5,tracking:0.55,dropout:0.5,headSwitch:0.8,tapeWow:0.5,genLoss:0.55,humBar:0.2,saturation:0.85,contrast:1.1,glow:0.1,scanlines:0.3,vignette:0.45},
 [{src:"lfo2",dst:"tracking",amt:0.35},{src:"spike",dst:"tear",amt:0.5},{src:"chaos",dst:"chromaDelay",amt:0.2},{src:"drift",dst:"tapeWow",amt:0.3}]],
["RAINBOW CEREMONY", {chromaBleed:0.5,rainbow:0.85,dotCrawl:0.6,ringing:0.5,chromaNoise:0.2,saturation:1.7,hue:0.02,posterize:0.15,glow:0.4,fbAmount:0.35,fbHue:0.06,scanlines:0.3,aperture:0.3,curvature:0.3,vignette:0.35,hWobble:0.06,jitter:0.15},
 [{src:"lfo1",dst:"hue",amt:0.25},{src:"drift",dst:"chromaDelay",amt:0.25},{src:"lfo2",dst:"rainbow",amt:0.2}]],
["TEMPLE OF MELT", {fbAmount:0.88,fbZoom:0.22,fbRotate:0.06,fbHue:0.1,chromaBleed:0.3,rainbow:0.25,saturation:1.5,glow:0.5,posterize:0.1,signalNoise:0.06,tapeWow:0.2,scanlines:0.2,curvature:0.25,vignette:0.3},
 [{src:"bass",dst:"fbZoom",amt:0.3},{src:"lfo1",dst:"fbRotate",amt:0.12},{src:"mid",dst:"glow",amt:0.35},{src:"drift",dst:"fbHue",amt:0.15}]],
["SYNC DEATH", {tear:0.55,tearSize:0.5,hWobble:0.45,wobbleFreq:0.4,vRoll:0.12,jitter:0.6,humBar:0.5,signalNoise:0.25,chromaBleed:0.3,headSwitch:0.6,contrast:1.2,saturation:1.15,scanlines:0.4,vignette:0.45},
 [{src:"spike",dst:"vRoll",amt:0.4},{src:"chaos",dst:"tear",amt:0.4},{src:"lfo2",dst:"hWobble",amt:0.3},{src:"high",dst:"jitter",amt:0.4}]],
["NEON HAZE", {chromaBleed:0.75,chromaDelay:-0.3,rainbow:0.5,lumaHue:0.3,rgbSep:0.15,colorize:0.3,colorBands:1.2,saturation:2.0,hue:0.08,posterize:0.35,solarize:0.25,glow:0.65,fbAmount:0.55,fbHue:0.14,fbZoom:0.08,tapeWow:0.3,genLoss:0.2,scanlines:0.25,aperture:0.35,curvature:0.3,vignette:0.4},
 [{src:"drift",dst:"hue",amt:0.3},{src:"lfo1",dst:"solarize",amt:0.2},{src:"bass",dst:"saturation",amt:0.25},{src:"chaos",dst:"fbShiftX",amt:0.1}]],
["TOTAL COLLAPSE", {chromaBleed:0.7,chromaDelay:0.4,rainbow:0.7,dotCrawl:0.5,ringing:0.6,signalNoise:0.45,chromaNoise:0.4,hWobble:0.5,wobbleFreq:0.6,tear:0.6,tearSize:0.6,vRoll:0.2,jitter:0.7,humBar:0.5,tracking:0.7,dropout:0.7,headSwitch:0.9,tapeWow:0.6,genLoss:0.5,saturation:1.4,posterize:0.25,solarize:0.15,glow:0.3,fbAmount:0.5,fbHue:0.1,scanlines:0.4,vignette:0.5},
 [{src:"chaos",dst:"vRoll",amt:0.3},{src:"spike",dst:"dropout",amt:0.6},{src:"lfo2",dst:"tracking",amt:0.4},{src:"bass",dst:"tear",amt:0.4},{src:"drift",dst:"hue",amt:0.4}]],
["DATAMOSH", {mosh:0.86,moshBlock:0.35,melt:0.12,blockShift:0.4,blockSize:0.3,chromaBleed:0.35,signalNoise:0.05,saturation:1.2,contrast:1.1,glow:0.15,scanlines:0.12,aperture:0.08,curvature:0.2,vignette:0.3},
 [{src:"cut",dst:"moshBlock",amt:0.55},{src:"motion",dst:"mosh",amt:-0.25},{src:"spike",dst:"blockShift",amt:0.4},{src:"chaos",dst:"timeGrad",amt:0.2}]],
["PIXEL SORT", {pixelSort:0.9,sortThresh:0.42,driftWarp:0.12,contrast:1.3,saturation:1.35,chromaBleed:0.2,ringing:0.2,glow:0.25,scanlines:0.15,curvature:0.2,vignette:0.3},
 [{src:"lfo3",dst:"sortThresh",amt:0.22},{src:"bright",dst:"sortThresh",amt:-0.15},{src:"lfo1",dst:"pixelSort",amt:0.12}]],
["DOT MATRIX", {dotify:0.92,dotSize:0.45,contrast:1.5,saturation:1.5,glow:0.3,brightness:0.05,chromaBleed:0.15,scanlines:0.1,aperture:0.1,curvature:0.25,vignette:0.35},
 [{src:"lfo1",dst:"dotSize",amt:0.2},{src:"bass",dst:"dotSize",amt:0.25},{src:"drift",dst:"hue",amt:0.2}]],
["LIQUID MELT", {melt:0.62,swirl:0.5,mosh:0.35,timeGrad:0.25,driftWarp:0.3,saturation:1.6,glow:0.4,chromaBleed:0.4,lumaBleed:0.25,posterize:0.1,scanlines:0.15,curvature:0.25,vignette:0.35},
 [{src:"lfo3",dst:"swirl",amt:0.3},{src:"drift",dst:"melt",amt:0.25},{src:"lfo1",dst:"hue",amt:0.2},{src:"mid",dst:"driftWarp",amt:0.25}]],
["DATABENT", {blockShift:0.75,blockSize:0.45,fmWarp:0.45,driftWarp:0.35,pixelSort:0.3,sortThresh:0.55,chromaNoise:0.25,signalNoise:0.12,saturation:1.4,contrast:1.25,glow:0.2,scanlines:0.18,vignette:0.35},
 [{src:"spike",dst:"blockShift",amt:0.5},{src:"chaos",dst:"fmWarp",amt:0.3},{src:"cut",dst:"blockSize",amt:0.4},{src:"lfo2",dst:"driftWarp",amt:0.25}]],
["VOL I \u2014 ENHANCER LINES", {contour:0.95,contourBands:9,contourWidth:1.3,contourHue:0.04,contourFill:0.18,lumaSteps:0.55,stepCount:5,contrast:1.25,saturation:0.55,ringing:0.12,sharpEcho:0.15,echoSpace:0.25,chromaBleed:0.15,signalNoise:0,chromaNoise:0,hWobble:0.04,jitter:0.05,tapeWow:0.1,genLoss:0,glow:0.08,scanlines:0.2,aperture:0.1,curvature:0.28,vignette:0.45,bloom:0.12,bloomRad:0.25,halation:0.3,grain:0.18},
 [{src:"drift",dst:"contourBands",amt:0.12,ch:"A"},{src:"lfo1",dst:"contourHue",amt:0.15,ch:"A"},{src:"chaos",dst:"chromaDelay",amt:0.08,ch:"A"}]],
["VOL II \u2014 COLOURISER", {contour:0.45,contourBands:9,contourWidth:1.6,contourHue:0.5,contourFill:0.7,lumaSteps:0.75,stepCount:5,colorize:0.6,colorBands:1.6,colorSweep:0.18,saturation:1.7,lumaHue:0.25,glow:0.45,contrast:1.25,chromaBleed:0.35,rainbow:0.25,tapeWow:0.15,scanlines:0.28,aperture:0.2,curvature:0.3,vignette:0.4,bloom:0.35,halation:0.3,grain:0.2},
 [{src:"lfo1",dst:"colorSweep",amt:0.2,ch:"A"},{src:"drift",dst:"contourHue",amt:0.3,ch:"A"},{src:"bass",dst:"colorize",amt:0.15,ch:"A"}]],
["VOL III \u2014 FULL BEND", {contour:0.6,contourBands:12,contourWidth:1.0,contourHue:0.35,contourFill:0.35,lumaSteps:0.6,stepCount:7,dither:0.4,colorize:0.5,colorBands:2.4,rainbow:0.55,lumaHue:0.4,rgbSep:0.2,sharpEcho:0.5,echoSpace:0.3,saturation:1.8,contrast:1.35,glow:0.5,chromaBleed:0.45,chromaNoise:0.15,hWobble:0.12,jitter:0.25,tracking:0.2,scanlines:0.3,curvature:0.3,vignette:0.42,bloom:0.45,bloomRad:0.45,halation:0.4,grain:0.3},
 [{src:"lfo2",dst:"contourBands",amt:0.25,ch:"A"},{src:"chaos",dst:"rgbSep",amt:0.2,ch:"A"},{src:"drift",dst:"hue",amt:0.3,ch:"A"},{src:"spike",dst:"tear",amt:0.3,ch:"A"}]],
["TRIANGLES", {kaleido:1,kaleidoN:3,kaleidoRot:0,lumaSteps:0.95,stepCount:4,dither:0.15,colorize:0.55,colorBands:1.1,saturation:1.5,contrast:1.3,contour:0.3,contourBands:6,contourWidth:1.4,contourFill:0.85,glow:0.3,chromaBleed:0.2,scanlines:0.2,curvature:0.25,vignette:0.4,bloom:0.25,grain:0.18},
 [{src:"lfo3",dst:"kaleidoRot",amt:0.35,ch:"A"},{src:"drift",dst:"kaleidoX",amt:0.2,ch:"A"},{src:"lfo1",dst:"colorSweep",amt:0.15,ch:"A"}]],
["80S TRIANGLE", {kaleido:1,kaleidoN:3,kaleidoRot:0.15,srcZoom:0.15,lumaSteps:0.9,stepCount:5,colorize:0.75,colorBands:2.2,colorSweep:0.3,saturation:2.0,contrast:1.4,glow:0.6,rainbow:0.3,rgbSep:0.12,scanlines:0.35,aperture:0.3,curvature:0.3,vignette:0.45,bloom:0.55,bloomRad:0.5,halation:0.2,grain:0.15},
 [{src:"lfo1",dst:"colorSweep",amt:0.3,ch:"A"},{src:"lfo3",dst:"kaleidoRot",amt:0.25,ch:"A"},{src:"bass",dst:"glow",amt:0.3,ch:"A"}]],
["BLADE RUNNER TRIANGLE", {kaleido:1,kaleidoN:3,kaleidoRot:-0.1,lumaSteps:0.8,stepCount:6,contour:0.4,contourBands:10,contourWidth:1.2,contourHue:0.08,contourFill:0.3,saturation:1.15,hue:0.58,contrast:1.45,brightness:-0.12,glow:0.5,bloom:0.6,bloomRad:0.6,halation:0.75,defocus:0.25,grain:0.35,chromaBleed:0.4,genLoss:0.15,scanlines:0.25,curvature:0.3,vignette:0.55},
 [{src:"drift",dst:"kaleidoRot",amt:0.15,ch:"A"},{src:"lfo3",dst:"bloom",amt:0.2,ch:"A"},{src:"chaos",dst:"chromaDelay",amt:0.12,ch:"A"}]],
["CRT REPHOTO", {bloom:0.5,bloomRad:0.35,halation:0.5,defocus:0.3,grain:0.45,scanlines:0.4,aperture:0.35,curvature:0.4,vignette:0.55,chromaBleed:0.3,ringing:0.25,genLoss:0.2,signalNoise:0.06,hWobble:0.04,tapeWow:0.12,contrast:1.15,saturation:1.1,glow:0.15},
 [{src:"drift",dst:"defocus",amt:0.12,ch:"A"},{src:"lfo3",dst:"bloom",amt:0.15,ch:"A"}]],
["SYNTH · RAMP CROSS", {genFreqX:0.26,genFreqY:0.19,genFM:0.4,genRate:0.1,genHue:0.55,genSpread:1.2,genSat:0.95,genBright:1,scanlines:0.16,curvature:0.26,vignette:0.36,bloom:0.2},
 [{src:"lfo1",dst:"genFM",amt:0.3,ch:"A"},{src:"lfo3",dst:"genPhase",amt:0.4,ch:"A"},{src:"drift",dst:"genFreqY",amt:0.12,ch:"A"}], {src:"synth", gm:{shape:0,wave:0,col:1}}],
["SYNTH · SPIRAL DRIVE", {genFreqX:0.3,genFoldN:6,genRate:0.12,genSpread:1.5,genHue:0.1,genSat:1,genFold:0.25,scanlines:0.2,curvature:0.3,vignette:0.42,bloom:0.35,halation:0.25},
 [{src:"lfo3",dst:"genRot",amt:0.5,ch:"A"},{src:"bass",dst:"genFold",amt:0.3,ch:"A"}], {src:"synth", gm:{shape:2,wave:1,col:2}}],
["SYNTH · HARD SHAPES", {genFreqX:0.22,genFoldN:8,genComp:1,genThresh:0.5,genSoft:0.02,genSpread:0.7,genHue:0.85,genSat:1,genRate:0.06,scanlines:0.18,curvature:0.28,vignette:0.4},
 [{src:"lfo2",dst:"genThresh",amt:0.35,ch:"A"},{src:"spike",dst:"genFoldN",amt:0.4,ch:"A"}], {src:"synth", gm:{shape:6,wave:3,col:3}}],
["SYNTH · PLASMA BANDS", {genFreqX:0.2,genFreqY:0.16,genFM:0.55,genBands:9,genSpread:1.6,genHue:0.3,genSat:0.95,genRate:0.14,scanlines:0.2,curvature:0.3,vignette:0.4,bloom:0.3},
 [{src:"drift",dst:"genHue",amt:0.4,ch:"A"},{src:"lfo1",dst:"genFM",amt:0.25,ch:"A"},{src:"mid",dst:"genBands",amt:0.3,ch:"A"}], {src:"synth", gm:{shape:3,wave:0,col:4}}],
["SYNTH · FOLDED RADIAL", {genFreqX:0.3,genFold:0.6,genWarp:0.45,genSpread:1.3,genHue:0.62,genSat:0.9,genRate:0.09,scanlines:0.18,curvature:0.3,vignette:0.45,bloom:0.4,halation:0.3},
 [{src:"lfo3",dst:"genWarp",amt:0.3,ch:"A"},{src:"chaos",dst:"genFold",amt:0.2,ch:"A"},{src:"lfo1",dst:"genCX",amt:0.25,ch:"A"}], {src:"synth", gm:{shape:1,wave:0,col:1}}],
["SYNTH · TUNNEL RUN", {genFreqX:0.34,genFoldN:8,genRate:0.35,genComp:0.6,genThresh:0.45,genSoft:0.08,genSpread:1.1,genHue:0.48,genSat:1,scanlines:0.22,curvature:0.32,vignette:0.5,bloom:0.35},
 [{src:"lfo3",dst:"genRot",amt:0.4,ch:"A"},{src:"bass",dst:"genFreqX",amt:0.2,ch:"A"}], {src:"synth", gm:{shape:8,wave:1,col:2}}],
["MOSH · P-FRAME DRAG", {mosh:0.93,moshVec:0.85,flowGain:1.4,moshGate:0.45,flowSharp:0.2,chromaBleed:0.3,saturation:1.25,contrast:1.15,glow:0.2,scanlines:0.14,curvature:0.22,vignette:0.35},
 [{src:"motion",dst:"moshVec",amt:0.4,ch:"A"},{src:"cut",dst:"mosh",amt:-0.3,ch:"A"},{src:"lfo3",dst:"flowCurl",amt:0.2,ch:"A"}], {ff:0,fe:0}],
["MOSH · CONTOUR CRAWL", {mosh:0.9,moshVec:0.7,flowCurl:0.35,flowGain:1.6,flowSharp:0.3,contour:0.3,contourBands:9,saturation:1.4,contrast:1.2,glow:0.25,scanlines:0.15,curvature:0.24,vignette:0.36},
 [{src:"drift",dst:"flowCurl",amt:0.3,ch:"A"},{src:"lfo1",dst:"moshVec",amt:0.2,ch:"A"}], {ff:1,fe:0}],
["MOSH · VECTOR TRASH", {moshBlock:0.8,moshBlockSize:0.85,moshRate:0.42,mosh:0.6,blockShift:0.25,blockSize:0.5,saturation:1.3,contrast:1.2,chromaNoise:0.15,scanlines:0.15,vignette:0.35},
 [{src:"spike",dst:"moshBlock",amt:0.5,ch:"A"},{src:"cut",dst:"moshRate",amt:0.45,ch:"A"},{src:"chaos",dst:"moshBlockSize",amt:0.3,ch:"A"}], {ff:0,fe:1}],
["MOSH · SLOW ORBIT", {mosh:0.95,moshVec:0.55,flowCurl:0.22,flowHue:0.35,flowFade:0.12,flowGain:1.2,saturation:1.5,glow:0.35,chromaBleed:0.35,scanlines:0.18,curvature:0.28,vignette:0.42,bloom:0.3},
 [{src:"lfo3",dst:"flowCurl",amt:0.25,ch:"A"},{src:"drift",dst:"flowHue",amt:0.3,ch:"A"}], {ff:4,fe:2}],
["MOSH · GRAVITY DRIP", {melt:0.85,meltDir:0.14,meltGate:0.5,flowGain:1.5,flowSharp:0.25,mosh:0.35,lumaBleed:0.3,saturation:1.5,glow:0.4,chromaBleed:0.4,scanlines:0.15,curvature:0.25,vignette:0.38},
 [{src:"lfo3",dst:"meltDir",amt:0.3,ch:"A"},{src:"bright",dst:"meltGate",amt:-0.25,ch:"A"},{src:"mid",dst:"melt",amt:0.2,ch:"A"}], {ff:0,fe:0}],
["MOSH · EDGE PEEL", {flowRepel:0.7,mosh:0.88,moshVec:0.3,flowSharp:0.4,flowGain:1.3,contour:0.25,contourBands:12,contourFill:0.5,saturation:1.35,contrast:1.3,scanlines:0.16,vignette:0.4},
 [{src:"chaos",dst:"flowRepel",amt:0.35,ch:"A"},{src:"lfo2",dst:"flowStretch",amt:0.2,ch:"A"}], {ff:1,fe:2}],
["DECK · CHEWED TAPE", {tracking:0.55,trackHunt:0.6,trackPhase:-0.2,crease:0.6,creasePos:0.44,dropout:0.5,dropoutLen:0.7,chromaLoss:0.4,hiss:0.3,genLoss:0.35,genCount:4,headSwitch:0.45,tapeWow:0.35,chromaBleed:0.45,signalNoise:0.12,saturation:1.15,scanlines:0.22,curvature:0.3,vignette:0.45},
 [{src:"chaos",dst:"trackPhase",amt:0.3,ch:"A"},{src:"spike",dst:"dropout",amt:0.5,ch:"A"},{src:"lfo2",dst:"crease",amt:0.25,ch:"A"}]],
["DECK · SIXTH GENERATION", {tapeSpeed:0.85,genLoss:0.55,genCount:9,chromaLoss:0.5,hiss:0.35,headSwitch:0.5,tapeWow:0.3,wowRate:0.35,chromaBleed:0.6,dotCrawl:0.3,ringing:0.2,saturation:0.9,contrast:1.1,scanlines:0.26,curvature:0.32,vignette:0.5,defocus:0.15,grain:0.25},
 [{src:"drift",dst:"tapeSpeed",amt:0.2,ch:"A"},{src:"lfo3",dst:"genLoss",amt:0.15,ch:"A"}]],
["DECK · HEAD CLOG", {headClog:0.75,azimuth:0.5,tracking:0.3,chromaLoss:0.6,hiss:0.3,dropout:0.35,headSwitch:0.4,chromaBleed:0.4,saturation:1.1,scanlines:0.2,curvature:0.3,vignette:0.45},
 [{src:"lfo3",dst:"headClog",amt:0.3,ch:"A"},{src:"chaos",dst:"azimuth",amt:0.25,ch:"A"}]],
["DECK · PAUSE / STILL", {stillNoise:0.8,headSwitch:0.6,tapeStretch:0.3,flutter:0.4,tracking:0.25,hiss:0.25,chromaBleed:0.35,signalNoise:0.1,saturation:1.05,scanlines:0.24,curvature:0.3,vignette:0.45},
 [{src:"lfo1",dst:"stillNoise",amt:0.2,ch:"A"},{src:"drift",dst:"tapeStretch",amt:0.2,ch:"A"}]],
["DECK · SHUTTLE SEARCH", {shuttleNz:0.7,tracking:0.4,headSwitch:0.8,hiss:0.4,chromaLoss:0.35,dropout:0.3,tapeSpeed:0.4,chromaBleed:0.4,saturation:1.1,scanlines:0.22,curvature:0.3,vignette:0.45},
 [{src:"lfo2",dst:"shuttleNz",amt:0.3,ch:"A"},{src:"spike",dst:"tracking",amt:0.35,ch:"A"}]],
["DECK · DYING SPOOL", {tapeStretch:0.7,flutter:0.7,wowRate:0.6,tapeWow:0.6,edgeDmg:0.6,crease:0.4,creasePos:0.7,printThru:0.5,hiss:0.45,chromaLoss:0.45,genLoss:0.4,genCount:5,dropout:0.45,dropoutLen:0.8,chromaBleed:0.5,saturation:1.0,scanlines:0.25,curvature:0.34,vignette:0.55,grain:0.3},
 [{src:"chaos",dst:"flutter",amt:0.35,ch:"A"},{src:"drift",dst:"tapeStretch",amt:0.3,ch:"A"},{src:"spike",dst:"edgeDmg",amt:0.3,ch:"A"}]],
["JPEGS", {blockShift:0.55,blockSize:0.4,dither:0.8,lumaSteps:0.7,stepCount:6,pixelSort:0.25,sortThresh:0.55,contour:0.25,contourBands:8,contourFill:0.8,saturation:1.35,contrast:1.2,chromaNoise:0.2,glow:0.2,scanlines:0.15,curvature:0.2,vignette:0.35,grain:0.2},
 [{src:"spike",dst:"blockShift",amt:0.4,ch:"A"},{src:"cut",dst:"blockSize",amt:0.35,ch:"A"},{src:"lfo2",dst:"dither",amt:0.2,ch:"A"}]],
];

/* ---- feedback recipes: named look -> parameters ---- */
const FBK = [
["FB · DROSTE TUNNEL",     {fbAmount:0.9,fbZoom:0.2,fbRotate:0,fbBlur:0.06,fbNoise:0.05}, {wrap:0,nl:1}],
["FB · RAINBOW TUNNEL",    {fbAmount:0.92,fbZoom:0.2,fbHue:0.05,fbSat:1.02,fbBlur:0.06,fbNoise:0.05}, {wrap:0,nl:1}],
["FB · SLOW VORTEX",       {fbAmount:0.94,fbZoom:0.05,fbRotate:0.07,fbHue:0.02,fbBlur:0.09,fbNoise:0.05}, {wrap:0,nl:1}],
["FB · OPEN SPIRAL ARMS",  {fbAmount:0.95,fbZoom:0.004,fbRotate:0.21,fbHue:0.03,fbBlur:0.11,fbNoise:0.04}, {wrap:0,nl:1}],
["FB · 9-FOLD MANDALA",    {fbAmount:0.94,fbZoom:0.017,fbRotate:0.7,fbBlur:0.07,fbSharp:0.3,fbNoise:0.04}, {wrap:2,nl:1}],
["FB · 6-FOLD ROSETTE",    {fbAmount:0.93,fbZoom:0.033,fbRotate:1.05,fbHue:0.025,fbBlur:0.07,fbSharp:0.3,fbNoise:0.05}, {wrap:2,nl:1}],
["FB · KALEIDOSCOPE",      {fbAmount:0.88,fbZoom:0.1,fbRotate:0.12,fbHue:0.03,fbBlur:0.05,fbSharp:0.5,fbNoise:0.05}, {wrap:2,mir:3,nl:1}],
["FB · ROLLING BOIL",      {fbAmount:0.96,fbZoom:0,fbRotate:0.035,fbShiftX:0.013,fbShiftY:0.007,fbBlur:0.17,fbSharp:0.8,fbDrive:2.0,fbNoise:0.8,fbAuto:0.7}, {wrap:0,nl:1}],
["FB · TURING LABYRINTH",  {fbAmount:0.97,fbBlur:0.13,fbBlur2:0.4,fbSharp:1.1,fbThresh:0.5,fbThreshSoft:0.05,fbNoise:0.5,fbAuto:0.6}, {wrap:0,nl:0}],
["FB · CELLULAR",          {fbAmount:0.96,fbZoom:-0.007,fbBlur:0.22,fbSharp:1.2,fbThresh:0.48,fbThreshSoft:0.02,fbNoise:0.45,fbAuto:0.8}, {wrap:1,nl:0}],
["FB · COMET TRAILS",      {fbAmount:0.9,fbShiftX:0.066,fbNoise:0.03}, {wrap:0,nl:0,blend:3}],
["FB · LONG TRAILS",       {fbAmount:0.955,contrast:1.5,fbNoise:0.03,fbBlur:0.03}, {wrap:0,nl:0}],
["FB · HOWL-AROUND",       {fbAmount:0.99,fbZoom:-0.033,fbRotate:-0.05,fbShiftX:0.017,fbShiftY:-0.033,fbSharp:1.0,fbDrive:3.0,fbNoise:0.6,fbBlur:0.04}, {wrap:0,nl:0}],
["FB · PINWHEEL",          {fbAmount:0.94,fbZoom:0.017,fbRotate:0.1,fbBlur:0.11,fbNoise:0.05}, {wrap:0,nl:1,inv:1}],
["FB · NOISE BURSTS",      {fbAmount:0.97,fbZoom:-0.066,fbRotate:0.14,fbHue:0.06,fbBlur:0.07,fbSharp:0.4,fbNoise:1.0,fbDrive:1.4}, {wrap:0,nl:0}],
["FB · FIRE COLUMN",       {fbAmount:0.95,fbZoom:-0.04,fbShiftY:-0.04,fbHue:-0.03,fbBlur:0.11,fbDrive:1.5,fbGainR:1.15,fbGainB:0.8,fbNoise:0.25}, {wrap:0,nl:1}],
["FB · WATERFALL",         {fbAmount:0.93,fbZoom:0.066,fbShiftY:0.05,fbHue:0.02,fbBlur:0.09,fbNoise:0.08}, {wrap:0,nl:1}],
["FB · SOLARISED CELLS",   {fbAmount:0.96,fbRotate:0.017,fbShiftX:0.01,fbBlur:0.13,fbSharp:0.6,fbDrive:2.5,fbPost:0.55,fbNoise:0.3}, {wrap:0,nl:3}],
["FB · WRAPPED PSYCH",     {fbAmount:0.95,fbZoom:0.033,fbRotate:0.09,fbHue:0.1,fbGainR:1.05,fbGainB:0.95,fbBlur:0.06,fbDrive:1.2,fbNoise:0.2}, {wrap:0,nl:2}],
["FB · CHROMATIC GHOST",   {fbAmount:0.92,fbZoom:0.033,fbChromOff:0.4,fbBlur:0.05,fbNoise:0.05}, {wrap:0,nl:1}],
["FB · BREATHING RINGS",   {fbAmount:0.93,fbZoom:0.033,fbRotate:0.05,fbHue:0.03,fbBlur:0.08,echo:0.5,delayF:6,fbNoise:0.06}, {wrap:0,nl:1}],
["FB · ECHO STAIRCASE",    {fbAmount:0.86,fbZoom:0.13,fbRotate:0.17,fbShiftX:0.033,fbHue:0.13,echo:0.6,delayF:12}, {wrap:0,nl:0}],
["FB · ROLLING UNTIMED",   {fbAmount:0.93,fbRoll:0.09,fbNoise:0.05,fbBlur:0.02}, {wrap:0,nl:0}],
["FB · TILING LATTICE",    {fbAmount:0.94,fbZoom:0.017,fbRotate:0.05,fbShiftX:0.02,fbShiftY:0.013,fbHue:0.02,fbBlur:0.07,fbSharp:0.4,fbNoise:0.06}, {wrap:1,nl:1}],
["FB · CRYSTALLINE",       {fbAmount:0.94,fbZoom:0.033,fbRotate:0.26,fbBlur:0.01,fbSharp:1.5,fbNoise:0.05}, {wrap:2,nl:0}],
["FB · NEBULA",            {fbAmount:0.95,fbZoom:0.05,fbRotate:0.09,fbShiftX:0.013,fbHue:0.02,fbBlur:0.4,fbNoise:0.07,contrast:0.9}, {wrap:0,nl:1}],
["FB · EDGE WIREFRAME",    {fbAmount:0.9,fbZoom:0.033,fbRotate:0.035,fbBlur:0.05,fbSharp:1.8,fbThresh:0.35,saturation:0.3,colorize:0.5,fbNoise:0.06}, {wrap:0,nl:0}],
["FB · STROBED",           {fbAmount:0.93,fbZoom:0.066,fbRotate:0.1,fbHue:0.05,fbJitter:0.6,fbBlur:0.05,fbNoise:0.08}, {wrap:0,nl:1}],
["FB · ASYMMETRIC PLUME",  {fbAmount:0.97,fbRotate:0.017,fbShiftX:0.017,fbShearX:0.25,fbHue:0.02,fbBlur:0.11,fbSharp:0.5,fbNoise:0.15,fbAuto:0.5}, {wrap:0,nl:1}],
["FB · QUAD MIRROR BLOOM", {fbAmount:0.95,fbZoom:0.05,fbRotate:0.04,fbHue:0.04,fbBlur:0.09,fbNoise:0.08,bloom:0.4,halation:0.3}, {wrap:2,mir:3,nl:1}],
];
for(const [name, base, tog] of FBK){
  /* loop gain: the single most sensitive control — just under unity so the loop
     loses a little energy each pass instead of running away to white */
  if(base.fbVal === undefined) base.fbVal = 0.955;
  PRESETS.push([name, Object.assign({fbAmount:0.9, scanlines:0.2, curvature:0.28, vignette:0.4}, base),
    [{src:"drift",dst:"fbRotate",amt:0.08,ch:"A"},{src:"lfo3",dst:"fbHue",amt:0.1,ch:"A"}],
    tog]);
}

function applyState(bases, rts, extra, chOnly){
  if(typeof cancelGlide === "function") cancelGlide();
  /* a preset's flat value map loads into the target channel (default: active) plus master */
  const targets = chOnly ? [chOnly] : (linkChans ? CHANNELS : [activeChan]);
  for(const p of CLIST){
    const v = (bases[p.id] !== undefined) ? bases[p.id] : p.def;
    for(const ch of targets) chanBase[ch][p.id] = v;
  }
  for(const p of MLIST) if(!extra || !extra.keepMaster) mBase[p.id] = (bases[p.id] !== undefined) ? bases[p.id] : p.def;
  routes = (rts||[]).map(r=>({ch:activeChan, ...r}));
  if(extra){
    for(const k of LFOKEYS){ if(extra[k]) Object.assign(lfoState[k], extra[k]); }
    if(extra.audioCfg){
      for(const k of ["bass","mid","high"]) if(extra.audioCfg[k]) Object.assign(audioCfg[k], extra.audioCfg[k]);
      if(extra.audioCfg.response !== undefined) audioCfg.response = extra.audioCfg.response;
    }
    if(extra.fbTrailMode !== undefined) fbTrailMode = extra.fbTrailMode;
  }
  refreshUI(); renderRoutes(); refreshLfoUI(); refreshAudioUI();
}
function loadPreset(i){
  const pr = PRESETS[i]; if(!pr) return;
  pushHistory();
  cancelGlide();
  applyState(pr[1], pr[2]);
  const tg = pr[3];
  flowField = (tg && tg.ff) || 0;
  flowEdge  = (tg && tg.fe) || 0;
  if(tg){
    fbWrap = tg.wrap||0; fbMirror = tg.mir||0; fbBlend = tg.blend||0;
    fbNL = tg.nl||0; fbInvert = !!tg.inv;
    if(tg.model!==undefined) outModel = tg.model;
    if(tg.gm){
      const tgt = linkChans ? CHANNELS : [activeChan];
      for(const ch of tgt) genMode[ch] = {...tg.gm};
    }
    if(tg.src){
      const tgt = linkChans ? CHANNELS : [activeChan];
      for(const ch of tgt){ SRC[ch].mode = tg.src; SRC[ch].name = tg.src; }
      syncChanInputUI();
    }
  }
  refreshToggles();
  selPreset.value = String(i);
  toast("Preset: "+pr[0]+" \u2192 channel "+(linkChans?"A+B":activeChan));
}
const selPreset = document.getElementById("selPreset");
/* ---- presets you save yourself, kept on this machine ---- */
let userPresets = [];
function loadUserPresets(){
  try{ userPresets = JSON.parse(localStorage.getItem("bendr.presets") || "[]") || []; }
  catch(e){ userPresets = []; }
}
function saveUserPresets(){
  try{ localStorage.setItem("bendr.presets", JSON.stringify(userPresets)); }
  catch(e){ toast("Could not save — this browser's storage is full or blocked", true); }
}
function rebuildPresetList(){
  const keep = selPreset.value;
  selPreset.innerHTML = "";
  const g1 = document.createElement("optgroup"); g1.label = "BUILT IN";
  PRESETS.forEach((p,i)=>{
    const o = document.createElement("option"); o.value = String(i);
    o.textContent = (i+1)+" \u00b7 "+p[0];
    g1.appendChild(o);
  });
  selPreset.appendChild(g1);
  if(userPresets.length){
    const g2 = document.createElement("optgroup"); g2.label = "SAVED";
    userPresets.forEach((p,i)=>{
      const o = document.createElement("option"); o.value = "u"+i;
      o.textContent = "\u2605 "+p.name;
      g2.appendChild(o);
    });
    selPreset.appendChild(g2);
  }
  if(keep) selPreset.value = keep;
}
selPreset.onchange = ()=>{
  const v = selPreset.value;
  if(v.charAt(0) === "u"){
    const up = userPresets[+v.slice(1)];
    if(up){ pushHistory(); restoreState(JSON.parse(JSON.stringify(up.state))); selPreset.value = v; toast("Preset: "+up.name); }
  } else loadPreset(+v);
};
document.getElementById("btnPresetSave").onclick = ()=>{
  const suggested = "PATCH "+(userPresets.length+1);
  const name = (prompt("Name this preset", suggested) || "").trim();
  if(!name) return;
  const existing = userPresets.findIndex(p=>p.name.toLowerCase() === name.toLowerCase());
  const entry = {name, state: captureState()};
  if(existing >= 0) userPresets[existing] = entry; else userPresets.push(entry);
  saveUserPresets(); rebuildPresetList();
  selPreset.value = "u"+(existing >= 0 ? existing : userPresets.length-1);
  toast("Saved preset \u201c"+name+"\u201d \u2014 it is in the list under SAVED");
};
document.getElementById("btnPresetDel").onclick = ()=>{
  const v = selPreset.value;
  if(v.charAt(0) !== "u"){ toast("Pick one of your own saved presets to delete", true); return; }
  const i = +v.slice(1), up = userPresets[i];
  if(!up) return;
  userPresets.splice(i,1); saveUserPresets(); rebuildPresetList();
  selPreset.value = "0";
  toast("Deleted \u201c"+up.name+"\u201d");
};
loadUserPresets();
rebuildPresetList();

function randomizeAll(){
  pushHistory();
  const bases = {};
  for(const p of PLIST){
    let v;
    const r = Math.random();
    if(p.sec==="crt"){ v = getBase(p.id); }
    else if(p.id==="kaleido"){ v = Math.random()<0.78 ? 0 : 0.5+Math.random()*0.5; }
    else if(p.id==="kaleidoN"){ v = 2+Math.floor(Math.random()*7); }
    else if(p.sec==="frame"){ v = Math.random()<0.7 ? p.def : p.def + (Math.random()*2-1)*0.3*(p.max-p.min); }
    else if(p.id==="contour"){ v = Math.random()<0.6 ? 0 : Math.random()*0.9; }
    else if(p.sec==="contour"){ v = Math.random()<0.5 ? p.def : p.min + Math.random()*(p.max-p.min); }
    else if(p.sec==="mixer" || p.sec==="morph" || p.sec==="overlay"){ v = getBase(p.id); }
    else if(p.sec==="lab"){ v = Math.random()<0.6 ? p.def : p.min + Math.pow(Math.random(),1.8)*(p.max-p.min); }
    else if(p.id==="mosh"){ v = Math.random()<0.6 ? 0 : Math.random()*0.85; }
    else if(p.sec==="glitch"||p.sec==="flow"){ v = Math.random()<0.45 ? p.def : p.min + Math.pow(Math.random(),1.5)*(p.max-p.min); }
    else if(p.id==="fbAmount"){ v = Math.random()<0.5 ? Math.random()*0.5 : 0.5+Math.random()*0.45; }
    else if(p.id==="vRoll"){ v = Math.random()<0.75 ? 0 : (Math.random()*2-1)*0.3; }
    else if(p.id==="saturation"){ v = 0.6+Math.random()*1.6; }
    else if(p.id==="contrast"){ v = 0.8+Math.random()*0.7; }
    else if(p.id==="brightness"){ v = (Math.random()*2-1)*0.25; }
    else {
      const bias = Math.pow(Math.random(), 1.6);
      v = p.min + bias*(p.max-p.min);
      if(p.min<0 && Math.random()<0.5) v = -v*0.8;
      v = Math.min(p.max, Math.max(p.min, v));
    }
    bases[p.id]=v;
  }
  const nR = 2+Math.floor(Math.random()*4);
  const rts = [];
  for(let i=0;i<nR;i++){
    rts.push({
      src: MODSRC[Math.floor(Math.random()*7)].id,   // LFOs + chaos/drift/spike
      dst: PLIST[Math.floor(Math.random()*PLIST.length)].id,
      amt: (Math.random()*2-1)*0.55,
    });
  }
  if(Math.random()<0.35){
    const arr = chainOrder.slice();
    for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    chainOrder = arr;
  }
  if(Math.random()<0.5) flowField = Math.floor(Math.random()*7);
  if(Math.random()<0.3) flowEdge = Math.floor(Math.random()*3);
  for(const k of LFOKEYS){
    lfoState[k].rate = Math.pow(10, -1.5+Math.random()*2.2);
    if(Math.random()<0.4) lfoState[k].shape = ["sine","tri","saw","sqr","snh"][Math.floor(Math.random()*5)];
  }
  applyState(bases, rts);
  renderChain();
}
function mutate(){
  pushHistory();
  const targets = linkChans ? CHANNELS : [activeChan];
  for(const p of CLIST) for(const ch of targets){
    chanBase[ch][p.id] = Math.min(p.max, Math.max(p.min,
      chanBase[ch][p.id] + (Math.random()*2-1)*0.09*(p.max-p.min)));
  }
  for(const r of routes){ r.amt = Math.min(1, Math.max(-1, r.amt + (Math.random()*2-1)*0.15)); }
  refreshUI(); renderRoutes();
}
/* ---- undo history ---- */
const histStack = [];
function captureState(){
  const snap = snapshotAll();
  const st = {chan:snap.chan, master:snap.master, routes: routes.map(r=>({...r})),
    audioCfg: JSON.parse(JSON.stringify(audioCfg)),
    fbTrailMode, rescanMode, keyChroma, mixMode, edgeMode, wipeInv, activeChan, linkChans,
    mixMode2, wipeInv2, mixModeM, wipeInvM,
    fbWrap, fbMirror, fbBlend, fbNL, fbInvert, fbTap, outModel, fieldSrc, flowField, flowEdge,
    chainOrder: chainOrder.slice(), stageEnabled: {...stageEnabled},
    busSrc: {b1:busSrc.b1.slice(), b2:busSrc.b2.slice()},
    genMode: JSON.parse(JSON.stringify(genMode)),
    srcMode: (()=>{ const o={}; for(const ch of CHANNELS){
      const m = SRC[ch].mode;
      if(m==="pattern"||m==="synth"||m==="text"||m==="feed") o[ch] = {mode:m, pattern:SRC[ch].pattern, feed:SRC[ch].feed};
    } return o; })(),
    srcText: (()=>{ const o={}; for(const ch of CHANNELS) o[ch] = {...SRC[ch].text}; return o; })()};
  for(const k of LFOKEYS) st[k] = {rate:lfoState[k].rate, shape:lfoState[k].shape, sync:lfoState[k].sync||0};
  return st;
}
function restoreState(st){
  if(typeof cancelGlide === "function") cancelGlide();
  if(st.rescanMode !== undefined) rescanMode = st.rescanMode;
  if(st.chainOrder && st.chainOrder.length>=4) chainOrder = st.chainOrder.slice();
  if(st.stageEnabled) stageEnabled = {...stageEnabled, ...st.stageEnabled};
  if(st.wipeInv !== undefined) wipeInv = st.wipeInv;
  if(st.wipeInv2 !== undefined) wipeInv2 = st.wipeInv2;
  if(st.wipeInvM !== undefined) wipeInvM = st.wipeInvM;
  for(const k of ["fbWrap","fbMirror","fbBlend","fbNL","fbTap","outModel","fieldSrc","flowField","flowEdge","mixMode2","mixModeM"]){
    if(st[k] !== undefined) eval(k+" = st."+k);
  }
  if(st.fbInvert !== undefined) fbInvert = st.fbInvert;
  if(st.linkChans !== undefined){ linkChans = st.linkChans; const lb=document.getElementById("btnLinkChans"); if(lb) lb.classList.toggle("on", linkChans); }
  { const a=document.getElementById("selMixMode"); if(a) a.value = mixMode;
    const b=document.getElementById("selMixMode2"); if(b) b.value = mixMode2;
    const c=document.getElementById("selMixModeM"); if(c) c.value = mixModeM; }
  if(st.keyChroma !== undefined) keyChroma = st.keyChroma;
  if(st.mixMode !== undefined) mixMode = st.mixMode;
  if(st.edgeMode !== undefined) edgeMode = st.edgeMode;
  if(st.chan){
    for(const ch of CHANNELS) if(st.chan[ch]) for(const p of CLIST)
      if(st.chan[ch][p.id] !== undefined) chanBase[ch][p.id] = st.chan[ch][p.id];
    if(st.master) for(const p of MLIST) if(st.master[p.id] !== undefined) mBase[p.id] = st.master[p.id];
    routes = (st.routes||[]).map(r=>({ch:"A", ...r}));
    if(st.lfo1 || st.audioCfg) applyExtras(st);
    refreshUI(); renderRoutes(); refreshLfoUI(); refreshAudioUI();
  } else {
    applyState(st.bases||{}, st.routes||[], st);   /* legacy single-channel state */
  }
  if(st.srcText){ for(const ch of CHANNELS) if(st.srcText[ch]) Object.assign(SRC[ch].text, st.srcText[ch]); }
  if(st.busSrc){ if(st.busSrc.b1) busSrc.b1 = st.busSrc.b1.slice(); if(st.busSrc.b2) busSrc.b2 = st.busSrc.b2.slice(); refreshBusUI(); }
  if(st.genMode) for(const ch of CHANNELS) if(st.genMode[ch]) genMode[ch] = {...st.genMode[ch]};
  if(st.srcMode) for(const ch of CHANNELS){
    const m = st.srcMode[ch];
    /* only generated sources restore — a file or a camera cannot be reopened for you */
    if(!m || SRC[ch].mode === "file" || SRC[ch].mode === "cam") continue;
    SRC[ch].mode = m.mode; SRC[ch].name = m.mode;
    if(m.pattern) SRC[ch].pattern = m.pattern;
    if(m.feed) SRC[ch].feed = m.feed;
  }
  if(typeof syncChanInputUI === "function") syncChanInputUI();
  if(st.snapSlots) for(let i=0;i<SNAP_N;i++) snapSlots[i] = st.snapSlots[i] || null;
  if(st.snapGlide !== undefined) snapGlide = st.snapGlide;
  if(st.perfTake){ perfRec.data = st.perfTake; perfRec.len = st.perfLen || 0; }
  if(typeof refreshSnapUI === "function"){ refreshSnapUI(); refreshPerfUI(); }
  if(st.activeChan) setActiveChan(st.activeChan);
  refreshToggles();
  renderChain();
}
function applyExtras(extra){
  for(const k of LFOKEYS){ if(extra[k]) Object.assign(lfoState[k], extra[k]); }
  if(extra.audioCfg){
    for(const k of ["bass","mid","high"]) if(extra.audioCfg[k]) Object.assign(audioCfg[k], extra.audioCfg[k]);
    if(extra.audioCfg.response !== undefined) audioCfg.response = extra.audioCfg.response;
  }
  if(extra.fbTrailMode !== undefined) fbTrailMode = extra.fbTrailMode;
}
function pushHistory(){
  histStack.push(captureState());
  if(histStack.length > 24) histStack.shift();
}
function undo(){
  const st = histStack.pop();
  if(st) restoreState(st);
}
document.getElementById("btnUndo").onclick = undo;
function initPatch(){
  pushHistory();
  cancelGlide();
  if(perfRec.mode !== "off") perfStop();
  fbTrailMode=false; rescanMode=false; keyChroma=false;
  mixMode=0; edgeMode=0; showKeyMatte=false; wipeInv=false; linkChans=false;
  fbWrap=0; fbMirror=0; fbBlend=0; fbNL=0; fbInvert=false; fbTap=0; outModel=0; fieldSrc=0; flowField=0; flowEdge=0;
  mixMode2=0; wipeInv2=false; mixModeM=0; wipeInvM=false;
  { const lb=document.getElementById("btnLinkChans"); if(lb) lb.classList.remove("on"); }
  for(const ch of CHANNELS) for(const p of CLIST) chanBase[ch][p.id] = p.def;
  for(const p of MLIST) mBase[p.id] = p.def;
  for(const q of ["selMixMode","selMixMode2","selMixModeM"]){ const sm=document.getElementById(q); if(sm) sm.value=0; }
  chainOrder = ["sig","col","glitch","lab","flow"];
  stageEnabled = {sig:true, col:true, glitch:true, lab:true, flow:true};
  for(const ch of CHANNELS) if(window.__setTransport) window.__setTransport("play", ch);
  morphOverride.clear();
  morphA=null; morphB=null; morphOverride.clear();
  for(const el of ["morphBtnA","morphBtnB"]){ const b=document.getElementById(el); if(b) b.classList.remove("on"); }
  Object.assign(lfoState.lfo1, {rate:0.3,  shape:"sine", sync:0});
  Object.assign(lfoState.lfo2, {rate:1.7,  shape:"snh",  sync:0});
  Object.assign(lfoState.lfo3, {rate:0.07, shape:"tri",  sync:0});
  Object.assign(lfoState.lfo4, {rate:5.5,  shape:"sine", sync:0});
  Object.assign(audioCfg.bass, {lo:30,   hi:150,   gain:1});
  Object.assign(audioCfg.mid,  {lo:300,  hi:2200,  gain:1});
  Object.assign(audioCfg.high, {lo:4000, hi:11000, gain:1});
  audioCfg.response = 0.5;
  applyState({}, []);
  refreshToggles();
  renderChain();
  selPreset.value = "0";
  toast("Init patch — everything back to defaults (Z to undo)");
}
document.getElementById("btnInit").onclick = initPatch;

/* save / load */
document.getElementById("btnSave").onclick = ()=>{
  const snap = snapshotAll();
  const state = {app:"bendr", v:5, chan:snap.chan, master:snap.master, routes, audioCfg,
    fbTrailMode, rescanMode, keyChroma, mixMode, edgeMode, wipeInv, activeChan, linkChans,
    mixMode2, wipeInv2, mixModeM, wipeInvM,
    fbWrap, fbMirror, fbBlend, fbNL, fbInvert, fbTap, outModel, fieldSrc, flowField, flowEdge,
    chainOrder: chainOrder.slice(), stageEnabled: {...stageEnabled},
    busSrc: {b1:busSrc.b1.slice(), b2:busSrc.b2.slice()},
    genMode: JSON.parse(JSON.stringify(genMode)),
    snapSlots, snapGlide, perfTake: perfRec.data, perfLen: perfRec.len,
    srcMode: (()=>{ const o={}; for(const ch of CHANNELS){
      const m = SRC[ch].mode;
      if(m==="pattern"||m==="synth"||m==="text"||m==="feed") o[ch] = {mode:m, pattern:SRC[ch].pattern, feed:SRC[ch].feed};
    } return o; })(),
    srcText: (()=>{ const o={}; for(const ch of CHANNELS) o[ch] = {...SRC[ch].text}; return o; })()};
  for(const k of LFOKEYS) state[k] = {rate:lfoState[k].rate, shape:lfoState[k].shape, sync:lfoState[k].sync||0};
  const blob = new Blob([JSON.stringify(state,null,1)], {type:"application/json"});
  dl(URL.createObjectURL(blob), "bendr-"+stamp()+".json");
  toast("State saved");
};
document.getElementById("btnLoad").onclick = ()=>{ fileIn.accept=".json"; fileIn.click(); };
function loadStateFile(f){
  f.text().then(txt=>{
    try{
      const s = JSON.parse(txt);
      pushHistory();
      restoreState(s);
      toast("State loaded: "+f.name);
    }catch(e){ console.error(e); toast("Couldn't load that file: "+e.message, true); }
  });
}
function stamp(){
  const d = new Date();
  return d.getFullYear()+""+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0")+"-"+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")+String(d.getSeconds()).padStart(2,"0");
}
function dl(url, name){
  const a = document.createElement("a"); a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 30000);
}

/* ---------------- inputs: each channel owns its own source ---------------- */
function newSource(ch){
  const v = document.createElement("video");
  v.playsInline = true; v.loop = true; v.crossOrigin = "anonymous";
  if(ch !== "A") v.muted = true;
  const pc = document.createElement("canvas");
  pc.width = 960; pc.height = 540;
  return {ch, video:v, mode:"pattern", pattern:"bars", cam:null,
          patCanvas:pc, pat:pc.getContext("2d"), patClock:0,
          aspect:16/9, has:0, speed:1, tpRate:1, feed:"PGM", name:"", audioHooked:false,
          text:{body:"BENDR", font:"mono", size:0.2, track:0, x:0.5, y:0.5, rot:0,
                scrollX:0, scrollY:0, repeat:1, ink:"#ffffff", bg:"#000000", outline:0,
                shape:"none", shpCount:1, shpSize:0.3, shpX:0.5, shpY:0.5,
                shpSpin:0, shpFill:"#ff2fa0", shpStroke:0, shpPulse:0}};
}
const SRC = {};
for(const ch of CHANNELS) SRC[ch] = newSource(ch);
/* the A-channel video keeps the old name so audio hookup keeps working */
const video = SRC.A.video;
const videoB = SRC.B.video;
function cur(){ return SRC[activeChan]; }

const fileIn = document.getElementById("fileIn");
document.getElementById("btnFile").onclick = ()=>{ fileIn.accept="video/*"; fileIn.dataset.chan = activeChan; fileIn.click(); };
fileIn.onchange = ()=>{ if(fileIn.files[0]) handleFile(fileIn.files[0], fileIn.dataset.chan || activeChan); fileIn.value=""; };

function handleFile(f, ch){
  ch = ch || activeChan;
  if(f.name.endsWith(".json")){ loadStateFile(f); return; }
  if(!f.type.startsWith("video/") && !/\.(mp4|mov|webm|m4v|mkv)$/i.test(f.name)){ toast("Not a video file", true); return; }
  const S = SRC[ch];
  stopCam(ch);
  S.video.srcObject = null;
  S.video.src = URL.createObjectURL(f);
  S.name = f.name;
  S.speed = 1;
  S.video.playbackRate = 1; S.video.defaultPlaybackRate = 1;
  S.video.muted = (ch !== "A") ? true : masterMuted;
  S.video.play().catch(()=>{ S.video.muted = true; S.video.play().catch(()=>{}); });
  S.mode = "file";
  if(ch === "A"){ hookVideoAudio(); applyMute(); }
  syncChanInputUI();
  toast("Channel "+ch+": "+f.name+" ("+(f.size/1048576).toFixed(0)+" MB, streaming from disk)");
  setTimeout(()=>{
    if(S.mode==="file" && S.video.readyState < 2)
      toast("This browser can't decode that codec — try Chrome, or convert to H.264/WebM", true);
  }, 3500);
}
document.getElementById("btnCam").onclick = async ()=>{
  const ch = activeChan, S = SRC[ch];
  try{
    stopCam(ch);
    S.cam = await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280}, height:{ideal:720}}, audio:false});
    S.video.srcObject = S.cam; S.video.muted = true;
    await S.video.play();
    S.mode = "cam"; S.name = "webcam";
    syncChanInputUI();
    toast("Channel "+ch+": webcam live");
  }catch(e){ toast("Webcam unavailable: "+e.message, true); }
};
document.getElementById("btnPat").onclick = ()=>{
  const ch = activeChan;
  stopCam(ch);
  SRC[ch].mode = "pattern"; SRC[ch].name = "pattern";
  syncChanInputUI();
};
document.getElementById("btnFeed").onclick = ()=>{
  const ch = activeChan;
  stopCam(ch);
  SRC[ch].mode = "feed"; SRC[ch].name = "feed";
  syncChanInputUI();
  toast("Channel "+ch+" now re-enters "+(SRC[ch].feed||"PGM")+" \u2014 process it and mix it back in");
};
{
  const f = document.getElementById("selFeed");
  for(const o of FEED_SRCS){ const op=document.createElement("option"); op.value=o.id; op.textContent=o.name; f.appendChild(op); }
  f.onchange = ()=>{ const S = cur(); S.feed = f.value; S.mode = "feed"; S.name = "feed"; syncChanInputUI(); };
}
document.getElementById("btnSynth").onclick = ()=>{
  const ch = activeChan;
  stopCam(ch);
  SRC[ch].mode = "synth"; SRC[ch].name = "synth";
  syncChanInputUI();
  revealSection("gen");
  toast("Channel "+ch+": pattern synth \u2014 shape it in the PATTERN SYNTH section");
};
const selPat = document.getElementById("selPat");
selPat.onchange = ()=>{
  const S = cur();
  S.pattern = selPat.value;
  stopCam(activeChan);
  S.mode = "pattern";
  syncChanInputUI();
};
function stopCam(ch){
  const S = SRC[ch];
  if(S.cam){ S.cam.getTracks().forEach(t=>t.stop()); S.cam=null; }
}
function syncChanInputUI(){
  const S = cur();
  const gen = (S.mode === "pattern" || S.mode === "text");
  /* a generated source has no file to seek, loop or mute — grey those out
     rather than leaving dead controls sitting there */
  for(const [id, off] of [["btnPlay",gen],["btnLoop",gen],["btnMute",gen],["btnVari",gen],["seek",gen]]){
    const el = document.getElementById(id);
    if(!el) continue;
    el.disabled = off;
    el.classList.toggle("dim", off);
    el.title = off ? "Not available on a generated source — load a file into this channel" : "";
  }
  for(const q of document.querySelectorAll(".mchan")) q.textContent = activeChan;
  if(typeof refreshDockTabs === "function") refreshDockTabs();
  if(S.mode !== "text" && dockTab === "text") setDock("matrix");
  document.getElementById("btnFile").classList.toggle("on", S.mode==="file");
  document.getElementById("btnCam").classList.toggle("on", S.mode==="cam");
  document.getElementById("btnPat").classList.toggle("on", S.mode==="pattern");
  { const b=document.getElementById("btnSynth"); if(b) b.classList.toggle("on", S.mode==="synth"); }
  { const b=document.getElementById("btnFeed"); if(b) b.classList.toggle("on", S.mode==="feed");
    const f=document.getElementById("selFeed"); if(f) f.value = S.feed || "PGM"; }
  document.getElementById("btnText").classList.toggle("on", S.mode==="text");
  document.getElementById("btnFile").textContent = "FILE";
  selPat.value = S.pattern;
  const sp = document.getElementById("spd");
  sp.value = S.speed;
  sp.classList.toggle("hot", Math.abs(S.speed-1) > 0.001);
  const lp = document.getElementById("btnLoop");
  lp.classList.toggle("on", S.video.loop);
  if(dockTab === "text") syncTextEditor();
}
window.__syncChanInputUI = syncChanInputUI;
/* swap two channels' *sources* (what sits on top), not just their effects */
window.__swapSources = function(a, b){
  const A = SRC[a], B = SRC[b];
  const keys = ["mode","pattern","cam","patClock","aspect","has","speed","tpRate","feed","name","text"];
  for(const k of keys){ const t = A[k]; A[k] = B[k]; B[k] = t; }
  /* video elements carry their own media, so swap what each channel points at */
  const tv = A.video, tp = A.patCanvas, tc = A.pat;
  A.video = B.video; B.video = tv;
  A.patCanvas = B.patCanvas; B.patCanvas = tp;
  A.pat = B.pat; B.pat = tc;
  const gm = genMode[a]; genMode[a] = genMode[b]; genMode[b] = gm;
  A.ch = a; B.ch = b;
  syncChanInputUI();
};

/* ---- text / shape generator ---- */
const FONTS = {
  mono:'"SF Mono", ui-monospace, Menlo, monospace',
  sans:'"Helvetica Neue", Helvetica, Arial, sans-serif',
  serif:'Georgia, "Times New Roman", serif',
  cond:'"Arial Narrow", "Helvetica Neue Condensed", sans-serif',
  impact:'Impact, "Haettenschweiler", sans-serif',
  courier:'"Courier New", Courier, monospace',
  times:'"Times New Roman", Times, serif',
  georgia:'Georgia, serif',
  garamond:'Garamond, "EB Garamond", serif',
  palatino:'Palatino, "Palatino Linotype", serif',
  baskerville:'Baskerville, "Libre Baskerville", serif',
  didot:'Didot, "Bodoni MT", serif',
  futura:'Futura, "Century Gothic", sans-serif',
  gill:'"Gill Sans", "Gill Sans MT", sans-serif',
  optima:'Optima, Candara, sans-serif',
  avenir:'Avenir, "Avenir Next", sans-serif',
  verdana:'Verdana, Geneva, sans-serif',
  tahoma:'Tahoma, Geneva, sans-serif',
  trebuchet:'"Trebuchet MS", sans-serif',
  rockwell:'Rockwell, "Courier Bold", serif',
  copperplate:'Copperplate, "Copperplate Gothic Light", fantasy',
  papyrus:'Papyrus, fantasy',
  chalkduster:'Chalkduster, fantasy',
  marker:'"Marker Felt", fantasy',
  bradley:'"Bradley Hand", cursive',
  snell:'"Snell Roundhand", cursive',
  zapfino:'Zapfino, cursive',
  andale:'"Andale Mono", monospace',
  menlo:'Menlo, monospace',
  monaco:'Monaco, monospace',
  cursive:'cursive',
  fantasy:'fantasy',
  system:'system-ui, -apple-system, sans-serif'
};
function drawTextSource(S, t){
  const g = S.pat, W = S.patCanvas.width, H = S.patCanvas.height, T = S.text;
  g.setTransform(1,0,0,1,0,0);
  g.fillStyle = T.bg; g.fillRect(0,0,W,H);

  /* shapes underneath */
  if(T.shape !== "none"){
    const n = Math.max(1, Math.round(T.shpCount));
    const pulse = 1 + T.shpPulse*0.45*Math.sin(t*3.1);
    for(let i=0;i<n;i++){
      const f = n===1 ? 0 : i/(n-1);
      g.save();
      g.translate(T.shpX*W, T.shpY*H);
      g.rotate(T.shpSpin*t + f*Math.PI*2/Math.max(1,n));
      const sz = T.shpSize*H*pulse*(1 - f*0.55);
      g.fillStyle = T.shpFill; g.strokeStyle = T.shpFill; g.lineWidth = T.shpStroke;
      const stroked = T.shpStroke > 0.2;
      g.beginPath();
      switch(T.shape){
        case "circle": g.arc(0,0,sz,0,7); break;
        case "ring":   g.arc(0,0,sz,0,7); g.arc(0,0,sz*0.55,0,7); break;
        case "rect":   g.rect(-sz,-sz*0.62,sz*2,sz*1.24); break;
        case "tri":    g.moveTo(0,-sz); g.lineTo(sz*0.87,sz*0.5); g.lineTo(-sz*0.87,sz*0.5); g.closePath(); break;
        case "cross":  g.rect(-sz,-sz*0.18,sz*2,sz*0.36); g.rect(-sz*0.18,-sz,sz*0.36,sz*2); break;
        case "bars":   for(let b=0;b<8;b++) g.rect(-sz + b*sz/4, -sz, sz/8, sz*2); break;
        case "grid":   for(let b=-4;b<=4;b++){ g.rect(b*sz/4-sz*0.02,-sz,sz*0.04,sz*2); g.rect(-sz,b*sz/4-sz*0.02,sz*2,sz*0.04); } break;
        case "rings":  for(let b=1;b<=6;b++){ g.moveTo(sz*b/6,0); g.arc(0,0,sz*b/6,0,7); } break;
        case "starburst": for(let b=0;b<16;b++){ const a=b*Math.PI/8; g.moveTo(0,0); g.lineTo(Math.cos(a)*sz, Math.sin(a)*sz); } break;
      }
      if(T.shape==="rings" || T.shape==="starburst" || stroked){ g.lineWidth = Math.max(1,T.shpStroke||2); g.stroke(); }
      else g.fill();
      g.restore();
    }
  }

  /* text on top */
  const body = (T.body||"").split("\n");
  if(body.length && body.join("").length){
    const px = Math.max(4, T.size*H);
    g.font = "bold "+px+"px "+FONTS[T.font];
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = T.ink; g.strokeStyle = T.ink; g.lineWidth = T.outline;
    const reps = Math.max(1, Math.round(T.repeat));
    for(let r=0;r<reps;r++){
      g.save();
      const ox = ((T.x + T.scrollX*t) % 1 + 1) % 1;
      const oy = ((T.y + T.scrollY*t) % 1 + 1) % 1;
      g.translate(ox*W, oy*H + (r - (reps-1)/2)*px*1.35*Math.max(1,reps>1?1.2:1));
      g.rotate(T.rot*Math.PI/180);
      body.forEach((line,li)=>{
        const yy = (li - (body.length-1)/2)*px*1.15;
        if(T.track !== 0){
          /* manual letter spacing */
          const chars = [...line];
          const sp = T.track*px;
          let total = 0;
          for(const c of chars) total += g.measureText(c).width + sp;
          let cx = -total/2;
          for(const c of chars){
            const w = g.measureText(c).width;
            if(T.outline>0.2) g.strokeText(c, cx+w/2, yy); else g.fillText(c, cx+w/2, yy);
            cx += w + sp;
          }
        } else {
          if(T.outline>0.2) g.strokeText(line, 0, yy); else g.fillText(line, 0, yy);
        }
      });
      g.restore();
    }
  }
  g.setTransform(1,0,0,1,0,0);
}

/* text editor wiring */
let dockTab = "matrix";
function setDock(t){
  /* the text editor belongs to a text source, so it is only live on a channel
     that is actually set to TEXT */
  if(t === "text" && cur().mode !== "text"){
    toast("Channel "+activeChan+" is not a text source \u2014 pick TEXT under SOURCE first", true);
    t = dockTab === "text" ? "matrix" : dockTab;
  }
  dockTab = t;
  const map = {mix:"mixdock", matrix:"matrix", mod:"modgrid", text:"textdock", perform:"performdock"};
  for(const k in map){
    const el = document.getElementById(map[k]);
    if(el) el.classList.toggle("on", k===t);
  }
  document.querySelectorAll("#dockTabs button").forEach(b=>b.classList.toggle("on", b.dataset.dock===t));
  const hint = document.getElementById("dockHint");
  if(hint) hint.textContent = t==="mod" ? "right-click any parameter to patch it"
                            : t==="text" ? "typing here never triggers shortcuts"
                            : t==="perform" ? "shift and a number recalls a snapshot \u00b7 Q W E R T Y hold the pads"
                            : t==="mix" ? "the faders themselves are on the strip under the picture"
                            : "patch sources into any parameter";
  if(t==="text") syncTextEditor();
  refreshDockTabs();
}
/* grey the TEXT tab unless this channel is a text source */
function refreshDockTabs(){
  const b = document.querySelector('#dockTabs button[data-dock="text"]');
  if(!b) return;
  const ok = cur().mode === "text";
  b.classList.toggle("dim", !ok);
  const td = document.getElementById("textdock");
  if(td) td.classList.toggle("notext", !ok);
  const note = document.getElementById("textNeedsSrc");
  if(note) note.style.display = ok ? "none" : "block";
}
window.__refreshDockTabs = refreshDockTabs;
const textEd = null;
const TXT_CTRL = [["txtBody","body","s"],["txtFont","font","s"],["txtSize","size","f"],["txtTrack","track","f"],
  ["txtX","x","f"],["txtY","y","f"],["txtRot","rot","f"],["txtScrollX","scrollX","f"],["txtScrollY","scrollY","f"],
  ["txtRepeat","repeat","f"],["txtInk","ink","s"],["txtBg","bg","s"],["txtOutline","outline","f"],
  ["shpKind","shape","s"],["shpCount","shpCount","f"],["shpSize","shpSize","f"],["shpX","shpX","f"],["shpY","shpY","f"],
  ["shpSpin","shpSpin","f"],["shpFill","shpFill","s"],["shpStroke","shpStroke","f"],["shpPulse","shpPulse","f"]];
function syncTextEditor(){
  const T = cur().text;
  const ce = document.getElementById("textEdChan");
  if(ce) ce.textContent = "\u2014 CHANNEL "+activeChan;
  for(const [id,key,kind] of TXT_CTRL){
    const el = document.getElementById(id); if(!el) continue;
    el.value = T[key];
  }
}
for(const [id,key,kind] of TXT_CTRL){
  const el = document.getElementById(id); if(!el) continue;
  const handler = ()=>{
    const T = cur().text;
    T[key] = (kind==="f") ? parseFloat(el.value) : el.value;
    const S = cur();
    if(S.mode !== "text"){ stopCam(activeChan); S.mode = "text"; S.name = "text"; syncChanInputUI(); }
  };
  el.addEventListener("input", handler);
  el.addEventListener("change", handler);
}
document.getElementById("btnText").onclick = ()=>{
  const S = cur();
  stopCam(activeChan);
  S.mode = "text"; S.name = "text";
  syncChanInputUI(); syncTextEditor();
  setDock("text");
  setTimeout(()=>{ const t=document.getElementById("txtBody"); if(t) t.focus(); }, 60);
};

/* test pattern drawing — per source */
const noiseC = document.createElement("canvas"); noiseC.width=240; noiseC.height=135;
const noiseCtx = noiseC.getContext("2d");
const noiseImg = noiseCtx.createImageData(240,135);
function drawPattern(S, t){
  const pat = S.pat, w = S.patCanvas.width, h = S.patCanvas.height;
  const patternType = S.pattern;
  if(patternType === "bars"){
    const bars = ["#c0c0c0","#c0c000","#00c0c0","#00c000","#c000c0","#c00000","#0000c0"];
    const bw = w/bars.length;
    for(let i=0;i<bars.length;i++){ pat.fillStyle = bars[i]; pat.fillRect(i*bw, 0, bw+1, h*0.6); }
    const g = pat.createLinearGradient(0,0,w,0);
    g.addColorStop(0,"#000"); g.addColorStop(1,"#fff");
    pat.fillStyle = g; pat.fillRect(0, h*0.6, w, h*0.18);
    pat.fillStyle = "#111"; pat.fillRect(0, h*0.78, w, h*0.22);
    const bx = (0.5+0.42*Math.sin(t*0.7))*w;
    pat.fillStyle = "#fff"; pat.fillRect(bx-25, h*0.80, 50, h*0.09);
    pat.fillStyle = "hsl("+Math.floor((t*30)%360)+",90%,55%)";
    pat.beginPath(); pat.arc((0.5+0.42*Math.cos(t*0.45))*w, h*0.915, h*0.045, 0, 7); pat.fill();
    pat.fillStyle = "#ddd"; pat.font = "bold "+Math.floor(h*0.06)+"px monospace";
    pat.fillText("BENDR "+S.ch+"  "+t.toFixed(1).padStart(7,"0"), w*0.03, h*0.95);
  } else if(patternType === "testcard"){
    pat.fillStyle = "#666"; pat.fillRect(0,0,w,h);
    pat.strokeStyle = "#999"; pat.lineWidth = 1;
    for(let x=0;x<=w;x+=w/16){ pat.beginPath(); pat.moveTo(x,0); pat.lineTo(x,h); pat.stroke(); }
    for(let y=0;y<=h;y+=h/9){ pat.beginPath(); pat.moveTo(0,y); pat.lineTo(w,y); pat.stroke(); }
    const cols = ["#c0c0c0","#c0c000","#00c0c0","#00c000","#c000c0","#c00000","#0000c0","#000"];
    const cw = w*0.5/cols.length;
    for(let i=0;i<cols.length;i++){ pat.fillStyle=cols[i]; pat.fillRect(w*0.25+i*cw, h*0.35, cw+1, h*0.12); }
    pat.fillStyle = "#111";
    pat.beginPath(); pat.arc(w/2, h/2, h*0.38, 0, 7); pat.lineWidth = h*0.03; pat.strokeStyle="#eee"; pat.stroke();
    const g2 = pat.createLinearGradient(w*0.25,0,w*0.75,0);
    g2.addColorStop(0,"#000"); g2.addColorStop(1,"#fff");
    pat.fillStyle=g2; pat.fillRect(w*0.25, h*0.55, w*0.5, h*0.08);
    pat.strokeStyle="#fff"; pat.lineWidth=2;
    pat.beginPath(); pat.moveTo(w/2,h*0.1); pat.lineTo(w/2,h*0.9); pat.moveTo(w*0.15,h/2); pat.lineTo(w*0.85,h/2); pat.stroke();
    const sweep = t*0.8;
    pat.strokeStyle="hsl("+Math.floor((t*40)%360)+",90%,60%)"; pat.lineWidth=4;
    pat.beginPath(); pat.moveTo(w/2,h/2);
    pat.lineTo(w/2+Math.cos(sweep)*h*0.36, h/2+Math.sin(sweep)*h*0.36); pat.stroke();
  } else if(patternType === "osc"){
    const N = 6;
    for(let i=0;i<N;i++){
      const g = pat.createLinearGradient(0, 0, w, 0);
      const ph = t*(0.13+i*0.07) + i*1.3;
      for(let sIdx=0;sIdx<=6;sIdx++){
        const f = sIdx/6;
        const hue = ( Math.sin(f*3.14159*2 + ph)*60 + i*60 + t*25 )%360;
        const lig = 45 + 25*Math.sin(f*9 + ph*1.7 + i);
        g.addColorStop(f, "hsl("+((hue+360)%360)+",95%,"+lig.toFixed(0)+"%)");
      }
      pat.fillStyle = g;
      const y0 = (i/N)*h + Math.sin(t*0.5+i)*h*0.02;
      pat.fillRect(0, y0, w, h/N+h*0.04);
    }
  } else if(patternType === "grid"){
    pat.fillStyle = "#000"; pat.fillRect(0,0,w,h);
    pat.strokeStyle = "#fff"; pat.lineWidth = 2;
    const step = w/24;
    for(let x=step/2;x<w;x+=step){ pat.beginPath(); pat.moveTo(x,0); pat.lineTo(x,h); pat.stroke(); }
    for(let y=step/2;y<h;y+=step){ pat.beginPath(); pat.moveTo(0,y); pat.lineTo(w,y); pat.stroke(); }
    pat.lineWidth = 5;
    pat.strokeStyle = "hsl("+Math.floor((t*20)%360)+",80%,60%)";
    pat.strokeRect(w*0.02, h*0.03, w*0.96, h*0.94);
    pat.beginPath(); pat.arc(w/2+Math.sin(t*0.6)*w*0.3, h/2, h*0.08, 0, 7);
    pat.fillStyle="#fff"; pat.fill();
  } else if(patternType === "ramp"){
    const g = pat.createLinearGradient(0,0,w,0);
    g.addColorStop(0,"#000"); g.addColorStop(1,"#fff");
    pat.fillStyle = g; pat.fillRect(0,0,w,h*0.5);
    const n = 12;
    for(let i=0;i<n;i++){
      pat.fillStyle = "hsl("+Math.floor((i/n*360 + t*30)%360)+",90%,55%)";
      pat.fillRect(i*w/n, h*0.5, w/n+1, h*0.5);
    }
  } else if(patternType === "hramp" || patternType === "vramp" || patternType === "radial"){
    const img = pat.createImageData(w, h), d = img.data;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      let v;
      if(patternType==="hramp") v = x/w;
      else if(patternType==="vramp") v = 1-y/h;
      else v = Math.min(1, Math.hypot(x/w-0.5, y/h-0.5)*2);
      const g = (v*255)|0;
      d[i]=g; d[i+1]=g; d[i+2]=g; d[i+3]=255;
    }
    pat.putImageData(img,0,0);
  } else if(patternType === "oscbars"){
    const img = pat.createImageData(w, h), d = img.data;
    const f1 = 0.06 + 0.05*Math.sin(t*0.23), f2 = 0.021 + 0.02*Math.sin(t*0.17);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      d[i]   = 128+127*Math.sin(x*f1 + t*2.0);
      d[i+1] = 128+127*Math.sin(y*f2 + t*1.3);
      d[i+2] = 128+127*Math.sin((x*f1+y*f2)*0.7 - t*1.7);
      d[i+3] = 255;
    }
    pat.putImageData(img,0,0);
  } else if(patternType === "plasma"){
    const img = pat.createImageData(w, h), d = img.data;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const i=(y*w+x)*4, u=x/w, v=y/h;
      const a = Math.sin(u*9+t) + Math.sin(v*11-t*0.7) + Math.sin((u+v)*7+t*0.5)
              + Math.sin(Math.hypot(u-0.5,v-0.5)*18 - t*1.3);
      d[i]   = 128+110*Math.sin(a*1.1);
      d[i+1] = 128+110*Math.sin(a*1.1+2.1);
      d[i+2] = 128+110*Math.sin(a*1.1+4.2);
      d[i+3] = 255;
    }
    pat.putImageData(img,0,0);
  } else if(patternType === "lissa"){
    pat.fillStyle="#000"; pat.fillRect(0,0,w,h);
    pat.lineWidth = 2.5;
    for(let k=0;k<3;k++){
      pat.strokeStyle = ["#ff2fa0","#2ee6d6","#ffd400"][k];
      pat.beginPath();
      const a = 3+k, b = 4+k*2, ph = t*(0.4+k*0.15);
      for(let i=0;i<=400;i++){
        const th = i/400*Math.PI*2;
        const x = w/2 + Math.sin(a*th+ph)*w*0.4;
        const y = h/2 + Math.sin(b*th)*h*0.4;
        i? pat.lineTo(x,y) : pat.moveTo(x,y);
      }
      pat.stroke();
    }
  } else if(patternType === "checker"){
    const n = 8, cw = w/n, chh = h/(n/2);
    const off = Math.floor(t*2)%2;
    for(let yy=0;yy<n/2;yy++) for(let xx=0;xx<n;xx++){
      pat.fillStyle = ((xx+yy+off)%2) ? "#fff" : "#000";
      pat.fillRect(xx*cw, yy*chh, cw+1, chh+1);
    }
  } else if(patternType === "static"){
    const d = noiseImg.data;
    for(let i=0;i<d.length;i+=4){
      const v = (Math.random()*255)|0;
      d[i]=v; d[i+1]=v; d[i+2]=v; d[i+3]=255;
    }
    noiseCtx.putImageData(noiseImg,0,0);
    pat.imageSmoothingEnabled = false;
    pat.drawImage(noiseC, 0, 0, w, h);
    pat.imageSmoothingEnabled = true;
  }
}

/* transport — controls the active channel */
const btnPlay = document.getElementById("btnPlay");
const seek = document.getElementById("seek");
const tcode = document.getElementById("tcode");
let seeking = false, masterMuted = false, variMode = false;
btnPlay.onclick = ()=>{ const v = cur().video; if(v.paused) v.play(); else v.pause(); };
video.addEventListener("play", ()=> btnPlay.textContent="❚❚");
video.addEventListener("pause", ()=> btnPlay.textContent="▶");
document.getElementById("btnLoop").onclick = e=>{
  const v = cur().video; v.loop = !v.loop; e.target.classList.toggle("on", v.loop);
};
const spdEl = document.getElementById("spd");
/* browsers only accept a limited playback-rate range, but the generated
   sources are happy with anything, so the element gets a clamped copy */
function videoRate(v){ return Math.min(16, Math.max(0.0625, Math.abs(v) || 1)); }
function setSpeed(v, ch){
  const S = SRC[ch||activeChan];
  S.speed = v;
  try{
    S.video.playbackRate = videoRate(v);
    S.video.defaultPlaybackRate = videoRate(v);
  }catch(e){}
  if(!ch || ch===activeChan){
    spdEl.value = v;
    spdEl.classList.toggle("hot", Math.abs(v-1) > 0.001);
  }
}
spdEl.addEventListener("input", e=>{ setSpeed(parseFloat(e.target.value)); });
spdEl.addEventListener("dblclick", ()=>{ setSpeed(1); });
for(const ch of CHANNELS){
  const S = SRC[ch];
  S.video.addEventListener("loadeddata", ()=>{ try{ S.video.playbackRate = videoRate(S.speed); }catch(e){} });
  S.video.addEventListener("ratechange", ()=>{
    if(Math.abs(S.video.playbackRate-videoRate(S.speed))>0.01 && !S.video.srcObject){ try{ S.video.playbackRate = videoRate(S.speed); }catch(e){} }
  });
}
/* ---- tape transport: per-channel deck mode ---- */
const transport = {};
for(const ch of CHANNELS) transport[ch] = "play";
const TP_RATE = {play:1, still:0, ff:4, rew:-4, jogf:0.25, jogr:-0.25};
function setTransport(mode, ch){
  ch = ch || activeChan;
  transport[ch] = mode;
  const S = SRC[ch];
  if(S.mode === "pattern" || S.mode === "text"){
    S.tpRate = TP_RATE[mode];
    if(typeof refreshToggles === "function") refreshToggles();
    return;
  }
  const v = S.video;
  try{
    if(mode === "play"){ v.playbackRate = videoRate(S.speed); if(v.paused) v.play(); }
    else if(mode === "still"){ v.pause(); }
    else if(mode === "ff"){ v.playbackRate = videoRate(Math.abs(S.speed)*4 || 4); if(v.paused) v.play(); }
    else { v.pause(); }   // rew / jog are driven frame by frame below
  }catch(e){}
  if(typeof refreshToggles === "function") refreshToggles();
}
window.__setTransport = setTransport;
window.__transportOf = ch=>transport[ch||activeChan] || "play";
/* reverse and jog can't use playbackRate, so scrub currentTime each frame */
function driveTransport(dt){
  for(const ch of CHANNELS){
    const m = transport[ch];
    if(m === "play" || m === "still" || m === "ff") continue;
    const S = SRC[ch];
    if(S.mode === "pattern" || S.mode === "text") continue;
    const v = S.video;
    if(!v.duration) continue;
    const r = TP_RATE[m] * (Math.abs(S.speed) || 1);
    let nt = v.currentTime + r*dt;
    if(nt < 0) nt += v.duration;
    if(nt > v.duration) nt -= v.duration;
    try{ v.currentTime = nt; }catch(e){}
  }
}
function applyMute(){
  if(typeof outGainNode !== "undefined" && outGainNode){
    outGainNode.gain.value = masterMuted ? 0 : 1;
    if(!video.error) video.muted = false;
  } else {
    video.muted = masterMuted;
  }
  const b = document.getElementById("btnMute");
  if(b) b.classList.toggle("on", masterMuted);
}
document.getElementById("btnMute").onclick = ()=>{ masterMuted = !masterMuted; applyMute(); };
document.getElementById("btnVari").onclick = e=>{
  variMode = !variMode;
  e.target.classList.toggle("on", variMode);
  for(const ch of CHANNELS) if("preservesPitch" in SRC[ch].video) SRC[ch].video.preservesPitch = !variMode;
  toast(variMode ? "Varispeed: pitch follows speed (tape mode)" : "Time-stretch: pitch held constant");
};
seek.addEventListener("input", ()=>{
  seeking=true;
  const v = cur().video;
  if(v.duration) v.currentTime = seek.value*v.duration;
});
seek.addEventListener("change", ()=>{ seeking=false; });
function fmtT(s){ if(!isFinite(s)) return "--:--"; s=Math.floor(s); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }

/* ---------------- record / snapshot / fullscreen ---------------- */
let recorder=null, recChunks=[], recStart=0, recTimer=null;
const btnRec = document.getElementById("btnRec"), recTime = document.getElementById("recTime");
btnRec.onclick = toggleRec;
function toggleRec(){
  if(recorder){ recorder.stop(); return; }
  const stream = canvas.captureStream(60);
  if(audioCtx && recDest && audioMode==="source"){
    for(const tr of recDest.stream.getAudioTracks()) stream.addTrack(tr);
  }
  let mime = "";
  for(const m of ["video/mp4;codecs=avc1.640028,mp4a.40.2","video/mp4;codecs=avc1.42E01E,mp4a.40.2",
                  "video/mp4;codecs=avc1.640028","video/mp4",
                  "video/webm;codecs=vp9,opus","video/webm;codecs=vp9","video/webm;codecs=vp8,opus","video/webm"]){
    if(MediaRecorder.isTypeSupported(m)){ mime=m; break; }
  }
  const isMp4 = mime.indexOf("mp4") >= 0;
  recChunks = [];
  recorder = new MediaRecorder(stream, {mimeType:mime, videoBitsPerSecond: 16_000_000});
  recorder.ondataavailable = e=>{ if(e.data.size) recChunks.push(e.data); };
  recorder.onstop = ()=>{
    const blob = new Blob(recChunks, {type: isMp4 ? "video/mp4" : "video/webm"});
    dl(URL.createObjectURL(blob), "bendr-"+stamp()+(isMp4?".mp4":".webm"));
    recorder=null; btnRec.classList.remove("rec-on"); btnRec.textContent="● REC";
    recTime.style.display="none"; clearInterval(recTimer);
    toast("Recording saved ("+(blob.size/1048576).toFixed(1)+" MB "+(isMp4?"MP4":"WebM — this browser can't record MP4; use RENDER for MP4")+")");
  };
  recorder.start(250);
  recStart = performance.now();
  btnRec.classList.add("rec-on"); btnRec.textContent="■ STOP";
  recTime.style.display="inline";
  recTimer = setInterval(()=>{
    const s = Math.floor((performance.now()-recStart)/1000);
    recTime.textContent = Math.floor(s/60)+":"+String(s%60).padStart(2,"0");
  }, 250);
}
document.getElementById("btnSnap").onclick = ()=>{
  canvas.toBlob(b=>{ if(b){ dl(URL.createObjectURL(b), "bendr-"+stamp()+".png"); toast("Still saved"); } }, "image/png");
};
document.getElementById("btnFull").onclick = ()=>{
  const w = document.getElementById("canvasWrap");
  if(document.fullscreenElement) document.exitFullscreen();
  else w.requestFullscreen();
};

/* pop-out output window — the app itself opened in #output receiver mode.
   The popout runs its own render-driving loop, so fullscreening it (which
   occludes and throttles this window) no longer freezes the picture. */
let popWin = null, outStream = null, outTrack = null;
window.__getOutputStream = ()=>{
  if(!outStream){
    outStream = canvas.captureStream(0);   // frames pushed manually every tick
    outTrack = outStream.getVideoTracks()[0];
  }
  return outStream;
};
const btnPop = document.getElementById("btnPop");
btnPop.onclick = ()=>{
  if(popWin && !popWin.closed){ popWin.close(); popWin = null; btnPop.classList.remove("on"); return; }
  if(location.protocol.indexOf("http") === 0){
    /* served over http(s): open the app itself in #output receiver mode (clean URL) */
    popWin = window.open(location.href.split("#")[0]+"#output", "bendr_output", "width=1280,height=720");
    if(!popWin){ toast("Popup blocked — allow popups for this page", true); return; }
  } else {
    /* file:// — separate files are cross-origin, so build the output page in-window */
    popWin = window.open("", "bendr_output", "width=1280,height=720");
    if(!popWin){ toast("Popup blocked — allow popups for this page", true); return; }
    const pd = popWin.document;
    pd.title = "BENDR — OUTPUT";
    pd.body.style.cssText = "margin:0;background:#000;overflow:hidden;cursor:none;";
    const pv = pd.createElement("video");
    pv.muted = true; pv.autoplay = true; pv.playsInline = true;
    pv.style.cssText = "width:100vw;height:100vh;object-fit:contain;display:block;";
    pv.srcObject = window.__getOutputStream();
    pd.body.appendChild(pv);
    pv.play().catch(()=>{});
    pv.ondblclick = ()=>{
      if(pd.fullscreenElement) pd.exitFullscreen();
      else pv.requestFullscreen().catch(()=>{});
    };
    /* drive the render loop from the popout: when it goes fullscreen and occludes
       the main window, Chrome throttles the main rAF — the popout keeps ticking */
    const w = popWin;
    (function drive(){
      if(!w || w.closed) return;
      try{ w.requestAnimationFrame(drive); }catch(e){ return; }
      doTick();
    })();
  }
  const closePoll = setInterval(()=>{
    if(!popWin || popWin.closed){ clearInterval(closePoll); popWin = null; btnPop.classList.remove("on"); }
  }, 800);
  btnPop.classList.add("on");
  toast("Output window open — double-click it for fullscreen, or point OBS at it");
};

/* big performance randomize/mutate pads */
document.getElementById("btnRnd").onclick = randomizeAll;
document.getElementById("btnMut").onclick = mutate;


/* bend buttons: mouse + touch */
for(const b of document.querySelectorAll(".bend[data-bend]")){
  const id = b.dataset.bend;
  const dn = e=>{ e.preventDefault(); bendHeld[id]=true; b.classList.add("held"); };
  const up = ()=>{ bendHeld[id]=false; b.classList.remove("held"); };
  b.addEventListener("mousedown", dn); b.addEventListener("touchstart", dn, {passive:false});
  b.addEventListener("mouseup", up); b.addEventListener("mouseleave", up); b.addEventListener("touchend", up);
}


/* ---------------- multiview ---------------- */
function setMultiView(on){
  multiView = on;
  document.body.classList.toggle("multi", on);
  const b = document.getElementById("btnMulti");
  if(b) b.classList.toggle("on", on);
}
document.getElementById("btnMulti").onclick = ()=>setMultiView(!multiView);

/* ---------------- snapshot bank ----------------
   Eight whole-panel states with a glide time. Recall crossfades every value
   from where it is now to where the slot says, which is the difference between
   a preset and a performance move. */
const SNAP_N = 8;
const snapSlots = new Array(SNAP_N).fill(null);
let snapStoreArm = false, snapGlide = 0.6;
let glideFrom = null, glideTo = null, glideT = 0, glideLen = 0;
function snapCapture(){
  const st = snapshotAll();
  return {chan:st.chan, master:st.master,
    g:{mixMode, mixMode2, mixModeM, wipeInv, wipeInv2, wipeInvM, fbWrap, fbMirror, fbBlend,
       fbNL, fbInvert, fbTrailMode, rescanMode, keyChroma, edgeMode, fieldSrc, flowField, flowEdge,
       outModel, b1:busSrc.b1.slice(), b2:busSrc.b2.slice()},
    chain: chainOrder.slice(), stages: {...stageEnabled}};
}
function snapStore(i){
  snapSlots[i] = snapCapture();
  refreshSnapUI();
  toast("Snapshot "+(i+1)+" stored");
}
function snapRecall(i){
  const st = snapSlots[i];
  if(!st){ toast("Snapshot "+(i+1)+" is empty — arm STORE and click it", true); return; }
  pushHistory();
  /* discrete things jump; continuous things glide */
  const g = st.g || {};
  if(g.b1) busSrc.b1 = g.b1.slice();
  if(g.b2) busSrc.b2 = g.b2.slice();
  for(const k of ["mixMode","mixMode2","mixModeM","fbWrap","fbMirror","fbBlend","fbNL",
                  "edgeMode","fieldSrc","flowField","flowEdge","outModel"]){
    if(g[k] !== undefined) eval(k+" = g."+k);
  }
  for(const k of ["wipeInv","wipeInv2","wipeInvM","fbInvert","fbTrailMode","rescanMode","keyChroma"]){
    if(g[k] !== undefined) eval(k+" = g."+k);
  }
  if(st.chain) chainOrder = st.chain.slice();
  if(st.stages) stageEnabled = {...stageEnabled, ...st.stages};
  if(snapGlide < 0.02){
    applySnapValues(st, 1, null);
    glideFrom = glideTo = null;
  } else {
    glideFrom = snapCapture(); glideTo = st; glideT = 0; glideLen = snapGlide;
  }
  morphOverride.clear();
  refreshUI(); refreshToggles(); renderChain(); refreshSnapUI(); refreshBusUI();
  toast("Snapshot "+(i+1)+(snapGlide>=0.02 ? " — gliding over "+snapGlide.toFixed(1)+"s" : ""));
}
function applySnapValues(to, m, from){
  for(const ch of CHANNELS){
    const t = to.chan && to.chan[ch]; if(!t) continue;
    const f = from && from.chan && from.chan[ch];
    for(const p of CLIST){
      if(t[p.id] === undefined) continue;
      const a = f && f[p.id] !== undefined ? f[p.id] : chanBase[ch][p.id];
      chanBase[ch][p.id] = a + (t[p.id]-a)*m;
    }
  }
  if(to.master) for(const p of MLIST){
    if(to.master[p.id] === undefined) continue;
    const a = from && from.master && from.master[p.id] !== undefined ? from.master[p.id] : mBase[p.id];
    mBase[p.id] = a + (to.master[p.id]-a)*m;
  }
}
/* a glide in flight must not keep writing over a preset, an init or an undo
   that happens while it is travelling */
function cancelGlide(){ glideFrom = glideTo = null; }
function updateGlide(dt){
  if(!glideTo) return;
  glideT = Math.min(1, glideT + dt/Math.max(0.02, glideLen));
  const m = glideT*glideT*(3-2*glideT);
  applySnapValues(glideTo, m, glideFrom);
  if(glideT >= 1){ glideFrom = glideTo = null; refreshUI(); }
}
function refreshSnapUI(){
  for(let i=0;i<SNAP_N;i++){
    const b = document.getElementById("snap"+i);
    if(b) b.classList.toggle("full", !!snapSlots[i]);
  }
  const sb = document.getElementById("snapStoreBtn");
  if(sb) sb.classList.toggle("on", snapStoreArm);
}
window.__snapHit = i=>{ if(snapStoreArm){ snapStore(i); snapStoreArm=false; } else snapRecall(i); refreshSnapUI(); };

/* ---------------- performance recorder ----------------
   Samples every base value 24 times a second and stores only what changed, so
   a long take is a few hundred kilobytes rather than a video. Playing it back
   moves the controls, which means the same performance can be replayed against
   different footage. */
const perfRec = {mode:"off", data:[], t:0, len:0, loop:true, cursor:0, acc:0};
const PERF_HZ = 24;
function perfFlat(){
  const o = {};
  for(const ch of CHANNELS){ const cb = chanBase[ch]; for(const p of CLIST) o[ch+":"+p.id] = cb[p.id]; }
  for(const p of MLIST) o["M:"+p.id] = mBase[p.id];
  for(const k in bendHeld) o["#"+k] = bendHeld[k] ? 1 : 0;
  o["#mix"] = mixMode; o["#mix2"] = mixMode2; o["#mixM"] = mixModeM;
  o["#wrap"] = fbWrap; o["#nl"] = fbNL; o["#blend"] = fbBlend; o["#mir"] = fbMirror;
  o["#ff"] = flowField; o["#fe"] = flowEdge; o["#model"] = outModel; o["#field"] = fieldSrc;
  return o;
}
function perfApply(k, v){
  if(k.charAt(0) === "#"){
    const n = k.slice(1);
    if(n in bendHeld){ bendHeld[n] = !!v; markBend(n, !!v); return; }
    const map = {mix:"mixMode", mix2:"mixMode2", mixM:"mixModeM", wrap:"fbWrap", nl:"fbNL",
                 blend:"fbBlend", mir:"fbMirror", ff:"flowField", fe:"flowEdge",
                 model:"outModel", field:"fieldSrc"};
    if(map[n]) eval(map[n]+" = v");
    return;
  }
  const i = k.indexOf(":");
  const ch = k.slice(0,i), id = k.slice(i+1);
  if(ch === "M") mBase[id] = v; else if(chanBase[ch]) chanBase[ch][id] = v;
}
let perfLast = null;
function perfStart(){
  perfRec.data = [{t:0, v:perfFlat()}];
  perfLast = {...perfRec.data[0].v};
  perfRec.mode = "rec"; perfRec.t = 0; perfRec.acc = 0; perfRec.cursor = 0;
  refreshPerfUI(); toast("Recording performance — every control you touch is being written down");
}
function perfStop(){
  if(perfRec.mode === "rec") perfRec.len = perfRec.t;
  perfRec.mode = "off"; refreshPerfUI();
}
function perfPlay(){
  if(!perfRec.data.length){ toast("Nothing recorded yet", true); return; }
  perfRec.mode = "play"; perfRec.t = 0; perfRec.cursor = 0; perfRec.acc = 0;
  /* the opening keyframe puts the rig back where the take started */
  const f0 = perfRec.data[0];
  for(const k in f0.v) perfApply(k, f0.v[k]);
  refreshUI(); refreshToggles(); refreshPerfUI();
}
function perfClear(){ perfRec.data = []; perfRec.len = 0; perfRec.mode = "off"; refreshPerfUI(); }
function updatePerf(dt){
  if(perfRec.mode === "off") return;
  perfRec.t += dt;
  if(perfRec.mode === "rec"){
    perfRec.acc += dt;
    if(perfRec.acc < 1/PERF_HZ) return;
    perfRec.acc = 0;
    const now = perfFlat(), d = {};
    let n = 0;
    for(const k in now) if(now[k] !== perfLast[k]){ d[k] = now[k]; perfLast[k] = now[k]; n++; }
    if(n) perfRec.data.push({t:perfRec.t, v:d});
    perfRec.len = perfRec.t;
    if(perfRec.t > 900) perfStop();     /* fifteen minutes is plenty */
  } else {
    while(perfRec.cursor < perfRec.data.length && perfRec.data[perfRec.cursor].t <= perfRec.t){
      const f = perfRec.data[perfRec.cursor++];
      for(const k in f.v) perfApply(k, f.v[k]);
    }
    if(perfRec.cursor >= perfRec.data.length && perfRec.t >= perfRec.len){
      if(perfRec.loop){
        perfRec.t = 0; perfRec.cursor = 0;
        const f0 = perfRec.data[0];
        for(const k in f0.v) perfApply(k, f0.v[k]);
      } else { perfRec.mode = "off"; }
    }
    refreshUIThrottled();
  }
  refreshPerfUI();
}
let uiThrottle = 0;
function refreshUIThrottled(){
  if(++uiThrottle % 6) return;
  refreshUI();
}
function refreshPerfUI(){
  const st = document.getElementById("perfState");
  if(!st) return;
  const m = perfRec.mode;
  st.textContent = (m==="off" ? (perfRec.len ? "TAKE "+perfRec.len.toFixed(1)+"s" : "NO TAKE")
                  : m==="rec" ? "REC "+perfRec.t.toFixed(1)+"s"
                  : "PLAY "+perfRec.t.toFixed(1)+" / "+perfRec.len.toFixed(1)+"s");
  const rb = document.getElementById("perfRecBtn"), pb = document.getElementById("perfPlayBtn"),
        lb = document.getElementById("perfLoopBtn");
  if(rb) rb.classList.toggle("rec-on", m==="rec");
  if(pb) pb.classList.toggle("on", m==="play");
  if(lb) lb.classList.toggle("on", perfRec.loop);
}

/* keyboard */
const KEYBEND = {q:"sync", w:"roll", e:"rainbow", r_shift:null, t:"melt", y:"kill"};
function typingNow(e){
  const t = e.target;
  return t && (t.tagName==="INPUT" || t.tagName==="SELECT" || t.tagName==="TEXTAREA" || t.isContentEditable);
}
window.addEventListener("keydown", e=>{
  if(typingNow(e)) return;
  const k = e.key.toLowerCase();
  if(k>="1" && k<="8" && e.shiftKey){ window.__snapHit(+k-1); return; }
  if(k>="1" && k<="9"){ loadPreset(+k-1); return; }
  if(k==="v"){ setMultiView(!multiView); return; }
  if(k===" "){ e.preventDefault(); randomizeAll(); return; }
  if(k==="m"){ mutate(); return; }
  if(k==="z"){ undo(); return; }
  if(k==="f"){ document.getElementById("btnFull").click(); return; }
  if(k==="s"){ document.getElementById("btnSnap").click(); return; }
  if(k==="h"){ help.classList.toggle("show"); return; }
  if(k==="d"){ setDock(dockTab==="mod" ? "matrix" : "mod"); return; }
  if(k==="p"){ btnPlay.click(); return; }
  if(k==="b"){ setBypass(true); return; }
  if(k==="q"){ bendHeld.sync=true; markBend("sync",true); }
  if(k==="w"){ bendHeld.roll=true; markBend("roll",true); }
  if(k==="e"){ bendHeld.rainbow=true; markBend("rainbow",true); }
  if(k==="r" && !e.metaKey && !e.ctrlKey){ if(e.repeat) return; bendHeld.drop=true; markBend("drop",true); }
  if(k==="t"){ bendHeld.melt=true; markBend("melt",true); }
  if(k==="y"){ bendHeld.kill=true; markBend("kill",true); }
});
window.addEventListener("keyup", e=>{
  if(typingNow(e)) return;
  const k = e.key.toLowerCase();
  if(k==="b") setBypass(false);
  if(k==="q"){ bendHeld.sync=false; markBend("sync",false); }
  if(k==="w"){ bendHeld.roll=false; markBend("roll",false); }
  if(k==="e"){ bendHeld.rainbow=false; markBend("rainbow",false); }
  if(k==="r"){ if(bendHeld.drop){ bendHeld.drop=false; markBend("drop",false); } else if(!e.metaKey && !e.ctrlKey) toggleRec(); }
  if(k==="t"){ bendHeld.melt=false; markBend("melt",false); }
  if(k==="y"){ bendHeld.kill=false; markBend("kill",false); }
});
function markBend(id, on){
  const el = document.querySelector(".bend[data-bend='"+id+"']");
  if(el) el.classList.toggle("held", on);
}

/* drag & drop */
const dropHint = document.getElementById("dropHint");
function isFileDrag(e){
  if(dragStage) return false;                       /* reordering the chain, not dropping a file */
  const t = e.dataTransfer && e.dataTransfer.types;
  return !t || Array.prototype.indexOf.call(t, "Files") !== -1;
}
window.addEventListener("dragover", e=>{
  if(!isFileDrag(e)) return;
  e.preventDefault(); dropHint.classList.add("show");
});
window.addEventListener("dragleave", e=>{ if(e.relatedTarget===null) dropHint.classList.remove("show"); });
window.addEventListener("drop", e=>{
  dropHint.classList.remove("show");
  if(!isFileDrag(e)) return;
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if(f) handleFile(f, activeChan);
});

/* ---------------- physical sync model (CPU-side PLL simulation) ----------------
   Real sync corruption isn't random rectangles: it's a phase-locked loop losing
   grip. We evolve smooth correlated processes per scanline and hand the GPU a
   displacement/gain/noise profile each frame. */
const SNC = 25;
/* per-channel PLL state: each channel is its own deck, so each drifts on its own */
function newSyncState(){
  return {ou:new Float32Array(SNC), ouf:new Float32Array(SNC), ev:[],
          trackC:0.65, trackV:0, hunt:0, huntPh:Math.random()*6.28,
          clogC:0.5+ (Math.random()-0.5)*0.5, clogV:0, creaseJ:0};
}
const syncState = {};
const dispData = new Float32Array(SROWS*SCHAN*4);
function gaussR(){ return (Math.random()+Math.random()+Math.random()-1.5)*1.633; }

function updateSyncChannel(ch, ci, dt, t){
  if(!syncState[ch]) syncState[ch] = newSyncState();
  const S = syncState[ch];
  const g = id=>getCur(id, ch);
  const jit=g("jitter"), tear=g("tear"), tsz=g("tearSize"), wob=g("hWobble"), wfq=g("wobbleFreq"),
        wow=g("tapeWow"), wowR=g("wowRate"), flut=g("flutter"), trk=g("tracking"),
        tph=g("trackPhase"), hunt=g("trackHunt"), hsw=g("headSwitch"), sp=g("tapeSpeed"),
        stre=g("tapeStretch"), crs=g("crease"), crsP=g("creasePos"), clog=g("headClog"), azi=g("azimuth");
  const sdt = Math.min(dt, 0.05), rq = Math.sqrt(sdt);
  for(let i=0;i<SNC;i++){
    S.ou[i]  += -6*S.ou[i]*sdt  + 2.4*rq*gaussR();
    S.ouf[i] += -45*S.ouf[i]*sdt + 10*rq*gaussR();
  }
  /* spawn loss-of-lock events: sharp shear at one line, exponential re-lock below */
  const rate = tear*tear*15 + trk*1.1 + sp*0.6;
  if(Math.random() < rate*sdt && S.ev.length < 10){
    const whole = Math.random() < 0.18;   // occasionally the whole frame gets sucked sideways
    S.ev.push({
      t0:t, r0: whole ? SROWS-1 : Math.floor(Math.random()*SROWS),
      A:(0.05+0.45*Math.random()*Math.random())*(Math.random()<0.5?-1:1)*(0.35+0.65*tear),
      L:(10+tsz*90)*(0.5+Math.random())*(whole?6:1),
      rel:0.08+Math.random()*0.5, env:0});
  }
  for(const ev of S.ev){
    const age = t-ev.t0;
    ev.env = Math.min(age/0.03,1)*Math.exp(-Math.max(0,age-0.03)/ev.rel);
  }
  S.ev = S.ev.filter(ev=>ev.env>0.012);
  /* tracking band drifts vertically like a real mistracking head */
  S.trackV += -0.6*S.trackV*sdt + 0.35*rq*gaussR();
  S.trackC += S.trackV*sdt*0.25;
  if(S.trackC<0.08){S.trackC=0.08; S.trackV=Math.abs(S.trackV);}
  if(S.trackC>0.92){S.trackC=0.92; S.trackV=-Math.abs(S.trackV);}
  /* servo hunt: the auto-tracking circuit searching, overshooting, snapping back */
  S.huntPh += sdt*(0.35 + hunt*2.4);
  const huntTri = Math.abs(((S.huntPh*0.5)%1)*2-1);
  S.hunt = hunt*(huntTri-0.5)*0.55 + hunt*0.10*Math.sin(S.huntPh*9.3);
  const bandC = Math.min(0.97, Math.max(0.03, S.trackC + tph*0.45 + S.hunt));
  /* head clog: a dead band that wanders slowly and kills the signal inside it */
  S.clogV += -0.25*S.clogV*sdt + 0.10*rq*gaussR();
  S.clogC += S.clogV*sdt*0.2;
  if(S.clogC<0.05){S.clogC=0.05; S.clogV=Math.abs(S.clogV);}
  if(S.clogC>0.95){S.clogC=0.95; S.clogV=-Math.abs(S.clogV);}
  /* tape crease: a hard fold that shears one band sideways and jitters frame to frame */
  S.creaseJ += (gaussR()*0.5 - S.creaseJ)*Math.min(1, sdt*22);
  const hsRows = Math.max(0, Math.floor(SROWS*0.05*hsw*(1.0+sp)));
  const bw = 0.035+0.05*trk + hunt*0.02;
  const wowF1 = 5.2*(0.25+wowR*3.0), wowF2 = 17.0*(0.25+wowR*3.0);
  const wowT1 = t*0.9*(0.3+wowR*2.6), wowT2 = t*1.4*(0.3+wowR*2.6);
  const clogW = 0.012 + clog*0.075, creaseW = 0.006 + crs*0.03;
  const off = ci*SROWS*4;
  for(let r=0;r<SROWS;r++){
    const fy = r/SROWS;
    let d = (Math.sin(fy*wowF1+wowT1)+0.6*Math.sin(fy*wowF2-wowT2))*0.006*wow
          + Math.sin(fy*(6.0+wfq*80.0)+t*4.2)*0.013*wob;
    /* scrape flutter: fast, low-amplitude, high spatial frequency */
    if(flut>0.003) d += Math.sin(fy*(120.0+flut*420.0)+t*37.0)*0.004*flut
                      + Math.sin(fy*(311.0)-t*61.0)*0.0022*flut;
    /* tape stretch: the top of the frame reads long, so geometry leans */
    if(stre>0.003){ const k=1.0-fy; d += k*k*0.06*stre; }
    const xc = fy*(SNC-1), ic = Math.min(SNC-2, Math.floor(xc)), fc = xc-ic;
    const sm = fc*fc*(3-2*fc);
    const ouv  = S.ou[ic]*(1-sm)+S.ou[ic+1]*sm;
    const oufv = S.ouf[ic]*(1-sm)+S.ouf[ic+1]*sm;
    d += ouv*0.004*(0.12+jit);            // the picture is never perfectly still
    const g0 = (fy-bandC)/bw;
    const bp = Math.exp(-g0*g0);
    d += bp*trk*oufv*0.02;
    let ng = bp*trk*(0.3+0.4*Math.abs(oufv));
    let hf = bp*trk*0.35 + sp*0.12;
    for(const ev of S.ev){
      if(r<=ev.r0) d += ev.A*ev.env*Math.exp(-(ev.r0-r)/ev.L);
    }
    if(r<hsRows){
      const k = (hsRows-r)/hsRows;
      d += (0.045*k*k + 0.02*k*oufv)*hsw;
      ng += hsw*0.9*k*k;
      hf += hsw*0.5*k;
    }
    /* head clog band: no RF, so no chroma and no detail, just noise */
    if(clog>0.003){
      const gc = (fy-S.clogC)/clogW;
      const cb = Math.exp(-gc*gc);
      ng += cb*clog*1.5;
      hf += cb*clog;
    }
    /* crease */
    if(crs>0.003){
      const gk = (fy-crsP)/creaseW;
      const cb = Math.exp(-gk*gk);
      d += cb*crs*(0.09 + 0.05*S.creaseJ);
      ng += cb*crs*0.8;
      hf += cb*crs*0.7;
    }
    /* azimuth error: alternate head passes lose the high band */
    if(azi>0.003) hf += azi*0.75*(r%2);
    const gn = 1 - Math.min(0.38, Math.abs(d)*2.0) - Math.min(0.5, ng*0.18);
    const o = off + r*4;
    dispData[o]=d; dispData[o+1]=gn; dispData[o+2]=ng; dispData[o+3]=Math.min(1, hf);
  }
}
function updateSyncModel(dt, t){
  for(let ci=0; ci<CHANNELS.length && ci<SCHAN; ci++) updateSyncChannel(CHANNELS[ci], ci, dt, t);
  gl.bindTexture(gl.TEXTURE_2D, dispTex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,SROWS,SCHAN,0,gl.RGBA,gl.FLOAT,dispData);
}

/* ---------------- main loop ---------------- */
const osd = document.getElementById("osd");
let lastT = performance.now()/1000, fpsAcc=0, fpsN=0, fpsShow=0;
const stutterHeld = {}, stutterT = {};
for(const ch of CHANNELS){ stutterHeld[ch]=false; stutterT[ch]=0; }
let offline = false, liveList = "A";

/* video content analysis — the picture itself as a mod source (reads channel A) */
const anaC = document.createElement("canvas"); anaC.width=32; anaC.height=18;
const anaCtx = anaC.getContext("2d", {willReadFrequently:true});
const anaPrev = new Float32Array(576);
let mdAvg=0.02, motionPeak=0.05, cutV=0;
function updateContentAnalysis(dt){
  const S = SRC.A;
  let src = null;
  if(S.mode==="pattern" || S.mode==="text") src = S.patCanvas;
  else if(S.video.readyState>=2 && S.video.videoWidth>0) src = S.video;
  if(!src){ modVal.motion *= 1-Math.min(1,dt*4); cutV *= Math.exp(-dt*5); modVal.cut = cutV; return; }
  try{ anaCtx.drawImage(src, 0, 0, 32, 18); }catch(e){ return; }
  const d = anaCtx.getImageData(0,0,32,18).data;
  let sum=0, diff=0;
  for(let i=0,j=0;i<d.length;i+=4,j++){
    const l = (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114)/255;
    sum += l; diff += Math.abs(l-anaPrev[j]); anaPrev[j] = l;
  }
  const mean = sum/576, md = diff/576;
  modVal.bright = mean;
  motionPeak = Math.max(motionPeak*(1-dt*0.05), md, 0.02);
  modVal.motion += (Math.min(1, md/motionPeak) - modVal.motion)*Math.min(1, dt*10);
  if(md > Math.max(0.06, mdAvg*3.5)) cutV = 1;
  mdAvg = mdAvg*0.95 + md*0.05;
  cutV *= Math.exp(-dt*5);
  modVal.cut = cutV;
}

function sizeCanvas(){
  if(offline) return;
  const wrap = document.getElementById("canvasWrap");
  if(!wrap) return;
  const dpr = Math.min(window.devicePixelRatio||1, isTouch ? 1.5 : 2);
  const cw = Math.max(2, wrap.clientWidth), ch = Math.max(2, wrap.clientHeight);
  /* the picture keeps the processing raster's aspect and is letterboxed inside
     the pane, so it is never stretched to whatever shape the window happens to
     be — and the pop-out, which mirrors this canvas, stays correct too */
  const ar = procW/procH;
  let dw = cw, dh = cw/ar;
  if(dh > ch){ dh = ch; dw = ch*ar; }
  canvas.style.width = dw+"px"; canvas.style.height = dh+"px";
  canvas.style.left = Math.round((cw-dw)/2)+"px";
  canvas.style.top  = Math.round((ch-dh)/2)+"px";
  const mv = document.getElementById("mvlabels");
  if(mv){
    mv.style.width = dw+"px"; mv.style.height = dh+"px";
    mv.style.left = canvas.style.left; mv.style.top = canvas.style.top;
  }
  const w = Math.max(2, Math.floor(dw*dpr)), h = Math.max(2, Math.floor(dh*dpr));
  if(canvas.width!==w || canvas.height!==h){ canvas.width=w; canvas.height=h; }
}
window.addEventListener("resize", sizeCanvas);

function runPass(pr, inTex, outFbo, outW, outH, extras, ch){
  gl.bindFramebuffer(gl.FRAMEBUFFER, outFbo);
  gl.viewport(0,0,outW,outH);
  gl.useProgram(pr.prog);
  gl.uniform2f(U(pr,"u_res"), outW, outH);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, inTex);
  gl.uniform1i(U(pr,"u_tex"), 0);
  if(extras) extras(pr);
  setParamUniforms(pr, ch);
  draw();
}
function sigExtras(pr, now, ch){
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, dispTex);
  gl.uniform1i(U(pr,"u_dispT"), 1);
  gl.uniform1f(U(pr,"u_rows"), SROWS);
  gl.uniform1f(U(pr,"u_rollBar"), Math.min(1, Math.pow(Math.abs(getCur("vRoll",ch)),1.2)*5));
  gl.uniform1f(U(pr,"u_time"), now);
  gl.uniform1f(U(pr,"u_frame"), frameNo);
  gl.uniform1f(U(pr,"u_bypass"), bypass);
  gl.uniform1f(U(pr,"u_vrollpos"), vrollpos[ch]);
  gl.uniform1f(U(pr,"u_humpos"), humpos[ch]);
  gl.uniform1f(U(pr,"u_keyMode"), keyChroma?1:0);
  gl.uniform1f(U(pr,"u_chanIdx"), Math.max(0, CHANNELS.indexOf(ch)));
  const tp = transport[ch] || "play";
  gl.uniform1f(U(pr,"u_tpStill"), tp==="still" ? 0.75 : 0);
  gl.uniform1f(U(pr,"u_tpShuttle"), tp==="ff" ? 0.55 : (tp==="rew" ? -0.55 : 0));
}
function colExtras(pr, now){
  gl.uniform1f(U(pr,"u_time"), now);
  gl.uniform1f(U(pr,"u_bypass"), bypass);
  gl.uniform1f(U(pr,"u_keyMode"), keyChroma?1:0);
  gl.uniform1f(U(pr,"u_showKey"), showKeyMatte?1:0);
}
const FLOW_IDS = ["mosh","moshVec","melt","swirl","moshBlock","timeGrad","flowStretch","flowRepel","flowNoise","flowHue","flowFade"];
const LAB_IDS = ["sparseJit","ntscArt","ntscFringe","snow","fmAmt","slitscan","bitCrush","bandKey","rowSmear","moire","fieldMod"];
function stageNeeded(id, ch){
  if(id === "lab") return LAB_IDS.some(k=>getCur(k,ch)>0.003);
  if(id === "glitch") return getCur("pixelSort",ch)>0.003 || getCur("blockShift",ch)>0.003 || getCur("dotify",ch)>0.003 || getCur("driftWarp",ch)>0.003 || getCur("fmWarp",ch)>0.003;
  if(id === "flow") return FLOW_IDS.some(k=>Math.abs(getCur(k,ch))>0.003);
  return true;
}
function runStage(id, inTex, dstRT, now, ch){
  const C = chanRT[ch];
  if(id === "sig")    return runPass(progSIG, inTex, dstRT.fbo, procW, procH, pr=>sigExtras(pr,now,ch), ch);
  if(id === "col")    return runPass(progCOL, inTex, dstRT.fbo, procW, procH, pr=>colExtras(pr,now), ch);
  if(id === "glitch") return runPass(progGLITCH, inTex, dstRT.fbo, procW, procH, pr=>{ gl.uniform1f(U(pr,"u_time"), now); }, ch);
  if(id === "lab")    return runPass(progLAB, inTex, dstRT.fbo, procW, procH, pr=>{
    gl.uniform1f(U(pr,"u_time"), now); gl.uniform1f(U(pr,"u_frame"), frameNo);
    gl.uniform1f(U(pr,"u_fieldSrc"), fieldSrc);
  }, ch);
  if(id === "flow"){
    /* if the stage has been idle, prime its history with the live picture so it
       doesn't fade up from black (or flash a stale frame) when you turn it on */
    if(frameNo - (C.flowLast || -99) > 1){
      runPass(progCOPY, inTex, C.flowA.fbo, procW, procH, null, ch);
      runPass(progCOPY, inTex, C.flowSrc.fbo, procW, procH, null, ch);
    }
    C.flowLast = frameNo;
    runPass(progFLOW, inTex, dstRT.fbo, procW, procH, pr=>{
      gl.uniform1f(U(pr,"u_time"), now);
      gl.uniform1f(U(pr,"u_flowField"), flowField);
      gl.uniform1f(U(pr,"u_flowEdge"), flowEdge);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, C.flowA.tex);
      gl.uniform1i(U(pr,"u_flowPrev"), 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, C.flowSrc.tex);
      gl.uniform1i(U(pr,"u_srcPrev"), 2);
    }, ch);
    /* keep this frame's input for next frame's motion estimate */
    runPass(progCOPY, inTex, C.flowSrc.fbo, procW, procH, null, ch);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, dstRT.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, C.flowB.fbo);
    gl.blitFramebuffer(0,0,procW,procH, 0,0,procW,procH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    const t = C.flowA; C.flowA = C.flowB; C.flowB = t;
    return;
  }
}

function srcReady(ch){
  const S = SRC[ch];
  if(S.mode === "pattern" || S.mode === "text" || S.mode === "synth" || S.mode === "feed") return true;
  return S.video.readyState >= 2 && S.video.videoWidth > 0;
}
window.__chanHasSource = srcReady;

/* upload a channel's source frame into its texture */
function uploadSource(ch, dt){
  const S = SRC[ch];
  if(S.mode === "synth" || S.mode === "feed"){ S.aspect = procW/procH; S.has = 1; S.patClock += dt*S.speed; return; }
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, srcTex[ch]);
  if(S.mode === "pattern" || S.mode === "text"){
    S.patClock += dt*S.speed*(S.tpRate===undefined?1:S.tpRate);
    if(S.mode === "text") drawTextSource(S, S.patClock); else drawPattern(S, S.patClock);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, S.patCanvas);
    S.aspect = S.patCanvas.width/S.patCanvas.height; S.has = 1;
  } else if(S.video.readyState >= 2 && S.video.videoWidth > 0){
    try{
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, S.video);
      S.aspect = S.video.videoWidth/S.video.videoHeight; S.has = 1;
    }catch(err){}
  }
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
}

/* run one channel's entire chain, leaving the result in chanRT[ch].out */
/* the pattern synth is computed straight into a render target, so it costs one
   full-screen pass and needs no canvas upload */
function renderGen(ch, now){
  const C = chanRT[ch], M = genMode[ch];
  gl.bindFramebuffer(gl.FRAMEBUFFER, C.gen.fbo);
  gl.viewport(0,0,procW,procH);
  gl.useProgram(progGEN.prog);
  gl.uniform2f(U(progGEN,"u_res"), procW, procH);
  gl.uniform1f(U(progGEN,"u_time"), now);
  gl.uniform1f(U(progGEN,"u_shape"), M.shape);
  gl.uniform1f(U(progGEN,"u_wave"), M.wave);
  gl.uniform1f(U(progGEN,"u_colmode"), M.col);
  setParamUniforms(progGEN, ch);
  draw();
  return C.gen.tex;
}
function renderChannel(ch, now, dt){
  ensureChanRT(ch);
  const C = chanRT[ch], S = SRC[ch];
  const chanSrcTex = (S.mode === "synth") ? renderGen(ch, now)
                   : (S.mode === "feed") ? feedTex(S.feed || "PGM")
                   : srcTex[ch];

  /* time base: bent frame store */
  const delayN = Math.max(1, Math.min(RING_N-1, Math.round(getCur("delayF",ch))));
  const useTime = getCur("echo",ch)>0.003 || getCur("stutter",ch)>0.003 || stutterHeld[ch];
  if(useTime) ensureRing(C);
  if(getCur("stutter",ch)>0.003){
    if(!stutterHeld[ch] && Math.random() < Math.pow(getCur("stutter",ch),2)*dt*10){
      stutterHeld[ch] = true; stutterT[ch] = 0.08 + Math.random()*0.6*getCur("stutter",ch);
    }
  }
  if(stutterHeld[ch]){ stutterT[ch] -= dt; if(stutterT[ch]<=0) stutterHeld[ch]=false; }
  const hasDelay = (C.ring && C.ringFilled >= delayN) ? 1 : 0;
  const readIdx = C.ring ? ((C.ringW - delayN + RING_N*2) % RING_N) : 0;

  /* pass 1: source framing + feedback + echo */
  gl.bindFramebuffer(gl.FRAMEBUFFER, C.fbNext.fbo);
  gl.viewport(0,0,procW,procH);
  gl.useProgram(progFB.prog);
  gl.uniform2f(U(progFB,"u_res"), procW, procH);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, chanSrcTex);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, (rescanMode?C.crt:C.fbPrev).tex);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, hasDelay?C.ring[readIdx].tex:chanSrcTex);
  gl.uniform1i(U(progFB,"u_src"), 0);
  gl.uniform1i(U(progFB,"u_prev"), 1);
  gl.uniform1i(U(progFB,"u_delayT"), 2);
  gl.uniform1f(U(progFB,"u_srcAspect"), S.aspect);
  gl.uniform1f(U(progFB,"u_hasSrc"), S.has);
  gl.uniform1f(U(progFB,"u_hasDelay"), hasDelay);
  gl.uniform1f(U(progFB,"u_time"), now);
  gl.uniform1f(U(progFB,"u_fbMode"), fbTrailMode?1:0);
  gl.uniform1f(U(progFB,"u_keyMode"), keyChroma?1:0);
  gl.uniform1f(U(progFB,"u_edgeMode"), edgeMode);
  gl.uniform1f(U(progFB,"u_fbWrap"), fbWrap);
  gl.uniform1f(U(progFB,"u_fbMirror"), fbMirror);
  gl.uniform1f(U(progFB,"u_fbBlend"), fbBlend);
  gl.uniform1f(U(progFB,"u_fbNL"), fbNL);
  gl.uniform1f(U(progFB,"u_fbInvert"), fbInvert?1:0);
  gl.uniform1f(U(progFB,"u_autoGain"), autoGain[ch]);
  setParamUniforms(progFB, ch);
  draw();

  /* frame ring capture (frozen while stuttering) */
  if(useTime && C.ring && !stutterHeld[ch]){
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, C.fbNext.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, C.ring[C.ringW].fbo);
    gl.blitFramebuffer(0,0,procW,procH, 0,0,procW,procH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    C.ringW = (C.ringW+1)%RING_N; C.ringFilled = Math.min(C.ringFilled+1, RING_N);
  }

  /* FX chain in the order set on the rail */
  const active = chainOrder.filter(id=>stageEnabled[id] && stageNeeded(id, ch));
  let srcT = C.fbNext.tex;
  const scratch = [scratch1, scratch2];
  let si = 0;
  for(let k=0; k<active.length; k++){
    const last = (k === active.length-1);
    const dst = last ? C.out : scratch[si];
    runStage(active[k], srcT, dst, now, ch);
    srcT = dst.tex;
    si ^= 1;
  }
  if(active.length === 0) runPass(progCOPY, srcT, C.out.fbo, procW, procH, null, ch);

  /* this channel's output becomes next frame's feedback source */
  const t = C.fbPrev; C.fbPrev = C.out; C.out = t;
  /* keep .out pointing at the freshly rendered image */
  const swap = C.fbPrev; C.fbPrev = C.out; C.out = swap;
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, C.out.fbo);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, C.fbPrev.fbo);
  gl.blitFramebuffer(0,0,procW,procH, 0,0,procW,procH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
}

function renderFrame(now, dt){
  frameNo++;
  sizeCanvas();
  updateAudio(dt);
  driveTransport(dt);
  updateContentAnalysis(dt);
  updateGlide(dt);
  updatePerf(dt);
  updateMod(dt, now);
  pushModHistory();
  applyParams(dt);
  updateSyncModel(dt, now);
  /* feedback auto-level servo — keeps the loop off the black/white attractors */
  for(const ch of CHANNELS){
    const amt = getCur("fbAuto", ch);
    if(amt > 0.003){
      const target = 0.42;
      const err = target - (modVal.bright || 0.4);
      autoGain[ch] = Math.max(0.6, Math.min(1.4, autoGain[ch] + err*dt*1.2*amt));
    } else autoGain[ch] += (1-autoGain[ch])*Math.min(1, dt*3);
  }

  for(const ch of CHANNELS){
    const vr = getCur("vRoll",ch);
    vrollpos[ch] = (vrollpos[ch] + Math.sign(vr)*Math.pow(Math.abs(vr),2.2)*dt*3.0) % 1;
    humpos[ch] = (humpos[ch] + dt*(0.05 + getCur("humBar",ch)*0.1)) % 1;
  }

  /* a channel only costs anything when its fader can actually let it through */
  const b1 = busSrc.b1, b2 = busSrc.b2;
  const masterLive = mCur.busMix > 0.0005 || multiView;
  const live = {A:false, B:false, C:false, D:false};
  live[b1[0]] = true;
  if(srcReady(b1[1]) && (mCur.abMix > 0.0005 || multiView)) live[b1[1]] = true;
  if(masterLive){
    if(srcReady(b2[0])) live[b2[0]] = true;
    if(srcReady(b2[1]) && (mCur.cdMix > 0.0005 || multiView)) live[b2[1]] = true;
  }
  /* a re-entry source only works if the channel it is reading is still rendering */
  for(let pass=0; pass<3; pass++){
    for(const ch of CHANNELS){
      if(!live[ch]) continue;
      const S = SRC[ch];
      if(S.mode !== "feed") continue;
      const f = S.feed || "PGM";
      if(f === "BUS1" || f === "BUS2" || f === "PGM") continue;
      if(f !== ch && !live[f] && srcReady(f)) live[f] = true;
    }
  }
  liveList = CHANNELS.filter(c=>live[c]).join("+");
  for(const ch of CHANNELS){
    if(!live[ch]) continue;
    uploadSource(ch, dt);
    renderChannel(ch, now, dt);
  }

  /* mixer tree: BUS 1 and BUS 2 each take any two channels, then MASTER
     crossfades the two buses. So A can meet C, or D can meet B. */
  function mixPass(dstRT, texA, texB, hasB, ids, mode, inv){
    gl.bindFramebuffer(gl.FRAMEBUFFER, dstRT.fbo);
    gl.viewport(0,0,procW,procH);
    gl.useProgram(progMIX.prog);
    gl.uniform2f(U(progMIX,"u_res"), procW, procH);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB);
    gl.uniform1i(U(progMIX,"u_texA"), 0);
    gl.uniform1i(U(progMIX,"u_texB"), 1);
    gl.uniform1f(U(progMIX,"u_hasB"), hasB?1:0);
    gl.uniform1f(U(progMIX,"u_mixMode"), mode);
    gl.uniform1f(U(progMIX,"u_wipeInv"), inv?1:0);
    setParamUniforms(progMIX, "A");
    for(let i=0;i<MIXP.length;i++) gl.uniform1f(U(progMIX,"u_"+MIXP[i]), mCur[ids[i]]);
    draw();
  }
  if(masterLive){
    mixPass(busOut1, chanOutTex(b1[0]), chanOutTex(b1[1]), live[b1[1]], MIXBUS.b1, mixMode, wipeInv);
    mixPass(busOut2, chanOutTex(b2[0]), chanOutTex(b2[1]), live[b2[1]], MIXBUS.b2, mixMode2, wipeInv2);
    mixPass(mixOut, busOut1.tex, busOut2.tex, true, MIXBUS.bM, mixModeM, wipeInvM);
  } else {
    /* nothing on bus 2, so bus 1 goes straight to master and costs one pass, as before */
    mixPass(mixOut, chanOutTex(b1[0]), chanOutTex(b1[1]), live[b1[1]], MIXBUS.b1, mixMode, wipeInv);
  }

  if(multiView){
    for(const ch of CHANNELS) ensureChanRT(ch);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.useProgram(progMULTI.prog);
    gl.uniform2f(U(progMULTI,"u_res"), canvas.width, canvas.height);
    const bind = (unit, name, tex)=>{
      gl.activeTexture(gl.TEXTURE0+unit); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(U(progMULTI,name), unit);
    };
    bind(0,"u_a",chanOutTex("A")); bind(1,"u_b",chanOutTex("B"));
    bind(2,"u_c",chanOutTex("C")); bind(3,"u_d",chanOutTex("D"));
    bind(4,"u_b1",busOut1.tex);     bind(5,"u_pgm",mixOut.tex);
    const cellOf = {A:0,B:1,C:3,D:4};
    gl.uniform1f(U(progMULTI,"u_active"), cellOf[activeChan]);
    for(const ch of CHANNELS) gl.uniform1f(U(progMULTI,"u_live"+ch), live[ch]?1:0);
    draw();
    frameEnd(now, dt);
    return;
  }

  /* CRT -> screen */
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.useProgram(progCRT.prog);
  gl.uniform2f(U(progCRT,"u_res"), canvas.width, canvas.height);
  gl.uniform2f(U(progCRT,"u_procRes"), procW, procH);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mixOut.tex);
  gl.uniform1i(U(progCRT,"u_tex"), 0);
  gl.uniform1f(U(progCRT,"u_time"), now);
  gl.uniform1f(U(progCRT,"u_outModel"), outModel);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, persistA.tex);
  gl.uniform1i(U(progCRT,"u_persist"), 1);
  gl.uniform1f(U(progCRT,"u_hasPersist"), mCur.phosphor>0.003?1:0);
  setParamUniforms(progCRT, "A");
  draw();

  /* phosphor persistence store */
  if(mCur.phosphor > 0.003){
    gl.bindFramebuffer(gl.FRAMEBUFFER, persistB.fbo);
    gl.viewport(0,0,procW,procH);
    gl.useProgram(progCRT.prog);
    gl.uniform2f(U(progCRT,"u_res"), procW, procH);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mixOut.tex);
    draw();
    const t = persistA; persistA = persistB; persistB = t;
  }

  /* full rescan: give each channel a CRT-processed copy to eat next frame */
  if(rescanMode){
    for(const ch of CHANNELS){
      if(!chanRT[ch].allocated) continue;
      gl.bindFramebuffer(gl.FRAMEBUFFER, chanRT[ch].crt.fbo);
      gl.viewport(0,0,procW,procH);
      gl.uniform2f(U(progCRT,"u_res"), procW, procH);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, chanRT[ch].out.tex);
      draw();
    }
  }

  frameEnd(now, dt);
}
function frameEnd(now, dt){
  if(offline) return;
  const S = cur();
  if(S.mode==="file" && S.video.duration && !seeking){
    seek.value = S.video.currentTime/S.video.duration;
    tcode.textContent = fmtT(S.video.currentTime)+" / "+fmtT(S.video.duration);
  } else if(S.mode!=="file"){
    tcode.textContent = "--:-- / --:--";
  }
  fpsAcc += 1/Math.max(dt,1e-4); fpsN++;
  if(fpsN>=30){ fpsShow = Math.round(fpsAcc/fpsN); fpsAcc=0; fpsN=0;
    osd.textContent = procH+"p \u00b7 "+fpsShow+" fps"+(" \u00b7 "+liveList)+(multiView?" \u00b7 MULTI":"")+(recorder?" \u00b7 REC":"")+(perfRec.mode!=="off"?" \u00b7 "+perfRec.mode.toUpperCase():"")+(audioMode!=="off"?" \u00b7 AUD":"")+(rescanMode?" \u00b7 RESCAN":"");
    updateTempoUI();
  }
}

let lastTickMs = 0;
function doTick(){
  if(offline) return;
  const nowMs = performance.now();
  if(nowMs - lastTickMs < 6) return;
  lastTickMs = nowMs;
  const now = nowMs/1000;
  let dt = now-lastT; lastT = now;
  dt = Math.min(dt, 0.1);
  renderFrame(now, dt);
  if(outTrack && outTrack.requestFrame){ try{ outTrack.requestFrame(); }catch(e){} }
}
window.__tick = doTick;
function frame(){
  requestAnimationFrame(frame);
  doTick();
}

/* ---------------- offline MP4 render (WebCodecs) ---------------- */
let renderCancel = false;
document.getElementById("btnRenderCancel").onclick = ()=>{ renderCancel = true; };
document.getElementById("btnRender").onclick = ()=>{ offlineRender().catch(e=>{
  console.error(e); toast("Render failed: "+e.message, true);
  offline=false; document.getElementById("renderOv").style.display="none";
}); };
async function offlineRender(){
  if(SRC.A.mode!=="file" || !SRC.A.video.duration){ toast("Load a video file into channel A first", true); return; }
  if(!("VideoEncoder" in window)){ toast("This browser has no WebCodecs — use Chrome", true); return; }
  const fps = 30, W = procW, H = procH;
  const candidates = [["avc1.640028","avc"],["avc1.42003e","avc"],["vp09.00.10.08","vp9"]];
  let codec=null, mcodec=null;
  for(const [c,m] of candidates){
    try{
      const s = await VideoEncoder.isConfigSupported({codec:c, width:W, height:H, bitrate:14_000_000, framerate:fps});
      if(s.supported){ codec=c; mcodec=m; break; }
    }catch(e){}
  }
  if(!codec){ toast("No supported video encoder found", true); return; }
  offline = true; renderCancel = false;
  const ov = document.getElementById("renderOv");
  const ovTxt = document.getElementById("renderTxt");
  const ovBar = document.getElementById("renderBar");
  ov.style.display = "flex";
  const wasPlaying = !video.paused;
  video.pause(); videoB.pause();
  const oldW = canvas.width, oldH = canvas.height;
  canvas.width = W; canvas.height = H;
  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: {codec: mcodec, width: W, height: H},
    fastStart: "in-memory",
  });
  const enc = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: e => { console.error(e); toast("Encoder error: "+e.message, true); renderCancel = true; },
  });
  enc.configure({codec, width:W, height:H, bitrate:14_000_000, framerate:fps});
  const total = Math.max(1, Math.floor(video.duration*fps));
  const seekTo = (v,t)=>new Promise(res=>{
    const h = ()=>{ v.removeEventListener("seeked", h); res(); };
    v.addEventListener("seeked", h);
    v.currentTime = Math.min(t, v.duration-0.001);
  });
  const t0 = 1000;   // virtual clock offset so time-based effects behave
  for(let i=0; i<total && !renderCancel; i++){
    const t = i/fps;
    await seekTo(video, t);
    for(const ch of ["B","C","D"]){ const v = SRC[ch].video; if(srcReady(ch) && v.duration) await seekTo(v, t % v.duration); }
    renderFrame(t0+t, 1/fps);
    const vf = new VideoFrame(canvas, {timestamp: Math.round(i*1e6/fps), duration: Math.round(1e6/fps)});
    enc.encode(vf, {keyFrame: i%(fps*2)===0});
    vf.close();
    while(enc.encodeQueueSize > 6 && !renderCancel) await new Promise(r=>setTimeout(r,5));
    if(i%3===0){
      ovTxt.textContent = "RENDERING "+Math.round(i/total*100)+"%  ("+i+"/"+total+" frames, "+codec.split(".")[0].toUpperCase()+")";
      ovBar.style.width = (i/total*100)+"%";
      await new Promise(r=>setTimeout(r,0));
    }
  }
  if(!renderCancel){
    ovTxt.textContent = "FINALIZING…";
    await enc.flush();
    muxer.finalize();
    const blob = new Blob([muxer.target.buffer], {type:"video/mp4"});
    dl(URL.createObjectURL(blob), "bendr-"+stamp()+".mp4");
    toast("Rendered "+total+" frames → MP4, "+(blob.size/1048576).toFixed(1)+" MB (video only — REC captures audio)");
  } else {
    try{ enc.close(); }catch(e){}
    toast("Render cancelled", true);
  }
  canvas.width = oldW; canvas.height = oldH;
  ov.style.display = "none";
  offline = false; lastT = performance.now()/1000;
  if(wasPlaying) video.play();
  for(const ch of ["B","C","D"]) if(SRC[ch].mode==="file") SRC[ch].video.play();
}

/* ---------------- init ---------------- */
window.__pcur = (id,ch)=>getCur(id,ch);
window.__dbg = ()=>({chan:activeChan,
  ...Object.fromEntries(CHANNELS.map(ch=>[ch,
    {mode:SRC[ch].mode, rs:SRC[ch].video.readyState, has:SRC[ch].has, spd:SRC[ch].speed, rate:SRC[ch].video.playbackRate}]))});

/* ---------------- init ---------------- */
const OUTPUT_MODE = (location.hash === "#output") && !!window.opener;
if(OUTPUT_MODE){
  /* this window is a clean output monitor: show the opener's canvas stream
     and drive the opener's render loop so the picture never freezes, even
     when the main window is fully occluded (e.g. this one is fullscreen). */
  document.title = "BENDR — OUTPUT";
  document.body.innerHTML = "";
  document.body.style.cssText = "margin:0;background:#000;overflow:hidden;cursor:none;";
  const pv = document.createElement("video");
  pv.muted = true; pv.autoplay = true; pv.playsInline = true;
  pv.style.cssText = "width:100vw;height:100vh;object-fit:contain;display:block;";
  document.body.appendChild(pv);
  const hookStream = ()=>{
    try{
      pv.srcObject = window.opener.__getOutputStream();
      pv.play().catch(()=>{});
    }catch(e){ setTimeout(hookStream, 300); }
  };
  hookStream();
  pv.ondblclick = ()=>{
    if(document.fullscreenElement) document.exitFullscreen();
    else pv.requestFullscreen().catch(()=>{});
  };
  (function driveLoop(){
    requestAnimationFrame(driveLoop);
    try{ if(window.opener && !window.opener.closed && window.opener.__tick) window.opener.__tick(); }catch(e){}
  })();
} else {
  /* mobile: one pane at a time via the bottom tab bar */
  function setMTab(t){
    document.body.classList.remove("mtab-controls","mtab-bends","mtab-matrix","mtab-video");
    document.body.classList.add("mtab-"+t);
    document.querySelectorAll("#mtabs button").forEach(b=>b.classList.toggle("on", b.dataset.mtab===t));
    try{ localStorage.setItem("bendr.mtab", t); }catch(e){}
    setTimeout(sizeCanvas, 60);
  }
  document.querySelectorAll("#mtabs button").forEach(b=>{
    b.onclick = ()=>{
      setMTab(b.dataset.mtab);
      if(b.dataset.mtab === "bends") setDock("perform");
      if(b.dataset.mtab === "matrix" && dockTab === "perform") setDock("matrix");
    };
  });
  let startTab = "controls";
  try{ startTab = localStorage.getItem("bendr.mtab") || "controls"; }catch(e){}
  setMTab(startTab);
  window.addEventListener("orientationchange", ()=>setTimeout(sizeCanvas, 250));

  /* touch devices: lighter default so phones hold framerate */
  if(isTouch){
    setProcRes(360);
    const rs = document.getElementById("selRes");
    if(rs) rs.value = "360";
  }

  buildPanel();
  buildMixStrip();
  buildModPage();
  buildPerformDock();
  setInterval(drawModPage, 50);
  setDock("matrix");
  {
    const bar = document.getElementById("dragbar"), low = document.getElementById("lower");
    let dragging = false;
    const move = e=>{
      if(!dragging) return;
      const y = (e.touches ? e.touches[0].clientY : e.clientY);
      const h = Math.max(110, Math.min(window.innerHeight-220, window.innerHeight - y));
      low.style.height = h + "px";
      sizeCanvas();
    };
    bar.addEventListener("mousedown", ()=>{ dragging = true; document.body.style.cursor="ns-resize"; });
    bar.addEventListener("touchstart", ()=>{ dragging = true; }, {passive:true});
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, {passive:true});
    window.addEventListener("mouseup", ()=>{ dragging=false; document.body.style.cursor=""; });
    window.addEventListener("touchend", ()=>{ dragging=false; });
  }
  document.querySelectorAll("#dockTabs button").forEach(b=>{ b.onclick = ()=>setDock(b.dataset.dock); });
  {
    const rs = document.getElementById("selRes");
    rs.onchange = ()=>{
      setProcRes(parseInt(rs.value));
      sizeCanvas();
      toast("Processing at "+procW+" \u00d7 "+procH);
    };
  }
  setActiveChan("A");
  syncChanInputUI();
  renderChain();
  loadCollapse();
  loadSectionOrder();
  refreshStageLeds();
  setInterval(refreshStageLeds, 400);
  document.getElementById("btnChainReset").onclick = ()=>{
    chainOrder = ["sig","col","glitch","lab","flow"];
    stageEnabled = {sig:true, col:true, glitch:true, lab:true, flow:true};
    renderChain();
  };
  renderRoutes();
  wireMenus();
  wireDataTips();
  {
    const mb = document.getElementById("mixCollapse");
    let open = true;
    try{ open = (localStorage.getItem("bendr.mixstrip") || "1") === "1"; }catch(e){}
    const apply = ()=>{ document.body.classList.toggle("nomix", !open); sizeCanvas(); };
    mb.onclick = ()=>{ open = !open; apply(); try{ localStorage.setItem("bendr.mixstrip", open?"1":"0"); }catch(e){} };
    apply();
  }
  loadPreset(1);   /* RAINBOW RITE so it looks alive immediately */
  sizeCanvas();
  requestAnimationFrame(frame);
  toast("BENDR ready — drop a video anywhere, or press H for help");
}

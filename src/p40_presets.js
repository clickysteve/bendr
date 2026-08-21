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
["PSYCHEDELIC SUN", {"chan":{"A":{"genFreqX":0.18,"genFreqY":0.025,"genPhase":0,"genRate":0.08,"genFM":0.8025,"genFold":0,"genPulse":0.5,"genComp":0,"genThresh":0.5,"genSoft":0.12,"genFoldN":4,"genZoom":0,"genRot":0,"genSkew":0,"genCX":0,"genCY":0,"genWarp":0,"genHue":0.55,"genSpread":1,"genSat":0.9,"genBright":1,"genBands":6,"srcZoom":0.03,"srcX":0,"srcY":0,"srcRot":0,"kaleido":0,"kaleidoN":3,"kaleidoRot":0,"kaleidoX":0,"kaleidoY":0,"echo":0.9625,"delayF":1,"stutter":0,"contour":0,"contourBands":10,"contourWidth":1.2,"contourHue":0,"contourFill":0.25,"lumaSteps":0,"stepCount":5,"dither":0,"sparseJit":0,"jitThresh":0.7,"ntscArt":0,"ntscFringe":0,"snow":0,"snowAniso":0.4,"fmAmt":0,"fmCarrier":0.35,"slitscan":0,"slitDir":0,"bitCrush":0,"bitScale":0.4,"bandKey":0,"bandN":5,"bandHue":0.3,"rowSmear":0,"moire":0,"moireFreq":0.4,"fieldMod":0,"fieldHue":0,"fieldWarp":0,"pixelSort":0,"sortThresh":0.45,"blockShift":0,"blockSize":0.35,"dotify":0,"dotSize":0.4,"driftWarp":0,"fmWarp":0,"mosh":0,"moshGate":0,"moshVec":0,"flowGain":1,"flowCurl":0,"melt":0,"meltDir":0,"meltGate":0,"swirl":0,"swirlScale":0.18,"swirlSpeed":0.08,"moshBlock":0,"moshBlockSize":0.68,"moshRate":0.13,"flowStretch":0,"flowRepel":0,"flowNoise":0,"flowSharp":0,"flowHue":0,"flowFade":0,"timeGrad":0,"shearAxis":0,"keyThresh":0.5,"keySoft":0.2,"keyInv":0,"keyHue":0.33,"keyFx":0,"keyFb":0,"colorize":0.85,"colorBands":1.8,"colorSweep":0.25,"lumaHue":0,"sharpEcho":0,"echoSpace":0.3,"rgbSep":0,"invFlick":0,"fbAmount":0,"fbZoom":0.645,"fbRotate":0.61,"fbHue":0,"fbShiftX":-0.455,"fbShiftY":0,"fbShearX":0,"fbShearY":0,"fbGainR":1,"fbGainG":1,"fbGainB":1,"fbSat":1,"fbVal":1,"fbPost":0,"fbChromOff":0,"fbBlur":0,"fbBlur2":0,"fbSharp":0,"fbDrive":1,"fbPivot":0.5,"fbThresh":0.7025,"fbThreshSoft":0.3972875,"fbNoise":0.3175,"fbNoiseScale":0.5,"fbRoll":0,"fbJitter":0,"fbAuto":0,"chromaBleed":0.725,"chromaDelay":0.695,"lumaBleed":0.775,"bleedDir":0.5,"vBleed":0,"rainbow":0.1,"dotCrawl":0.1,"ringing":0.15,"signalNoise":0,"chromaNoise":0.05,"hWobble":0.07,"wobbleFreq":0.2,"tear":0,"tearSize":0.4,"vRoll":0,"jitter":0.1,"humBar":0.1,"tapeSpeed":0.6425,"tracking":0,"trackPhase":0.665,"trackHunt":0.7225,"dropout":0,"dropoutLen":0,"chromaLoss":0.6625,"crease":0,"creasePos":0.91,"headClog":0,"azimuth":0,"headSwitch":0.3,"tapeWow":0.15,"wowRate":0.25,"flutter":0,"tapeStretch":0,"edgeDmg":0,"printThru":0,"hiss":0,"stillNoise":0,"shuttleNz":0,"genLoss":0.1,"genCount":1,"rGain":1,"gGain":1,"bGain":1,"saturation":1.3,"hue":0,"brightness":0,"contrast":1.15,"posterize":0,"solarize":0,"glow":0.45},"B":{"genFreqX":0.41,"genFreqY":0.2425,"genPhase":0,"genRate":0.08,"genFM":0.8025,"genFold":0,"genPulse":0.5,"genComp":0,"genThresh":0.5,"genSoft":0.12,"genFoldN":4,"genZoom":0,"genRot":0,"genSkew":0,"genCX":0,"genCY":0,"genWarp":0,"genHue":0.55,"genSpread":1,"genSat":0.9,"genBright":1,"genBands":6,"srcZoom":0.03,"srcX":0,"srcY":0,"srcRot":0,"kaleido":0,"kaleidoN":3,"kaleidoRot":0,"kaleidoX":0,"kaleidoY":0,"echo":0.9625,"delayF":1,"stutter":0,"contour":0,"contourBands":10,"contourWidth":1.2,"contourHue":0,"contourFill":0.25,"lumaSteps":0,"stepCount":5,"dither":0,"sparseJit":0,"jitThresh":0.7,"ntscArt":0,"ntscFringe":0,"snow":0,"snowAniso":0.4,"fmAmt":0,"fmCarrier":0.35,"slitscan":0,"slitDir":0,"bitCrush":0,"bitScale":0.4,"bandKey":0,"bandN":5,"bandHue":0.3,"rowSmear":0,"moire":0,"moireFreq":0.4,"fieldMod":0,"fieldHue":0,"fieldWarp":0,"pixelSort":0,"sortThresh":0.45,"blockShift":0,"blockSize":0.35,"dotify":0,"dotSize":0.4,"driftWarp":0,"fmWarp":0,"mosh":0,"moshGate":0,"moshVec":0,"flowGain":1,"flowCurl":0,"melt":0,"meltDir":0,"meltGate":0,"swirl":0,"swirlScale":0.18,"swirlSpeed":0.08,"moshBlock":0,"moshBlockSize":0.68,"moshRate":0.13,"flowStretch":0,"flowRepel":0,"flowNoise":0,"flowSharp":0,"flowHue":0,"flowFade":0,"timeGrad":0,"shearAxis":0,"keyThresh":0.5,"keySoft":0.2,"keyInv":0,"keyHue":0.33,"keyFx":0,"keyFb":0,"colorize":0.85,"colorBands":1.8,"colorSweep":0.25,"lumaHue":0,"sharpEcho":0,"echoSpace":0.3,"rgbSep":0,"invFlick":0,"fbAmount":0,"fbZoom":0.645,"fbRotate":0.61,"fbHue":0,"fbShiftX":-0.455,"fbShiftY":0,"fbShearX":0,"fbShearY":0,"fbGainR":1,"fbGainG":1,"fbGainB":1,"fbSat":1,"fbVal":1,"fbPost":0,"fbChromOff":0,"fbBlur":0,"fbBlur2":0,"fbSharp":0,"fbDrive":1,"fbPivot":0.5,"fbThresh":0,"fbThreshSoft":0.05,"fbNoise":0,"fbNoiseScale":0.5,"fbRoll":0,"fbJitter":0,"fbAuto":0,"chromaBleed":0.3,"chromaDelay":0,"lumaBleed":0,"bleedDir":0.5,"vBleed":0,"rainbow":0.1,"dotCrawl":0.1,"ringing":0.15,"signalNoise":0.05,"chromaNoise":0.05,"hWobble":0.07,"wobbleFreq":0.2,"tear":0,"tearSize":0.4,"vRoll":0,"jitter":0.1,"humBar":0.1,"tapeSpeed":0,"tracking":0,"trackPhase":0,"trackHunt":0,"dropout":0,"dropoutLen":0.35,"chromaLoss":0,"crease":0,"creasePos":0.5,"headClog":0,"azimuth":0,"headSwitch":0.3,"tapeWow":0.15,"wowRate":0.25,"flutter":0,"tapeStretch":0,"edgeDmg":0,"printThru":0,"hiss":0,"stillNoise":0,"shuttleNz":0,"genLoss":0.1,"genCount":1,"rGain":1,"gGain":1,"bGain":1,"saturation":1.3,"hue":0,"brightness":0,"contrast":1.15,"posterize":0,"solarize":0,"glow":0.45},"C":{"genFreqX":0.18,"genFreqY":0.12,"genPhase":0,"genRate":0.08,"genFM":0,"genFold":0,"genPulse":0.5,"genComp":0,"genThresh":0.5,"genSoft":0.12,"genFoldN":4,"genZoom":0,"genRot":0,"genSkew":0,"genCX":0,"genCY":0,"genWarp":0,"genHue":0.55,"genSpread":1,"genSat":0.9,"genBright":1,"genBands":6,"srcZoom":0,"srcX":0,"srcY":0,"srcRot":0,"kaleido":0,"kaleidoN":3,"kaleidoRot":0,"kaleidoX":0,"kaleidoY":0,"echo":0,"delayF":3,"stutter":0,"contour":0,"contourBands":10,"contourWidth":1.2,"contourHue":0,"contourFill":0.25,"lumaSteps":0,"stepCount":5,"dither":0,"sparseJit":0,"jitThresh":0.7,"ntscArt":0,"ntscFringe":0,"snow":0,"snowAniso":0.4,"fmAmt":0,"fmCarrier":0.35,"slitscan":0,"slitDir":0,"bitCrush":0,"bitScale":0.4,"bandKey":0,"bandN":5,"bandHue":0.3,"rowSmear":0,"moire":0,"moireFreq":0.4,"fieldMod":0,"fieldHue":0,"fieldWarp":0,"pixelSort":0,"sortThresh":0.45,"blockShift":0,"blockSize":0.35,"dotify":0,"dotSize":0.4,"driftWarp":0,"fmWarp":0,"mosh":0,"moshGate":0,"moshVec":0,"flowGain":1,"flowCurl":0,"melt":0,"meltDir":0,"meltGate":0,"swirl":0,"swirlScale":0.18,"swirlSpeed":0.08,"moshBlock":0,"moshBlockSize":0.68,"moshRate":0.13,"flowStretch":0,"flowRepel":0,"flowNoise":0,"flowSharp":0,"flowHue":0,"flowFade":0,"timeGrad":0,"shearAxis":0,"keyThresh":0.5,"keySoft":0.2,"keyInv":0,"keyHue":0.33,"keyFx":0,"keyFb":0,"colorize":0,"colorBands":1.5,"colorSweep":0.15,"lumaHue":0,"sharpEcho":0,"echoSpace":0.3,"rgbSep":0,"invFlick":0,"fbAmount":0,"fbZoom":0,"fbRotate":0,"fbHue":0,"fbShiftX":0,"fbShiftY":0,"fbShearX":0,"fbShearY":0,"fbGainR":1,"fbGainG":1,"fbGainB":1,"fbSat":1,"fbVal":1,"fbPost":0,"fbChromOff":0,"fbBlur":0,"fbBlur2":0,"fbSharp":0,"fbDrive":1,"fbPivot":0.5,"fbThresh":0,"fbThreshSoft":0.05,"fbNoise":0,"fbNoiseScale":0.5,"fbRoll":0,"fbJitter":0,"fbAuto":0,"chromaBleed":0.25,"chromaDelay":0,"lumaBleed":0,"bleedDir":0.5,"vBleed":0,"rainbow":0.1,"dotCrawl":0.1,"ringing":0.15,"signalNoise":0.05,"chromaNoise":0.05,"hWobble":0.05,"wobbleFreq":0.2,"tear":0,"tearSize":0.4,"vRoll":0,"jitter":0.1,"humBar":0.1,"tapeSpeed":0,"tracking":0,"trackPhase":0,"trackHunt":0,"dropout":0,"dropoutLen":0.35,"chromaLoss":0,"crease":0,"creasePos":0.5,"headClog":0,"azimuth":0,"headSwitch":0.3,"tapeWow":0.15,"wowRate":0.25,"flutter":0,"tapeStretch":0,"edgeDmg":0,"printThru":0,"hiss":0,"stillNoise":0,"shuttleNz":0,"genLoss":0.1,"genCount":1,"rGain":1,"gGain":1,"bGain":1,"saturation":1,"hue":0,"brightness":0,"contrast":1,"posterize":0,"solarize":0,"glow":0.15},"D":{"genFreqX":0.18,"genFreqY":0.12,"genPhase":0,"genRate":0.08,"genFM":0,"genFold":0,"genPulse":0.5,"genComp":0,"genThresh":0.5,"genSoft":0.12,"genFoldN":4,"genZoom":0,"genRot":0,"genSkew":0,"genCX":0,"genCY":0,"genWarp":0,"genHue":0.55,"genSpread":1,"genSat":0.9,"genBright":1,"genBands":6,"srcZoom":0,"srcX":0,"srcY":0,"srcRot":0,"kaleido":0,"kaleidoN":3,"kaleidoRot":0,"kaleidoX":0,"kaleidoY":0,"echo":0,"delayF":3,"stutter":0,"contour":0,"contourBands":10,"contourWidth":1.2,"contourHue":0,"contourFill":0.25,"lumaSteps":0,"stepCount":5,"dither":0,"sparseJit":0,"jitThresh":0.7,"ntscArt":0,"ntscFringe":0,"snow":0,"snowAniso":0.4,"fmAmt":0,"fmCarrier":0.35,"slitscan":0,"slitDir":0,"bitCrush":0,"bitScale":0.4,"bandKey":0,"bandN":5,"bandHue":0.3,"rowSmear":0,"moire":0,"moireFreq":0.4,"fieldMod":0,"fieldHue":0,"fieldWarp":0,"pixelSort":0,"sortThresh":0.45,"blockShift":0,"blockSize":0.35,"dotify":0,"dotSize":0.4,"driftWarp":0,"fmWarp":0,"mosh":0,"moshGate":0,"moshVec":0,"flowGain":1,"flowCurl":0,"melt":0,"meltDir":0,"meltGate":0,"swirl":0,"swirlScale":0.18,"swirlSpeed":0.08,"moshBlock":0,"moshBlockSize":0.68,"moshRate":0.13,"flowStretch":0,"flowRepel":0,"flowNoise":0,"flowSharp":0,"flowHue":0,"flowFade":0,"timeGrad":0,"shearAxis":0,"keyThresh":0.5,"keySoft":0.2,"keyInv":0,"keyHue":0.33,"keyFx":0,"keyFb":0,"colorize":0,"colorBands":1.5,"colorSweep":0.15,"lumaHue":0,"sharpEcho":0,"echoSpace":0.3,"rgbSep":0,"invFlick":0,"fbAmount":0,"fbZoom":0,"fbRotate":0,"fbHue":0,"fbShiftX":0,"fbShiftY":0,"fbShearX":0,"fbShearY":0,"fbGainR":1,"fbGainG":1,"fbGainB":1,"fbSat":1,"fbVal":1,"fbPost":0,"fbChromOff":0,"fbBlur":0,"fbBlur2":0,"fbSharp":0,"fbDrive":1,"fbPivot":0.5,"fbThresh":0,"fbThreshSoft":0.05,"fbNoise":0,"fbNoiseScale":0.5,"fbRoll":0,"fbJitter":0,"fbAuto":0,"chromaBleed":0.25,"chromaDelay":0,"lumaBleed":0,"bleedDir":0.5,"vBleed":0,"rainbow":0.1,"dotCrawl":0.1,"ringing":0.15,"signalNoise":0.05,"chromaNoise":0.05,"hWobble":0.05,"wobbleFreq":0.2,"tear":0,"tearSize":0.4,"vRoll":0,"jitter":0.1,"humBar":0.1,"tapeSpeed":0,"tracking":0,"trackPhase":0,"trackHunt":0,"dropout":0,"dropoutLen":0.35,"chromaLoss":0,"crease":0,"creasePos":0.5,"headClog":0,"azimuth":0,"headSwitch":0.3,"tapeWow":0.15,"wowRate":0.25,"flutter":0,"tapeStretch":0,"edgeDmg":0,"printThru":0,"hiss":0,"stillNoise":0,"shuttleNz":0,"genLoss":0.1,"genCount":1,"rGain":1,"gGain":1,"bGain":1,"saturation":1,"hue":0,"brightness":0,"contrast":1,"posterize":0,"solarize":0,"glow":0.15}},"master":{"abMix":0.445,"wipeSoft":0,"wipeDetail":0.2875,"wipeX":0.005,"wipeY":0,"mixKeyThresh":0.5,"mixKeySoft":0.2,"mixKeyInv":0,"mixKeyHue":0.5275,"cdMix":0,"wipeSoft2":0.03,"wipeDetail2":0.3,"wipeX2":0,"wipeY2":0,"mixKeyThresh2":0.5,"mixKeySoft2":0.2,"mixKeyInv2":0,"mixKeyHue2":0.33,"busMix":0,"wipeSoftM":0.03,"wipeDetailM":0.3,"wipeXM":0.12,"wipeYM":0,"mixKeyThreshM":0.5,"mixKeySoftM":0.2,"mixKeyInvM":0,"mixKeyHueM":0.33,"morph":0,"scanlines":0.3,"beamWidth":1,"beamShape":0.5,"aperture":0.2,"maskDark":0.5,"curvature":0.3,"cornerRound":0.2,"vignette":0.35,"bloom":0,"bloomRad":0.4,"halation":0,"defocus":0,"grain":0,"outGamma":1,"outBright":0,"outContrast":1,"outSat":1,"outWarmth":0,"blackLevel":0,"whiteClip":1,"phosphor":0,"hvSag":0,"letterbox":0,"pillarbox":0,"bezel":0,"glassRefl":0,"dust":0,"scratches":0,"ovMoire":0,"rollShutter":0,"safeArea":0},"routes":[{"ch":"A","src":"lfo1","dst":"kaleido","amt":0.55}],"fbTrailMode":false,"rescanMode":false,"keyChroma":false,"mixMode":5,"edgeMode":0,"wipeInv":false,"linkChans":false,"mixMode2":0,"wipeInv2":false,"mixModeM":0,"wipeInvM":false,"fbWrap":0,"fbMirror":0,"fbBlend":0,"fbNL":0,"fbInvert":false,"fbTap":0,"outModel":0,"fieldSrc":0,"flowField":0,"flowEdge":0,"chainOrder":["sig","col","glitch","lab","flow"],"stageEnabled":{"sig":true,"col":true,"glitch":true,"lab":true,"flow":true},"busSrc":{"b1":["A","B"],"b2":["B","D"]},"genMode":{"A":{"shape":0,"wave":0,"col":1},"B":{"shape":0,"wave":0,"col":1},"C":{"shape":0,"wave":0,"col":1},"D":{"shape":0,"wave":0,"col":1}},"lfo1":{"rate":0.2754228703338166,"shape":"sine2","sync":0},"lfo2":{"rate":1.6982436524617444,"shape":"snh","sync":0},"lfo3":{"rate":0.0707945784384138,"shape":"tri","sync":0},"lfo4":{"rate":5.495408738576246,"shape":"sine","sync":0},"srcMode":{"A":{"mode":"synth","pattern":"bars","feed":"PGM"},"B":{"mode":"synth","pattern":"bars","feed":"PGM"}}}, null],
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

/* The regimes below are the classic camera-into-monitor experiment written out
   as settings. The loop transform is an affine map with a sign switch: rotate
   by an angle, scale a little either side of unity, optionally reflect. Set the
   angle to a whole fraction of a turn and successive passes land back on each
   other, so the picture locks into that many arms. Detune the angle slightly
   and it cannot close, so the arms shear past each other and defects wander.
   Add the reflection and the loop alternates hand every pass, which is where
   the pinwheels and the travelling waves come from. Everything else here is
   dressing; these four numbers are the whole phase diagram. */
["FB · NINE-FOLD LOCK",    {fbAmount:0.95,fbZoom:0.055,fbRotate:0.6981,fbBlur:0.05,fbSharp:0.35,fbNoise:0.03,fbAuto:0.5,contrast:1.1}, {wrap:0,nl:1},
 [{src:"lfo3",dst:"fbHue",amt:0.08,ch:"A"},{src:"lfo1",dst:"fbZoom",amt:0.02,ch:"A"}]],
["FB · SIX-FOLD LOCK",     {fbAmount:0.95,fbZoom:0.06,fbRotate:1.0472,fbHue:0.02,fbBlur:0.05,fbSharp:0.35,fbNoise:0.03,fbAuto:0.5}, {wrap:0,nl:1},
 [{src:"lfo3",dst:"fbHue",amt:0.08,ch:"A"},{src:"lfo1",dst:"fbZoom",amt:0.02,ch:"A"}]],
["FB · DETUNED · SHEAR",   {fbAmount:0.955,fbZoom:0.055,fbRotate:1.0772,fbBlur:0.06,fbSharp:0.4,fbNoise:0.06,fbAuto:0.55}, {wrap:0,nl:1}],
["FB · DISLOCATION DRIFT", {fbAmount:0.96,fbZoom:0.04,fbRotate:0.7331,fbShiftX:0.006,fbBlur:0.07,fbSharp:0.5,fbNoise:0.12,fbAuto:0.6}, {wrap:0,nl:1,flip:1}],
["FB · PINWHEEL LOCK",     {fbAmount:0.94,fbZoom:0.03,fbRotate:-1.5708,fbHue:0.03,fbBlur:0.08,fbNoise:0.05,fbAuto:0.5}, {wrap:0,nl:1,flip:1,inv:1},
 [{src:"lfo1",dst:"fbZoom",amt:0.025,ch:"A"}]],
["FB · LOG SPIRAL",        {fbAmount:0.955,fbZoom:-0.055,fbRotate:-0.18,fbHue:0.015,fbBlur:0.07,fbSharp:0.25,fbNoise:0.04,fbAuto:0.45}, {wrap:0,nl:1}],
["FB · COUNTER SPIRAL",    {fbAmount:0.955,fbZoom:0.055,fbRotate:0.18,fbHue:-0.015,fbBlur:0.07,fbSharp:0.25,fbNoise:0.04,fbAuto:0.45}, {wrap:0,nl:1,flip:2}],
["FB · ALTERNATING TUNNEL",{fbAmount:0.95,fbZoom:0.08,fbRotate:0.09,fbBlur:0.05,fbSharp:0.4,fbNoise:0.04,fbAuto:0.5}, {wrap:0,nl:1,flip:3}],
["FB · TRAVELLING WAVE",   {fbAmount:0.965,fbZoom:0.006,fbRotate:0.015,fbShiftX:0.012,fbShiftY:0.004,fbBlur:0.15,fbSharp:0.45,fbDrive:1.25,fbHue:0.02,fbNoise:0.18,fbAuto:0.6}, {wrap:0,nl:1,flip:1}],
["FB · STANDING LATTICE",  {fbAmount:0.96,fbZoom:0.012,fbRotate:0.7854,fbBlur:0.09,fbSharp:0.8,fbThresh:0.42,fbThreshSoft:0.03,fbNoise:0.1,fbAuto:0.6}, {wrap:1,nl:0,flip:3},
 [{src:"lfo2",dst:"fbThresh",amt:0.06,ch:"A"}]],
];
for(const [name, base, tog, rts] of FBK){
  /* loop gain: the single most sensitive control — just under unity so the loop
     loses a little energy each pass instead of running away to white */
  if(base.fbVal === undefined) base.fbVal = 0.955;
  /* the default pair walks the loop slowly so nothing sits still, but a preset
     whose whole point is that the angle is exact has to be able to refuse it */
  PRESETS.push([name, Object.assign({fbAmount:0.9, scanlines:0.2, curvature:0.28, vignette:0.4}, base),
    rts || [{src:"drift",dst:"fbRotate",amt:0.08,ch:"A"},{src:"lfo3",dst:"fbHue",amt:0.1,ch:"A"}],
    tog]);
}

/* ---- the field domain and the codec round trip ----
   Both of these live on the master output rather than in a channel, so they
   are written as flat maps of master parameters and nothing else. */
const OUTP = [
["FIELD \u00b7 INTERLACED", {ilAmt:0.85,ilTwitter:0.55,ilJudder:0,scanlines:0.14,beamWidth:1.1,curvature:0.24,vignette:0.38,halation:0.2},
 {il:0,ilo:false}],
["FIELD \u00b7 BAD DEINTERLACE", {ilAmt:1,ilTwitter:0.75,ilJudder:0,scanlines:0.1,curvature:0.22,vignette:0.36},
 {il:1,ilo:true}],
["FIELD \u00b7 3:2 TELECINE", {ilAmt:0.7,ilTwitter:0.3,ilJudder:0.85,scanlines:0.16,curvature:0.26,vignette:0.4,grain:0.18},
 {il:2,ilo:false}],
["CODEC \u00b7 KEYFRAME REMOVED", {moshAmt:1,moshKey:1,moshHold:0.2,moshSkip:0,moshShuffle:0,moshRate:0.5,moshQ:0.3,moshResync:0,scanlines:0.08,curvature:0.2,vignette:0.34},
 {recycle:false}],
["CODEC \u00b7 BLOOM", {moshAmt:1,moshKey:1,moshHold:0.7,moshSkip:0,moshShuffle:0.15,moshRate:0.8,moshQ:0.45,moshResync:0,scanlines:0.06,curvature:0.18,vignette:0.3},
 {recycle:false}],
["CODEC \u00b7 BITRATE STARVED", {moshAmt:1,moshKey:0.4,moshHold:0.15,moshSkip:0.1,moshShuffle:0,moshRate:0.5,moshQ:0.9,moshResync:0.6,scanlines:0.05,curvature:0.16,vignette:0.28},
 {recycle:false}],
["CODEC \u00b7 OUT OF ORDER", {moshAmt:0.85,moshKey:0.9,moshHold:0.2,moshSkip:0.25,moshShuffle:0.8,moshRate:0.9,moshQ:0.5,moshResync:0.25,scanlines:0.06,curvature:0.18,vignette:0.3},
 {recycle:false}],
["CODEC \u00b7 NEVER RECOVERS", {moshAmt:1,moshKey:1,moshHold:0.5,moshSkip:0.1,moshShuffle:0.3,moshRate:0.7,moshQ:0.7,moshResync:0,curvature:0.16,vignette:0.3},
 {recycle:true}],
];
for(const [name, base, tog] of OUTP) PRESETS.push([name, base, [], tog]);

PRESETS.push(["MELT \u00b7 CIRCLE BLEED", {"chan": {"A": {"genFreqX": 0.09, "genFreqY": 0.06, "genRate": 0.05, "genHue": 0.08, "genSpread": 1.2, "genSat": 0.85, "chromaBleed": 0.35, "saturation": 1.15, "glow": 0.35}, "B": {"genFreqX": 0.34, "genFreqY": 0.2, "genRate": 0.09, "genFM": 0.55, "genHue": 0.62, "genSpread": 1.5, "contour": 0.35, "contourBands": 8, "chromaBleed": 0.5, "chromaDelay": 0.2, "saturation": 1.3, "glow": 0.4}}, "master": {"abMix": 0.52, "wipeSoft": 0.06, "edgeAmt": 0.62, "edgeHold": 0.86, "edgeSwirl": 0.25, "edgeChroma": 0.65, "edgeCreep": 0.7, "scanlines": 0.28, "curvature": 0.28, "bloom": 0.25, "halation": 0.2}, "routes": [{"ch": "A", "src": "lfo1", "dst": "wipeX", "amt": 0.35}, {"ch": "A", "src": "lfo3", "dst": "edgeSwirl", "amt": 0.5}, {"ch": "A", "src": "lfo2", "dst": "abMix", "amt": 0.12}], "audioCfg": {"bass": {"lo": 30, "hi": 150, "gain": 1}, "mid": {"lo": 300, "hi": 2200, "gain": 1}, "high": {"lo": 4000, "hi": 11000, "gain": 1}, "response": 0.5}, "fbTrailMode": false, "rescanMode": false, "keyChroma": false, "mixMode": 5, "edgeMode": 0, "wipeInv": false, "activeChan": "A", "linkChans": false, "mixMode2": 0, "wipeInv2": false, "mixModeM": 0, "wipeInvM": false, "mixBlend": 0, "mixBlend2": 0, "mixBlendM": 0, "mixKey": 0, "mixKey2": 0, "mixKeyM": 0, "fbWrap": 0, "fbMirror": 0, "fbBlend": 0, "fbNL": 0, "fbInvert": false, "fbTap": 0, "outModel": 0, "fieldSrc": 0, "flowField": 0, "flowEdge": 0, "chainOrder": ["sig", "col", "glitch", "lab", "flow"], "stageEnabled": {"sig": true, "col": true, "glitch": true, "lab": true, "flow": true}, "busSrc": {"b1": ["A", "B"], "b2": ["C", "D"]}, "genMode": {"A": {"shape": 1, "wave": 0, "col": 2}, "B": {"shape": 2, "wave": 2, "col": 1}, "C": {"shape": 0, "wave": 0, "col": 1}, "D": {"shape": 0, "wave": 0, "col": 1}}, "srcMode": {"A": {"mode": "synth", "pattern": "bars", "feed": "PGM"}, "B": {"mode": "synth", "pattern": "bars", "feed": "PGM"}, "C": {"mode": "pattern", "pattern": "bars", "feed": "PGM"}, "D": {"mode": "pattern", "pattern": "bars", "feed": "PGM"}}, "srcText": {"A": {"body": "BENDR", "font": "mono", "size": 0.2, "track": 0, "x": 0.5, "y": 0.5, "rot": 0, "scrollX": 0, "scrollY": 0, "repeat": 1, "ink": "#ffffff", "bg": "#000000", "outline": 0, "shape": "none", "shpCount": 1, "shpSize": 0.3, "shpX": 0.5, "shpY": 0.5, "shpSpin": 0, "shpFill": "#ff2fa0", "shpStroke": 0, "shpPulse": 0}, "B": {"body": "BENDR", "font": "mono", "size": 0.2, "track": 0, "x": 0.5, "y": 0.5, "rot": 0, "scrollX": 0, "scrollY": 0, "repeat": 1, "ink": "#ffffff", "bg": "#000000", "outline": 0, "shape": "none", "shpCount": 1, "shpSize": 0.3, "shpX": 0.5, "shpY": 0.5, "shpSpin": 0, "shpFill": "#ff2fa0", "shpStroke": 0, "shpPulse": 0}, "C": {"body": "BENDR", "font": "mono", "size": 0.2, "track": 0, "x": 0.5, "y": 0.5, "rot": 0, "scrollX": 0, "scrollY": 0, "repeat": 1, "ink": "#ffffff", "bg": "#000000", "outline": 0, "shape": "none", "shpCount": 1, "shpSize": 0.3, "shpX": 0.5, "shpY": 0.5, "shpSpin": 0, "shpFill": "#ff2fa0", "shpStroke": 0, "shpPulse": 0}, "D": {"body": "BENDR", "font": "mono", "size": 0.2, "track": 0, "x": 0.5, "y": 0.5, "rot": 0, "scrollX": 0, "scrollY": 0, "repeat": 1, "ink": "#ffffff", "bg": "#000000", "outline": 0, "shape": "none", "shpCount": 1, "shpSize": 0.3, "shpX": 0.5, "shpY": 0.5, "shpSpin": 0, "shpFill": "#ff2fa0", "shpStroke": 0, "shpPulse": 0}}, "mods": [{"id": "lfo1", "type": "lfo", "name": "LFO 1", "rate": 0.05, "shape": "sine", "phase": 0.46354626282197164, "snh": 0, "sync": 0}, {"id": "lfo2", "type": "lfo", "name": "LFO 2", "rate": 0.11, "shape": "tri", "phase": 0.9169826661389351, "snh": 0, "sync": 0}, {"id": "lfo3", "type": "lfo", "name": "LFO 3", "rate": 0.037, "shape": "sine2", "phase": 0.4304286177016956, "snh": 0, "sync": 0}, {"id": "lfo4", "type": "lfo", "name": "LFO 4", "rate": 5.495408738576246, "shape": "sine", "phase": 0.055445735688429365, "snh": 0, "sync": 0}, {"id": "lfo5", "type": "lfo", "name": "LFO 5", "rate": 0.016982436524617443, "shape": "tri", "phase": 0.0670557549083246, "snh": 0, "sync": 0}, {"id": "lfo6", "type": "lfo", "name": "LFO 6", "rate": 0.8912509381337456, "shape": "saw", "phase": 0.5590496733908549, "snh": 0, "sync": 0}, {"id": "lfo7", "type": "lfo", "name": "LFO 7", "rate": 3.0902954325135905, "shape": "sqr", "phase": 0.08658904215108909, "snh": 0, "sync": 0}, {"id": "lfo8", "type": "lfo", "name": "LFO 8", "rate": 0.1288249551693134, "shape": "drift", "phase": 0.38726246081341276, "snh": 0, "sync": 0}]}, null]);

PRESETS.push(["DIRTY MIXER \u00b7 CROSSBAR FAULT", {"chan": {"A": {"genFreqX": 0.14, "genFreqY": 0.07, "genHue": 0.12, "genSpread": 1.25, "chromaBleed": 0.55, "chromaDelay": 0.3, "rainbow": 0.25, "saturation": 1.2, "glow": 0.3}, "B": {"genFreqX": 0.3, "genFreqY": 0.22, "genHue": 0.62, "genBands": 7, "contour": 0.3, "saturation": 1.25}}, "master": {"abMix": 0.5, "wipeSoft": 0.05, "edgeAmt": 0.3, "edgeWidth": 0.22, "edgeHold": 0.7, "edgeCreep": 0.5, "wipeBord": 0.3, "wipeBordCol": 0.14, "mixDirt": 0.7, "mixDirtRate": 0.45, "mixDirtDrop": 0.8, "mixDirtCut": 0.55, "mixDirtKnock": 0.7, "mixDirtNoise": 0.5, "scanlines": 0.32, "vignette": 0.4, "bloom": 0.3, "halation": 0.25, "grain": 0.2, "lensCA": 0.3, "lightLeak": 0.2, "osdShow": 0.9, "osdGlow": 0.6}, "routes": [{"ch": "A", "src": "lfo1", "dst": "abMix", "amt": 0.45}, {"ch": "A", "src": "lfo4", "dst": "mixDirt", "amt": 0.3}], "audioCfg": {"bass": {"lo": 30, "hi": 150, "gain": 1}, "mid": {"lo": 300, "hi": 2200, "gain": 1}, "high": {"lo": 4000, "hi": 11000, "gain": 1}, "response": 0.5}, "fbTrailMode": false, "rescanMode": false, "keyChroma": false, "mixMode": 1, "edgeMode": 0, "wipeInv": false, "activeChan": "A", "linkChans": false, "mixMode2": 0, "wipeInv2": false, "mixModeM": 0, "wipeInvM": false, "mixBlend": 2, "mixBlend2": 0, "mixBlendM": 0, "mixKey": 0, "mixKey2": 0, "mixKeyM": 0, "fbWrap": 0, "fbMirror": 0, "fbBlend": 0, "fbNL": 0, "fbInvert": false, "fbTap": 0, "outModel": 0, "osdMode": 0, "osdDate": 2, "fieldSrc": 0, "flowField": 0, "flowEdge": 0, "chainOrder": ["sig", "col", "glitch", "lab", "flow"], "stageEnabled": {"sig": true, "col": true, "glitch": true, "lab": true, "flow": true}, "busSrc": {"b1": ["A", "B"], "b2": ["C", "D"]}, "genMode": {"A": {"shape": 0, "wave": 0, "col": 2}, "B": {"shape": 7, "wave": 3, "col": 4}, "C": {"shape": 0, "wave": 0, "col": 1}, "D": {"shape": 0, "wave": 0, "col": 1}}, "srcMode": {"A": {"mode": "synth", "pattern": "bars", "feed": "PGM"}, "B": {"mode": "synth", "pattern": "bars", "feed": "PGM"}, "C": {"mode": "pattern", "pattern": "bars", "feed": "PGM"}, "D": {"mode": "pattern", "pattern": "bars", "feed": "PGM"}}, "srcText": {"A": {"body": "BENDR", "font": "mono", "size": 0.2, "track": 0, "x": 0.5, "y": 0.5, "rot": 0, "scrollX": 0, "scrollY": 0, "repeat": 1, "ink": "#ffffff", "bg": "#000000", "outline": 0, "shape": "none", "shpCount": 1, "shpSize": 0.3, "shpX": 0.5, "shpY": 0.5, "shpSpin": 0, "shpFill": "#ff2fa0", "shpStroke": 0, "shpPulse": 0}, "B": {"body": "BENDR", "font": "mono", "size": 0.2, "track": 0, "x": 0.5, "y": 0.5, "rot": 0, "scrollX": 0, "scrollY": 0, "repeat": 1, "ink": "#ffffff", "bg": "#000000", "outline": 0, "shape": "none", "shpCount": 1, "shpSize": 0.3, "shpX": 0.5, "shpY": 0.5, "shpSpin": 0, "shpFill": "#ff2fa0", "shpStroke": 0, "shpPulse": 0}, "C": {"body": "BENDR", "font": "mono", "size": 0.2, "track": 0, "x": 0.5, "y": 0.5, "rot": 0, "scrollX": 0, "scrollY": 0, "repeat": 1, "ink": "#ffffff", "bg": "#000000", "outline": 0, "shape": "none", "shpCount": 1, "shpSize": 0.3, "shpX": 0.5, "shpY": 0.5, "shpSpin": 0, "shpFill": "#ff2fa0", "shpStroke": 0, "shpPulse": 0}, "D": {"body": "BENDR", "font": "mono", "size": 0.2, "track": 0, "x": 0.5, "y": 0.5, "rot": 0, "scrollX": 0, "scrollY": 0, "repeat": 1, "ink": "#ffffff", "bg": "#000000", "outline": 0, "shape": "none", "shpCount": 1, "shpSize": 0.3, "shpX": 0.5, "shpY": 0.5, "shpSpin": 0, "shpFill": "#ff2fa0", "shpStroke": 0, "shpPulse": 0}}, "mods": [{"id": "lfo1", "type": "lfo", "name": "LFO 1", "rate": 0.06, "shape": "tri", "phase": 0.8253412995992825, "snh": 0, "sync": 0}, {"id": "lfo2", "type": "lfo", "name": "LFO 2", "rate": 1.6982436524617444, "shape": "snh", "phase": 0.12453162469815826, "snh": 0, "sync": 0}, {"id": "lfo3", "type": "lfo", "name": "LFO 3", "rate": 0.0707945784384138, "shape": "tri", "phase": 0.9578821927416256, "snh": 0, "sync": 0}, {"id": "lfo4", "type": "lfo", "name": "LFO 4", "rate": 0.13, "shape": "snh", "phase": 0.32377943033823176, "snh": 0, "sync": 0}, {"id": "lfo5", "type": "lfo", "name": "LFO 5", "rate": 0.016982436524617443, "shape": "tri", "phase": 0.6386992951546443, "snh": 0, "sync": 0}, {"id": "lfo6", "type": "lfo", "name": "LFO 6", "rate": 0.8912509381337456, "shape": "saw", "phase": 0.27703329526621123, "snh": 0, "sync": 0}, {"id": "lfo7", "type": "lfo", "name": "LFO 7", "rate": 3.0902954325135905, "shape": "sqr", "phase": 0.18160376469231443, "snh": 0, "sync": 0}, {"id": "lfo8", "type": "lfo", "name": "LFO 8", "rate": 0.1288249551693134, "shape": "drift", "phase": 0.2055807543055579, "snh": 0, "sync": 0}]}, null]);

PRESETS.push(["SCAN \u00b7 DEFLECTION", {"chan": {"A": {"genFreqX": 0.16, "genFreqY": 0.1, "genRate": 0.06, "genHue": 0.5, "genSpread": 1.3, "scanAmt": 0.62, "scanLines": 300, "scanSamples": 320, "scanWidth": 0.08, "scanVel": 0.9, "scanGain": 1.1, "scanTiltX": 0.52, "scanTiltY": 0.12, "scanPersp": 0.42, "scanMono": 0.65, "scanHue": 0.35, "scanWobAmt": 0.12, "scanWobFreq": 0.22}}, "master": {"scanlines": 0.12, "curvature": 0.26, "vignette": 0.42, "bloom": 0.32, "bloomRad": 0.5, "halation": 0.3, "phosphor": 0.72, "phosR": 0.8, "phosB": 0.5}, "routes": [{"ch": "A", "src": "lfo1", "dst": "scanTiltY", "amt": 0.35}, {"ch": "A", "src": "lfo3", "dst": "scanAmt", "amt": 0.22}, {"ch": "A", "src": "lfo2", "dst": "scanWobFreq", "amt": 0.3}], "audioCfg": {"bass": {"lo": 30, "hi": 150, "gain": 1}, "mid": {"lo": 300, "hi": 2200, "gain": 1}, "high": {"lo": 4000, "hi": 11000, "gain": 1}, "response": 0.5}, "fbTrailMode": false, "rescanMode": false, "keyChroma": false, "showKeyMatte": false, "mixMode": 0, "edgeMode": 0, "wipeInv": false, "activeChan": "A", "linkChans": false, "mixMode2": 0, "wipeInv2": false, "mixModeM": 0, "wipeInvM": false, "mixBlend": 0, "mixBlend2": 0, "mixBlendM": 0, "mixKey": 0, "mixKey2": 0, "mixKeyM": 0, "fbWrap": 0, "fbMirror": 0, "fbBlend": 0, "fbNL": 0, "fbInvert": false, "fbTap": 0, "outModel": 0, "osdMode": 1, "osdDate": 0, "fieldSrc": 0, "flowField": 0, "flowEdge": 0, "scanRevH": false, "scanRevV": false, "syncLatch": false, "fbNoServo": false, "chainOrder": ["sig", "col", "glitch", "lab", "flow", "scan"], "stageEnabled": {"sig": true, "col": true, "glitch": true, "lab": true, "flow": true, "scan": true}, "busSrc": {"b1": ["A", "B"], "b2": ["C", "D"]}, "genMode": {"A": {"shape": 2, "wave": 0, "col": 2}, "B": {"shape": 0, "wave": 0, "col": 1}, "C": {"shape": 0, "wave": 0, "col": 1}, "D": {"shape": 0, "wave": 0, "col": 1}}, "srcMode": {"A": {"mode": "synth", "pattern": "testcard", "feed": "PGM"}, "B": {"mode": "pattern", "pattern": "testcard", "feed": "PGM"}, "C": {"mode": "pattern", "pattern": "testcard", "feed": "PGM"}, "D": {"mode": "pattern", "pattern": "testcard", "feed": "PGM"}}, "srcText": {"A": {"body": "BENDR", "font": "mono", "size": 0.2, "track": 0, "x": 0.5, "y": 0.5, "rot": 0, "scrollX": 0, "scrollY": 0, "repeat": 1, "ink": "#ffffff", "bg": "#000000", "outline": 0, "shape": "none", "shpCount": 1, "shpSize": 0.3, "shpX": 0.5, "shpY": 0.5, "shpSpin": 0, "shpFill": "#ff2fa0", "shpStroke": 0, "shpPulse": 0}, "B": {"body": "BENDR", "font": "mono", "size": 0.2, "track": 0, "x": 0.5, "y": 0.5, "rot": 0, "scrollX": 0, "scrollY": 0, "repeat": 1, "ink": "#ffffff", "bg": "#000000", "outline": 0, "shape": "none", "shpCount": 1, "shpSize": 0.3, "shpX": 0.5, "shpY": 0.5, "shpSpin": 0, "shpFill": "#ff2fa0", "shpStroke": 0, "shpPulse": 0}, "C": {"body": "BENDR", "font": "mono", "size": 0.2, "track": 0, "x": 0.5, "y": 0.5, "rot": 0, "scrollX": 0, "scrollY": 0, "repeat": 1, "ink": "#ffffff", "bg": "#000000", "outline": 0, "shape": "none", "shpCount": 1, "shpSize": 0.3, "shpX": 0.5, "shpY": 0.5, "shpSpin": 0, "shpFill": "#ff2fa0", "shpStroke": 0, "shpPulse": 0}, "D": {"body": "BENDR", "font": "mono", "size": 0.2, "track": 0, "x": 0.5, "y": 0.5, "rot": 0, "scrollX": 0, "scrollY": 0, "repeat": 1, "ink": "#ffffff", "bg": "#000000", "outline": 0, "shape": "none", "shpCount": 1, "shpSize": 0.3, "shpX": 0.5, "shpY": 0.5, "shpSpin": 0, "shpFill": "#ff2fa0", "shpStroke": 0, "shpPulse": 0}}, "mods": [{"id": "lfo1", "type": "lfo", "name": "LFO 1", "rate": 0.035, "shape": "sine", "phase": 0.025904936244317778, "snh": 0, "sync": 0}, {"id": "lfo2", "type": "lfo", "name": "LFO 2", "rate": 0.021, "shape": "tri", "phase": 0.22930449400470732, "snh": 0, "sync": 0}, {"id": "lfo3", "type": "lfo", "name": "LFO 3", "rate": 0.05, "shape": "sine2", "phase": 0.6527490145683039, "snh": 0, "sync": 0}, {"id": "lfo4", "type": "lfo", "name": "LFO 4", "rate": 5.495408738576246, "shape": "sine", "phase": 0.026283097953750945, "snh": 0, "sync": 0}, {"id": "lfo5", "type": "lfo", "name": "LFO 5", "rate": 0.016982436524617443, "shape": "tri", "phase": 0.6239967635463207, "snh": 0, "sync": 0}, {"id": "lfo6", "type": "lfo", "name": "LFO 6", "rate": 0.8912509381337456, "shape": "saw", "phase": 0.23292823259065654, "snh": 0, "sync": 0}, {"id": "lfo7", "type": "lfo", "name": "LFO 7", "rate": 3.0902954325135905, "shape": "sqr", "phase": 0.8116328026373475, "snh": 0, "sync": 0}, {"id": "lfo8", "type": "lfo", "name": "LFO 8", "rate": 0.1288249551693134, "shape": "drift", "phase": 0.45335334558427975, "snh": 0, "sync": 0}]}, null]);

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
  /* a preset can be a whole saved patch rather than a flat value map, which is
     the only way to carry a look that depends on more than one channel */
  if(pr[1] && pr[1].chan){
    restoreState(JSON.parse(JSON.stringify(pr[1])));
    selPreset.value = String(i);
    toast("Preset: "+pr[0]);
    return;
  }
  /* a preset is a known starting point, not a diff against whatever came
     before it, so everything that is not a parameter goes back to default */
  resetGlobals();
  applyState(pr[1], pr[2]);
  const tg = pr[3];
  flowField = (tg && tg.ff) || 0;
  flowEdge  = (tg && tg.fe) || 0;
  if(tg){
    /* tg.blend is the FEEDBACK blend; the mixer's mix type is tg.mixBlend */
    fbWrap = tg.wrap||0; fbMirror = tg.mir||0; fbBlend = tg.blend||0;
    fbNL = tg.nl||0; fbInvert = !!tg.inv; fbFlip = tg.flip||0;
    if(tg.model!==undefined) outModel = tg.model;
    if(tg.il!==undefined) ilMode = tg.il;
    if(tg.ilo!==undefined) ilOrder = !!tg.ilo;
    if(tg.recycle!==undefined) moshRecycle = !!tg.recycle;
    if(tg.mixBlend!==undefined) mixBlend = tg.mixBlend;
    if(tg.key!==undefined) mixKey = tg.key;
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
  /* the names already carry a family prefix; let the list say so */
  const fams = new Map();
  PRESETS.forEach((p,i)=>{
    const dot = p[0].indexOf(" \u00b7 ");
    const fam = dot > 0 ? p[0].slice(0, dot) : "GENERAL";
    if(!fams.has(fam)){
      const g = document.createElement("optgroup"); g.label = fam;
      fams.set(fam, g); selPreset.appendChild(g);
    }
    const o = document.createElement("option"); o.value = String(i);
    o.textContent = (i+1)+" \u00b7 "+(dot > 0 ? p[0].slice(dot+3) : p[0]);
    fams.get(fam).appendChild(o);
  });
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
  const entry = {name, state: trimState(captureState())};
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

/* What a roll is allowed to touch. Randomize used to be all-or-nothing across
   whatever LINK happened to be set to, which is the wrong granularity for
   building a mix: most of the time you want to roll one channel against three
   you have already settled, or roll the processing without losing the source
   you spent five minutes finding. */
const rndOpts = {scope:"link", keepSrc:false, keepMod:false, keepMix:false};
/* the sections that describe what the channel is looking at, rather than what
   is being done to it */
const SRC_SECS = new Set(["gen","frame"]);

function rndTargets(){
  if(rndOpts.scope === "active") return [activeChan];
  if(rndOpts.scope === "all") return CHANNELS.slice();
  return linkChans ? CHANNELS.slice() : [activeChan];
}
/* One roll of the dice for one channel. Kept separate from the apply so ALL
   FOUR can roll each channel independently and get four different patches
   rather than four copies of one. */
function rollChannel(ch){
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
    /* KEEP SOURCE: hold the pattern synth and the framing where they are, so
       what the channel is looking at survives the roll */
    if(rndOpts.keepSrc && SRC_SECS.has(p.sec)) v = getBase(p.id, p.master ? undefined : ch);
    bases[p.id]=v;
  }
  return bases;
}
function randomizeAll(){
  pushHistory();
  const targets = rndTargets();
  /* ALL FOUR rolls each channel separately, so you get four different patches
     to mix between. LINK means "these channels are the same channel", which is
     what it means everywhere else, so it rolls once and copies. */
  const perChannel = rndOpts.scope === "all";
  let shared = perChannel ? null : rollChannel(targets[0]);
  for(const ch of targets){
    const bases = perChannel ? rollChannel(ch) : shared;
    for(const p of CLIST) chanBase[ch][p.id] = bases[p.id];
    /* master is shared, so it is rolled once rather than four times over the
       top of itself */
    if(ch === targets[0] && !rndOpts.keepMix){
      for(const p of MLIST) if(!SRC_SECS.has(p.sec)) mBase[p.id] = bases[p.id];
    }
  }
  if(!rndOpts.keepMod){
    const nR = 2+Math.floor(Math.random()*4);
    const rts = [];
    for(let i=0;i<nR;i++){
      rts.push({
        ch: targets[Math.floor(Math.random()*targets.length)],
        src: MODSRC[Math.floor(Math.random()*7)].id,   // LFOs + chaos/drift/spike
        dst: PLIST[Math.floor(Math.random()*PLIST.length)].id,
        amt: (Math.random()*2-1)*0.55,
      });
    }
    /* only the routes belonging to the channels being rolled are replaced,
       so randomizing one channel cannot silently unpatch another */
    routes = routes.filter(r=>targets.indexOf(r.ch||"A") < 0).concat(rts);
    for(const m of mods){
      if(m.type !== "lfo") continue;
      m.rate = Math.pow(10, -1.5+Math.random()*2.2);
      if(Math.random()<0.4) m.shape = ["sine","tri","saw","sqr","snh"][Math.floor(Math.random()*5)];
    }
  }
  if(!rndOpts.keepMix){
    if(Math.random()<0.35){
      const arr = chainOrder.slice();
      for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
      chainOrder = arr;
    }
    if(Math.random()<0.5) flowField = Math.floor(Math.random()*7);
    if(Math.random()<0.3) flowEdge = Math.floor(Math.random()*3);
  }
  if(typeof cancelGlide === "function") cancelGlide();
  refreshUI(); renderRoutes(); refreshLfoUI();
  renderChain();
  toast("Randomized "+(targets.length===1 ? "channel "+targets[0] : targets.join("+"))
        + (rndOpts.keepSrc?" \u00b7 source kept":"") + (rndOpts.keepMod?" \u00b7 mod kept":"")
        + (rndOpts.keepMix?" \u00b7 output kept":""));
}
function mutate(){
  pushHistory();
  const targets = rndTargets();
  for(const p of CLIST){
    if(rndOpts.keepSrc && SRC_SECS.has(p.sec)) continue;
    for(const ch of targets){
      chanBase[ch][p.id] = Math.min(p.max, Math.max(p.min,
        chanBase[ch][p.id] + (Math.random()*2-1)*0.09*(p.max-p.min)));
    }
  }
  if(!rndOpts.keepMod){
    for(const r of routes){ r.amt = Math.min(1, Math.max(-1, r.amt + (Math.random()*2-1)*0.15)); }
  }
  refreshUI(); renderRoutes();
}
/* ---- undo history ---- */
const histStack = [];
/* Only the values that are away from default. A full dump is 17 KB of which
   about 16 KB is parameters sitting where they already were. */
function trimState(st){
  const out = JSON.parse(JSON.stringify(st));
  out.chan = {};
  for(const ch of CHANNELS){
    const o = {};
    for(const p of CLIST) if(Math.abs(st.chan[ch][p.id] - p.def) > 1e-9) o[p.id] = st.chan[ch][p.id];
    if(Object.keys(o).length) out.chan[ch] = o;
  }
  if(!Object.keys(out.chan).length) out.chan = {A:{}};
  out.master = {};
  for(const p of MLIST) if(Math.abs(st.master[p.id] - p.def) > 1e-9) out.master[p.id] = st.master[p.id];
  return out;
}
function captureState(){
  const snap = snapshotAll();
  const st = {chan:snap.chan, master:snap.master, routes: routes.map(r=>({...r})),
    audioCfg: JSON.parse(JSON.stringify(audioCfg)),
    fbTrailMode, rescanMode, keyChroma, showKeyMatte, mixMode, edgeMode, wipeInv, activeChan, linkChans,
    mixMode2, wipeInv2, mixModeM, wipeInvM,
    mixBlend, mixBlend2, mixBlendM, mixKey, mixKey2, mixKeyM,
    fbWrap, fbMirror, fbBlend, fbNL, fbInvert, fbFlip, fbTap, outModel, osdMode, osdDate, fieldSrc, flowField, flowEdge,
    scanRevH, scanRevV, syncLatch, fbNoServo, ilMode, ilOrder, moshRecycle,
    chainOrder: chainOrder.slice(), stageEnabled: {...stageEnabled}, secBypass: {...secBypass},
    busSrc: {b1:busSrc.b1.slice(), b2:busSrc.b2.slice()},
    genMode: JSON.parse(JSON.stringify(genMode)),
    srcMode: (()=>{ const o={}; for(const ch of CHANNELS){
      const m = SRC[ch].mode;
      /* a shader is a generated source like any other, and its code is the
         source: without it the mode restores to a channel with nothing on it */
      if(m==="pattern"||m==="synth"||m==="text"||m==="feed"||m==="glsl")
        o[ch] = {mode:m, pattern:SRC[ch].pattern, feed:SRC[ch].feed,
                 glsl:SRC[ch].glsl, glslF0:SRC[ch].glslF0, glslF2:SRC[ch].glslF2};
    } return o; })(),
    srcText: (()=>{ const o={}; for(const ch of CHANNELS) o[ch] = {...SRC[ch].text}; return o; })()};
  st.mods = JSON.parse(JSON.stringify(mods));
  /* the taps travel with the patch: which input each one listens to, the band,
     the gain and the response. The analyser nodes are rebuilt on load. */
  st.audioTaps = audioTaps.map(t=>({id:t.id, name:t.name, chan:t.chan, lo:t.lo, hi:t.hi, gain:t.gain, resp:t.resp}));
  /* the shape of the frame is part of the piece, not a machine setting: a patch
     built for a phone screen is not the same patch at 16:9 */
  st.procAR = procAR; st.procRes = procRes;
  return st;
}
/* patches from before the mixer was split carry one combined value, where 13
   and 14 were keys and 15-19 were blends. Unpack them into the three stages. */
function migrateMixMode(st){
  if(st.mixBlend !== undefined) return;
  const un = v=>{
    v = v || 0;
    if(v <= 12) return {mode:v, blend:0, key:0};
    if(v === 13) return {mode:0, blend:0, key:1};
    if(v === 14) return {mode:0, blend:0, key:3};
    return {mode:0, blend:[1,3,4,5,2][v-15] || 0, key:0};
  };
  const a = un(st.mixMode), b = un(st.mixMode2), c = un(st.mixModeM);
  st.mixMode = a.mode;  st.mixBlend = a.blend;  st.mixKey = a.key;
  st.mixMode2 = b.mode; st.mixBlend2 = b.blend; st.mixKey2 = b.key;
  st.mixModeM = c.mode; st.mixBlendM = c.blend; st.mixKeyM = c.key;
}
function restoreState(st){
  migrateMixMode(st);
  if(typeof cancelGlide === "function") cancelGlide();
  /* start from a known state so anything the saved patch does not mention comes
     back as a default rather than as whatever happened to be loaded before */
  resetGlobals();
  if(st.rescanMode !== undefined) rescanMode = st.rescanMode;
  /* a patch saved before a stage existed would otherwise drop that stage from
     the chain permanently, with no pill and no way back but CHAIN RESET */
  if(st.chainOrder && st.chainOrder.length>=4){
    const seen = st.chainOrder.filter(k=>CHAIN_STAGES.indexOf(k)>=0);
    chainOrder = seen.concat(CHAIN_STAGES.filter(k=>seen.indexOf(k)<0));
  }
  if(st.stageEnabled) stageEnabled = {...stageEnabled, ...st.stageEnabled};
  if(st.wipeInv !== undefined) wipeInv = st.wipeInv;
  if(st.wipeInv2 !== undefined) wipeInv2 = st.wipeInv2;
  if(st.wipeInvM !== undefined) wipeInvM = st.wipeInvM;
  for(const k of ["fbWrap","fbMirror","fbBlend","fbNL","fbFlip","fbTap","outModel","osdMode","osdDate","fieldSrc","flowField","flowEdge","mixMode2","mixModeM","mixBlend","mixBlend2","mixBlendM","mixKey","mixKey2","mixKeyM","scanRevH","scanRevV","syncLatch","fbNoServo","ilMode","ilOrder","moshRecycle"]){
    if(st[k] !== undefined) eval(k+" = st."+k);
  }
  for(const k in secBypass) delete secBypass[k];
  if(st.secBypass) Object.assign(secBypass, st.secBypass);
  secBypassOn = Object.keys(secBypass).some(k=>secBypass[k]);
  if(st.fbInvert !== undefined) fbInvert = st.fbInvert;
  if(st.linkChans !== undefined){ linkChans = st.linkChans; const lb=document.getElementById("btnLinkChans"); if(lb) lb.classList.toggle("on", linkChans); }
  if(st.keyChroma !== undefined) keyChroma = st.keyChroma;
  if(st.mixMode !== undefined) mixMode = st.mixMode;
  if(st.edgeMode !== undefined) edgeMode = st.edgeMode;
  if(st.showKeyMatte !== undefined) showKeyMatte = st.showKeyMatte;
  if(st.chan){
    /* start every parameter from its default, then lay the state over it. A
       saved patch that predates a parameter now gets that parameter's default
       instead of inheriting whatever was loaded before, and a preset only has
       to carry what it actually changes. */
    for(const ch of CHANNELS) for(const p of CLIST) chanBase[ch][p.id] = p.def;
    for(const p of MLIST) mBase[p.id] = p.def;
    for(const ch of CHANNELS) if(st.chan[ch]) for(const p of CLIST)
      if(st.chan[ch][p.id] !== undefined) chanBase[ch][p.id] = st.chan[ch][p.id];
    if(st.master) for(const p of MLIST) if(st.master[p.id] !== undefined) mBase[p.id] = st.master[p.id];
    routes = (st.routes||[]).map(r=>({ch:"A", ...r}));
    if(st.mods || st.lfo1 || st.audioCfg || st.audioTaps) applyExtras(st);
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
    if(m.glsl !== undefined){
      SRC[ch].glsl = m.glsl; SRC[ch].glslF0 = m.glslF0 || "none"; SRC[ch].glslF2 = m.glslF2 || "none";
      SRC[ch].glslProg = null; SRC[ch].glslErr = "";   /* recompiled on the next frame */
    }
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
  if(extra.mods && extra.mods.length){
    mods = JSON.parse(JSON.stringify(extra.mods));
    for(const m of mods){
      if(m.type === "lfo" && m.phase === undefined) m.phase = Math.random();
      if(m.type === "env"){ m.level = m.level || 0; m.stage = "d"; m.prevGate = false; }
    }
    /* ids are minted from a counter, so it has to clear the highest suffix any
       saved modulator already carries, not merely the count of them */
    let hi = mods.length;
    for(const m of mods){ const n = parseInt(String(m.id).replace(/^\D+/, ""), 10); if(n > hi) hi = n; }
    modSeq = Math.max(modSeq, hi);
    rebuildMODSRC(); buildModPage();
  } else {
    /* patches saved before modulators became a list */
    for(const k of LFOKEYS){ const m = modById(k); if(m && extra[k]) Object.assign(m, extra[k]); }
  }
  if(extra.audioCfg){
    for(const k of ["bass","mid","high"]) if(extra.audioCfg[k]) Object.assign(audioCfg[k], extra.audioCfg[k]);
    if(extra.audioCfg.response !== undefined) audioCfg.response = extra.audioCfg.response;
  }
  if(extra.procAR && (extra.procAR !== procAR || (extra.procRes||procRes) !== procRes)){
    if(setProcRes(extra.procRes || procRes, extra.procAR)){
      const rs = document.getElementById("selRes"); if(rs) rs.value = String(procRes);
      const asp = document.getElementById("selAspect"); if(asp) asp.value = String(procAR);
      if(typeof sizeCanvas === "function") sizeCanvas();
    }
  }
  if(extra.audioTaps){
    for(const id in audNodes){ try{ audNodes[id].an.disconnect(); }catch(e){} delete audNodes[id]; }
    audioTaps = extra.audioTaps.map(t=>mkAudTap({...t}));
    let hiT = audioTaps.length;
    for(const t of audioTaps){ const n = parseInt(String(t.id).replace(/^\D+/, ""), 10); if(n > hiT) hiT = n; }
    audTapSeq = Math.max(audTapSeq, hiT);
    if(typeof wireTaps === "function") wireTaps();
    rebuildMODSRC();
    if(typeof buildAudTapList === "function") buildAudTapList();
    buildModPage();
  }
  if(extra.fbTrailMode !== undefined) fbTrailMode = extra.fbTrailMode;
}
function pushHistory(){
  histStack.push(captureState());
  if(histStack.length > 24) histStack.shift();
  redoStack.length = 0;
  patchDirty++;
}
/* one entry per gesture, not one per batch: a slider drag pushes its state on
   pointer-down, so undo steps back through what you actually did */
let gestureArmed = false;
function armGesture(){
  if(gestureArmed) return;
  gestureArmed = true;
  pushHistory();
  const done = ()=>{ gestureArmed = false; window.removeEventListener("pointerup", done); };
  window.addEventListener("pointerup", done);
}
window.__armGesture = armGesture;
const redoStack = [];
function undo(){
  const st = histStack.pop();
  if(!st){ toast("Nothing left to undo"); return; }
  redoStack.push(captureState());
  if(redoStack.length > 24) redoStack.shift();
  restoreState(st);
}
function redo(){
  const st = redoStack.pop();
  if(!st){ toast("Nothing to redo"); return; }
  histStack.push(captureState());
  restoreState(st);
}
document.getElementById("btnUndo").onclick = undo;
/* Everything that is not a parameter, reset in one place.
   This used to be spelled out separately in initPatch and not at all in the
   preset loader, which is exactly how a preset came to inherit the previous
   patch's wipe, mix type, key, chain order and bus routing. One list now, and
   every path that establishes a known state goes through it. */
const CHAIN_STAGES = ["sig","col","glitch","lab","flow","scan","dct","tdisp"];
function resetGlobals(){
  fbTrailMode=false; rescanMode=false; keyChroma=false; showKeyMatte=false;
  mixMode=0;  mixMode2=0;  mixModeM=0;
  wipeInv=false; wipeInv2=false; wipeInvM=false;
  mixBlend=0; mixBlend2=0; mixBlendM=0;
  mixKey=0;   mixKey2=0;   mixKeyM=0;
  edgeMode=0; linkChans=false;
  for(const k in secBypass) delete secBypass[k]; secBypassOn = false;
  fbWrap=0; fbMirror=0; fbBlend=0; fbNL=0; fbInvert=false; fbFlip=0; fbTap=0;
  outModel=0; fieldSrc=0; flowField=0; flowEdge=0;
  osdMode=1; osdDate=0;
  chainOrder = CHAIN_STAGES.slice();
  stageEnabled = {sig:true, col:true, glitch:true, lab:true, flow:true, scan:true, dct:true, tdisp:true};
  scanRevH = false; scanRevV = false; syncLatch = false; fbNoServo = false;
  ilMode = 0; ilOrder = false; moshRecycle = false;
  probeMode = 0;
  busSrc.b1 = ["A","B"]; busSrc.b2 = ["C","D"];
  for(const ch of CHANNELS) genMode[ch] = {shape:0, wave:0, col:1};
  copyDest = BUSPAIR[activeChan];
  { const lb=document.getElementById("btnLinkChans"); if(lb) lb.classList.remove("on"); }
}
function initPatch(){
  pushHistory();
  cancelGlide();
  if(perfRec.mode !== "off") perfStop();
  resetGlobals();
  osdCounter = 0; osdLast = "";
  multiView = false;
  for(const ch of CHANNELS) for(const p of CLIST) chanBase[ch][p.id] = p.def;
  for(const p of MLIST) mBase[p.id] = p.def;
  for(const ch of CHANNELS) if(window.__setTransport) window.__setTransport("play", ch);
  morphOverride.clear();
  morphA=null; morphB=null; morphOverride.clear();
  for(const el of ["morphBtnA","morphBtnB"]){ const b=document.getElementById(el); if(b) b.classList.remove("on"); }
  mods = defaultMods();
  rebuildMODSRC(); buildModPage(); renderRoutes();
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
    mixBlend, mixBlend2, mixBlendM, mixKey, mixKey2, mixKeyM,
    fbWrap, fbMirror, fbBlend, fbNL, fbInvert, fbFlip, fbTap, outModel, osdMode, osdDate, fieldSrc, flowField, flowEdge,
    chainOrder: chainOrder.slice(), stageEnabled: {...stageEnabled}, secBypass: {...secBypass},
    busSrc: {b1:busSrc.b1.slice(), b2:busSrc.b2.slice()},
    genMode: JSON.parse(JSON.stringify(genMode)),
    snapSlots, snapGlide, perfTake: perfRec.data, perfLen: perfRec.len,
    srcMode: (()=>{ const o={}; for(const ch of CHANNELS){
      const m = SRC[ch].mode;
      /* a shader is a generated source like any other, and its code is the
         source: without it the mode restores to a channel with nothing on it */
      if(m==="pattern"||m==="synth"||m==="text"||m==="feed"||m==="glsl")
        o[ch] = {mode:m, pattern:SRC[ch].pattern, feed:SRC[ch].feed,
                 glsl:SRC[ch].glsl, glslF0:SRC[ch].glslF0, glslF2:SRC[ch].glslF2};
    } return o; })(),
    srcText: (()=>{ const o={}; for(const ch of CHANNELS) o[ch] = {...SRC[ch].text}; return o; })()};
  state.mods = JSON.parse(JSON.stringify(mods));
  const blob = new Blob([JSON.stringify(state,null,1)], {type:"application/json"});
  dl(URL.createObjectURL(blob), "bendr-"+stamp()+".json");
  toast("State saved");
};
document.getElementById("btnLoad").onclick = ()=>{ fileIn.accept=".json"; fileIn.click(); };
function loadStateFile(f){
  f.text().then(txt=>{
    try{
      const s = JSON.parse(txt);
      /* any stray .json used to load as a patch and wipe the current one */
      if(!s || typeof s !== "object" || (s.app !== "bendr" && !s.chan && !s.bases)){
        toast("That .json is not a BENDR patch", true); return;
      }
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


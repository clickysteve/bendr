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
  scanAmt:"How hard brightness pushes the scan line up. This is the whole machine in one control: video luminance patched into the vertical deflection, so the picture physically bends the raster instead of being sampled by it. At zero the stage does nothing and costs nothing.",
  scanLines:"How many scan lines are drawn. Fewer means you see the individual lines and the gaps between them, which is the look; more approaches a continuous surface. This is real geometry, so it is one of the two controls that actually costs frame rate.",
  scanSamples:"How many points each line is drawn from. Too few and a steep displacement turns into visible facets; too many is wasted. The other control that costs frame rate.",
  scanWidth:"How wide the beam is. Thin lines give you the drawn, wiry look; wide ones close the gaps into a surface.",
  scanVel:"How much the beam brightens where it sweeps slowly. On a real tube a slower beam deposits more energy per unit length, which is why the ridges of a displaced raster glow and the steep faces go dim. Turning this off leaves you with something that looks like a displacement map rather than a photographed tube.",
  scanGain:"Overall brightness of the drawn raster. The lines add where they overlap, so this interacts with LINES: doubling the line count roughly doubles the brightness of a flat area.",
  scanTiltX:"Tilts the raster away from you. This is what turns a two-dimensional deflection into an apparent surface, and it is the reason the effect reads as three-dimensional when it is nothing of the kind.",
  scanTiltY:"Rotates the raster about the vertical, so you see the displacement from the side.",
  scanPersp:"How much perspective is applied to the tilt. Zero is an isometric view; wound up, the far edge converges.",
  scanMono:"Discards the colour and draws the raster in luminance only, which is what the original did - it was a black and white monitor being re-shot.",
  scanHue:"Colourises the drawn raster by brightness, so the displacement and the colour carry the same information. Fights with MONO on purpose.",
  scanCurve:"Bends the whole raster into an S, the way a continuous-wind yoke does. It is applied before the displacement, so the picture bends with it.",
  scanSkew:"Leans the raster sideways, which a bench monitor would call parallelogram. Also applied before displacement.",
  scanCollapse:"Removes the current from the vertical deflection, so the raster falls in on itself. At full the entire frame is smeared along a single line, which is a genuinely strange thing to look at and hard to get any other way.",
  scanWobAmt:"Drives the deflection from an oscillator, the way the modified receivers of the period did by adding extra yokes and feeding them from a signal generator.",
  scanWobFreq:"The oscillator frequency, as a multiple of the field rate.",
  scanWobLock:"How firmly the oscillator is locked to the field rate. Fully locked, the distortion stands still because it repeats identically every frame. Unlocked, it crawls, and the crawl is the characteristic gesture of the instrument.",
  scanLissa:"Drives the horizontal deflection from a second oscillator as well, so the two axes trace a Lissajous figure and the raster ties itself in knots.",
  ampAmt:"A string of comparators against evenly spaced thresholds, giving a set of discrete bands rather than a colour map. The point is not the posterisation: each band is a separate signal you can isolate, invert or colour on its own, which is a space to explore rather than a look to apply.",
  ampBands:"How many bands the greyscale is cut into, from two to eight.",
  ampPick:"Isolates a single band as a matte and drops everything else. At zero all the bands show at once.",
  ampCol:"Colours each band separately instead of leaving it as a level, so brightness becomes hue.",
  diffAmt:"An edge detector, but a bank of them rather than one: DIFF SCALE chooses how coarse the derivative is. Sharp finds texture, slow finds shape, and the difference between the two is often more interesting than either.",
  diffScale:"Which of six progressively longer time constants the differentiator uses.",
  diffPolar:"Colours the derivative by direction rather than magnitude, so which way an edge faces becomes hue.",
  fgPos:"Shapes the response above the midpoint. Positive expands the highlights, negative compresses them.",
  fgNeg:"Shapes the response below the midpoint, independently of the response above it. Being able to bend the two halves in opposite directions is what makes this more than a contrast control.",
  fgZero:"A dead zone around the midpoint where the amplifier does nothing. This is the part nobody implements and the part where the interesting behaviour lives: widen it and the picture separates into what is definitely bright, what is definitely dark, and a flat nothing in between.",
  dctAmt:"The artefacts of a badly compressed picture are not properties of a file format, they are properties of a transform: a block DCT, coefficients quantised, transformed back. This does that as a two-pass separable transform in real time, so you get real ringing, real blocking and real chroma bleed with the quantiser under your hand instead of buried inside an encoder.",
  dctQ:"How coarsely the coefficients are rounded. This is the single control that decides how broken it looks.",
  dctTilt:"How much harder the quantiser treats high frequencies than low ones. Wound up, detail collapses first and flat areas survive, which is exactly the priority a real encoder has.",
  dctChroma:"Crushes the colour coefficients harder than the luminance ones, which is what every codec does and why compressed colour smears across a block while the edges stay sharp.",
  dctBlock:"The size of the block the transform works on, from four pixels to sixteen. Small blocks give fine mosaic; large ones give the slabs.",
  pngAmt:"A PNG row is not stored as pixels but as a difference against a predictor, and the decoder rebuilds it by accumulating. Corrupt one byte and every pixel after it inherits the error, so a single bad value avalanches to the edge of the picture. That directional, accumulating corruption is completely unlike sorting or smearing.",
  pngDir:"Which predictor the corrupted rows used, and therefore which way the error runs: along the line, down the column, or diagonally with a soft tail.",
  pngRun:"How far an error runs before it is contained.",
  tdAmt:"Every other stage samples the current frame at a different place. This one samples a different frame at the same place: each pixel chooses how far into the past to look.",
  tdMap:"What decides how far back each pixel looks. A vertical ramp is slit-scan; a horizontal one sweeps; the picture's own brightness makes bright things lag behind dark ones; radial pushes time out from the centre; and the per-line ramp is exactly what a time-base corrector does as it fails.",
  tdSpread:"How far back the oldest pixel reaches, across a ring of twelve frames.",
  tdSoft:"Blends between neighbouring frames rather than stepping between them. Off gives you visible time-quantised bands, which is its own thing.",
  tdWarp:"Drifts the map itself, so the boundary between now and then travels through the picture.",
  ilAmt:"How much of the picture goes through the field domain. Video is not frames: it is sixty half-height pictures a second, each sampled at a different instant and offset by half a line. Almost everything that makes video look like video rather than film comes from that, and this is the control that puts it back.",
  ilTwitter:"High vertical detail lands on one field only, so it flickers at half the frame rate. This is why broadcast graphics were always vertically soft: they had to be, or they crawled.",
  ilJudder:"Film runs at 24 and video at 30, so some frames are held for three fields and some for two. The unevenness is the judder everybody recognises without being able to name.",
  moshAmt:"How much of the moshed picture you see. The clean picture is encoded to video, the bitstream is damaged, and the result is decoded back: what comes out is a real codec failing, not a shader pretending. Costs an encode and a decode per frame, and lands a frame or two late.",
  moshKey:"How often a keyframe is thrown away. A keyframe is a whole picture; everything between is only the difference from the last one. Remove the keyframes and the decoder keeps painting new movement onto an old picture, which is the entire trick.",
  moshHold:"Re-sends the same difference several times over. The movement applies again and again to a picture it was never measured from, so shapes stretch and smear along their own motion.",
  moshSkip:"Throws differences away instead of repeating them, so the picture stalls and then jumps.",
  moshShuffle:"Re-injects a difference from a couple of seconds ago, out of order. Old movement arrives on top of the current picture.",
  moshRate:"Scales how often all of the above actually fire. Low is an occasional fault; high is a stream that never recovers.",
  moshQ:"Starves the encoder of bitrate, so it spends what it has on movement and lets detail go. This is where the blocking and the mud come from, and it is a real quantiser, not a block filter.",
  moshResync:"Lets a keyframe through every so often, so the picture snaps back to reality and starts falling apart again. At zero it never recovers.",
  phosR:"How long the red phosphor holds, relative to the persistence control.",
  phosG:"How long the green phosphor holds. On real P22 phosphors green is the slowest, which is why a fast movement on a tube leaves a green-tinted wake rather than a grey one.",
  phosB:"How long the blue phosphor holds. Blue decays fastest, so it forms the leading edge of a trail.",
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
  field:"The field domain, sitting between the mixer and the display. Video was never frames: it is two interleaved half-height pictures, sampled a fiftieth of a second apart. Almost everything that reads as video rather than film starts here.",
  codec:"An actual encoder and decoder, wired back to back with the bitstream broken in between. Keyframes are removed, differences are held, dropped and re-ordered, and the decoder is left to make what it can of it. Everything else in the instrument is a model of a failure; this one is the failure.",
  crt:"The master display stage, shared by everything. Not a filter but a model of a screen: mask geometry, beam profile, persistence, and the output transform.",
  overlay:"Everything between the picture and the eye: the lens, the glass in front of the screen, the panel itself, and the deck's own burnt-in display. Not effects on the signal, but artefacts of whatever it is being watched through.",
  dct:"A block transform, run in real time rather than round-tripped through a file. Eight-point DCT along one axis, quantise, invert, then the same down the other - separable rather than a true 2D quantisation, but every artefact it makes is a real one.",
  tdisp:"Per-pixel temporal addressing: a ring of twelve whole frames the shader can read per pixel, so each pixel can be looking at a different moment.",
  scan:"A scan processor, in the sense the word had before it meant anything digital. The picture is not sampled; it is drawn, as a stack of glowing lines whose vertical position is pushed by brightness, and then photographed. The apparent depth is an artefact of that, not a model of a scene. Where the lines bunch you get a bright ridge and where they splay you get a gap, which is the part a displacement map cannot reproduce and the part that makes it look like a machine.",
  lab:"Techniques from the open-source glitch canon, rebuilt: sparse line jitter, NTSC crosstalk, slitscan, bit crush, moire, and video-rate field modulation.",
  audio:"Sets what the audio-reactive mod sources listen to: each band's frequency range and gain, the input device, and the response time.",
  lfo:"Rates and shapes for the four LFOs, plus tempo and the sync divisions.",
};

/* Master sections are single-instance; everything else exists once per channel. */
const MASTER_SECS = new Set(["mixer","mixer2","mixerM","field","codec","crt","overlay","morph"]);
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
  /* the frame loop keeps a copy of these and only refreshes it when something
     has actually moved, so every write has to say so */
  if(typeof bumpParams === "function") bumpParams();
  if(p.master){ mBase[id]=v; return; }
  if(ch){ chanBase[ch][id]=v; return; }
  if(linkChans){ for(const c of CHANNELS) chanBase[c][id]=v; }
  else chanBase[activeChan][id]=v;
}
function getCur(id, ch){ const p=P[id]; return p.master ? mCur[id] : chanCur[ch||activeChan][id]; }
function copyChannel(from, to){
  if(from === to) return;
  for(const p of CLIST) chanBase[to][p.id] = chanBase[from][p.id];
  if(typeof bumpParams === "function") bumpParams();
}
function swapChannels(a, b){
  if(a === b) return;
  for(const p of CLIST){ const t = chanBase[a][p.id]; chanBase[a][p.id] = chanBase[b][p.id]; chanBase[b][p.id] = t; }
  if(typeof bumpParams === "function") bumpParams();
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
let fbFlip = 0;        // sign switch on the loop transform: 0 none 1 H 2 V 3 both
let fbTap = 0;         // 0 pre-display  1 post-display (rescan)
/* deflection reversal is a switch on the yoke, not a continuous control */
/* which internal signal, if any, is on the output instead of the picture */
let probeMode = 0;
let moshRecycle = false;  // encode the decoded picture instead of the clean one
let ilMode = 0;           // 0 weave 1 bob 2 blend
let ilOrder = false;      // field order swapped
let scanRevH = false, scanRevV = false;
/* Two ways to let the machine fail without recovering. Everything else here is
   bounded because a control needs bounds, but a model that always recovers is
   a model that cannot actually break. */
let syncLatch = false;    // the PLL never re-acquires
let fbNoServo = false;    // nothing pulls feedback gain back to unity
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


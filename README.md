# BENDR

**A circuit-bent video processor that runs in your browser.**

**▶ Live: [bendr.allmyfriendsaresynths.com](https://bendr.allmyfriendsaresynths.com)**

BENDR emulates the analogue glitch aesthetic of circuit-bent video hardware: bent video enhancers, dying VHS decks, unstable sync circuits, and rescan feedback rigs — plus a digital corruption stage for pixel sorting, databending and datamoshing. Feed it video and abuse the signal path in real time.

Everything is a single self-contained HTML file. No server, no dependencies, nothing leaves your machine — video files stream from disk, so a 4GB MP4 works as well as a 4MB one. Chrome recommended.

The panel sections drag to reorder and the layout remembers it. The mod matrix, modulation page and text editor live in a resizable dock under the picture rather than in pop-up panels, so the output stays visible while you patch. Every parameter, section, mode button and pad carries a hover description explaining what it does and why it behaves that way; any single control resets with a double-click.

Works on phones and tablets too: the picture stays pinned at the top, controls / bend pads / mod matrix live behind a bottom tab bar, sliders and pads are touch-sized, and the signal chain reorders with tap arrows instead of drag.

![BENDR interface](docs/doc_ui.png)

## Four channels, three buses

BENDR is a four-channel mixer. **A**, **B**, **C** and **D** each have their own input *and* their own complete set of effects — four sources, four glitch chains, four decks, running at once. The big A / B / C / D buttons at the top of the panel choose which channel you're editing; LINK edits all four, COPY and SWAP move settings between a channel and its partner on the same bus.

The channels meet in three mixers, each with the same twenty transitions. Each bus picks its own two inputs, so the pairings are not fixed: bus 1 can mix A against C, bus 2 can mix D against B. **MASTER MIX** then crossfades bus 1 against bus 2. To get all four in at once, set both bus faders part-way and put the master on ADD, SCREEN or LIGHTEN so the buses sum instead of crossfading. Everything downstream (display, overlay, morph) is shared. Leave the master fader at zero and channels C and D never render, so a two-channel setup costs exactly what it always did.

**MULTI** shows all four channel outputs, bus 1 and the programme at once, like a vision mixer's preview monitors.

![Multiview](docs/doc_multiview.png)

![Four channels through three buses](docs/doc_quad.png)

![Two channels mixed through a circle wipe](docs/doc_mixer.png)

## Signal chain

The rail above the picture is the live signal path. **Drag the pills to reorder the stages, click one to bypass it.** Order changes everything: melting before the tape stage smears clean video and then damages it; melting after smears the damage itself.

```
per channel (A B C D):  INPUT → framing → FEEDBACK / RESCAN → frame store
                          → [ TAPE/SYNC · COLOUR/ENH · GLITCH LAB · SIGNAL LAB · FLOW/MOSH ]  ← reorderable
                  A + B:  → MIX BUS 1 ┐
                  C + D:  → MIX BUS 2 ┴→ MASTER MIX → MASTER OUTPUT → OVERLAY
```

- **Tape / sync** — a per-scanline PLL simulation runs on the CPU every frame, once per channel: correlated drift, loss-of-lock shear with exponential re-lock, a drifting tracking band, head-switch skew, AGC breathing, a rolling blanking bar when v-hold slips. Composite rot on top: chroma bleed and delay, directional luma bleed, vertical colour bleed, rainbow fringing, dot crawl, ringing, streaky bandwidth-limited noise, comet-tail dropouts.
- **Tape transport** — a whole deck per channel. The transport row drives that channel's source: still parks the noise bar a paused deck lays across the field, shuttle and jog scrub with head-crossing bands marching through the picture. Tape speed runs SP to EP, so the slower the tape the less bandwidth survives; generations compounds gen loss as if the tape had been dubbed that many times; track phase places the mistracking band and servo hunt sets the auto-tracking circuit searching for it. Then tape crease, head clog, azimuth error, scrape flutter, wow with its own rate, tape stretch, edge damage, print-through, chroma loss, hiss, and dropout with adjustable streak length.

![A chewed tape](docs/doc_deck.png)
- **Colour / bent enhancer** — luma-keyed rainbow colorizer, a sharpness circuit driven into oscillating edge ghosts, RGB split, luma→hue slew, flickering inversion, per-channel RGB gain, posterize, solarize.
- **Contour / palette** — draws the isolines between brightness bands, giving the repeated outlines that trace a face or a body the way a bent enhancer does; plus FLATTEN to quantise brightness into solid poster-like colour fields, and DITHER to break the steps into speckle.
- **Kaleido** — folds the picture into radial symmetry; FOLD N = 3 gives triangles, and modulating FOLD SPIN rotates the whole composition.
- **CRT rephoto** — bloom, film-style halation, glass defocus and grain, for the look of a photograph *of* a screen rather than a clean render.
- **Glitch lab** — pixel sorting (bright runs stretch into streaks), macroblock databending, halftone dropout, channel-driven drift warp, FM contour warp.
- **Flow / mosh** — a temporal-smear stage with its own frame store, advected along a selectable vector field: real per-pixel optical flow estimated from the picture, brightness contours, curl noise, radial, spiral, chroma, weave. P-frame push drags the held frame along that field, which on the motion setting is what datamosh actually is — the picture stops updating while the movement keeps pulling it apart. Mosh gate restricts the holding to the moving parts of the frame or to the still parts; curl rotates the whole field so drift becomes orbit. Plus melt with its own angle and brightness gate, swirl with scale and speed, vector trash with block size and rate, stretch, edge repel, flow noise, per-pass hue and decay, re-sharpening, time shear on either axis, and clamp / repeat / mirror edges.
- **Feedback / rescan** — a full feedback rig: zoom, rotate, shear, offset and mirror in the loop, edge mode (clamp for tunnels, repeat for lattices, mirror for mandalas), per-pass colour rotation, saturation, value gain and per-channel RGB gain, chromatic displacement, blur plus sharpen (an activator–inhibitor pair that grows Turing patterns), a four-way non-linearity (clamp / soft / wrap / fold) with drive and pivot, threshold, loop noise, vertical roll, sync jitter and an auto-level servo. RESCAN: FULL feeds the display output back through the entire chain. Thirty presets prefixed **FB** are named after the looks they produce.
- **Signal lab** — sparse line jitter, NTSC crosstalk with separate artifact and fringing controls, shaped snow with clumping, FM wobble, slitscan, row smear, 1-bit crush with ordered dither, moiré, a multi-band sequential keyer, and field modulation that varies across the frame rather than per-frame.
- **Keyer** — luma or chroma key with a matte viewer; masks the glitch chain and/or the feedback.
- **Mixers** — three of them (bus 1, bus 2, master), each combining two fully-processed inputs: a fader plus twelve wipe patterns (H, V, diagonal, box, circle, splits, blinds, clock, bars, blocks) with soft edges and movable origin, key transitions, and add/difference/multiply/screen/lighten blends.
- **Preset morph** — snapshot two whole panel states and blend every slider between them.
- **Master output** — a display stage rather than a filter: seven display models (flat, aperture grille, slot mask, shadow mask, LCD stripe, mono monitor, green screen) with beam-profile scanlines that widen with brightness, phosphor persistence, HV sag, bloom, halation, defocus, grain, and a full output transform. Plus an overlay stage: letterbox and pillarbox mattes, bezel, glass glare, dust, scratches, screen moiré, rolling shutter and safe-area guides.

| ![Datamosh](docs/doc_out_datamosh.png) | ![Halftone](docs/doc_out_dots.png) | ![Liquid melt](docs/doc_out_melt.png) |
|---|---|---|
| DATAMOSH | DOT MATRIX | LIQUID MELT |

| ![Contour lines](docs/doc_vol1.png) | ![Triangles](docs/doc_triangles.png) | ![CRT rephoto](docs/doc_crt.png) |
|---|---|---|
| VOL I — ENHANCER LINES | TRIANGLES | CRT REPHOTO |

Presets named after the glitch art series on [allmyfriendsarejpegs.com](https://allmyfriendsarejpegs.com): VOL I / II / III, TRIANGLES, 80S TRIANGLE, BLADE RUNNER TRIANGLE, CRT REPHOTO and JPEGS.

## Pattern synth

Any channel can be a generator rather than a player. It is built like a video synthesiser: coordinates go through a shape (scan, radial, spiral, plasma, lissajous, rings, starburst, grid, tunnel, cells, interference, polygon), then an oscillator with a selectable waveform, then cross-modulation between the axes, a wavefolder, a comparator, and a colouriser — mono, RGB phase, HSV sweep, duotone or hard bands. It runs entirely on the GPU and every control is a modulation destination, so patching an LFO into CROSS MOD turns it into a moving source with no file involved.

![Pattern synth](docs/doc_synth.png)

## Snapshots and the performance recorder

Eight slots hold the whole rig — all four channels, every bus, every mode — with a **glide** time. At zero a recall is a hard cut; wound up it becomes a slow transformation of everything at once.

The **performance recorder** writes down every control you move, twenty-four times a second, storing only what changed. It records gestures rather than pixels, so a take built slowly over an hour can be played back in real time, against completely different footage. Takes are saved inside the patch file.

## Text and shapes

Any channel can be a text/shape generator instead of a video source: type anything, choose from thirty-three fonts, set size, tracking, position, rotation, scroll and repeat, add an outline, and layer a shape underneath (circle, ring, rect, triangle, cross, bars, grid, concentric rings, starburst) with count, spin, stroke and pulse. It behaves exactly like any other source, so it can be glitched, fed back and mixed against video on the other channel.

![Text through contour and feedback](docs/doc_text.png)

## Movement

Nothing sits still. The mod matrix patches any source into any parameter:

- Four LFOs, ten shapes, free-running or tempo-synced via tap tempo or MIDI clock
- Chaos, drift and spike generators
- Audio bands with adjustable frequency ranges, gain, response, input device and channel selection for audio interfaces
- Video-reactive sources computed from the picture itself: motion, brightness, and scene-cut detection — patch CUT into TEAR and every edit knocks the sync loose

**Right-click any parameter** to patch a modulator onto it directly. The **MOD** page (`D`) draws every source live — four LFOs with editable rate, ten shapes and tempo sync, chaos/drift/spike generators, audio bands and video-reactive sources — and shows what each one is driving.

![Modulation page](docs/doc_modpage.png)

Presets you build yourself save to the machine and sit in the preset list beside the built-in ones; patches also save as `.json` files to move between machines.

Six momentary bend pads (mouse, `Q W E R T Y`, or MIDI notes C1–F1), MIDI CC learn on every slider, randomize/mutate with undo, per-section resets and a global init.

## Output

- Processing resolution from 360p to **4K**, independent of window size
- Live **recording** with source audio, MP4 where the browser supports it and WebM otherwise
- Frame-accurate **offline MP4 render** via WebCodecs — every frame processed at full quality regardless of realtime performance (video only)
- PNG stills, fullscreen, and a clean **pop-out output window** for OBS capture or a second display

## Keys

`Space` randomize · `M` mutate · `Z` undo · `1–9` presets · `shift`+`1–8` snapshots · `Q W E R T Y` hold bends · `B` bypass · `V` multiview · `F` fullscreen · `S` snapshot · `R` record · `P` play/pause · `H` help

## Development

Source lives in `src/` as four parts (shell/CSS, GL engine + shaders, modulation + UI, I/O + main loop) plus a vendored MP4 muxer. Build the single-file `index.html` with:

```
python3 build.py
```

`test/e2e-example.js` shows how the app is exercised headlessly with Playwright.

## License

MIT.

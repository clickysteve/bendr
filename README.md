# BENDR

**A circuit-bent video processor that runs in your browser.**

**▶ Live: [bendr.allmyfriendsaresynths.com](https://bendr.allmyfriendsaresynths.com)**

BENDR emulates the analogue glitch aesthetic of circuit-bent video hardware: bent video enhancers, dying VHS decks, unstable sync circuits, and rescan feedback rigs — plus a digital corruption stage for pixel sorting, databending and datamoshing. Feed it video and abuse the signal path in real time.

Everything is a single self-contained HTML file. No server, no dependencies, nothing leaves your machine — video files stream from disk, so a 4GB MP4 works as well as a 4MB one. Chrome recommended.

![BENDR interface](docs/doc_ui.png)

## Signal chain

The rail above the picture is the live signal path. **Drag the pills to reorder the stages, click one to bypass it.** Order changes everything: melting before the tape stage smears clean video and then damages it; melting after smears the damage itself.

```
INPUT (A/B mixer · framing) → FEEDBACK / RESCAN → frame store
  → [ TAPE/SYNC · COLOUR/ENHANCER · GLITCH LAB · FLOW/MOSH ]  ← reorderable
  → CRT OUT
```

- **Tape / sync** — a per-scanline PLL simulation runs on the CPU every frame: correlated drift, loss-of-lock shear with exponential re-lock, a drifting tracking band, head-switch skew, AGC breathing, a rolling blanking bar when v-hold slips. Composite rot on top: chroma bleed and delay, directional luma bleed, vertical colour bleed, rainbow fringing, dot crawl, ringing, streaky bandwidth-limited noise, comet-tail dropouts.
- **Colour / bent enhancer** — luma-keyed rainbow colorizer, a sharpness circuit driven into oscillating edge ghosts, RGB split, luma→hue slew, flickering inversion, per-channel RGB gain, posterize, solarize.
- **Glitch lab** — pixel sorting (bright runs stretch into streaks), macroblock databending, halftone dropout, channel-driven drift warp, FM contour warp.
- **Flow / mosh** — holds its own history and advects it: mosh hold freezes frames while motion keeps pushing them, melt drips brightness downward, swirl advects through a noise field, vector trash shoves macroblocks like corrupted motion vectors, time shear smears top and bottom differently.
- **Feedback / rescan** — zoom/rotate/hue-spin feedback; RESCAN: FULL feeds the CRT output (scanlines, curvature and all) back through the entire chain.
- **Keyer** — luma or chroma key with a matte viewer; masks the glitch chain and/or the feedback.
- **Mixer** — two video channels with independent framing, a fader plus twelve wipe patterns (H, V, diagonal, box, circle, splits, blinds, clock, bars, blocks) with soft edges and movable origin, key transitions, and add/difference/multiply/screen/lighten blends.
- **Preset morph** — snapshot two whole panel states and blend every slider between them.

| ![Datamosh](docs/doc_out_datamosh.png) | ![Halftone](docs/doc_out_dots.png) | ![Liquid melt](docs/doc_out_melt.png) |
|---|---|---|
| DATAMOSH | DOT MATRIX | LIQUID MELT |

## Movement

Nothing sits still. The mod matrix patches any source into any parameter:

- Four LFOs (sine/tri/saw/square/S&H), free-running or tempo-synced via tap tempo or MIDI clock
- Chaos, drift and spike generators
- Audio bands with adjustable frequency ranges, gain, response, input device and channel selection for audio interfaces
- Video-reactive sources computed from the picture itself: motion, brightness, and scene-cut detection — patch CUT into TEAR and every edit knocks the sync loose

Six momentary bend pads (mouse, `Q W E R T Y`, or MIDI notes C1–F1), MIDI CC learn on every slider, randomize/mutate with undo, per-section resets and a global init.

## Output

- Live **WebM recording** with source audio
- Frame-accurate **offline MP4 render** via WebCodecs — every frame processed at full quality regardless of realtime performance (video only)
- PNG stills, fullscreen, and a clean **pop-out output window** for OBS capture or a second display

## Keys

`Space` randomize · `M` mutate · `Z` undo · `1–9` presets · `Q W E R T Y` hold bends · `B` bypass · `F` fullscreen · `S` snapshot · `R` record · `P` play/pause · `H` help

## Development

Source lives in `src/` as four parts (shell/CSS, GL engine + shaders, modulation + UI, I/O + main loop) plus a vendored MP4 muxer. Build the single-file `index.html` with:

```
python3 build.py
```

`test/e2e-example.js` shows how the app is exercised headlessly with Playwright.

## License

MIT.

# BENDR

**A circuit-bent video processor that runs in your browser.**

BENDR emulates the analogue glitch aesthetic of circuit-bent video hardware: bent video enhancers, dying VHS decks, unstable sync circuits, and rescan feedback rigs. Feed it video and abuse the signal path in real time.

Everything is a single self-contained HTML file. No install, no server, nothing leaves your machine. Open `bendr.html` in Chrome and drop a video on it.

## Signal path

```
A/B mixer → feedback / rescan → frame store (echo · stutter)
  → tape & sync damage ⇄ bent enhancer & colour (CHAIN swaps order)
  → keyer masks → CRT
```

- **Physical sync model** — per-scanline PLL simulation on the CPU: correlated drift, loss-of-lock shear with exponential re-lock, drifting tracking band, head-switch skew, AGC breathing, rolling blanking bar. No random rectangles.
- **Composite/NTSC rot** — chroma bleed & delay, rainbow fringing on luma edges, dot crawl, ringing, bandwidth-limited streaky noise, comet-tail dropouts.
- **Bent enhancer** — luma-keyed rainbow colorizer, sharpness circuit driven into oscillating edge ghosts, RGB split, luma→hue slew, flickering inversion, per-channel RGB gain.
- **Feedback / rescan** — zoom/rotate/hue-spin feedback; RESCAN:FULL feeds the CRT output (scanlines and all) back through the entire chain.
- **Frame store** — echo from N frames back (modulate DELAY to time-scrub), stutter freeze.
- **Keyer** — luma or chroma key with threshold/soft/invert; masks the FX chain and/or feedback.
- **A/B mixer** — two video channels, fade / luma-key / chroma-key compositing, full-state morph between two stored panel snapshots.

## Movement

Mod matrix with four LFOs (tempo-syncable), chaos, drift, spike, audio bands (bass/mid/high with adjustable frequency ranges, device and channel selection for audio interfaces), and video-reactive sources (MOTION, BRIGHT, CUT — patch CUT→TEAR and every edit knocks the sync loose). Six momentary bend pads, tap tempo, MIDI clock, MIDI CC learn, MIDI notes C1–F1 for the pads.

## Output

Live WebM recording with audio, PNG stills, fullscreen, a clean pop-out window for OBS capture or a second display, and frame-accurate offline MP4 rendering via WebCodecs.

## Keys

`Space` randomize · `M` mutate · `Z` undo · `1–9` presets · `Q W E R T Y` hold bends · `B` bypass · `F` fullscreen · `S` snapshot · `R` record · `P` play/pause · `H` help

## Development

Source lives in `src/` as four parts (shell/CSS, GL engine + shaders, modulation + UI, I/O + main loop) plus the vendored [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (MIT). Build the single-file app with:

```
python3 build.py
```

`test/e2e-example.js` shows how the app is exercised headlessly with Playwright (load video, switch presets, record, render).

## Notes

- Chrome recommended (WebMIDI, WebCodecs H.264, best video codec support). Any size of video file works — playback streams from disk.
- Offline MP4 render is video-only; capture audio with REC or marry it in an editor.

## License

MIT. Vendored mp4-muxer is MIT, © Vanilagy.

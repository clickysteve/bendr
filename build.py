#!/usr/bin/env python3
"""Concatenate the source parts into one self-contained index.html.

Everything shares one top-level scope, which is what lets a later part use a
const declared in an earlier one with no imports and no bundler. The cost of
that is that ordering is load-bearing and nothing enforces it, so this script
checks what it reasonably can: the marker it splits on, the syntax of the
result, the size, and where each part landed so a stack trace can be read.
"""
import io, os, subprocess, sys, gzip, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
# Order is load-bearing: everything lands in one script tag and one scope, so a
# later part can use a const from an earlier one with no imports and no bundler.
PARTS = [
    "p20_shaders.js",   # GLSL source strings, nothing else
    "p21_params.js",    # section table, parameter registry, get/set
    "p22_help.js",      # per-parameter and per-section help text
    "p23_gl.js",        # context, programs, render targets, uniforms
    "p3_mod_ui.js",     # modulation engine, audio, panel and dock construction
    "p40_presets.js",   # presets, user presets, state capture/restore, undo
    "p41_sources.js",   # file, camera, screen, pattern, text, synth, feed
    "p42_capture.js",   # record, stills, multiview, snapshot bank, recorder
    "p43_render.js",    # sync model, render loop, deck display
    "p44_offline.js",   # offline MP4 render, MIDI, keyboard, init
]
SIZE_BUDGET = 700_000          # fail rather than drift past this unnoticed

def read(name):
    with io.open(os.path.join(HERE, name), encoding="utf-8") as f:
        return f.read()

p1 = read("p1_shell.html")
muxer = read("mp4-muxer.min.js")

idx = p1.rfind("<script>")
if idx < 0:
    sys.exit("build: no <script> marker in p1_shell.html")

bodies = [read(n) for n in PARTS]
body = "".join(bodies)

out = (p1[:idx]
  + '<script>/* mp4-muxer v5 (c) Vanilagy, MIT license — inlined for offline use */\n'
  + muxer + '\n</' + 'script>\n'
  + p1[idx:]
  + body
  + '</' + 'script>\n</body>\n</html>\n')

with io.open(os.path.join(HERE, "index.html"), "w", encoding="utf-8") as f:
    f.write(out)

# where each part landed, so index.html:6142 can be resolved by eye
line = out[:len(out) - len(body) - len('</script>\n</body>\n</html>\n')].count("\n") + 1
offsets = []
for name, src in zip(PARTS, bodies):
    n = src.count("\n")
    offsets.append((name, line, line + n - 1))
    line += n

# syntax-check the concatenated body, which is the thing that actually breaks
status = "not checked (node unavailable)"
try:
    tmp = os.path.join(HERE, ".build-check.js")
    with io.open(tmp, "w", encoding="utf-8") as f:
        f.write(body)
    r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
    os.remove(tmp)
    if r.returncode != 0:
        sys.stderr.write(r.stderr)
        sys.exit("build: the concatenated script does not parse")
    status = "ok"
except FileNotFoundError:
    pass

raw = out.encode("utf-8")
gz = len(gzip.compress(raw, 9))
digest = hashlib.sha256(raw).hexdigest()[:12]

print("built %d bytes (%d gzipped, %.1f:1)  sha %s  syntax %s"
      % (len(raw), gz, len(raw) / float(gz), digest, status))
for name, a, b in offsets:
    print("  index.html lines %5d-%5d  %s" % (a, b, name))
if len(raw) > SIZE_BUDGET:
    sys.exit("build: %d bytes is over the %d budget" % (len(raw), SIZE_BUDGET))

#!/usr/bin/env python3
"""Build bendr.html from the source parts. Run from the repo root: python3 build.py"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
p1 = open('src/p1_shell.html').read()
muxer = open('src/vendor/mp4-muxer.min.js').read()
body = (open('src/p2_engine.js').read()
      + open('src/p3_mod_ui.js').read()
      + open('src/p4_io_main.js').read())
idx = p1.rindex('<script>')
out = (p1[:idx]
  + '<script>/* mp4-muxer v5 (c) Vanilagy, MIT license - inlined for offline use */\n'
  + muxer + '\n</' + 'script>\n'
  + p1[idx:]
  + body
  + '</' + 'script>\n</body>\n</html>\n')
open('bendr.html', 'w').write(out)
print('built bendr.html,', len(out), 'bytes')

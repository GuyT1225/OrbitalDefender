#!/usr/bin/env python3
"""Stage verified Graph War music in Orbital Defender; do not localize failed downloads."""
from pathlib import Path
import urllib.request
import urllib.error
import re

tracks = {
 "synthwave": ("synthwavehouse_0.ogg", "https://opengameart.org/sites/default/files/synthwavehouse_0.ogg"),
 "mindstream": ("DST-MindStream.mp3", "https://opengameart.org/sites/default/files/DST-MindStream.mp3"),
 "technological": ("tecnological_messup_v2.ogg", "https://opengameart.org/sites/default/files/tecnological_messup_v2.ogg"),
 "void": ("claimed_by_the_void_loop.mp3", "https://opengameart.org/sites/default/files/claimed_by_the_void_loop.mp3"),
 "brute": ("brute_force_loop.mp3", "https://opengameart.org/sites/default/files/brute_force_loop.mp3"),
 "bilwe": ("bilwe.mp3", "https://opengameart.org/sites/default/files/bilwe.mp3"),
 "calm": ("Relaxing_0.mp3", "https://opengameart.org/sites/default/files/Relaxing_0.mp3"),
}
out = Path("assets/audio/music")
out.mkdir(parents=True, exist_ok=True)
js_path = Path("game.js")
js = js_path.read_text()
success = 0
for key, (filename, url) in tracks.items():
    target = out / filename
    try:
        if not target.exists():
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; OrbitalDefenderAudioImporter/1.0)"})
            with urllib.request.urlopen(req, timeout=45) as response:
                data = response.read(25 * 1024 * 1024 + 1)
            if len(data)>25*1024*1024 or len(data)<8000:
                raise ValueError(f"Unexpected audio size: {len(data)}")
            valid = data[:4] == b"OggS" if filename.endswith(".ogg") else (data[:3] == b"ID3" or data[:2] == bytes([255,251]) or data[:2] == bytes([255,243]) or data[:2] == bytes([255,242]))
            if not valid:
                raise ValueError(f"Not supported audio header: {data[:8]!r}")
            target.write_bytes(data)
        if not target.is_file():
            continue
        js = js.replace('url:"' + url + '"', 'url:"' + str(target).replace("\\", "/") + '"')
        success += 1
        print(f"LOCAL {key}: {target} ({target.stat().st_size} bytes)")
    except Exception as exc:
        print(f"REMOTE FALLBACK {key}: {type(exc).__name__}: {exc}")
if success:
    js_path.write_text(js)
    html = Path("index.html")
    body = html.read_text()
    body = body.replace('game.js?v=0573', 'game.js?v=0574')
    html.write_text(body)
print(f"Localized {success}/{len(tracks)} playable Graph War music tracks.")

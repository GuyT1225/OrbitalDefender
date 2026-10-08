#!/usr/bin/env python3
"""Vendor CC0 Graph War and supplemental firing sounds, rewriting only verified local files."""
from pathlib import Path
import urllib.request

sources = {
 "fire": ("fire_heavy.wav", "https://raw.githubusercontent.com/GuyT1225/graph-war/main/assets/audio/fire_heavy.wav"),
 "impact": ("impact_pen.wav", "https://raw.githubusercontent.com/GuyT1225/graph-war/main/assets/audio/impact_pen.wav"),
 "splash": ("water_explode.opus", "https://raw.githubusercontent.com/GuyT1225/graph-war/main/assets/audio/water_explode.opus"),
 "laserCannon": ("doomsday_laser_cannon_short.wav", "https://opengameart.org/sites/default/files/doomsday_laser_cannon_short.wav"),
 "laserCluster": ("sfx_laser_1.mp3", "https://opengameart.org/sites/default/files/sfx_laser_1.mp3"),
 "laserPenetrator": ("sfx_laser_3.mp3", "https://opengameart.org/sites/default/files/sfx_laser_3.mp3"),
}
root = Path("assets/audio/sfx")
root.mkdir(parents=True,exist_ok=True)
js_path=Path("game.js")
js=js_path.read_text()
success=0
for name,(filename,url) in sources.items():
    dest=root/filename
    try:
        if not dest.exists():
            req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
            with urllib.request.urlopen(req,timeout=40) as response:
                data=response.read(12*1024*1024+1)
            if not 900 < len(data) <= 12*1024*1024:
                raise ValueError("unexpected file length")
            header=data[:16]
            is_wav=header[:4]==b"RIFF" and header[8:12]==b"WAVE"
            is_ogg=header[:4]==b"OggS"
            is_mp3=header[:3]==b"ID3" or header[:2] in (bytes.fromhex("fffb"),bytes.fromhex("fff3"),bytes.fromhex("fff2"))
            if not (is_wav if filename.endswith(".wav") else is_ogg if filename.endswith(".opus") else is_mp3):
                raise ValueError(f"unexpected audio signature {header!r}")
            dest.write_bytes(data)
        local=dest.as_posix()
        js=js.replace('"'+url+'"','"'+local+'"')
        success+=1
        print(f"LOCAL {name}: {local} ({dest.stat().st_size} bytes)")
    except Exception as ex:
        print(f"FAILED {name}: {ex}; existing URL preserved")
js_path.write_text(js)
html=Path("index.html")
body=html.read_text()
body=body.replace("game.js?v=0573","game.js?v=0576").replace("game.js?v=0574","game.js?v=0576")
html.write_text(body)
print(f"Verified {success}/{len(sources)} sound samples in repository.")
if success<len(sources):
    raise SystemExit("Incomplete SFX import; retain PR as draft")

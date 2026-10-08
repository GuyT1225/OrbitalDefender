# Orbital Defender Soundtrack Sources

Orbital Defender uses a small rotation of CC0 / public-domain tracks for Arcade mode. The game currently streams these tracks from their original OpenGameArt file URLs and falls back to the built-in procedural soundtrack if a track cannot be loaded. Local bundling is the preferred next reliability step once the source binaries are available to the repository workflow.

## Included in the soundtrack rotation

| Track | Creator | Use in Orbital Defender | License | Source |
| --- | --- | --- | --- | --- |
| Sector | SRG774 | Wave 1 / low-intensity opening | CC0 1.0 | https://opengameart.org/content/dark-sci-fi-audio-pack |
| Searching | yd | Wave 2 alternate / surveillance atmosphere | CC0 | https://opengameart.org/content/searching |
| Pulse | SRG774 | Waves 2-3 | CC0 1.0 | https://opengameart.org/content/dark-sci-fi-audio-pack |
| Urgent | SRG774 | Wave 4 | CC0 1.0 | https://opengameart.org/content/dark-sci-fi-audio-pack |
| Brute Force (loop) | vitalezzz | Wave 5 / maximum pressure | CC0 | https://opengameart.org/content/brute-force |
| Transmission | SRG774 | Successful run / after-action | CC0 1.0 | https://opengameart.org/content/dark-sci-fi-audio-pack |

## License notes

All tracks above are published under Creative Commons CC0 / public-domain dedication according to their OpenGameArt source pages. Attribution is not required under CC0, but the creators and source pages are documented here for provenance and appreciation.

The procedural ambience, weapon SFX, alarms, and fallback soundtrack in `game.js` are original project code.

## Runtime behavior

- Wave 1 starts with **Sector**.
- Wave 2 alternates between **Searching** and **Pulse**.
- Wave 3 uses **Pulse**.
- Wave 4 uses **Urgent**.
- Wave 5 uses **Brute Force (loop)**.
- A successful run transitions to **Transmission**.
- If an external track fails to load, Arcade mode automatically resumes the procedural soundtrack rather than going silent.


## Runtime URL note

OpenGameArt stores several SRG774 files with suffixed filenames (`sector_0.mp3`, `pulse_0.mp3`, `urgent_0.mp3`, `transmission_1.mp3`). V0.5.4 updates the runtime map to those exact file paths to avoid 404/network failures.

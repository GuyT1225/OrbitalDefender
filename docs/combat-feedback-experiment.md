# Orbital Defender — Combat Feedback Experiment (planned)

This is a scoped follow-on to the V0.6 terrain/camera studies; **no combat implementation is included in this document**. Keep changes isolated from the playable main branch until the camera direction is approved.

## A. Gatling weapon
- Separate selectable sustained-fire weapon, without replacing existing weapons.
- Responsive hold-to-fire, short spin-up, tracers, heat accumulation/cooldown, impact puffs.
- Mobile pointer and hold-to-fire behavior tested in portrait; pressing UI buttons cannot trigger firing.
- Damage and ammo/heat balanced after first hands-on test. Stable camera during aiming.

## B. Lightweight impact / fall physics
- Distinguishable hit, stagger, knockback, defeat and fall reactions.
- Terrain-aware impact response for shelves and cliff edges. Avoid graphic effects.
- Pool/limit active fallen bodies, use simplified jointed animation or reduced-cost Verlet bodies rather than a full physics rigidbody per enemy.
- All effects deterministic enough for regression checks and tolerant of reduced-motion settings.

## C. Radio acknowledgements
- Event-driven only: target spotted, hit confirmed, wave warning, breach warning, friendly base status.
- Never confirm hits/kills based solely on the trigger being pressed. Global and per-event cooldowns, varied lines, captions, volume toggle, and quiet mode.
- Sound source licensing and voice permissions documented before audio is added.

## D. Playtest gates
- Camera framing approved on iPhone first; no moving camera during aiming.
- Gatling remains responsive under prolonged fire.
- Effect performance on mobile checked, no runaway entities/memory leaks.
- Radio captions match actual event semantics; no chatter spam.
- Existing Arcade regression workflow passes and old weapons behave the same.

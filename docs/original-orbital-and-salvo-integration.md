# Multi-Weapon Integration — Source Preservation Contract

Status: confirmed by source inspection, October 9, 2026. Do **not** approximate these weapons using the provisional Precision/Heavy preview implementations.

## Weapon roster for integration
1. **Gatling** — experimental side-firing, world-space projectile implementation (Studies 05.1–06.0), continuously fires while the battlefield is held.
2. **Original Orbital** — transplant *exact original behavior* from `game.js` on `main`, including Arcade's tap **SNAP** / hold **CHARGE** / release to fire controls, weapon-specific charge tiers, delayed strike, explosion, expanding luminous ground shockwave ring, damage/radius/cooldown/heat and characteristic feedback. Existing definition: `arcadeWeaponDefs.orbital` (damage 4.2, radius 12, cooldown 1700ms, heat .27, travel 900ms before charge/rules modifiers). Preserve rather than substitute generic Precision/Heavy cannon.
3. **Graph War Salvo** — transplant the *behavior* from `GuyT1225/graph-war` `index.html`, especially `isSalvoTurn`, `fireShot`, `salvoPlots`, `salvoQueue`, `launchSalvoRound`, `resolveShot`, and `drawSalvoPlots`. User plots **three distinct landing coordinates** before a sequenced salvo; too-close plot rejection (distance <4.5 original grid units), visibly numbered plot markers, 260ms inter-round delay, and clear state/result feedback. Graph War fires a salvo every third player shot; decide explicitly whether to retain this turn cadence or adapt as a cooldown/weapon selection for Orbital Defender. Do **not** silently change the three-position identity.

## Source of truth
- Original Orbital Defender: `https://github.com/GuyT1225/OrbitalDefender/blob/main/game.js`
- Graph War: `https://github.com/GuyT1225/graph-war/blob/main/index.html`
- Standalone integrated slice: `prototypes/integrated-command-study060.html`

## Interaction mapping to design/test
- All weapons share the single authoritative world-space target, PIP, orbit and camera controls.
- **Gatling:** hold battlefield to fire; release stops.
- **Orbital:** tap/snap versus hold-to-charge behavior remains identifiable and retains its shockwave-ring payoff.
- **Salvo:** tap three distinct world target coordinates to commit plots; on third lock fire rounds in sequence. Show 1/3, 2/3, 3/3 and ability to understand/cancel plotting before final commit (cancel is an improvement, not present in original behavior).
- Preserve weapon-specific reticles and SFX. Keep audio pre-flight flow and iPhone testing.
- No main branch changes until each behavior is validated.

## Priority
After confirming Study 06.0 main menu → pre-flight audio → battlefield works, integrate original Orbital first, then Graph War salvo. Do not expand into sniping or new missions yet.

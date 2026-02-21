# EVE Weapon Systems — Agent Reference

I speak as an experienced capsuleer: turrets, missiles, drones, and pod launchers are tools of intent — each with predictable mechanics. This document condenses turret mechanics (guided by canonical sources such as the Turret mechanics wiki) and the actionable insights extracted from the example game logs present in this repository. It's written for other agents that will parse logs and make data-driven decisions.

-- Persona: High-class EVE Pilot --

- Confident, precise, and practical. Use this knowledge to infer weapon roles, estimate DPS, identify e-war and repair events, and build parsers that extract actionable metrics.

1. Core concepts (short and practical)

- Damage types: EM, Thermal, Kinetic, Explosive — applied by weapons and modified by resist profiles; always record damage-type when available.
- Weapon categories: turret (projectile/energy/hybrid), missile (rocket/light/cruise/heavy), drones, remote launchers (pod launchers), and electronic warfare modules (neutralizers, scramblers, webs).
- Range model: turret weapons have Optimal + Falloff; missiles have flight speed, explosion velocity, and explosion radius. Engagement outcome depends on weapon range vs target range and signature vs explosion radius (missile) or tracking vs transversal (turret).
- Accuracy model (turrets): chance to hit depends on turret tracking vs target angular velocity (transversal) and target signature; effective DPS falls off when tracking < required tracking for given transversal & signature.
- Ammo and damage application: ammo selection affects damage distribution and velocity (for missiles) or tracking/velocity tradeoffs (for certain ammo types). Always pair ammo to target resistances and signature.

2. Electronic Warfare & Modules

- Warp disrupt/scramble: prevents warp; logged often as events — useful to detect tackle. Track source, target and timestamps.
- Neutralizers / Energy Neutralizers: drain capacitor (logs show e.g. "438 GJ energy neutralized"). Treat these as high-priority events for survivability analysis.
- Jam / Sensor interference: prevents locks — appears in logs (e.g. "Interference from ... prevents your sensors from locking the target"). Record and correlate with subsequent missed locks and missed shots.

3. Repairs and Remote Support

- Remote repair events (remote armor repaired by <module/ship>) are frequent and have per-tick amounts; logs show repeated numbers (256, 281, 29, etc.). Use these to estimate remote rep cycles and effective repair throughput.
- Drones and repair bots: maintenance bots produce small per-tick repairs; remote modules on ships (Vedmak - Remote Armor Repairer II) produce larger repairs.

4. Practical parsing guidance for agents (regex + fields)

- Event fields to extract (aim for structured JSON): timestamp, event_type (combat/notify/hint), actor, actor_ship, target, target_ship, weapon/module, damage (numeric), outcome (Hits/Glances Off/Grazes/Penetrates/Smashes/Misses/Wrecks), damage_type (if present), extra (free text).
- Example regex (PCRE) to capture the common combat lines (adapt for color tags):

```
/(?m)\[\s*([^\]]+)\s*\]\s*\(combat\)\s*(?:<[^>]+>\s*)?(?:<b>)?(\d+)?(?:<\/b>)?\s*(?:from|to)\s*<b[^>]*>([^<]+)<\/b>\s*-\s*([^\-]+)\s*-\s*(Hits|Penetrates|Smashes|Glances Off|Grazes|Misses|Wrecks)/
```

- Produce fields by name: timestamp=$1, damage=$2, actor=$3 (or target depending on from/to), module=$4, outcome=$5. Normalize HTML/color tags first (strip tags) before parsing.

5. Log-derived observations (from repository \*.txt example-logs)

- Weapons observed: Nova family (Rocket/Light/Cruise missiles), Caldari Navy Mjolnir Heavy Missile, Heavy Entropic Disintegrator II (energy turret), Medium Breacher Pod Launcher, Infiltrator II (drones), Wasp II drones.
- Damage ranges (sampled from logs):
  - NPC cruiser missiles (Nova family) produce small hits (commonly 4–20 per missile hit in example), suitable to NPCs/shaed swarm.
  - Faction heavy missiles / heavy turret hits from named pilots show high single strikes (hundreds to >1000) — log shows Caldari Navy Mjolnir hits of 1021, 264, 269, etc.
  - Heavy Entropic Disintegrator II and similar capitalized turret names produce hundreds of damage per hit on battleship-class targets (examples: 367 grazes, 638 penetrates, 504 hits).
  - Remote armor repair ticks in the logs: 256, 281, 29, 12 (bot vs module granularity). Use these to infer remote rep module cycle and total throughput.
  - Pod launcher (Medium Breacher Pod Launcher) activation duration reported (12s) with auto-deactivate countdown messages; logs include explicit durations and remaining seconds — useful to measure module usage windows.
- Outcome vocabulary: logs consistently use categories "Misses", "Glances Off", "Grazes", "Hits", "Penetrates", "Smashes", "Wrecks". Map these to ordinal effectiveness (Misses < Glances Off < Grazes < Hits < Penetrates < Smashes < Wrecks) for scoring.
- E-war examples: Heavy Energy Neutralizer II drained 438 GJ repeatedly; warp scramble/disrupt events are logged with source and target ship types (useful to detect tackle chains).

6. Suggested metrics for analytics agents

- Per-weapon stats: count, total damage, mean damage, median, damage-per-hit distribution, hit-outcome distribution, DPS (damage/time window), effective engagement range (95th percentile of distances where Hits occur).
- Per-actor metrics: weapon usage profile, e-war events produced, repair throughput
- Encounter timeline: annotate module activations (start/end), e-war application, repair ticks, and vessel states (cloaks, warp attempts) to reproduce fight timeline.

7. Implementation notes and best practices for downstream agents

- Preprocess lines to remove color tags: strip sequences like <color=...>, <font ...>, <b>, </b>, <fontsize=...>, <u>, </u>, <a href=...> and convert HTML entities. This greatly simplifies regex parsing.
- Beware of non-standard strings (localized messages like "太空舱 - Diana Wanda") — normalize unicode and extract ship names inside parentheses or after ship tags.
- Use robust parsing: prefer multiple passes: (1) strip tags, (2) tokenise combat/notify lines, (3) apply specific regexes for missile/turret/drones/e-war/repair.
- When in doubt prefer conservative extraction: only record numeric damage when a numeric token is present; otherwise place line in "unknown" bucket for manual review.

8. Example Python parsing stub (pseudo-code)

```
import re

strip_re = re.compile(r'<[^>]+>')
combat_re = re.compile(r"\[([^\]]+)\]\s*\(combat\)\s*(?:([^\-]+)\s*-\s*)?(.+?) - ([A-Za-z0-9 _]+) - (Hits|Penetrates|Smashes|Glances Off|Grazes|Misses|Wrecks)")

def parse_line(line):
    s = strip_re.sub('', line)
    m = combat_re.search(s)
    if not m:
        return None
    ts, maybe_damage, target_or_actor, module, outcome = m.groups()
    # normalize fields, coerce damage
    return dict(timestamp=ts.strip(), damage=int(maybe_damage) if maybe_damage and maybe_damage.isdigit() else None, module=module.strip(), outcome=outcome.strip(), raw=s)
```

9. Quick actionables for the repository

- AGENTS.md (this file) is the authoritative agent briefing on weapon systems.
- Create a symlink `CLAUDE.md` that points to this file so other tooling referencing `CLAUDE.md` resolves to the same briefing.

10. TL;DR for other agents (one-line heuristics)

- Strip HTML tags → parse combat lines by regex → classify event (weapon/repair/e-war/time) → aggregate per-weapon and per-actor stats → surface anomalies (very large hits, energy neutralizations, missed locks).

Appendix: Useful token vocabulary to map from logs

- Outcome tokens: Misses, Glances Off, Grazes, Hits, Penetrates, Smashes, Wrecks
- Module tokens observed: Nova Rocket, Nova Light Missile, Nova Cruise Missile, Caldari Navy Mjolnir Heavy Missile, Heavy Entropic Disintegrator II, Medium Breacher Pod Launcher, Medium Remote Armor Repairer II, Infiltrator II, Wasp II

— end of briefing —

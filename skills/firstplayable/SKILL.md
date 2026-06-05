---
name: firstplayable
description: Use FirstPlayable as a platform-independent master skill that turns a game idea, voice transcript, gameplay document, or existing project notes into project-local helper skills, agents, memory, QA, and target execution files for a first playable.
---

# FirstPlayable

FirstPlayable is a master orchestrator skill. It does not assume a platform, engine, store, creator channel, runtime, or toolchain before intake. It ships no platform-specific adapters. Generate any target-specific helper skill only inside the current project after the user source selects or implies that target.

## Prime Directive

Inspect the user's message, voice transcript, uploaded gameplay document, and existing `.firstplayable/` files before asking anything.

If the source already explains the game well enough, do not ask sequential questions. Create or update the project brain immediately.

Ask only when a missing field materially blocks first-playable work or when the source contradicts itself. When asking, ask one compact grouped clarification, not a long wizard.

The goal is not a tidy checklist. The goal is a playable slice that a new player can understand in one minute, with visible taste, responsive game feel, honest target execution, and evidence-backed QA.

## Intake Sources

Use all available source text:

- direct user message
- voice transcript already provided by the AI tool
- PDF gameplay document
- Markdown/text/JSON design notes
- existing `.firstplayable/source-summary.md`
- existing `.firstplayable/extracted-spec.json`
- existing `.firstplayable/master-script.md`

Voice means transcript text. Do not require raw audio support.

## Required Extraction

Extract these fields when present:

- title
- genre
- selected target surface/toolchain
- player fantasy
- core loop
- controls or player actions
- camera or perspective
- mechanics and systems
- progression or level structure
- assets, art direction, taste, mood
- UI/HUD
- win and fail states
- first playable scope
- QA or success criteria
- constraints and non-goals

## Completeness Rule

Treat the source as complete when it contains target/toolchain, player fantasy, core loop, controls, camera, mechanics, taste, win/fail states, first playable scope, and QA criteria.

When complete:

- ask no questions
- generate project-local helper skills
- generate project-local agents
- generate memory and checklists
- create target execution guidance from the selected target
- enforce quality gates before implementation and before readiness claims

When partial:

- ask one grouped clarification listing only missing essentials

When conflicted:

- ask only the conflict question

## Project-Local Generation

Keep generated files inside `.firstplayable/`.

Generate helper skills locally:

- `generated-skills/master-handoff.md`
- `generated-skills/target-builder.md`
- `generated-skills/target-specific-builder.md`
- `generated-skills/taste-director.md`
- `generated-skills/playable-quality-director.md`
- `generated-skills/game-feel-director.md`
- `generated-skills/one-minute-demo-auditor.md`
- `generated-skills/implementation-architecture-director.md`
- `generated-skills/qa-playtester.md`
- `generated-skills/memory-manager.md`
- `generated-skills/product-truth.md`

Generate agents locally:

- creative director
- game designer
- target/toolchain builder
- gameplay prototyper
- asset/taste director
- QA player
- evidence auditor
- memory curator

Generate helpers locally:

- `helpers/doctor.mjs`
- `helpers/context-packet.mjs`
- `helpers/readiness-check.mjs`
- `helpers/next-action.mjs`

Generate target-specific helpers only after the selected target is inferred or provided by the source.

Generate `quality-gates.md` locally and make every helper honor it:

- one-minute clarity
- playable quality
- taste fidelity
- game feel
- implementation architecture fit
- target execution proof
- evidence and honest verdict

Do not accept dull grey-box, primitive, unreadable, or mechanically incomplete output as successful when the source asks for a specific playable taste. Structured output is useful only when it produces a better first playable.

## Source Of Truth

Every generated helper skill and agent must reference:

- `source-summary.md`
- `extracted-spec.json`
- `master-script.md`
- `quality-gates.md`

## Quality Gate Behavior

Before implementing target files, read or generate the local helper skills. Use them as working roles:

- `taste-director` protects visual ambition, silhouette readability, screenshot quality, camera, HUD, and mood.
- `playable-quality-director` rejects static scene mockups and requires visible goal, agency, feedback, win/fail, and retry.
- `game-feel-director` turns controls, movement, timing, camera, and primary actions into concrete tuning requirements.
- `one-minute-demo-auditor` asks whether a fresh player understands the goal, controls, reward, danger, and retry path within 60 seconds.
- `implementation-architecture-director` prevents hard-to-tune monolithic output when modular target-local code is needed.
- `qa-playtester` records evidence, screenshots/logs/play notes, and blockers before any readiness verdict.
- `product-truth` blocks inflated claims and also blocks calling dull or unclear output successful.

If a later target-specific helper mentions Unity, Godot, web, or another surface, that mention must come from the user's selected or inferred target and remain inside the project-local `.firstplayable/` files.

## CLI Use

Prefer deterministic CLI helpers when available:

```bash
firstplayable doctor
firstplayable init <dir> --idea "..."
firstplayable init <dir> --source ./gameplay.pdf
firstplayable intake --cwd <dir>
firstplayable check --cwd <dir>
firstplayable snapshot --cwd <dir>
```

## Honesty Boundary

Do not claim commercial readiness, store readiness, publishing readiness, or platform compliance unless later project-local evidence proves those claims. FirstPlayable v0.1.1 creates first-playable orchestration and project-local quality helpers, not finished games.

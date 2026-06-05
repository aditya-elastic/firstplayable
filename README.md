# FirstPlayable

FirstPlayable is a platform-independent master skill and CLI for turning a detailed game idea, transcript, or gameplay document into a project-local first playable brain.

It ships one master skill. It does not ship platform adapters or permanent helper skills. Target-specific helper skills, agents, memory, QA, and execution files are generated inside each project after intake.

## Install

```bash
npm install -g firstplayable
firstplayable doctor
```

After install, start a new AI chat and say:

```text
Use FirstPlayable. Here is my game idea...
```

If your AI tool does not show FirstPlayable yet, run:

```bash
firstplayable setup
```

## Create A Project Brain

```bash
firstplayable init ./my-game --idea "A detailed game idea..."
firstplayable init ./my-game --source ./gameplay.pdf
```

If the source already contains enough target, gameplay, taste, scope, and QA detail, FirstPlayable asks no questions. If the source is partial, it produces one grouped clarification instead of a sequential wizard.

## Output

```text
my-game/
  .firstplayable/
    source-summary.md
    extracted-spec.json
    completeness-report.json
    master-script.md
    taste-profile.md
    first-playable-contract.md
    target-plan.md
    memory.md
    generated-skills/
    generated-agents/
    helpers/
    checklists/
    reports/
    snapshots/
```

## Boundary

FirstPlayable v0.1.0 is an orchestrator and project-brain generator. It does not claim engine automation, commercial readiness, store readiness, or publishing readiness.

# EDUNI Codex Model Strategy

This document defines the project-wide model-routing policy for Codex work in `JongPyoShin/eduni-links`.

The goal is not to always use the cheapest model or always use the strongest model. Use the **lowest-cost model that is comfortably capable of the task**, then escalate when uncertainty, blast radius, or reasoning depth increases.

> Availability note: model availability can change by plan/product. If a named model is unavailable, use the closest available tier and state the substitution in the task report.

## 1. Default routing

### GPT-5.6 Luna — fast execution / inspection
Use Luna by default for bounded, low-risk work where the desired result is already clear.

Good fits:
- Git/worktree/branch/PR inventory and hygiene audits
- targeted repository search and file inventory
- log/result summarization
- documentation updates with explicit wording
- mechanical edits and repetitive cleanup
- test execution and failure collection
- adding straightforward tests from an existing pattern
- small bug fixes with a known root cause and narrow file scope
- route/link/config verification
- data/schema comparison where no architectural decision is required

Do not keep Luna on a task when the work becomes architecture-heavy, ambiguous, or high-blast-radius. Escalate instead of guessing.

### GPT-5.6 Terra — normal production development
Terra is the default implementation model for ordinary feature work and medium-complexity engineering.

Good fits:
- normal feature implementation
- multi-file changes with a clear specification
- API/client integration
- persistence wiring
- moderate refactors
- test design plus implementation
- UI behavior changes with defined acceptance criteria
- bug fixing that requires tracing several modules
- migrations with an established target design
- production hardening that is understood but non-trivial

Use Terra when Luna would spend substantial effort reconstructing intent or when implementation spans several interacting components.

### GPT-5.6 Sol — architecture / difficult diagnosis / critical review
Reserve Sol for work where a wrong decision is expensive or the problem requires substantial reasoning across systems.

Good fits:
- architecture and canonical-runtime decisions
- ambiguous requirements with multiple viable designs
- difficult multi-system bugs without a known root cause
- large refactors or migrations with compatibility risk
- performance root-cause analysis where measurements have competing explanations
- concurrency/state-consistency problems
- cross-cutting data-model changes
- security/privacy-sensitive architecture changes
- final review of high-impact PRs
- resolving conflicting findings from other agents or models
- designing a new subsystem before implementation

Do not use Sol automatically for routine implementation after the architecture is already decided; hand the bounded implementation to Terra where practical.

## 2. Escalation rules

Start with the recommended tier for the assigned task. Escalate one tier when one or more of these becomes true:

- the root cause is still unclear after targeted inspection
- more than one subsystem must change and their contracts are not already defined
- the change can break existing routes, persisted data, deployment, or child/parent boundaries
- there are multiple plausible designs with meaningful tradeoffs
- a migration/cleanup might destroy or orphan user data or unmerged work
- tests disagree with observed production behavior
- the task requires a broad compatibility judgment rather than a mechanical change

Suggested escalation path:

`Luna -> Terra -> Sol`

Do not escalate merely because a task is long. A long mechanical inventory can remain Luna; a short but high-impact architecture decision may require Sol.

## 3. De-escalation / handoff rules

Strong models should hand bounded work down when the difficult reasoning is complete.

Examples:
- Sol decides architecture -> Terra implements the feature
- Terra identifies a repetitive cleanup -> Luna performs the mechanical pass
- Luna collects repository facts -> Sol or Terra makes the decision if the facts reveal architectural risk

This keeps high-capability model usage focused on decisions that benefit from it.

## 4. Required model line in every Codex task

Every new Codex task prompt should include this block near the top:

```text
[MODEL]
Recommended: GPT-5.6 <Luna|Terra|Sol>
Reason: <one sentence explaining why this tier fits>
Escalate to: <Terra|Sol|none> if <specific condition>
```

The task author should choose the model before starting the Codex session when possible.

If no model is specified, classify the task using this document before editing. If the current model identity is known and is below the recommended tier, do not make risky changes first; report the recommended escalation. An equal or higher tier may continue, but should still keep the assigned scope narrow.

## 5. EDUNI examples

### Luna examples
- `REPO-000` worktree/branch hygiene audit
- find stale branches and compare them with `main`
- inspect route declarations and report inconsistencies
- run the repository validation suite and summarize failures
- update a known documentation checklist

### Terra examples
- connect Jungle 3D capture state to existing persistence
- implement a defined Portal progress card
- add route/API regression tests
- split a known monolithic client module along an already-approved boundary
- implement movement parameters after UX targets are fixed

### Sol examples
- choose the Jungle 2.0 canonical runtime
- decide how 2D/3D/legacy Jungle data models should converge
- redesign EDUNI Portal information architecture
- diagnose a regression involving routing + persistence + deployment with no clear root cause
- final architecture/code review before a high-impact canonical route migration

## 6. Multi-agent strategy

When other agents are used, avoid duplicate work.

- Broad UX/product exploration can happen outside Codex.
- Luna collects facts and performs low-risk mechanical work.
- Terra is the main production implementer for defined work.
- Sol resolves architecture, ambiguity, high-risk problems, and critical reviews.

An agent should read prior audit results before repeating the same investigation.

## 7. Safety and repository rules still apply

Model choice never overrides repository constraints in `AGENTS.md` or task-specific instructions.

Regardless of model:
- do not reset/delete unrelated dirty work
- do not merge unless explicitly instructed
- preserve child privacy and existing compatibility requirements
- use targeted exploration first
- validate before commit
- stop at the assigned scope

## 8. Task report

For Codex tasks where model routing matters, include one line in the final report:

```text
Model routing: <model used or recommended> — <why it was appropriate / whether escalation was needed>
```

This lets future work reuse the routing decision instead of re-evaluating it from scratch.

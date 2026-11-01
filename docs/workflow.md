# Parallel execution with a checkable finish

The parent owns the dependency graph. A worker owns a complete deliverable within that graph. Parallelism helps when those deliverables can proceed independently and the parent can review them without reconstructing the whole problem.

## Choose a bounded unit

Before dispatch, identify the output, its callers, allowed changes, and an acceptance check. Keep a short dependent edit direct. Separate discovery from implementation when uncertainty would otherwise force repeated parent–worker exchanges.

Use DS for code investigation, a defined module, a reproducible bug, or a mechanical transformation. Keep unclear requirements, shared interface design, high-impact decisions, and hard integration reasoning with the parent or a suitable GPT worker. A difficult task can become suitable for DS after the parent resolves its uncertain part.

Choose the worker's effort explicitly:

| Effort | Initial use |
|---|---|
| `low` | Bounded execution with clear inputs and checks |
| `high` | A bounded task with substantial reasoning |
| `max` | A specific unresolved difficulty that merits deeper reasoning |

This is a policy, not a measured model ranking. A follow-up keeps the original model, effort, and preset. Change effort by starting a new session with accepted work and the remaining problem.

## Separate writers, then overlap work

Start with two delegated actors at most. Fix shared interfaces first. Give each writable worker a separate worktree or task directory and explicit file ownership. A read-only reviewer can share source inputs, but it cannot repair those files concurrently.

While DS A and DS B run, the parent works on independent integration preparation, critical reasoning, or another ready unit. Review early completions immediately. A finished branch should not wait for an unrelated slow branch before receiving feedback.

The useful comparison is total accepted-task time:

```text
decomposition + longest parallel branch + integration/review + repairs
```

Many tiny workers, duplicate investigation, large transcripts, and frequent status polling can consume the expected savings. A native relay adds its own model usage and counts as an actor.

## Exchange compact, durable evidence

Each worker gets a task brief and writes its own result artifact. The parent keeps the task IDs, dependencies, accepted conclusions, and next action. Workers do not concurrently update a shared JSON status file.

When blocked, a worker reports the concrete missing interface or assumption, the evidence, and what decision it needs. The parent resolves or forwards that fact to the relevant worker. Do not assume a running bridge worker supports arbitrary peer messages: upstream `dsh_send` applies to attached Web sessions.

Use [the handoff contract](../skills/dsh-subagent/references/handoffs.md) for an example. Keep credentials, private chat history, and unrelated context out of handoffs.

## Accept behavior, not a completion message

Before execution, preserve protected inputs and select checks for the contract's important behavior. After execution, inspect the actual diff, reproduce meaningful checks, and look for uncovered failure, cancellation, and recovery paths. Run integration checks after combining accepted changes.

The parent normally collects defects into one repair round. Permit a second only when new evidence supports a small correction. After that, escalate, repartition, handle the problem directly, or report a concrete blocker. The parent can review the result itself; an extra reviewer is useful only when it changes acceptance.

A green suite is evidence about that suite. It does not prove that the implementation covers the entire contract. Keep generated tests distinct from protected fixtures, and never let a worker revise the acceptance criteria to make its implementation pass.

## Keep ownership through completion

Discover the actual client tools before dispatch. Native callbacks require an owning, verified parent connection. Tool visibility alone does not establish idle wakeup. Without that capability, keep one wait pending and resume the same wait as required by the host.

Retain each worker ID until the result is reviewed and incorporated. When stopped, cancel any listener, interrupt the external worker, and verify acknowledgement. Interrupting a shell or native relay does not establish that the DS process stopped.

Measure parent, DS, native reviewer, and relay usage separately when available. Disclose missing or interrupted usage, provider tokenizer differences, and whether reasoning tokens are already included in output. Compare accepted end-to-end time rather than only a worker's generation time.

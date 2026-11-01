---
name: dsh-subagent
description: Optional helper for bounded, independent DeepSeek execution under a domain owner. Use for checkable investigation, isolated edits, tests, or evidence extraction; keep trivial or dependent steps direct and retain parent review.
---

# DSH subagent

A narrow, automatically eligible delegation helper. The domain owner keeps the
task, decisions, acceptance and user relationship. Prefer direct work when the
next step is trivial, dependent, or inseparable from parent context. A separate
small Codex routing helper may advise executor choice; this skill does not
replace it and is not invoked on every step.

## Choose the executor

Classify the task by independence, uncertainty, risk, context need and
checkability before dispatch.

- Keep trivial, tightly coupled, or ambiguous steps with the parent.
- Prefer DeepSeek for bounded execution with a concrete contract: investigation,
  isolated implementation, tests, or source extraction the parent can check.
- Hard, coupled, or high-uncertainty work normally goes to the parent or a
  suitable native GPT worker. Choose one no more capable than the parent when
  the live model comparison is known; if unsure, inherit the parent model.
  The parent may also perform a strong review itself.
- Start new DeepSeek work at `effort: "low"`. Use `high` for reasoning-heavy
  tasks and `max` only for targeted escalation with a concrete unresolved
  difficulty. State `model: "deepseek-flash"` and
  `provider: "deepseek-official"` explicitly. The alias is current convenience,
  not an immutable version pin; record any observed underlying model.
- Allow at most **two concurrent delegated actors**, counting relays and native
  workers. No recursive fleet or worker-initiated delegation unless explicitly
  scoped by the user.

Respect explicit user choices for model, provider or effort. Existing code and
model execution authorizations remain in force; delegation neither expands nor
resets them. It never adds authorization for training, paid usage, GPU
allocation, robot motion, publication, service changes, or external
communication.

## Prepare the handoff

Before dispatch, define:

- one whole, verifiable deliverable, not a step-by-step fragment;
- absolute `cwd` and executor; never reuse a local path for a remote host;
- acceptance commands, critical invariants, protected inputs, and permissions;
- for edits, a separate writable worktree or isolated task-owned directory with
  explicit file ownership. Workers must not share a mutable checkout or revert
  others' changes;
- shared interfaces fixed before parallel work begins. Use one bounded shared
  contract plus one separate result artifact per worker; never let workers
  compete for the same shared file.

Default investigation to `read-only`; use `workspace-write` only inside the
authorized edit scope. Select no broader permission than the parent task allows.
Do not send credentials, private rollouts, private configuration, or unrelated
context. For any external message, a worker may draft only: the parent shows the
user the recipient, channel, full body and attachments and waits for explicit
confirmation before sending. See [handoffs](references/handoffs.md).

## Run asynchronously

Discover the actual `dsh_*` tools exposed in this chat. A tool registration,
installed skill, or configuration entry does not prove availability or callback
compatibility. Prefer native tools when actually present, and read
[runtime](references/runtime.md) before the first dispatch.

Call `dsh_start` with the brief and retain the returned `id`. Starting returns an
ID, not a completed task. While workers run, the parent does independent useful
work and consumes early completions; do not block merely to wait for the slowest
worker.

Use `dsh_watch` only when the host has a verified parent-owning callback route.
Tool visibility alone does not prove idle-parent wakeup. When unavailable or
incompatible, keep one `dsh_wait` without `seconds` pending and do not poll
repeatedly, or use the verified packaged CLI RPC route. A native Codex relay is
optional only when useful parent work justifies its overhead; a relay occupies
one of the two actor slots. Do not end the parent turn while waiting unless a
verified callback will resume it or the user authorized a detached run.

Parent mediates compact blocker and evidence handoffs. Do not invent
worker-to-worker messaging: `dsh_send` applies only to attached external Web
sessions, not delegated DSH workers. Reuse an idle related session for a
follow-up; `dsh_close` detaches an attached Web session rather than stopping its
agent. Track each ID until its result is accepted.

## Review and refine

Require the worker to report changed files or diff, commands and outcomes, and
remaining evidence gaps. Then the parent independently:

- inspect the contract and diff, not only the summary;
- rerun meaningful acceptance checks and exercise failed-path semantics;
- confirm protected and gold fixtures are preserved;
- check integration after any merge into the parent worktree.

Green tests are not proof that the whole contract is satisfied. If a concrete
defect remains, send one consolidated correction brief to the same idle worker
with the failing case, allowed files and acceptance check. Default to one
correction round and at most two, with concrete new evidence. After that, work
directly, use native GPT, escalate effort in a new session, or repartition; do
not loop unchanged prompts.

A follow-up retains the original model, effort and preset. Changing effort
requires a new agent plus a concise handoff of accepted work, the remaining
defect and its evidence. Stop active work before replacing it, and do not resume
interrupted work without authorization. Never claim guaranteed correctness or a
speedup unsupported by comparable measurements.

## Stop, install and report

On stop, unregister any active listener and interrupt the external DeepSeek
execution; verify acknowledgement. Stopping a shell or native relay alone is
insufficient. Interruption cancels pending execution but does not roll back
files already written.

The runtime package contract is `node bin/codex-ds-workers.mjs` with `setup`,
`doctor`, `rpc`, `configure` and `uninstall`. Its JSON-stdin `rpc` reaches the
same bridge as `dsh_start`, `dsh_wait` and related tools. Take the CLI path from
a setup receipt or the known repository location; never use a personal path.
The skill neither installs nor configures services, hooks, credentials or model
usage, and reading it does not run anything. If the runtime is missing, report
a capability gap and fall back to direct or native work; never install silently.

Report result paths and any unresolved interface questions. Distinguish
completed from failed, exhausted or interrupted work, and keep the agent ID for
continuation.

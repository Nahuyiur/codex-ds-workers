# Runtime and tool lifecycle

This reference describes how to use an installed DSH runtime. It is not an
installer and does not prove that any tool or callback route exists. Discover the
actual `dsh_*` tools in the current client first. Prefer native tools when they
are really available; otherwise use only a verified packaged CLI route.

## MCP lifecycle

- `dsh_start`: pass the bounded brief, absolute `cwd`, permissions, and explicit
  `model: "deepseek-flash"`, `provider: "deepseek-official"` and `effort`.
  The `low` default applies only to a new `dsh_start`; `high` is for
  reasoning-heavy work and `max` for a targeted escalation. The returned `id` is
  a handle, not a completion. An explicit caller override is preserved.
- `dsh_status` / `dsh_events`: use for a concrete state or progress question, not
  as a polling loop. `dsh_status` does not return the final answer by default.
  Request progress or tool events only when the parent needs that detail.
- `dsh_wait`: wait for settlement. Prefer one wait without `seconds`. A timeout
  is still pending work, not failure. Do not repeatedly issue short waits.
- `dsh_followup`: send related work to an idle agent. It retains model, provider,
  effort and preset. To change effort, start a new agent and pass a concise
  handoff of accepted work and remaining evidence.
- `dsh_interrupt`: stop current execution and queued input. It does not roll back
  completed file changes. Verify acknowledgement before sending replacement
  work or reporting a stop.
- `dsh_close`: close a bridge agent and retain its history. For an attached Web
  session it only detaches; it does not stop the Web agent.
- `dsh_list`: recover an ID by workspace and task. Filter with `match`, `cwd` or
  `status`; do not take the newest entry blindly.
- `dsh_attach`: attach to an existing Web session by exact `session_id` and the
  authenticated `web_url`. `dsh_send` is only for such attached Web sessions;
  it is not worker-to-worker messaging for delegated DSH agents.

Use `dsh_watch` only after verifying that the current host has a parent-owning
callback route and supports the required delivery protocol. An MCP registration
or visible tool does not prove idle-parent wakeup. If the callback route is
unavailable or incompatible, keep one `dsh_wait` pending rather than polling;
do not end the parent turn unless a verified callback will resume it or the user
authorized a detached run.

After a verified callback registration, do independent parent work. On
completion, inspect the saved result if the inline answer is truncated, accept
the work, and release the agent only when no follow-up is expected. On stop,
unregister the listener first, then interrupt the external execution and verify
acknowledgement; stopping a shell or relay process alone is insufficient.

## Packaged CLI fallback

The runtime package is expected to expose:

```text
node bin/codex-ds-workers.mjs setup
node bin/codex-ds-workers.mjs doctor
node bin/codex-ds-workers.mjs rpc
node bin/codex-ds-workers.mjs configure
node bin/codex-ds-workers.mjs uninstall
```

`rpc` consumes one JSON request on stdin and speaks to the same bridge as the MCP
tools. For example:

```json
{"name":"dsh_start","arguments":{"name":"retry-fix","cwd":"/workspace/acme-payments","permission":"workspace-write","model":"deepseek-flash","provider":"deepseek-official","effort":"low","task":"<bounded brief>"}}
```

When the native MCP route is unavailable, the portable form is:

```text
node /path/to/codex-ds-workers/bin/codex-ds-workers.mjs rpc
```

`/path/to/codex-ds-workers` is a placeholder to replace with the location from a
setup receipt or the known repository checkout. It is not an executable literal.
Do not substitute a personal path. Use the CLI only after `doctor` or equivalent
local evidence accepts the package; preserve returned IDs and the same wait,
follow-up and stop rules.

Installation, configuration, credential setup and uninstallation are separate
administrative actions, not part of ordinary delegation. A missing runtime is a
capability gap: fall back to direct or native work and report it rather than
installing silently. Reading this skill starts no service, hook or model request.

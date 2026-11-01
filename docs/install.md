# Install and recover the local runtime

## Requirements and scope

Use Node.js 24 or newer with npm, Git, and network access to GitHub and npm. Your Codex login remains in Codex; DeepSeek workers use their own API key. The installer can prepare the bridge's pinned Codex CLI when no compatible CLI is available.

The initial release targets macOS and Linux. Development checks and the real isolated setup were performed on macOS; Linux installation and desktop callback behavior need their own host validation. Hosted CI is not enabled in this release. Run `npm test` locally. Windows is not a validated target for this release.

The [keyless installation receipt](verification.json) records the tested lifecycle. It verifies SDK initialization and authenticated local RPC, not a paid provider call or a real-key configuration write in this portable package.

## Set up the bridge and skill

From the repository checkout:

```bash
node bin/codex-ds-workers.mjs setup
node bin/codex-ds-workers.mjs configure
node bin/codex-ds-workers.mjs doctor
```

Setup downloads the pinned bridge revision and installs the locked SDK in a separate managed directory. It registers `dsh_subagent` in your selected Codex profile and copies the adaptive skill into that profile. It starts the local background bridge without submitting a model task. Configuration prompts for the DeepSeek key privately and keeps provider settings outside the checkout.

The default `background` service avoids changing login services. After a reboot or when that process has stopped, run:

```bash
node bin/codex-ds-workers.mjs start
```

To opt into the upstream platform's login service where supported, use `setup --service auto`. Existing service-name conflicts are handled by upstream setup. Keep the repository checkout: the public CLI uses it for lifecycle commands and future setup operations.

Open a new Codex chat to load the skill and MCP tools. Tool visibility and automatic parent wakeup are separate capabilities. Use a verified callback route or keep one wait pending, as the skill describes.

## Locations

The default managed directory is:

| Platform | Default |
|---|---|
| macOS | `~/Library/Application Support/codex-ds-workers` |
| Linux | `${XDG_DATA_HOME:-~/.local/share}/codex-ds-workers` |

It contains bridge data, provider configuration, session state, the isolated DSH home, SDK dependencies, pinned vendor source, and copied adapters. The skill goes under `${CODEX_HOME:-~/.codex}/skills/dsh-subagent`.

`CODEX_DS_WORKERS_HOME` selects the managed directory. `CODEX_HOME` selects the Codex profile. Explicit `DSH_SUBAGENT_DATA`, `DSH_SUBAGENT_CONFIG`, `DSH_SUBAGENT_STATE`, and `DSH_HOME` overrides are honored and recorded. Reuse the same environment on subsequent commands.

For an isolated installation, set the directories explicitly before setup:

```bash
export CODEX_DS_WORKERS_HOME="$HOME/.local/share/codex-ds-workers-isolated"
export CODEX_HOME="$HOME/.codex-ds-workers-isolated"
node bin/codex-ds-workers.mjs setup
```

Start Codex with that same `CODEX_HOME`. An already-open desktop profile does not automatically switch to the isolated profile. Do not point an isolated installation at your existing DSH config/state overrides.

## Existing installations

Setup preserves foreign `dsh_subagent` MCP registrations, skills, and bridge installations. A conflict stops setup instead of silently adopting or overwriting them. Choose an isolated Codex profile, or deliberately remove/migrate the conflicting installation through its original owner.

Setup and uninstall refuse while managed bridge tasks are active. Repeat setup reuses the owned installation and refreshes the package's skill. Provider settings and session histories stay outside the repository.

## Troubleshooting

| Symptom | Action |
|---|---|
| Node version is rejected | Use Node.js 24+ with npm and retry. |
| Foreign skill or MCP name conflict | Keep the original installation; use a separate `CODEX_HOME` or explicitly migrate it. |
| Tools absent in the current chat | Open a new chat or refresh the MCP connection. Use the packaged RPC path when its local health is verified. |
| Background service stopped | Run `start`, then `doctor`. HTTP registration alone cannot revive an absent process. |
| Doctor shows uncertain provider status | Configuration is not model success. Check the private configuration flow; use an authorized bounded live probe to validate a call. |
| Parent wakeup does not work | Keep one `dsh_wait` pending. Do not target a daemon that does not own the parent. |
| Setup failed | Inspect the error and retry with the same environment. The installer restores the previous skill on failure. |

## Remove the integration

Finish or interrupt active tasks first, then run:

```bash
node bin/codex-ds-workers.mjs uninstall
```

Uninstall removes the owned skill and delegates bridge/MCP removal to upstream. Keys, histories, caches, and the isolated DSH home are retained. This wrapper exposes no purge shortcut.

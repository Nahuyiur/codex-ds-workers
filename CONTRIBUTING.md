# Develop and verify a change

Use Node.js 24 or newer. Start with the runtime's unbilled checks:

```bash
npm test
```

Keep setup tests isolated from your normal `CODEX_HOME`, DSH state, and provider credentials. A test must not register services, change your normal MCP configuration, or submit paid model requests without explicit authorization.

The optional network test creates a temporary HOME, downloads the pinned runtime, exercises its keyless setup/RPC lifecycle, and uninstalls it. It uses no provider key or model request:

```bash
node test/isolated-install.mjs
```

For a skill change, inspect `skills/dsh-subagent/SKILL.md` and its linked references. Verify that examples use actual tool fields, follow-ups retain effort, completion and cancellation are distinct, and acceptance does not rely on worker self-report. Run Codex's skill validator if it is available in your installation.

For an installer change, exercise the user-facing command and its ownership/conflict handling. Report whether verification used a real clean installation or a fixture. Keep versions and the lockfile consistent. Include upstream attribution for adapted code.

The miniature project is intentionally unfinished. Its tests are expected to fail until an agent implements the two modules. To check its protected-input verification:

```bash
cd examples/mini-project
python3 verify.py
```

Do not commit keys, private installation receipts, model transcripts, local evidence folders, or absolute paths from your machine. Describe the behavior changed, the checks run, and any remaining gap in your contribution.

# Handoffs and results

## Ownership layout

The parent writes one bounded shared contract at
`.dsh-handoffs/contract.md`. Each worker owns a separate directory,
`.dsh-handoffs/<worker-id>/`, containing `brief.md` and `result.json`. Never use
one shared JSON ledger or have several workers append to the same result file.
Workers must not edit `contract.md` or another worker's directory.

For code changes, give each worker its own worktree with non-overlapping file
ownership. Fix shared interfaces in the contract before concurrent work starts.
The contract states the deliverable, interfaces, acceptance commands, critical
invariants, protected inputs, permissions and stop conditions.

## Example task brief

```text
Objective: Make retry handling in the payments client honor the contract, with
tests. Deliver the complete fix in your worktree.

Executor/cwd: DeepSeek worker; /workspace/acme-payments (worktree: retry-fix)
Owned files: src/payments/retry.py, tests/test_retry.py
Shared contract: .dsh-handoffs/contract.md (read-only to you)
Permissions: workspace-write inside the worktree; no network, no installs.

Required behavior:
- 429 and 503 retry with bounded exponential backoff.
- 400, 401 and 409 never retry.
- The final attempt returns the original error unchanged.
- Existing request IDs and logging fields remain stable.

Protected inputs: tests/fixtures/ledger_golden.json and tests/fixtures/auth/
are read-only; do not regenerate or rewrite them.

Acceptance commands:
  python -m pytest tests/test_retry.py -q
  python -m pytest tests/test_contract.py -q
  ruff check src/payments/retry.py tests/test_retry.py

Constraints: You are not alone. Do not revert others' edits or touch files
outside your ownership. Do not commit, push, install packages, change services,
or contact anyone externally. If blocked, stop and report the exact blocker.

Report in .dsh-handoffs/<worker-id>/result.json using the schema below, and
return a short summary with changed files, commands/outcomes and evidence gaps.
```

## Per-worker result schema

```json
{
  "worker_id": "ds-retry-01",
  "contract_version": "1",
  "status": "completed | blocked | failed | interrupted",
  "base_commit": "<sha or null>",
  "diff_path": ".dsh-handoffs/ds-retry-01/changes.diff",
  "files_touched": ["src/payments/retry.py", "tests/test_retry.py"],
  "commands": [
    {"cmd": "python -m pytest tests/test_retry.py -q", "exit": 0,
     "summary": "14 passed"}
  ],
  "invariants_checked": ["no retry on 400/401/409", "final error preserved"],
  "protected_inputs_unchanged": true,
  "outcomes": "Implemented bounded backoff and added timeout/error-path tests.",
  "evidence_gaps": ["No live 503 test; covered by a mocked response."],
  "blocked_reason": null,
  "external_actions": []
}
```

`external_actions` must remain empty unless the parent explicitly authorized a
specific action. A worker may draft external content, but the parent reviews the
recipient, channel, full body and attachments with the user and obtains explicit
confirmation before anything is sent. The parent verifies the diff and reruns
meaningful checks; the worker's status alone is not acceptance.

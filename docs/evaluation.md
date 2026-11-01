# What has been measured

The local study supports trying DS low first for similar bounded tasks. It does **not** establish that this workflow is generally faster or better than native Luna max.

## Six exploratory effort trials

The study used two authored Python standard-library coding tasks: a DAG scheduler with 33 checks and an archive tool with 38 checks. Each effort ran once per task in a fresh directory with the same task, starter, and frozen checks. The parent supplied no implementation hints or repairs during these attempts. Each attempt had a 20-minute limit.

Runtime: pinned bridge `8ee8a8152e4f7fa1d805bb40e8f1a10fecceabd4`, DSH SDK `0.2.1-rc.5`, `deepseek-flash` through `deepseek-official`. The provider alias was recorded as DeepSeek-V4.1-Flash-1017 on 2026-10-31; an alias is not a permanent model pin.

| Configuration | DAG worker time / checks | Archive worker time / checks |
|---|---:|---:|
| DS low | 174.45 s / 33 of 33 | 460.60 s / 37 of 38 |
| DS high | 414.75 s / 33 of 33 | 731.82 s / 37 of 38 |
| DS max | 506.19 s / 33 of 33 | 1,201.59 s / 37 of 38, interrupted at limit |
| Luna max, historical reference | 158.45 s / 33 of 33 | 384.01 s / 37 of 38 |

Luna was not rerun contemporaneously. Harnesses and control paths differ; these are worker times, not an end-to-end comparison. Two tasks and one trial per effort cannot establish a general capability ranking. These synthetic tasks are not an official benchmark or a large production repository.

## A review caught what the suite missed

An independent GPT-6.1-sol high reviewer read the public archive contract and DS low candidate, without the hidden checks or reference solution. In about 39 seconds, it found a recovery-order defect: corrupt blobs prevented restoring an old destination first.

The original DS low session repaired the issue in about 41 seconds and passed all 38 frozen checks. Parent diff review then found that two shortcut paths could skip blob validation. A second DS low repair took about 23 seconds. The final artifact passed the original 38 checks and four additional public-contract regressions; the first repair had failed two of those four.

The active stage times sum to about 9 minutes 23 seconds, including the initial implementation. That sum excludes parent decision time and intervening study waits, so it is not a measured continuous end-to-end latency. The historical Luna candidate did not receive an equal repair opportunity. This case demonstrates a working review loop, not a fair win against Luna.

## Consumption and limits

| DS work | Uncached input | Cached input | Output | Disclosed total |
|---|---:|---:|---:|---:|
| Six trials | 168,527 | 22,786,944 | 551,421 | 23,506,892 |
| Two repair rounds | 4,738 | 1,625,984 | 8,733 | 1,639,455 |
| Upgrade smoke checks | 9,831 | 9,344 | 11 | 19,186 |

The sum is 25,165,533 disclosed tokens. The interrupted max request may have additional undisclosed consumption. The SDK did not expose reasoning-token counts; they are unknown, not zero. Cached reads dominate the input volume, and tokens from different providers are not directly interchangeable.

The study also recorded Codex parent, upgrade-maintenance, reviewer, and report-reader usage. At the report snapshot, these roles totalled 17,149,077 native tokens, most of them cached input. That includes one-time integration work and reporting, so it is not a per-task production estimate. The two historical Luna workers totalled 2,771,696 native tokens, excluding the earlier study's parent and control costs. Those accounting scopes are different and cannot establish a cost winner.

This repository distributes the aggregate findings and an unrelated onboarding exercise. Private execution transcripts, credentials, machine paths, and the original benchmark workspaces are excluded. The included exercise cannot reproduce the study's scores. Future speed claims need repeated, contemporaneous trials with equal acceptance and repair budgets and all-role accounting.

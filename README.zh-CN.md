<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.svg">
    <img src="docs/assets/hero.svg" alt="Codex 负责判断，DeepSeek 负责执行。独立任务、持久 worker、主 agent 验收。" width="100%">
  </picture>
</p>

<h1 align="center">Codex DS Workers</h1>

<p align="center">
  在 Codex 工作流中使用持久的 DeepSeek worker。<br>
  <strong>把独立任务交出去，把判断和验收留在 Codex。</strong>
</p>

<p align="center">
  <a href="#开始使用">开始使用</a> &nbsp; / &nbsp;
  <a href="#协作方式">协作方式</a> &nbsp; / &nbsp;
  <a href="docs/evaluation.md">实测与边界</a> &nbsp; / &nbsp;
  <a href="README.md">English</a>
</p>

<p align="center">
  <a href="docs/install.md"><img src="docs/assets/badge-node.svg" alt="需要 Node.js 24 或更新版本"></a>
  <img src="docs/assets/badge-mcp.svg" alt="Codex skill 与 MCP 集成">
  <a href="LICENSE"><img src="docs/assets/badge-license.svg" alt="MIT 许可"></a>
</p>

给 worker 一个完整的任务，让 Codex 同时推进主线，结果返回后再审查。worker 会保留会话，发现具体问题时可以在同一会话里继续修复，沿用已有上下文。

| 能力 | 带来的作用 |
| :--- | :--- |
| **持久会话** | 继续同一个 worker 的任务，无需重新交代全部上下文。 |
| **隔离执行** | 派发前划定文件归属，并为写入任务分配独立工作区。 |
| **按任务选择 effort** | 根据有界任务的难度，明确选择 `low`、`high` 或 `max`。 |
| **主 agent 验收** | 接受修改前核对契约、实际 diff 和失败路径。 |

## 开始使用

准备 **Node.js 24+、npm、Git**、已有的 **Codex 登录**和 **DeepSeek API key**，并确保能访问 GitHub 与 npm。DeepSeek 调用使用独立 API 计费。

初始面向 macOS 和 Linux。仓库记录了 macOS 隔离安装验证；Linux 仍需要对应主机的验证。详见[平台覆盖与安装说明](docs/install.md)。

### 1. 安装与配置

```bash
git clone https://github.com/Nahuyiur/codex-ds-workers.git
cd codex-ds-workers
node bin/codex-ds-workers.mjs setup
node bin/codex-ds-workers.mjs configure
node bin/codex-ds-workers.mjs doctor
```

`setup` 安装固定版本的 bridge 和 SDK、注册本地 MCP server 并安装 skill，不提交模型任务。`configure` 在终端提示你私密输入 key，不需要把 key 放进命令或聊天。

安装后保留仓库目录，后续维护命令仍会使用其中的启动器。如果已有 `dsh_subagent` 安装，setup 会保留旧安装，并在冲突时停止。详见[隔离配置与冲突处理](docs/install.md#existing-installations)。

### 2. 打开新的 Codex 聊天

让新的聊天加载 skill 和 MCP 工具，先试一次只读任务：

```text
使用 $dsh-subagent，让一个 DeepSeek worker 只读追踪当前项目的配置加载路径，
返回文件位置和调用证据。你核对证据后再接受结果。
```

正常结果包含**可继续追问的 worker ID** 和文件证据。worker 活动可能显示为 MCP 工具结果，不一定是原生 GPT 子 agent 卡片。如果当前聊天没有加载 MCP 工具，skill 可以使用已安装 CLI 的 `rpc` 路径。

## 协作方式

<p align="center">
  <picture>
    <source media="(prefers-reduced-motion: reduce) and (prefers-color-scheme: dark)" srcset="docs/assets/workflow-dark.svg">
    <source media="(prefers-reduced-motion: reduce)" srcset="docs/assets/workflow.svg">
    <img src="docs/assets/workflow.gif" alt="流程示意动画：Codex 定义任务，两个 DeepSeek worker 并行执行，Codex 审查结果后接入。这是机制示意，不是实际运行录像。" width="100%">
  </picture>
</p>

<p align="center">
  <a href="docs/assets/workflow.svg">静态流程图</a> &nbsp; / &nbsp;
  <a href="docs/assets/workflow.mp4">MP4</a> &nbsp; / &nbsp;
  <a href="docs/workflow.md">完整协作流程</a>
</p>

Codex 负责范围、公共接口、风险、模型选择和最终验收。DeepSeek 执行有界调查、独立模块、复现案例和机械修改。模糊需求与强耦合推理留给主 agent，或合适的原生 GPT 子 agent。

初始**最多两个委派执行者**。先固定公共接口，再给写入任务分配独立工作区；主 agent 继续推进独立主线，谁先完成就先审查。原生中转 agent 与其 DS worker 分别占一个名额。

### 选择 effort

| Effort | 适用任务 |
| :--- | :--- |
| `low` | 输入与验收清楚的有界执行，默认从这里开始。 |
| `high` | 范围明确、但需要较多推理的任务。 |
| `max` | 已经遇到具体难点，需要针对性升级。 |

主 agent 明确选择 effort。同会话追问保留原 model、effort 和 preset；改变 effort 需要新会话与简短交接。这是工作策略，不是经过测量的模型能力排名。

### 审查后再接入

1. 派发前明确交付物、允许修改的文件、受保护输入和验收命令。
2. 核对实际 diff 与有意义的检查，覆盖失败和恢复路径。
3. 对具体缺陷集中给一轮修复意见。最多两轮后升级模型、重新拆分或由主 agent 接管。
4. 合并已接受的修改，再运行集成检查。

> [!NOTE]
> skill 提供协作指令，不是强制调度器，也不保证绝对正确。

本地实测中，一次修复通过了原有 **38 项冻结检查**，却仍漏掉一条契约要求。主 agent 审查 diff 后发现遗漏，第二轮修复通过了**额外四项契约检查**。这说明审查闭环可以发挥作用，目前没有证据证明它普遍快于原生 Luna。详见[实测结果、条件与边界](docs/evaluation.md)。

<details>
<summary><strong>试一遍双 worker 编码练习</strong></summary>

用仓库自带的 Python 微型项目练习隔离交接和验收：

```text
使用 $dsh-subagent，完成 examples/mini-project 中的接入练习。
先创建临时副本，把 text.py 和 stats.py 分别交给两个 DS low worker，
使用独立工作区。保留 README.md、tests/ 和 protected.json。
分别审查 diff，只合并各自负责的实现文件，再运行 python3 verify.py。
报告总耗时，以及 provider 能提供的各角色用量。
不要发布代码或向外发送任何信息。
```

这个刻意缩小的例子用于检查交接与验收，不是速度基准。日常这么小的修改通常直接由主 agent 完成。

[练习文件与任务契约](examples/mini-project/README.md)。

</details>

## 常用命令

在仓库目录运行：

| 命令 | 用途 |
| :--- | :--- |
| `node bin/codex-ds-workers.mjs doctor` | 检查本地运行时健康状态。 |
| `node bin/codex-ds-workers.mjs status` | 查看服务状态。 |
| `node bin/codex-ds-workers.mjs start` | 启动后台 bridge，包括重启电脑后恢复运行。 |
| `node bin/codex-ds-workers.mjs rpc < request.json` | 通过 JSON 标准输入调用 bridge 工具。 |
| `node bin/codex-ds-workers.mjs uninstall` | 移除本安装拥有的集成，保留 key 与历史。 |

取消任务时，让 Codex 对对应的 worker ID 调用 `dsh_interrupt`，并核对返回的中断回执。停止 Codex 回合本身不能证明 DS 已停止。详见[工具生命周期与 RPC 路径](skills/dsh-subagent/references/runtime.md#mcp-lifecycle)。

此版本暂未启用 GitHub 自动测试。在本地运行 `npm test`，详见[开发检查](CONTRIBUTING.md)。

## 文档导航

| 你想要…… | 对应文档 |
| :--- | :--- |
| 安装、隔离配置或恢复运行时 | [安装指南](docs/install.md) |
| 理解任务归属、并行与完成处理 | [协作流程](docs/workflow.md) |
| 写清任务交接与结果验收要求 | [任务与结果契约](skills/dsh-subagent/references/handoffs.md) |
| 判断本地实测能支持什么结论 | [评测记录](docs/evaluation.md) |
| 修改启动器或 skill | [贡献指南](CONTRIBUTING.md) |

## 来源与许可

底层复用 [dsh-subagent-mcp](https://github.com/dqtz5vpvj9-create/dsh-subagent-mcp) 和 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。本仓库在固定版本的上游 bridge 外，提供自适应 skill、可移植安装入口和 SDK 兼容适配器。

[MIT](LICENSE) · [第三方来源说明](THIRD_PARTY_NOTICES.md)。这是独立集成，不代表上游作者或模型提供商背书。仓库不包含 API key、私有对话或个人基准工作区。

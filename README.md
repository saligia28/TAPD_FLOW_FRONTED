# Workflow 前端

该项目提供一个面向 TAPD ↔ Notion 自动化流程的可视化控制台，帮助业务成员快速筛选需求、触发后端脚本并实时观察执行状态。

## 当前功能

- **需求概览与筛选**：加载 TAPD 需求摘要、负责人列表以及预设的快速分组，支持按负责人筛选。
- **操作面板**：列出可用的自动化动作（如拉取、更新、生成测试用例），并允许勾选默认参数或组合自定义参数。
- **命令执行与状态展示**：向后端提交任务，状态会随轮询从 `pending`、`running` 更新到 `success`/`error`。
- **实时日志控制台**：按阶段增量展示脚本输出，采用自适应轮询（有新日志时 1.5 s、无新日志逐步增加直至 10 s），刷新页面后仍能保留当前任务日志。
- **状态持久化**：自研的 `usePersistentState` Hook 将选中操作、参数、任务快照、日志等写入 `localStorage`，并对历史记录做去重与裁剪。

## 实现概览

- **技术栈**：React 18 + TypeScript + Vite，配合 Tailwind 工具类实现界面。
- **数据访问**：`/src/api/client.ts` 封装 REST 请求，可通过 `VITE_API_BASE` 指定后端地址。
- **组件 & 功能模块**：核心组件包括 `StoryPanel`、`ActionCard`、`ActionOptionsPanel`、`CommandConsole`；`usePersistentState` 负责缓写和降噪。
- **日志轮询机制**：`App.tsx` 通过可变 `setTimeout` 轮询 `/api/jobs/{id}`；若收到新日志则立即缩短间隔并写回持久化存储。后端对子进程注入 `PYTHONUNBUFFERED=1`，保证日志逐行输出。

## 设计图（概览）

```
┌────────────────┐      REST/HTTP      ┌────────────────────┐
│  Workflow UI   │  ─────────────────▶ │  FastAPI Job 服务   │
│  (React/Vite)  │  ◀───────────────── │  (scripts/* 调度)   │
└────────────────┘                      └────────────────────┘
        │                                         │
        │ 状态持久化 (localStorage)               │ 子进程执行 python3 scripts/…
        ▼                                         ▼
┌────────────────┐                      ┌────────────────────┐
│ usePersistent… │                      │  TAPD / Notion API │
└────────────────┘                      └────────────────────┘
```

- 前端负责参数收集、日志展示与状态管理。
- 后端负责任务队列、子进程执行、日志流和 TAPD/Notion 交互。

## 开发指南

```bash
pnpm install      # 或 npm install / yarn install
pnpm run dev      # 启动 Vite 开发服务器
```

关键环境变量：

- `VITE_API_BASE`：可选，覆写默认的后端地址（默认 `http://127.0.0.1:8000`）。

## 接口说明（摘录）

- `GET /api/actions`
  - 描述：返回可执行动作的元数据、默认参数、选项列表。
  - 响应示例：数组，元素包含 `id`、`title`、`description`、`defaultArgs`、`options` 等字段。
- `GET /api/stories?quick=…&limit=…`
  - 描述：拉取需求摘要、负责人、快速分组。支持可选的 `quick`（重复参数）和 `limit`。
  - 响应字段：`stories`、`owners`、`quickOwners`、`total`、`truncated`。
- `POST /api/jobs`
  - 描述：创建新任务。请求体包含 `actionId`、可选 `args`/`extraArgs`、可选 `storyIds`。
  - 响应字段：任务快照＋首批日志数组＋下次轮询 `nextCursor`。
- `GET /api/jobs/{jobId}?cursor=n`
  - 描述：查询任务状态，并返回 `cursor` 之后新增的日志。
  - 响应字段：任务快照、增量日志、`nextCursor`。
- `POST /api/jobs/{jobId}/terminate`
  - 描述：尝试终止正在运行的任务，同时返回最新日志与快照。

> 说明：所有接口均返回 JSON；失败时包装成 `{detail: "..."}`。更多字段可在 `src/types.ts` 与后端 `server.py` 中查看。

## TODO / 可扩展方向

- 用 Server-Sent Events 或 WebSocket 替换轮询，降低时延与网络开销。
- 扩展任务历史面板，支持并发任务的查看、筛选与重试。
- 引入鉴权与权限控制，为外部部署做准备。
- 增加需求列表分页与高级筛选（状态、迭代、模块等）。
- 在控制台提供日志下载、附件下载等便捷操作。
- 为核心 Hook 与组件补充自动化测试，提高回归可靠性。

# Workflow 前端

该项目提供一个面向 TAPD ↔ Notion 自动化流程的可视化控制台，帮助业务成员快速筛选需求、触发后端脚本并实时观察执行状态。

## 当前功能

- **需求概览与筛选**：加载 TAPD 需求摘要、负责人列表以及预设的快速分组，支持按负责人筛选。
- **操作面板**：列出可用的自动化动作（如拉取、更新、生成测试用例），并允许勾选默认参数或组合自定义参数。
- **命令执行与状态展示**：向后端提交任务，状态会随轮询从 `pending`、`running` 更新到 `success`/`error`。
- **实时日志控制台**：按阶段增量展示脚本输出，采用自适应轮询（有新日志时 1.5 s、无新日志逐步增加直至 10 s），刷新页面后仍能保留当前任务日志。
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

## 命令执行流程详解

### 1. 命令创建与执行流程

```
用户点击"执行"按钮
    ↓
前端调用 POST /api/jobs
    ├─ 参数: actionId, args, storyIds
    └─ 设置前端状态: job.status = 'pending'
    ↓
后端创建 Job 实例
    ├─ 检查并发限制 (max_concurrent)
    ├─ 如果超出限制 → 加入队列 (pending queue)
    └─ 否则 → 立即启动子进程
    ↓
启动子进程 (asyncio.create_subprocess_exec)
    ├─ 注入环境变量: PYTHONUNBUFFERED=1
    ├─ 设置 stdout/stderr 管道
    └─ job.status = 'running'
    ↓
异步读取输出 (_pump 函数)
    ├─ 逐行读取 stdout/stderr
    ├─ 每行输出记录为 LogEntry
    │   └─ seq (序列号), timestamp, stream, text
    └─ 自动追加到 job._logs
    ↓
前端轮询 GET /api/jobs/{id}?cursor=n
    ├─ 自适应间隔:
    │   ├─ 有新日志 → 重置为 1.5s
    │   └─ 无新日志 → 每次 +1.5s，最大 10s
    ├─ 增量获取日志 (cursor 之后的新日志)
    └─ 更新前端状态和日志列表
    ↓
子进程完成
    ├─ proc.wait() 获取退出码
    ├─ job.status = 'success' (exit_code=0)
    │   或 'error' (exit_code≠0)
    ├─ 设置 job.finished_at
    └─ 从 running set 中移除
    ↓
调度待处理任务 (_schedule_pending_jobs)
    └─ 如果有排队任务 → 启动下一个
    ↓
前端检测到 status = 'success'/'error'
    ├─ 停止轮询
    ├─ 显示最终状态（绿色✓ 或 红色✗）
    └─ 1.6秒后自动重置为"待命"状态
```

### 2. 日志处理机制

**后端日志存储**：
- 使用 `JobLogStore` 类管理日志
- 每条日志包含：`seq`(序列号)、`timestamp`、`stream`(stdout/stderr/system)、`text`
- 最多保留 2000 条日志（超出后自动裁剪）
- 支持 cursor 机制增量读取

**前端日志处理**：
- `appendLogs()` 函数合并新旧日志
- 自动去重（基于 seq）
- 最多保留 2000 条（与后端对齐）
- 分块渲染（每次显示 400 条，支持"加载更多"）
- 持久化到 localStorage（250ms 防抖）

**日志流类型**：
```typescript
'stdout'  → 白色文本（标准输出）
'stderr'  → 红色文本（错误输出）
'system'  → 蓝色文本（系统消息，如终止提示）
```

### 3. 命令终止流程详解

#### 正常终止（5秒内响应 SIGTERM）

```
用户点击"终止执行"
    ↓
前端状态变更
    ├─ setTerminating(true)
    └─ 按钮显示"终止中…"
    ↓
调用 POST /api/jobs/{id}/terminate
    ↓
后端处理终止请求 (request_cancel)
    ├─ 设置 job.cancel_requested = True
    ├─ 记录日志: "终止命令请求已发送…"
    ├─ 发送 SIGTERM 信号: process.terminate()
    ├─ 记录日志: "已发送 SIGTERM 信号，等待进程响应…"
    └─ 启动后台超时任务 (_force_kill_after_timeout)
    ↓
子进程收到 SIGTERM
    ├─ Python 在字节码指令间检查信号
    ├─ 执行信号处理器
    └─ 优雅退出（清理资源）
    ↓
后台超时任务检测到进程退出
    ├─ 在 5 秒超时前 proc.wait() 返回
    ├─ 记录日志: "进程已退出，退出码: -15"
    └─ 任务完成
    ↓
_run_job 检测到进程退出
    ├─ _pump 读取完剩余输出
    ├─ proc.wait() 返回退出码
    ├─ 记录日志: "进程已终止，退出码: -15"
    ├─ 设置 job.status = 'error'
    ├─ 设置 job.exit_code = -15
    └─ 设置 job.finished_at
    ↓
terminate 接口返回
    ├─ 返回最新的 job 快照
    └─ 前端: setTerminating(false)
    ↓
前端轮询检测到 status = 'error'
    ├─ terminatePending = false (因为 status 不再是 running)
    ├─ 按钮文本恢复为"终止执行"
    ├─ 停止轮询
    └─ 显示"失败"状态
```

#### 强制终止（超过5秒未响应）

```
用户点击"终止执行"
    ↓
发送 SIGTERM（同上）
    ↓
等待 5 秒...
    ├─ 子进程可能在执行:
    │   ├─ 长时间的网络请求（Notion API）
    │   ├─ 数据库操作
    │   └─ C扩展库阻塞（不响应信号）
    └─ proc.returncode 仍为 None
    ↓
超时任务触发 (asyncio.TimeoutError)
    ├─ 记录日志: "进程未在 5 秒内响应，正在强制终止 (SIGKILL)…"
    ├─ 发送 SIGKILL: process.kill()
    ├─ 等待 0.5 秒
    └─ 记录日志: "进程已被强制终止，退出码: -9"
    ↓
进程被强制杀死
    ├─ SIGKILL 无法被捕获或忽略
    ├─ 进程立即终止（无清理）
    └─ 所有子进程也被终止
    ↓
_run_job 检测到进程退出
    ├─ 管道关闭，_pump 退出
    ├─ proc.wait() 返回退出码 -9
    ├─ 记录日志: "进程已终止，退出码: -9"
    └─ 设置 job.status = 'error'
    ↓
前端显示终止完成（同上）
```

#### 退出码说明

| 退出码 | 含义 | 触发原因 |
|--------|------|----------|
| `0` | 正常完成 | 脚本成功执行完毕 |
| `1` | 错误退出 | 脚本执行过程中发生异常 |
| `-15` | SIGTERM 终止 | 用户终止，进程响应了 SIGTERM 信号 |
| `-9` | SIGKILL 强制终止 | 用户终止，进程未在 5 秒内响应，被强制杀死 |

#### 关键实现细节

**前端终止状态判断**：
```typescript
const terminatePending = terminating ||
  (Boolean(job?.cancelRequested) && (job?.status === 'pending' || job?.status === 'running'));
```
- `terminating`：本地状态，调用 terminate 接口期间为 true
- `job.cancelRequested`：后端返回，一旦设置为 true 不会重置
- 只有当任务仍在运行时才显示"终止中…"
- 一旦 status 变为 success/error，即使 cancelRequested=true 也不显示

**后端 PYTHONUNBUFFERED 环境变量**：
```python
env = os.environ.copy()
env["PYTHONUNBUFFERED"] = "1"  # 关键！强制无缓冲输出
proc = await asyncio.create_subprocess_exec(
    *job.command,
    stdout=asyncio.subprocess.PIPE,
    stderr=asyncio.subprocess.PIPE,
    env=env,
)
```
- 如果不设置，Python 子进程的输出会被缓冲
- 缓冲导致 `readline()` 阻塞，日志无法实时显示
- 设置后强制行缓冲，每行立即刷新到管道

**轮询间隔重置优化**：
```typescript
// 终止后重置轮询间隔，加快状态检测
pollDelayRef.current = LOG_POLL_BASE_INTERVAL_MS;
```
- 避免在最大间隔（10s）时点击终止，需要等待 10s 才能检测到状态变化
- 重置后最快 1.5s 就能检测到进程已终止

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
  - 终止机制：先发送 SIGTERM，5 秒内未响应则发送 SIGKILL 强制终止。

> 说明：所有接口均返回 JSON；失败时包装成 `{detail: "..."}`。更多字段可在 `src/types.ts` 与后端 `server.py` 中查看。

## 故障排查

### 日志不显示
- **原因**：后端未设置 `PYTHONUNBUFFERED=1` 环境变量
- **解决**：检查 `jobs.py` 的 `_run_job` 方法是否正确设置了环境变量
- **验证**：查看控制台是否能实时看到输出

### 终止后状态卡住
- **原因**：`terminatePending` 逻辑错误，未检查 job.status
- **解决**：确保逻辑为 `terminating || (cancelRequested && (status === 'pending' || 'running'))`
- **验证**：进程退出后按钮应该消失或恢复可用状态

### 终止很慢或无响应
- **原因**：Python 子进程在执行长时间操作（如 Notion API），不响应 SIGTERM
- **解决**：等待 5 秒超时后自动发送 SIGKILL 强制终止
- **验证**：日志中应该看到"进程未在 5 秒内响应，正在强制终止 (SIGKILL)…"

### 轮询间隔太长
- **原因**：无新日志时间隔逐渐增加到 10 秒
- **解决**：终止后自动重置轮询间隔为 1.5 秒
- **验证**：点击终止后应在 1.5-3 秒内检测到状态变化

## TODO / 可扩展方向

- 用 Server-Sent Events 或 WebSocket 替换轮询，降低时延与网络开销。
- 扩展任务历史面板，支持并发任务的查看、筛选与重试。
- 引入鉴权与权限控制，为外部部署做准备。
- 增加需求列表分页与高级筛选（状态、迭代、模块等）。
- 在控制台提供日志下载、附件下载等便捷操作。
- 为核心 Hook 与组件补充自动化测试，提高回归可靠性。

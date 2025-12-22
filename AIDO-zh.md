# AIDO-zh.md - AI实现功能

## 功能概述

为workflow-frontend添加AI驱动的实现能力，允许用户从需求列表直接触发Claude CLI或Codex自动实现需求。

## 用户故事

作为查看StoryPanel中需求的用户，我希望点击每个需求状态字段旁边的[AI实现]按钮，打开配置对话框，指定执行参数（终端类型、工作目录、自定义提示词），并触发Node.js后端启动终端会话自动实现需求。

## 架构设计

### 前端组件

#### 1. AIImplementButton 组件
**位置**: `src/components/AIImplementButton.tsx`

触发弹窗的最小化按钮组件：
- 位于每个需求卡片的状态字段旁边
- 显示"[AI]"文本，带悬停效果
- 点击时将需求数据传递给弹窗

#### 2. AIImplementModal 组件
**位置**: `src/components/AIImplementModal.tsx`

包含三个必填字段的配置对话框：
- **终端类型**: "Claude"或"Codex"的单选按钮
- **工作目录**: 绝对路径的文本输入框
- **提示文本**: 带默认模板的文本域
- **操作按钮**: "执行"和"取消"按钮

默认提示词模板：
```
从Notion的TAPD需求中找到需求[${story.title}],分析并实现,有不清晰的地方可以告诉我,我给你补充完整
```

#### 3. StoryPanel 集成
**位置**: `src/components/StoryPanel.tsx` (第168-174行)

修改需求卡片布局，在状态字段前添加AIImplementButton：
```tsx
<div className="flex justify-between items-start gap-2">
  <p className="text-hacker-text-main font-bold break-words flex-1">
    &gt; {story.title}
  </p>
  <div className="flex items-center gap-2">
    <AIImplementButton story={story} onTrigger={handleAIImplement} />
    <span className="text-hacker-text-dim whitespace-nowrap">
      [{story.status || 'UNKNOWN'}]
    </span>
  </div>
</div>
```

### 反向代理配置

由于前端需要同时访问两个后端服务，在`vite.config.ts`中配置了反向代理：

- `/api/*` → `http://127.0.0.1:8000` (Python FastAPI - 原有workflow后端)
- `/node-api/*` → `http://127.0.0.1:3400` (Node.js Express - AI实现服务)

前端调用Node.js服务时使用`/node-api`前缀，Vite会自动转发到3400端口并移除前缀。

### 后端API契约

#### POST /node-api/api/ai-implement

**请求体**:
```typescript
{
  terminalType: 'claude' | 'codex',
  workingDirectory: string,
  promptText: string,
  storyId: string,
  storyTitle: string
}
```

**响应**:
```typescript
{
  success: boolean,
  message: string,
  sessionId?: string  // 可选：用于跟踪终端会话
}
```

**后端行为**:
- 验证工作目录是否存在
- 生成终端进程（macOS上的iTerm2/Terminal.app）
- 执行相应的CLI命令：
  - Claude: `claude "${promptText}"`
  - Codex: `codex "${promptText}"`
- 通过`cd`命令设置工作目录
- 生成后立即返回（非阻塞）

### 类型定义

**位置**: `src/types.ts`

```typescript
export type AIImplementRequest = {
  terminalType: 'claude' | 'codex';
  workingDirectory: string;
  promptText: string;
  storyId: string;
  storyTitle: string;
};

export type AIImplementResponse = {
  success: boolean;
  message: string;
  sessionId?: string;
};
```

### API客户端方法

**位置**: `src/api/client.ts`

```typescript
export async function triggerAIImplement(request: AIImplementRequest): Promise<AIImplementResponse> {
  // 使用 /node-api 前缀访问Node.js服务
  const response = await fetch('/node-api/api/ai-implement', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new RequestError(response.status, text);
  }

  return (await response.json()) as AIImplementResponse;
}
```

## 实现计划

### 阶段1: 类型定义
1. 在`src/types.ts`中添加`AIImplementRequest`和`AIImplementResponse`类型

### 阶段2: API客户端
1. 在`src/api/client.ts`中添加`triggerAIImplement`方法

### 阶段3: UI组件
1. 创建`AIImplementButton.tsx` - 最小化按钮组件
2. 创建`AIImplementModal.tsx` - 带表单验证的配置对话框
3. 将按钮集成到`StoryPanel.tsx`的需求卡片布局中

### 阶段4: 状态管理
1. 在`App.tsx`或StoryPanel中添加弹窗状态管理
2. 处理表单提交和API调用
3. 显示成功/错误提示通知

### 阶段5: 后端集成
1. 后端团队实现`/api/ai-implement`端点
2. 终端生成逻辑及适当的错误处理
3. 工作目录验证

## UI/UX规范

### AIImplementButton样式
```css
- 文本: "[AI]"
- 字体: mono, 10px
- 颜色: hacker-text-dim (默认), hacker-primary (悬停)
- 边框: 1px solid hacker-border
- 内边距: 2px 4px
- 过渡: all 200ms
```

### 弹窗布局
```
┌─────────────────────────────────────────┐
│ > AI_IMPLEMENTATION_CONFIG              │
├─────────────────────────────────────────┤
│                                         │
│ 终端类型: *                             │
│ ( ) Claude  ( ) Codex                   │
│                                         │
│ 工作目录: *                             │
│ [/path/to/project________________]      │
│                                         │
│ 提示文本: *                             │
│ ┌─────────────────────────────────────┐ │
│ │ 从Notion的TAPD需求中找到需求[...]    │ │
│ │                                     │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│           [取消]  [执行]                │
└─────────────────────────────────────────┘
```

### 验证规则
- 启用[执行]按钮前所有字段必填
- 工作目录必须是绝对路径（以`/`开头）
- 为无效输入显示内联错误消息

### 用户反馈
- 成功: 提示消息"终端已启动，正在执行AI实现..."
- 错误: 显示来自后端的错误详情提示消息
- 加载状态: API调用期间禁用[执行]按钮

## 技术考虑

### 安全性
- 后端必须验证工作目录在允许的路径内
- 清理提示文本以防止命令注入
- API端点的速率限制以防止滥用

### 错误处理
- 工作目录未找到
- 终端生成失败
- CLI工具未安装（claude/codex）
- 权限拒绝错误

### 未来增强
- 保存最近的工作目录以便快速选择
- 常用提示词的模板库
- 会话跟踪以在UI中显示终端状态
- 与作业轮询系统集成以跟踪进度

## 测试清单

- [ ] 按钮在需求卡片中正确渲染
- [ ] 弹窗正确打开/关闭
- [ ] 所有字段的表单验证正常工作
- [ ] 默认提示词模板正确填充需求标题
- [ ] 有效输入的API调用成功
- [ ] 无效工作目录的错误处理
- [ ] 后端终端正确生成
- [ ] Claude和Codex选项都能正常工作
- [ ] 提示通知正确显示
- [ ] 提交后弹窗状态重置

## 依赖项

### 前端
- 无需新依赖（使用现有的React、Tailwind）

### 后端
- Node.js `child_process`模块用于终端生成
- 平台检测用于终端命令（macOS: `open -a iTerm`，Linux: `gnome-terminal`等）

## 文件变更摘要

### 新文件（已完成✅）
- `src/components/AIImplementButton.tsx` - AI实现按钮组件
- `src/components/AIImplementModal.tsx` - AI实现配置弹窗组件
- `src/vite-env.d.ts` - Vite环境变量类型定义
- `AIDO.md` - 英文版设计文档
- `AIDO-zh.md` - 中文版设计文档（本文件）

### 修改文件（已完成✅）
- `vite.config.ts` - 添加反向代理配置（/api → 8000端口，/node-api → 3400端口）
- `src/types.ts` - 添加AIImplementRequest/Response类型定义
- `src/api/client.ts` - 添加triggerAIImplement API方法
- `src/components/StoryPanel.tsx` - 集成AIImplementButton到需求卡片
- `src/App.tsx` - 添加弹窗状态管理、事件处理和Toast通知

### 后端文件（已完成✅ - workflow-nodeJs项目）
- `src/routes/aiImplement.ts` - `/api/ai-implement`端点处理器
- `src/routes/index.ts` - 集成AI实现路由
- `AI-IMPLEMENT.md` - 后端实现文档

## 前端实现状态

✅ **已完成** - 所有前端功能已实现并通过类型检查

### 功能清单
- ✅ 类型定义（AIImplementRequest/Response）
- ✅ API客户端方法（triggerAIImplement）
- ✅ AI实现按钮组件（显示在每个需求状态旁边）
- ✅ AI实现配置弹窗（终端类型、工作目录、提示文本）
- ✅ 表单验证（必填字段、路径格式检查）
- ✅ 状态管理（弹窗开关、提交状态）
- ✅ Toast通知（成功/错误提示）
- ✅ 反向代理配置（区分Python和Node.js后端）
- ✅ TypeScript类型检查通过

## 后端实现状态

✅ **已完成** - 后端API端点已实现并通过编译

### 功能清单
- ✅ `/api/ai-implement` 端点实现
- ✅ 请求参数验证（terminalType, workingDirectory, promptText等）
- ✅ 集成现有taskService的openInTerminal功能
- ✅ TypeScript编译通过
- ✅ 错误处理和响应格式

## 完整功能状态

🎉 **全部完成** - 前端和后端都已实现，可以开始测试

### 测试步骤
1. 启动后端：`cd workflow-nodeJs && npm run dev`
2. 启动前端：`cd workflow-frontend && pnpm run dev`
3. 在浏览器中打开前端，点击需求旁的[AI]按钮
4. 配置终端类型、工作目录和提示文本
5. 点击执行，新终端窗口应该自动打开并运行Claude/Codex

## 反向代理说明

### 为什么需要反向代理？

前端项目需要同时访问两个不同端口的后端服务：
1. **Python FastAPI** (8000端口) - 原有的workflow后端，处理需求、任务等业务
2. **Node.js Express** (3400端口) - 新增的AI实现服务，负责启动终端

### 代理规则

在开发环境下，Vite会根据请求路径自动转发：

| 前端请求路径 | 转发目标 | 实际后端路径 | 用途 |
|------------|---------|------------|------|
| `/api/actions` | `http://127.0.0.1:8000` | `/api/actions` | 获取动作列表 |
| `/api/stories` | `http://127.0.0.1:8000` | `/api/stories` | 获取需求列表 |
| `/api/jobs` | `http://127.0.0.1:8000` | `/api/jobs` | 任务管理 |
| `/node-api/api/ai-implement` | `http://127.0.0.1:3400` | `/api/ai-implement` | AI实现触发 |

### 生产环境配置

生产环境需要在Nginx或其他反向代理中配置类似规则：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000;
}

location /node-api/ {
    proxy_pass http://127.0.0.1:3400/;
}
```

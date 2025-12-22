# AIDO.md - AI Implementation Feature

## Feature Overview

Add AI-powered implementation capability to workflow-frontend, allowing users to trigger Claude CLI or Codex to automatically implement requirements directly from the requirement list.

## User Story

As a user viewing requirements in the StoryPanel, I want to click an [AI实现] button next to each requirement's status field to open a configuration dialog, specify execution parameters (terminal type, working directory, custom prompt), and trigger the Node.js backend to launch a terminal session that automatically implements the requirement.

## Architecture Design

### Frontend Components

#### 1. AIImplementButton Component
**Location**: `src/components/AIImplementButton.tsx`

Minimal button component that triggers the modal:
- Positioned next to status field in each story card
- Shows "[AI]" text with hover effect
- Passes story data to modal on click

#### 2. AIImplementModal Component
**Location**: `src/components/AIImplementModal.tsx`

Configuration dialog with three required fields:
- **Terminal Type**: Radio buttons for "Claude" or "Codex"
- **Working Directory**: Text input for absolute path
- **Prompt Text**: Textarea with default template
- **Actions**: "Execute" and "Cancel" buttons

Default prompt template:
```
从Notion的TAPD需求中找到需求[${story.title}],分析并实现,有不清晰的地方可以告诉我,我给你补充完整
```

#### 3. StoryPanel Integration
**Location**: `src/components/StoryPanel.tsx` (line 168-174)

Modify story card layout to include AIImplementButton before status field:
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

### Backend API Contract

#### POST /api/ai-implement

**Request Body**:
```typescript
{
  terminalType: 'claude' | 'codex',
  workingDirectory: string,
  promptText: string,
  storyId: string,
  storyTitle: string
}
```

**Response**:
```typescript
{
  success: boolean,
  message: string,
  sessionId?: string  // Optional: for tracking terminal session
}
```

**Backend Behavior**:
- Validate working directory exists
- Spawn terminal process (iTerm2/Terminal.app on macOS)
- Execute appropriate CLI command:
  - Claude: `claude "${promptText}"`
  - Codex: `codex "${promptText}"`
- Set working directory via `cd` command
- Return immediately after spawning (non-blocking)

### Type Definitions

**Location**: `src/types.ts`

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

### API Client Method

**Location**: `src/api/client.ts`

```typescript
export async function triggerAIImplement(request: AIImplementRequest): Promise<AIImplementResponse> {
  return request<AIImplementResponse>('/api/ai-implement', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
```

## Implementation Plan

### Phase 1: Type Definitions
1. Add `AIImplementRequest` and `AIImplementResponse` types to `src/types.ts`

### Phase 2: API Client
1. Add `triggerAIImplement` method to `src/api/client.ts`

### Phase 3: UI Components
1. Create `AIImplementButton.tsx` - minimal button component
2. Create `AIImplementModal.tsx` - configuration dialog with form validation
3. Integrate button into `StoryPanel.tsx` story card layout

### Phase 4: State Management
1. Add modal state management in `App.tsx` or StoryPanel
2. Handle form submission and API call
3. Show success/error toast notifications

### Phase 5: Backend Integration
1. Backend team implements `/api/ai-implement` endpoint
2. Terminal spawning logic with proper error handling
3. Working directory validation

## UI/UX Specifications

### AIImplementButton Styling
```css
- Text: "[AI]"
- Font: mono, 10px
- Color: hacker-text-dim (default), hacker-primary (hover)
- Border: 1px solid hacker-border
- Padding: 2px 4px
- Transition: all 200ms
```

### Modal Layout
```
┌─────────────────────────────────────────┐
│ > AI_IMPLEMENTATION_CONFIG              │
├─────────────────────────────────────────┤
│                                         │
│ Terminal Type: *                        │
│ ( ) Claude  ( ) Codex                   │
│                                         │
│ Working Directory: *                    │
│ [/path/to/project________________]      │
│                                         │
│ Prompt Text: *                          │
│ ┌─────────────────────────────────────┐ │
│ │ 从Notion的TAPD需求中找到需求[...]      │ │
│ │                                     │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│           [CANCEL]  [EXECUTE]           │
└─────────────────────────────────────────┘
```

### Validation Rules
- All fields required before enabling [EXECUTE] button
- Working directory must be absolute path (starts with `/`)
- Show inline error messages for invalid inputs

### User Feedback
- Success: Toast message "终端已启动，正在执行AI实现..."
- Error: Toast message with error details from backend
- Loading state: Disable [EXECUTE] button during API call

## Technical Considerations

### Security
- Backend must validate working directory is within allowed paths
- Sanitize prompt text to prevent command injection
- Rate limiting on API endpoint to prevent abuse

### Error Handling
- Working directory not found
- Terminal spawn failure
- CLI tool not installed (claude/codex)
- Permission denied errors

### Future Enhancements
- Save recent working directories for quick selection
- Template library for common prompts
- Session tracking to show terminal status in UI
- Integration with job polling system for progress tracking

## Testing Checklist

- [ ] Button renders correctly in story card
- [ ] Modal opens/closes properly
- [ ] Form validation works for all fields
- [ ] Default prompt template populates correctly with story title
- [ ] API call succeeds with valid inputs
- [ ] Error handling for invalid working directory
- [ ] Terminal spawns correctly on backend
- [ ] Both Claude and Codex options work
- [ ] Toast notifications display properly
- [ ] Modal state resets after submission

## Dependencies

### Frontend
- No new dependencies required (uses existing React, Tailwind)

### Backend
- Node.js `child_process` module for terminal spawning
- Platform detection for terminal command (macOS: `open -a iTerm`, Linux: `gnome-terminal`, etc.)

## File Changes Summary

### New Files
- `src/components/AIImplementButton.tsx`
- `src/components/AIImplementModal.tsx`
- `AIDO.md` (this file)

### Modified Files
- `src/types.ts` - Add AIImplementRequest/Response types
- `src/api/client.ts` - Add triggerAIImplement method
- `src/components/StoryPanel.tsx` - Integrate AIImplementButton into story cards
- `src/App.tsx` - Add modal state management (if centralized)

### Backend Files (Node.js)
- Add `/api/ai-implement` endpoint handler
- Terminal spawning utility module

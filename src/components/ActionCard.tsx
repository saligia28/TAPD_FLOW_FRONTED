import type { FC } from 'react';

import type { ActionMeta } from '../types';

export type ActionState = 'idle' | 'running' | 'success' | 'error';

type Props = {
  action: ActionMeta;
  state: ActionState;
  busy: boolean;
  onSelect: (action: ActionMeta) => void;
  selected?: boolean;
  disabled?: boolean;
};

const labels: Record<ActionState, string> = {
  idle: '待命',
  running: '运行中…',
  success: '完成',
  error: '失败',
};

const ActionCard: FC<Props> = ({ action, state, busy, onSelect, selected = false, disabled = false }) => {
  const isRunning = state === 'running';
  const isDone = state === 'success';
  const isError = state === 'error';

  return (
    <button
      type="button"
      onClick={() => onSelect(action)}
      disabled={busy || disabled}
      className={`group relative w-full text-left transition-all duration-200 ${busy || disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:transform hover:translate-x-1'
        }`}
    >
      <div
        className={`h-full border p-5 transition-all duration-200 ${selected
            ? 'border-hacker-primary bg-hacker-primary/10 shadow-neon'
            : 'border-hacker-border bg-hacker-panel hover:border-hacker-primary/50'
          }`}
      >
        {/* Corner accents */}
        <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l transition-colors duration-200 ${selected ? 'border-hacker-primary' : 'border-hacker-border group-hover:border-hacker-primary'}`} />
        <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r transition-colors duration-200 ${selected ? 'border-hacker-primary' : 'border-hacker-border group-hover:border-hacker-primary'}`} />
        <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l transition-colors duration-200 ${selected ? 'border-hacker-primary' : 'border-hacker-border group-hover:border-hacker-primary'}`} />
        <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r transition-colors duration-200 ${selected ? 'border-hacker-primary' : 'border-hacker-border group-hover:border-hacker-primary'}`} />

        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-hacker-border/50 pb-2 mb-1">
            <span className="text-xs font-mono text-hacker-text-dim flex-1">ID: {action.id}</span>
            <span
              className={`text-xs font-bold uppercase tracking-wider ${isRunning
                  ? 'text-hacker-primary animate-pulse'
                  : isDone
                    ? 'text-hacker-primary'
                    : isError
                      ? 'text-hacker-alert'
                      : 'text-hacker-text-dim'
                }`}
            >
              [{labels[state]}]
            </span>
          </div>
          <h2 className={`text-lg font-bold tracking-tight clamp-2 leading-snug break-words ${selected ? 'text-hacker-primary text-glow' : 'text-hacker-text-main group-hover:text-white'}`}>
            {action.title}
          </h2>
          <p className="text-sm text-hacker-text-dim leading-relaxed clamp-3 font-mono">{action.description}</p>
          {action.commandPreview ? (
            <code className="block max-w-full font-mono text-xs text-hacker-text-code bg-black/50 border border-hacker-border/50 rounded px-3 py-2 whitespace-pre-wrap break-all">
              &gt; {action.commandPreview}
            </code>
          ) : null}
          {action.hint ? (
            <p className="text-[10px] uppercase tracking-widest text-hacker-text-dim/60 overflow-hidden text-ellipsis whitespace-nowrap">
              // {action.hint}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
};

export default ActionCard;

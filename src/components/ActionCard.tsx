import type { FC } from 'react';

import type { ActionMeta } from '../types';

export type ActionState = 'idle' | 'running' | 'success' | 'error';

type Props = {
  action: ActionMeta;
  state: ActionState;
  busy: boolean;
  onTrigger: (action: ActionMeta) => void;
  selected?: boolean;
};

const labels: Record<ActionState, string> = {
  idle: '待命',
  running: '运行中…',
  success: '完成',
  error: '失败',
};

const ActionCard: FC<Props> = ({ action, state, busy, onTrigger, selected = false }) => {
  const isRunning = state === 'running';
  const isDone = state === 'success';
  const isError = state === 'error';

  return (
    <button
      type="button"
      onClick={() => onTrigger(action)}
      disabled={busy}
      className={`pixel-button rounded-2xl bg-panel-base/80 px-6 py-7 text-left transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white hover:bg-panel-card ${
        busy ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'
      } ${
        selected ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-panel-base/80' : ''
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-sm uppercase tracking-[0.2em] text-panel-subtle">{action.id}</span>
          <span
            className={`text-xs font-semibold ${
              isRunning
                ? 'text-white'
                : isDone
                  ? 'text-emerald-400'
                  : isError
                    ? 'text-rose-400'
                    : 'text-panel-subtle'
            }`}
          >
            {labels[state]}
          </span>
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-white clamp-2 leading-snug break-words">
          {action.title}
        </h2>
        <p className="text-sm text-panel-subtle leading-relaxed clamp-3">{action.description}</p>
        {action.commandPreview ? (
          <code className="block max-w-full font-mono text-xs text-panel-subtle/70 bg-panel-base/70 rounded-lg px-3 py-2 whitespace-pre-wrap break-all">
            {action.commandPreview}
          </code>
        ) : null}
        {action.hint ? (
          <p className="text-[11px] uppercase tracking-[0.25em] text-panel-subtle/60 overflow-hidden text-ellipsis whitespace-nowrap">
            {action.hint}
          </p>
        ) : null}
      </div>
    </button>
  );
};

export default ActionCard;

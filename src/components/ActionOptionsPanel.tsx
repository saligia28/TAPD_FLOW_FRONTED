import { FC, useMemo } from 'react';

import type { ActionMeta } from '../types';

type Props = {
  action: ActionMeta;
  selectedOptionIds: string[];
  onToggleOption: (optionId: string) => void;
  onExecute: () => void;
  busy: boolean;
  executeDisabled: boolean;
  disabledMessage?: string | null;
};

const ActionOptionsPanel: FC<Props> = ({
  action,
  selectedOptionIds,
  onToggleOption,
  onExecute,
  busy,
  executeDisabled,
  disabledMessage = null,
}) => {
  const selectedSet = useMemo(() => new Set(selectedOptionIds), [selectedOptionIds]);
  const hasOptions = action.options.length > 0;

  const selectedLabels = useMemo(() => {
    return action.options.filter((option) => selectedSet.has(option.id)).map((option) => option.label);
  }, [action.options, selectedSet]);

  return (
    <div className="rounded-3xl pixel-frame bg-panel-base/70 backdrop-blur px-6 py-6 space-y-5">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-panel-subtle">参数选项</h3>
        <p className="text-lg font-semibold text-white leading-tight">{action.title}</p>
        <p className="text-sm text-panel-subtle leading-relaxed">{action.description}</p>
        {action.hint ? (
          <p className="text-xs text-panel-subtle/70 leading-relaxed">{action.hint}</p>
        ) : null}
      </div>

      {hasOptions ? (
        <div className="flex flex-wrap gap-2">
          {action.options.map((option) => {
            const selected = selectedSet.has(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggleOption(option.id)}
                disabled={busy}
                title={option.description}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  selected
                    ? 'bg-white/15 border-white/50 text-white shadow-sm'
                    : 'bg-transparent border-white/15 text-panel-subtle hover:border-white/30'
                } ${busy ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-panel-subtle/80">该命令暂无可配置的额外参数。</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-panel-subtle/70 leading-relaxed">
          {selectedLabels.length > 0 ? `已选参数：${selectedLabels.join('、')}` : '未选择额外参数，将使用默认命令。'}
        </div>
        <button
          type="button"
          onClick={onExecute}
          disabled={busy || executeDisabled}
          className={`pixel-button rounded-full px-5 py-2 text-sm font-semibold ${
            busy || executeDisabled
              ? 'bg-white/20 text-panel-subtle cursor-not-allowed'
              : 'bg-white/80 text-neutral-900 hover:bg-white'
          }`}
        >
          {busy ? '执行中…' : '执行命令'}
        </button>
      </div>
      {executeDisabled && !busy && disabledMessage ? (
        <p className="text-xs text-panel-subtle/70">{disabledMessage}</p>
      ) : null}
    </div>
  );
};

export default ActionOptionsPanel;

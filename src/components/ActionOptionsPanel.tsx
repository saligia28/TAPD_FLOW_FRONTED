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
    <div className="hacker-border bg-hacker-panel p-5 space-y-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-1">
        <div className="w-2 h-2 bg-hacker-primary rounded-full animate-pulse"></div>
      </div>

      <div className="flex flex-col gap-1 border-b border-hacker-border/50 pb-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-hacker-primary">
          &gt; CONFIGURATION_MODULE
        </h3>
        <p className="text-lg font-bold text-white leading-tight uppercase tracking-tight">
          {action.title}
        </p>
        <p className="text-xs text-hacker-text-dim font-mono">
          // {action.description}
        </p>
        {action.hint ? (
          <p className="text-[10px] text-hacker-text-dim/60 font-mono mt-1">
            /* {action.hint} */
          </p>
        ) : null}
      </div>

      {hasOptions ? (
        <div className="flex flex-wrap gap-3">
          {action.options.map((option) => {
            const selected = selectedSet.has(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggleOption(option.id)}
                disabled={busy}
                title={option.description}
                className={`group flex items-center gap-2 px-3 py-1.5 text-xs font-mono border transition-all duration-200 ${selected
                    ? 'bg-hacker-primary/10 border-hacker-primary text-hacker-primary shadow-neon'
                    : 'bg-transparent border-hacker-border text-hacker-text-dim hover:border-hacker-primary/50 hover:text-white'
                  } ${busy ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`w-3 h-3 border flex items-center justify-center transition-colors ${selected ? 'border-hacker-primary bg-hacker-primary text-black' : 'border-hacker-text-dim group-hover:border-white'}`}>
                  {selected && <span className="block w-1.5 h-1.5 bg-black"></span>}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-hacker-text-dim/50 font-mono">&lt;NO_ADDITIONAL_FLAGS_AVAILABLE&gt;</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="text-[10px] text-hacker-text-dim font-mono">
          {selectedLabels.length > 0 ? (
            <span>FLAGS: [{selectedLabels.join(', ')}]</span>
          ) : (
            <span>FLAGS: [DEFAULT]</span>
          )}
        </div>
        <button
          type="button"
          onClick={onExecute}
          disabled={busy || executeDisabled}
          className={`relative overflow-hidden px-6 py-2 text-sm font-bold uppercase tracking-wider transition-all duration-200 ${busy || executeDisabled
              ? 'bg-hacker-border/30 text-hacker-text-dim cursor-not-allowed border border-hacker-border'
              : 'bg-hacker-primary text-black hover:bg-white hover:shadow-neon border border-hacker-primary'
            }`}
        >
          {busy ? (
            <span className="animate-pulse">EXECUTING...</span>
          ) : (
            <span className="flex items-center gap-2">
              <span>&gt; EXECUTE_COMMAND</span>
            </span>
          )}
        </button>
      </div>
      {executeDisabled && !busy && disabledMessage ? (
        <p className="text-[10px] text-hacker-alert font-mono border-l-2 border-hacker-alert pl-2">
          ! {disabledMessage}
        </p>
      ) : null}
    </div>
  );
};

export default ActionOptionsPanel;

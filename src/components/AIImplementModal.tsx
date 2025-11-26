import type { FC } from 'react';
import { useState } from 'react';
import type { StorySummary } from '../types';

type Props = {
  story: StorySummary;
  onClose: () => void;
  onSubmit: (data: {
    terminalType: 'claude' | 'codex';
    workingDirectory: string;
    promptText: string;
  }) => void;
  isSubmitting: boolean;
};

const AIImplementModal: FC<Props> = ({ story, onClose, onSubmit, isSubmitting }) => {
  const [terminalType, setTerminalType] = useState<'claude' | 'codex'>('claude');
  const [workingDirectory, setWorkingDirectory] = useState('');
  const [promptText, setPromptText] = useState(
    `从Notion的TAPD需求中找到需求[${story.title}],分析并实现,有不清晰的地方可以告诉我,我给你补充完整`
  );

  const isValid = terminalType && workingDirectory.trim().startsWith('/') && promptText.trim();

  const handleSubmit = () => {
    if (!isValid || isSubmitting) return;
    onSubmit({
      terminalType,
      workingDirectory: workingDirectory.trim(),
      promptText: promptText.trim()
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-hacker-panel border border-hacker-border w-full max-w-xl font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-hacker-border px-4 py-2">
          <p className="text-[10px] uppercase tracking-widest text-hacker-primary">
            &gt; AI_IMPLEMENTATION_CONFIG
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-hacker-text-main uppercase">
              终端类型 <span className="text-hacker-alert">*</span>
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  value="claude"
                  checked={terminalType === 'claude'}
                  onChange={(e) => setTerminalType(e.target.value as 'claude')}
                  className="accent-hacker-primary"
                />
                <span className="text-xs text-hacker-text-dim">Claude</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  value="codex"
                  checked={terminalType === 'codex'}
                  onChange={(e) => setTerminalType(e.target.value as 'codex')}
                  className="accent-hacker-primary"
                />
                <span className="text-xs text-hacker-text-dim">Codex</span>
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-hacker-text-main uppercase">
              工作目录 <span className="text-hacker-alert">*</span>
            </label>
            <input
              type="text"
              value={workingDirectory}
              onChange={(e) => setWorkingDirectory(e.target.value)}
              placeholder="/path/to/project"
              className="w-full bg-black/40 border border-hacker-border px-2 py-1.5 text-xs text-hacker-text-main focus:border-hacker-primary focus:outline-none"
            />
            {workingDirectory && !workingDirectory.trim().startsWith('/') && (
              <p className="text-[9px] text-hacker-alert">必须是绝对路径（以/开头）</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-hacker-text-main uppercase">
              提示文本 <span className="text-hacker-alert">*</span>
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={3}
              className="w-full bg-black/40 border border-hacker-border px-2 py-1.5 text-xs text-hacker-text-main focus:border-hacker-primary focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="border-t border-hacker-border px-4 py-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3 py-1 text-[10px] uppercase tracking-wider border border-hacker-border text-hacker-text-dim hover:text-hacker-primary hover:border-hacker-primary transition-colors disabled:opacity-50"
          >
            [取消]
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="px-3 py-1 text-[10px] uppercase tracking-wider border border-hacker-primary bg-hacker-primary text-black hover:bg-transparent hover:text-hacker-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '[执行中...]' : '[执行]'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIImplementModal;

import type { FC } from 'react';
import type { StorySummary } from '../types';

type Props = {
  story: StorySummary;
  onTrigger: (story: StorySummary) => void;
};

const AIImplementButton: FC<Props> = ({ story, onTrigger }) => {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onTrigger(story);
      }}
      className="px-1 py-0.5 text-[10px] font-mono border border-hacker-border text-hacker-text-dim hover:text-hacker-primary hover:border-hacker-primary transition-all duration-200"
    >
      [AI]
    </button>
  );
};

export default AIImplementButton;

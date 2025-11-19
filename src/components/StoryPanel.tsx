import type { FC } from 'react';

import type { StorySummary } from '../types';

type OwnerOption = {
  name: string;
  count: number;
};

type QuickOwnerOption = {
  name: string;
  count: number;
  active: boolean;
  selectedCount: number;
};

type Props = {
  owners: OwnerOption[];
  selectedOwners: string[];
  onToggleOwner: (owner: string) => void;
  onToggleQuickOwner: (owner: string) => void;
  onClearOwners: () => void;
  onSelectAll: () => void;
  quickOwners: QuickOwnerOption[];
  stories: StorySummary[];
  loading: boolean;
  error: string | null;
};

const StoryPanel: FC<Props> = ({
  owners,
  selectedOwners,
  onToggleOwner,
  onToggleQuickOwner,
  onClearOwners,
  onSelectAll,
  quickOwners,
  stories,
  loading,
  error,
}) => {
  const isOwnerSelected = (owner: string) => selectedOwners.includes(owner);

  return (
    <section className="h-full flex flex-col space-y-6 overflow-hidden">
      <header className="flex flex-col gap-2 border-b border-hacker-border pb-4 shrink-0">
        <p className="text-xs uppercase tracking-widest text-hacker-primary animate-pulse">
          &gt; SYSTEM.ITERATION_LOAD
        </p>
        <h2 className="text-xl font-bold text-white uppercase tracking-tight">
          Current_Iteration_Data
        </h2>
        <p className="text-xs text-hacker-text-dim font-mono">
          // Select personnel to filter command execution scope.
        </p>
      </header>

      <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-hidden">
        <div className="space-y-4 shrink-0">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-hacker-text-dim bg-hacker-panel w-fit px-1">
              [FILTER: FRONTEND]
            </span>
            <div className="flex flex-wrap gap-2">
              {quickOwners.map((option) => {
                const displayCount = option.active ? option.selectedCount : option.count;
                return (
                  <button
                    key={`quick-${option.name}`}
                    type="button"
                    onClick={() => onToggleQuickOwner(option.name)}
                    className={`px-2 py-1 text-xs font-mono border transition-all duration-200 ${option.active
                      ? 'bg-hacker-primary text-black border-hacker-primary font-bold'
                      : 'bg-transparent text-hacker-text-dim border-hacker-border hover:border-hacker-primary hover:text-hacker-primary'
                      }`}
                  >
                    [{option.active ? 'x' : ' '}] {option.name}
                    <span className="ml-1 opacity-60">&lt;{displayCount}&gt;</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-hacker-text-dim bg-hacker-panel w-fit px-1">
              [FILTER: OWNER]
            </span>
            <div className="flex flex-wrap gap-2">
              {owners.length === 0 && !loading ? (
                <span className="text-xs text-hacker-text-dim font-mono">&lt;NO_DATA_FOUND&gt;</span>
              ) : null}
              {owners.map((option) => {
                const active = isOwnerSelected(option.name);
                return (
                  <button
                    key={option.name}
                    type="button"
                    onClick={() => onToggleOwner(option.name)}
                    className={`px-2 py-1 text-xs font-mono border transition-all duration-200 ${active
                      ? 'bg-hacker-primary text-black border-hacker-primary font-bold'
                      : 'bg-transparent text-hacker-text-dim border-hacker-border hover:border-hacker-primary hover:text-hacker-primary'
                      }`}
                  >
                    [{active ? 'x' : ' '}] {option.name}
                    <span className="ml-1 opacity-60">&lt;{option.count}&gt;</span>
                  </button>
                );
              })}
            </div>
            {owners.length > 0 ? (
              <div className="ml-auto flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="text-[10px] uppercase tracking-wider text-hacker-text-dim hover:text-hacker-primary transition-colors"
                >
                  [SELECT_ALL]
                </button>
                <button
                  type="button"
                  onClick={onClearOwners}
                  className="text-[10px] uppercase tracking-wider text-hacker-text-dim hover:text-hacker-alert transition-colors"
                >
                  [CLEAR]
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex-1 border border-hacker-border bg-black/40 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-hacker-primary/30 z-10"></div>
          <div className="h-full overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
            {loading ? (
              <div className="space-y-2 font-mono text-xs text-hacker-primary animate-pulse">
                <p>&gt; LOADING_DATA_STREAM...</p>
                <p>&gt; PARSING_OBJECTS...</p>
                <p>&gt; ...</p>
              </div>
            ) : error ? (
              <p className="text-hacker-alert text-xs font-mono border border-hacker-alert/50 p-2">
                [ERROR] {error}
              </p>
            ) : stories.length === 0 ? (
              <p className="text-xs text-hacker-text-dim font-mono">&gt; NO_MATCHING_RECORDS_FOUND</p>
            ) : (
              stories.map((story) => {
                const ownersLabel = story.owners.length > 0 ? story.owners.join(',') : 'UNASSIGNED';
                const Wrapper = story.url ? 'a' : 'div';
                const wrapperProps = story.url
                  ? {
                    href: story.url,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  }
                  : {};
                const interactiveClass = story.url
                  ? ' cursor-pointer hover:bg-hacker-primary/10 hover:border-hacker-primary/50'
                  : '';

                return (
                  <Wrapper
                    key={story.id}
                    className={`group flex flex-col gap-1 border-b border-hacker-border/30 px-2 py-3 transition-all duration-200 font-mono text-xs ${interactiveClass}`}
                    {...wrapperProps}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-hacker-text-main font-bold break-words flex-1 group-hover:text-hacker-primary transition-colors">
                        &gt; {story.title}
                      </p>
                      <span className="text-hacker-text-dim whitespace-nowrap opacity-50 group-hover:opacity-100">
                        [{story.status || 'UNKNOWN'}]
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-hacker-text-dim/70">
                      <span>OWNER: {ownersLabel}</span>
                      {story.frontend ? <span>FE: {story.frontend}</span> : null}
                    </div>
                  </Wrapper>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export type { OwnerOption, QuickOwnerOption };
export default StoryPanel;

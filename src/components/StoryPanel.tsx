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
    <section className="h-full flex flex-col rounded-3xl bg-panel-card/80 backdrop-blur pixel-frame px-7 py-7 space-y-6 lg:min-h-0 lg:max-h-[90vh]">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.35em] text-panel-subtle">current iteration</p>
        <h2 className="text-2xl font-semibold text-white">本迭代需求总览</h2>
        <p className="text-sm text-panel-subtle leading-relaxed">
          勾选处理人后触发右侧操作，系统将仅针对选中人员的需求执行脚本。
        </p>
      </header>

      <div className="flex-1 flex flex-col space-y-4 lg:min-h-0">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs uppercase tracking-[0.3em] text-panel-subtle">前端</span>
            <div className="flex flex-wrap gap-2">
              {quickOwners.map((option) => {
                const displayCount = option.active ? option.selectedCount : option.count;
                return (
                  <button
                    key={`quick-${option.name}`}
                    type="button"
                    onClick={() => onToggleQuickOwner(option.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors pixel-button ${
                      option.active
                        ? 'bg-white text-black'
                        : 'bg-panel-base/80 text-panel-subtle hover:text-white'
                    }`}
                  >
                    {option.name}
                    <span className="ml-1 text-panel-subtle/70">({displayCount})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs uppercase tracking-[0.3em] text-panel-subtle">负责人</span>
            <div className="flex flex-wrap gap-2">
              {owners.length === 0 && !loading ? (
                <span className="text-xs text-panel-subtle/70">未识别到负责人</span>
              ) : null}
              {owners.map((option) => {
                const active = isOwnerSelected(option.name);
                return (
                  <button
                    key={option.name}
                    type="button"
                    onClick={() => onToggleOwner(option.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors pixel-button ${
                      active
                        ? 'bg-white text-black'
                        : 'bg-panel-base/80 text-panel-subtle hover:text-white'
                    }`}
                  >
                    {option.name}
                    <span className="ml-1 text-panel-subtle/70">({option.count})</span>
                  </button>
                );
              })}
            </div>
            {owners.length > 0 ? (
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="px-3 py-1.5 rounded-full text-xs text-panel-subtle hover:text-white transition-colors border border-panel-subtle/40"
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={onClearOwners}
                  className="px-3 py-1.5 rounded-full text-xs text-panel-subtle hover:text-white transition-colors border border-panel-subtle/40"
                >
                  清空
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex-1 rounded-2xl bg-panel-base/70 border border-panel-card/40 flex flex-col min-h-[18rem] lg:min-h-0">
          <div className="h-full overflow-y-auto px-5 py-4 space-y-3 text-sm text-panel-subtle">
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-8 rounded-lg bg-panel-base/60 animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <p className="text-rose-300 text-xs">{error}</p>
            ) : stories.length === 0 ? (
              <p className="text-xs">没有符合筛选条件的需求。</p>
            ) : (
              stories.map((story) => {
                const ownersLabel = story.owners.length > 0 ? story.owners.join(' / ') : '未指派';
                const Wrapper = story.url ? 'a' : 'div';
                const wrapperProps = story.url
                  ? {
                      href: story.url,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                    }
                  : {};
                const interactiveClass = story.url
                  ? ' cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40'
                  : '';

                return (
                  <Wrapper
                    key={story.id}
                    className={`flex justify-between gap-4 rounded-xl px-3 py-2 transition-colors hover:bg-white/5${interactiveClass}`}
                    {...wrapperProps}
                  >
                    <div className="space-y-1">
                      <p className="text-white text-sm font-medium break-words">{story.title}</p>
                      <p className="text-xs text-panel-subtle/70">负责人：{ownersLabel}</p>
                      {story.frontend ? (
                        <p className="text-xs text-panel-subtle/70">前端：{story.frontend}</p>
                      ) : null}
                    </div>
                    <div className="text-right text-xs text-panel-subtle/80 whitespace-nowrap">
                      {story.status ? <p>{story.status}</p> : null}
                      {story.updatedAt ? <p>更新：{story.updatedAt}</p> : null}
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

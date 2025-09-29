import { useEffect, useMemo, useRef, useState } from 'react';

import ActionCard, { type ActionState } from './components/ActionCard';
import CommandConsole from './components/CommandConsole';
import StoryPanel, { type OwnerOption } from './components/StoryPanel';
import { createJob, fetchActions, fetchJob, fetchStories } from './api/client';
import type { ActionMeta, JobLogEntry, JobSnapshot, JobStatus, StorySummary } from './types';

const jobStatusToActionState = (status: JobStatus): ActionState => {
  if (status === 'success') return 'success';
  if (status === 'error') return 'error';
  if (status === 'pending' || status === 'running') return 'running';
  return 'idle';
};

const App = () => {
  const [actions, setActions] = useState<ActionMeta[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, ActionState>>({});
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [loadingActions, setLoadingActions] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [logs, setLogs] = useState<JobLogEntry[]>([]);
  const [cursor, setCursor] = useState(0);
  const [jobError, setJobError] = useState<string | null>(null);

  const [stories, setStories] = useState<StorySummary[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);

  const cursorRef = useRef(0);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await fetchActions(controller.signal);
        setActions(data);
        setStatusMap(
          data.reduce<Record<string, ActionState>>((acc, action) => {
            acc[action.id] = 'idle';
            return acc;
          }, {}),
        );
        setActionError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : '无法获取操作列表';
        setActionError(message);
      } finally {
        setLoadingActions(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await fetchStories(controller.signal);
        setStories(data);
        setStoryError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : '无法获取需求列表';
        setStoryError(message);
      } finally {
        setLoadingStories(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const busy = useMemo(
    () => (job ? job.status === 'pending' || job.status === 'running' : false),
    [job],
  );

  const ownerOptions = useMemo<OwnerOption[]>(() => {
    const counts = new Map<string, number>();
    stories.forEach((story) => {
      if (story.owners.length === 0) {
        counts.set('未指派', (counts.get('未指派') ?? 0) + 1);
        return;
      }
      story.owners.forEach((owner) => {
        const key = owner.trim();
        if (!key) return;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
  }, [stories]);

  useEffect(() => {
    setSelectedOwners((prev) => prev.filter((owner) => ownerOptions.some((option) => option.name === owner)));
  }, [ownerOptions]);

  const filteredStories = useMemo(() => {
    const selectedOwnerSet = selectedOwners.length > 0 ? new Set(selectedOwners) : null;

    if (!selectedOwnerSet) return stories;

    return stories.filter((story) => {
      const owners = story.owners.length > 0 ? story.owners : ['未指派'];
      return owners.some((owner) => selectedOwnerSet.has(owner));
    });
  }, [stories, selectedOwners]);

  const toggleOwner = (owner: string) => {
    setSelectedOwners((prev) => {
      const exists = prev.includes(owner);
      if (exists) return prev.filter((item) => item !== owner);
      return [...prev, owner];
    });
  };

  const clearOwners = () => {
    setSelectedOwners([]);
  };

  const selectAllOwners = () => {
    setSelectedOwners(ownerOptions.map((option) => option.name));
  };

  const resetStatusLater = (actionId: string) => {
    window.setTimeout(() => {
      setStatusMap((prev) => ({ ...prev, [actionId]: 'idle' }));
    }, 1600);
  };

  const handleTrigger = async (action: ActionMeta) => {
    if (busy) return;

    setSelectedAction(action.id);
    setJobError(null);
    setLogs([]);
    setCursor(0);
    cursorRef.current = 0;

    setStatusMap((prev) => ({ ...prev, [action.id]: 'running' }));

    try {
      const ownerArgs = selectedOwners.length > 0 ? ['--owner', selectedOwners.join(',')] : [];
      const response = await createJob(action.id, ownerArgs);
      const { logs: initialLogs, nextCursor, ...meta } = response;
      setJob(meta);
      setLogs(initialLogs);
      setCursor(nextCursor);
      cursorRef.current = nextCursor;
    } catch (error) {
      const message = error instanceof Error ? error.message : '触发操作失败';
      setJobError(message);
      setStatusMap((prev) => ({ ...prev, [action.id]: 'error' }));
      resetStatusLater(action.id);
    }
  };

  useEffect(() => {
    if (!job) return;

    const actionId = job.actionId;
    const mapped = jobStatusToActionState(job.status);
    setStatusMap((prev) => ({ ...prev, [actionId]: mapped }));

    if (mapped === 'success' || mapped === 'error') {
      const timer = window.setTimeout(() => {
        setStatusMap((prev) => ({ ...prev, [actionId]: 'idle' }));
      }, 1600);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [job?.status, job?.actionId]);

  useEffect(() => {
    if (!job) return;
    if (job.status === 'success' || job.status === 'error') return;

    let cancelled = false;
    const controller = new AbortController();

    const poll = async () => {
      try {
        const response = await fetchJob(job.id, cursorRef.current, controller.signal);
        if (cancelled) return;

        const { logs: nextLogs, nextCursor, ...meta } = response;
        setJob((prev) => (prev ? { ...prev, ...meta } : meta));

        if (nextLogs.length > 0) {
          setLogs((prev) => [...prev, ...nextLogs]);
        }

        setCursor(nextCursor);
        cursorRef.current = nextCursor;

        if (meta.status === 'success' || meta.status === 'error') {
          cancelled = true;
          controller.abort();
        }
      } catch (error) {
        if (cancelled) return;
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        const message = error instanceof Error ? error.message : '轮询失败';
        setJobError(message);
        cancelled = true;
        controller.abort();
      }
    };

    const interval = window.setInterval(poll, 1200);
    poll();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [job?.id, job?.status]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 sm:px-6 py-10 lg:py-14">
      <div className="w-full flex flex-col gap-8 lg:gap-10">
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-8 lg:gap-10 lg:min-h-0">
          <div className="flex-1 min-w-0 lg:min-h-0 lg:max-h-[90vh] lg:overflow-auto">
            <div className="h-full lg:px-1 lg:py-1">
              <StoryPanel
                owners={ownerOptions}
                selectedOwners={selectedOwners}
                onToggleOwner={toggleOwner}
                onClearOwners={clearOwners}
                onSelectAll={selectAllOwners}
                stories={filteredStories}
                loading={loadingStories}
                error={storyError}
              />
            </div>
          </div>

          <section className="flex-1 min-w-0 flex flex-col rounded-3xl bg-panel-card/80 backdrop-blur pixel-frame px-7 py-9 lg:min-h-0 lg:max-h-[90vh] lg:overflow-auto">
            <header className="space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-panel-subtle">tapd • notion • qa</p>
              <h1 className="text-3xl md:text-[34px] font-semibold leading-snug text-white">
                日常流程，一键到位
              </h1>
              <p className="text-sm text-panel-subtle leading-relaxed max-w-xl clamp-3">
                选定下方操作即可触发脚本，右侧实时展示执行日志与状态。
              </p>
            </header>

            <div className="mt-6 flex-1 flex flex-col gap-6 lg:min-h-0">
              <div>
                {loadingActions ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((item) => (
                      <div key={item} className="h-40 rounded-2xl bg-panel-base/50 animate-pulse" />
                    ))}
                  </div>
                ) : actionError ? (
                  <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-6 text-sm text-rose-200">
                    {actionError}
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {actions.map((action) => (
                      <ActionCard
                        key={action.id}
                        action={action}
                        state={statusMap[action.id] ?? 'idle'}
                        busy={busy}
                        onTrigger={handleTrigger}
                        selected={selectedAction === action.id}
                      />
                    ))}
                  </div>
                )}
              </div>

              <CommandConsole job={job} logs={logs} error={jobError} />

              <div className="rounded-3xl pixel-frame bg-panel-base/70 backdrop-blur px-6 py-6 space-y-4">
                <h3 className="font-semibold text-white uppercase tracking-[0.3em] text-xs">提示</h3>
                <p className="text-sm text-panel-subtle leading-relaxed">
                  运行前请确保在 TAPD 项目内启动 FastAPI 服务，例如：
                  <span className="block font-mono text-xs mt-2">uvicorn src.server:app --reload</span>
                </p>
                <p className="text-sm text-panel-subtle leading-relaxed">
                  如需联网执行或写入 Notion，请提前完成配置并确认相关凭证。
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default App;

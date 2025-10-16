import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ActionCard, { type ActionState } from './components/ActionCard';
import ActionOptionsPanel from './components/ActionOptionsPanel';
import CommandConsole from './components/CommandConsole';
import StoryPanel, { type OwnerOption, type QuickOwnerOption } from './components/StoryPanel';
import { createJob, fetchActions, fetchJob, fetchStories, terminateJob, RequestError } from './api/client';
import type { ActionMeta, JobLogEntry, JobSnapshot, JobStatus, StoryQuickOwnerAggregate, StorySummary } from './types';
import { usePersistentState } from './hooks/usePersistentState';

const jobStatusToActionState = (status: JobStatus): ActionState => {
  if (status === 'success') return 'success';
  if (status === 'error') return 'error';
  if (status === 'pending' || status === 'running') return 'running';
  return 'idle';
};

const QUICK_OWNER_SHORTCUTS = ['江林', '喻童', '王荣祥'] as const;

const MAX_LOG_ENTRIES = 2000;
const LOG_POLL_BASE_INTERVAL_MS = 1500;
const LOG_POLL_INCREMENT_MS = 1500;
const LOG_POLL_MAX_INTERVAL_MS = 10000;

const shouldNormalizeLogs = (entries: JobLogEntry[]): boolean => {
  if (entries.length > MAX_LOG_ENTRIES) return true;
  const seen = new Set<number>();
  for (let i = 0; i < entries.length; i += 1) {
    const seq = entries[i].seq;
    if (seen.has(seq)) return true;
    seen.add(seq);
  }
  return false;
};

const normalizeLogs = (entries: JobLogEntry[]): JobLogEntry[] => {
  if (entries.length === 0 || !shouldNormalizeLogs(entries)) return entries;
  const seen = new Set<number>();
  const buffer: JobLogEntry[] = [];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (seen.has(entry.seq)) continue;
    seen.add(entry.seq);
    buffer.push(entry);
    if (buffer.length === MAX_LOG_ENTRIES) break;
  }
  buffer.reverse();
  return buffer;
};

const appendLogs = (current: JobLogEntry[], incoming: JobLogEntry[]): JobLogEntry[] => {
  if (incoming.length === 0) {
    return current.length > MAX_LOG_ENTRIES ? normalizeLogs(current) : current;
  }

  if (current.length === 0) {
    return normalizeLogs(incoming);
  }

  const maxBaseSize = Math.max(MAX_LOG_ENTRIES - incoming.length, 0);
  const needsTrim = current.length > maxBaseSize;
  const base = needsTrim ? current.slice(current.length - maxBaseSize) : current;

  const seen = new Set<number>();
  let hadDuplicate = needsTrim;
  base.forEach((entry) => {
    if (seen.has(entry.seq)) {
      hadDuplicate = true;
      return;
    }
    seen.add(entry.seq);
  });

  const additions: JobLogEntry[] = [];
  incoming.forEach((entry) => {
    if (seen.has(entry.seq)) {
      hadDuplicate = true;
      return;
    }
    seen.add(entry.seq);
    additions.push(entry);
  });

  if (!hadDuplicate && additions.length === incoming.length && base === current && base.length + additions.length <= MAX_LOG_ENTRIES) {
    return [...base, ...additions];
  }

  const next = [...base, ...additions];
  return next.length > MAX_LOG_ENTRIES || hadDuplicate ? normalizeLogs(next) : next;
};

const App = () => {
  const [actions, setActions] = useState<ActionMeta[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, ActionState>>({});
  const [selectedAction, setSelectedAction] = usePersistentState<string | null>('workflow:selectedAction', {
    defaultValue: null,
  });
  const [optionSelections, setOptionSelections] = usePersistentState<Record<string, string[]>>(
    'workflow:optionSelections',
    {
      defaultValue: {},
    },
  );
  const [loadingActions, setLoadingActions] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const [job, setJob, clearJob] = usePersistentState<JobSnapshot | null>('workflow:jobSnapshot', {
    defaultValue: null,
  });
  const [logs, setLogs, clearLogs] = usePersistentState<JobLogEntry[]>('workflow:jobLogs', {
    defaultValue: [],
    writeDelayMs: 250,
    reduceBeforePersist: normalizeLogs,
  });
  const [cursor, setCursor] = usePersistentState<number>('workflow:jobCursor', {
    defaultValue: 0,
  });
  const [jobError, setJobError] = useState<string | null>(null);
  const [terminating, setTerminating] = useState(false);

  const [stories, setStories] = useState<StorySummary[]>([]);
  const [ownerOptions, setOwnerOptions] = useState<OwnerOption[]>([]);
  const [quickOwnerGroups, setQuickOwnerGroups] = useState<StoryQuickOwnerAggregate[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [selectedOwners, setSelectedOwners] = usePersistentState<string[]>('workflow:selectedOwners', {
    defaultValue: [],
  });

  const cursorRef = useRef(0);
  const jobRef = useRef<JobSnapshot | null>(job);
  const pollDelayRef = useRef(LOG_POLL_BASE_INTERVAL_MS);

  const resetJobState = useCallback(
    (actionId?: string) => {
      clearJob();
      clearLogs();
      setCursor(0);
      cursorRef.current = 0;
      setTerminating(false);
      if (actionId) {
        setStatusMap((prev) => ({ ...prev, [actionId]: 'idle' }));
      }
    },
    [clearJob, clearLogs, setCursor, setStatusMap, setTerminating],
  );

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    jobRef.current = job;
  }, [job]);

  useEffect(() => {
    setLogs((prev) => normalizeLogs(prev));
  }, [setLogs]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await fetchActions(controller.signal);
        setActions(data);
        setOptionSelections((prev) => {
          const next: Record<string, string[]> = {};
          data.forEach((action) => {
            const optionIds = new Set(action.options.map((option) => option.id));
            const hadPrevious = Object.prototype.hasOwnProperty.call(prev, action.id);
            const previous = hadPrevious ? prev[action.id] ?? [] : [];
            const filtered = previous.filter((id) => optionIds.has(id));
            if (hadPrevious) {
              next[action.id] = filtered;
            } else {
              next[action.id] = action.options
                .filter((option) => option.defaultSelected)
                .map((option) => option.id);
            }
          });
          return next;
        });
        setStatusMap(
          data.reduce<Record<string, ActionState>>((acc, action) => {
            acc[action.id] = 'idle';
            return acc;
          }, {}),
        );
        setSelectedAction((prev) => {
          if (!prev) return prev;
          return data.some((action) => action.id === prev) ? prev : null;
        });
        const persistedJob = jobRef.current;
        if (persistedJob) {
          setStatusMap((prev) => ({
            ...prev,
            [persistedJob.actionId]: jobStatusToActionState(persistedJob.status),
          }));
        }
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
        const data = await fetchStories({ signal: controller.signal, quick: QUICK_OWNER_SHORTCUTS });
        setStories(data.stories);
        setOwnerOptions(data.owners);
        setQuickOwnerGroups(data.quickOwners);
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

  const canTerminate = useMemo(() => {
    if (!job) return false;
    if (terminating) return false;
    if (job.cancelRequested) return false;
    return job.status === 'pending' || job.status === 'running';
  }, [job, terminating]);

  const terminatePending = terminating || Boolean(job?.cancelRequested);

  const quickOwnerMatches = useMemo(() => {
    return quickOwnerGroups.reduce<Record<string, string[]>>((acc, group) => {
      acc[group.name] = group.owners;
      return acc;
    }, {});
  }, [quickOwnerGroups]);

  useEffect(() => {
    if (loadingStories) return;
    if (ownerOptions.length === 0) return;
    setSelectedOwners((prev) => {
      const validOwners = new Set(ownerOptions.map((option) => option.name));
      const filtered = prev.filter((owner) => validOwners.has(owner));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [loadingStories, ownerOptions, setSelectedOwners]);

  const filteredStories = useMemo(() => {
    const selectedOwnerSet = selectedOwners.length > 0 ? new Set(selectedOwners) : null;

    if (!selectedOwnerSet) return stories;

    return stories.filter((story) => {
      const owners =
        story.owners.length > 0
          ? story.owners
              .map((owner) => owner.trim())
              .filter((owner) => owner.length > 0)
          : ['未指派'];
      return owners.some((owner) => selectedOwnerSet.has(owner));
    });
  }, [stories, selectedOwners]);

  const selectedStoryIds = useMemo(() => filteredStories.map((story) => story.id), [filteredStories]);
  const hasSelectedOwners = selectedOwners.length > 0;
  const hasSelectableStories = selectedStoryIds.length > 0;
  const canExecuteActions = hasSelectedOwners && hasSelectableStories;
  const executeDisabledMessage = useMemo(() => {
    if (!hasSelectedOwners) {
      return '请选择需要处理的需求负责人后再执行命令。';
    }
    if (!hasSelectableStories) {
      return '当前筛选没有需求命中，无法执行命令。';
    }
    return null;
  }, [hasSelectedOwners, hasSelectableStories]);

  const quickOwnerOptions = useMemo<QuickOwnerOption[]>(() => {
    const selectedSet = new Set(selectedOwners);
    return quickOwnerGroups.map((group) => {
      const matches = quickOwnerMatches[group.name] ?? [];
      const active = matches.length > 0 ? matches.every((name) => selectedSet.has(name)) : false;
      const selectedCount = filteredStories.reduce((count, story) => {
        const normalizedOwners = story.owners.length > 0 ? story.owners : ['未指派'];
        return matches.some((name) => normalizedOwners.includes(name)) ? count + 1 : count;
      }, 0);
      return {
        name: group.name,
        count: group.count,
        active,
        selectedCount,
      };
    });
  }, [filteredStories, quickOwnerGroups, quickOwnerMatches, selectedOwners]);

  const toggleOwner = (owner: string) => {
    setSelectedOwners((prev) => {
      const exists = prev.includes(owner);
      if (exists) return prev.filter((item) => item !== owner);
      return [...prev, owner];
    });
  };

  const toggleQuickOwner = (quickName: string) => {
    const matches = quickOwnerMatches[quickName] ?? [];
    if (matches.length === 0) {
      return;
    }
    setSelectedOwners((prev) => {
      const prevSet = new Set(prev);
      const allSelected = matches.every((name) => prevSet.has(name));
      if (allSelected) {
        return prev.filter((name) => !matches.includes(name));
      }
      const nextSet = new Set(prev);
      matches.forEach((name) => nextSet.add(name));
      return Array.from(nextSet);
    });
  };

  const clearOwners = () => {
    setSelectedOwners([]);
  };

  const selectAllOwners = () => {
    setSelectedOwners(ownerOptions.map((option) => option.name));
  };

  const handleSelectAction = (action: ActionMeta) => {
    setSelectedAction(action.id);
  };

  const toggleActionOption = (actionId: string, optionId: string) => {
    setOptionSelections((prev) => {
      const current = prev[actionId] ?? [];
      const exists = current.includes(optionId);
      const next = exists ? current.filter((item) => item !== optionId) : [...current, optionId];
      return { ...prev, [actionId]: next };
    });
  };

  const resetStatusLater = (actionId: string) => {
    window.setTimeout(() => {
      setStatusMap((prev) => ({ ...prev, [actionId]: 'idle' }));
    }, 1600);
  };

  const handleExecute = async (action: ActionMeta) => {
    if (busy) return;
    if (!canExecuteActions) return;

    setSelectedAction(action.id);
    setJobError(null);
    setLogs([]);
    setCursor(0);
    cursorRef.current = 0;
    setTerminating(false);

    setStatusMap((prev) => ({ ...prev, [action.id]: 'running' }));

    const selectedOptionIds = new Set(optionSelections[action.id] ?? []);
    const optionArgs = action.options
      .filter((option) => selectedOptionIds.has(option.id))
      .flatMap((option) => option.args);
    const storyIdActions = new Set(['pull-to-notion', 'update-requirements', 'debug-notion']);
    const needsStoryIds = storyIdActions.has(action.id);
    const allowOwnerArgs = action.id !== 'debug-notion';
    const ownerArgs =
      allowOwnerArgs && selectedOwners.length > 0 && (!needsStoryIds || selectedStoryIds.length === 0)
        ? ['--owner', selectedOwners.join(',')]
        : [];
    const baseArgs = [...action.defaultArgs, ...optionArgs, ...ownerArgs];
    const jobOptions =
      needsStoryIds && selectedStoryIds.length > 0 ? { args: baseArgs, storyIds: selectedStoryIds } : { args: baseArgs };

    try {
      const response = await createJob(action.id, jobOptions);
      const { logs: initialLogs, nextCursor, ...meta } = response;
      setJob(meta);
      setLogs(normalizeLogs(initialLogs));
      setCursor(nextCursor);
      cursorRef.current = nextCursor;
    } catch (error) {
      const message = error instanceof Error ? error.message : '触发操作失败';
      setJobError(message);
      setStatusMap((prev) => ({ ...prev, [action.id]: 'error' }));
      resetStatusLater(action.id);
    }
  };

  const handleTerminate = async () => {
    if (!job) return;
    if (terminating) return;
    if (job.cancelRequested) return;
    if (job.status === 'success' || job.status === 'error') return;

    setTerminating(true);
    try {
      const response = await terminateJob(job.id, cursorRef.current);
      const { logs: nextLogs, nextCursor, ...meta } = response;
      setJob(meta);
      setLogs((prev) => appendLogs(prev, nextLogs));
      setCursor(nextCursor);
      cursorRef.current = nextCursor;
      setJobError(null);
    } catch (error) {
      if (error instanceof RequestError && error.status === 404) {
        resetJobState(job.actionId);
        setJobError('命令已不存在，已清理本地状态。');
      } else {
        const message = error instanceof Error ? error.message : '终止命令失败';
        setJobError(message);
      }
    } finally {
      setTerminating(false);
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
    if (!job) {
      setTerminating(false);
      return;
    }
    if (job.status === 'success' || job.status === 'error') {
      setTerminating(false);
    }
  }, [job]);

  useEffect(() => {
    if (!job) return;
    if (job.status === 'success' || job.status === 'error') return;

    let cancelled = false;
    let timer: number | null = null;
    let controller: AbortController | null = null;

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = pollDelayRef.current;
      timer = window.setTimeout(poll, delay);
    };

    const poll = async () => {
      try {
        controller = new AbortController();
        const response = await fetchJob(job.id, cursorRef.current, controller.signal);
        if (cancelled) return;

        const { logs: nextLogs, nextCursor, ...meta } = response;
        setJob((prev) => (prev ? { ...prev, ...meta } : meta));

        if (nextLogs.length > 0) {
          setLogs((prev) => appendLogs(prev, nextLogs));
          pollDelayRef.current = LOG_POLL_BASE_INTERVAL_MS;
        } else {
          pollDelayRef.current = Math.min(
            LOG_POLL_MAX_INTERVAL_MS,
            pollDelayRef.current + LOG_POLL_INCREMENT_MS,
          );
        }

        setCursor(nextCursor);
        cursorRef.current = nextCursor;

        if (meta.status === 'success' || meta.status === 'error') {
          cancelled = true;
          controller.abort();
          return;
        }

        scheduleNext();
      } catch (error) {
        if (cancelled) return;
        if (controller && controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (error instanceof RequestError && error.status === 404) {
          resetJobState(job.actionId);
          setJobError('未找到命令，可能已完成或被清理。');
          cancelled = true;
          if (controller) controller.abort();
          return;
        }
        const message = error instanceof Error ? error.message : '轮询失败';
        setJobError(message);
        cancelled = true;
        if (controller) controller.abort();
      }
      controller = null;
    };

    pollDelayRef.current = LOG_POLL_BASE_INTERVAL_MS;
    poll();

    return () => {
      cancelled = true;
      if (controller) controller.abort();
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [job?.id, job?.status]);

  const selectedActionMeta = useMemo(
    () => actions.find((item) => item.id === selectedAction) ?? null,
    [actions, selectedAction],
  );

  const selectedOptionIds = selectedActionMeta ? optionSelections[selectedActionMeta.id] ?? [] : [];

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
                onToggleQuickOwner={toggleQuickOwner}
                onClearOwners={clearOwners}
                onSelectAll={selectAllOwners}
                quickOwners={quickOwnerOptions}
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
                选定下方操作后可先配置参数，再执行脚本；右侧实时展示执行日志与状态。
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
                        onSelect={handleSelectAction}
                        selected={selectedAction === action.id}
                        disabled={!hasSelectableStories}
                      />
                    ))}
                  </div>
                )}
              </div>

              {selectedActionMeta ? (
                <ActionOptionsPanel
                  action={selectedActionMeta}
                  selectedOptionIds={selectedOptionIds}
                  onToggleOption={(optionId) => toggleActionOption(selectedActionMeta.id, optionId)}
                  onExecute={() => handleExecute(selectedActionMeta)}
                  busy={busy}
                  executeDisabled={!canExecuteActions}
                  disabledMessage={executeDisabledMessage}
                />
              ) : null}

              <CommandConsole
                job={job}
                logs={logs}
                error={jobError}
                onTerminate={handleTerminate}
                canTerminate={canTerminate}
                terminatePending={terminatePending}
              />

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

import { FC, useEffect, useMemo, useRef, useState } from 'react';

import type { JobLogEntry, JobSnapshot, JobStatus } from '../types';

type Props = {
  job: JobSnapshot | null;
  logs: JobLogEntry[];
  error: string | null;
  onTerminate: () => void;
  canTerminate: boolean;
  terminatePending: boolean;
};

const STATUS_META: Record<JobStatus | 'idle', { label: string; className: string }> = {
  idle: { label: '待命', className: 'bg-panel-subtle/20 text-panel-subtle border border-panel-subtle/40' },
  pending: { label: '准备中', className: 'bg-amber-400/20 text-amber-200 border border-amber-300/40' },
  running: { label: '运行中', className: 'bg-cyan-400/20 text-cyan-200 border border-cyan-300/40' },
  success: { label: '完成', className: 'bg-emerald-400/20 text-emerald-200 border border-emerald-300/40' },
  error: { label: '失败', className: 'bg-rose-500/20 text-rose-200 border border-rose-400/40' },
};

const streamClassName = (stream: JobLogEntry['stream']): string => {
  switch (stream) {
    case 'stderr':
      return 'text-rose-300';
    case 'system':
      return 'text-sky-300';
    default:
      return 'text-neutral-100';
  }
};

const formatTime = (value: string): string => {
  const ts = new Date(value);
  if (Number.isNaN(ts.getTime())) {
    return '--:--:--';
  }
  return ts.toLocaleTimeString('zh-CN', { hour12: false });
};

const LOG_CHUNK_SIZE = 200;
const DEFAULT_VISIBLE_CHUNKS = 2;
const CHUNK_INCREMENT = 2;
const BOTTOM_STICKY_THRESHOLD = 32;

const CommandConsole: FC<Props> = ({ job, logs, error, onTerminate, canTerminate, terminatePending }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const [visibleChunks, setVisibleChunks] = useState(DEFAULT_VISIBLE_CHUNKS);

  const meta = useMemo(() => {
    if (!job) {
      return STATUS_META.idle;
    }
    return STATUS_META[job.status];
  }, [job]);

  const totalChunks = Math.max(1, Math.ceil(logs.length / LOG_CHUNK_SIZE));
  const visibleCount = useMemo(
    () => Math.min(logs.length, visibleChunks * LOG_CHUNK_SIZE),
    [logs.length, visibleChunks],
  );
  const displayLogs = useMemo(() => {
    if (visibleCount === logs.length) return logs;
    return logs.slice(logs.length - visibleCount);
  }, [logs, visibleCount]);

  const isActive = job?.status === 'pending' || job?.status === 'running';
  const showTerminate = Boolean(job && (isActive || job.cancelRequested));
  const terminateDisabled = !canTerminate || terminatePending;
  const canLoadMore = displayLogs.length < logs.length;

  useEffect(() => {
    if (logs.length === 0) {
      setVisibleChunks(DEFAULT_VISIBLE_CHUNKS);
      stickToBottomRef.current = true;
      return;
    }
    const nextMax = Math.max(DEFAULT_VISIBLE_CHUNKS, totalChunks);
    setVisibleChunks((prev) => Math.min(prev, nextMax));
  }, [logs.length, totalChunks]);

  useEffect(() => {
    setVisibleChunks(DEFAULT_VISIBLE_CHUNKS);
    stickToBottomRef.current = true;
  }, [job?.id]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    if (!stickToBottomRef.current) return;
    node.scrollTop = node.scrollHeight;
  }, [displayLogs, job?.status]);

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    const distanceToBottom = node.scrollHeight - node.clientHeight - node.scrollTop;
    stickToBottomRef.current = distanceToBottom < BOTTOM_STICKY_THRESHOLD;
  };

  const handleLoadMore = () => {
    setVisibleChunks((prev) => Math.min(prev + CHUNK_INCREMENT, totalChunks));
  };

  return (
    <div className="rounded-3xl pixel-frame bg-panel-base/75 backdrop-blur px-6 py-6 space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-pixel text-[11px] uppercase tracking-[0.35em] text-panel-subtle">console</p>
          <h3 className="mt-3 text-lg font-semibold text-white">
            {job ? job.title : '等待执行'}
          </h3>
          <p className="mt-2 text-xs text-panel-subtle leading-relaxed">
            {job ? (
              <span className="block max-w-full whitespace-pre-wrap break-all pr-1">{job.displayCommand}</span>
            ) : (
              '执行操作以查看实时日志输出。'
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 ">
          <span
            className={`px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.3em] ${meta.className} ${
              isActive ? 'animate-pulse' : ''
            }`}
          >
            {meta.label}
          </span>
          {showTerminate ? (
            <button
              type="button"
              onClick={onTerminate}
              disabled={terminateDisabled}
              className={`pixel-button rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                terminateDisabled
                  ? 'bg-rose-500/25 text-rose-200/70 cursor-not-allowed'
                  : 'bg-rose-500/80 text-white hover:bg-rose-500'
              }`}
            >
              {terminatePending ? '终止中…' : '终止执行'}
            </button>
          ) : null}
        </div>
      </header>

      <div className="rounded-2xl bg-black/80 border border-panel-card/40">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-72 overflow-y-auto px-5 py-4 space-y-2 font-mono text-[12px] text-neutral-100"
        >
          {canLoadMore ? (
            <button
              type="button"
              onClick={handleLoadMore}
              className="w-full rounded-lg border border-panel-subtle/30 bg-panel-base/40 px-3 py-1 text-xs text-panel-subtle hover:text-panel-subtle/80 transition-colors"
            >
              加载更多日志（剩余 {logs.length - displayLogs.length} 条）
            </button>
          ) : null}

          {displayLogs.length === 0 ? (
            <p className="text-panel-subtle/80">等待输出…</p>
          ) : (
            displayLogs.map((log) => (
              <div key={log.seq} className="flex gap-4">
                <span className="w-20 shrink-0 text-panel-subtle/60">{formatTime(log.timestamp)}</span>
                <span className="w-16 shrink-0 uppercase tracking-[0.2em] text-panel-subtle/70">
                  {log.stream}
                </span>
                <span className={`whitespace-pre-wrap break-words ${streamClassName(log.stream)}`}>
                  {log.text || ' '}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {job ? (
        <div className="grid gap-2 text-xs text-panel-subtle/80 sm:grid-cols-2">
          <p>开始：{job.startedAt ? formatTime(job.startedAt) : '—'}</p>
          <p>结束：{job.finishedAt ? formatTime(job.finishedAt) : '—'}</p>
          <p className="sm:col-span-2">退出码：{job.exitCode ?? '—'}</p>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
};

export default CommandConsole;

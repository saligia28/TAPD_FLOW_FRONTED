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
  idle: { label: 'STANDBY', className: 'text-hacker-text-dim border-hacker-border' },
  pending: { label: 'QUEUED', className: 'text-amber-400 border-amber-400 animate-pulse' },
  running: { label: 'EXECUTING', className: 'text-hacker-primary border-hacker-primary animate-pulse' },
  success: { label: 'SUCCESS', className: 'text-hacker-primary border-hacker-primary' },
  error: { label: 'FAILURE', className: 'text-hacker-alert border-hacker-alert' },
};

const streamClassName = (stream: JobLogEntry['stream']): string => {
  switch (stream) {
    case 'stderr':
      return 'text-hacker-alert';
    case 'system':
      return 'text-hacker-secondary';
    default:
      return 'text-hacker-text-main';
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
    <div className="hacker-border bg-black/90 p-4 space-y-4 font-mono text-xs relative overflow-hidden">
      {/* Scanline overlay for terminal specifically */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-hacker-primary/5 opacity-10"></div>

      <header className="flex items-start justify-between gap-4 border-b border-hacker-border/50 pb-3">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-hacker-primary mb-1">&gt; TERMINAL_OUTPUT</p>
          <h3 className="text-sm font-bold text-white">
            {job ? `EXEC: ${job.title}` : 'AWAITING_COMMAND'}
          </h3>
          <p className="mt-1 text-hacker-text-dim font-mono">
            {job ? (
              <span className="block max-w-full whitespace-pre-wrap break-all text-hacker-text-code">$ {job.displayCommand}</span>
            ) : (
              '// System ready. Waiting for input...'
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`px-2 py-0.5 border text-[10px] uppercase tracking-wider ${meta.className}`}
          >
            [{meta.label}]
          </span>
          {showTerminate ? (
            <button
              type="button"
              onClick={onTerminate}
              disabled={terminateDisabled}
              className={`px-3 py-1 text-[10px] uppercase tracking-wider border transition-colors ${terminateDisabled
                  ? 'border-hacker-alert/30 text-hacker-alert/50 cursor-not-allowed'
                  : 'border-hacker-alert text-hacker-alert hover:bg-hacker-alert hover:text-black font-bold'
                }`}
            >
              {terminatePending ? '[KILLING_PROCESS...]' : '[ABORT]'}
            </button>
          ) : null}
        </div>
      </header>

      <div className="relative min-h-[200px]">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-72 overflow-y-auto pr-2 space-y-1 font-mono text-[11px] custom-scrollbar"
        >
          {canLoadMore ? (
            <button
              type="button"
              onClick={handleLoadMore}
              className="w-full border border-dashed border-hacker-border/50 text-hacker-text-dim hover:text-hacker-primary hover:border-hacker-primary/50 py-1 mb-2 transition-colors"
            >
              [LOAD_PREVIOUS_LOGS] ({logs.length - displayLogs.length} hidden)
            </button>
          ) : null}

          {displayLogs.length === 0 ? (
            <div className="text-hacker-text-dim/50 italic">
              <span className="animate-pulse">_</span>
            </div>
          ) : (
            displayLogs.map((log) => (
              <div key={log.seq} className="flex gap-3 hover:bg-white/5 transition-colors">
                <span className="w-16 shrink-0 text-hacker-text-dim/50 select-none">[{formatTime(log.timestamp)}]</span>
                <span className="w-12 shrink-0 uppercase text-hacker-text-dim/60 select-none">
                  {log.stream}
                </span>
                <span className={`whitespace-pre-wrap break-all flex-1 ${streamClassName(log.stream)}`}>
                  {log.text || ' '}
                </span>
              </div>
            ))
          )}
          {isActive && (
            <div className="animate-pulse text-hacker-primary font-bold">_</div>
          )}
        </div>
      </div>

      {job ? (
        <div className="grid gap-2 text-[10px] text-hacker-text-dim border-t border-hacker-border/50 pt-2 sm:grid-cols-2 font-mono">
          <p>START: {job.startedAt ? formatTime(job.startedAt) : 'PENDING'}</p>
          <p>END: {job.finishedAt ? formatTime(job.finishedAt) : 'RUNNING'}</p>
          <p className="sm:col-span-2">EXIT_CODE: {job.exitCode ?? 'NULL'}</p>
        </div>
      ) : null}

      {error ? <p className="text-xs text-hacker-alert font-bold border border-hacker-alert/50 p-2">[SYSTEM_ERROR] {error}</p> : null}
    </div>
  );
};

export default CommandConsole;

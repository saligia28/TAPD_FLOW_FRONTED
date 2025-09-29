import { FC, useEffect, useMemo, useRef } from 'react';

import type { JobLogEntry, JobSnapshot, JobStatus } from '../types';

type Props = {
  job: JobSnapshot | null;
  logs: JobLogEntry[];
  error: string | null;
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

const CommandConsole: FC<Props> = ({ job, logs, error }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [logs, job?.status]);

  const meta = useMemo(() => {
    if (!job) {
      return STATUS_META.idle;
    }
    return STATUS_META[job.status];
  }, [job]);

  const isActive = job?.status === 'pending' || job?.status === 'running';

  return (
    <div className="rounded-3xl pixel-frame bg-panel-base/75 backdrop-blur px-6 py-6 space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-pixel text-[11px] uppercase tracking-[0.35em] text-panel-subtle">console</p>
          <h3 className="mt-3 text-lg font-semibold text-white">
            {job ? job.title : '等待执行'}
          </h3>
          <p className="mt-2 text-xs text-panel-subtle leading-relaxed">
            {job ? (
              <span className="block max-w-full whitespace-pre-wrap break-all pr-1">{job.displayCommand}</span>
            ) : (
              '选择左侧的操作以查看实时日志输出。'
            )}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.3em] ${meta.className} ${
            isActive ? 'animate-pulse' : ''
          }`}
        >
          {meta.label}
        </span>
      </header>

      <div className="rounded-2xl bg-black/80 border border-panel-card/40">
        <div
          ref={scrollRef}
          className="h-72 overflow-y-auto px-5 py-4 space-y-2 font-mono text-[12px] text-neutral-100"
        >
          {logs.length === 0 ? (
            <p className="text-panel-subtle/80">等待输出…</p>
          ) : (
            logs.map((log) => (
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

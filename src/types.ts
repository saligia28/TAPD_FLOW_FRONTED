export type JobStatus = 'pending' | 'running' | 'success' | 'error';

export type ActionOptionMeta = {
  id: string;
  label: string;
  args: string[];
  description: string;
  defaultSelected: boolean;
};

export type ActionMeta = {
  id: string;
  title: string;
  description: string;
  hint?: string | null;
  defaultArgs: string[];
  commandPreview: string;
  options: ActionOptionMeta[];
};

export type JobLogEntry = {
  seq: number;
  timestamp: string;
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
};

export type JobSnapshot = {
  id: string;
  actionId: string;
  title: string;
  status: JobStatus;
  command: string[];
  displayCommand: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  cancelRequested: boolean;
};

export type JobPollResponse = JobSnapshot & {
  logs: JobLogEntry[];
  nextCursor: number;
};

export type StorySummary = {
  id: string;
  title: string;
  status?: string | null;
  owners: string[];
  frontend?: string | null;
  iteration?: string | null;
  updatedAt?: string | null;
  url?: string | null;
};

export type StoryOwnerAggregate = {
  name: string;
  count: number;
};

export type StoryQuickOwnerAggregate = {
  name: string;
  owners: string[];
  count: number;
};

export type StoryCollection = {
  stories: StorySummary[];
  total: number;
  owners: StoryOwnerAggregate[];
  quickOwners: StoryQuickOwnerAggregate[];
  truncated: boolean;
};

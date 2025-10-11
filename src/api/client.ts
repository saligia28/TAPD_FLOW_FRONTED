import type { ActionMeta, JobPollResponse, StoryCollection } from '../types';

const DEFAULT_BASE = 'http://127.0.0.1:8000';

const API_BASE = (import.meta.env.VITE_API_BASE ?? DEFAULT_BASE).replace(/\/$/, '');

type RequestOptions = RequestInit & { signal?: AbortSignal };

export class RequestError extends Error {
  status: number;
  responseBody: string;

  constructor(status: number, body: string) {
    super(body || `Request failed with status ${status}`);
    this.name = 'RequestError';
    this.status = status;
    this.responseBody = body;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new RequestError(response.status, text);
  }

  return (await response.json()) as T;
}

export async function fetchActions(signal?: AbortSignal): Promise<ActionMeta[]> {
  return request<ActionMeta[]>('/api/actions', { method: 'GET', signal });
}

type CreateJobOptions = {
  args?: string[];
  extraArgs?: string[];
  storyIds?: string[];
};

export async function createJob(actionId: string, options: CreateJobOptions = {}): Promise<JobPollResponse> {
  const payload: Record<string, unknown> = { actionId };

  if (options.args !== undefined) {
    payload.args = options.args;
  }

  if (options.extraArgs !== undefined) {
    payload.extraArgs = options.extraArgs;
  }

  if (options.storyIds !== undefined) {
    payload.storyIds = options.storyIds;
  }

  return request<JobPollResponse>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchJob(jobId: string, cursor = 0, signal?: AbortSignal): Promise<JobPollResponse> {
  const search = new URLSearchParams({ cursor: String(cursor) });
  return request<JobPollResponse>(`/api/jobs/${jobId}?${search.toString()}`, {
    method: 'GET',
    signal,
  });
}

type FetchStoriesOptions = {
  signal?: AbortSignal;
  quick?: readonly string[];
  limit?: number;
};

export async function fetchStories(options: FetchStoriesOptions = {}): Promise<StoryCollection> {
  const { signal, quick, limit } = options;
  const search = new URLSearchParams();
  if (typeof limit === 'number' && limit > 0) {
    search.set('limit', String(limit));
  }
  if (quick) {
    quick.forEach((item) => {
      const value = typeof item === 'string' ? item.trim() : '';
      if (value) {
        search.append('quick', value);
      }
    });
  }
  const query = search.toString();
  const path = query ? `/api/stories?${query}` : '/api/stories';
  return request<StoryCollection>(path, { method: 'GET', signal });
}

export async function terminateJob(jobId: string, cursor = 0): Promise<JobPollResponse> {
  const search = new URLSearchParams({ cursor: String(cursor) });
  return request<JobPollResponse>(`/api/jobs/${jobId}/terminate?${search.toString()}`, {
    method: 'POST',
  });
}

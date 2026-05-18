type LoadableQuery = {
  data?: unknown;
  error?: unknown;
  fetchStatus?: 'fetching' | 'idle' | 'paused';
  isError?: boolean;
  isFetching?: boolean;
  isLoading?: boolean;
  isPending?: boolean;
};

export function shouldShowInitialLoader(query: LoadableQuery): boolean {
  if (query.data !== undefined) return false;
  if (query.isError || query.error) return false;
  if (query.fetchStatus === 'idle') return false;
  return Boolean(query.isLoading || query.isPending || query.isFetching);
}

export function shouldShowAnyInitialLoader(...queries: LoadableQuery[]): boolean {
  return queries.some((query) => shouldShowInitialLoader(query));
}

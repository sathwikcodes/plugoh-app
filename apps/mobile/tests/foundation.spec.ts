import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/error';
import { resolveGateStatus } from '@/lib/auth/gate-status';
import { influencerBasicsSchema } from '@/lib/forms/onboarding';
import { invalidateQueryKeys, type QueryInvalidator } from '@/lib/query/invalidation';
import { shouldShowInitialLoader } from '@/lib/query/loading';

describe('mobile foundation', () => {
  it('maps gate statuses deterministically', () => {
    expect(
      resolveGateStatus({
        initialized: false,
        hasSession: false,
        bootstrapLoading: false,
        bootstrapError: false,
      }),
    ).toBe('loading');
    expect(
      resolveGateStatus({
        initialized: true,
        hasSession: false,
        bootstrapLoading: false,
        bootstrapError: false,
      }),
    ).toBe('unauthenticated');
    expect(
      resolveGateStatus({
        initialized: true,
        hasSession: true,
        bootstrapLoading: false,
        bootstrapError: false,
        onboardingStage: 'ready',
      }),
    ).toBe('ready');
  });

  it('validates onboarding basics payload', () => {
    expect(() =>
      influencerBasicsSchema.parse({
        full_name: 'Creator Name',
        phone: '+919999999999',
        location: 'Hyderabad',
      }),
    ).not.toThrow();
    expect(() =>
      influencerBasicsSchema.parse({ full_name: '', phone: '', location: '' }),
    ).toThrow();
  });

  it('invalidates all requested query keys', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient: QueryInvalidator = { invalidateQueries };
    await invalidateQueryKeys(queryClient, [['bootstrap'], ['campaigns']]);
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ['bootstrap'] });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ['campaigns'] });
  });

  it('exposes user-safe api error messaging', () => {
    const error = new ApiError(
      'Request timed out for /me/bootstrap',
      'TIMEOUT',
      408,
      undefined,
      'Request timed out. Please try again.',
    );
    expect(error.code).toBe('TIMEOUT');
    expect(error.userMessage).toBe('Request timed out. Please try again.');
  });

  it('shows field loaders only while the first query result is in flight', () => {
    expect(
      shouldShowInitialLoader({
        data: undefined,
        fetchStatus: 'fetching',
        isPending: true,
      }),
    ).toBe(true);

    expect(
      shouldShowInitialLoader({
        data: { total: 0 },
        fetchStatus: 'fetching',
        isFetching: true,
      }),
    ).toBe(false);

    expect(
      shouldShowInitialLoader({
        data: null,
        fetchStatus: 'idle',
        isPending: false,
      }),
    ).toBe(false);

    expect(
      shouldShowInitialLoader({
        data: undefined,
        fetchStatus: 'idle',
        isPending: true,
      }),
    ).toBe(false);

    expect(
      shouldShowInitialLoader({
        data: undefined,
        fetchStatus: 'fetching',
        isError: true,
        isPending: true,
      }),
    ).toBe(false);
  });
});

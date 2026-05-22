import { beforeEach, describe, expect, it, vi } from 'vitest';

const googleMock = vi.hoisted(() => ({
  openAuthSessionAsync: vi.fn(),
  createURL: vi.fn(),
}));

const supabaseAuthMock = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  setSession: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  signInWithOtp: vi.fn(),
}));

vi.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: vi.fn(),
  openAuthSessionAsync: googleMock.openAuthSessionAsync,
}));

vi.mock('expo-linking', () => ({
  createURL: googleMock.createURL,
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: supabaseAuthMock,
  },
}));

describe('mobile auth helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    googleMock.createURL.mockReturnValue('plugoh://auth/callback');
  });

  it('starts Supabase Google OAuth and persists a returned token session', async () => {
    const { signInWithSupabaseGoogle } = await import('@/lib/auth/google');
    supabaseAuthMock.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://project.supabase.co/auth/v1/authorize?provider=google' },
      error: null,
    });
    googleMock.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'plugoh://auth/callback#access_token=access-token&refresh_token=refresh-token',
    });
    supabaseAuthMock.setSession.mockResolvedValue({
      data: { session: { access_token: 'supabase-token' } },
      error: null,
    });

    await expect(signInWithSupabaseGoogle()).resolves.toEqual({ access_token: 'supabase-token' });

    expect(supabaseAuthMock.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'plugoh://auth/callback',
        skipBrowserRedirect: true,
      },
    });
    expect(googleMock.openAuthSessionAsync).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/authorize?provider=google',
      'plugoh://auth/callback',
    );
    expect(supabaseAuthMock.setSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
  });

  it('exchanges a returned OAuth code when Supabase uses PKCE', async () => {
    const { signInWithSupabaseGoogle } = await import('@/lib/auth/google');
    supabaseAuthMock.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://project.supabase.co/auth/v1/authorize?provider=google' },
      error: null,
    });
    googleMock.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'plugoh://auth/callback?code=oauth-code',
    });
    supabaseAuthMock.exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: 'supabase-token' } },
      error: null,
    });

    await expect(signInWithSupabaseGoogle()).resolves.toEqual({ access_token: 'supabase-token' });
    expect(supabaseAuthMock.exchangeCodeForSession).toHaveBeenCalledWith('oauth-code');
  });

  it('maps Google cancellation to a user-safe error', async () => {
    const { signInWithSupabaseGoogle } = await import('@/lib/auth/google');
    supabaseAuthMock.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://project.supabase.co/auth/v1/authorize?provider=google' },
      error: null,
    });
    googleMock.openAuthSessionAsync.mockResolvedValue({ type: 'cancel' });

    await expect(signInWithSupabaseGoogle()).rejects.toMatchObject({ code: 'cancelled' });
    expect(supabaseAuthMock.setSession).not.toHaveBeenCalled();
  });

  it('rejects OAuth callbacks that do not contain a session payload', async () => {
    const { signInWithSupabaseGoogle } = await import('@/lib/auth/google');
    supabaseAuthMock.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://project.supabase.co/auth/v1/authorize?provider=google' },
      error: null,
    });
    googleMock.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'plugoh://auth/callback',
    });

    await expect(signInWithSupabaseGoogle()).rejects.toMatchObject({ code: 'missing_session' });
  });

  it('maps provider failures without leaking raw OAuth errors', async () => {
    const { signInWithSupabaseGoogle, userMessageForGoogleAuth } =
      await import('@/lib/auth/google');
    supabaseAuthMock.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://project.supabase.co/auth/v1/authorize?provider=google' },
      error: null,
    });
    googleMock.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'plugoh://auth/callback?error=access_denied',
    });

    try {
      await signInWithSupabaseGoogle();
      throw new Error('Expected Google sign-in to fail');
    } catch (error) {
      expect(error).toMatchObject({ code: 'provider_error' });
      expect(userMessageForGoogleAuth(error)).toBe(
        'Google sign-in was declined by the provider. Please try again.',
      );
    }
  });

  it('normalizes email and sends OTP with user creation enabled', async () => {
    const { sendEmailOtp } = await import('@/lib/auth/otp');
    supabaseAuthMock.signInWithOtp.mockResolvedValue({ data: {}, error: null });

    await expect(sendEmailOtp('  USER@Example.COM ')).resolves.toBe('user@example.com');
    expect(supabaseAuthMock.signInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: { shouldCreateUser: true },
    });
  });

  it('surfaces OTP resend provider errors to the caller', async () => {
    const { sendEmailOtp } = await import('@/lib/auth/otp');
    supabaseAuthMock.signInWithOtp.mockResolvedValue({
      data: null,
      error: new Error('Too many requests'),
    });

    await expect(sendEmailOtp('user@example.com')).rejects.toThrow('Too many requests');
  });
});

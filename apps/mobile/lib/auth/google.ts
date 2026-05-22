import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase/client';

void WebBrowser.maybeCompleteAuthSession();

export type GoogleAuthFailureCode =
  | 'cancelled'
  | 'missing_oauth_url'
  | 'missing_session'
  | 'provider_error'
  | 'supabase_error';

export class GoogleAuthError extends Error {
  code: GoogleAuthFailureCode;

  constructor(code: GoogleAuthFailureCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'GoogleAuthError';
    this.code = code;
    this.cause = cause;
  }
}

type OAuthResult =
  | { type: 'success'; url: string }
  | { type: 'cancel' | 'dismiss' | 'locked' }
  | { type: string; url?: string };

type GoogleOAuthDeps = {
  signInWithOAuth: typeof supabase.auth.signInWithOAuth;
  setSession: typeof supabase.auth.setSession;
  exchangeCodeForSession: typeof supabase.auth.exchangeCodeForSession;
  openAuthSessionAsync: typeof WebBrowser.openAuthSessionAsync;
  createURL: typeof Linking.createURL;
};

function getQueryParams(url: string) {
  const [, queryPart = ''] = url.split('?');
  const [query = '', hash = ''] = queryPart.split('#');
  const hashParams = url.includes('#') ? url.split('#')[1] : hash;
  return new URLSearchParams([query, hashParams].filter(Boolean).join('&'));
}

async function createSessionFromOAuthUrl(
  url: string,
  deps: Pick<GoogleOAuthDeps, 'setSession' | 'exchangeCodeForSession'>,
): Promise<Session> {
  const params = getQueryParams(url);
  const errorCode = params.get('error_code') ?? params.get('error');
  if (errorCode) {
    throw new GoogleAuthError('provider_error', errorCode);
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { data, error } = await deps.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      throw new GoogleAuthError('supabase_error', error.message, error);
    }
    if (!data.session) {
      throw new GoogleAuthError('missing_session', 'Google sign-in finished without a session.');
    }
    return data.session;
  }

  const code = params.get('code');
  if (code) {
    const { data, error } = await deps.exchangeCodeForSession(code);
    if (error) {
      throw new GoogleAuthError('supabase_error', error.message, error);
    }
    if (!data.session) {
      throw new GoogleAuthError('missing_session', 'Google sign-in finished without a session.');
    }
    return data.session;
  }

  throw new GoogleAuthError('missing_session', 'Google sign-in finished without a session.');
}

export async function signInWithSupabaseGoogle(
  deps: GoogleOAuthDeps = {
    signInWithOAuth: supabase.auth.signInWithOAuth.bind(supabase.auth),
    setSession: supabase.auth.setSession.bind(supabase.auth),
    exchangeCodeForSession: supabase.auth.exchangeCodeForSession.bind(supabase.auth),
    openAuthSessionAsync: WebBrowser.openAuthSessionAsync,
    createURL: Linking.createURL,
  },
) {
  const redirectTo = deps.createURL('auth/callback');
  const { data, error } = await deps.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw new GoogleAuthError('supabase_error', error.message, error);
  }
  if (!data.url) {
    throw new GoogleAuthError('missing_oauth_url', 'Google sign-in could not be started.');
  }

  const result = (await deps.openAuthSessionAsync(data.url, redirectTo)) as OAuthResult;
  if (result.type !== 'success' || !result.url) {
    throw new GoogleAuthError('cancelled', 'Google sign-in was cancelled.');
  }

  return createSessionFromOAuthUrl(result.url, deps);
}

export function userMessageForGoogleAuth(error: unknown) {
  if (error instanceof GoogleAuthError) {
    switch (error.code) {
      case 'cancelled':
        return 'Google sign-in was cancelled.';
      case 'missing_oauth_url':
        return 'Google sign-in could not be started. Check the Google provider in Supabase.';
      case 'missing_session':
        return 'Google sign-in finished, but no session was returned. Please try again.';
      case 'provider_error':
        return 'Google sign-in was declined by the provider. Please try again.';
      case 'supabase_error':
        return error.message || 'Supabase could not complete Google sign-in.';
    }
  }
  return 'Google sign-in is unavailable right now. Please try again.';
}

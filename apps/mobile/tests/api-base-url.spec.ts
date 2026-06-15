import { describe, expect, it } from 'vitest';
import { extractDevMachineHost, resolveApiBaseUrl } from '@/lib/api/resolve-api-base-url';

describe('resolveApiBaseUrl', () => {
  it('keeps production URLs unchanged', () => {
    expect(
      resolveApiBaseUrl('https://api.plugoh.app', { dev: false, devMachineHost: '192.168.1.10' }),
    ).toBe('https://api.plugoh.app');
  });

  it('replaces localhost with the Metro host in dev', () => {
    expect(
      resolveApiBaseUrl('http://localhost:4000', {
        dev: true,
        devMachineHost: '192.168.1.10',
      }),
    ).toBe('http://192.168.1.10:4000');
  });

  it('leaves localhost when no dev host is available', () => {
    expect(resolveApiBaseUrl('http://localhost:4000', { dev: true, devMachineHost: null })).toBe(
      'http://localhost:4000',
    );
  });

  it('does not override an explicit LAN URL', () => {
    expect(
      resolveApiBaseUrl('http://192.168.1.20:4000', {
        dev: true,
        devMachineHost: '192.168.1.10',
      }),
    ).toBe('http://192.168.1.20:4000');
  });
});

describe('extractDevMachineHost', () => {
  it('reads hostUri from expo config', () => {
    expect(
      extractDevMachineHost({
        expoConfig: { hostUri: '192.168.1.44:8081' },
        expoGoConfig: null,
        linkingUri: '',
        experienceUrl: '',
      }),
    ).toBe('192.168.1.44');
  });

  it('reads nested Metro URL from dev-client linkingUri', () => {
    expect(
      extractDevMachineHost({
        expoConfig: null,
        expoGoConfig: null,
        linkingUri: 'exp+plugoh://expo-development-client/?url=http%3A%2F%2F192.168.1.55%3A8081',
        experienceUrl: '',
      }),
    ).toBe('192.168.1.55');
  });
});

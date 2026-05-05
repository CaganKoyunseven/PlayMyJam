// tests/lib/admin-auth.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildAdminToken, isAdminAuthed } from '@/lib/admin-auth';

// Mock next/headers so cookies() works in Node
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';

describe('buildAdminToken', () => {
  it('returns a 64-char hex string', () => {
    const token = buildAdminToken('admin', 'secret');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic — same inputs produce same output', () => {
    expect(buildAdminToken('admin', 'pass')).toBe(buildAdminToken('admin', 'pass'));
  });

  it('changes with different username', () => {
    expect(buildAdminToken('admin', 'pass')).not.toBe(buildAdminToken('other', 'pass'));
  });

  it('changes with different password', () => {
    expect(buildAdminToken('admin', 'pass1')).not.toBe(buildAdminToken('admin', 'pass2'));
  });
});

describe('isAdminAuthed', () => {
  beforeEach(() => {
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'secret';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
  });

  it('returns false when env vars are missing', async () => {
    delete process.env.ADMIN_USERNAME;
    expect(await isAdminAuthed()).toBe(false);
  });

  it('returns false when cookie is absent', async () => {
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) } as never);
    expect(await isAdminAuthed()).toBe(false);
  });

  it('returns false when cookie value is wrong', async () => {
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'wrong' }) } as never);
    expect(await isAdminAuthed()).toBe(false);
  });

  it('returns true when cookie matches HMAC of credentials', async () => {
    const correctToken = buildAdminToken('admin', 'secret');
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: correctToken }) } as never);
    expect(await isAdminAuthed()).toBe(true);
  });
});

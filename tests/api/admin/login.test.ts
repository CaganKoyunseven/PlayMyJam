// tests/api/admin/login.test.ts
import { NextRequest } from 'next/server';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { POST } from '@/app/api/admin/login/route';

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/login', () => {
  beforeEach(() => {
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'secret';
  });

  afterEach(() => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
  });

  it('returns 503 when env vars are not set', async () => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    const res = await POST(makeRequest({ username: 'admin', password: 'secret' }));
    expect(res.status).toBe(503);
  });

  it('returns 401 for wrong username', async () => {
    const res = await POST(makeRequest({ username: 'wrong', password: 'secret' }));
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    const res = await POST(makeRequest({ username: 'admin', password: 'wrong' }));
    expect(res.status).toBe(401);
  });

  it('returns 200 and sets pmj_admin cookie for correct credentials', async () => {
    const res = await POST(makeRequest({ username: 'admin', password: 'secret' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // Cookie should be present in Set-Cookie header
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('pmj_admin=');
    expect(setCookie).toContain('HttpOnly');
  });

  it('cookie value matches buildAdminToken output', async () => {
    const { buildAdminToken } = await import('@/lib/admin-auth');
    const expectedToken = buildAdminToken('admin', 'secret');
    const res = await POST(makeRequest({ username: 'admin', password: 'secret' }));
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(expectedToken);
  });
});

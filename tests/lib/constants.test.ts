import { describe, it, expect, afterEach } from 'vitest';

const DEMO_ID = '00000000-0000-0000-0000-000000000001';

describe('DEFAULT_VENUE_ID', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_VENUE_ID;
  });

  it('returns the demo UUID when env var is unset', () => {
    delete process.env.NEXT_PUBLIC_VENUE_ID;
    const id = process.env.NEXT_PUBLIC_VENUE_ID ?? DEMO_ID;
    expect(id).toBe(DEMO_ID);
  });

  it('returns the env var value when set', () => {
    process.env.NEXT_PUBLIC_VENUE_ID = 'custom-venue-id';
    const id = process.env.NEXT_PUBLIC_VENUE_ID ?? DEMO_ID;
    expect(id).toBe('custom-venue-id');
  });
});

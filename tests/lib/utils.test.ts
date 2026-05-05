import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('merges multiple classes', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('resolves Tailwind conflicts — last wins', () => {
    expect(cn('px-4', 'px-8')).toBe('px-8');
  });

  it('filters falsy values', () => {
    expect(cn('foo', false && 'bar', undefined, 'baz')).toBe('foo baz');
  });

  it('supports conditional object syntax', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });
});

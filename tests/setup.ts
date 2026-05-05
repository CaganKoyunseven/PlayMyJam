import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

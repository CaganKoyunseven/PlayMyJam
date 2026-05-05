import { vi } from 'vitest';

// Silence noisy console.error output in tests
vi.spyOn(console, 'error').mockImplementation(() => {});

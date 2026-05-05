import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'lib/utils.ts',
        'lib/constants.ts',
        'lib/admin-auth.ts',
        'lib/spotify-auth.ts',
        'lib/spotify-api.ts',
        'lib/event-bus.ts',
        'lib/db.ts',
        'app/api/admin/login/route.ts',
        'app/api/spotify/search/route.ts',
        'app/api/spotify/import/route.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});

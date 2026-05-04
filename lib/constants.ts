// Set NEXT_PUBLIC_VENUE_ID env var to switch venues without code changes.
// Falls back to the demo venue seeded in migration.sql.
export const DEFAULT_VENUE_ID = process.env.NEXT_PUBLIC_VENUE_ID ?? '00000000-0000-0000-0000-000000000001';

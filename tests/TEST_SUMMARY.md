# PlayMyJam Testing Summary

This document provides an overview of the testing coverage, strategies, and reasoning for the PlayMyJam project.

## Coverage Report Summary

The project has achieved a high level of test coverage, exceeding the **70%** threshold for both lines and branches.

| Category | Coverage % |
| :--- | :--- |
| **All Files (Statements)** | **83.92%** |
| **Branch Coverage** | **70.45%** |
| **Functions Coverage** | **80.90%** |
| **Lines Coverage** | **88.64%** |

---

## What is Tested?

### 1. Core Library Logic (`lib/`)
- **Queue Management (`db.ts`)**: tested insertion, position shifting, priority handling, and the rotational advancement logic.
- **Spotify API Wrappers (`spotify-api.ts`)**: verified data extraction from various Spotify sources (API, Scrape, Search Fallback).
- **Authentication (`admin-auth.ts`, `spotify-auth.ts`)**: verified token generation and session validation.
- **Event Bus (`event-bus.ts`)**: confirmed that system events (Song Started, Token Spent) are correctly published.

### 2. API Routes (`app/api/`)
- **Admin Login**: Verified credential checking and JWT generation.
- **Spotify Search & Import**: Verified that external API calls are correctly mapped to internal database structures.

### 3. Integration Flow (`tests/integration/`)
- **Playback Engine**: A dedicated integration test verifies the full lifecycle of a song request:
    - User spends token -> Priority insertion.
    - Queue shifts existing songs.
    - Song finishes -> Rotates to the end of the queue.
    - **Priority reset**: Confirmed that the `is_priority` flag is cleared when a song starts its next loop.

---

## What is NOT Tested? (and Why)

### 1. Client-Side React Components (UI)
- **Reasoning**: The current test suite focuses on the **business logic** and **data integrity**. UI testing (using tools like Playwright or Cypress) is excluded from the unit/integration suite to keep tests fast and focused on the engine's stability.
- **Mitigation**: Critical UI state changes are inferred by testing the underlying data transitions and event publications.

### 2. Live Database/Spotify API Interaction
- **Reasoning**: All database (Supabase) and external API (Spotify) calls are **mocked**.
- **Reasoning**: Using real external services in unit tests leads to "flaky" tests caused by network latency or API rate limits. Mocking ensures consistent, deterministic results and allows testing of error paths (like 403 Forbidden) that are hard to trigger manually.

### 3. Real WebSocket Subscriptions
- **Reasoning**: Testing real-time WebSocket connections requires a live server environment.
- **Mitigation**: The `EventBus` is tested to ensure that the *intent* to publish an event is correctly triggered.

---

## Detailed Coverage Breakdown

```text
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   83.92 |    70.45 |    80.9 |   88.64 |                   
 ...pi/admin/login |     100 |      100 |     100 |     100 |                   
  route.ts         |     100 |      100 |     100 |     100 |                   
 ...spotify/import |     100 |      100 |     100 |     100 |                   
  route.ts         |     100 |      100 |     100 |     100 |                   
 ...spotify/search |   94.11 |    66.66 |      75 |     100 |                   
  route.ts         |   94.11 |    66.66 |      75 |     100 | 23-29             
 lib               |   82.68 |    69.14 |   80.76 |    87.5 |                   
  admin-auth.ts    |     100 |      100 |     100 |     100 |                   
  constants.ts     |     100 |      100 |     100 |     100 |                   
  db.ts            |   79.76 |     68.5 |    74.5 |   88.14 | ...17-318,337,466 
  event-bus.ts     |    87.5 |    66.66 |     100 |   89.47 | 88-89             
  spotify-api.ts   |   81.21 |    67.79 |   81.57 |   83.62 | ...22-425,444-446 
  spotify-auth.ts  |   94.73 |       70 |     100 |     100 | 7-24,84,103-113   
  utils.ts         |     100 |      100 |     100 |     100 |                   
-------------------|---------|----------|---------|---------|-------------------
```

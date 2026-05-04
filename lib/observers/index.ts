import { teardownEventBus } from '../event-bus';

import { initPlaybackObserver } from './playback-observer';
import { initTokenObserver } from './token-observer';

let initialized = false;
const cleanups: Array<() => void> = [];

export function initObservers(): void {
  if (initialized) return;
  initialized = true;

  cleanups.push(initTokenObserver(), initPlaybackObserver());
}

export function teardownObservers(): void {
  cleanups.forEach(fn => fn());
  cleanups.length = 0;
  initialized = false;
  teardownEventBus();
}

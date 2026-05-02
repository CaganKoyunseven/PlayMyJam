import { teardownEventBus } from '../event-bus';
import { initTokenObserver } from './token-observer';
import { initPlaybackObserver } from './playback-observer';

let initialized = false;
const cleanups: Array<() => void> = [];

export function initObservers(): void {
  if (initialized) return;
  initialized = true;

  cleanups.push(
    initTokenObserver(),
    initPlaybackObserver()
  );
}

export function teardownObservers(): void {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  initialized = false;
  teardownEventBus();
}

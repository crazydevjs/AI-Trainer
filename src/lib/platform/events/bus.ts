import { EventEmitter } from "events";
import type { PlatformEventMap, PlatformEventName } from "./types";

/** Tiny typed pub/sub over Node's built-in EventEmitter — no new
 *  dependency. In-process only: fine for a single Node instance, and the
 *  interface is narrow enough to swap for a real broker (SQS, Redis
 *  Streams, etc.) later without touching any publisher/subscriber. */
class PlatformEventBus {
  private emitter = new EventEmitter().setMaxListeners(50);

  publish<K extends PlatformEventName>(event: K, payload: PlatformEventMap[K]): void {
    this.emitter.emit(event, payload);
  }

  subscribe<K extends PlatformEventName>(
    event: K,
    handler: (payload: PlatformEventMap[K]) => void,
  ): () => void {
    this.emitter.on(event, handler);
    return () => this.emitter.off(event, handler);
  }
}

const globalForEvents = globalThis as unknown as { platformEventBus?: PlatformEventBus };

export const eventBus = globalForEvents.platformEventBus ?? new PlatformEventBus();
if (process.env.NODE_ENV !== "production") globalForEvents.platformEventBus = eventBus;

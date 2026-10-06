import Redis from "ioredis";
import { config } from "../config.js";
import { broadcastSocketEvent } from "./socket.js";

const REALTIME_CHANNEL = "taskflow:realtime";

let publisher = null;
let subscriber = null;
let isPubSubActive = false;

try {
  publisher = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    lazyConnect: true
  });

  subscriber = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    lazyConnect: true
  });

  Promise.all([publisher.connect(), subscriber.connect()])
    .then(() => {
      isPubSubActive = true;
      console.log("Redis Pub/Sub connected successfully");

      subscriber.subscribe(REALTIME_CHANNEL, (err) => {
        if (err) {
          console.error("[Redis Pub/Sub] Subscription error:", err.message);
        }
      });

      subscriber.on("message", (channel, message) => {
        if (channel === REALTIME_CHANNEL) {
          try {
            const { event, payload } = JSON.parse(message);
            broadcastSocketEvent(event, payload);
          } catch (e) {
            console.error("[Redis Pub/Sub] Error parsing message:", e.message);
          }
        }
      });
    })
    .catch(() => {
      isPubSubActive = false;
      console.log("Redis Pub/Sub unavailable. Using direct memory event dispatcher.");
    });

  publisher.on("error", () => { isPubSubActive = false; });
  subscriber.on("error", () => { isPubSubActive = false; });
} catch {
  isPubSubActive = false;
}

/**
 * Publishes an event through Redis Pub/Sub, or directly broadcasts via Socket.IO if Redis is offline.
 * @param {string} event - Event name (e.g., 'task:updated')
 * @param {object} payload - Event payload
 */
export async function publishRealtimeEvent(event, payload) {
  if (isPubSubActive && publisher) {
    try {
      const message = JSON.stringify({ event, payload });
      await publisher.publish(REALTIME_CHANNEL, message);
      return;
    } catch {
      // Fall through to in-memory broadcast
    }
  }

  // Fallback: Direct broadcast to Socket.IO
  broadcastSocketEvent(event, payload);
}

import webpush from "web-push";
import { config } from "../config.js";

let pushEnabled = false;

try {
  if (config.vapid.publicKey && config.vapid.privateKey) {
    webpush.setVapidDetails(
      config.vapid.subject,
      config.vapid.publicKey,
      config.vapid.privateKey
    );
    pushEnabled = true;
    console.log("Push notification service initialized (VAPID keys active).");
  } else {
    console.log("Push notification service running in simulation mode (no VAPID keys configured).");
  }
} catch (err) {
  console.warn("Push notification service failed to initialize:", err.message);
  console.log("Push notification service running in simulation mode.");
}

export async function sendPushNotification(subscription, payload) {
  try {
    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    return { success: true, result };
  } catch (error) {
    console.log(`[Push Notification Simulation] Error sending push: ${error.message}`);
    return { success: false, error: error.message };
  }
}

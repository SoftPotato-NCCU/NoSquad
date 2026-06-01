import type { PushSubscriptionRow } from '../db/types';
import { pool } from '../db/connection';
import webpush from 'web-push';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'mail@example.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

export interface PushNotificationPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  silent?: boolean;
}

export async function savePushSubscription(
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
): Promise<string> {
  const subscriptionId = crypto.randomUUID();
  await pool.execute(
    `INSERT INTO push_subscriptions (uuid, user_id, endpoint, platform, p256dh, auth)
     VALUES (?, ?, ?, 'web', ?, ?)
     ON DUPLICATE KEY UPDATE
       user_id = ?, p256dh = ?, auth = ?, updated_at = CURRENT_TIMESTAMP`,
    [subscriptionId, userId, endpoint, p256dh, auth, userId, p256dh, auth],
  );
  return subscriptionId;
}

export async function getPushSubscriptionsByUser(
  userId: string,
): Promise<PushSubscriptionRow[]> {
  const [rows] = await pool.execute(
    'SELECT * FROM push_subscriptions WHERE user_id = ?',
    [userId],
  );
  return rows as PushSubscriptionRow[];
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await pool.execute('DELETE FROM push_subscriptions WHERE endpoint = ?', [
    endpoint,
  ]);
}

export async function notifyUser(
  userId: string,
  payload: PushNotificationPayload,
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await getPushSubscriptionsByUser(userId);

  if (!subscriptions.length) {
    console.log(
      `[PUSH] No subscriptions found for user ${userId}. Notification not sent.`,
    );
    return { sent: 0, failed: 0 };
  }

  // Fire-and-forget: spawn sends without blocking response
  Promise.all(
    subscriptions.map((sub) => sendPushToSubscription(sub, payload)),
  ).catch((error) => {
    console.error(`[PUSH] Background send failed for user ${userId}:`, error);
  });

  // Return immediately with subscription count
  return { sent: subscriptions.length, failed: 0 };
}

export async function notifyAllUsers(
  payload: PushNotificationPayload,
): Promise<{ sent: number; failed: number }> {
  const [rows] = await pool.execute('SELECT * FROM push_subscriptions');
  const subscriptions = rows as PushSubscriptionRow[];

  if (!subscriptions.length) {
    console.log('[PUSH] No subscriptions found. Notification not sent.');
    return { sent: 0, failed: 0 };
  }

  // Fire-and-forget: spawn sends without blocking response
  Promise.all(
    subscriptions.map((sub) => sendPushToSubscription(sub, payload)),
  ).catch((error) => {
    console.error('[PUSH] Background broadcast failed:', error);
  });

  // Return immediately with subscription count
  return { sent: subscriptions.length, failed: 0 };
}

async function sendPushToSubscription(
  subscription: PushSubscriptionRow,
  payload: PushNotificationPayload,
): Promise<boolean> {
  if (subscription.platform !== 'web') {
    console.log(
      `[PUSH] Platform "${subscription.platform}" not yet implemented. Skipping ${subscription.endpoint}`,
    );
    return false;
  }

  if (!subscription.p256dh || !subscription.auth) {
    console.log(
      `[PUSH] Missing p256dh or auth for subscription ${subscription.endpoint}. Removing.`,
    );
    await deletePushSubscription(subscription.endpoint);
    return false;
  }

  try {
    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: payload.data,
    });

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      message,
    );

    console.log(`[PUSH] Successfully sent to ${subscription.endpoint}`);
    return true;
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    const statusCode = (err.statusCode as number) || null;

    console.log(`[PUSH] Failed to send to ${subscription.endpoint}:`, error);

    // Remove expired/invalid subscriptions
    if (statusCode === 410 || statusCode === 404) {
      console.log(
        `[PUSH] Subscription expired (${statusCode}). Removing ${subscription.endpoint}`,
      );
      await deletePushSubscription(subscription.endpoint);
    }

    return false;
  }
}

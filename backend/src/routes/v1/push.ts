import { Hono } from 'hono';
import { apiError, type ErrorDetail } from '../../lib/errors';
import {
  savePushSubscription,
  getPushSubscriptionsByUser,
  notifyUser,
} from '../../lib/push-notifications';
import { authMiddleware, type AuthVariables } from './middleware/auth';

const push = new Hono<{ Variables: AuthVariables }>();

// ── GET /vapid-public-key ────────────────────────────────────────────────────
// Public endpoint - no auth required

push.get('/vapid-public-key', async (c) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return apiError(c, 500, 'INTERNAL_ERROR', 'VAPID public key not configured');
  }
  return c.json({ vapidPublicKey: publicKey });
});

// Auth required for remaining endpoints
push.use('*', authMiddleware);

// ── POST /subscribe ──────────────────────────────────────────────────────────

push.post('/subscribe', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return apiError(c, 400, 'VALIDATION_ERROR', 'Invalid request data');
  }

  const details: ErrorDetail[] = [];

  if (!body.endpoint) {
    details.push({
      field: 'endpoint',
      issue: 'required',
      message: 'Endpoint is required',
    });
  }

  if (!body.keys || !body.keys.p256dh || !body.keys.auth) {
    details.push({
      field: 'keys',
      issue: 'required',
      message: 'Keys with p256dh and auth are required',
    });
  }

  if (details.length > 0) {
    return apiError(c, 400, 'VALIDATION_ERROR', 'Invalid subscription data', details);
  }

  try {
    const subscriptionId = await savePushSubscription(
      userId,
      body.endpoint,
      body.keys.p256dh,
      body.keys.auth,
    );

    return c.json(
      {
        id: subscriptionId,
        message: 'Push subscription saved successfully',
      },
      201,
    );
  } catch (error) {
    console.error('[PUSH] Error saving subscription:', error);
    return apiError(c, 500, 'INTERNAL_ERROR', 'Failed to save subscription');
  }
});

// ── GET /subscriptions ────────────────────────────────────────────────────────

push.get('/subscriptions', async (c) => {
  const userId = c.get('userId');

  try {
    const subscriptions = await getPushSubscriptionsByUser(userId);
    return c.json({
      subscriptions: subscriptions.map((sub) => ({
        id: sub.uuid,
        endpoint: sub.endpoint,
        platform: sub.platform,
        created_at: sub.created_at,
      })),
    });
  } catch (error) {
    console.error('[PUSH] Error fetching subscriptions:', error);
    return apiError(c, 500, 'INTERNAL_ERROR', 'Failed to fetch subscriptions');
  }
});

// ── POST /test ───────────────────────────────────────────────────────────

push.post('/test', async (c) => {
  const userId = c.get('userId');

  try {
    const result = await notifyUser(userId, {
      title: 'Test Push Notification',
      body: 'This is a push notification test',
      data: { hello: 'world', path: '/explore' },
    });

    return c.json(
      {
        message: 'Test notification sent',
        sent: result.sent,
        failed: result.failed,
      },
      200,
    );
  } catch (error) {
    console.error('[PUSH] Error sending test notification:', error);
    return apiError(c, 500, 'INTERNAL_ERROR', 'Failed to send test notification');
  }
});

export default push;

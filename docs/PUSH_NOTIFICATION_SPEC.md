# Push Notifications Specification

---

## Overview

NoSquad supports Web Push notifications to deliver real-time updates to users. The system consists of:

- **Backend**: Push subscription management and notification delivery
- **Frontend**: Automatic subscription on login and notification handling
- **Database**: Persistent storage of push subscriptions
- **Service Worker**: Receives and displays notifications to users

---

## Architecture

### Push Notification Flow

```
User logs in
    ↓
Frontend requests notification permission (browser UI)
    ↓
User grants permission
    ↓
Frontend registers Service Worker
    ↓
Frontend subscribes to push notifications
    ↓
Subscription saved to backend database
    ↓
Backend can send notifications to user
    ↓
Service Worker receives push event
    ↓
Notification displayed to user (even if app closed!)
    ↓
User clicks notification
    ↓
App opens/focuses + navigates to specified path (if provided)
```

---

## Database Schema

### `push_subscriptions` Table

| Column | Type | Description |
|--------|------|-------------|
| `uuid` | CHAR(36) | Unique subscription identifier (UUID v4) |
| `user_id` | CHAR(36) | User ID (foreign key to `users`) |
| `endpoint` | VARCHAR(512) | Push service endpoint URL (unique) |
| `platform` | VARCHAR(20) | Platform type: `web`, `fcm`, `apns` (default: `web`) |
| `p256dh` | TEXT | ECDH public key for payload encryption |
| `auth` | TEXT | Authentication secret for payload verification |
| `created_at` | DATETIME | Subscription creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

**Constraints:**
- `endpoint` is unique per user (re-subscribing updates the record)
- Subscriptions cascade delete when user is deleted
- Only `web` platform currently supported (others reserved for future)

---

## API Endpoints

### Get VAPID Public Key

```
GET /api/v1/push/vapid-public-key
Auth: No (public endpoint)
```

Returns the VAPID public key needed for Web Push subscription.

**Response (200 OK):**
```json
{
  "vapidPublicKey": "BCkKBp3-v6nV6MJbM3qfToPxDiUNfLX2NGz-Kpdq4UE5kVyFvwrYBm0rqIilkxMT7ZmO0ataUI7LVwtKglpwHKY"
}
```

---

### Subscribe to Push

```
POST /api/v1/push/subscribe
Auth: Yes (Bearer token required)
```

Saves or updates a Web Push subscription.

**Request:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "base64url_encoded_key",
    "auth": "base64url_encoded_key"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `endpoint` | string | Yes | Push service endpoint URL |
| `keys.p256dh` | string | Yes | ECDH public key for encryption |
| `keys.auth` | string | Yes | Authentication secret |

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Push subscription saved successfully"
}
```

---

### List Subscriptions

```
GET /api/v1/push/subscriptions
Auth: Yes (Bearer token required)
```

Returns all active push subscriptions for the authenticated user.

**Response (200 OK):**
```json
{
  "subscriptions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "platform": "web",
      "created_at": "2026-04-14T10:00:00Z"
    }
  ]
}
```

---

### Send Test Notification

```
POST /api/v1/push/test
Auth: Yes (Bearer token required)
```

Sends a test notification to all subscriptions of the authenticated user.

**Response (200 OK):**
```json
{
  "message": "Test notification sent",
  "sent": 1,
  "failed": 0
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sent` | integer | Number of successful deliveries |
| `failed` | integer | Number of failed deliveries |

---

## Notification Payload

### Structure

```typescript
interface PushNotificationPayload {
  title?: string;           // Notification title
  body?: string;            // Notification body/content
  icon?: string;            // Icon URL (default: /icon-192x192.png)
  badge?: string;           // Badge URL (default: /icon-192x192.png)
  tag?: string;             // Notification tag for grouping
  data?: Record<string, unknown>;  // Custom data for app
  silent?: boolean;         // If true, no UI shown (default: false)
}
```

### Field Details

#### `title`
- **Type:** `string` (optional)
- **Default:** `"NoSquad"`
- **Max length:** Usually 65 chars (platform dependent)
- **Usage:** Main heading of the notification
- **Example:** `"Room Invitation"`, `"New Message"`

#### `body`
- **Type:** `string` (optional)
- **Default:** `""`
- **Max length:** Usually 240 chars (platform dependent)
- **Usage:** Detailed message content
- **Example:** `"You've been invited to 'Study Group'"`

#### `icon`
- **Type:** `string` (optional, URL)
- **Default:** `/icon-192x192.png`
- **Format:** Absolute or relative URL to image file
- **Size:** Recommended 192x192 or larger
- **Usage:** App icon displayed in notification
- **Example:** `/icon-192x192.png`, `https://example.com/icon.png`

#### `badge`
- **Type:** `string` (optional, URL)
- **Default:** `/icon-192x192.png`
- **Format:** Absolute or relative URL
- **Size:** Recommended 72x72 (used on some platforms)
- **Usage:** Small badge icon (Android status bar, etc)
- **Example:** `/icon-192x192.png`

#### `tag`
- **Type:** `string` (optional)
- **Default:** `"default"`
- **Usage:** Groups notifications with same tag (replaces previous)
- **Example:** `"room-123"` (replaces previous room-123 notifications)
- **Benefit:** Prevents notification spam

#### `data`
- **Type:** `Record<string, unknown>` (optional)
- **Default:** `{}`
- **Special key:** `path` - where to navigate on click
- **Usage:** Custom application data
- **Example:** `{ path: "/rooms/123", roomId: "123", action: "join_request" }`

**Special data fields:**

| Key | Type | Usage |
|-----|------|-------|
| `path` | string | Navigation path on click (e.g., `/rooms/123`) |
| `roomId` | string | Associated room ID |
| `userId` | string | Associated user ID |
| `action` | string | Action type (e.g., `join_request`, `message`) |

#### `silent`
- **Type:** `boolean` (optional)
- **Default:** `false`
- **Usage:** If `true`, notification is not shown to user
- **Behavior:** Processed in background, just data is delivered
- **Example:** Useful for background sync, analytics
- **Note:** Data is still available in Service Worker

---

## Service Worker Behavior

### Push Event (`push`)

When a notification is received:

1. **If `silent: true`:**
   - No notification UI shown
   - Data is logged: `[PUSH] Silent notification received`
   - Custom data can be processed in Service Worker

2. **If `silent: false` or not set:**
   - Browser shows native notification
   - Title, body, icon, badge displayed
   - Notification tag groups notifications

### Notification Click (`notificationclick`)

When user clicks the notification:

1. Notification is closed
2. If `data.path` provided:
   - App window is focused (or opened)
   - Frontend receives message to navigate to `path`
3. If no `path`:
   - App window is focused (or home page opened)

**Navigation flow:**
```
User clicks notification
    ↓
Service Worker extracts data.path
    ↓
Is app window already open?
    ├─ YES: Focus window + send NAVIGATE_TO message
    └─ NO: Open new window to path
    ↓
Frontend router navigates to path
```

---

## Backend Usage Examples

### Send Notification to Specific User

```typescript
import { notifyUser } from "@/lib/push-notifications";

// Basic notification
await notifyUser(userId, {
  title: "Room Invitation",
  body: "You've been invited to 'Math Study Group'",
  icon: "/icon-192x192.png",
  data: {
    path: "/rooms/room-id-123",
    roomId: "room-id-123"
  }
});
```

### Send Silent Notification (Data Only)

```typescript
// Background sync notification
await notifyUser(userId, {
  data: {
    action: "sync_data",
    timestamp: Date.now()
  },
  silent: true
});
```

### Send Notification with Tag (Replace Previous)

```typescript
// This replaces any previous "room-123" notification
await notifyUser(userId, {
  title: "Room Update",
  body: "New member joined!",
  tag: "room-123",
  data: { path: "/rooms/room-123" }
});
```

### Send to All Users

```typescript
import { notifyAllUsers } from "@/lib/push-notifications";

// System announcement
await notifyAllUsers({
  title: "System Maintenance",
  body: "Server maintenance scheduled for 2:00 AM",
  icon: "/icon-192x192.png"
});
```

---

## Frontend Integration

### Auto-Subscription on Login

The `PushNotificationInitializer` component automatically:

1. Runs when user logs in
2. Requests notification permission (browser UI appears)
3. If granted: subscribes to push notifications
4. Subscription saved to backend

No code needed - it's automatic!

### Manual Subscription

```typescript
import { initializePushNotifications } from "@/lib/push-notifications";

// Request permission + subscribe
const success = await initializePushNotifications();
if (success) {
  console.log("Push notifications enabled");
}
```

### Listen for Navigation Messages

The frontend automatically listens for navigation messages from the Service Worker:

```typescript
// Happens in PushNotificationInitializer component
navigator.serviceWorker.addEventListener("message", (event) => {
  if (event.data?.type === "NAVIGATE_TO") {
    router.push(event.data.path);
  }
});
```

---

## Integration with Room Events

### Example: Member Join Request

```typescript
// When user requests to join room
async function handleJoinRequest(userId: string, roomId: string) {
  // Save to database
  const request = await saveJoinRequest(userId, roomId);
  
  // Get room owner
  const room = await getRoom(roomId);
  
  // Notify room owner
  await notifyUser(room.creator_id, {
    title: "📬 Join Request",
    body: `${user.name} wants to join '${room.title}'`,
    tag: `join-request-${roomId}`,
    data: {
      path: `/rooms/${roomId}`,
      roomId,
      action: "join_request"
    }
  });
}
```

### Example: Member Approved

```typescript
async function approveJoinRequest(userId: string, roomId: string) {
  // Update database
  await updateRequestStatus(userId, roomId, "approved");
  
  // Notify the requester
  await notifyUser(userId, {
    title: "✅ Request Approved",
    body: "You can now join the room!",
    tag: `request-approved-${roomId}`,
    data: {
      path: `/rooms/${roomId}`,
      roomId,
      action: "request_approved"
    }
  });
}
```

---

## Best Practices

### 1. Use Tags for Similar Notifications
```typescript
// Don't send multiple "New Message" notifications
// Instead, use tag to replace previous ones
await notifyUser(userId, {
  title: "New Messages",
  body: "You have 5 new messages",
  tag: `messages-${roomId}`,  // ← Groups by room
  data: { path: `/rooms/${roomId}` }
});
```

### 2. Include Navigation Paths
```typescript
// Good: User can jump directly to relevant content
data: { path: "/rooms/123" }

// Avoid: Opening home page requires extra clicks
data: { path: "/" }
```

### 3. Use Silent for Background Tasks
```typescript
// Bad: Show UI for sync operations
await notifyUser(userId, {
  title: "Syncing...",
  body: "Syncing room data"
});

// Good: Silent sync
await notifyUser(userId, {
  data: { action: "sync_rooms" },
  silent: true
});
```

### 4. Meaningful Titles and Bodies
```typescript
// Good
title: "John joined the group"
body: "Math Study Group now has 5 members"

// Avoid
title: "Notification"
body: "New event"
```

### 5. Handle Subscription Failures
```typescript
const result = await notifyUser(userId, {
  title: "Important Update",
  body: "Please check this out"
});

if (result.failed > 0) {
  console.log(`Failed to send to ${result.failed} devices`);
  // Maybe retry or log for manual follow-up
}
```

---

## Error Handling

### Automatic Cleanup

Invalid/expired subscriptions are automatically removed:
- **410 Gone** - Subscription no longer valid
- **404 Not Found** - Push service endpoint not found

### Failed Deliveries

When a notification fails to send:
1. Service logs the error with `[PUSH]` prefix
2. Invalid subscriptions are deleted from database
3. Other subscriptions are unaffected
4. `failed` count returned in response

---

## Troubleshooting

### Notifications Not Showing

**Checklist:**
1. ✅ User granted notification permission?
   - Check browser settings: `Site Settings → Notifications`
2. ✅ Service Worker registered?
   - Browser DevTools → Application → Service Workers
3. ✅ Subscription saved to backend?
   - Check `push_subscriptions` table in database
4. ✅ Browser console shows `[PUSH]` messages?
   - Open DevTools → Console tab

### Subscription Not Saved

**Causes:**
- User denied notification permission
- Service Worker failed to register
- Network error during subscription

**Solution:**
```typescript
// Add error logging
try {
  await initializePushNotifications();
} catch (error) {
  console.error("[PUSH] Initialization failed:", error);
}
```

### Notification Not Delivered

**Check:**
1. Look for `[PUSH]` error messages in browser console
2. Verify user has an active subscription
3. Check backend logs for delivery errors
4. Subscription may have expired (auto-cleaned)

---

## Security Considerations

### VAPID Keys
- Public key is safe to share (included in responses)
- Private key must be kept secret (backend only)
- Generated once and stored in environment variables

### Subscription Endpoint
- Unique per browser/device
- Should not be shared or logged
- Used only by backend to send notifications

### Authentication
- All subscription endpoints require bearer token
- Only authenticated users can manage their subscriptions
- Users can only access their own notifications

---

## Limitations

### Current Implementation
- ✅ Web Push only (browser notifications)
- ⏳ FCM support (reserved for mobile app)
- ⏳ APNs support (reserved for iOS app)

### Push Notification Limits
- Payload size: ~3KB (browser dependent)
- Notification tag: Groups up to ~5 recent notifications
- Icon size: ~192x192 recommended
- No guaranteed delivery (best-effort)

---

## Environment Variables

Required for push notifications to work:

| Variable | Example | Purpose |
|----------|---------|---------|
| `VAPID_PUBLIC_KEY` | `BCk...` | Public key for Web Push |
| `VAPID_PRIVATE_KEY` | `secret...` | Private key (backend only) |
| `VAPID_EMAIL` | `noreply@nosquad.local` | Contact email for Push Service |

Generate VAPID keys:
```bash
# Using web-push CLI (if installed globally)
web-push generate-vapid-keys

# Output:
# Public Key: BCk...
# Private Key: secret...
```

---

## Related Documentation

- [API Specification](API_SPEC.md) - Full API reference
- [CLAUDE.md](../CLAUDE.md) - Project setup and architecture
- [Service Worker Code](../frontend/public/sw.js) - Push event handling
- [Push Notification Utilities](../frontend/lib/push-notifications.ts) - Frontend API

import { apiFetch, getToken } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_BACKEND_URL || "";

export function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  if (!base64String) {
    throw new Error("VAPID public key is missing");
  }

  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export async function getVapidPublicKey(): Promise<string> {
  const response = await fetch(`${API_BASE}/api/v1/push/vapid-public-key`);
  const data = await response.json();

  if (!response.ok) {
    const message =
      typeof data?.error?.message === "string"
        ? data.error.message
        : "Failed to fetch VAPID public key";
    throw new Error(message);
  }

  if (typeof data.vapidPublicKey !== "string" || data.vapidPublicKey.length === 0) {
    throw new Error("VAPID public key is missing");
  }

  return data.vapidPublicKey;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("Notifications are not supported in this browser");
    return "denied";
  }

  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }

  return await Notification.requestPermission();
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push notifications are not supported");
    return null;
  }

  try {
    const token = getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });

    const publicKey = await getVapidPublicKey();
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const serializedSub = JSON.parse(JSON.stringify(subscription));

    await apiFetch("/push/subscribe", {
      method: "POST",
      body: JSON.stringify({
        endpoint: serializedSub.endpoint,
        keys: serializedSub.keys,
      }),
    });

    return subscription;
  } catch (error) {
    console.error("Failed to subscribe to push:", error);
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    return true;
  } catch (error) {
    console.error("Failed to unsubscribe from push:", error);
    return false;
  }
}

export async function isPushSupported(): Promise<boolean> {
  return "serviceWorker" in navigator && "PushManager" in window;
}

export async function isSubscribed(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

// Called automatically on app start — only subscribes if permission is already granted.
// Does NOT request permission (requires a user gesture on iOS).
export async function initializePushNotifications(): Promise<boolean> {
  try {
    const supported = await isPushSupported();
    if (!supported) {
      console.log("[PUSH] Push notifications not supported");
      return false;
    }

    if (!("Notification" in window) || Notification.permission !== "granted") {
      console.log("[PUSH] Permission not granted, skipping auto-subscribe");
      return false;
    }

    const subscription = await subscribeToPush();
    if (subscription) {
      console.log("[PUSH] Successfully subscribed to push notifications");
      return true;
    }

    return false;
  } catch (error) {
    console.error("[PUSH] Failed to initialize push notifications:", error);
    return false;
  }
}

// Called from a user-initiated action (button tap).
// Requests permission first, then subscribes if granted.
export async function requestPermissionAndSubscribe(): Promise<boolean> {
  try {
    const supported = await isPushSupported();
    if (!supported) {
      console.log("[PUSH] Push notifications not supported");
      return false;
    }

    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      console.log("[PUSH] Permission not granted");
      return false;
    }

    const subscription = await subscribeToPush();
    return subscription !== null;
  } catch (error) {
    console.error("[PUSH] Failed to request permission and subscribe:", error);
    return false;
  }
}

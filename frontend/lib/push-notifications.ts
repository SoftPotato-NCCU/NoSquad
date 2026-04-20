import { apiFetch, getToken } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_BACKEND_URL || "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
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
  const response = await fetch(`${API_BASE}/api/v1/push/vapid_public_key`);
  const data = await response.json();
  return data.public_key;
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

    await apiFetch("/push/subscribe/", {
      method: "POST",
      body: JSON.stringify({
        platform: "web",
        pushSubscription: serializedSub,
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
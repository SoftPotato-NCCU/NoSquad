"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { initializePushNotifications } from "@/lib/push-notifications";

export default function PushNotificationInitializer() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Listen for navigation messages from service worker
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "NAVIGATE_TO") {
        const path = event.data?.path;
        if (path) {
          console.log("[PUSH] Navigating to:", path);
          router.push(path);
        }
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [router]);

  // Re-subscribe on every cold start for the logged-in user.
  // Keyed on user.id so it runs once per login session.
  // Subscription upsert on the backend makes this idempotent.
  useEffect(() => {
    if (isLoading || !user) return;

    console.log("[PUSH] Initializer: Starting push notification initialization for user", user.id);

    initializePushNotifications()
      .then((success) => {
        console.log("[PUSH] Initializer: Push initialization completed. Success:", success);
      })
      .catch((error) => {
        console.error("[PUSH] Initializer: Failed to initialize push notifications:", error);
      });
  }, [user?.id, isLoading]);

  return null;
}

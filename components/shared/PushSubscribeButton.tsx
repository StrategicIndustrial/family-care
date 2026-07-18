"use client";

import { useEffect, useState } from "react";
import { saveSubscription, removeSubscription } from "@/app/actions/push-subscriptions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "checking" | "off" | "on" | "denied" | "pending";

export function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready.then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? "on" : "off");
    });
  }, []);

  async function handleEnable() {
    setStatus("pending");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push isn't configured on this deployment yet.");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const json = subscription.toJSON();
      await saveSubscription({ endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth } });
      setStatus("on");
    } catch {
      setStatus("off");
    }
  }

  async function handleDisable() {
    setStatus("pending");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removeSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setStatus("on");
    }
  }

  if (status === "unsupported") return null;
  if (status === "checking") return null;

  if (status === "denied") {
    return (
      <p className="text-xs text-text-mid">
        Notifications are blocked in your browser settings — enable them there to get medication reminders.
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-line px-3 py-2.5">
      <div>
        <div className="text-sm font-bold text-text-dark">Medication reminders</div>
        <div className="text-xs text-text-mid">{status === "on" ? "Notifications enabled on this device" : "Get notified at reminder times"}</div>
      </div>
      <button
        type="button"
        disabled={status === "pending"}
        onClick={status === "on" ? handleDisable : handleEnable}
        className="text-xs font-bold text-sage-600 disabled:opacity-50 shrink-0"
      >
        {status === "pending" ? "…" : status === "on" ? "Disable" : "Enable"}
      </button>
    </div>
  );
}

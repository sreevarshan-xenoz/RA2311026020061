"use client";

import type { NotificationItem } from "@/services/notifications";

export const VIEWED_NOTIFICATION_IDS_STORAGE_KEY = "viewedNotificationIds";

const notificationWeight: Record<string, number> = {
  Placement: 1,
  Result: 0.75,
  Event: 0.5,
};

function parseTimestamp(timestamp: string) {
  const normalizedTimestamp = timestamp.includes("T")
    ? timestamp
    : timestamp.replace(" ", "T");
  const parsed = Date.parse(normalizedTimestamp);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function priorityScore(notification: NotificationItem, nowMs: number) {
  const typeWeight = notificationWeight[notification.type] ?? 0.25;
  const timestampMs = parseTimestamp(notification.timestamp);
  const ageHours = Math.max(0, (nowMs - timestampMs) / (1000 * 60 * 60));
  const recencyWeight = 1 / (1 + ageHours / 12);

  return typeWeight * 0.7 + recencyWeight * 0.3;
}

export function topPriorityNotifications(
  notifications: NotificationItem[],
  limit: number,
) {
  const nowMs = Date.now();

  return [...notifications]
    .sort((left, right) => {
      const scoreDifference =
        priorityScore(right, nowMs) - priorityScore(left, nowMs);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return parseTimestamp(right.timestamp) - parseTimestamp(left.timestamp);
    })
    .slice(0, limit);
}

export function readViewedNotificationIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  const raw = window.localStorage.getItem(VIEWED_NOTIFICATION_IDS_STORAGE_KEY);

  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [] as string[];
    }

    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [] as string[];
  }
}

export function saveViewedNotificationIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    VIEWED_NOTIFICATION_IDS_STORAGE_KEY,
    JSON.stringify(ids),
  );
}

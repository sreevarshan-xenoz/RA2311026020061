"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { getNotifications, type NotificationItem } from "@/services/notifications";
import {
  readViewedNotificationIds,
  saveViewedNotificationIds,
  topPriorityNotifications,
} from "@/utils/priority";
import { logEvent } from "@/services/logger";

const CANDIDATE_PAGE_SIZE = 20;
const CANDIDATE_MAX_PAGES = 5;
const PRIORITY_LIMIT = 10;

function toUniqueNotifications(notifications: NotificationItem[]) {
  const seen = new Set<string>();

  return notifications.filter((notification) => {
    if (seen.has(notification.id)) {
      return false;
    }

    seen.add(notification.id);
    return true;
  });
}

function formatTimestamp(value: string) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }
  return parsedDate.toLocaleString();
}

export default function PriorityNotificationsPage() {
  const hasToken =
    typeof window === "undefined"
      ? false
      : Boolean(window.sessionStorage.getItem("evaluationBearerToken"));

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [viewedNotificationIds, setViewedNotificationIds] = useState<string[]>(
    () => readViewedNotificationIds(),
  );
  const [status, setStatus] = useState("Ready");
  const [isBusy, setIsBusy] = useState(false);
  const canFetch = hasToken;

  useEffect(() => {
    if (!canFetch) {
      return;
    }

    void (async () => {
      setIsBusy(true);
      setStatus("Loading priority inbox...");

      try {
        const allCandidates: NotificationItem[] = [];

        for (let page = 1; page <= CANDIDATE_MAX_PAGES; page += 1) {
          const items = await getNotifications({
            limit: CANDIDATE_PAGE_SIZE,
            page,
            notificationType: "all",
          });
          allCandidates.push(...items);

          if (items.length < CANDIDATE_PAGE_SIZE) {
            break;
          }
        }

        const uniqueCandidates = toUniqueNotifications(allCandidates);
        const topTen = topPriorityNotifications(uniqueCandidates, PRIORITY_LIMIT);
        setNotifications(topTen);
        setStatus(
          `Loaded top ${topTen.length} from ${uniqueCandidates.length} notifications.`,
        );
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "Priority inbox fetch failed",
        );
      } finally {
        setIsBusy(false);
      }
    })();
  }, [canFetch]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !viewedNotificationIds.includes(notification.id),
      ).length,
    [notifications, viewedNotificationIds],
  );

  function handleOpenNotification(notificationId: string) {
    setViewedNotificationIds((currentIds) => {
      if (currentIds.includes(notificationId)) {
        return currentIds;
      }

      const updatedIds = [...currentIds, notificationId];
      saveViewedNotificationIds(updatedIds);
      return updatedIds;
    });

    void logEvent({
      level: "info",
      package: "component",
      message: `Priority notification opened: ${notificationId}`,
    });
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            sx={{ justifyContent: "space-between" }}
          >
            <Box>
              <Typography variant="overline" color="success.main">
                Stage 1
              </Typography>
              <Typography variant="h4" component="h1" sx={{ mt: 0.5 }}>
                Priority page
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Top notifications ranked by type and recency.
              </Typography>
            </Box>
            <Button component={Link} href="/" variant="outlined" size="small">
              Back to main inbox
            </Button>
          </Stack>

          <Card variant="outlined">
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                sx={{ justifyContent: "space-between" }}
              >
                <Typography variant="body2" color="text.secondary">
                  {status}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Chip
                    size="small"
                    label={`Unread: ${unreadCount} | Viewed: ${
                      notifications.length - unreadCount
                    }`}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => window.location.reload()}
                    disabled={!canFetch || isBusy}
                  >
                    Refresh
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {!canFetch ? (
            <Typography variant="body2" color="text.secondary">
              Authenticate first on the setup page to load the priority inbox.
            </Typography>
          ) : notifications.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No notifications available for ranking.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {notifications.map((notification, index) => {
                const isViewed = viewedNotificationIds.includes(notification.id);
                return (
                  <Card key={notification.id} variant="outlined">
                    <CardActionArea onClick={() => handleOpenNotification(notification.id)}>
                      <CardContent>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          sx={{ alignItems: { xs: "flex-start", sm: "center" } }}
                        >
                          <Typography variant="overline">
                            Rank #{index + 1} • {notification.type}
                          </Typography>
                          <Chip
                            size="small"
                            label={isViewed ? "Viewed" : "Unread"}
                            color={isViewed ? "default" : "primary"}
                          />
                        </Stack>
                        <Typography variant="subtitle1" sx={{ mt: 1 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {formatTimestamp(notification.timestamp)}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

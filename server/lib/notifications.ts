// server/lib/notifications.ts
// ─────────────────────────────────────────────────────────────────────────────
// Notification helpers for formatting notification records returned by
// /api/notifications. Used by the notifications API route to serialize
// database rows into client-friendly list items.
// Currently active and imported by server/routes/notifications/index.ts.
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationActorRecord {
  id: string;
  display_name: string;
}

export interface NotificationPostRecord {
  id: string;
  content: string;
}

export interface NotificationRecord {
  id: string;
  type: string;
  is_read: boolean;
  body: string | null;
  created_at: string;
  post_id: string | null;
  profiles?: NotificationActorRecord | NotificationActorRecord[] | null;
  posts?: NotificationPostRecord | NotificationPostRecord[] | null;
}

export interface NotificationListItem {
  id: string;
  type: string;
  isRead: boolean;
  body: string;
  createdAt: string;
  postId?: string;
  actorName?: string;
  postPreview?: string;
}

function normalizeSingle<T>(value?: T | T[] | null) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function summarizeType(type: string, actorName?: string) {
  switch (type) {
    case "like":
      return `${actorName || "Someone"} liked your post`;
    case "comment":
      return `${actorName || "Someone"} commented on your post`;
    case "follow":
      return `${actorName || "Someone"} started following you`;
    default:
      return actorName ? `${actorName} sent you an update` : "You have a new notification";
  }
}

export function toNotificationListItem(record: NotificationRecord): NotificationListItem {
  const actor = normalizeSingle(record.profiles);
  const post = normalizeSingle(record.posts);
  const actorName = actor?.display_name;
  const fallbackBody = summarizeType(record.type, actorName);

  return {
    id: record.id,
    type: record.type,
    isRead: record.is_read,
    body: record.body?.trim() || fallbackBody,
    createdAt: record.created_at,
    postId: record.post_id ?? post?.id ?? undefined,
    actorName,
    postPreview: post?.content,
  };
}

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
  avatar_url?: string | null;
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
  actorId?: string;
  actorName?: string;
  actorHandle?: string;
  actorAvatarUrl?: string | null;
  postPreview?: string;
}

function createHandle(displayName: string, id: string) {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^[.]+|[.]+$)/g, "");

  return slug || id.slice(0, 8).toLowerCase();
}

function normalizeSingle<T>(value?: T | T[] | null) {
  if (!value) {
    return null;
  }

  // Supabase joins may return either a single object or a one-item array
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function summarizeType(type: string, actorName?: string) {
  switch (type) {
    case "like":
      return `${actorName || "Someone"} liked your post`;
    case "comment":
      return `${actorName || "Someone"} commented on your post`;
    case "post_activity":
      return `${actorName || "Someone"} commented on a post you interacted with`;
    case "follow":
      return `${actorName || "Someone"} started following you`;
    case "admin_delete_post":
      return actorName
        ? `${actorName} deleted your post`
        : "An admin deleted your post";
    default:
      return actorName ? `${actorName} sent you an update` : "You have a new notification";
  }
}

export function toNotificationListItem(record: NotificationRecord): NotificationListItem {
  // Convert DB rows into a client-friendly payload so UI components stay simple
  const actor = normalizeSingle(record.profiles);
  const post = normalizeSingle(record.posts);
  const actorName = actor?.display_name;
  const actorHandle = actor ? createHandle(actor.display_name, actor.id) : undefined;
  const actorLabel = actorHandle ? `@${actorHandle}` : actorName || "Someone";
  const trimmedBody = record.body?.trim();
  const postPreview = post?.content?.trim().slice(0, 80);

  let body = trimmedBody || summarizeType(record.type, actorName);

  if (record.type === "like") {
    body = trimmedBody
      ? `${actorLabel} liked your post: "${trimmedBody}"`
      : `${actorLabel} liked your post`;
  } else if (record.type === "comment") {
    body = trimmedBody
      ? `${actorLabel} commented on your post: "${trimmedBody}"`
      : `${actorLabel} commented on your post`;
  } else if (record.type === "post_activity") {
    body = trimmedBody
      ? `${actorLabel} commented on a post you interacted with: "${trimmedBody}"`
      : `${actorLabel} commented on a post you interacted with`;
  } else if (record.type === "admin_delete_post") {
    body = trimmedBody || summarizeType(record.type, actorName);
  }

  return {
    id: record.id,
    type: record.type,
    isRead: record.is_read,
    body,
    createdAt: record.created_at,
    postId: record.post_id ?? post?.id ?? undefined,
    actorId: actor?.id,
    actorName,
    actorHandle,
    actorAvatarUrl: actor?.avatar_url ?? null,
    postPreview,
  };
}

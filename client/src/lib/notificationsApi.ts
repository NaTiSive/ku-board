// Notification API helpers
// รวม endpoint อ่าน/mark read ไว้ที่เดียวเพื่อให้หน้าแจ้งเตือนและ sidebar ใช้ร่วมกัน
interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

export interface NotificationItem {
  id: string
  type: string
  isRead: boolean
  body: string
  createdAt: string
  postId?: string
  actorId?: string
  actorName?: string
  actorHandle?: string
  actorAvatarUrl?: string | null
  postPreview?: string
}

export interface NotificationsPageData {
  notifications: NotificationItem[]
  total: number
  page: number
  limit: number
}

export interface NotificationUnreadCountData {
  unread_count: number
}

async function readJson<T>(response: Response) {
  const body = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Request failed')
  }

  return body.data
}

export async function fetchNotifications(serverBase: string, page = 1, limit = 20): Promise<NotificationsPageData> {
  const url = new URL('/api/notifications', serverBase)
  url.searchParams.set('page', String(page))
  url.searchParams.set('limit', String(limit))

  const response = await fetch(url.toString(), {
    credentials: 'include',
  })

  return readJson<NotificationsPageData>(response)
}

export async function fetchUnreadNotificationCount(serverBase: string): Promise<number> {
  const response = await fetch(`${serverBase}/api/notifications/unread-count`, {
    credentials: 'include',
  })

  const data = await readJson<NotificationUnreadCountData>(response)
  return data.unread_count ?? 0
}

export async function markNotificationsRead(serverBase: string, ids: string[]) {
  const response = await fetch(`${serverBase}/api/notifications/read`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ ids }),
  })

  await readJson<{ updated: number }>(response)
}

export async function markAllNotificationsRead(serverBase: string) {
  const response = await fetch(`${serverBase}/api/notifications/read-all`, {
    method: 'PATCH',
    credentials: 'include',
  })

  await readJson<{ updated: boolean }>(response)
}

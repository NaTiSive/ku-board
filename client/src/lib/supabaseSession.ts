interface SupabaseSessionUser {
  id?: string
  email?: string
  app_metadata?: {
    role?: string
  }
  user_metadata?: {
    full_name?: string
    display_name?: string
    name?: string
  }
}

interface SupabaseSession {
  user?: SupabaseSessionUser
}

function parseCookies() {
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, cookie) => {
      const separatorIndex = cookie.indexOf('=')
      if (separatorIndex === -1) {
        return acc
      }

      const name = cookie.slice(0, separatorIndex)
      const value = cookie.slice(separatorIndex + 1)
      acc[name] = decodeURIComponent(value)
      return acc
    }, {})
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = window.atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function findSessionCookieValue() {
  const cookies = parseCookies()
  const cookieNames = Object.keys(cookies)
  const baseName =
    cookieNames.find((name) => /^sb-[^.]+-auth-token$/.test(name)) ??
    cookieNames.find((name) => /^sb-[^.]+-auth-token\.0$/.test(name))?.replace(/\.0$/, '')

  if (!baseName) {
    return null
  }

  if (cookies[baseName]) {
    return cookies[baseName]
  }

  const parts: string[] = []
  for (let index = 0; ; index += 1) {
    const chunk = cookies[`${baseName}.${index}`]
    if (!chunk) {
      break
    }
    parts.push(chunk)
  }

  return parts.length > 0 ? parts.join('') : null
}

export function readSupabaseSession() {
  const rawValue = findSessionCookieValue()
  if (!rawValue) {
    return null
  }

  try {
    const decoded = rawValue.startsWith('base64-') ? decodeBase64Url(rawValue.slice(7)) : rawValue
    return JSON.parse(decoded) as SupabaseSession
  } catch {
    return null
  }
}

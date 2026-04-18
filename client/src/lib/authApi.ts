interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload extends LoginPayload {
  fullname: string
}

interface AuthResponseData {
  message?: string
}

async function postAuth<TPayload extends object>(serverBase: string, path: string, payload: TPayload) {
  const response = await fetch(`${serverBase}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const body = (await response.json()) as ApiEnvelope<AuthResponseData>

  if (!response.ok || !body.success) {
    throw new Error(body.error || 'Authentication request failed')
  }

  return body.data
}

export async function loginWithPassword(serverBase: string, payload: LoginPayload) {
  return postAuth(serverBase, '/api/auth/login', payload)
}

export async function registerWithPassword(serverBase: string, payload: RegisterPayload) {
  return postAuth(serverBase, '/api/auth/signup', payload)
}

export async function logoutSession(serverBase: string) {
  return postAuth(serverBase, '/api/auth/logout', {})
}

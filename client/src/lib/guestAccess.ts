// Guest access flag
// เก็บสถานะว่า visitor ผ่านหน้า welcome แล้วใน session ปัจจุบัน
const GUEST_ACCESS_KEY = 'kuboard.guest-access-approved'

export function hasGuestAccessApproval() {
  try {
    return window.sessionStorage.getItem(GUEST_ACCESS_KEY) === '1'
  } catch {
    return false
  }
}

export function grantGuestAccess() {
  try {
    window.sessionStorage.setItem(GUEST_ACCESS_KEY, '1')
  } catch {
    // ignore
  }
}

export function clearGuestAccess() {
  try {
    window.sessionStorage.removeItem(GUEST_ACCESS_KEY)
  } catch {
    // ignore
  }
}

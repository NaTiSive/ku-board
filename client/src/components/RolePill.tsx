import type { Role } from '../types'

const roleMap: Record<Role, { label: string; tone: string }> = {
  guest: { label: 'Guest', tone: 'role-guest' },
  member: { label: 'KU Member', tone: 'role-member' },
  admin: { label: 'Admin', tone: 'role-admin' },
}

export default function RolePill({ role }: { role: Role }) {
  const { label, tone } = roleMap[role]
  return <span className={`role-pill ${tone}`}>{label}</span>
}

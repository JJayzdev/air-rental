import 'server-only'

export type DemoRole = 'customer' | 'partner' | 'admin'

export interface DemoAccount {
  email: string
  role: DemoRole
  roleLabel: string
  fullName: string
  phone: string
}

/**
 * Ba tài khoản demo dùng chung cho môi trường trình diễn.
 *
 * CẢNH BÁO: đây là tài khoản công khai có mã OTP cố định. Chỉ bật khi
 * `AIR_DEMO_LOGIN=true` (tự bật ở môi trường phát triển). Đặt
 * `AIR_DEMO_LOGIN=false` để tắt hoàn toàn trên production.
 */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    email: 'customer@air.com',
    role: 'customer',
    roleLabel: 'Khách hàng',
    fullName: 'Khách hàng Demo A.I.R',
    phone: '0900000001',
  },
  {
    email: 'partner@air.com',
    role: 'partner',
    roleLabel: 'Đối tác',
    fullName: 'Đối tác Demo A.I.R',
    phone: '0900000002',
  },
  {
    email: 'admin@air.com',
    role: 'admin',
    roleLabel: 'Quản trị',
    fullName: 'Quản trị Demo A.I.R',
    phone: '0900000003',
  },
] as const

export function demoLoginEnabled(): boolean {
  if (process.env.AIR_DEMO_LOGIN === 'false') return false
  if (process.env.AIR_DEMO_LOGIN === 'true') return true
  // Mặc định bật ở môi trường phát triển để tiện trình diễn cục bộ.
  return process.env.NODE_ENV !== 'production'
}

export function demoOtp(): string {
  return process.env.AIR_DEMO_OTP?.trim() || '111111'
}

export function findDemoAccount(email: string): DemoAccount | null {
  const normalized = email.trim().toLowerCase()
  return DEMO_ACCOUNTS.find((account) => account.email === normalized) ?? null
}

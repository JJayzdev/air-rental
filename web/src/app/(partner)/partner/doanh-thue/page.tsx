import { redirect } from 'next/navigation'

/** Đường dẫn cũ (gõ sai "doanh-thue"); giữ để link/bookmark cũ vẫn tới trang doanh thu. */
export default function LegacyPartnerRevenuePage() {
  redirect('/partner/doanh-thu')
}

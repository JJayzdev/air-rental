import { PageSkeleton } from '@/components/ui/PageSkeleton'

export default function Loading() {
  return <PageSkeleton label="Đang tải dữ liệu đối tác…" cards={4} />
}

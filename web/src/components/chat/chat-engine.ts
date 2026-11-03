// Trợ lý A.I.R phiên bản rule-based.
// Mọi "trí tuệ" của bot nằm ở đây, tách khỏi phần giao diện để sau này
// thay bằng API/LLM mà không phải sửa ChatWidget.

import type { ChatReply, Order } from '@/types'

export const GREETING = 'Xin chào! Mình là A.I.R. Bạn cần mình hỗ trợ thuê thiết bị nào?'

export const SUGGESTIONS = [
  'Tìm laptop cho học tập',
  'Cách thuê thiết bị',
  'Cách tính giá thuê',
  'Kiểm tra đơn thuê',
]

const FAQ_FALLBACK =
  'Mình chưa hiểu rõ câu hỏi. Bạn có thể hỏi về thiết bị, giá thuê, giao nhận, đặt cọc, hoàn trả hoặc cách đặt thuê nhé.'
export const isKnownFaq = (text: string) => buildReply(text).text !== FAQ_FALLBACK

/** Local-only FAQ used by the no-backend demo; it never reads accounts or catalog data. */
export const buildDemoReply = (text: string): ChatReply => {
  const t = text.toLowerCase()
  if (/(giá|bao nhiêu|tính tiền|chi phí|cọc)/.test(t)) {
    return {
      text: 'Giá và tiền cọc trong bản demo là số liệu minh họa, không phải báo giá hoặc khoản cần thanh toán.',
    }
  }
  if (/(đơn|kiểm tra|trạng thái)/.test(t)) {
    return {
      text: 'Trang đơn thuê cần Supabase local và tài khoản test. Catalog mẫu mặc định không tạo được đơn.',
      action: { label: 'Mở luồng đơn thuê', view: 'orders' },
    }
  }
  if (/(cách|quy trình|đặt thuê|book)/.test(t)) {
    return {
      text: 'Catalog mẫu chỉ để xem và không thể đặt thuê. Bài checkout cần sản phẩm test không phải sample, một unit khả dụng và tài khoản trong Supabase local.',
      action: { label: 'Xem catalog mẫu', view: 'products' },
    }
  }
  if (/(dữ liệu|mẫu|sample|thật)/.test(t)) {
    return {
      text: 'Dữ liệu trong prototype là giả lập. Không có thiết bị, khách hàng hay giao dịch thật được xác nhận. Xem hướng dẫn demo để biết giới hạn.',
    }
  }
  return {
    text: 'Mình đang ở chế độ FAQ local. Hãy hỏi về dữ liệu mẫu, giá minh họa, catalog hoặc giới hạn checkout.',
  }
}

/** Sinh câu trả lời cho một tin nhắn. */
export const buildReply = (text: string, _context: { orders?: Order[] } = {}): ChatReply => {
  const t = text.toLowerCase()

  if (/(giá|bao nhiêu|tính tiền|chi phí)/.test(t)) {
    return {
      text: 'Giá trong catalog là dữ liệu minh họa. Chỉ bài fixture Supabase local mới có thể tính thử checkout; không có báo giá hoặc khoản thanh toán thật.',
      action: { label: 'Xem catalog đồ án', view: 'products' },
    }
  }

  if (/(cách|quy trình|3 bước|đặt thuê)/.test(t)) {
    return {
      text: 'Catalog sample không thể đặt thuê. Bài checkout cần tài khoản local, sản phẩm test không phải sample và unit khả dụng.',
      action: { label: 'Xem catalog mẫu', view: 'products' },
    }
  }

  if (/(đơn|kiểm tra|trạng thái)/.test(t)) {
    return {
      text: 'Trang đơn chỉ đọc đơn fixture thuộc tài khoản Supabase local đã đăng nhập.',
      action: { label: 'Mở trang đơn test', view: 'orders' },
    }
  }

  if (/(cọc|đặt cọc|thanh toán)/.test(t)) {
    return {
      text: 'Khoản cọc và thanh toán trong demo là dữ liệu fixture. Không chuyển tiền thật; trạng thái mock không phải chứng từ ngân hàng.',
    }
  }

  if (/(giao|nhận|ship|vận chuyển)/.test(t)) {
    return {
      text: 'Vùng giao hàng và phí trong bài checkout lấy từ fixture local, không tạo lịch giao nhận thật.',
    }
  }

  if (/(hoàn|trả|hỏng|bảo hành|sự cố)/.test(t)) {
    return {
      text: 'Bài tập có phiếu diễn tập giao nhận và xử lý sự cố. A.I.R trong đồ án không có kênh hỗ trợ hay bàn giao thiết bị thật.',
    }
  }

  if (/(xin chào|chào|hello|hi\b)/.test(t)) {
    return {
      text: 'Chào bạn! Bạn đang tìm thiết bị gì? Mình có thể gợi ý theo nhu cầu và ngân sách.',
    }
  }

  return {
    text: FAQ_FALLBACK,
  }
}

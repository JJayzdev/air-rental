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

/** Local-only FAQ used when the chat backend is not configured. */
export const buildDemoReply = (text: string): ChatReply => {
  const t = text.toLowerCase()
  if (/(giá|bao nhiêu|tính tiền|chi phí|cọc)/.test(t)) {
    return {
      text: 'Giá thuê theo ngày và tiền cọc được ghi rõ trên trang từng thiết bị. Bạn có thể xem tổng chi phí trước khi xác nhận đơn.',
      action: { label: 'Xem thiết bị', view: 'products' },
    }
  }
  if (/(đơn|kiểm tra|trạng thái)/.test(t)) {
    return {
      text: 'Sau khi đăng nhập, bạn xem được trạng thái đơn, lịch nhận máy và tiến độ hoàn cọc trong mục Đơn của tôi.',
      action: { label: 'Mở đơn thuê', view: 'orders' },
    }
  }
  if (/(cách|quy trình|đặt thuê|book)/.test(t)) {
    return {
      text: 'Chọn thiết bị và ngày thuê, thêm vào giỏ, đăng nhập rồi điền thông tin nhận máy. A.I.R sẽ liên hệ xác nhận lịch giao trước khi bàn giao.',
      action: { label: 'Xem thiết bị', view: 'products' },
    }
  }
  if (/(giao|nhận|ship|vận chuyển)/.test(t)) {
    return {
      text: 'A.I.R giao máy tận nơi trong khu vực hỗ trợ. Phí giao hiển thị ở bước đặt thuê, bạn cũng có thể chọn nhận tại cửa hàng.',
    }
  }
  if (/(hoàn|trả|hỏng|bảo hành|sự cố)/.test(t)) {
    return {
      text: 'Khi trả máy, nhân viên kiểm tra tình trạng cùng bạn. Thiết bị hư hỏng do sử dụng sai có thể phát sinh phí theo chính sách thuê.',
    }
  }
  return {
    text: 'Mình có thể tư vấn về thiết bị, giá thuê, đặt cọc, giao nhận, hoàn trả và cách đặt thuê. Bạn muốn hỏi mục nào?',
  }
}

/** Sinh câu trả lời cho một tin nhắn. */
export const buildReply = (text: string, _context: { orders?: Order[] } = {}): ChatReply => {
  const t = text.toLowerCase()

  if (/(giá|bao nhiêu|tính tiền|chi phí)/.test(t)) {
    return {
      text: 'Giá thuê theo ngày và tiền cọc được ghi rõ trên trang từng thiết bị. Tổng chi phí, phí giao và ưu đãi được tính lại ở bước đặt thuê.',
      action: { label: 'Xem thiết bị', view: 'products' },
    }
  }

  if (/(cách|quy trình|3 bước|đặt thuê)/.test(t)) {
    return {
      text: 'Chọn thiết bị và ngày thuê, thêm vào giỏ, đăng nhập rồi điền thông tin nhận máy. A.I.R sẽ liên hệ xác nhận lịch giao trước khi bàn giao.',
      action: { label: 'Xem thiết bị', view: 'products' },
    }
  }

  if (/(đơn|kiểm tra|trạng thái)/.test(t)) {
    return {
      text: 'Sau khi đăng nhập, bạn xem được trạng thái đơn, lịch nhận máy và tiến độ hoàn cọc trong mục Đơn của tôi.',
      action: { label: 'Mở đơn thuê', view: 'orders' },
    }
  }

  if (/(cọc|đặt cọc|thanh toán)/.test(t)) {
    return {
      text: 'Tiền cọc được thu khi bàn giao và hoàn lại sau khi kiểm tra thiết bị. Bạn có thể thanh toán khi nhận máy hoặc chuyển khoản theo hướng dẫn trên trang đơn.',
    }
  }

  if (/(giao|nhận|ship|vận chuyển)/.test(t)) {
    return {
      text: 'A.I.R giao máy tận nơi trong khu vực hỗ trợ. Phí giao hiển thị ở bước đặt thuê, bạn cũng có thể chọn nhận tại cửa hàng.',
    }
  }

  if (/(hoàn|trả|hỏng|bảo hành|sự cố)/.test(t)) {
    return {
      text: 'Khi trả máy, nhân viên kiểm tra tình trạng cùng bạn. Thiết bị hư hỏng do sử dụng sai có thể phát sinh phí theo chính sách thuê.',
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

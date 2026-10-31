// Trợ lý A.I.R phiên bản rule-based.
// Mọi "trí tuệ" của bot nằm ở đây, tách khỏi phần giao diện để sau này
// thay bằng API/LLM mà không phải sửa ChatWidget.

import { money } from '../../lib/format.js'

export const GREETING = 'Xin chào! Mình là A.I.R. Bạn cần mình hỗ trợ thuê thiết bị nào?'

export const SUGGESTIONS = [
  'Tìm laptop cho học tập',
  'Cách thuê thiết bị',
  'Cách tính giá thuê',
  'Kiểm tra đơn thuê',
]

/**
 * Sinh câu trả lời cho một tin nhắn.
 * @param {string} text
 * @param {{ products: object[], orders: object[] }} context
 * @returns {{ text: string, products?: object[], action?: { label: string, view: string } }}
 */
export const buildReply = (text, { products = [], orders = [] }) => {
  const t = text.toLowerCase()

  if (/(laptop|học tập|sinh viên|đồ hoạ|đồ họa|văn phòng)/.test(t)) {
    return {
      text: 'Cho học tập, mình đề xuất MacBook Air M3 vì pin lâu và Dell XPS 13 vì gọn nhẹ. Bạn có thể xem chi tiết ngay:',
      products: products.filter((p) => p.name === 'MacBook Air M3' || p.name === 'Dell XPS 13'),
    }
  }

  if (/(giá|bao nhiêu|tính tiền|chi phí)/.test(t)) {
    return {
      text: 'Giá thuê = giá/ngày × số ngày × số lượng. Thuê tối thiểu 1 ngày, càng nhiều ngày càng tiết kiệm. Giao hàng nội thành 50.000 ₫, nhận tại cửa hàng miễn phí.',
      action: { label: 'Xem bảng giá thiết bị', view: 'products' },
    }
  }

  if (/(cách|quy trình|3 bước|đặt thuê)/.test(t)) {
    return {
      text: 'Chỉ 3 bước: (1) chọn thiết bị và thời gian thuê, (2) điền thông tin nhận máy, (3) nhận thiết bị đã kiểm định và trải nghiệm. Không cần đặt cọc trước với đơn demo.',
      action: { label: 'Chọn thiết bị ngay', view: 'products' },
    }
  }

  if (/(đơn|kiểm tra|trạng thái)/.test(t)) {
    const latest = orders[0]
    return {
      text: latest
        ? `Đơn gần nhất của bạn là ${latest.code}, trạng thái “${latest.status}”, tổng ${money(latest.total)}.`
        : 'Bạn chưa có đơn thuê nào. Mình có thể gợi ý thiết bị phù hợp nếu bạn cho biết nhu cầu.',
      action: latest
        ? { label: 'Xem đơn thuê', view: 'orders' }
        : { label: 'Khám phá thiết bị', view: 'products' },
    }
  }

  if (/(cọc|đặt cọc|thanh toán)/.test(t)) {
    return {
      text: 'Với đơn demo, bạn không cần đặt cọc và không phát sinh giao dịch thật. Khi chạy thật, A.I.R thường thu cọc 30% giá trị thiết bị và hoàn lại khi trả máy đúng hạn.',
    }
  }

  if (/(giao|nhận|ship|vận chuyển)/.test(t)) {
    return {
      text: 'Giao hàng nội thành trong 24h, phí 50.000 ₫. Bạn cũng có thể chọn nhận tại cửa hàng để miễn phí và nhận máy sớm hơn.',
    }
  }

  if (/(hoàn|trả|hỏng|bảo hành|sự cố)/.test(t)) {
    return {
      text: 'Thiết bị được kiểm tra 12 bước trước khi giao. Nếu có sự cố kỹ thuật, đội ngũ hỗ trợ 7 ngày/tuần sẽ đổi máy hoặc xử lý trong 24h.',
    }
  }

  if (/(xin chào|chào|hello|hi\b)/.test(t)) {
    return {
      text: 'Chào bạn! Bạn đang tìm thiết bị gì? Mình có thể gợi ý theo nhu cầu và ngân sách.',
    }
  }

  return {
    text: 'Mình chưa hiểu rõ câu hỏi. Bạn có thể hỏi về thiết bị, giá thuê, giao nhận, đặt cọc, hoàn trả hoặc cách đặt thuê nhé.',
  }
}

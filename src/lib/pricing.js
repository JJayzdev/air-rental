// Công thức giá dùng chung cho giỏ hàng, chi tiết sản phẩm và checkout.
// Một nguồn duy nhất để tránh lệch số giữa các màn hình.
// Khi có backend, cùng công thức này phải được tính lại phía server.

export const lineTotal = (price, days, quantity = 1) => price * days * quantity

/** Tổng tạm tính của giỏ: mỗi dòng giữ số ngày riêng. */
export const cartSubtotal = (items) =>
  items.reduce((sum, item) => sum + lineTotal(item.product.price, item.days, item.quantity), 0)

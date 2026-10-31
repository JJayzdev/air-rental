/** Kiểu dữ liệu dùng chung toàn app. Khi có backend, đây là nơi map sang schema DB. */

export type CategoryId = 'Laptop' | 'Điện thoại' | 'Máy ảnh' | 'Tablet' | 'Phụ kiện'

/** Bộ lọc danh mục: 'all' + từng danh mục. */
export type CategoryFilter = 'all' | CategoryId

/** Thứ tự sắp xếp danh sách sản phẩm. */
export type SortOption = 'popular' | 'low' | 'high'

export interface Category {
  id: CategoryFilter
  label: string
  icon: string
}

export interface Product {
  id: number
  name: string
  category: CategoryId
  /** Giá thuê mỗi ngày, đơn vị VND, số nguyên. */
  price: number
  image: string
  specs: string
  /** Số máy sẵn có. GĐ 1 sẽ thay bằng kiểm tra tồn kho theo ngày. */
  available: number
}

export interface CartItem {
  product: Product
  quantity: number
  days: number
}

export interface OrderItem {
  id: number
  name: string
  image: string
  price: number
  quantity: number
}

export type DeliveryMethod = 'delivery' | 'store'

/** Dữ liệu form checkout gửi lên trước khi thành đơn. */
export interface BookingInput {
  start: string
  end: string
  days: number
  quantity: number
  method: DeliveryMethod
  name: string
  phone: string
  address: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
}

export interface Order extends Omit<BookingInput, 'quantity'> {
  code: string
  status: string
  createdAt: string
}

export interface User {
  contact: string
  name?: string
  phone?: string
}

export type View =
  'home' | 'products' | 'detail' | 'cart' | 'checkout' | 'success' | 'orders' | 'account'

export interface ChatAction {
  label: string
  view: View
}

/** Tuỳ chọn khi điều hướng: đổi danh mục, reset bộ lọc, cuộn tới section. */
export interface NavOptions {
  category?: CategoryFilter
  resetFilters?: boolean
  anchor?: string
}

export interface ChatSeed {
  id: number
  text: string
}

export interface ChatReply {
  text: string
  products?: Product[]
  action?: ChatAction
}

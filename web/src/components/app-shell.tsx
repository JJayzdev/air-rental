'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Header from './layout/Header'
import Footer from './layout/Footer'
import BottomNav from './layout/BottomNav'
import ChatLauncher from './layout/ChatLauncher'
import ChatWidget from './chat/ChatWidget'
import Toast from './ui/Toast'
import HomeView from '@/views/HomeView'
import ProductsView from '@/views/ProductsView'
import ProductDetailView from '@/views/ProductDetailView'
import CartView from '@/views/CartView'
import CheckoutView from '@/views/CheckoutView'
import CheckoutSuccessView from '@/views/CheckoutSuccessView'
import OrdersView from '@/views/OrdersView'
import AccountView from '@/views/AccountView'
import { PRODUCTS, findProduct } from '@/data/products'
import { load, save, storageKeys } from '@/lib/storage'
import { generateOrderCode } from '@/lib/order-code'
import type {
  BookingInput,
  CartItem,
  CategoryFilter,
  ChatSeed,
  NavOptions,
  Order,
  Product,
  SortOption,
  User,
  View,
} from '@/types'

const CHAT_PROMPTS = {
  support: 'Trung tâm trợ giúp có những gì?',
  contact: 'Mình cần liên hệ A.I.R',
  consult: 'Tư vấn thiết bị phù hợp giúp mình',
} as const

export default function AppShell() {
  const [view, setView] = useState<View>('home')
  const [activeId, setActiveId] = useState(PRODUCTS[0].id)
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sort, setSort] = useState<SortOption>('popular')
  const [query, setQuery] = useState('')

  const [cart, setCart] = useState<CartItem[]>(() => load<CartItem[]>(storageKeys.cart, []))
  const [orders, setOrders] = useState<Order[]>(() => load<Order[]>(storageKeys.orders, []))
  const [favorites, setFavorites] = useState<number[]>(() =>
    load<number[]>(storageKeys.favorites, []),
  )
  const [user, setUser] = useState<User | null>(() => load<User | null>(storageKeys.user, null))

  const [lastOrder, setLastOrder] = useState<Order | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatSeed, setChatSeed] = useState<ChatSeed | null>(null)

  const toastTimer = useRef<number | null>(null)
  const pendingAnchor = useRef<string | null>(null)

  useEffect(() => save(storageKeys.cart, cart), [cart])
  useEffect(() => save(storageKeys.orders, orders), [orders])
  useEffect(() => save(storageKeys.favorites, favorites), [favorites])
  useEffect(() => save(storageKeys.user, user), [user])

  // Đổi màn hình thì cuộn lên đầu, trừ khi đích đến là một section cụ thể (anchor).
  useEffect(() => {
    const anchor = pendingAnchor.current
    pendingAnchor.current = null

    if (anchor) {
      const target = document.getElementById(anchor)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }

    window.scrollTo(0, 0)
  }, [view])

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }

  const go = (next: View, options: NavOptions = {}) => {
    if (options.category !== undefined) setCategory(options.category)
    if (options.resetFilters) {
      setCategory('all')
      setQuery('')
      setSort('popular')
    }

    if (options.anchor) {
      // Đã ở đúng trang thì cuộn ngay, không cần đổi state (tránh setState trong effect).
      if (next === view) {
        const target = document.getElementById(options.anchor)
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
      }
      pendingAnchor.current = options.anchor
    }

    setView(next)
  }

  const openChat = (promptKey?: keyof typeof CHAT_PROMPTS) => {
    setChatOpen(true)
    if (promptKey) setChatSeed({ id: Date.now(), text: CHAT_PROMPTS[promptKey] })
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const visibleProducts = useMemo(() => {
    let list = PRODUCTS.filter((product) => category === 'all' || product.category === category)

    const keyword = query.trim().toLowerCase()
    if (keyword) {
      list = list.filter((product) =>
        `${product.name} ${product.category} ${product.specs}`.toLowerCase().includes(keyword),
      )
    }

    if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price)

    return list
  }, [category, query, sort])

  const addToCart = (product: Product, days = 3, quantity = 1) => {
    setCart((list) => {
      const index = list.findIndex((item) => item.product.id === product.id)
      if (index === -1) return [...list, { product, quantity, days }]

      const copy = [...list]
      const current = copy[index]
      copy[index] = {
        ...current,
        days,
        quantity: Math.min(product.available, current.quantity + quantity),
      }
      return copy
    })
    showToast(`Đã thêm ${product.name} vào giỏ thuê`)
  }

  const changeQty = (id: number, delta: number) => {
    setCart((list) =>
      list.map((item) => {
        if (item.product.id !== id) return item
        const max = item.product.available
        return { ...item, quantity: Math.min(max, Math.max(1, item.quantity + delta)) }
      }),
    )
  }

  const removeItem = (id: number) => {
    setCart((list) => list.filter((item) => item.product.id !== id))
    showToast('Đã xóa thiết bị khỏi giỏ thuê')
  }

  const toggleFavorite = (product: Product) => {
    setFavorites((list) =>
      list.includes(product.id) ? list.filter((id) => id !== product.id) : [...list, product.id],
    )
  }

  const placeOrder = (booking: BookingInput) => {
    const order: Order = {
      code: generateOrderCode(),
      status: 'Chờ xác nhận',
      createdAt: new Date().toISOString(),
      name: booking.name,
      phone: booking.phone,
      address: booking.address,
      method: booking.method,
      start: booking.start,
      end: booking.end,
      days: booking.days,
      items: booking.items,
      subtotal: booking.subtotal,
      shipping: booking.shipping,
      total: booking.total,
    }

    setOrders((list) => [order, ...list])
    setLastOrder(order)
    setCart([])
    go('success')
  }

  const openProduct = (product: Product) => {
    setActiveId(product.id)
    go('detail')
  }

  const detailProduct = findProduct(activeId) || PRODUCTS[0]

  const renderView = () => {
    switch (view) {
      case 'products':
        return (
          <ProductsView
            products={visibleProducts}
            favorites={favorites}
            category={category}
            sort={sort}
            query={query}
            onCategory={setCategory}
            onSort={setSort}
            onDetail={openProduct}
            onRent={(product) => addToCart(product)}
            onToggleFavorite={toggleFavorite}
            onReset={() => go('products', { resetFilters: true })}
          />
        )

      case 'detail':
        return (
          <ProductDetailView
            product={detailProduct}
            onBack={() => go('products')}
            onAdd={(product, days, quantity) => addToCart(product, days, quantity)}
            onRentNow={(product, days, quantity) => {
              addToCart(product, days, quantity)
              go('checkout')
            }}
          />
        )

      case 'cart':
        return (
          <CartView
            items={cart}
            onChangeQty={changeQty}
            onRemove={removeItem}
            onCheckout={() => go('checkout')}
            onBrowse={() => go('products')}
          />
        )

      case 'checkout':
        return (
          <CheckoutView
            items={cart}
            initialDays={cart[0]?.days || 1}
            user={user}
            onBack={() => go('cart')}
            onSubmit={placeOrder}
          />
        )

      case 'success':
        return (
          <CheckoutSuccessView
            order={lastOrder}
            onOrders={() => go('orders')}
            onHome={() => go('home')}
          />
        )

      case 'orders':
        return <OrdersView orders={orders} onBrowse={() => go('products')} />

      case 'account':
        return (
          <AccountView
            user={user}
            favoritesCount={favorites.length}
            onLogin={(contact) => {
              setUser({ contact })
              showToast('Đăng nhập demo thành công')
              go('orders')
            }}
            onLogout={() => {
              setUser(null)
              showToast('Đã đăng xuất')
            }}
            onOrders={() => go('orders')}
            onBrowse={() => go('products')}
          />
        )

      case 'home':
      default:
        return (
          <HomeView
            products={PRODUCTS}
            favorites={favorites}
            onNavigate={go}
            onDetail={openProduct}
            onRent={(product) => addToCart(product)}
            onToggleFavorite={toggleFavorite}
            onOpenChat={openChat}
          />
        )
    }
  }

  return (
    <div className="app">
      <Header
        cartCount={cartCount}
        user={user}
        onNavigate={go}
        onSearch={(term) => {
          setQuery(term)
          setCategory('all')
          go('products')
        }}
      />

      {renderView()}

      <Footer onNavigate={go} onOpenChat={openChat} />

      <BottomNav view={view} onNavigate={go} />

      {!chatOpen && <ChatLauncher onOpen={() => setChatOpen(true)} />}

      <ChatWidget
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        seed={chatSeed}
        products={PRODUCTS}
        orders={orders}
        onNavigate={go}
        onProduct={(id) => {
          setActiveId(id)
          go('detail')
        }}
      />

      <Toast message={toast} />
    </div>
  )
}

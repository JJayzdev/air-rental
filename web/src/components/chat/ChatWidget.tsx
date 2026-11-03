'use client'

import { useEffect, useRef, useState } from 'react'
import Mascot from '../ui/Mascot'
import { Close, Send } from '../ui/Icons'
import { money, nowTime } from '@/lib/format'
import Link from 'next/link'
import { buildDemoReply, GREETING, SUGGESTIONS } from './chat-engine'
import type { ChatReply, ChatSeed, NavOptions, View } from '@/types'

interface Message extends ChatReply {
  id: number
  role: 'bot' | 'user'
  time: string
}

let seq = 0
const nextId = () => {
  seq += 1
  return seq
}

interface ChatWidgetProps {
  open: boolean
  onClose: () => void
  seed: ChatSeed | null
  onNavigate: (view: View, options?: NavOptions) => void
  llmEnabled?: boolean
  offlineFaq?: boolean
}

export default function ChatWidget({
  open,
  onClose,
  seed,
  onNavigate,
  llmEnabled = false,
  offlineFaq = false,
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: nextId(),
      role: 'bot',
      text: offlineFaq
        ? 'Xin chào! Mình là FAQ local của đồ án A.I.R. Dữ liệu trong bản demo là giả lập.'
        : GREETING,
      time: 'Bây giờ',
    },
  ])
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const [availabilityProduct, setAvailabilityProduct] = useState<{
    id: string
    name: string
  } | null>(null)
  const [rentalDates, setRentalDates] = useState({ startDate: '', endDate: '' })
  const generation = useRef(0)
  const bodyRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(false)
  const closeRef = useRef(onClose)
  const lastSeed = useRef<number | null>(null)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  const send = (raw: string) => {
    const text = String(raw || '').trim()
    if (!text) return

    setMessages((list) => [...list, { id: nextId(), role: 'user', text, time: nowTime() }])
    setDraft('')
    if (offlineFaq) {
      const reply = buildDemoReply(text)
      setMessages((list) => [...list, { ...reply, id: nextId(), role: 'bot', time: nowTime() }])
      return
    }
    setTyping(true)
    const requestGeneration = generation.current

    void fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'message', message: text }),
    })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Chat unavailable')
        if (generation.current === requestGeneration)
          setMessages((list) => [
            ...list,
            {
              id: nextId(),
              role: 'bot',
              time: nowTime(),
              text: result.text,
              catalogProducts: result.products,
            },
          ])
      })
      .catch(() => {
        if (generation.current === requestGeneration)
          setMessages((list) => [
            ...list,
            {
              id: nextId(),
              role: 'bot',
              time: nowTime(),
              text: 'Mình chưa thể kết nối lúc này. Vui lòng thử lại sau.',
            },
          ])
      })
      .finally(() => {
        if (generation.current === requestGeneration) setTyping(false)
      })
  }

  const sendRef = useRef(send)
  useEffect(() => {
    sendRef.current = send
  })

  const sendAvailability = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!availabilityProduct || !rentalDates.startDate || !rentalDates.endDate) return
    const product = availabilityProduct
    const payload = { action: 'checkAvailability', productId: product.id, ...rentalDates }
    const requestGeneration = generation.current
    setMessages((list) => [
      ...list,
      {
        id: nextId(),
        role: 'user',
        text: `${product.name}: ${rentalDates.startDate} – ${rentalDates.endDate}`,
        time: nowTime(),
      },
    ])
    setTyping(true)
    setAvailabilityProduct(null)
    void fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const result = await response.json()
        if (generation.current === requestGeneration)
          setMessages((list) => [
            ...list,
            {
              id: nextId(),
              role: 'bot',
              text: result.text ?? result.error ?? 'Mình chưa thể kiểm tra lịch.',
              time: nowTime(),
            },
          ])
      })
      .catch(() => {
        if (generation.current === requestGeneration)
          setMessages((list) => [
            ...list,
            {
              id: nextId(),
              role: 'bot',
              text: 'Mình chưa thể kết nối lúc này. Vui lòng thử lại sau.',
              time: nowTime(),
            },
          ])
      })
      .finally(() => {
        if (generation.current === requestGeneration) setTyping(false)
      })
  }

  useEffect(() => {
    if (!open) return
    wasOpen.current = true
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body &&
      document.activeElement !== document.documentElement
        ? document.activeElement
        : null
    panelRef.current?.querySelector<HTMLInputElement>('.chat-input input')?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      const focusOutsidePanel = !panelRef.current.contains(document.activeElement)
      if (event.shiftKey && (document.activeElement === first || focusOutsidePanel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || focusOutsidePanel)) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (open || !wasOpen.current) return
    wasOpen.current = false
    const target = previouslyFocused.current?.isConnected
      ? previouslyFocused.current
      : document.querySelector<HTMLElement>('.assistant-fab')
    if (target?.isConnected) target.focus()
    previouslyFocused.current = null
  }, [open])

  // Mở chat từ footer/CTA với câu hỏi gợi ý sẵn
  useEffect(() => {
    if (open && seed && seed.id !== lastSeed.current) {
      lastSeed.current = seed.id
      sendRef.current(seed.text)
    }
  }, [open, seed])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, typing])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      className="chat-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Trợ lý A.I.R"
    >
      <div className="chat-head">
        <Mascot small />
        <div>
          <strong>Trợ lý A.I.R</strong>
          <span>
            <i /> Đang hỗ trợ
          </span>
        </div>
        <button aria-label="Đóng" onClick={onClose}>
          <Close />
        </button>
      </div>

      <div className="chat-body" ref={bodyRef}>
        <div
          className="messages"
          aria-live="polite"
          aria-relevant="additions text"
          aria-atomic="false"
        >
          {messages.map((message) => (
            <div className={`message-row ${message.role}`} key={message.id}>
              {message.role === 'bot' && <Mascot small />}
              <div>
                <div className="bubble">
                  {message.text}
                  {message.catalogProducts && (
                    <div className="mini-products">
                      {message.catalogProducts.map((product) => (
                        <div className="chat-catalog-product" key={product.id}>
                          <Link href={`/san-pham/${product.slug}`} onClick={onClose}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {product.imageUrl && <img alt="" src={product.imageUrl} />}
                            <span>
                              {product.name}
                              <small>{money(product.pricePerDayVnd)}/ngày</small>
                              {product.isSample && <small>Giá mẫu — cần xác minh</small>}
                            </span>
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              setAvailabilityProduct({ id: product.id, name: product.name })
                            }
                          >
                            Kiểm tra lịch
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {message.action && (
                  <button
                    className="chat-action"
                    onClick={() => {
                      onNavigate(message.action!.view)
                      onClose()
                    }}
                  >
                    {message.action.label}
                  </button>
                )}

                <time>{message.time}</time>
              </div>
            </div>
          ))}

          {typing && (
            <div className="message-row bot">
              <Mascot small />
              <div>
                <div className="bubble">
                  <span className="typing" role="status" aria-label="Trợ lý đang soạn tin nhắn">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </div>
            </div>
          )}

          {messages.length === 1 && !typing && (
            <div className="suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} onClick={() => send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {availabilityProduct && (
        <form
          className="chat-availability"
          onSubmit={sendAvailability}
          aria-label={`Kiểm tra lịch ${availabilityProduct.name}`}
        >
          <strong>{availabilityProduct.name}</strong>
          <label>
            Ngày bắt đầu
            <input
              required
              type="date"
              value={rentalDates.startDate}
              onChange={(event) =>
                setRentalDates((dates) => ({ ...dates, startDate: event.target.value }))
              }
            />
          </label>
          <label>
            Ngày kết thúc
            <input
              required
              type="date"
              value={rentalDates.endDate}
              onChange={(event) =>
                setRentalDates((dates) => ({ ...dates, endDate: event.target.value }))
              }
            />
          </label>
          <button type="submit">Kiểm tra</button>
          <button type="button" onClick={() => setAvailabilityProduct(null)}>
            Đóng
          </button>
        </form>
      )}

      <form
        className="chat-input"
        onSubmit={(event) => {
          event.preventDefault()
          send(draft)
        }}
      >
        <input
          placeholder="Nhập câu hỏi của bạn..."
          aria-label="Tin nhắn"
          value={draft}
          maxLength={500}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" aria-label="Gửi">
          <Send />
        </button>
      </form>

      {llmEnabled && (
        <p className="chat-privacy-notice">
          Câu hỏi tự do có thể được gửi đến OpenAI. Tránh nhập thông tin cá nhân.
        </p>
      )}

      <button
        className="clear-chat"
        onClick={() => {
          generation.current += 1
          setMessages([{ id: nextId(), role: 'bot', text: GREETING, time: 'Bây giờ' }])
          setTyping(false)
          setDraft('')
          setAvailabilityProduct(null)
        }}
      >
        Xóa cuộc trò chuyện
      </button>
    </div>
  )
}

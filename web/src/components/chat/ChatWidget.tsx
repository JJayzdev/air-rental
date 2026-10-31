'use client'

import { useEffect, useRef, useState } from 'react'
import Mascot from '../ui/Mascot'
import { Close, Send } from '../ui/Icons'
import { money, nowTime } from '@/lib/format'
import { GREETING, SUGGESTIONS, buildReply } from './chat-engine'
import type { ChatReply, ChatSeed, NavOptions, Order, Product, View } from '@/types'

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
  products: Product[]
  orders: Order[]
  onNavigate: (view: View, options?: NavOptions) => void
  onProduct: (id: number) => void
}

export default function ChatWidget({
  open,
  onClose,
  seed,
  products,
  orders,
  onNavigate,
  onProduct,
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: nextId(), role: 'bot', text: GREETING, time: 'Bây giờ' },
  ])
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)
  const lastSeed = useRef<number | null>(null)

  const send = (raw: string) => {
    const text = String(raw || '').trim()
    if (!text) return

    setMessages((list) => [...list, { id: nextId(), role: 'user', text, time: nowTime() }])
    setDraft('')
    setTyping(true)

    const reply = buildReply(text, { products, orders })
    window.setTimeout(() => {
      setMessages((list) => [...list, { id: nextId(), role: 'bot', time: nowTime(), ...reply }])
      setTyping(false)
    }, 700)
  }

  // Mở chat từ footer/CTA với câu hỏi gợi ý sẵn
  useEffect(() => {
    if (open && seed && seed.id !== lastSeed.current) {
      lastSeed.current = seed.id
      send(seed.text)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, typing])

  if (!open) return null

  return (
    <div className="chat-panel" role="dialog" aria-label="Trợ lý A.I.R">
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
        <div className="messages">
          {messages.map((message) => (
            <div className={`message-row ${message.role}`} key={message.id}>
              {message.role === 'bot' && <Mascot small />}
              <div>
                <div className="bubble">
                  {message.text}
                  {message.products && (
                    <div className="mini-products">
                      {message.products.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => {
                            onProduct(product.id)
                            onClose()
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img alt={product.name} src={product.image} />
                          <span>
                            {product.name}
                            <small>{money(product.price)}/ngày</small>
                          </span>
                        </button>
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
                  <span className="typing">
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
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" aria-label="Gửi">
          <Send />
        </button>
      </form>

      <button className="clear-chat" onClick={() => setMessages([])}>
        Xóa cuộc trò chuyện
      </button>
    </div>
  )
}

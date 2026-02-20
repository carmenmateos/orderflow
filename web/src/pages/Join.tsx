import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import type { Order, OrderItem } from 'shared/types'
import { supabase, ensureAnonymousSession } from '../lib/supabase'

function groupByPerson(items: OrderItem[]) {
  const map = new Map<string, OrderItem[]>()
  for (const item of items) {
    const name = item.guest_name || 'No name'
    if (!map.has(name)) map.set(name, [])
    map.get(name)!.push(item)
  }
  return Array.from(map.entries())
}

export default function Join() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [guestName, setGuestName] = useState('')
  const [dish, setDish] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    ensureAnonymousSession().then(() => setSessionReady(true))
  }, [])

  useEffect(() => {
    if (!orderId) return

    const load = async () => {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderErr || !orderData) {
        setError('Order not found')
        setLoading(false)
        return
      }
      setOrder(orderData as Order)

      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
      setItems((itemsData as OrderItem[]) || [])
      setLoading(false)
    }

    load()
  }, [orderId])

  useEffect(() => {
    if (!orderId) return

    const channel = supabase
      .channel(`order:${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems((prev) => [...prev, payload.new as OrderItem])
          }
          if (payload.eventType === 'DELETE') {
            setItems((prev) => prev.filter((i) => i.id !== (payload.old as OrderItem).id))
          }
          if (payload.eventType === 'UPDATE') {
            setItems((prev) => prev.map((i) => (i.id === (payload.new as OrderItem).id ? (payload.new as OrderItem) : i)))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderId || !guestName.trim() || !dish.trim() || !sessionReady) return
    setSending(true)
    const { error: insertErr } = await supabase.from('order_items').insert({
      order_id: orderId,
      guest_name: guestName.trim(),
      dish: dish.trim(),
      price: price ? parseFloat(price) : null,
      notes: notes.trim() || '',
    })
    setSending(false)
    if (!insertErr) {
      setDish('')
      setPrice('')
      setNotes('')
    }
  }

  const total = items.reduce((sum, i) => sum + (i.price ?? 0), 0)
  const grouped = useMemo(() => groupByPerson(items), [items])

  if (loading) return <div className="page">Loading...</div>
  if (error || !order) return <div className="page">{error || 'Order not found'}</div>
  if (order.locked) return <div className="page">This order is now closed.</div>

  return (
    <div className="page">
      <header className="header">
        <h1>{order.title}</h1>
        {order.subtitle ? <p className="subtitle">{order.subtitle}</p> : null}
      </header>

      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          placeholder="Your name or nickname"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Dish"
          value={dish}
          onChange={(e) => setDish(e.target.value)}
          required
        />
        <input
          type="number"
          step="0.01"
          placeholder="Price (optional)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <input
          type="text"
          placeholder="Notes (no onions, allergies...)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button type="submit" disabled={sending || !sessionReady}>
          {!sessionReady ? 'Connecting...' : 'Add'}
        </button>
      </form>

      <section className="list">
        <h2>Live order</h2>
        {grouped.map(([name, personItems]) => (
          <div key={name} className="person-block">
            <strong className="person-name">{name}</strong>
            <ul>
              {personItems.map((item) => (
                <li key={item.id}>
                  {item.dish}
                  {item.notes ? ` (${item.notes})` : ''}
                  {item.price != null ? ` — $${Number(item.price).toFixed(2)}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {items.length > 0 && (
          <p className="total">Total: ${total.toFixed(2)}</p>
        )}
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
        .page { max-width: 420px; margin: 0 auto; padding: 20px; font-family: 'Open Sans', sans-serif; }
        .header { margin-bottom: 24px; }
        .header h1 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #1a1a1a; }
        .subtitle { margin: 4px 0 0; color: #666; font-size: 0.95rem; }
        .form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
        .form input, .form button { padding: 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 1rem; font-family: 'Open Sans', sans-serif; }
        .form input { background: #f9f9f9; }
        .form button { background: #ff751f; color: white; border: none; font-weight: 600; cursor: pointer; }
        .form button:disabled { opacity: 0.7; cursor: not-allowed; }
        .list h2 { font-size: 1.1rem; margin: 0 0 12px; font-weight: 600; }
        .person-block { margin-bottom: 16px; }
        .person-name { display: block; margin-bottom: 6px; font-size: 1rem; font-weight: 600; }
        .list ul { list-style: none; padding: 0; margin: 0; }
        .list li { padding: 6px 0; border-bottom: 1px solid #eee; font-size: 0.95rem; }
        .total { font-weight: 700; margin-top: 12px; font-size: 1.1rem; }
      `}</style>
    </div>
  )
}

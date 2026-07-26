import React, { useState } from 'react'

interface CartItem {
  product_id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

interface SplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  serviceCharge: number;
  taxRate: number;
  tipAmount: number;
  currency: string;
  onConfirmSplit: (splits: SplitResult[]) => void;
}

export interface SplitResult {
  label: string;
  items: CartItem[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  tip: number;
  total: number;
}

type SplitMode = 'equal' | 'by-item' | 'by-seat'

export default function SplitBillModal({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  serviceCharge,
  taxRate,
  tipAmount,
  currency,
  onConfirmSplit,
}: SplitBillModalProps) {
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [splitCount, setSplitCount] = useState<number>(2)
  // by-item: map item product_id to seat index (1-based)
  const [itemSeatMap, setItemSeatMap] = useState<Record<string, number>>({})

  if (!isOpen) return null

  const totalTax = subtotal * (taxRate / 100)
  const grandTotal = subtotal + serviceCharge + totalTax + tipAmount

  const fmt = (val: number) => `${currency}${val.toFixed(2)}`

  // ── Equal split ──────────────────────────────────────────────────────────
  const buildEqualSplits = (): SplitResult[] => {
    const perSeat = grandTotal / splitCount
    const perSubtotal = subtotal / splitCount
    const perService = serviceCharge / splitCount
    const perTax = totalTax / splitCount
    const perTip = tipAmount / splitCount

    return Array.from({ length: splitCount }, (_, i) => ({
      label: `Seat ${i + 1}`,
      items: cartItems,          // all items listed on every bill for reference
      subtotal: perSubtotal,
      serviceCharge: perService,
      tax: perTax,
      tip: perTip,
      total: perSeat,
    }))
  }

  // ── By-item split ────────────────────────────────────────────────────────
  const buildByItemSplits = (): SplitResult[] => {
    const seats: Record<number, CartItem[]> = {}
    for (let i = 1; i <= splitCount; i++) seats[i] = []

    for (const item of cartItems) {
      const seat = itemSeatMap[item.product_id] ?? 1
      seats[seat] = [...(seats[seat] || []), item]
    }

    return Array.from({ length: splitCount }, (_, i) => {
      const seatItems = seats[i + 1] || []
      const seatSubtotal = seatItems.reduce((s, it) => s + it.price * it.quantity, 0)
      const ratio = subtotal > 0 ? seatSubtotal / subtotal : 0
      const seatService = serviceCharge * ratio
      const seatTax = totalTax * ratio
      const seatTip = tipAmount * ratio
      return {
        label: `Seat ${i + 1}`,
        items: seatItems,
        subtotal: seatSubtotal,
        serviceCharge: seatService,
        tax: seatTax,
        tip: seatTip,
        total: seatSubtotal + seatService + seatTax + seatTip,
      }
    })
  }

  const computedSplits: SplitResult[] =
    splitMode === 'equal' ? buildEqualSplits() : buildByItemSplits()

  const handleAssignSeat = (productId: string, seat: number) => {
    setItemSeatMap(prev => ({ ...prev, [productId]: seat }))
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--panel-bg, #1a1f2e)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '1.25rem',
          padding: '2rem',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>🔀 Split Bill</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted, #aaa)', fontSize: '1.5rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Split Mode Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {(['equal', 'by-item'] as SplitMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setSplitMode(mode)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: `1px solid ${splitMode === mode ? 'var(--accent, #7c3aed)' : 'rgba(255,255,255,0.12)'}`,
                background: splitMode === mode ? 'rgba(124,58,237,0.15)' : 'transparent',
                color: splitMode === mode ? 'var(--accent, #7c3aed)' : 'var(--text-muted, #aaa)',
                cursor: 'pointer',
                fontWeight: splitMode === mode ? 600 : 400,
                textTransform: 'capitalize',
                transition: 'all 0.2s ease',
              }}
            >
              {mode === 'equal' ? '⚖️ Equal Split' : '🍽️ Split by Item'}
            </button>
          ))}
        </div>

        {/* Number of Ways */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Split into:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setSplitCount(c => Math.max(2, c - 1))}
              style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}
            >−</button>
            <span style={{ minWidth: '2rem', textAlign: 'center', fontWeight: 700, fontSize: '1.2rem' }}>{splitCount}</span>
            <button
              onClick={() => setSplitCount(c => Math.min(12, c + 1))}
              style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}
            >+</button>
          </div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>ways</span>
        </div>

        {/* By-item seat assignment */}
        {splitMode === 'by-item' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Assign each item to a seat:
            </p>
            {cartItems.map(item => (
              <div
                key={item.product_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.6rem 0.75rem',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '0.5rem',
                  marginBottom: '0.4rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ×{item.quantity} · {fmt(item.price * item.quantity)}
                  </div>
                </div>
                <select
                  value={itemSeatMap[item.product_id] ?? 1}
                  onChange={e => handleAssignSeat(item.product_id, Number(e.target.value))}
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: '0.4rem',
                    background: 'var(--input-bg, #242836)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                >
                  {Array.from({ length: splitCount }, (_, i) => (
                    <option key={i + 1} value={i + 1}>Seat {i + 1}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Preview splits */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Preview:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {computedSplits.map((split, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.75rem',
                  padding: '0.85rem 1rem',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--accent, #7c3aed)' }}>{split.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Subtotal: {fmt(split.subtotal)}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Service: {fmt(split.serviceCharge)}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tax: {fmt(split.tax)}</div>
                {split.tip > 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tip: {fmt(split.tip)}</div>}
                <div style={{ fontWeight: 700, marginTop: '0.5rem', fontSize: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.4rem' }}>
                  {fmt(split.total)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.85rem 1rem',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>Grand Total</span>
          <strong style={{ fontSize: '1.1rem' }}>{fmt(grandTotal)}</strong>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: '0.6rem',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirmSplit(computedSplits)}
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: '0.6rem',
              border: 'none',
              background: 'var(--accent, #7c3aed)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✅ Confirm Split ({splitCount} ways)
          </button>
        </div>
      </div>
    </div>
  )
}

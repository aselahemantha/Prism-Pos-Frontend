import React, { useState, useEffect } from 'react'
import SplitBillModal, { SplitResult } from './SplitBillModal'

interface RestaurantPOSProps {
  apiCall: (path: string, options?: RequestInit) => Promise<any>;
  activeStoreID: string;
  products: any[];
  categories: any[];
  currency: string;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

export default function RestaurantPOS({
  apiCall,
  activeStoreID,
  products,
  categories,
  currency,
  setErrorMsg,
  setSuccessMsg
}: RestaurantPOSProps) {
  // Navigation & View States
  const [viewMode, setViewMode] = useState<'floor' | 'order'>('floor')
  
  // Floor Plan Data
  const [floorPlans, setFloorPlans] = useState<any[]>([])
  const [selectedFloorID, setSelectedFloorID] = useState<string | null>(null)
  const [tables, setTables] = useState<any[]>([])
  
  // Current Active Table/Order Context
  const [activeTable, setActiveTable] = useState<any | null>(null)
  const [activeOrderID, setActiveOrderID] = useState<string | null>(null)
  const [guestCount, setGuestCount] = useState<number>(2)
  const [cartItems, setCartItems] = useState<any[]>([])
  
  // Modifiers and notes state
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('')
  const [orderNotes, setOrderNotes] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Checkout modal
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [splitBillOpen, setSplitBillOpen] = useState(false)
  const [serviceChargeRate] = useState(10) // 10% standard service charge
  const [tipAmount, setTipAmount] = useState<string>('0')

  // Load initial floor plan and tables
  useEffect(() => {
    if (activeStoreID) {
      loadFloorPlanData()
    }
  }, [activeStoreID])

  const loadFloorPlanData = async () => {
    try {
      const plans = await apiCall('/restaurant/floor-plans')
      setFloorPlans(plans)
      if (plans && plans.length > 0) {
        setSelectedFloorID(plans[0].id)
      }
      
      const tableList = await apiCall('/restaurant/tables')
      setTables(tableList)
    } catch (err: any) {
      setErrorMsg('Failed to load restaurant floor plan data: ' + err.message)
    }
  }

  // Filter tables belonging to active floor plan
  const activeTables = tables.filter(t => t.floor_plan_id === selectedFloorID)

  // Start dining cart on table click
  const handleTableClick = async (table: any) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setActiveTable(table)
    
    if (table.status === 'EMPTY') {
      // Prompt for guest count first
      setGuestCount(2)
      setCartItems([])
      setOrderNotes('')
      setViewMode('order')
      setActiveOrderID(null)
    } else {
      // Occupied: Fetch or create associated active order
      try {
        // Find existing draft/active order for this table
        const orders = await apiCall('/orders?status=ACTIVE')
        const tableOrder = orders.find((o: any) => o.table_id === table.id)
        
        if (tableOrder) {
          setActiveOrderID(tableOrder.id)
          setCartItems(tableOrder.items.map((i: any) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            notes: i.notes || ''
          })))
          setOrderNotes(tableOrder.notes || '')
          setGuestCount(tableOrder.guest_count || 2)
        } else {
          // If no order but marked occupied, reset it to empty
          await apiCall(`/restaurant/tables/${table.id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'EMPTY' })
          })
          table.status = 'EMPTY'
          setCartItems([])
          setActiveOrderID(null)
        }
        setViewMode('order')
      } catch (err: any) {
        setErrorMsg('Failed to load table order details: ' + err.message)
      }
    }
  }

  // Cart operations
  const addToCart = (product: any) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product_id === product.id)
      if (existing) {
        return prev.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        notes: ''
      }]
    })
  }

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCartItems(prev => prev.filter(item => item.product_id !== productId))
      return
    }
    setCartItems(prev => prev.map(item =>
      item.product_id === productId ? { ...item, quantity: qty } : item
    ))
  }

  const updateItemNotes = (productId: string, notes: string) => {
    setCartItems(prev => prev.map(item =>
      item.product_id === productId ? { ...item, notes } : item
    ))
  }

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const serviceCharge = (subtotal * serviceChargeRate) / 100
  const grandTotal = subtotal + serviceCharge + parseFloat(tipAmount || '0')

  // Send KOT ticket to kitchen
  const handleSendToKitchen = async () => {
    if (cartItems.length === 0) return
    setErrorMsg(null)
    setSuccessMsg(null)
    
    try {
      let orderId = activeOrderID
      
      // 1. Create order if it doesn't exist
      if (!orderId) {
        // Generate dummy terminal ID or check from state
        const orderRes = await apiCall('/orders', {
          method: 'POST',
          body: JSON.stringify({
            terminal_id: '019f73c4-c967-783d-92cc-ad1784fa2367', // seeded fallback
            table_id: activeTable.id,
            guest_count: guestCount,
            notes: orderNotes,
            items: cartItems.map(item => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price
            }))
          })
        })
        orderId = orderRes.id
        setActiveOrderID(orderId)
        
        // Mark table as occupied
        await apiCall(`/restaurant/tables/${activeTable.id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'OCCUPIED' })
        })
        loadFloorPlanData()
      } else {
        // Update existing order items
        await apiCall(`/orders/${orderId}`, {
          method: 'PUT',
          body: JSON.stringify({
            notes: orderNotes,
            items: cartItems.map(item => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price
            }))
          })
        })
      }

      // 2. Submit KOT kitchen ticket
      await apiCall('/restaurant/kitchen-tickets', {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId,
          ticket_number: `KOT-${activeTable.name}-${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
          items: cartItems.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            notes: item.notes
          }))
        })
      })

      setSuccessMsg('Kitchen Ticket (KOT) sent to chef successfully!')
    } catch (err: any) {
      setErrorMsg('Failed to send kitchen ticket: ' + err.message)
    }
  }

  // Settle bill / checkout
  const handleCheckout = async () => {
    if (cartItems.length === 0) return
    setErrorMsg(null)
    setSuccessMsg(null)
    
    try {
      let orderId = activeOrderID
      if (!orderId) {
        setErrorMsg('Please send the order to kitchen / save first before checkout')
        return
      }

      // Process payment (Simulating total settlement)
      await apiCall(`/orders/${orderId}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: grandTotal,
          method: 'CASH'
        })
      })

      // Mark table empty
      await apiCall(`/restaurant/tables/${activeTable.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'EMPTY' })
      })

      setSuccessMsg(`Table ${activeTable.name} settled successfully! Total paid: ${currency} ${grandTotal.toFixed(2)}`)
      setCheckoutOpen(false)
      setViewMode('floor')
      loadFloorPlanData()
    } catch (err: any) {
      setErrorMsg('Checkout failed: ' + err.message)
    }
  }

  return (
    <div className="restaurant-pos-container" style={{ color: '#fff', height: '80vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {viewMode === 'floor' ? (
          <>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {floorPlans.map(plan => (
                <button
                  key={plan.id}
                  className={`btn ${selectedFloorID === plan.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedFloorID(plan.id)}
                >
                  📍 {plan.name}
                </button>
              ))}
            </div>
            <span style={{ color: 'var(--text-muted)' }}>Real-time Dining Status</span>
          </>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={() => { setViewMode('floor'); loadFloorPlanData(); }}>
              ← Return to Floor Map
            </button>
            <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
              🍽️ {activeTable?.name} (Covers: {guestCount})
            </div>
          </>
        )}
      </div>

      {/* VIEW: FLOOR MAP SELECTION */}
      {viewMode === 'floor' && (
        <div style={{ flex: 1, padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem', overflowY: 'auto' }}>
          {activeTables.map(table => {
            const isOccupied = table.status === 'OCCUPIED';
            const isReserved = table.status === 'RESERVED';
            
            let cardBg = 'rgba(255,255,255,0.03)';
            let borderColor = 'rgba(255,255,255,0.08)';
            let glow = 'none';

            if (isOccupied) {
              cardBg = 'rgba(245, 158, 11, 0.05)';
              borderColor = 'rgba(245, 158, 11, 0.3)';
              glow = '0 0 15px rgba(245, 158, 11, 0.15)';
            } else if (isReserved) {
              cardBg = 'rgba(59, 130, 246, 0.05)';
              borderColor = 'rgba(59, 130, 246, 0.3)';
              glow = '0 0 15px rgba(59, 130, 246, 0.15)';
            } else {
              cardBg = 'rgba(16, 185, 129, 0.03)';
              borderColor = 'rgba(16, 185, 129, 0.2)';
              glow = '0 0 15px rgba(16, 185, 129, 0.08)';
            }

            return (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                style={{
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '16px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  boxShadow: glow,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '140px'
                }}
                className="table-card"
              >
                <div style={{ fontSize: '1.3rem', fontWeight: '700' }}>{table.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Seats: {table.capacity}</div>
                
                <div style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '50px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'inline-block',
                  margin: '0 auto',
                  background: isOccupied ? '#f59e0b' : isReserved ? '#3b82f6' : '#10b981',
                  color: '#000'
                }}>
                  {table.status}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: ORDERING & CART PANEL */}
      {viewMode === 'order' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* Left Side: Product Grid */}
          <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.08)', padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              <button
                className={`btn ${selectedCategoryFilter === '' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedCategoryFilter('')}
              >
                All Items
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`btn ${selectedCategoryFilter === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem', overflowY: 'auto' }}>
              {products
                .filter(p => selectedCategoryFilter === '' || p.category_id === selectedCategoryFilter)
                .map(product => (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '12px',
                      padding: '1rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.1s ease'
                    }}
                    className="product-card"
                  >
                    <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{product.name}</div>
                    <div style={{ color: 'var(--accent)', fontWeight: '700' }}>{currency} {product.price.toFixed(2)}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Right Side: Active Dining Cart */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)', padding: '1rem' }}>
            <h4 style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>Current Order</h4>
            
            {/* Guest Count Selector */}
            {!activeOrderID && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.85rem' }}>Guest Count:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setGuestCount(Math.max(1, guestCount - 1))}>-</button>
                  <span style={{ fontWeight: '600' }}>{guestCount}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => setGuestCount(guestCount + 1)}>+</button>
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
              {cartItems.map(item => (
                <div key={item.product_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '500' }}>
                    <span>{item.product_name}</span>
                    <span>{currency} {(item.quantity * item.unit_price).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }} onClick={() => updateCartQty(item.product_id, item.quantity - 1)}>-</button>
                      <span>{item.quantity}</span>
                      <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }} onClick={() => updateCartQty(item.product_id, item.quantity + 1)}>+</button>
                    </div>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Chef instructions..."
                      value={item.notes}
                      onChange={(e) => updateItemNotes(item.product_id, e.target.value)}
                      style={{ maxWidth: '140px', background: 'rgba(255,255,255,0.02)', color: '#fff', fontSize: '0.75rem' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Summary */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span>Subtotal:</span>
                <span>{currency} {subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>
                <span>Service Charge ({serviceChargeRate}%):</span>
                <span>{currency} {serviceCharge.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '1.2rem', color: 'var(--accent)', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.5rem' }}>
                <span>Grand Total:</span>
                <span>{currency} {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout / Kitchen Submission Controls */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleSendToKitchen} disabled={cartItems.length === 0}>
                🍳 Send KOT
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setCheckoutOpen(true)} disabled={cartItems.length === 0}>
                💳 Settle Bill
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SETTLE BILL DIALOG MODAL */}
      {checkoutOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '1.5rem', borderRadius: '16px' }}>
            <h3>💳 Bill Settlement</h3>
            
            <div style={{ margin: '1rem 0', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Bill Subtotal:</span>
                <span>{currency} {subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Service Charge:</span>
                <span>{currency} {serviceCharge.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                <span>Total Due:</span>
                <span>{currency} {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Tip Entry */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Add Staff Gratuity/Tip ({currency})</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                placeholder="e.g. 5.00"
              />
            </div>

            {/* Split Bill */}
            <div style={{ marginBottom: '1rem' }}>
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => { setCheckoutOpen(false); setSplitBillOpen(true) }}
              >
                🔀 Split Bill Between Guests
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setCheckoutOpen(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCheckout}>Pay {currency} {grandTotal.toFixed(2)}</button>
            </div>
          </div>
        </div>
      )}

      {/* SPLIT BILL MODAL */}
      <SplitBillModal
        isOpen={splitBillOpen}
        onClose={() => setSplitBillOpen(false)}
        cartItems={cartItems.map(item => ({
          product_id: item.product_id,
          name: item.product_name,
          sku: item.product_id,
          price: item.unit_price,
          quantity: item.quantity,
        }))}
        subtotal={subtotal}
        serviceCharge={serviceCharge}
        taxRate={0}
        tipAmount={parseFloat(tipAmount || '0')}
        currency={currency}
        onConfirmSplit={(splits: SplitResult[]) => {
          setSplitBillOpen(false)
          const summary = splits.map(s => `${s.label}: ${currency}${s.total.toFixed(2)}`).join(' | ')
          setSuccessMsg(`Bill split confirmed — ${summary}`)
        }}
      />

    </div>
  )
}

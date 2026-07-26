import React, { useState, useEffect } from 'react'

interface KitchenDisplayProps {
  apiCall: (path: string, options?: RequestInit) => Promise<any>;
  activeStoreID: string;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

export default function KitchenDisplay({
  apiCall,
  activeStoreID,
  setErrorMsg,
  setSuccessMsg
}: KitchenDisplayProps) {
  const [tickets, setTickets] = useState<any[]>([])

  useEffect(() => {
    if (activeStoreID) {
      loadTickets()
      
      // Auto-poll tickets every 10 seconds for real-time kitchen experience
      const interval = setInterval(loadTickets, 10000)
      return () => clearInterval(interval)
    }
  }, [activeStoreID])

  const loadTickets = async () => {
    try {
      // Load pending and cooking tickets
      const pending = await apiCall('/restaurant/kitchen-tickets?status=PENDING')
      const cooking = await apiCall('/restaurant/kitchen-tickets?status=COOKING')
      
      setTickets([...pending, ...cooking])
    } catch (err: any) {
      console.error('Failed to load kitchen tickets:', err.message)
    }
  }

  const handleUpdateStatus = async (ticketID: string, newStatus: string) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await apiCall(`/restaurant/kitchen-tickets/${ticketID}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      })
      setSuccessMsg(`Ticket status updated to ${newStatus}`)
      loadTickets()
    } catch (err: any) {
      setErrorMsg('Failed to update ticket status: ' + err.message)
    }
  }

  return (
    <div className="kitchen-display-container" style={{ padding: '1rem', height: '80vh', display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
        <h3>👨‍🍳 Kitchen Display System (KDS)</h3>
        <button className="btn btn-secondary btn-sm" onClick={loadTickets}>🔄 Refresh Tickets</button>
      </div>

      {tickets.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.06)' }}>
          <span style={{ color: 'var(--text-muted)' }}>No active orders in the kitchen. All clear!</span>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', overflowY: 'auto', alignItems: 'start' }}>
          {tickets.map(ticket => {
            const isCooking = ticket.status === 'COOKING';
            const elapsed = Math.round((new Date().getTime() - new Date(ticket.created_at).getTime()) / 60000);
            
            return (
              <div
                key={ticket.id}
                style={{
                  background: isCooking ? 'rgba(245, 158, 11, 0.04)' : 'rgba(255,255,255,0.02)',
                  border: isCooking ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: isCooking ? '0 0 15px rgba(245, 158, 11, 0.05)' : 'none'
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>{ticket.ticket_number}</span>
                  <span style={{ fontSize: '0.8rem', color: elapsed > 15 ? '#ef4444' : 'var(--text-muted)' }}>
                    ⏳ {elapsed} mins ago
                  </span>
                </div>

                {/* Items list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {ticket.items.map((item: any) => (
                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '600' }}>{item.quantity}x {item.product_name}</span>
                      </div>
                      {item.notes && (
                        <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                          ✍️ Notes: {item.notes}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Card Footer Actions */}
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  {!isCooking ? (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', background: '#f59e0b', border: 'none', color: '#000', fontWeight: '600' }}
                      onClick={() => handleUpdateStatus(ticket.id, 'COOKING')}
                    >
                      🔥 Start Cooking
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', background: '#10b981', border: 'none', color: '#000', fontWeight: '600' }}
                      onClick={() => handleUpdateStatus(ticket.id, 'READY')}
                    >
                      ✅ Order Ready
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}

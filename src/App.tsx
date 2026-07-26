import React, { useState, useEffect } from 'react'
import RestaurantPOS from './components/restaurant/RestaurantPOS'
import KitchenDisplay from './components/restaurant/KitchenDisplay'

const API_BASE = 'http://localhost:8080/api/v1'

interface DecodedToken {
  user_id: string;
  company_id: string;
  store_id?: string;
  role: string;
  permissions: string[];
}

const decodeToken = (token: string): DecodedToken | null => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (err) {
    return null
  }
}

function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('prism_token'))
  const [refreshToken, setRefreshToken] = useState<string | null>(localStorage.getItem('prism_refresh_token'))
  const [user, setUser] = useState<DecodedToken | null>(null)

  // Offline sync simulation state
  const [isOffline, setIsOffline] = useState<boolean>(localStorage.getItem('prism_offline') === 'true')
  const [syncing, setSyncing] = useState<boolean>(false)
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0)

  // Navigation and views
  const [authView, setAuthView] = useState<'login' | 'register' | 'accept-invite'>('login')
  const [activeTab, setActiveTab] = useState<'overview' | 'pos' | 'sales' | 'stores' | 'terminals' | 'invites' | 'catalog' | 'inventory' | 'crm' | 'reports' | 'settings'>('pos')
  const [catalogSubTab, setCatalogSubTab] = useState<'products' | 'categories'>('products')

  // CRM / Customer state
  const [customers, setCustomers] = useState<any[]>([])
  const [crmSearchQuery, setCrmSearchQuery] = useState<string>('')
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [custName, setCustName] = useState<string>('')
  const [custEmail, setCustEmail] = useState<string>('')
  const [custPhone, setCustPhone] = useState<string>('')
  const [custLoyaltyPoints, setCustLoyaltyPoints] = useState<string>('')

  // Selected Customer ID for POS order link
  const [selectedCustomerID, setSelectedCustomerID] = useState<string | null>(null)

  // Store Settings state
  const [settingsTaxRate, setSettingsTaxRate] = useState<string>('0')
  const [settingsReceiptHeader, setSettingsReceiptHeader] = useState<string>('')
  const [settingsReceiptFooter, setSettingsReceiptFooter] = useState<string>('')
  const [settingsReceiptLogo, setSettingsReceiptLogo] = useState<string>('')
  const [settingsCurrency, setSettingsCurrency] = useState<string>('USD')

  // Reports state
  const [reportsSubTab, setReportsSubTab] = useState<'daily-sales' | 'top-products' | 'valuation'>('daily-sales')
  const [reportsStartDate, setReportsStartDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [reportsEndDate, setReportsEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [dailySalesSummary, setDailySalesSummary] = useState<any | null>(null)
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [inventoryValuation, setInventoryValuation] = useState<any | null>(null)
  const [inventorySubTab, setInventorySubTab] = useState<'stock' | 'logs'>('stock')

  // Domain data
  const [stores, setStores] = useState<any[]>([])
  const [activeStoreID, setActiveStoreID] = useState<string>('')
  const [terminals, setTerminals] = useState<any[]>([])
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])

  // POS State
  const [cartItems, setCartItems] = useState<any[]>([])
  const [activeOrderID, setActiveOrderID] = useState<string | null>(null)
  const [orderDiscountType, setOrderDiscountType] = useState<string>('') // percentage, flat, ""
  const [orderDiscountValue, setOrderDiscountValue] = useState<string>('')
  const [orderNotes, setOrderNotes] = useState<string>('')
  
  const [parkedOrders, setParkedOrders] = useState<any[]>([])
  const [pastOrders, setPastOrders] = useState<any[]>([])
  const [posSearchQuery, setPosSearchQuery] = useState<string>('')
  const [posCategoryFilter, setPosCategoryFilter] = useState<string>('')

  // Checkout modal state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState<boolean>(false)
  const [checkoutAmountPaid, setCheckoutAmountPaid] = useState<string>('')
  const [checkoutChangeAmount, setCheckoutChangeAmount] = useState<number>(0)
  const [checkoutReceiptURL, setCheckoutReceiptURL] = useState<string | null>(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState<boolean>(false)

  // Form states
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [regCompanyName, setRegCompanyName] = useState('')
  const [regStoreName, setRegStoreName] = useState('')
  const [regAdminName, setRegAdminName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleID, setInviteRoleID] = useState('')
  const [inviteStoreID, setInviteStoreID] = useState('')

  const [acceptToken, setAcceptToken] = useState('')
  const [acceptName, setAcceptName] = useState('')
  const [acceptPassword, setAcceptPassword] = useState('')

  const [newStoreName, setNewStoreName] = useState('')
  const [newStoreAddress, setNewStoreAddress] = useState('')
  const [newStorePhone, setNewStorePhone] = useState('')

  const [newTerminalName, setNewTerminalName] = useState('')
  const [newTerminalDeviceCode, setNewTerminalDeviceCode] = useState('')

  // Catalog Form states
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [newCatParentID, setNewCatParentID] = useState('')

  const [newProdName, setNewProdName] = useState('')
  const [newProdSKU, setNewProdSKU] = useState('')
  const [newProdBarcode, setNewProdBarcode] = useState('')
  const [newProdDesc, setNewProdDesc] = useState('')
  const [newProdPrice, setNewProdPrice] = useState('')
  const [newProdCostPrice, setNewProdCostPrice] = useState('')
  const [newProdTaxRate, setNewProdTaxRate] = useState('')
  const [newProdCategoryID, setNewProdCategoryID] = useState('')

  // Override edit state (mapped per product card)
  const [editingOverrideProdID, setEditingOverrideProdID] = useState<string | null>(null)
  const [overridePrice, setOverridePrice] = useState('')
  const [overrideTax, setOverrideTax] = useState('')
  const [overrideAvailable, setOverrideAvailable] = useState(true)

  // Inventory Form states
  const [newMoveProdID, setNewMoveProdID] = useState('')
  const [newMoveQty, setNewMoveQty] = useState('')
  const [newMoveType, setNewMoveType] = useState('receive') // receive, sale, adjustment, return, damage
  const [newMoveRef, setNewMoveRef] = useState('')
  const [newMoveReason, setNewMoveReason] = useState('')

  const [updatingReorderProdID, setUpdatingReorderProdID] = useState<string | null>(null)
  const [newReorderLevel, setNewReorderLevel] = useState('')

  // Modules State
  const [activeModules, setActiveModules] = useState<string[]>([])

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Roles available for invites (seeded system-wide UUIDs or fetched)
  const [inviteRoles] = useState<any[]>([
    { id: '019f73c4-c964-7480-bd8d-431351af42f3', name: 'Store Manager' },
    { id: '019f73c4-c967-783d-92cc-ad1784fa2367', name: 'Cashier' }
  ])

  // Decode user context on token changes
  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token)
      setUser(decoded)
      if (decoded && decoded.store_id) {
        setActiveStoreID(decoded.store_id)
      }
    } else {
      setUser(null)
    }
  }, [token])

  // Clear messages on tab changes
  useEffect(() => {
    setErrorMsg(null)
    setSuccessMsg(null)
  }, [activeTab, authView])

  // Fetch initial data when authenticated
  useEffect(() => {
    if (token) {
      fetchCompany()
      fetchStores()
    }
  }, [token])

  // Fetch data whenever active store ID or tab changes
  useEffect(() => {
    if (token && activeStoreID) {
      fetchTerminals()
      fetchStoreModules()
      
      if (activeTab === 'pos') {
        fetchProducts()
        fetchCategories()
        fetchParkedOrders()
        fetchCustomers()
      }
      if (activeTab === 'sales') {
        fetchPastOrders()
      }
      if (activeTab === 'catalog') {
        fetchProducts()
        fetchCategories()
      }
      if (activeTab === 'inventory') {
        fetchInventory()
        fetchMovements()
        fetchProducts()
      }
      if (activeTab === 'crm') {
        fetchCustomers()
      }
      if (activeTab === 'reports') {
        if (reportsSubTab === 'daily-sales') fetchDailySales()
        if (reportsSubTab === 'top-products') fetchTopProducts()
        if (reportsSubTab === 'valuation') fetchInventoryValuation()
      }
      if (activeTab === 'settings') {
        fetchStoreSettings()
        fetchStoreModules()
      }
    } else {
      setTerminals([])
    }
  }, [token, activeStoreID, activeTab])

  // Refetch reports when parameters change
  useEffect(() => {
    if (token && activeStoreID && activeTab === 'reports') {
      if (reportsSubTab === 'daily-sales') fetchDailySales()
      if (reportsSubTab === 'top-products') fetchTopProducts()
      if (reportsSubTab === 'valuation') fetchInventoryValuation()
    }
  }, [token, activeStoreID, activeTab, reportsSubTab, reportsStartDate, reportsEndDate])

  // Refetch customers on search query change
  useEffect(() => {
    if (token && activeTab === 'crm') {
      fetchCustomers()
    }
  }, [crmSearchQuery])

  // API wrapper that handles headers, active store ID scoping, and token refreshing
  const apiCall = async (path: string, options: RequestInit = {}): Promise<any> => {
    const headers = new Headers(options.headers || {})
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    if (activeStoreID) {
      headers.set('X-Store-ID', activeStoreID)
    }
    headers.set('Content-Type', 'application/json')

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    })

    const result = await response.json()

    if (!response.ok) {
      // Handle expired token automatically
      if (result.error && result.error.code === 'TOKEN_EXPIRED' && refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
          })
          const refreshResult = await refreshRes.json()
          if (refreshRes.ok && refreshResult.success) {
            const newAccessToken = refreshResult.data.access_token
            const newRefreshToken = refreshResult.data.refresh_token
            localStorage.setItem('prism_token', newAccessToken)
            localStorage.setItem('prism_refresh_token', newRefreshToken)
            setToken(newAccessToken)
            setRefreshToken(newRefreshToken)
            // Retry the original request
            headers.set('Authorization', `Bearer ${newAccessToken}`)
            const retryRes = await fetch(`${API_BASE}${path}`, { ...options, headers })
            return await retryRes.json()
          } else {
            handleLogout()
            throw new Error('Session expired. Please log in again.')
          }
        } catch (err: any) {
          handleLogout()
          throw new Error(err.message || 'Authentication error')
        }
      }
      throw new Error(result.error?.message || 'Server request failed')
    }

    return result.data
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      })
      localStorage.setItem('prism_token', data.access_token)
      localStorage.setItem('prism_refresh_token', data.refresh_token)
      setToken(data.access_token)
      setRefreshToken(data.refresh_token)
      setSuccessMsg('Logged in successfully')
      setActiveTab('pos')
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    try {
      await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          company_name: regCompanyName,
          store_name: regStoreName,
          admin_name: regAdminName,
          email: regEmail,
          password: regPassword
        })
      })
      setSuccessMsg('Company & admin account registered successfully. Please login.')
      setAuthView('login')
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    try {
      await apiCall('/auth/accept-invite', {
        method: 'POST',
        body: JSON.stringify({
          token: acceptToken,
          name: acceptName,
          password: acceptPassword
        })
      })
      setSuccessMsg('Invitation accepted successfully. Please login.')
      setAuthView('login')
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        })
      } catch (err) {}
    }
    localStorage.removeItem('prism_token')
    localStorage.removeItem('prism_refresh_token')
    setToken(null)
    setRefreshToken(null)
    setUser(null)
    setStores([])
    setTerminals([])
    setActiveStoreID('')
    setCompanyInfo(null)
    setCartItems([])
    setActiveOrderID(null)
  }

  const updateUnsyncedCount = () => {
    try {
      const stored = localStorage.getItem('prism_offline_orders')
      if (stored) {
        const parsed = JSON.parse(stored)
        setUnsyncedCount(parsed.length)
      } else {
        setUnsyncedCount(0)
      }
    } catch {
      setUnsyncedCount(0)
    }
  }

  // Update unsynced count on mount and whenever isOffline status changes
  useEffect(() => {
    updateUnsyncedCount()
  }, [isOffline])

  const toggleOfflineMode = () => {
    const nextVal = !isOffline
    setIsOffline(nextVal)
    localStorage.setItem('prism_offline', String(nextVal))
    setErrorMsg(null)
    setSuccessMsg(null)
    if (nextVal) {
      setSuccessMsg("Offline mode activated. Sales will be stored locally.")
    } else {
      setSuccessMsg("Online mode restored. Auto-sync triggered.")
      // Trigger sync after a short delay to allow state update
      setTimeout(() => {
        triggerSync(false)
      }, 100)
    }
  }

  const triggerSync = async (showSuccess = true) => {
    if (localStorage.getItem('prism_offline') === 'true') return
    let currentTerminals = terminals
    if (currentTerminals.length === 0) {
      try {
        const data = await apiCall('/terminals')
        currentTerminals = data || []
        setTerminals(currentTerminals)
      } catch (err: any) {
        console.error('Failed to resolve terminals before sync:', err.message)
      }
    }

    if (currentTerminals.length === 0) {
      setErrorMsg("Sync failed: No terminal registered for this store.")
      return
    }

    setSyncing(true)
    setErrorMsg(null)
    if (showSuccess) setSuccessMsg(null)

    try {
      const activeTerminal = currentTerminals[0]
      const lastVersion = activeTerminal.last_sync_version || 0

      // 1. Pull server changes
      const pullRes = await apiCall(`/sync/pull?last_sync_version=${lastVersion}`, {
        headers: {
          'X-Terminal-ID': activeTerminal.id
        }
      })

      if (pullRes && pullRes.success) {
        const data = pullRes.data
        
        // Cache pull results in localStorage
        localStorage.setItem('prism_cache_products', JSON.stringify(data.products || []))
        localStorage.setItem('prism_cache_categories', JSON.stringify(data.categories || []))
        localStorage.setItem('prism_cache_inventory', JSON.stringify(data.inventory || []))
        
        // Update local terminal state
        setTerminals(prev => prev.map(t => t.id === activeTerminal.id ? {
          ...t,
          last_sync_version: data.last_sync_version,
          last_sync_at: new Date().toISOString()
        } : t))
      }

      // 2. Push offline orders
      const stored = localStorage.getItem('prism_offline_orders')
      let offlineOrders = []
      if (stored) {
        try {
          offlineOrders = JSON.parse(stored)
        } catch {
          offlineOrders = []
        }
      }

      if (offlineOrders.length > 0) {
        const pushRes = await apiCall('/sync/push', {
          method: 'POST',
          headers: {
            'X-Terminal-ID': activeTerminal.id
          },
          body: JSON.stringify({ orders: offlineOrders })
        })

        if (pushRes && pushRes.success) {
          localStorage.setItem('prism_offline_orders', '[]')
          setUnsyncedCount(0)
          if (showSuccess) {
            setSuccessMsg(`Synchronization successful! Pulled server updates and pushed ${offlineOrders.length} offline orders.`)
          }
        } else {
          throw new Error(pushRes.error?.message || 'Sync push failed')
        }
      } else {
        if (showSuccess) {
          setSuccessMsg('Synchronization successful! Pulled latest server updates.')
        }
      }

      // Refresh all lists
      fetchProducts()
      fetchCategories()
      fetchInventory()
      fetchPastOrders()
      fetchParkedOrders()

    } catch (err: any) {
      console.error('Sync failed:', err)
      setErrorMsg('Sync failed: ' + err.message)
    } finally {
      setSyncing(false)
    }
  }

  const fetchCompany = async () => {
    try {
      const data = await apiCall('/companies')
      if (data && data.length > 0) {
        setCompanyInfo(data[0])
      }
    } catch (err: any) {
      console.error('Failed to fetch company details:', err.message)
    }
  }

  const fetchStores = async () => {
    try {
      const data = await apiCall('/stores')
      setStores(data || [])
      if (!activeStoreID && data && data.length > 0) {
        setActiveStoreID(data[0].id)
      }
    } catch (err: any) {
      console.error('Failed to fetch stores:', err.message)
    }
  }

  const fetchTerminals = async () => {
    if (localStorage.getItem('prism_offline') === 'true') {
      const cached = localStorage.getItem('prism_cache_terminals')
      if (cached) setTerminals(JSON.parse(cached))
      return
    }
    try {
      const data = await apiCall('/terminals')
      setTerminals(data || [])
      localStorage.setItem('prism_cache_terminals', JSON.stringify(data || []))
    } catch (err: any) {
      console.error('Failed to fetch terminals:', err.message)
      const cached = localStorage.getItem('prism_cache_terminals')
      if (cached) setTerminals(JSON.parse(cached))
    }
  }

  const fetchCategories = async () => {
    if (localStorage.getItem('prism_offline') === 'true') {
      const cached = localStorage.getItem('prism_cache_categories')
      if (cached) setCategories(JSON.parse(cached))
      return
    }
    try {
      const data = await apiCall('/categories')
      setCategories(data || [])
      localStorage.setItem('prism_cache_categories', JSON.stringify(data || []))
    } catch (err: any) {
      console.error('Failed to fetch categories:', err.message)
      const cached = localStorage.getItem('prism_cache_categories')
      if (cached) setCategories(JSON.parse(cached))
    }
  }

  const fetchProducts = async () => {
    if (localStorage.getItem('prism_offline') === 'true') {
      const cached = localStorage.getItem('prism_cache_products')
      if (cached) setProducts(JSON.parse(cached))
      return
    }
    try {
      const data = await apiCall('/products')
      setProducts(data || [])
      localStorage.setItem('prism_cache_products', JSON.stringify(data || []))
    } catch (err: any) {
      console.error('Failed to fetch products:', err.message)
      const cached = localStorage.getItem('prism_cache_products')
      if (cached) setProducts(JSON.parse(cached))
    }
  }

  const fetchInventory = async () => {
    if (localStorage.getItem('prism_offline') === 'true') {
      const cached = localStorage.getItem('prism_cache_inventory')
      if (cached) setInventory(JSON.parse(cached))
      return
    }
    try {
      const data = await apiCall('/inventory')
      setInventory(data || [])
      localStorage.setItem('prism_cache_inventory', JSON.stringify(data || []))
    } catch (err: any) {
      console.error('Failed to fetch inventory:', err.message)
      const cached = localStorage.getItem('prism_cache_inventory')
      if (cached) setInventory(JSON.parse(cached))
    }
  }

  const fetchMovements = async () => {
    if (localStorage.getItem('prism_offline') === 'true') {
      const cached = localStorage.getItem('prism_cache_movements')
      if (cached) setMovements(JSON.parse(cached))
      return
    }
    try {
      const data = await apiCall('/inventory/movements/logs')
      setMovements(data || [])
      localStorage.setItem('prism_cache_movements', JSON.stringify(data || []))
    } catch (err: any) {
      console.error('Failed to fetch stock movements:', err.message)
      const cached = localStorage.getItem('prism_cache_movements')
      if (cached) setMovements(JSON.parse(cached))
    }
  }

  const fetchParkedOrders = async () => {
    if (localStorage.getItem('prism_offline') === 'true') {
      setParkedOrders([]) // Parked orders not supported offline
      return
    }
    try {
      const data = await apiCall('/orders/parked')
      setParkedOrders(data || [])
    } catch (err: any) {
      console.error('Failed to fetch parked orders:', err.message)
    }
  }

  const fetchPastOrders = async () => {
    if (localStorage.getItem('prism_offline') === 'true') {
      const cached = localStorage.getItem('prism_cache_past_orders')
      if (cached) {
        setPastOrders(JSON.parse(cached))
      } else {
        setPastOrders([])
      }
      return
    }
    try {
      const data = await apiCall('/orders')
      setPastOrders(data || [])
      localStorage.setItem('prism_cache_past_orders', JSON.stringify(data || []))
    } catch (err: any) {
      console.error('Failed to fetch past orders:', err.message)
      const cached = localStorage.getItem('prism_cache_past_orders')
      if (cached) setPastOrders(JSON.parse(cached))
    }
  }

  const fetchCustomers = async () => {
    if (localStorage.getItem('prism_offline') === 'true') {
      const cached = localStorage.getItem('prism_cache_customers')
      if (cached) setCustomers(JSON.parse(cached))
      return
    }
    try {
      const data = await apiCall(`/customers?search=${crmSearchQuery || ''}`)
      setCustomers(data || [])
      localStorage.setItem('prism_cache_customers', JSON.stringify(data || []))
    } catch (err: any) {
      console.error('Failed to fetch customers:', err.message)
      const cached = localStorage.getItem('prism_cache_customers')
      if (cached) setCustomers(JSON.parse(cached))
    }
  }

  const fetchDailySales = async () => {
    try {
      const data = await apiCall(`/reports/daily-sales?start_date=${reportsStartDate}&end_date=${reportsEndDate}`)
      setDailySalesSummary(data)
    } catch (err: any) {
      console.error('Failed to fetch daily sales:', err.message)
    }
  }

  const fetchTopProducts = async () => {
    try {
      const data = await apiCall(`/reports/top-products?start_date=${reportsStartDate}&end_date=${reportsEndDate}`)
      setTopProducts(data || [])
    } catch (err: any) {
      console.error('Failed to fetch top products:', err.message)
    }
  }

  const fetchInventoryValuation = async () => {
    try {
      const data = await apiCall('/reports/inventory-valuation')
      setInventoryValuation(data)
    } catch (err: any) {
      console.error('Failed to fetch inventory valuation:', err.message)
    }
  }

  const fetchStoreSettings = async () => {
    try {
      const data = await apiCall('/stores/settings')
      if (data) {
        setSettingsTaxRate(data.tax_rate_default?.toString() || '0')
        setSettingsReceiptHeader(data.receipt_header || '')
        setSettingsReceiptFooter(data.receipt_footer || '')
        setSettingsReceiptLogo(data.receipt_logo_url || '')
        setSettingsCurrency(data.currency || 'USD')
      }
    } catch (err: any) {
      console.error('Failed to fetch store settings:', err.message)
    }
  }

  const fetchStoreModules = async () => {
    try {
      const data = await apiCall('/stores/modules')
      if (data) {
        const active = data.filter((m: any) => m.is_active).map((m: any) => m.module_key)
        setActiveModules(active)
      }
    } catch (err: any) {
      console.error('Failed to fetch store modules:', err.message)
    }
  }

  const handleToggleModule = async (moduleKey: string, currentStatus: boolean) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await apiCall('/stores/modules', {
        method: 'PUT',
        body: JSON.stringify({
          module_key: moduleKey,
          is_active: !currentStatus
        })
      })
      setSuccessMsg(`Module '${moduleKey}' status updated successfully`)
      fetchStoreModules()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  // POS CART ACTIONS & INTEGRATION
  const syncCartWithBackend = async (itemsList: any[], discType: string, discVal: string, notes: string, custID: string | null = selectedCustomerID) => {
    if (!activeStoreID || terminals.length === 0) return activeOrderID

    const mappedItems = itemsList.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      discount_type: item.discount_type || '',
      discount_value: parseFloat(item.discount_value) || 0
    }))

    const payload = {
      terminal_id: terminals[0].id, // Default to first terminal in store
      customer_id: custID || undefined,
      notes: notes,
      discount_type: discType,
      discount_value: parseFloat(discVal) || 0,
      items: mappedItems
    }

    try {
      if (!activeOrderID) {
        // Create new active order
        const ord = await apiCall('/orders', {
          method: 'POST',
          body: JSON.stringify({ ...payload, status: 'ACTIVE' })
        })
        setActiveOrderID(ord.id)
        return ord.id
      } else {
        // Update existing active order
        await apiCall(`/orders/${activeOrderID}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
        return activeOrderID
      }
    } catch (err: any) {
      setErrorMsg('Sync Error: ' + err.message)
      return activeOrderID
    }
  }

  const handleCustomerChange = async (custId: string) => {
    setSelectedCustomerID(custId || null)
    await syncCartWithBackend(cartItems, orderDiscountType, orderDiscountValue, orderNotes, custId || null)
  }

  const addToCart = async (product: any) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    const existingIndex = cartItems.findIndex(item => item.product_id === product.id)
    let newItems = [...cartItems]
    
    if (existingIndex > -1) {
      newItems[existingIndex].quantity += 1
    } else {
      newItems.push({
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.active_price !== undefined ? product.active_price : product.price,
        tax_rate: product.active_tax_rate !== undefined ? product.active_tax_rate : product.tax_rate,
        quantity: 1,
        discount_type: '',
        discount_value: ''
      })
    }
    
    setCartItems(newItems)
    if (localStorage.getItem('prism_offline') !== 'true') {
      await syncCartWithBackend(newItems, orderDiscountType, orderDiscountValue, orderNotes)
    }
  }

  const updateCartItemQty = async (productID: string, delta: number) => {
    const existingIndex = cartItems.findIndex(item => item.product_id === productID)
    if (existingIndex === -1) return
    let newItems = [...cartItems]
    
    newItems[existingIndex].quantity += delta
    if (newItems[existingIndex].quantity <= 0) {
      newItems.splice(existingIndex, 1)
    }

    setCartItems(newItems)
    
    if (newItems.length === 0 && activeOrderID) {
      if (localStorage.getItem('prism_offline') === 'true') {
        setActiveOrderID(null)
      } else {
        try {
          await apiCall(`/orders/${activeOrderID}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'VOIDED' })
          })
          setActiveOrderID(null)
        } catch (err: any) {
          console.error('Failed to void empty cart:', err.message)
        }
      }
    } else {
      if (localStorage.getItem('prism_offline') !== 'true') {
        await syncCartWithBackend(newItems, orderDiscountType, orderDiscountValue, orderNotes)
      }
    }
  }

  const updateCartItemDiscount = async (productID: string, type: string, value: string) => {
    const existingIndex = cartItems.findIndex(item => item.product_id === productID)
    if (existingIndex === -1) return
    let newItems = [...cartItems]
    
    newItems[existingIndex].discount_type = type
    newItems[existingIndex].discount_value = value

    setCartItems(newItems)
    if (localStorage.getItem('prism_offline') !== 'true') {
      await syncCartWithBackend(newItems, orderDiscountType, orderDiscountValue, orderNotes)
    }
  }

  const handleOrderDiscountChange = async (type: string, value: string) => {
    setOrderDiscountType(type)
    setOrderDiscountValue(value)
    if (cartItems.length > 0 && localStorage.getItem('prism_offline') !== 'true') {
      await syncCartWithBackend(cartItems, type, value, orderNotes)
    }
  }

  const handleOrderNotesChange = async (notes: string) => {
    setOrderNotes(notes)
    if (cartItems.length > 0 && localStorage.getItem('prism_offline') !== 'true') {
      await syncCartWithBackend(cartItems, orderDiscountType, orderDiscountValue, notes)
    }
  }

  const handleParkOrder = async () => {
    if (localStorage.getItem('prism_offline') === 'true') {
      setErrorMsg('Parking orders is not supported in offline mode.')
      return
    }
    if (!activeOrderID) return
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await apiCall(`/orders/${activeOrderID}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PARKED' })
      })
      setSuccessMsg('Current transaction parked successfully.')
      setCartItems([])
      setActiveOrderID(null)
      setOrderDiscountType('')
      setOrderDiscountValue('')
      setOrderNotes('')
      fetchParkedOrders()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleResumeOrder = async (parked: any) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      // API status shift to ACTIVE
      await apiCall(`/orders/${parked.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ACTIVE' })
      })
      
      // Load local state
      setActiveOrderID(parked.id)
      setOrderDiscountType(parked.discount_type || '')
      setOrderDiscountValue(parked.discount_value > 0 ? parked.discount_value.toString() : '')
      setOrderNotes(parked.notes || '')
      
      const mapped = parked.items.map((item: any) => ({
        product_id: item.product_id,
        name: item.product_name,
        sku: item.product_sku,
        price: item.unit_price,
        tax_rate: item.tax_rate,
        quantity: item.quantity,
        discount_type: item.discount_type || '',
        discount_value: item.discount_value > 0 ? item.discount_value.toString() : ''
      }))
      setCartItems(mapped)
      setSuccessMsg(`Resumed order ${parked.order_number}`)
      fetchParkedOrders()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleVoidActiveOrder = async () => {
    if (!activeOrderID) {
      setCartItems([])
      return
    }
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await apiCall(`/orders/${activeOrderID}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'VOIDED' })
      })
      setSuccessMsg('Active cart voided.')
      setCartItems([])
      setActiveOrderID(null)
      setOrderDiscountType('')
      setOrderDiscountValue('')
      setOrderNotes('')
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleVoidPastOrder = async (orderID: string) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    if (!window.confirm('Are you sure you want to void this sale? This will restore inventory levels.')) return
    try {
      await apiCall(`/orders/${orderID}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'VOIDED' })
      })
      setSuccessMsg('Order voided. Stock levels successfully restored.')
      fetchPastOrders()
      fetchInventory()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  // CHECKOUT PAYMENT WORKFLOW
  // CHECKOUT PAYMENT WORKFLOW
  const handleOpenCheckout = async () => {
    if (cartItems.length === 0) return
    setErrorMsg(null)

    if (terminals.length === 0) {
      setErrorMsg('No terminal scope registered. Please register a terminal for this store branch first.')
      return
    }

    if (localStorage.getItem('prism_offline') === 'true') {
      const currentID = activeOrderID || self.crypto.randomUUID()
      setActiveOrderID(currentID)
      setCheckoutAmountPaid('')
      setCheckoutChangeAmount(0)
      setCheckoutReceiptURL(null)
      setCheckoutSuccess(false)
      setCheckoutModalOpen(true)
      return
    }

    try {
      // Ensure backend is synchronized
      const currentID = await syncCartWithBackend(cartItems, orderDiscountType, orderDiscountValue, orderNotes)
      if (!currentID) throw new Error('Failed to secure order checkout ID from server')

      // Fetch checkout details from backend to ensure calculations match exactly
      await apiCall(`/orders/${currentID}`)
      
      setCheckoutAmountPaid('')
      setCheckoutChangeAmount(0)
      setCheckoutReceiptURL(null)
      setCheckoutSuccess(false)
      setCheckoutModalOpen(true)
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const calculateGrandTotal = () => {
    let subtotal = 0
    let discountTotal = 0
    let taxTotal = 0

    cartItems.forEach(item => {
      const itemSub = item.price * item.quantity
      let itemDisc = 0
      if (item.discount_type === 'percentage') {
        itemDisc = itemSub * ((parseFloat(item.discount_value) || 0) / 100.0)
      } else if (item.discount_type === 'flat') {
        itemDisc = parseFloat(item.discount_value) || 0
      }
      itemDisc = Math.min(itemDisc, itemSub)
      
      const taxable = itemSub - itemDisc
      const itemTax = taxable * (item.tax_rate / 100.0)

      subtotal += itemSub
      discountTotal += itemDisc
      taxTotal += itemTax
    })

    const orderSub = subtotal - discountTotal + taxTotal
    let orderDisc = 0
    if (orderDiscountType === 'percentage') {
      orderDisc = orderSub * ((parseFloat(orderDiscountValue) || 0) / 100.0)
    } else if (orderDiscountType === 'flat') {
      orderDisc = parseFloat(orderDiscountValue) || 0
    }
    orderDisc = Math.min(orderDisc, orderSub)

    return {
      subtotal: subtotal,
      itemDiscounts: discountTotal,
      orderDiscount: orderDisc,
      tax: taxTotal,
      grandTotal: Math.max(0, orderSub - orderDisc)
    }
  }

  const handleAmountTenderedChange = (val: string, total: number) => {
    setCheckoutAmountPaid(val)
    const paid = parseFloat(val) || 0
    if (paid >= total) {
      setCheckoutChangeAmount(paid - total)
    } else {
      setCheckoutChangeAmount(0)
    }
  }

  const handleCompleteCheckout = async (total: number) => {
    setErrorMsg(null)
    const paid = parseFloat(checkoutAmountPaid) || 0
    if (paid < total) {
      setErrorMsg('Paid amount is less than the order total.')
      return
    }

    if (localStorage.getItem('prism_offline') === 'true') {
      const currentOrderID = activeOrderID || self.crypto.randomUUID()
      const orderNum = `ORD-OFFLINE-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      const summary = calculateGrandTotal()

      const newOrder = {
        id: currentOrderID,
        store_id: activeStoreID,
        terminal_id: terminals[0]?.id || "",
        user_id: user?.user_id || "",
        order_number: orderNum,
        status: "COMPLETED",
        subtotal: summary.subtotal,
        discount_type: orderDiscountType,
        discount_value: parseFloat(orderDiscountValue) || 0,
        discount_amount: summary.orderDiscount,
        tax_amount: summary.tax,
        total_amount: summary.grandTotal,
        paid_amount: paid,
        change_amount: paid - summary.grandTotal,
        notes: orderNotes,
        client_id: currentOrderID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: cartItems.map(item => {
          const itemSub = item.price * item.quantity
          let itemDisc = 0
          if (item.discount_type === 'percentage') {
            itemDisc = itemSub * ((parseFloat(item.discount_value) || 0) / 100.0)
          } else if (item.discount_type === 'flat') {
            itemDisc = parseFloat(item.discount_value) || 0
          }
          itemDisc = Math.min(itemDisc, itemSub)
          const taxable = itemSub - itemDisc
          const itemTax = taxable * (item.tax_rate / 100.0)

          return {
            id: self.crypto.randomUUID(),
            order_id: currentOrderID,
            product_id: item.product_id,
            product_name: item.name,
            product_sku: item.sku,
            quantity: item.quantity,
            unit_price: item.price,
            discount_type: item.discount_type || '',
            discount_value: parseFloat(item.discount_value) || 0,
            discount_amount: itemDisc,
            tax_rate: item.tax_rate,
            tax_amount: itemTax,
            subtotal: itemSub,
            total_amount: itemSub - itemDisc
          }
        }),
        payments: [
          {
            id: self.crypto.randomUUID(),
            order_id: currentOrderID,
            amount: paid,
            method: 'CASH',
            status: 'COMPLETED',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      }

      try {
        const stored = localStorage.getItem('prism_offline_orders')
        let offlineOrders = []
        if (stored) {
          offlineOrders = JSON.parse(stored)
        }
        offlineOrders.push(newOrder)
        localStorage.setItem('prism_offline_orders', JSON.stringify(offlineOrders))
        setUnsyncedCount(offlineOrders.length)
      } catch (err: any) {
        console.error('Failed to save offline order:', err.message)
        setErrorMsg('Failed to store order locally: ' + err.message)
        return
      }

      setInventory(prevInv => {
        const updated = prevInv.map(invItem => {
          const matchingCartItem = cartItems.find(ci => ci.product_id === invItem.product_id)
          if (matchingCartItem) {
            return {
              ...invItem,
              quantity: invItem.quantity - matchingCartItem.quantity
            }
          }
          return invItem
        })
        localStorage.setItem('prism_cache_inventory', JSON.stringify(updated))
        return updated
      })

      setPastOrders(prevPast => {
        const updated = [newOrder, ...prevPast]
        localStorage.setItem('prism_cache_past_orders', JSON.stringify(updated))
        return updated
      })

      setCheckoutChangeAmount(paid - summary.grandTotal)
      setCheckoutSuccess(true)
      
      setCartItems([])
      setActiveOrderID(null)
      setOrderDiscountType('')
      setOrderDiscountValue('')
      setOrderNotes('')
      setSelectedCustomerID(null)
      return
    }

    try {
      const res = await apiCall(`/orders/${activeOrderID}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: paid,
          method: 'CASH'
        })
      })

      setCheckoutReceiptURL(res.order.receipt_url)
      setCheckoutChangeAmount(res.order.change_amount)
      setCheckoutSuccess(true)
      
      // Clear local cart
      setCartItems([])
      setActiveOrderID(null)
      setOrderDiscountType('')
      setOrderDiscountValue('')
      setOrderNotes('')
      setSelectedCustomerID(null)
      
      fetchParkedOrders()
      fetchInventory()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleCloseCheckoutModal = () => {
    setCheckoutModalOpen(false)
    setSelectedCustomerID(null)
    fetchPastOrders()
  }

  // CRM & Store Settings Domain Handlers
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const body = {
        name: custName,
        email: custEmail || undefined,
        phone: custPhone || undefined
      }
      await apiCall('/customers', {
        method: 'POST',
        body: JSON.stringify(body)
      })
      setSuccessMsg(`Customer "${custName}" registered successfully`)
      setCustName('')
      setCustEmail('')
      setCustPhone('')
      fetchCustomers()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) return
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const body: any = {
        name: custName,
        email: custEmail,
        phone: custPhone,
      }
      if (custLoyaltyPoints !== '') {
        body.loyalty_points = parseInt(custLoyaltyPoints) || 0
      }
      await apiCall(`/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      })
      setSuccessMsg(`Customer "${custName}" updated successfully`)
      setSelectedCustomer(null)
      setCustName('')
      setCustEmail('')
      setCustPhone('')
      setCustLoyaltyPoints('')
      fetchCustomers()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await apiCall(`/customers/${id}`, {
        method: 'DELETE'
      })
      setSuccessMsg('Customer deleted successfully')
      fetchCustomers()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleUpdateStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const body = {
        tax_rate_default: parseFloat(settingsTaxRate) || 0,
        receipt_header: settingsReceiptHeader,
        receipt_footer: settingsReceiptFooter,
        receipt_logo_url: settingsReceiptLogo,
        currency: settingsCurrency
      }
      await apiCall('/stores/settings', {
        method: 'PUT',
        body: JSON.stringify(body)
      })
      setSuccessMsg('Store settings updated successfully')
      fetchStoreSettings()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  // STANDARD DOMAIN HANDLERS
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const body: any = {
        name: newCatName,
        description: newCatDesc
      }
      if (newCatParentID) {
        body.parent_id = newCatParentID
      }
      await apiCall('/categories', {
        method: 'POST',
        body: JSON.stringify(body)
      })
      setSuccessMsg(`Category "${newCatName}" created successfully`)
      setNewCatName('')
      setNewCatDesc('')
      setNewCatParentID('')
      fetchCategories()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const body: any = {
        name: newProdName,
        sku: newProdSKU,
        barcode: newProdBarcode,
        description: newProdDesc,
        price: parseFloat(newProdPrice),
        cost_price: parseFloat(newProdCostPrice) || 0,
        tax_rate: parseFloat(newProdTaxRate) || 0
      }
      if (newProdCategoryID) {
        body.category_id = newProdCategoryID
      }
      await apiCall('/products', {
        method: 'POST',
        body: JSON.stringify(body)
      })
      setSuccessMsg(`Product "${newProdName}" created successfully`)
      setNewProdName('')
      setNewProdSKU('')
      setNewProdBarcode('')
      setNewProdDesc('')
      setNewProdPrice('')
      setNewProdCostPrice('')
      setNewProdTaxRate('')
      setNewProdCategoryID('')
      fetchProducts()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleUpsertOverride = async (productID: string) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const body: any = {
        store_id: activeStoreID
      }
      if (overridePrice !== '') body.price = parseFloat(overridePrice)
      if (overrideTax !== '') body.tax_rate = parseFloat(overrideTax)
      body.is_available = overrideAvailable

      await apiCall(`/products/${productID}/overrides`, {
        method: 'POST',
        body: JSON.stringify(body)
      })
      setSuccessMsg('Product override updated for this store context')
      setEditingOverrideProdID(null)
      setOverridePrice('')
      setOverrideTax('')
      setOverrideAvailable(true)
      fetchProducts()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleDeleteOverride = async (productID: string) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await apiCall(`/products/${productID}/overrides/${activeStoreID}`, {
        method: 'DELETE'
      })
      setSuccessMsg('Product override removed. Falling back to base values.')
      fetchProducts()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      let qty = parseFloat(newMoveQty)
      if (['sale', 'damage'].includes(newMoveType) && qty > 0) {
        qty = -qty
      }

      await apiCall('/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({
          product_id: newMoveProdID,
          quantity: qty,
          type: newMoveType,
          reference_id: newMoveRef,
          reason: newMoveReason
        })
      })
      setSuccessMsg('Stock movement logged successfully')
      setNewMoveProdID('')
      setNewMoveQty('')
      setNewMoveRef('')
      setNewMoveReason('')
      fetchInventory()
      fetchMovements()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleUpdateReorderLevel = async (productID: string) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await apiCall('/inventory/reorder-levels', {
        method: 'PUT',
        body: JSON.stringify({
          product_id: productID,
          reorder_level: parseFloat(newReorderLevel) || 0
        })
      })
      setSuccessMsg('Reorder level updated')
      setUpdatingReorderProdID(null)
      setNewReorderLevel('')
      fetchInventory()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const store = await apiCall('/stores', {
        method: 'POST',
        body: JSON.stringify({
          name: newStoreName,
          address: newStoreAddress,
          phone: newStorePhone
        })
      })
      setSuccessMsg(`Store "${store.name}" created successfully`)
      setNewStoreName('')
      setNewStoreAddress('')
      setNewStorePhone('')
      fetchStores()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleCreateTerminal = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const terminal = await apiCall('/terminals', {
        method: 'POST',
        body: JSON.stringify({
          name: newTerminalName,
          device_code: newTerminalDeviceCode
        })
      })
      setSuccessMsg(`Terminal "${terminal.name}" registered successfully`)
      setNewTerminalName('')
      setNewTerminalDeviceCode('')
      fetchTerminals()
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const inviteBody: any = {
        email: inviteEmail,
        role_id: inviteRoleID
      }
      if (inviteStoreID) {
        inviteBody.store_id = inviteStoreID
      }
      const data = await apiCall('/auth/invites', {
        method: 'POST',
        body: JSON.stringify(inviteBody)
      })
      setSuccessMsg(`Invitation created! Token: ${data.token} (Expiring: ${new Date(data.expires_at).toLocaleString()})`)
      setInviteEmail('')
      setInviteRoleID('')
      setInviteStoreID('')
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  // Filtered product catalog for POS left grid
  const filteredPOSProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(posSearchQuery.toLowerCase()) || p.sku.toLowerCase().includes(posSearchQuery.toLowerCase())
    const matchesCategory = posCategoryFilter === '' || p.category_id === posCategoryFilter
    const isAvailable = p.active_is_available !== false // defaults to true
    const isActive = p.status === 'active'
    return matchesSearch && matchesCategory && isAvailable && isActive
  })

  // Auth pages layout
  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card glass-panel">
          <div className="auth-header">
            <div className="logo-icon">PRISM POS</div>
            <p>Sprint 04 Retail Control Client</p>
          </div>

          {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}

          {authView === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="admin@prismpos.local"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Sign In
              </button>

              <div className="auth-footer">
                Don't have a company account?{' '}
                <a href="#register" onClick={() => setAuthView('register')}>
                  Register Company
                </a>
                <br />
                <br />
                Have an invitation?{' '}
                <a href="#invite" onClick={() => setAuthView('accept-invite')}>
                  Accept Invite
                </a>
              </div>
            </form>
          )}

          {authView === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Acme Corp"
                  value={regCompanyName}
                  onChange={(e) => setRegCompanyName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>First Store / Branch Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Main Branch Colombo"
                  value={regStoreName}
                  onChange={(e) => setRegStoreName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Administrator Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="John Doe"
                  value={regAdminName}
                  onChange={(e) => setRegAdminName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="admin@acme.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Min 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Create Organization
              </button>

              <div className="auth-footer">
                Already registered?{' '}
                <a href="#login" onClick={() => setAuthView('login')}>
                  Sign In
                </a>
              </div>
            </form>
          )}

          {authView === 'accept-invite' && (
            <form onSubmit={handleAcceptInvite}>
              <div className="form-group">
                <label>Invitation Token</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter invitation hex token"
                  value={acceptToken}
                  onChange={(e) => setAcceptToken(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cashier Staff"
                  value={acceptName}
                  onChange={(e) => setAcceptName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Create Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Min 6 characters"
                  value={acceptPassword}
                  onChange={(e) => setAcceptPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Complete Registration
              </button>

              <div className="auth-footer">
                Back to{' '}
                <a href="#login" onClick={() => setAuthView('login')}>
                  Sign In
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  }

  // Calculate cart details for real-time POS footer
  const cartSummary = calculateGrandTotal()

  // Dashboard layout
  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-brand">PRISM POS</div>
        <div className="nav-user">
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
              <button 
                className={`btn ${isOffline ? 'btn-danger' : 'btn-primary'}`} 
                onClick={toggleOfflineMode}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                {isOffline ? '🔴 Offline Sim' : '🟢 Online'}
              </button>
              {!isOffline && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => triggerSync(true)}
                  disabled={syncing}
                  style={{ 
                    padding: '0.4rem 0.8rem', 
                    fontSize: '0.85rem', 
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <span className={syncing ? 'rotate' : ''} style={{ display: 'inline-block' }}>🔄</span>
                  {syncing ? 'Syncing...' : 'Sync'}
                  {unsyncedCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      borderRadius: '50%',
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      lineHeight: '1',
                      border: '1px solid var(--border)'
                    }}>
                      {unsyncedCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
          {companyInfo && (
            <span className="user-badge" style={{ borderColor: 'var(--accent)' }}>
              🏢 {companyInfo.name}
            </span>
          )}
          {user && (
            <span className="user-badge">
              👤 {user.role} ({user.permissions.length} perms)
            </span>
          )}
          <button className="btn btn-danger btn-secondary" onClick={handleLogout} style={{ padding: '0.4rem 1rem' }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="main-content">
        <aside className="sidebar glass-panel" style={{ padding: '1rem' }}>
          <button className={`sidebar-btn ${activeTab === 'pos' ? 'active' : ''}`} onClick={() => setActiveTab('pos')}>
            🛒 Point of Sale
          </button>
          <button className={`sidebar-btn ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
            🧾 Sales History
          </button>
          <button className={`sidebar-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            📊 Overview
          </button>
          <button className={`sidebar-btn ${activeTab === 'stores' ? 'active' : ''}`} onClick={() => setActiveTab('stores')}>
            🏬 Stores
          </button>
          <button className={`sidebar-btn ${activeTab === 'terminals' ? 'active' : ''}`} onClick={() => setActiveTab('terminals')}>
            💻 Terminals
          </button>
          {activeModules.includes('restaurant') && (
            <button className={`sidebar-btn ${activeTab === 'kitchen' ? 'active' : ''}`} onClick={() => setActiveTab('kitchen')}>
              🍳 Kitchen (KDS)
            </button>
          )}
          {user && (user.permissions.includes('product:read') || user.permissions.includes('product:write')) && (
            <button className={`sidebar-btn ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')}>
              📦 Product Catalog
            </button>
          )}
          {user && (user.permissions.includes('inventory:read') || user.permissions.includes('inventory:write')) && (
            <button className={`sidebar-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
              📋 Inventory & Stock
            </button>
          )}
          {user && user.permissions.includes('invite:create') && (
            <button className={`sidebar-btn ${activeTab === 'invites' ? 'active' : ''}`} onClick={() => setActiveTab('invites')}>
              ✉️ User Invites
            </button>
          )}
          {user && (user.permissions.includes('crm:read') || user.permissions.includes('crm:write')) && (
            <button className={`sidebar-btn ${activeTab === 'crm' ? 'active' : ''}`} onClick={() => setActiveTab('crm')}>
              👥 Customers & CRM
            </button>
          )}
          {user && user.permissions.includes('report:read') && (
            <button className={`sidebar-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
              📈 Business Reports
            </button>
          )}
          {user && (user.permissions.includes('settings:read') || user.permissions.includes('settings:write')) && (
            <button className={`sidebar-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              ⚙️ Store Settings
            </button>
          )}
        </aside>

        <main className="panel-container">
          {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}

          {/* Store context selection header for admin scoping */}
          {user && !user.store_id && stores.length > 0 && (
            <div className="selector-header">
              <span>Active Store Context:</span>
              <select
                className="store-select"
                value={activeStoreID}
                onChange={(e) => setActiveStoreID(e.target.value)}
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* TAB 1: POINT OF SALE */}
          {activeTab === 'pos' && (
            activeModules.includes('restaurant') ? (
              <RestaurantPOS
                apiCall={apiCall}
                activeStoreID={activeStoreID}
                products={products}
                categories={categories}
                currency={settingsCurrency}
                setErrorMsg={setErrorMsg}
                setSuccessMsg={setSuccessMsg}
              />
            ) : (
              <div className="pos-layout">
              {/* POS Left Column: Catalog */}
              <div>
                <div className="pos-search-bar">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by SKU or name..."
                    value={posSearchQuery}
                    onChange={(e) => setPosSearchQuery(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <select
                    className="store-select"
                    value={posCategoryFilter}
                    onChange={(e) => setPosCategoryFilter(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredPOSProducts.length > 0 ? (
                  <div className="data-grid">
                    {filteredPOSProducts.map((p) => {
                      const displayPrice = p.active_price !== undefined ? p.active_price : p.price
                      return (
                        <div key={p.id} className="glass-panel pos-product-card">
                          <div>
                            <div className="card-title">{p.name}</div>
                            <div className="card-meta" style={{ marginTop: '0.25rem' }}>
                              <span>SKU: <code>{p.sku}</code></span>
                              <span style={{ fontSize: '1.1rem', marginTop: '0.5rem', color: 'var(--accent)' }}>
                                <strong>${displayPrice.toFixed(2)}</strong>
                              </span>
                            </div>
                          </div>
                          <button className="btn btn-primary" onClick={() => addToCart(p)} style={{ padding: '0.5rem 1rem', width: '100%' }}>
                            🛒 Add to Cart
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>No products match filters or are available.</p>
                )}

                {/* Parked orders section below catalog */}
                {parkedOrders.length > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                    <div className="panel-header">
                      <h3>Parked Suspended Sales</h3>
                    </div>
                    <div className="data-grid" style={{ marginTop: '0.75rem' }}>
                      {parkedOrders.map((po) => (
                        <div key={po.id} className="glass-panel data-card" style={{ borderLeft: '3px solid var(--secondary)' }}>
                          <div>
                            <div className="card-title">{po.order_number}</div>
                            <div className="card-meta">
                              <span>Items: {po.items?.length || 0}</span>
                              <span>Total: <strong>${po.total_amount.toFixed(2)}</strong></span>
                              <span>Suspended: {new Date(po.updated_at).toLocaleString()}</span>
                            </div>
                          </div>
                          <button className="btn btn-secondary" onClick={() => handleResumeOrder(po)} style={{ padding: '0.4rem 0.8rem' }}>
                            🔄 Resume Sale
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* POS Right Column: Active Cart */}
              <div className="glass-panel pos-cart-panel">
                <div className="cart-header">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🛍️ Checkout Cart
                  </h3>
                  {activeOrderID && (
                    <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                      Active Sync
                    </span>
                  )}
                </div>

                <div className="cart-items-list">
                  {cartItems.length > 0 ? (
                    cartItems.map((item) => (
                      <div key={item.product_id} className="cart-item-row">
                        <div className="cart-item-info">
                          <div>
                            <div className="cart-item-title">{item.name}</div>
                            <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.sku}</code>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div><strong>${(item.price * item.quantity).toFixed(2)}</strong></div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>${item.price.toFixed(2)} ea</div>
                          </div>
                        </div>

                        <div className="cart-item-controls">
                          {/* Quantity control */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button className="qty-btn" onClick={() => updateCartItemQty(item.product_id, -1)}>-</button>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{item.quantity}</span>
                            <button className="qty-btn" onClick={() => updateCartItemQty(item.product_id, 1)}>+</button>
                          </div>

                          {/* Item discount inline */}
                          <div className="cart-item-discount-row">
                            <label>Disc:</label>
                            <select
                              className="discount-select"
                              value={item.discount_type}
                              onChange={(e) => updateCartItemDiscount(item.product_id, e.target.value, item.discount_value)}
                            >
                              <option value="">None</option>
                              <option value="percentage">%</option>
                              <option value="flat">$</option>
                            </select>
                            {item.discount_type && (
                              <input
                                type="number"
                                step="0.01"
                                className="discount-input-small"
                                placeholder="0"
                                value={item.discount_value}
                                onChange={(e) => updateCartItemDiscount(item.product_id, item.discount_type, e.target.value)}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      <span style={{ fontSize: '3rem' }}>🛒</span>
                      <p style={{ marginTop: '0.5rem' }}>Your shopping cart is empty.</p>
                      <p style={{ fontSize: '0.8rem' }}>Click on products to add items.</p>
                    </div>
                  )}
                </div>

                {cartItems.length > 0 && (
                  <div>
                    {/* Link Customer to Sale */}
                    <div className="form-group" style={{ marginBottom: '1rem', borderBottom: '1px dashed rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                        👤 Link Customer to Sale (Loyalty)
                      </label>
                      <select
                        className="form-control"
                        value={selectedCustomerID || ''}
                        onChange={(e) => handleCustomerChange(e.target.value)}
                        style={{ fontSize: '0.85rem' }}
                      >
                        <option value="">Guest (No Loyalty Points)</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.phone || c.email || 'No Contact'}) - {c.loyalty_tier} ({c.loyalty_points} pts)
                          </option>
                        ))}
                      </select>
                      {selectedCustomerID && (
                        <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', color: 'var(--accent)' }}>
                          <span>Loyalty Status:</span>
                          <strong>Active ({customers.find(c => c.id === selectedCustomerID)?.loyalty_tier || 'BRONZE'})</strong>
                        </div>
                      )}
                    </div>

                    {/* Cart Summary */}
                    <div className="cart-totals">
                      <div className="cart-total-line">
                        <span>Subtotal:</span>
                        <span>${cartSummary.subtotal.toFixed(2)}</span>
                      </div>
                      {cartSummary.itemDiscounts > 0 && (
                        <div className="cart-total-line" style={{ color: '#f87171' }}>
                          <span>Item Discounts:</span>
                          <span>-${cartSummary.itemDiscounts.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="cart-total-line">
                        <span>Taxes:</span>
                        <span>${cartSummary.tax.toFixed(2)}</span>
                      </div>
                      
                      {/* Order level discount */}
                      <div className="cart-total-line" style={{ alignItems: 'center', marginTop: '0.25rem' }}>
                        <span>Discount:</span>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <select
                            className="discount-select"
                            value={orderDiscountType}
                            onChange={(e) => handleOrderDiscountChange(e.target.value, orderDiscountValue)}
                          >
                            <option value="">None</option>
                            <option value="percentage">%</option>
                            <option value="flat">$</option>
                          </select>
                          {orderDiscountType && (
                            <input
                              type="number"
                              step="0.01"
                              className="discount-input-small"
                              placeholder="0"
                              value={orderDiscountValue}
                              onChange={(e) => handleOrderDiscountChange(orderDiscountType, e.target.value)}
                            />
                          )}
                        </div>
                      </div>
                      
                      {orderDiscountType && cartSummary.orderDiscount > 0 && (
                        <div className="cart-total-line" style={{ color: '#f87171' }}>
                          <span>Order Discount:</span>
                          <span>-${cartSummary.orderDiscount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="cart-total-line grand-total">
                        <span>Total Due:</span>
                        <span>${cartSummary.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Order Notes */}
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Add private order notes / customer ref..."
                        value={orderNotes}
                        onChange={(e) => handleOrderNotesChange(e.target.value)}
                        style={{ fontSize: '0.8rem', resize: 'none' }}
                      />
                    </div>

                    {/* POS Checkout Controls */}
                    <div className="pos-actions">
                      <button className="btn btn-secondary" onClick={handleParkOrder} disabled={!activeOrderID}>
                        ⏸️ Park Sale
                      </button>
                      <button className="btn btn-danger" onClick={handleVoidActiveOrder}>
                        🗑️ Void Cart
                      </button>
                      <button className="btn btn-primary" onClick={handleOpenCheckout} style={{ gridColumn: 'span 2', marginTop: '0.25rem' }}>
                        💵 Proceed to Checkout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}

          {/* TAB 2: SALES HISTORY */}
          {activeTab === 'sales' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div className="panel-header">
                <h2>Sales Transactions Log</h2>
                <button className="btn btn-secondary" onClick={fetchPastOrders} style={{ padding: '0.4rem 1rem' }}>
                  🔄 Refresh Logs
                </button>
              </div>

              {pastOrders.length > 0 ? (
                <div className="table-wrapper" style={{ marginTop: '1.5rem' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Order Number</th>
                        <th>Status</th>
                        <th>Total Due</th>
                        <th>Tendered</th>
                        <th>Change</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastOrders.map((ord) => {
                        const isCompleted = ord.status === 'COMPLETED'
                        const isVoided = ord.status === 'VOIDED'
                        return (
                          <tr key={ord.id}>
                            <td>{new Date(ord.created_at).toLocaleString()}</td>
                            <td>
                              <strong>{ord.order_number}</strong>
                              {ord.notes && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📝 {ord.notes}</p>}
                            </td>
                            <td>
                              <span className={`badge ${isCompleted ? 'badge-active' : isVoided ? 'badge-inactive' : 'badge-pending'}`}>
                                {ord.status}
                              </span>
                            </td>
                            <td><strong>${ord.total_amount.toFixed(2)}</strong></td>
                            <td>${ord.paid_amount.toFixed(2)}</td>
                            <td>${ord.change_amount.toFixed(2)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                {ord.receipt_url && (
                                  <a
                                    href={ord.receipt_url.startsWith('/') ? `http://localhost:8080${ord.receipt_url}` : ord.receipt_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="action-link"
                                  >
                                    📄 Receipt
                                  </a>
                                )}
                                {isCompleted && (
                                  <span
                                    className="action-link action-link-danger"
                                    onClick={() => handleVoidPastOrder(ord.id)}
                                  >
                                    Void Order
                                  </span>
                                )}
                                {!isCompleted && !isVoided && (
                                  <span
                                    className="action-link"
                                    onClick={() => {
                                      // Resume
                                      setActiveTab('pos')
                                      handleResumeOrder(ord)
                                    }}
                                  >
                                    Resume checkout
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', marginTop: '1.5rem' }}>No orders found for the active store context.</p>
              )}
            </div>
          )}

          {/* TAB 3: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div className="panel-header">
                <h2>System Overview</h2>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>Tenant Credentials</h3>
                  <p><strong>Company ID:</strong> {user?.company_id}</p>
                  <p><strong>User ID:</strong> {user?.user_id}</p>
                  <p><strong>Current Role:</strong> {user?.role}</p>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--secondary)', marginBottom: '0.5rem' }}>Active Scope</h3>
                  <p><strong>Selected Store ID:</strong> {activeStoreID || 'None'}</p>
                  <p>
                    <strong>Assigned Store Scope:</strong>{' '}
                    {user?.store_id ? user.store_id : 'Cross-Store Admin (Unrestricted)'}
                  </p>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Permissions Matrix</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {user?.permissions.map((p) => (
                      <span key={p} className="user-badge" style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.1)' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STORES */}
          {activeTab === 'stores' && (
            <>
              {user?.permissions.includes('store:write') && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <div className="panel-header">
                    <h2>Add Store Branch</h2>
                  </div>
                  <form onSubmit={handleCreateStore} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <div className="form-group">
                      <label>Store Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Colombo Branch"
                        value={newStoreName}
                        onChange={(e) => setNewStoreName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. +94112345678"
                        value={newStorePhone}
                        onChange={(e) => setNewStorePhone(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label>Address</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 123 Galle Road, Colombo 03"
                        value={newStoreAddress}
                        onChange={(e) => setNewStoreAddress(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2' }}>
                      Create Store
                    </button>
                  </form>
                </div>
              )}

              <div className="panel-header">
                <h2>Registered Stores</h2>
              </div>
              <div className="data-grid">
                {stores.map((s) => (
                  <div key={s.id} className="glass-panel data-card" style={{ borderLeft: s.id === activeStoreID ? '4px solid var(--accent)' : '' }}>
                    <div>
                      <div className="card-title">{s.name}</div>
                      <div className="card-meta">
                        <span>📍 {s.address || 'No address specified'}</span>
                        <span>📞 {s.phone || 'No phone specified'}</span>
                      </div>
                    </div>
                    <span className={`badge ${s.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB 5: TERMINALS */}
          {activeTab === 'terminals' && (
            <>
              {activeStoreID ? (
                <>
                  {user?.permissions.includes('terminal:write') && (
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <div className="panel-header">
                        <h2>Register POS Terminal</h2>
                      </div>
                      <form onSubmit={handleCreateTerminal} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                        <div className="form-group">
                          <label>Terminal Name</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Register 01"
                            value={newTerminalName}
                            onChange={(e) => setNewTerminalName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Device Serial Code (Unique)</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. TERM-SN-99882"
                            value={newTerminalDeviceCode}
                            onChange={(e) => setNewTerminalDeviceCode(e.target.value)}
                            required
                          />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2' }}>
                          Register Terminal
                        </button>
                      </form>
                    </div>
                  )}

                  <div className="panel-header">
                    <h2>POS Terminals</h2>
                  </div>
                  {terminals.length > 0 ? (
                    <div className="data-grid">
                      {terminals.map((t) => (
                        <div key={t.id} className="glass-panel data-card">
                          <div>
                            <div className="card-title">{t.name}</div>
                            <div className="card-meta">
                              <span>🔑 Code: <code>{t.device_code}</code></span>
                              <span>🔄 Last Sync: {t.last_sync_at ? new Date(t.last_sync_at).toLocaleString() : 'Never'}</span>
                              <span>🔢 Last Sync Version: {t.last_sync_version}</span>
                            </div>
                          </div>
                          <span className={`badge ${t.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>No terminals registered for the active store context.</p>
                  )}
                </>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Please select or create a Store scope first.</p>
              )}
            </>
          )}

          {/* TAB 6: INVITES */}
          {activeTab === 'invites' && user?.permissions.includes('invite:create') && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div className="panel-header">
                <h2>Invite Store Staff</h2>
              </div>
              <form onSubmit={handleInviteUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Staff Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="cashier@prismpos.local"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Assigned Role</label>
                  <select
                    className="form-control"
                    value={inviteRoleID}
                    onChange={(e) => setInviteRoleID(e.target.value)}
                    required
                  >
                    <option value="">Select a role</option>
                    {inviteRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Scoped Store (Optional - defaults to cross-store if empty)</label>
                  <select
                    className="form-control"
                    value={inviteStoreID}
                    onChange={(e) => setInviteStoreID(e.target.value)}
                  >
                    <option value="">Cross-Store / Corporate Access</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary">
                  Generate Invitation Token
                </button>
              </form>
            </div>
          )}

          {/* TAB 7: PRODUCT CATALOG */}
          {activeTab === 'catalog' && (
            <div>
              <div className="sub-tabs">
                <button className={`sub-tab-btn ${catalogSubTab === 'products' ? 'active' : ''}`} onClick={() => setCatalogSubTab('products')}>
                  📦 Products Catalog
                </button>
                <button className={`sub-tab-btn ${catalogSubTab === 'categories' ? 'active' : ''}`} onClick={() => setCatalogSubTab('categories')}>
                  🏷️ Categories Taxonomy
                </button>
              </div>

              {catalogSubTab === 'categories' && (
                <div className="split-layout">
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div className="panel-header">
                      <h3>Available Categories</h3>
                    </div>
                    {categories.length > 0 ? (
                      <div className="table-wrapper" style={{ marginTop: '1rem' }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Name</th>
                              <th>Description</th>
                              <th>Parent ID</th>
                              <th>Sync Version</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categories.map((c) => (
                              <tr key={c.id}>
                                <td><code style={{ fontSize: '0.75rem' }}>{c.id}</code></td>
                                <td><strong>{c.name}</strong></td>
                                <td>{c.description || <span style={{ color: 'var(--text-muted)' }}>No description</span>}</td>
                                <td>{c.parent_id ? <code style={{ fontSize: '0.75rem' }}>{c.parent_id}</code> : <span style={{ color: 'var(--text-muted)' }}>Top Level</span>}</td>
                                <td>{c.sync_version}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>No categories created yet.</p>
                    )}
                  </div>

                  {user?.permissions.includes('product:write') && (
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <div className="panel-header">
                        <h3>Add Category</h3>
                      </div>
                      <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        <div className="form-group">
                          <label>Category Name</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Beverages"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            placeholder="Brief category description..."
                            value={newCatDesc}
                            onChange={(e) => setNewCatDesc(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>Parent Category (Subcategory of)</label>
                          <select
                            className="form-control"
                            value={newCatParentID}
                            onChange={(e) => setNewCatParentID(e.target.value)}
                          >
                            <option value="">Top Level (No Parent)</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button type="submit" className="btn btn-primary">
                          Create Category
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {catalogSubTab === 'products' && (
                <div className="split-layout">
                  <div>
                    <div className="panel-header">
                      <h3>Master Product Catalog</h3>
                    </div>
                    {products.length > 0 ? (
                      <div className="data-grid" style={{ marginTop: '1rem' }}>
                        {products.map((p) => {
                          const categoryName = categories.find((c) => c.id === p.category_id)?.name || 'Uncategorized';
                          const isEditingOverride = editingOverrideProdID === p.id;
                          return (
                            <div key={p.id} className="glass-panel data-card" style={{ borderLeft: p.is_overridden ? '4px solid var(--accent)' : '' }}>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                  <div className="card-title">{p.name}</div>
                                  <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                                    🏷️ {categoryName}
                                  </span>
                                </div>
                                <div className="card-meta" style={{ marginTop: '0.5rem' }}>
                                  <span>SKU: <code>{p.sku}</code></span>
                                  {p.barcode && <span>Barcode: <code>{p.barcode}</code></span>}
                                  <span>Base Price: <strong>${p.price.toFixed(2)}</strong></span>
                                  <span>Base Tax Rate: {p.tax_rate}%</span>
                                  {p.active_price !== undefined && (
                                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                                      <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>Active in current Store:</div>
                                      <p style={{ fontSize: '1rem' }}>
                                        Price: <strong>${p.active_price.toFixed(2)}</strong>{' '}
                                        {p.is_overridden && <span className="badge badge-override">Overridden</span>}
                                      </p>
                                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Tax Rate: {p.active_tax_rate}% | Available:{' '}
                                        {p.active_is_available ? 'Yes' : 'No'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                                {isEditingOverride ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                    <h4 style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>Configure Override for Store</h4>
                                    <div className="form-row">
                                      <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.7rem' }}>Price ($)</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="form-control"
                                          placeholder={p.price.toString()}
                                          value={overridePrice}
                                          onChange={(e) => setOverridePrice(e.target.value)}
                                        />
                                      </div>
                                      <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.7rem' }}>Tax (%)</label>
                                        <input
                                          type="number"
                                          step="0.1"
                                          className="form-control"
                                          placeholder={p.tax_rate.toString()}
                                          value={overrideTax}
                                          onChange={(e) => setOverrideTax(e.target.value)}
                                        />
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <input
                                        type="checkbox"
                                        id={`available-${p.id}`}
                                        checked={overrideAvailable}
                                        onChange={(e) => setOverrideAvailable(e.target.checked)}
                                      />
                                      <label htmlFor={`available-${p.id}`} style={{ fontSize: '0.85rem', cursor: 'pointer' }}>Available in Store</label>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <button className="btn btn-primary" onClick={() => handleUpsertOverride(p.id)} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
                                        Save
                                      </button>
                                      <button className="btn btn-secondary" onClick={() => setEditingOverrideProdID(null)} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {activeStoreID && user?.permissions.includes('inventory:write') && (
                                      <button className="btn btn-secondary" onClick={() => {
                                        setEditingOverrideProdID(p.id)
                                        setOverridePrice(p.is_overridden && p.active_price !== p.price ? p.active_price.toString() : '')
                                        setOverrideTax(p.is_overridden && p.active_tax_rate !== p.tax_rate ? p.active_tax_rate.toString() : '')
                                        setOverrideAvailable(p.is_overridden ? p.active_is_available : true)
                                      }} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1 }}>
                                        ⚙️ Set Store Override
                                      </button>
                                    )}
                                    {p.is_overridden && user?.permissions.includes('inventory:write') && (
                                      <button className="btn btn-danger" onClick={() => handleDeleteOverride(p.id)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                        🗑️ Clear Override
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>No products created yet.</p>
                    )}
                  </div>

                  {user?.permissions.includes('product:write') && (
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <div className="panel-header">
                        <h3>Add Product</h3>
                      </div>
                      <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        <div className="form-group">
                          <label>Product Name</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Cafe Latte"
                            value={newProdName}
                            onChange={(e) => setNewProdName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>SKU (Unique)</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. COF-LAT-01"
                            value={newProdSKU}
                            onChange={(e) => setNewProdSKU(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Barcode</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. 5449000000096"
                            value={newProdBarcode}
                            onChange={(e) => setNewProdBarcode(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>Description</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Short product description..."
                            value={newProdDesc}
                            onChange={(e) => setNewProdDesc(e.target.value)}
                          />
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Base Price ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              placeholder="0.00"
                              value={newProdPrice}
                              onChange={(e) => setNewProdPrice(e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Cost Price ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              placeholder="0.00"
                              value={newProdCostPrice}
                              onChange={(e) => setNewProdCostPrice(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Tax Rate (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            className="form-control"
                            placeholder="0.0"
                            value={newProdTaxRate}
                            onChange={(e) => setNewProdTaxRate(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>Category</label>
                          <select
                            className="form-control"
                            value={newProdCategoryID}
                            onChange={(e) => setNewProdCategoryID(e.target.value)}
                          >
                            <option value="">Uncategorized</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button type="submit" className="btn btn-primary">
                          Create Product
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: INVENTORY */}
          {activeTab === 'inventory' && (
            <div>
              <div className="sub-tabs">
                <button className={`sub-tab-btn ${inventorySubTab === 'stock' ? 'active' : ''}`} onClick={() => setInventorySubTab('stock')}>
                  📋 Stock Levels
                </button>
                <button className={`sub-tab-btn ${inventorySubTab === 'logs' ? 'active' : ''}`} onClick={() => setInventorySubTab('logs')}>
                  🔄 Stock Movement Logs
                </button>
              </div>

              {inventorySubTab === 'stock' && (
                <div>
                  <div className="panel-header">
                    <h3>Current Inventory Levels</h3>
                  </div>
                  {activeStoreID ? (
                    inventory.length > 0 ? (
                      <div className="data-grid" style={{ marginTop: '1rem' }}>
                        {inventory.map((item) => {
                          const prodDetail = products.find((p) => p.id === item.product_id);
                          const prodName = prodDetail?.name || 'Unknown Product';
                          const prodSKU = prodDetail?.sku || 'N/A';
                          const isLowStock = item.quantity < item.reorder_level;
                          const isUpdatingReorder = updatingReorderProdID === item.product_id;

                          return (
                            <div key={item.id} className={`glass-panel data-card ${isLowStock ? 'card-danger' : ''}`}>
                              <div>
                                <div className="card-title">{prodName}</div>
                                <div className="card-meta" style={{ marginTop: '0.5rem' }}>
                                  <span>SKU: <code>{prodSKU}</code></span>
                                  <span style={{ fontSize: '1.2rem', marginTop: '0.25rem' }}>
                                    Current Stock: <strong style={{ color: isLowStock ? '#f87171' : 'var(--success)' }}>{item.quantity} units</strong>
                                  </span>
                                  <span>
                                    Reorder Level: <strong>{item.reorder_level} units</strong>
                                  </span>
                                </div>
                              </div>

                              <div style={{ marginTop: '1rem' }}>
                                {isUpdatingReorder ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <input
                                      type="number"
                                      step="1"
                                      className="form-control"
                                      placeholder="New reorder level"
                                      value={newReorderLevel}
                                      onChange={(e) => setNewReorderLevel(e.target.value)}
                                      style={{ padding: '0.4rem' }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <button className="btn btn-primary" onClick={() => handleUpdateReorderLevel(item.product_id)} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
                                        Save
                                      </button>
                                      <button className="btn btn-secondary" onClick={() => setUpdatingReorderProdID(null)} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  user?.permissions.includes('inventory:write') && (
                                    <button className="btn btn-secondary" onClick={() => {
                                      setUpdatingReorderProdID(item.product_id)
                                      setNewReorderLevel(item.reorder_level.toString())
                                    }} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: '100%' }}>
                                      ⚙️ Set Reorder Threshold
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>No inventory records found. Add stock movements to populate stock.</p>
                    )
                  ) : (
                    <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Please select a Store context first.</p>
                  )}
                </div>
              )}

              {inventorySubTab === 'logs' && (
                <div className="split-layout">
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div className="panel-header">
                      <h3>Stock Movements Log</h3>
                    </div>
                    {movements.length > 0 ? (
                      <div className="table-wrapper" style={{ marginTop: '1rem' }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Product</th>
                              <th>Type</th>
                              <th>Quantity</th>
                              <th>Reference</th>
                              <th>Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {movements.map((m) => {
                              const prodDetail = products.find((p) => p.id === m.product_id);
                              const prodName = prodDetail?.name || 'Unknown Product';
                              const isReduction = m.quantity < 0;
                              return (
                                <tr key={m.id}>
                                  <td>{new Date(m.created_at).toLocaleString()}</td>
                                  <td><strong>{prodName}</strong></td>
                                  <td>
                                    <span className={`badge ${['sale', 'damage'].includes(m.type) ? 'badge-inactive' : 'badge-active'}`}>
                                      {m.type}
                                    </span>
                                  </td>
                                  <td>
                                    <strong style={{ color: isReduction ? '#fca5a5' : '#a7f3d0' }}>
                                      {isReduction ? '' : '+'}{m.quantity}
                                    </strong>
                                  </td>
                                  <td>{m.reference_id ? <code>{m.reference_id}</code> : <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                                  <td>{m.reason || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>No stock movements recorded yet.</p>
                    )}
                  </div>

                  {user?.permissions.includes('inventory:write') && (
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <div className="panel-header">
                        <h3>Stock Adjustment</h3>
                      </div>
                      <form onSubmit={handleRecordMovement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        <div className="form-group">
                          <label>Product</label>
                          <select
                            className="form-control"
                            value={newMoveProdID}
                            onChange={(e) => setNewMoveProdID(e.target.value)}
                            required
                          >
                            <option value="">Select product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Movement Type</label>
                          <select
                            className="form-control"
                            value={newMoveType}
                            onChange={(e) => setNewMoveType(e.target.value)}
                            required
                          >
                            <option value="receive">📥 Receive Stock (+)</option>
                            <option value="return">📥 Customer Return (+)</option>
                            <option value="adjustment">🔄 Manual Correction (Increase) (+)</option>
                            <option value="sale">📤 Sale (-)</option>
                            <option value="damage">📤 Damaged Stock (-)</option>
                            <option value="adjustment_out">🔄 Manual Correction (Decrease) (-)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Quantity</label>
                          <input
                            type="number"
                            step="0.001"
                            className="form-control"
                            placeholder="0.0"
                            value={newMoveQty}
                            onChange={(e) => setNewMoveQty(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Reference ID</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. PO-9988 or INV-12"
                            value={newMoveRef}
                            onChange={(e) => setNewMoveRef(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>Reason / Notes</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Why is this movement recorded?"
                            value={newMoveReason}
                            onChange={(e) => setNewMoveReason(e.target.value)}
                          />
                        </div>
                        <button type="submit" className="btn btn-primary">
                          Record Movement
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 9: CUSTOMERS & CRM */}
          {activeTab === 'crm' && (
            <div className="crm-layout">
              <div className="split-layout">
                {/* Left side: Create/Update form */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <div className="panel-header">
                    <h3>{selectedCustomer ? '✏️ Edit Customer Profile' : '👥 Register New Customer'}</h3>
                  </div>
                  <form onSubmit={selectedCustomer ? handleUpdateCustomer : handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div className="form-group">
                      <label>Customer Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="John Doe"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="john@example.com"
                        value={custEmail}
                        onChange={(e) => setCustEmail(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="+1 (555) 019-2834"
                        value={custPhone}
                        onChange={(e) => setCustPhone(e.target.value)}
                      />
                    </div>
                    {selectedCustomer && (
                      <div className="form-group" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                        <label>Loyalty Points</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="Adjust loyalty points"
                          value={custLoyaltyPoints}
                          onChange={(e) => setCustLoyaltyPoints(e.target.value)}
                        />
                        <small style={{ color: 'var(--text-muted)' }}>Updating points will automatically adjust the tier.</small>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                        {selectedCustomer ? 'Save Changes' : 'Register Customer'}
                      </button>
                      {selectedCustomer && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setSelectedCustomer(null)
                            setCustName('')
                            setCustEmail('')
                            setCustPhone('')
                            setCustLoyaltyPoints('')
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Right side: Customers list */}
                <div className="glass-panel" style={{ padding: '2rem', flex: 1.5 }}>
                  <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3>Registered Customers</h3>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search name, phone, email..."
                      value={crmSearchQuery}
                      onChange={(e) => setCrmSearchQuery(e.target.value)}
                      style={{ maxWidth: '250px' }}
                    />
                  </div>
                  {customers.length > 0 ? (
                    <div className="table-wrapper" style={{ marginTop: '1rem' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Loyalty Tier</th>
                            <th>Points</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers.map((c) => (
                            <tr key={c.id}>
                              <td><strong>{c.name}</strong></td>
                              <td>{c.email || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                              <td>{c.phone || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                              <td>
                                <span className={`badge badge-tier-${(c.loyalty_tier || 'BRONZE').toLowerCase()}`}>
                                  {c.loyalty_tier || 'BRONZE'}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: 'var(--accent)' }}>{c.loyalty_points}</strong>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                      setSelectedCustomer(c)
                                      setCustName(c.name)
                                      setCustEmail(c.email || '')
                                      setCustPhone(c.phone || '')
                                      setCustLoyaltyPoints(c.loyalty_points?.toString() || '0')
                                    }}
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn btn-danger"
                                    onClick={() => handleDeleteCustomer(c.id)}
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>No customers registered yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: REPORTS */}
          {activeTab === 'reports' && (
            <div className="reports-layout glass-panel" style={{ padding: '2rem' }}>
              {/* Visible ONLY when printing */}
              <div className="print-report-header" style={{ display: 'none' }}>
                <h1 style={{ fontSize: '1.8rem', color: 'black', marginBottom: '0.25rem' }}>PRISM POS - Business Report</h1>
                <p style={{ fontSize: '0.9rem', color: '#555' }}>
                  Generated on: {new Date().toLocaleString()} | Active Store: {companyInfo?.name || 'All Branches'}
                </p>
                {reportsSubTab !== 'valuation' && (
                  <p style={{ fontSize: '0.9rem', color: '#555', marginTop: '0.2rem' }}>
                    Report Period: {reportsStartDate} to {reportsEndDate}
                  </p>
                )}
                <h2 style={{ fontSize: '1.4rem', marginTop: '1rem', borderTop: '1px solid #ccc', paddingTop: '0.5rem' }}>
                  {reportsSubTab === 'daily-sales' && 'Daily Sales Summary Report'}
                  {reportsSubTab === 'top-products' && 'Top Selling Products Report'}
                  {reportsSubTab === 'valuation' && 'Inventory Financial Valuation Report'}
                </h2>
              </div>

              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className={`btn ${reportsSubTab === 'daily-sales' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setReportsSubTab('daily-sales')}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    📊 Daily Sales Summary
                  </button>
                  <button
                    className={`btn ${reportsSubTab === 'top-products' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setReportsSubTab('top-products')}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    🏆 Top Selling Products
                  </button>
                  <button
                    className={`btn ${reportsSubTab === 'valuation' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setReportsSubTab('valuation')}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    💰 Inventory Financial Valuation
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {reportsSubTab !== 'valuation' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="date"
                        className="form-control"
                        value={reportsStartDate}
                        onChange={(e) => setReportsStartDate(e.target.value)}
                        style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                      />
                      <span style={{ color: 'var(--text-muted)' }}>to</span>
                      <input
                        type="date"
                        className="form-control"
                        value={reportsEndDate}
                        onChange={(e) => setReportsEndDate(e.target.value)}
                        style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                      />
                    </div>
                  )}
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => window.print()}
                    style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
                  >
                    📄 Export PDF
                  </button>
                </div>
              </div>

              {/* Daily Sales tab */}
              {reportsSubTab === 'daily-sales' && (
                <div>
                  {dailySalesSummary ? (
                    <div>
                      {/* Metric cards */}
                      <div className="data-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '2rem' }}>
                        <div className="glass-panel data-card" style={{ borderLeft: '3px solid var(--accent)' }}>
                          <span className="card-label">Total Revenue</span>
                          <strong style={{ fontSize: '1.8rem', color: 'var(--accent)' }}>
                            ${dailySalesSummary.total_revenue.toFixed(2)}
                          </strong>
                        </div>
                        <div className="glass-panel data-card" style={{ borderLeft: '3px solid var(--primary)' }}>
                          <span className="card-label">Completed Orders</span>
                          <strong style={{ fontSize: '1.8rem', color: 'var(--text-main)' }}>
                            {dailySalesSummary.order_count}
                          </strong>
                        </div>
                        <div className="glass-panel data-card" style={{ borderLeft: '3px solid var(--secondary)' }}>
                          <span className="card-label">Average Order Value (AOV)</span>
                          <strong style={{ fontSize: '1.8rem', color: 'var(--secondary)' }}>
                            ${dailySalesSummary.average_order_value.toFixed(2)}
                          </strong>
                        </div>
                        <div className="glass-panel data-card" style={{ borderLeft: '3px solid var(--success)' }}>
                          <span className="card-label">Tax Collected</span>
                          <strong style={{ fontSize: '1.8rem', color: 'var(--success)' }}>
                            ${dailySalesSummary.tax_collected.toFixed(2)}
                          </strong>
                        </div>
                        <div className="glass-panel data-card" style={{ borderLeft: '3px solid #fb7185' }}>
                          <span className="card-label">Discounts Applied</span>
                          <strong style={{ fontSize: '1.8rem', color: '#fb7185' }}>
                            -${dailySalesSummary.discount_amount.toFixed(2)}
                          </strong>
                        </div>
                        <div className="glass-panel data-card" style={{ borderLeft: '3px solid var(--danger)' }}>
                          <span className="card-label">Voided Orders</span>
                          <strong style={{ fontSize: '1.8rem', color: 'var(--danger)' }}>
                            {dailySalesSummary.voided_order_count} (${dailySalesSummary.voided_order_amount.toFixed(2)})
                          </strong>
                        </div>
                      </div>

                      {/* Payment Methods breakdown */}
                      <div className="glass-panel" style={{ padding: '1.5rem', maxWidth: '500px' }}>
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>💵 Payments Breakdown</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {Object.keys(dailySalesSummary.payments_breakdown).length > 0 ? (
                            Object.entries(dailySalesSummary.payments_breakdown).map(([method, amount]: any) => (
                              <div key={method} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                <span style={{ textTransform: 'uppercase', fontWeight: '600' }}>{method}</span>
                                <strong>${amount.toFixed(2)}</strong>
                              </div>
                            ))
                          ) : (
                            <p style={{ color: 'var(--text-muted)' }}>No completed transaction payments found for this period.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Fetching sales summary data...</p>
                  )}
                </div>
              )}

              {/* Top Products tab */}
              {reportsSubTab === 'top-products' && (
                <div>
                  {topProducts.length > 0 ? (
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: '80px' }}>Rank</th>
                            <th>Product Name</th>
                            <th>SKU</th>
                            <th>Quantity Sold</th>
                            <th>Total Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topProducts.map((p, idx) => (
                            <tr key={p.product_id}>
                              <td><strong>#{idx + 1}</strong></td>
                              <td><strong>{p.product_name}</strong></td>
                              <td><code>{p.product_sku}</code></td>
                              <td>{p.quantity_sold}</td>
                              <td><strong style={{ color: 'var(--accent)' }}>${p.total_revenue.toFixed(2)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>No product sales recorded in this date range.</p>
                  )}
                </div>
              )}

              {/* Inventory Valuation tab */}
              {reportsSubTab === 'valuation' && (
                <div>
                  {inventoryValuation ? (
                    <div>
                      {/* Valuation cards */}
                      <div className="data-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
                        <div className="glass-panel data-card" style={{ borderLeft: '3px solid var(--primary)' }}>
                          <span className="card-label">Total Stock Quantity</span>
                          <strong style={{ fontSize: '1.8rem', color: 'var(--text-main)' }}>
                            {inventoryValuation.total_items_in_stock}
                          </strong>
                        </div>
                        <div className="glass-panel data-card" style={{ borderLeft: '3px solid var(--accent)' }}>
                          <span className="card-label">Total Retail Value</span>
                          <strong style={{ fontSize: '1.8rem', color: 'var(--accent)' }}>
                            ${inventoryValuation.total_retail_value.toFixed(2)}
                          </strong>
                        </div>
                        <div className="glass-panel data-card" style={{ borderLeft: '3px solid var(--secondary)' }}>
                          <span className="card-label">Total Cost Value</span>
                          <strong style={{ fontSize: '1.8rem', color: 'var(--secondary)' }}>
                            ${inventoryValuation.total_cost_value.toFixed(2)}
                          </strong>
                        </div>
                        <div className="glass-panel data-card" style={{ borderLeft: '3px solid var(--success)' }}>
                          <span className="card-label">Potential Gross Profit</span>
                          <strong style={{ fontSize: '1.8rem', color: 'var(--success)' }}>
                            ${inventoryValuation.potential_profit.toFixed(2)}
                          </strong>
                        </div>
                        <div className="glass-panel data-card" style={{ borderLeft: '3px solid #f59e0b' }}>
                          <span className="card-label">Profit Margin</span>
                          <strong style={{ fontSize: '1.8rem', color: '#f59e0b' }}>
                            {inventoryValuation.profit_margin.toFixed(2)}%
                          </strong>
                        </div>
                      </div>

                      {/* Category Breakdown Table */}
                      <div className="panel-header" style={{ marginBottom: '0.75rem' }}>
                        <h3>Valuation Breakdown by Category</h3>
                      </div>
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th>Items in Stock</th>
                              <th>Retail Value</th>
                              <th>Cost Value</th>
                              <th>Potential Profit</th>
                              <th>Margin</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(inventoryValuation.category_breakdown).map(([catName, val]: any) => {
                              const potentialProfit = val.retail_value - val.cost_value
                              const margin = val.retail_value > 0 ? (potentialProfit / val.retail_value) * 100 : 0
                              return (
                                <tr key={catName}>
                                  <td><strong>{catName}</strong></td>
                                  <td>{val.total_items}</td>
                                  <td>${val.retail_value.toFixed(2)}</td>
                                  <td>${val.cost_value.toFixed(2)}</td>
                                  <td><strong style={{ color: 'var(--success)' }}>${potentialProfit.toFixed(2)}</strong></td>
                                  <td><strong style={{ color: '#f59e0b' }}>{margin.toFixed(2)}%</strong></td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Fetching inventory valuation...</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 12: KITCHEN DISPLAY */}
          {activeTab === 'kitchen' && activeModules.includes('restaurant') && (
            <div className="glass-panel" style={{ padding: '1rem' }}>
              <KitchenDisplay
                apiCall={apiCall}
                activeStoreID={activeStoreID}
                setErrorMsg={setErrorMsg}
                setSuccessMsg={setSuccessMsg}
              />
            </div>
          )}

          {/* TAB 11: STORE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="settings-layout glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
              <div className="panel-header">
                <h3>⚙️ Store Settings & Configurations</h3>
              </div>
              <form onSubmit={handleUpdateStoreSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                <div className="form-group">
                  <label>Store Currency</label>
                  <select
                    className="form-control"
                    value={settingsCurrency}
                    onChange={(e) => setSettingsCurrency(e.target.value)}
                    required
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="LKR">LKR (Rs)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Default Store Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="e.g. 8.25"
                    value={settingsTaxRate}
                    onChange={(e) => setSettingsTaxRate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                  <label>Receipt Logo URL</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="https://example.com/logo.png"
                    value={settingsReceiptLogo}
                    onChange={(e) => setSettingsReceiptLogo(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Receipt Header Text</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Welcome to Acme Store Branch!"
                    value={settingsReceiptHeader}
                    onChange={(e) => setSettingsReceiptHeader(e.target.value)}
                    style={{ resize: 'none' }}
                  />
                </div>
                <div className="form-group">
                  <label>Receipt Footer Text</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Thank you for shopping with us! Please come again."
                    value={settingsReceiptFooter}
                    onChange={(e) => setSettingsReceiptFooter(e.target.value)}
                    style={{ resize: 'none' }}
                  />
                </div>

                <div className="form-group" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                  <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Plugged Modules</label>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem' }}>
                    Select which POS modules are attached and enabled for this store location.
                  </span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Retail POS Module */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <input
                        type="checkbox"
                        checked={activeModules.includes('retail')}
                        onChange={() => handleToggleModule('retail', activeModules.includes('retail'))}
                        style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--accent)' }}
                      />
                      <div>
                        <div style={{ fontWeight: '500' }}>🛍️ Standard Retail POS</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Standard product catalog grid, cart, customer checkout.</div>
                      </div>
                    </label>

                    {/* Restaurant POS Module */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <input
                        type="checkbox"
                        checked={activeModules.includes('restaurant')}
                        onChange={() => handleToggleModule('restaurant', activeModules.includes('restaurant'))}
                        style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--accent)' }}
                      />
                      <div>
                        <div style={{ fontWeight: '500' }}>🍽️ Restaurant POS Module</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dining floor plans, table layouts, seat covers, KOT / kitchen display system.</div>
                      </div>
                    </label>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', padding: '1rem' }}>
                  💾 Save Settings Configuration
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* CHECKOUT CASHIER MODAL */}
      {checkoutModalOpen && (
        <div className="modal-overlay">
          <div className="checkout-modal glass-panel">
            <div className="checkout-modal-header">
              <h3>💵 CASH PAYMENT PROCESSOR</h3>
              <button className="close-modal-btn" onClick={handleCloseCheckoutModal}>
                &times;
              </button>
            </div>

            {errorMsg && <div className="alert alert-danger" style={{ marginBottom: 0 }}>{errorMsg}</div>}

            {!checkoutSuccess ? (
              <>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>GRAND TOTAL DUE:</span>
                  <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--accent)', marginTop: '0.25rem' }}>
                    ${cartSummary.grandTotal.toFixed(2)}
                  </div>
                </div>

                <div className="form-group">
                  <label>Amount Tendered ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="Enter cash received"
                    value={checkoutAmountPaid}
                    onChange={(e) => handleAmountTenderedChange(e.target.value, cartSummary.grandTotal)}
                    style={{ fontSize: '1.25rem', padding: '1rem', textAlign: 'center' }}
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>QUICK CASH PRESETS:</label>
                  <div className="cash-presets">
                    <button
                      className="preset-btn"
                      onClick={() => handleAmountTenderedChange(cartSummary.grandTotal.toFixed(2), cartSummary.grandTotal)}
                    >
                      Exact Change
                    </button>
                    {[5, 10, 20, 50, 100].map((preset) => {
                      const isDisabled = preset < cartSummary.grandTotal
                      return (
                        <button
                          key={preset}
                          className="preset-btn"
                          onClick={() => handleAmountTenderedChange(preset.toFixed(2), cartSummary.grandTotal)}
                          disabled={isDisabled}
                          style={{ opacity: isDisabled ? 0.3 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                        >
                          ${preset}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {parseFloat(checkoutAmountPaid) >= cartSummary.grandTotal && (
                  <div className="change-display">
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CHANGE DUE BACK:</span>
                    <div className="change-amount">
                      ${checkoutChangeAmount.toFixed(2)}
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  onClick={() => handleCompleteCheckout(cartSummary.grandTotal)}
                  disabled={parseFloat(checkoutAmountPaid) < cartSummary.grandTotal}
                  style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginTop: '0.5rem' }}
                >
                  ✔️ Complete Transaction
                </button>
              </>
            ) : (
              <div className="checkout-success-view">
                <div className="success-icon">✓</div>
                <h4 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--success)' }}>
                  Transaction Completed!
                </h4>
                
                <div style={{ padding: '1.25rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '8px', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Sale:</span>
                    <strong>${cartSummary.grandTotal.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Amount Paid:</span>
                    <span>${parseFloat(checkoutAmountPaid).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ color: 'var(--success)' }}>Change Returned:</span>
                    <strong style={{ color: 'var(--success)' }}>${checkoutChangeAmount.toFixed(2)}</strong>
                  </div>
                  {selectedCustomerID && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', borderTop: '1px dotted rgba(255,255,255,0.08)', paddingTop: '0.4rem', marginTop: '0.1rem' }}>
                      <span style={{ color: 'var(--accent)' }}>Loyalty Points Earned:</span>
                      <strong style={{ color: 'var(--accent)' }}>+{Math.floor(cartSummary.grandTotal)} pts</strong>
                    </div>
                  )}
                </div>

                {checkoutReceiptURL && (
                  <a
                    href={checkoutReceiptURL.startsWith('/') ? `http://localhost:8080${checkoutReceiptURL}` : checkoutReceiptURL}
                    target="_blank"
                    rel="noreferrer"
                    className="btn receipt-print-btn"
                    style={{ width: '100%' }}
                  >
                    📄 Print Receipt PDF
                  </a>
                )}

                <button
                  className="btn btn-secondary"
                  onClick={handleCloseCheckoutModal}
                  style={{ width: '100%', padding: '0.8rem' }}
                >
                  🔄 Start New Sale
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App

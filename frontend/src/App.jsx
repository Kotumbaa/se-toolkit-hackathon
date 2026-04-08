import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Button, Form, ListGroup, Badge, Alert, Tabs, Tab, Modal, Nav, InputGroup } from 'react-bootstrap'

const API_URL = '/api'

function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null)
  const [loginUsername, setLoginUsername] = useState('')
  const [registerForm, setRegisterForm] = useState({
    username: '', display_name: '', phone: '', card_number: '', payment_details: ''
  })
  const [authMode, setAuthMode] = useState('login')
  const [authError, setAuthError] = useState(null)

  // App state
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [debts, setDebts] = useState([])
  const [payments, setPayments] = useState([])
  const [inviteCode, setInviteCode] = useState('')
  const [joinError, setJoinError] = useState(null)
  const [error, setError] = useState(null)

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    description: '', amount: '', paid_by_id: '', split_between: []
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')

  // Profile modal
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileForm, setProfileForm] = useState({
    display_name: '', phone: '', card_number: '', payment_details: ''
  })

  const [activeTab, setActiveTab] = useState('mydebts')

  // Admin state
  const [adminTab, setAdminTab] = useState('users')
  const [adminUsers, setAdminUsers] = useState([])
  const [adminGroups, setAdminGroups] = useState([])
  const [adminStats, setAdminStats] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)

  // Check for saved session
  useEffect(() => {
    const savedUser = localStorage.getItem('expensesplitter_user')
    if (savedUser) setCurrentUser(JSON.parse(savedUser))
  }, [])

  // ============ AUTH ============
  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername })
      })
      if (res.ok) {
        const user = await res.json()
        setCurrentUser(user)
        localStorage.setItem('expensesplitter_user', JSON.stringify(user))
        setAuthError(null)
      } else {
        setAuthError('User not found. Please register first.')
      }
    } catch { setAuthError('Failed to login') }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      })
      if (res.ok) {
        const user = await res.json()
        setCurrentUser(user)
        localStorage.setItem('expensesplitter_user', JSON.stringify(user))
        setAuthError(null)
      } else {
        const data = await res.json()
        setAuthError(data.detail || 'Registration failed')
      }
    } catch { setAuthError('Failed to register') }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem('expensesplitter_user')
    setSelectedGroup(null)
    setGroups([])
  }

  // ============ PROFILE ============
  const openProfileModal = () => {
    setProfileForm({
      display_name: currentUser.display_name,
      phone: currentUser.phone || '',
      card_number: currentUser.card_number || '',
      payment_details: currentUser.payment_details || ''
    })
    setShowProfileModal(true)
  }

  const saveProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      })
      if (res.ok) {
        const updated = await res.json()
        setCurrentUser(updated)
        localStorage.setItem('expensesplitter_user', JSON.stringify(updated))
        setShowProfileModal(false)
      }
    } catch { setError('Failed to update profile') }
  }

  // ============ GROUPS ============
  const fetchGroups = async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`${API_URL}/groups/user/${currentUser.id}`)
      const data = await res.json()
      setGroups(data)
    } catch { setError('Failed to fetch groups') }
  }

  useEffect(() => {
    if (currentUser) fetchGroups()
  }, [currentUser])

  // Refresh data when tab changes
  useEffect(() => {
    if (selectedGroup) fetchGroupDetails(selectedGroup.id)
  }, [activeTab])

  const fetchGroupDetails = async (groupId) => {
    try {
      const [membersRes, expensesRes, debtsRes, paymentsRes] = await Promise.all([
        fetch(`${API_URL}/groups/${groupId}/members`),
        fetch(`${API_URL}/expenses/group/${groupId}`),
        fetch(`${API_URL}/debts/group/${groupId}`),
        fetch(`${API_URL}/debts/group/${groupId}/payments`)
      ])
      setMembers(await membersRes.json())
      setExpenses(await expensesRes.json())
      setDebts((await debtsRes.json()).debts)
      setPayments(await paymentsRes.json())
      setSelectedGroup(groups.find(g => g.id === groupId) || selectedGroup)
    } catch { setError('Failed to fetch group details') }
  }

  const createGroup = async (e) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    try {
      const res = await fetch(`${API_URL}/groups/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, user_id: currentUser.id })
      })
      if (res.ok) {
        setNewGroupName('')
        setShowCreateModal(false)
        fetchGroups()
      }
    } catch { setError('Failed to create group') }
  }

  const joinGroup = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    try {
      const res = await fetch(`${API_URL}/groups/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: inviteCode, user_id: currentUser.id })
      })
      if (res.ok) {
        setInviteCode('')
        setJoinError(null)
        fetchGroups()
      } else {
        const data = await res.json()
        setJoinError(data.detail || 'Failed to join')
      }
    } catch { setJoinError('Failed to join group') }
  }

  // ============ EXPENSES ============
  const addExpense = async (e) => {
    e.preventDefault()
    if (!selectedGroup || !expenseForm.paid_by_id) return
    const splitBetween = expenseForm.split_between.length > 0
      ? expenseForm.split_between : members.map(m => m.id)
    try {
      const res = await fetch(`${API_URL}/expenses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          paid_by_id: parseInt(expenseForm.paid_by_id),
          group_id: selectedGroup.id,
          split_between: splitBetween
        })
      })
      if (res.ok) {
        setExpenseForm({ description: '', amount: '', paid_by_id: '', split_between: [] })
        fetchGroupDetails(selectedGroup.id)
      }
    } catch { setError('Failed to add expense') }
  }

  const toggleSplitMember = (memberId) => {
    setExpenseForm(prev => ({
      ...prev,
      split_between: prev.split_between.includes(memberId)
        ? prev.split_between.filter(id => id !== memberId)
        : [...prev.split_between, memberId]
    }))
  }

  // ============ PAYMENTS ============
  const openPaymentModal = (debt) => {
    setSelectedDebt(debt)
    setPaymentAmount(debt.amount.toFixed(2))
    setShowPaymentModal(true)
  }

  const recordPayment = async () => {
    if (!selectedDebt || !paymentAmount) return
    try {
      const res = await fetch(`${API_URL}/debts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_member_id: selectedDebt.from_member_id,
          to_member_id: selectedDebt.to_member_id,
          amount: parseFloat(paymentAmount),
          group_id: selectedGroup.id
        })
      })
      if (res.ok) {
        setShowPaymentModal(false)
        setSelectedDebt(null)
        setPaymentAmount('')
        fetchGroupDetails(selectedGroup.id)
      }
    } catch { setError('Failed to record payment') }
  }

  // ============ HELPERS ============
  const getMemberName = (memberId) => members.find(m => m.id === memberId)?.name || 'Unknown'
  const formatDate = (dateStr) => new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  })

  const currentMember = currentUser ? members.find(m => m.user_id === currentUser.id) : null

  const myDebts = currentMember ? debts.filter(d =>
    d.from_member_id === currentMember.id
  ) : []

  const myCredits = currentMember ? debts.filter(d =>
    d.to_member_id === currentMember.id
  ) : []

  // ============ ADMIN ============
  const fetchAdminData = async (type) => {
    if (!currentUser?.is_admin) return
    setAdminLoading(true)
    try {
      if (type === 'users') {
        const res = await fetch(`${API_URL}/admin/users?user_id=${currentUser.id}`)
        setAdminUsers(await res.json())
      } else if (type === 'groups') {
        const res = await fetch(`${API_URL}/admin/groups?user_id=${currentUser.id}`)
        setAdminGroups(await res.json())
      } else if (type === 'stats') {
        const res = await fetch(`${API_URL}/admin/stats?user_id=${currentUser.id}`)
        setAdminStats(await res.json())
      }
    } catch { setError('Failed to load admin data') }
    setAdminLoading(false)
  }

  const toggleUserAdmin = async (userId) => {
    try {
      await fetch(`${API_URL}/admin/users/${userId}/admin?user_id=${currentUser.id}`, { method: 'PUT' })
      fetchAdminData('users')
    } catch { setError('Failed to toggle admin') }
  }

  const deleteUser = async (userId) => {
    if (!confirm('Delete this user?')) return
    try {
      await fetch(`${API_URL}/admin/users/${userId}?user_id=${currentUser.id}`, { method: 'DELETE' })
      fetchAdminData('users')
    } catch { setError('Failed to delete user') }
  }

  const deleteGroup = async (groupId) => {
    if (!confirm('Delete this group and all its data?')) return
    try {
      await fetch(`${API_URL}/admin/groups/${groupId}?user_id=${currentUser.id}`, { method: 'DELETE' })
      fetchAdminData('groups')
    } catch { setError('Failed to delete group') }
  }

  // ============ AUTH SCREEN ============
  if (!currentUser) {
    return (
      <Container className="py-5" style={{ maxWidth: '500px' }}>
        <h1 className="mb-4 text-center">💰 ExpenseSplitter</h1>
        <Card>
          <Card.Body>
            <Nav variant="tabs" className="mb-3 justify-content-center">
              <Nav.Item><Nav.Link active={authMode === 'login'} onClick={() => { setAuthMode('login'); setAuthError(null) }}>Login</Nav.Link></Nav.Item>
              <Nav.Item><Nav.Link active={authMode === 'register'} onClick={() => { setAuthMode('register'); setAuthError(null) }}>Register</Nav.Link></Nav.Item>
            </Nav>
            {authError && <Alert variant="danger">{authError}</Alert>}
            {authMode === 'login' ? (
              <Form onSubmit={handleLogin}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="Enter your username" required />
                </Form.Group>
                <Button type="submit" variant="primary" className="w-100">Login</Button>
              </Form>
            ) : (
              <Form onSubmit={handleRegister}>
                <Form.Group className="mb-2">
                  <Form.Label>Username *</Form.Label>
                  <Form.Control value={registerForm.username} onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})} placeholder="Unique username" required />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Display Name *</Form.Label>
                  <Form.Control value={registerForm.display_name} onChange={(e) => setRegisterForm({...registerForm, display_name: e.target.value})} placeholder="Your name as shown to others" required />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Phone (for payments)</Form.Label>
                  <Form.Control value={registerForm.phone} onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})} placeholder="+7 999 123-45-67" />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Card Number</Form.Label>
                  <Form.Control value={registerForm.card_number} onChange={(e) => setRegisterForm({...registerForm, card_number: e.target.value})} placeholder="0000 0000 0000 0000" />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Other Payment Details</Form.Label>
                  <Form.Control as="textarea" rows={2} value={registerForm.payment_details} onChange={(e) => setRegisterForm({...registerForm, payment_details: e.target.value})} placeholder="Tinkoff, SberPay, etc." />
                </Form.Group>
                <Button type="submit" variant="success" className="w-100">Register</Button>
              </Form>
            )}
          </Card.Body>
        </Card>
      </Container>
    )
  }

  // ============ MAIN APP ============
  return (
    <Container className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">💰 ExpenseSplitter</h1>
        <div className="d-flex gap-2">
          <Badge bg="primary" style={{fontSize: '0.9rem'}}>{currentUser.display_name}</Badge>
          {currentUser.is_admin && (
            <Button variant="outline-dark" size="sm" onClick={() => { setActiveTab('admin'); fetchAdminData('stats') }}>⚙️ Admin</Button>
          )}
          <Button variant="outline-secondary" size="sm" onClick={openProfileModal}>👤 Profile</Button>
          <Button variant="outline-danger" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

      <Row>
        {/* Sidebar */}
        <Col md={3}>
          {/* My Groups */}
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              My Groups
              <Button variant="outline-primary" size="sm" onClick={() => setShowCreateModal(true)}>+ New</Button>
            </Card.Header>
            <Card.Body>
              {groups.length === 0 ? (
                <p className="text-muted small">No groups yet. Create or join one!</p>
              ) : (
                <ListGroup variant="flush">
                  {groups.map(g => (
                    <ListGroup.Item key={g.id} action active={selectedGroup?.id === g.id}
                      onClick={() => { setSelectedGroup(g); fetchGroupDetails(g.id) }}>
                      {g.name}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>

          {/* Join Group */}
          <Card>
            <Card.Header>Join a Group</Card.Header>
            <Card.Body>
              <Form onSubmit={joinGroup}>
                <InputGroup className="mb-2">
                  <Form.Control placeholder="Invite code (e.g. ABC123)"
                    value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    style={{textTransform: 'uppercase'}} />
                  <Button type="submit" variant="success">Join</Button>
                </InputGroup>
              </Form>
              {joinError && <small className="text-danger">{joinError}</small>}
            </Card.Body>
          </Card>
        </Col>

        {/* Main Content */}
        <Col md={9}>
          {selectedGroup ? (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="mb-0">{selectedGroup.name}</h2>
                <Badge bg="info" style={{fontSize: '1rem', cursor: 'pointer'}}
                  onClick={() => navigator.clipboard.writeText(selectedGroup.invite_code)}
                  title="Click to copy">
                  📋 Code: {selectedGroup.invite_code}
                </Badge>
              </div>

              <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
                {/* ===== MY DEBTS ===== */}
                <Tab eventKey="mydebts" title="📋 My Debts">
                  <Card className="mb-3">
                    <Card.Header className="text-danger">💸 You Owe</Card.Header>
                    <Card.Body>
                      {myDebts.length === 0 ? (
                        <p className="text-muted mb-0">You don't owe anyone! 🎉</p>
                      ) : (
                        <ListGroup>
                          {myDebts.map((debt, idx) => (
                            <ListGroup.Item key={idx}>
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  Pay <strong>{debt.to_member}</strong>
                                  {debt.to_member_phone && <div><small>📱 {debt.to_member_phone}</small></div>}
                                  {debt.to_member_card && <div><small>💳 {debt.to_member_card}</small></div>}
                                  {debt.to_member_payment_details && <div><small>📝 {debt.to_member_payment_details}</small></div>}
                                </div>
                                <div className="d-flex gap-2 align-items-center">
                                  <Badge bg="warning" text="dark" style={{fontSize: '1.1rem'}}>{debt.amount.toFixed(2)} ₽</Badge>
                                  <Button variant="success" size="sm" onClick={() => openPaymentModal(debt)}>✓ Paid</Button>
                                </div>
                              </div>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      )}
                    </Card.Body>
                  </Card>
                  <Card>
                    <Card.Header className="text-success">💰 Owed to You</Card.Header>
                    <Card.Body>
                      {myCredits.length === 0 ? (
                        <p className="text-muted mb-0">No one owes you</p>
                      ) : (
                        <ListGroup>
                          {myCredits.map((debt, idx) => (
                            <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-center">
                              <div><strong>{debt.from_member}</strong> owes you</div>
                              <Badge bg="info" style={{fontSize: '1.1rem'}}>{debt.amount.toFixed(2)} ₽</Badge>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      )}
                    </Card.Body>
                  </Card>
                </Tab>

                {/* ===== ALL DEBTS ===== */}
                <Tab eventKey="debts" title="📊 All Debts">
                  <Card className="mb-3">
                    <Card.Header>Debt Settlement</Card.Header>
                    <Card.Body>
                      {debts.length === 0 ? (
                        <p className="text-muted">No debts! Everyone is settled. 🎉</p>
                      ) : (
                        <ListGroup>
                          {debts.map((debt, idx) => (
                            <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-center">
                              <div><strong>{debt.from_member}</strong> owes <strong>{debt.to_member}</strong></div>
                              <div className="d-flex gap-2 align-items-center">
                                <Badge bg="warning" text="dark" style={{fontSize: '1.1rem'}}>{debt.amount.toFixed(2)} ₽</Badge>
                                <Button variant="success" size="sm" onClick={() => openPaymentModal(debt)}>✓ Mark as Paid</Button>
                              </div>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      )}
                    </Card.Body>
                  </Card>
                  <Card>
                    <Card.Header>Payment History</Card.Header>
                    <Card.Body>
                      {payments.length === 0 ? (
                        <p className="text-muted">No payments yet</p>
                      ) : (
                        <ListGroup variant="flush">
                          {payments.map(pay => (
                            <ListGroup.Item key={pay.id} className="d-flex justify-content-between">
                              <div>
                                <span className="text-success">✓</span> <strong>{getMemberName(pay.from_member_id)}</strong> → <strong>{getMemberName(pay.to_member_id)}</strong>
                                <br/><small className="text-muted">{formatDate(pay.created_at)}</small>
                              </div>
                              <Badge bg="success" style={{fontSize: '1rem'}}>{pay.amount.toFixed(2)} ₽</Badge>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      )}
                    </Card.Body>
                  </Card>
                </Tab>

                {/* ===== EXPENSES ===== */}
                <Tab eventKey="expenses" title="💵 Expenses">
                  {/* Members */}
                  <Card className="mb-3">
                    <Card.Header>Members ({members.length})</Card.Header>
                    <Card.Body>
                      <div className="d-flex flex-wrap gap-2">
                        {members.map(m => (
                          <Badge key={m.id} bg="secondary" style={{fontSize: '0.9rem'}}>
                            {m.name}{m.user_id === currentUser?.id ? ' (You)' : ''}
                          </Badge>
                        ))}
                      </div>
                    </Card.Body>
                  </Card>

                  {/* Add Expense */}
                  {members.length > 0 && (
                    <Card className="mb-3">
                      <Card.Header>Add Expense</Card.Header>
                      <Card.Body>
                        <Form onSubmit={addExpense}>
                          <Row>
                            <Col md={4}>
                              <Form.Control type="text" placeholder="Description"
                                value={expenseForm.description}
                                onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} required />
                            </Col>
                            <Col md={2}>
                              <Form.Control type="number" step="0.01" placeholder="Amount"
                                value={expenseForm.amount}
                                min="0.01"
                                onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} required />
                            </Col>
                            <Col md={3}>
                              <Form.Select value={expenseForm.paid_by_id}
                                onChange={(e) => setExpenseForm({...expenseForm, paid_by_id: e.target.value})} required>
                                <option value="">Paid by...</option>
                                {members.map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}
                              </Form.Select>
                            </Col>
                            <Col md={3}>
                              <Button type="submit" variant="success" className="w-100">Add Expense</Button>
                            </Col>
                          </Row>
                          <Form.Text className="text-muted">
                            Split: {expenseForm.split_between.length === 0 ? 'Everyone' : members.filter(m => expenseForm.split_between.includes(m.id)).map(m => m.name).join(', ')}
                            <br/>
                            {members.map(m => (
                              <Form.Check key={m.id} inline type="checkbox" label={m.name}
                                checked={expenseForm.split_between.includes(m.id)}
                                onChange={() => toggleSplitMember(m.id)} />
                            ))}
                          </Form.Text>
                        </Form>
                      </Card.Body>
                    </Card>
                  )}

                  {/* Expenses List */}
                  <Card>
                    <Card.Header>Expenses</Card.Header>
                    <Card.Body>
                      {expenses.length === 0 ? (
                        <p className="text-muted">No expenses yet</p>
                      ) : (
                        <ListGroup variant="flush">
                          {expenses.map(exp => (
                            <ListGroup.Item key={exp.id} className="d-flex justify-content-between">
                              <div>
                                <strong>{exp.description}</strong>
                                <br/><small className="text-muted">Paid by {getMemberName(exp.paid_by_id)}</small>
                              </div>
                              <Badge bg="success" style={{fontSize: '1rem'}}>{exp.amount.toFixed(2)} ₽</Badge>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      )}
                    </Card.Body>
                  </Card>
                </Tab>

                {/* ===== ADMIN ===== */}
                {currentUser?.is_admin && (
                  <Tab eventKey="admin" title="⚙️ Admin">
                    <div className="d-flex gap-2 mb-3">
                      <Button variant={adminTab === 'stats' ? 'primary' : 'outline-secondary'} size="sm" onClick={() => { setAdminTab('stats'); fetchAdminData('stats') }}>Stats</Button>
                      <Button variant={adminTab === 'users' ? 'primary' : 'outline-secondary'} size="sm" onClick={() => { setAdminTab('users'); fetchAdminData('users') }}>Users</Button>
                      <Button variant={adminTab === 'groups' ? 'primary' : 'outline-secondary'} size="sm" onClick={() => { setAdminTab('groups'); fetchAdminData('groups') }}>Groups</Button>
                    </div>
                    {adminTab === 'stats' && (
                      <Card><Card.Body>
                        {adminLoading ? <p>Loading...</p> : adminStats ? (
                          <Row>
                            <Col><div className="text-center"><h3>{adminStats.total_users}</h3><small className="text-muted">Users</small></div></Col>
                            <Col><div className="text-center"><h3>{adminStats.total_groups}</h3><small className="text-muted">Groups</small></div></Col>
                            <Col><div className="text-center"><h3>{adminStats.total_expenses}</h3><small className="text-muted">Expenses</small></div></Col>
                            <Col><div className="text-center"><h3>{adminStats.total_payments}</h3><small className="text-muted">Payments</small></div></Col>
                          </Row>
                        ) : <p className="text-muted">No data</p>}
                      </Card.Body></Card>
                    )}
                    {adminTab === 'users' && (
                      <Card><Card.Body>
                        {adminLoading ? <p>Loading...</p> : adminUsers.length === 0 ? <p className="text-muted">No users</p> : (
                          <table className="table table-sm">
                            <thead><tr><th>ID</th><th>Username</th><th>Name</th><th>Admin</th><th>Actions</th></tr></thead>
                            <tbody>
                              {adminUsers.map(u => (
                                <tr key={u.id}>
                                  <td>{u.id}</td><td>{u.username}</td><td>{u.display_name}</td>
                                  <td><Badge bg={u.is_admin ? 'success' : 'secondary'}>{u.is_admin ? 'Yes' : 'No'}</Badge></td>
                                  <td>
                                    <Button size="sm" variant="outline-primary" className="me-1" onClick={() => toggleUserAdmin(u.id)}>Toggle Admin</Button>
                                    {u.id !== currentUser.id && <Button size="sm" variant="outline-danger" onClick={() => deleteUser(u.id)}>Delete</Button>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </Card.Body></Card>
                    )}
                    {adminTab === 'groups' && (
                      <Card><Card.Body>
                        {adminLoading ? <p>Loading...</p> : adminGroups.length === 0 ? <p className="text-muted">No groups</p> : (
                          <table className="table table-sm">
                            <thead><tr><th>ID</th><th>Name</th><th>Code</th><th>Created By</th><th>Actions</th></tr></thead>
                            <tbody>
                              {adminGroups.map(g => (
                                <tr key={g.id}>
                                  <td>{g.id}</td><td>{g.name}</td><td><code>{g.invite_code}</code></td><td>{g.created_by_id}</td>
                                  <td><Button size="sm" variant="outline-danger" onClick={() => deleteGroup(g.id)}>Delete</Button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </Card.Body></Card>
                    )}
                  </Tab>
                )}
              </Tabs>
            </>
          ) : (
            <div className="text-center text-muted py-5">
              <h4>Select a group from the sidebar or create/join a new one</h4>
            </div>
          )}
        </Col>
      </Row>

      {/* Create Group Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton><Modal.Title>Create New Group</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={createGroup}>
            <Form.Group className="mb-3">
              <Form.Label>Group Name</Form.Label>
              <Form.Control value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Apartment 42, Trip to Sochi" required autoFocus />
            </Form.Group>
            <Button type="submit" variant="primary" className="w-100">Create &amp; Get Invite Code</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Payment Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)}>
        <Modal.Header closeButton><Modal.Title>Record Payment</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedDebt && (
            <>
              <p className="mb-1">Pay <strong>{selectedDebt.to_member}</strong></p>
              {selectedDebt.to_member_phone && (
                <div className="mb-1">📱 <strong>Phone:</strong> <span className="user-select-all">{selectedDebt.to_member_phone}</span></div>
              )}
              {selectedDebt.to_member_card && (
                <div className="mb-1">💳 <strong>Card:</strong> <span className="user-select-all">{selectedDebt.to_member_card}</span></div>
              )}
              {selectedDebt.to_member_payment_details && (
                <div className="mb-2">📝 {selectedDebt.to_member_payment_details}</div>
              )}
              {!selectedDebt.to_member_phone && !selectedDebt.to_member_card && !selectedDebt.to_member_payment_details && (
                <div className="mb-2"><small className="text-muted">No payment details provided</small></div>
              )}
              <Form.Group>
                <Form.Label>Amount (₽)</Form.Label>
                <Form.Control type="number" step="0.01" value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)} min="0.01" max={selectedDebt.amount} />
                <Form.Text className="text-muted">Suggested: {selectedDebt.amount.toFixed(2)} ₽</Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
          <Button variant="success" onClick={recordPayment}>Confirm Payment</Button>
        </Modal.Footer>
      </Modal>

      {/* Profile Modal */}
      <Modal show={showProfileModal} onHide={() => setShowProfileModal(false)}>
        <Modal.Header closeButton><Modal.Title>Edit Profile</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Display Name</Form.Label>
            <Form.Control value={profileForm.display_name}
              onChange={(e) => setProfileForm({...profileForm, display_name: e.target.value})} />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Phone</Form.Label>
            <Form.Control value={profileForm.phone}
              onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
              placeholder="+7 999 123-45-67" />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Card Number</Form.Label>
            <Form.Control value={profileForm.card_number}
              onChange={(e) => setProfileForm({...profileForm, card_number: e.target.value})}
              placeholder="0000 0000 0000 0000" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Other Payment Details</Form.Label>
            <Form.Control as="textarea" rows={2} value={profileForm.payment_details}
              onChange={(e) => setProfileForm({...profileForm, payment_details: e.target.value})}
              placeholder="Tinkoff, SberPay, etc." />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProfileModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={saveProfile}>Save Changes</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default App

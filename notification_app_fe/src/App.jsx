import { useEffect, useMemo, useState } from 'react'
import { 
  createTheme, 
  ThemeProvider, 
  Container, 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Button, 
  TextField, 
  Card, 
  CardContent, 
  Select, 
  MenuItem, 
  InputLabel, 
  FormControl, 
  Chip, 
  Paper, 
  Grid, 
  Alert, 
  Snackbar,
  Badge
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import RefreshIcon from '@mui/icons-material/Refresh'
import { getTopPriorityNotifications, sortNotificationsByRecency } from './notificationUtils'

// Create custom Material UI Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#7c3aed', // Purple accent
      dark: '#6d28d9',
      light: '#ddd6fe',
    },
    secondary: {
      main: '#db2777', // Secondary pink
    },
    background: {
      default: '#fbfbfe',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: "'Outfit', 'Roboto', 'Helvetica', sans-serif",
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
})

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'
const EVAL_API = import.meta.env.VITE_EVAL_API || ''
const EVAL_API_KEY = import.meta.env.VITE_EVAL_API_KEY || ''

const MOCK_FALLBACK_NOTIFICATIONS = [
  { ID: 'mock-1', Type: 'Placement', Message: 'Google recruitment drive registrations active. CTC: 32 LPA.', Timestamp: '2026-06-09T10:00:00.000Z' },
  { ID: 'mock-2', Type: 'Placement', Message: 'Microsoft interview shortlist for SDE-1 released.', Timestamp: '2026-06-09T09:00:00.000Z' },
  { ID: 'mock-3', Type: 'Result', Message: 'CS-201 Mid-term Exam grades are officially out.', Timestamp: '2026-06-09T09:30:00.000Z' },
  { ID: 'mock-4', Type: 'Result', Message: 'Web Development Lab assessment scores uploaded.', Timestamp: '2026-06-09T11:00:00.000Z' },
  { ID: 'mock-5', Type: 'Event', Message: 'Cultural Festival volunteer registrations are now open.', Timestamp: '2026-06-09T11:22:00.000Z' },
  { ID: 'mock-6', Type: 'Event', Message: 'Tech Talk: Introduction to Kubernetes at 4 PM in Seminar Hall.', Timestamp: '2026-06-09T10:15:00.000Z' },
  { ID: 'mock-7', Type: 'Event', Message: 'Hackathon team formation deadline tonight at 11:59 PM.', Timestamp: '2026-06-09T11:20:00.000Z' },
  { ID: 'mock-8', Type: 'Info', Message: 'Central Library timing extended until midnight for exams.', Timestamp: '2026-06-09T05:00:00.000Z' },
  { ID: 'mock-9', Type: 'Placement', Message: 'Adobe pre-placement talk slides available in classroom.', Timestamp: '2026-06-09T04:30:00.000Z' },
  { ID: 'mock-10', Type: 'Placement', Message: 'Amazon package details and CTC details updated in portal.', Timestamp: '2026-06-09T11:05:00.000Z' },
]

function App() {
  const [tab, setTab] = useState('dashboard')
  const [userIdInput, setUserIdInput] = useState('')
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState('')
  const [showStatus, setShowStatus] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [streamStatus, setStreamStatus] = useState('disconnected')
  const [filter, setFilter] = useState('all')
  const [topCount, setTopCount] = useState(10)
  const [evalType, setEvalType] = useState('all')
  const [evalPage, setEvalPage] = useState(1)
  const [evalLimit, setEvalLimit] = useState(25)
  const [evalNotifications, setEvalNotifications] = useState([])
  const [evalStatus, setEvalStatus] = useState('')

  // Settings states
  const [showSettings, setShowSettings] = useState(false)
  const [evalApiUrl, setEvalApiUrl] = useState(() => localStorage.getItem('eval_api_url') || EVAL_API || 'http://4.224.186.213/evaluation-service/notifications')
  const [evalApiKey, setEvalApiKey] = useState(() => localStorage.getItem('eval_api_key') || EVAL_API_KEY || '')

  const handleSaveSettings = (newUrl, newKey) => {
    setEvalApiUrl(newUrl)
    setEvalApiKey(newKey)
    localStorage.setItem('eval_api_url', newUrl)
    localStorage.setItem('eval_api_key', newKey)
    setStatus('API settings updated successfully!')
    setShowStatus(true)
    setShowSettings(false)
  }

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => {
      if (filter === 'unread') return !notification.read
      return true
    }),
    [notifications, filter],
  )

  const topPriorityNotifications = useMemo(() => {
    const dataSource = evalNotifications.length > 0 ? evalNotifications : notifications
    return getTopPriorityNotifications(dataSource, topCount)
  }, [evalNotifications, notifications, topCount])

  useEffect(() => {
    if (!userId) return

    let eventSource
    const fetchNotifications = async () => {
      setStatus('Loading notifications...')
      setShowStatus(true)
      try {
        const response = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/notifications`)
        if (!response.ok) throw new Error('Unable to load notifications')
        const data = await response.json()
        setNotifications(sortNotificationsByRecency(data))
        setStatus('Notifications loaded successfully')
      } catch (error) {
        setStatus(error.message)
      }
    }

    const connectStream = () => {
      setStreamStatus('connecting')
      eventSource = new EventSource(`${API_BASE}/notifications/stream?userId=${encodeURIComponent(userId)}`)
      eventSource.onopen = () => setStreamStatus('connected')
      eventSource.onerror = () => setStreamStatus('disconnected')
      eventSource.addEventListener('notification.created', (event) => {
        const notification = JSON.parse(event.data)
        setNotifications((prev) => sortNotificationsByRecency([notification, ...prev]))
      })
      eventSource.addEventListener('notification.update', (event) => {
        const updated = JSON.parse(event.data)
        setNotifications((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      })
    }

    fetchNotifications()
    connectStream()

    return () => {
      eventSource?.close()
      setStreamStatus('disconnected')
    }
  }, [userId])

  useEffect(() => {
    if (tab !== 'priority') return
    const fetchEvalNotifications = async () => {
      if (!evalApiUrl) {
        setEvalStatus('Remote evaluation API URL not configured. Using local notifications for priority ranking.')
        setEvalNotifications([])
        return
      }

      setEvalStatus('Loading priority notifications from ' + evalApiUrl + '...')
      const params = new URLSearchParams({
        limit: String(evalLimit),
        page: String(evalPage),
      })
      if (evalType !== 'all') params.set('notification_type', evalType)
      try {
        const headers = { Accept: 'application/json' }
        if (evalApiKey) headers.Authorization = `Bearer ${evalApiKey}`

        const response = await fetch(`${evalApiUrl}?${params.toString()}`, { headers })
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Unauthorized (401): Remote evaluation API requires valid credentials')
          }
          throw new Error(`Remote API error ${response.status}`)
        }
        const data = await response.json()
        setEvalNotifications(data.notifications || data || [])
        setEvalStatus('')
      } catch (error) {
        setEvalStatus(`⚠ API Load Failed: ${error.message}. Running in fallback simulation mode.`)
        setEvalNotifications(MOCK_FALLBACK_NOTIFICATIONS)
      }
    }

    fetchEvalNotifications()
  }, [tab, evalPage, evalLimit, evalType, evalApiUrl, evalApiKey])

  const handleLogin = () => {
    if (!userIdInput.trim()) return
    setUserId(userIdInput.trim())
    setStatus(`Logged in as ${userIdInput.trim()}`)
    setShowStatus(true)
  }

  const handleCreate = async () => {
    if (!userId) {
      setStatus('Please log in first.')
      setShowStatus(true)
      return
    }
    setStatus('Sending notification...')
    setShowStatus(true)
    try {
      const response = await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: 'Test notification',
          message: `Hello ${userId}, this is a test notification.`,
          type: 'Event',
        }),
      })
      if (!response.ok) throw new Error('Create failed')
      const data = await response.json()
      setNotifications((prev) => sortNotificationsByRecency([data, ...prev]))
      setStatus('Notification created successfully!')
    } catch (error) {
      setStatus(error.message)
    }
  }

  const handleMarkRead = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
      })
      if (!response.ok) throw new Error('Update failed')
      const updated = await response.json()
      setNotifications((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    } catch (error) {
      setStatus(error.message)
      setShowStatus(true)
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md" sx={{ py: 4, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* App Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" borderBottom="1px solid #eceaf2" pb={2} mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" color="text.primary" sx={{ background: 'linear-gradient(135deg, #1e152e 30%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Notification Platform
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vite React App with dynamic priority ranking & real-time delivery
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1.5}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => setShowSettings(!showSettings)} 
              startIcon={<SettingsIcon />}
              size="medium"
            >
              Settings
            </Button>
            <Chip 
              label={`Stream: ${streamStatus}`} 
              color={streamStatus === 'connected' ? 'success' : 'default'} 
              variant="outlined" 
              size="medium" 
            />
            <Badge badgeContent={visibleNotifications.filter((n) => !n.read).length} color="primary">
              <Chip label="Unread" size="medium" />
            </Badge>
          </Box>
        </Box>

        {/* Settings Panel */}
        {showSettings && (
          <Paper elevation={3} sx={{ p: 3, mb: 3, border: '1px solid #ddd6fe', background: '#f5f3ff' }}>
            <Typography variant="h6" gutterBottom color="primary">
              ⚙ API Configuration Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure the remote evaluation API URL and authentication key dynamically.
            </Typography>
            <Box display="flex" flexDirection="column" gap={2.5}>
              <TextField 
                label="API Endpoint URL" 
                defaultValue={evalApiUrl} 
                id="settings-api-url" 
                fullWidth 
                size="small" 
              />
              <TextField 
                label="API Key (Bearer Token)" 
                type="password" 
                defaultValue={evalApiKey} 
                id="settings-api-key" 
                fullWidth 
                size="small" 
                placeholder="Paste authorization token here..." 
              />
              <Box display="flex" gap={1}>
                <Button 
                  variant="contained" 
                  onClick={() => {
                    const url = document.getElementById('settings-api-url').value.trim()
                    const key = document.getElementById('settings-api-key').value.trim()
                    handleSaveSettings(url, key)
                  }}
                >
                  Save Configurations
                </Button>
                <Button variant="outlined" color="inherit" onClick={() => setShowSettings(false)}>
                  Cancel
                </Button>
              </Box>
            </Box>
          </Paper>
        )}

        {/* Tab Controls */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={(e, val) => setTab(val)} textColor="primary" indicatorColor="primary">
            <Tab label="My Notifications" value="dashboard" sx={{ fontWeight: 600 }} />
            <Tab label="Priority Inbox" value="priority" sx={{ fontWeight: 600 }} />
          </Tabs>
        </Box>

        {/* Tab 1: Dashboard */}
        {tab === 'dashboard' && (
          <Box display="flex" flexDirection="column" gap={3}>
            
            {/* Login Card */}
            <Card variant="outlined" sx={{ p: 1 }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Typography variant="h6" gutterBottom>Log In</Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={8}>
                    <TextField 
                      label="User ID" 
                      value={userIdInput} 
                      onChange={(e) => setUserIdInput(e.target.value)} 
                      placeholder="e.g. student-1024" 
                      size="small" 
                      fullWidth 
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Button variant="contained" fullWidth onClick={handleLogin}>
                      Log in
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Create Card */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Send a Test Notification</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Publishes a test event to the SSE realtime stream for the logged-in user.
                </Typography>
                <Button variant="contained" onClick={handleCreate} disabled={!userId}>
                  Send Notification
                </Button>
              </CardContent>
            </Card>

            {/* Notifications Timeline */}
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" borderBottom="1px solid #eceaf2" pb={2} mb={2} flexWrap="wrap" gap={2}>
                  <Box>
                    <Typography variant="h6">Notifications Timeline</Typography>
                    <Typography variant="body2" color="text.secondary">{visibleNotifications.length} total notifications</Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Button 
                      variant={filter === 'all' ? 'contained' : 'outlined'} 
                      size="small" 
                      onClick={() => setFilter('all')}
                    >
                      All
                    </Button>
                    <Button 
                      variant={filter === 'unread' ? 'contained' : 'outlined'} 
                      size="small" 
                      onClick={() => setFilter('unread')}
                    >
                      Unread
                    </Button>
                  </Box>
                </Box>

                {visibleNotifications.length === 0 ? (
                  <Typography variant="body1" align="center" sx={{ py: 6, color: 'text.secondary', fontStyle: 'italic' }}>
                    {userId ? 'No notifications found for this user.' : 'Please log in to load notification history.'}
                  </Typography>
                ) : (
                  <Box display="flex" flexDirection="column" gap={2}>
                    {visibleNotifications.map((notification, index) => (
                      <Card 
                        variant="outlined" 
                        key={`${notification.id}-${notification.createdAt}-${index}`}
                        sx={{ 
                          borderLeft: notification.read ? '1px solid #eceaf2' : '4px solid #7c3aed',
                          opacity: notification.read ? 0.75 : 1,
                          '&:hover': { transform: 'translateX(4px)', transition: '0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
                        }}
                      >
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Chip label={notification.type || 'Info'} size="small" color="primary" variant="outlined" />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(notification.createdAt).toLocaleString()}
                            </Typography>
                          </Box>
                          <Typography variant="subtitle1" fontWeight="600">{notification.title}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{notification.message}</Typography>
                          {!notification.read && (
                            <Box display="flex" justifyContent="flex-end" mt={1}>
                              <Button 
                                variant="outlined" 
                                size="small" 
                                color="primary" 
                                onClick={() => handleMarkRead(notification.id)}
                              >
                                Mark as read
                              </Button>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>

          </Box>
        )}

        {/* Tab 2: Priority Inbox */}
        {tab === 'priority' && (
          <Box display="flex" flexDirection="column" gap={3}>
            
            {/* Filters Paper */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Priority Inbox Controls</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure filters, pagination, and list sizes to display the top $N$ notifications sorted by recency and weight.
                </Typography>
                
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Notification Type</InputLabel>
                      <Select 
                        value={evalType} 
                        label="Notification Type" 
                        onChange={(e) => setEvalType(e.target.value)}
                      >
                        <MenuItem value="all">All Types</MenuItem>
                        <MenuItem value="Event">Event (Weight: 1)</MenuItem>
                        <MenuItem value="Result">Result (Weight: 2)</MenuItem>
                        <MenuItem value="Placement">Placement (Weight: 3)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      label="Top N Size" 
                      type="number" 
                      value={topCount} 
                      onChange={(e) => setTopCount(Math.max(1, Number(e.target.value)))} 
                      size="small" 
                      fullWidth 
                      inputProps={{ min: 1, max: 50 }} 
                    />
                  </Grid>
                  <Grid item xs={6} sm={6}>
                    <TextField 
                      label="Page" 
                      type="number" 
                      value={evalPage} 
                      onChange={(e) => setEvalPage(Math.max(1, Number(e.target.value)))} 
                      size="small" 
                      fullWidth 
                      inputProps={{ min: 1 }} 
                    />
                  </Grid>
                  <Grid item xs={6} sm={6}>
                    <TextField 
                      label="Limit" 
                      type="number" 
                      value={evalLimit} 
                      onChange={(e) => setEvalLimit(Math.max(5, Number(e.target.value)))} 
                      size="small" 
                      fullWidth 
                      inputProps={{ min: 5, max: 100 }} 
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Evaluation Status Banner */}
            {evalStatus && (
              <Alert severity={evalStatus.includes('API Load Failed') ? 'warning' : 'info'}>
                {evalStatus}
              </Alert>
            )}

            {/* Priority Feed List */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" borderBottom="1px solid #eceaf2" pb={2} mb={2}>
                  Top {topCount} Priority Feeds
                </Typography>

                {topPriorityNotifications.length === 0 ? (
                  <Typography variant="body1" align="center" sx={{ py: 6, color: 'text.secondary', fontStyle: 'italic' }}>
                    No priority notifications found. Try modifying filters.
                  </Typography>
                ) : (
                  <Box display="flex" flexDirection="column" gap={2}>
                    {topPriorityNotifications.map((notification, index) => (
                      <Card 
                        variant="outlined" 
                        key={`${notification.ID || notification.id}-${notification.Timestamp || notification.createdAt}-${index}`}
                        sx={{ 
                          borderLeft: '4px solid #7c3aed',
                          '&:hover': { transform: 'translateX(4px)', transition: '0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
                        }}
                      >
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
                            <Chip 
                              label={notification.Type || notification.type || 'Event'} 
                              size="small" 
                              color={
                                (notification.Type || notification.type) === 'Placement' ? 'secondary' : 
                                (notification.Type || notification.type) === 'Result' ? 'primary' : 'default'
                              }
                            />
                            <Typography variant="caption" color="text.secondary">
                              {new Date((notification.Timestamp || notification.createdAt).includes(' ') && !(notification.Timestamp || notification.createdAt).includes('T') ? (notification.Timestamp || notification.createdAt).replace(' ', 'T') : (notification.Timestamp || notification.createdAt)).toLocaleString()}
                            </Typography>
                          </Box>
                          <Typography variant="subtitle1" fontWeight="600">{notification.Message || notification.message}</Typography>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} borderTop="1px solid #f4f3f8" pt={1.5}>
                            <Typography variant="caption" color="text.secondary">ID: {notification.ID || notification.id}</Typography>
                            <Chip label={`Score: ${notification.priorityScore}`} size="small" variant="outlined" color="primary" />
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>

          </Box>
        )}

        {/* App Footer */}
        <Box display="flex" justifyContent="center" alignItems="center" borderTop="1px solid #eceaf2" pt={3} mt="auto">
          <Typography variant="caption" color="text.secondary">
            Local App on localhost:3000 • Backend port: 4000
          </Typography>
        </Box>

        {/* Snackbar Notification Toast */}
        <Snackbar
          open={showStatus}
          autoHideDuration={4000}
          onClose={() => setShowStatus(false)}
          message={status}
        />

      </Container>
    </ThemeProvider>
  )
}

export default App

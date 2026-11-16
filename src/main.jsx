import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import {
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signOut,
} from 'firebase/auth'
import './index.css'
import App from './App.jsx'
import Login from './Login.jsx'
import { auth } from './firebase'
import { getEmployeeByUid } from './employeeRoles.js'

// Время без действий: 10 минут. Максимальная продолжительность входа: 12 часов.
const IDLE_LIMIT_MS = 10 * 60 * 1000
const SHIFT_LIMIT_MS = 12 * 60 * 60 * 1000
const CHECK_INTERVAL_MS = 10 * 1000

function activityKey(uid) {
  return `cash-app:activity:${uid}`
}

function readActivity(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

function saveActivity(key, sessionStart, lastActivity) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ sessionStart, lastActivity }))
  } catch {
    // При отключённом sessionStorage таймер всё равно работает в текущей вкладке.
  }
}

function AuthGate() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [startupError, setStartupError] = useState(false)

  useEffect(() => {
    let stopped = false
    let unsubscribe = () => {}

    // На общем компьютере вход действует только в текущей вкладке/сессии браузера.
    setPersistence(auth, browserSessionPersistence)
      .then(() => {
        if (stopped) return
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          if (stopped) return
          // В кассу допускаются только три явно назначенных аккаунта.
          if (currentUser && !getEmployeeByUid(currentUser.uid)) {
            setUser(null)
            setReady(true)
            void signOut(auth)
            return
          }
          setUser(currentUser)
          setReady(true)
        })
      })
      .catch(() => {
        if (stopped) return
        setStartupError(true)
        setReady(true)
      })

    return () => {
      stopped = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) return undefined

    const sessionStart = Date.parse(user.metadata.lastSignInTime || '') || Date.now()
    const key = activityKey(user.uid)
    const saved = readActivity(key)
    let lastActivity =
      saved?.sessionStart === sessionStart && Number.isFinite(saved.lastActivity)
        ? saved.lastActivity
        : Date.now()
    let loggingOut = false

    async function endSession() {
      if (loggingOut) return
      loggingOut = true
      // Немедленно скрываем кассу — даже если Firebase недоступен.
      setUser(null)
      try {
        await signOut(auth)
      } catch {
        setStartupError(true)
      }
    }

    function checkTimeout() {
      const now = Date.now()
      if (now - lastActivity >= IDLE_LIMIT_MS || now - sessionStart >= SHIFT_LIMIT_MS) {
        void endSession()
      }
    }

    function markActivity() {
      checkTimeout()
      if (loggingOut) return
      const now = Date.now()
      if (now - lastActivity >= 1000) {
        lastActivity = now
        saveActivity(key, sessionStart, lastActivity)
      }
    }

    saveActivity(key, sessionStart, lastActivity)
    checkTimeout()

    const interval = window.setInterval(checkTimeout, CHECK_INTERVAL_MS)
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll']
    activityEvents.forEach((event) => window.addEventListener(event, markActivity, { passive: true }))
    window.addEventListener('focus', checkTimeout)
    document.addEventListener('visibilitychange', checkTimeout)

    return () => {
      window.clearInterval(interval)
      activityEvents.forEach((event) => window.removeEventListener(event, markActivity))
      window.removeEventListener('focus', checkTimeout)
      document.removeEventListener('visibilitychange', checkTimeout)
    }
  }, [user])

  if (!ready) {
    return <div className="min-h-screen bg-zinc-950 text-white p-6">Загрузка кассы...</div>
  }

  if (startupError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6">
        Не удалось настроить безопасный вход. Обновите страницу или обратитесь к владельцу.
      </div>
    )
  }

  const employee = user ? getEmployeeByUid(user.uid) : null
  return employee ? <App currentEmployee={employee} /> : <Login />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>,
)

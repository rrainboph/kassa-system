import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "./firebase"

const EMAIL_BY_NAME = {
  "Ренат": "satybaldievrenat65@gmail.com",
  "Сумая": "cops09275@gmail.com",
  "Егор": "cops09604@gmail.com",
}

const ERROR_MESSAGES = {
  "auth/invalid-email": "Не удалось выполнить вход. Обратитесь к владельцу.",
  "auth/invalid-credential": "Неверное имя или пароль.",
  "auth/user-disabled": "Этот аккаунт отключён. Обратитесь к владельцу.",
  "auth/too-many-requests": "Слишком много попыток входа. Попробуйте позднее.",
  "auth/network-request-failed": "Не удалось подключиться к сети. Проверьте интернет.",
}

export default function Login() {
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return
    setError("")
    const email = EMAIL_BY_NAME[name.trim()]
    if (!email) {
      setError("Введите имя: Ренат, Сумая или Егор.")
      return
    }
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(ERROR_MESSAGES[err?.code] || "Не удалось войти. Попробуйте ещё раз.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full bg-zinc-950 text-white px-3 md:px-6 py-4 flex items-center justify-center">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <h1 className="text-3xl font-black mb-2">KASSA SYSTEM</h1>
        <p className="text-zinc-400 mb-6">Вход в кассу</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-300">Имя</span>
            <input type="text" autoComplete="username" required value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ренат, Сумая или Егор"
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 w-full" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-300">Пароль</span>
            <input type="password" autoComplete="current-password" required value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Пароль"
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 w-full" />
          </label>
          {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="bg-white text-black rounded-2xl font-black py-4 disabled:opacity-50">
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>
      </div>
    </main>
  )
}

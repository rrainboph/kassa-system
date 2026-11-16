
const fs = require("node:fs")
const file = "src/App.jsx"
let code = fs.readFileSync(file, "utf8")

function change(pattern, replacement, label) {
  if (!pattern.test(code)) {
    throw new Error("Не найден участок: " + label)
  }
  code = code.replace(pattern, replacement)
}

if (code.includes("addRecordWithHistory")) {
  console.log("Этот этап уже выполнен.")
  process.exit(0)
}

change(
  /import \{ useEffect, useState \} from "react"[\s\S]*?import \{ db \} from "\.\/firebase"/,
  `import { useEffect, useState } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { auth, db } from "./firebase"
import {
  addRecordWithHistory,
  updateRecordWithHistory,
  permanentlyDeleteWithHistory,
} from "./recordHistory"`,
  "импорты"
)

change(
  /function App\(\) \{/,
  `function App({ currentEmployee }) {
  const isOwner = currentEmployee?.role === "owner"
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function runAction(callback) {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      await callback()
    } catch (err) {
      setError(err?.message || "Не удалось сохранить изменение.")
    } finally {
      setBusy(false)
    }
  }

  function localDate() {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, "0")
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())
  }`,
  "App"
)

// Отключаем небезопасную автоочистку корзины.
change(
  /  \/\/ =========================================\r?\n  \/\/ АВТООЧИСТКА КОРЗИНЫ[\s\S]*?(?=  \/\/ =========================================\r?\n  \/\/ ADD \/ SAVE)/,
  "",
  "автоочистка"
)

function replaceFunc(name, text) {
  change(
    new RegExp(`  async function ${name}\\([^]*?\\n  \\}\\r?\\n`),
    text + "\n",
    name
  )
}

replaceFunc("addOrSaveRecord", `  async function addOrSaveRecord() {
    if (amount === "" || !Number.isFinite(Number(amount))) return
    await runAction(async () => {
      let finalType = operation
      if (category === "Закуп") finalType = "+"
      if (category === "Выручка") finalType = "-"

      if (editingId) {
        const currentItem = records.find(r => r.id === editingId)
        if (!currentItem) throw new Error("Запись не найдена.")

        await updateRecordWithHistory(editingId, {
          amount: Number(amount),
          comment,
          category,
          type: finalType,
          date: recordDate !== "" ? recordDate : currentItem.date ?? "",
          time: currentItem.time || new Date().toLocaleTimeString(),
          active: Object.prototype.hasOwnProperty.call(currentItem, "active")
            ? currentItem.active : true,
        }, "edit")
        setEditingId(null)
      } else {
        await addRecordWithHistory({
          amount: Number(amount),
          comment,
          category,
          type: finalType,
          date: recordDate || localDate(),
          time: new Date().toLocaleTimeString(),
          active: true,
          deleted: false,
        })
      }

      setAmount("")
      setComment("")
      setRecordDate("")
    })
  }`)

replaceFunc("confirmDelete", `  async function confirmDelete() {
    if (!deletingId) return
    await runAction(async () => {
      await updateRecordWithHistory(deletingId, {
        deleted: true,
        deletedAt: new Date().toISOString(),
      }, "trash")
      setDeletingId(null)
    })
  }`)

replaceFunc("restoreRecord", `  async function restoreRecord(id) {
    if (!isOwner) return
    await runAction(() => updateRecordWithHistory(id, {
      deleted: false,
      deletedAt: null,
    }, "restore"))
  }`)

replaceFunc("hardDeleteRecord", `  async function hardDeleteRecord(id) {
    if (!isOwner) return
    await runAction(() => permanentlyDeleteWithHistory(id))
  }`)

replaceFunc("toggleRecord", `  async function toggleRecord(item) {
    await runAction(() => updateRecordWithHistory(item.id, {
      active: !item.active,
    }, item.active ? "disable" : "enable"))
  }`)

change(
  /(<p className="text-zinc-400 mb-6">Cloud Cash Manager<\/p>)/,
  `$1
        <div className="flex items-center justify-between gap-3 mb-3 text-sm text-zinc-400">
          <span>Пользователь: {currentEmployee?.name || "Неизвестный"}</span>
          <button onClick={() => signOut(auth)} className="underline hover:text-white">Выйти</button>
        </div>
        {error && <div role="alert" className="text-red-400 mb-3 text-sm">{error}</div>}`,
  "заголовок"
)

change(
  /(<button\r?\n\s+onClick=\{addOrSaveRecord\})/,
  `<button
              disabled={busy}
              onClick={addOrSaveRecord}`,
  "кнопка добавления"
)

change(
  /<button\r?\n\s+onClick=\{\(\) => setViewMode\("trash"\)\}[\s\S]*?🗑️ Корзина \(\{trashRecords\.length\}\)\r?\n\s+<\/button>/,
  `{isOwner && (
            <button
              onClick={() => setViewMode("trash")}
              className={\`px-5 py-3 rounded-xl font-bold transition-all \${viewMode === "trash" ? "bg-red-500 text-white" : "text-zinc-400 hover:text-white"}\`}
            >
              🗑️ Корзина ({trashRecords.length})
            </button>
            )}`,
  "кнопка корзины"
)

change(
  /Запись будет храниться в корзине 30 дней, после чего удалится автоматически\./,
  "Запись останется в корзине, пока владелец не удалит её окончательно.",
  "текст корзины"
)

fs.writeFileSync(file, code, "utf8")
console.log("Готово: App.jsx успешно обновлён.")

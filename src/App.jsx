import { useEffect, useState } from "react"
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot
} from "firebase/firestore"
import { db } from "./firebase"

function App() {
  const [amount, setAmount] = useState("")
  const [comment, setComment] = useState("")
  const [recordDate, setRecordDate] = useState("")

  const [category, setCategory] = useState("Закуп")
  const [operation, setOperation] = useState("+")

  const [records, setRecords] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Режим просмотра: "active" (основные) или "trash" (корзина)
  const [viewMode, setViewMode] = useState("active")

  // =========================================
  // FILTER CATEGORY
  // =========================================
  const [filterCategory, setFilterCategory] = useState("Все")

  // =========================================
  // FIREBASE REALTIME
  // =========================================
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "records"),
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setRecords(list)
      }
    )
    return () => unsub()
  }, [])

  // =========================================
  // АВТООЧИСТКА КОРЗИНЫ (Старше 30 дней)
  // =========================================
  useEffect(() => {
    if (records.length === 0) return

    const DAYS_TO_KEEP = 30
    const now = Date.now()

    records.forEach(async (item) => {
      if (item.deleted && item.deletedAt) {
        const deletedTime = new Date(item.deletedAt).getTime()
        const diffInDays = (now - deletedTime) / (1000 * 60 * 60 * 24)

        if (diffInDays >= DAYS_TO_KEEP) {
          await deleteDoc(doc(db, "records", item.id))
        }
      }
    })
  }, [records])

  // =========================================
  // ADD / SAVE
  // =========================================
  async function addOrSaveRecord() {
    if (!amount) return

    let finalType = operation

    if (category === "Закуп") {
      finalType = "+"
    }
    if (category === "Выручка") {
      finalType = "-"
    }

    // EDIT
    if (editingId) {
      const currentItem = records.find(r => r.id === editingId)

      await updateDoc(
        doc(db, "records", editingId),
        {
          amount: Number(amount),
          comment,
          category,
          type: finalType,
          date:
            recordDate !== ""
              ? recordDate
              : currentItem?.date ?? "",
          time: currentItem?.time || new Date().toLocaleTimeString(),
          active: currentItem?.hasOwnProperty('active') ? currentItem.active : true
        }
      )
      setEditingId(null)
    }
    // ADD
    else {
      await addDoc(
        collection(db, "records"),
        {
          amount: Number(amount),
          comment,
          category,
          type: finalType,
          date:
            recordDate ||
            new Date().toISOString().split("T")[0],
          time: new Date().toLocaleTimeString(),
          active: true,
          deleted: false
        }
      )
    }

    setAmount("")
    setComment("")
    setRecordDate("")
  }

  // =========================================
  // SOFT DELETE (Перемещение в корзину + метка времени)
  // =========================================
  async function confirmDelete() {
    if (!deletingId) return
    await updateDoc(doc(db, "records", deletingId), {
      deleted: true,
      deletedAt: new Date().toISOString() // Сохраняем дату отправки в корзину
    })
    setDeletingId(null)
  }

  // =========================================
  // RESTORE (Восстановление из корзины)
  // =========================================
  async function restoreRecord(id) {
    await updateDoc(doc(db, "records", id), {
      deleted: false,
      deletedAt: null
    })
  }

  // =========================================
  // HARD DELETE (Окончательное ручное удаление)
  // =========================================
  async function hardDeleteRecord(id) {
    await deleteDoc(doc(db, "records", id))
  }

  // =========================================
  // TOGGLE
  // =========================================
  async function toggleRecord(item) {
    await updateDoc(
      doc(db, "records", item.id),
      {
        active: !item.active
      }
    )
  }

  // =========================================
  // EDIT
  // =========================================
  function editRecord(item) {
    setEditingId(item.id)
    setAmount(item.amount.toString())
    setComment(item.comment || "")
    setCategory(item.category)
    setOperation(item.type)
    setRecordDate(item.date || "")
  }

  const activeRecords = records.filter(item => !item.deleted)
  const trashRecords = records.filter(item => item.deleted)

  const currentList = viewMode === "active" ? activeRecords : trashRecords

  // =========================================
  // FILTER & SORT RECORDS
  // =========================================
  const filteredRecords = currentList
    .filter(item =>
      filterCategory === "Все"
        ? true
        : item.category === filterCategory
    )
    .sort((a, b) => {
      return new Date(b.date) - new Date(a.date)
    })

  // =========================================
  // TOTALS
  // =========================================
  let totalBuy = 0
  let totalProfit = 0
  let totalExpensePlus = 0
  let totalExpenseMinus = 0

  activeRecords.forEach(item => {
    if (!item.active) return

    if (item.category === "Закуп") {
      totalBuy += item.amount
    }
    else if (item.category === "Выручка") {
      totalProfit += item.amount
    }
    else if (item.category === "Расход") {
      if (item.type === "+") {
        totalExpensePlus += item.amount
      } else {
        totalExpenseMinus += item.amount
      }
    }
  })

  const BASE_CASH = 20000

  const finalTotal =
    BASE_CASH
    + totalBuy
    - totalProfit
    + totalExpensePlus
    - totalExpenseMinus

  // Поиск конкретной записи, выбранной для удаления
  const recordToDelete = records.find(r => r.id === deletingId)

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-zinc-950 text-white px-3 md:px-6 py-4">
      <div className="w-full max-w-7xl mx-auto">

        {/* TITLE */}
        <h1 className="text-3xl md:text-5xl font-black mb-2">KASSA SYSTEM</h1>
        <p className="text-zinc-400 mb-6">Cloud Cash Manager</p>

        {/* TABS & FILTER */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
            <button
              onClick={() => setViewMode("active")}
              className={`px-5 py-3 rounded-xl font-bold transition-all ${
                viewMode === "active"
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              📋 Записи ({activeRecords.length})
            </button>
            <button
              onClick={() => setViewMode("trash")}
              className={`px-5 py-3 rounded-xl font-bold transition-all ${
                viewMode === "trash"
                  ? "bg-red-500 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              🗑️ Корзина ({trashRecords.length})
            </button>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4"
          >
            <option>Все</option>
            <option>Закуп</option>
            <option>Выручка</option>
            <option>Расход</option>
          </select>
        </div>

        {/* TOTALS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900 p-4 rounded-3xl">
            <p className="text-zinc-400 text-sm">Закуп</p>
            <h2 className="text-2xl md:text-3xl font-black text-green-400">+{totalBuy}</h2>
          </div>

          <div className="bg-zinc-900 p-4 rounded-3xl">
            <p className="text-zinc-400 text-sm">Выручка</p>
            <h2 className="text-2xl md:text-3xl font-black text-red-400">-{totalProfit}</h2>
          </div>

          <div className="bg-zinc-900 p-4 rounded-3xl">
            <p className="text-zinc-400 text-sm">Расход</p>
            <h2 className="text-lg md:text-2xl font-black">+{totalExpensePlus} / -{totalExpenseMinus}</h2>
          </div>

          <div className="bg-white text-black p-4 rounded-3xl">
            <p className="text-sm">Итог</p>
            <h2 className="text-3xl md:text-4xl font-black">{finalTotal}</h2>
          </div>
        </div>

        {/* INPUTS */}
        {viewMode === "active" && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <input
              type="number"
              placeholder="Сумма"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
            />

            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
            />

            <input
              type="text"
              placeholder="Комментарий"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
            >
              <option>Закуп</option>
              <option>Выручка</option>
              <option>Расход</option>
            </select>

            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              disabled={category !== "Расход"}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
            >
              <option value="+">+</option>
              <option value="-">-</option>
            </select>

            <button
              onClick={addOrSaveRecord}
              className="bg-white text-black rounded-2xl font-black py-4"
            >
              {editingId ? "Сохранить" : "Добавить"}
            </button>
          </div>
        )}

        {/* TABLE */}
        <div className="bg-zinc-900 rounded-3xl overflow-x-auto">
          <div className="min-w-[900px]">

            {/* HEADERS */}
            <div className="grid grid-cols-6 bg-zinc-800 p-4 font-bold">
              <div>Комментарий</div>
              <div>Категория</div>
              <div>Тип</div>
              <div>Сумма</div>
              <div>Дата / Время</div>
              <div>Действия</div>
            </div>

            {/* ROWS */}
            {filteredRecords.map(item => (
              <div
                key={item.id}
                className={`grid grid-cols-6 p-4 border-t border-zinc-800 ${!item.active ? "opacity-40" : ""}`}
              >
                <div className={!item.active ? "line-through" : ""}>
                  {item.comment}
                </div>
                <div>{item.category}</div>
                <div>{item.type}</div>
                <div>{item.amount}</div>
                <div>
                  <div>
                    {item.date
                      ? new Date(item.date).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                      : ""}
                  </div>
                  <div className="text-xs text-zinc-400">{item.time}</div>
                </div>

                <div className="flex gap-2">
                  {viewMode === "active" ? (
                    <>
                      <button
                        onClick={() => editRecord(item)}
                        className="bg-blue-500 px-3 py-1 rounded-xl"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => toggleRecord(item)}
                        className="bg-yellow-400 text-black px-3 py-1 rounded-xl"
                      >
                        {item.active ? "OFF" : "ON"}
                      </button>

                      <button
                        onClick={() => setDeletingId(item.id)}
                        className="bg-red-500 px-3 py-1 rounded-xl"
                      >
                        X
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => restoreRecord(item.id)}
                        className="bg-green-600 px-3 py-1 rounded-xl font-semibold"
                      >
                        Восстановить
                      </button>
                      <button
                        onClick={() => hardDeleteRecord(item.id)}
                        className="bg-zinc-800 hover:bg-red-700 px-3 py-1 rounded-xl text-xs text-zinc-400 hover:text-white"
                      >
                        Удалить навсегда
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {filteredRecords.length === 0 && (
              <div className="p-8 text-center text-zinc-500">
                {viewMode === "active" ? "Записей пока нет" : "Корзина пуста"}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ С ИНФОРМАЦИЕЙ О ЗАПИСИ */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-black mb-2">Переместить в корзину?</h3>

            {recordToDelete && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 my-4 text-left">
                <div className="font-bold text-white text-lg">
                  {recordToDelete.comment || "Без комментария"}
                </div>
                <div className="flex justify-between items-center mt-2 text-sm text-zinc-400">
                  <span>Категория: <strong className="text-zinc-200">{recordToDelete.category}</strong></span>
                  <span>Сумма: <strong className="text-white">{recordToDelete.amount}</strong></span>
                </div>
                {recordToDelete.date && (
                  <div className="text-xs text-zinc-500 mt-2">
                    Дата: {new Date(recordToDelete.date).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric"
                    })}
                  </div>
                )}
              </div>
            )}

            <p className="text-zinc-400 text-sm mb-6">Запись будет храниться в корзине 30 дней, после чего удалится автоматически.</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-2xl transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-2xl transition-colors"
              >
                В корзину
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
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

      await updateDoc(
        doc(db, "records", editingId),
        {
          amount: Number(amount),
          comment,
          category,
          type: finalType
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
              new Date().toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit"
              }),
          time: new Date().toLocaleTimeString(),
          active: true
        }
      )

    }

    setAmount("")
    setComment("")
    setRecordDate("")

  }

  // =========================================
  // DELETE
  // =========================================

  async function deleteRecord(id) {

    await deleteDoc(
      doc(db, "records", id)
    )

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

    setAmount(item.amount)
    setComment(item.comment)
    setCategory(item.category)
    setOperation(item.type)

  }

  // =========================================
  // FILTER RECORDS
  // =========================================

 const filteredRecords = records
  .filter(item =>
    filterCategory === "Все"
      ? true
      : item.category === filterCategory
  )
  .reverse()

  // =========================================
  // TOTALS
  // =========================================

  let totalBuy = 0
  let totalProfit = 0
  let totalExpensePlus = 0
  let totalExpenseMinus = 0

  records.forEach(item => {

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
      }

      else {
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

  return (

    <div className="min-h-screen w-full overflow-x-hidden bg-zinc-950 text-white px-3 md:px-6 py-4">

      <div className="w-full max-w-7xl mx-auto">

        {/* TITLE */}

        <h1 className="text-3xl md:text-5xl font-black mb-2">

          KASSA SYSTEM

        </h1>

        <p className="text-zinc-400 mb-6">

          Cloud Cash Manager

        </p>

        {/* DATE */}

        <div className="flex flex-col md:flex-row gap-4 mb-6">

          {/* FILTER */}

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

            <p className="text-zinc-400 text-sm">
              Закуп
            </p>

            <h2 className="text-2xl md:text-3xl font-black text-green-400">

              +{totalBuy}

            </h2>

          </div>

          <div className="bg-zinc-900 p-4 rounded-3xl">

            <p className="text-zinc-400 text-sm">
              Выручка
            </p>

            <h2 className="text-2xl md:text-3xl font-black text-red-400">

              -{totalProfit}

            </h2>

          </div>

          <div className="bg-zinc-900 p-4 rounded-3xl">

            <p className="text-zinc-400 text-sm">
              Расход
            </p>

            <h2 className="text-lg md:text-2xl font-black">

              +{totalExpensePlus} / -{totalExpenseMinus}

            </h2>

          </div>

          <div className="bg-white text-black p-4 rounded-3xl">

            <p className="text-sm">
              Итог
            </p>

            <h2 className="text-3xl md:text-4xl font-black">

              {finalTotal}

            </h2>

          </div>

        </div>

        {/* INPUTS */}

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">

          <input
            type="number"
            placeholder="Сумма"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
          />

          <input
            type="text"
            placeholder="Дата (05.06)"
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

            {editingId
              ? "Сохранить"
              : "Добавить"}

          </button>

        </div>

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
                className={`grid grid-cols-6 p-4 border-t border-zinc-800 ${
                  !item.active
                    ? "opacity-40"
                    : ""
                }`}
              >

                <div className={!item.active ? "line-through" : ""}>

                  {item.comment}

                </div>

                <div>{item.category}</div>

                <div>{item.type}</div>

                <div>{item.amount}</div>

                <div>
                    <div>{item.date}</div>
                    <div className="text-xs text-zinc-400">
                      {item.time}
                    </div>
                </div>

                <div className="flex gap-2">

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
                    onClick={() => deleteRecord(item.id)}
                    className="bg-red-500 px-3 py-1 rounded-xl"
                  >

                    X

                  </button>

                </div>

              </div>

            ))}

          </div>

        </div>

      </div>

    </div>

  )

}

export default App
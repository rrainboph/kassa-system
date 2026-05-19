import { useEffect, useState } from "react"

function App() {

  // =========================================
  // STATES
  // =========================================

  const [amount, setAmount] = useState("")
  const [comment, setComment] = useState("")

  const [category, setCategory] = useState("Закуп")

  const [operation, setOperation] = useState("+")

  const [records, setRecords] = useState([])

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  )

  const [editingId, setEditingId] = useState(null)

  // =========================================
  // LOAD
  // =========================================

  useEffect(() => {

    const saved = localStorage.getItem("cash-data")

    if (saved) {

      setRecords(JSON.parse(saved))

    }

  }, [])

  // =========================================
  // SAVE
  // =========================================

  useEffect(() => {

    localStorage.setItem(
      "cash-data",
      JSON.stringify(records)
    )

  }, [records])

  // =========================================
  // CLEAR
  // =========================================

  function clearInputs() {

    setAmount("")
    setComment("")
    setCategory("Закуп")
    setOperation("+")

  }

  // =========================================
  // ADD / SAVE
  // =========================================

  function addOrSaveRecord() {

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

      const updated = records.map(item => {

        if (item.id === editingId) {

          return {

            ...item,

            amount: Number(amount),

            comment,

            category,

            type: finalType

          }

        }

        return item

      })

      setRecords(updated)

      setEditingId(null)

    }

    // ADD

    else {

      const newRecord = {

        id: Date.now(),

        amount: Number(amount),

        comment,

        category,

        type: finalType,

        date: selectedDate,

        time: new Date().toLocaleTimeString(),

        active: true

      }

      setRecords([
        newRecord,
        ...records
      ])

    }

    clearInputs()
  }

  // =========================================
  // DELETE
  // =========================================

  function deleteRecord(id) {

    const confirmDelete = confirm(
      "Удалить запись?"
    )

    if (!confirmDelete) return

    setRecords(
      records.filter(
        item => item.id !== id
      )
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

    window.scrollTo({

      top: 0,

      behavior: "smooth"

    })

  }

  // =========================================
  // TOGGLE
  // =========================================

  function toggleRecord(id) {

    const updated = records.map(item => {

      if (item.id === id) {

        return {

          ...item,

          active: !item.active

        }

      }

      return item

    })

    setRecords(updated)
  }

  // =========================================
  // FILTER
  // =========================================

  const filteredRecords = records.filter(
    item => item.date === selectedDate
  )

  // =========================================
  // TOTALS
  // =========================================

  let totalBuy = 0
  let totalProfit = 0

  let totalExpensePlus = 0
  let totalExpenseMinus = 0

  filteredRecords.forEach(item => {

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

  // =========================================
  // FINAL
  // =========================================

  const BASE_CASH = 20000

  const finalTotal =

    BASE_CASH
    + totalBuy
    - totalProfit
    + totalExpensePlus
    - totalExpenseMinus

  // =========================================
  // UI
  // =========================================

  return (

    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-10">

          <div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight">

              KASSA SYSTEM

            </h1>

            <p className="text-zinc-400 mt-2 text-lg">

              Cash accounting manager

            </p>

          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 outline-none text-lg"
          />

        </div>

        {/* SUMMARY */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">

          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">

            <p className="text-zinc-400">
              Закуп
            </p>

            <h2 className="text-4xl font-black text-green-400 mt-3">

              +{totalBuy}

            </h2>

          </div>

          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">

            <p className="text-zinc-400">
              Выручка
            </p>

            <h2 className="text-4xl font-black text-red-400 mt-3">

              -{totalProfit}

            </h2>

          </div>

          <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">

            <p className="text-zinc-400">
              Расход
            </p>

            <h2 className="text-3xl font-black mt-3">

              <span className="text-green-400">

                +{totalExpensePlus}

              </span>

              {" / "}

              <span className="text-red-400">

                -{totalExpenseMinus}

              </span>

            </h2>

          </div>

          <div className="bg-white text-black rounded-3xl p-6">

            <p className="opacity-70">
              Итоговая касса
            </p>

            <h2 className="text-5xl font-black mt-3">

              {finalTotal}

            </h2>

          </div>

        </div>

        {/* INPUTS */}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-10">

          <input
            type="number"
            placeholder="Сумма"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none text-lg"
          />

          <input
            type="text"
            placeholder="Комментарий"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none text-lg"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none text-lg"
          >

            <option>Закуп</option>

            <option>Выручка</option>

            <option>Расход</option>

          </select>

          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            disabled={category !== "Расход"}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none text-lg disabled:opacity-40"
          >

            <option value="+">+</option>

            <option value="-">-</option>

          </select>

          <button
            onClick={addOrSaveRecord}
            className="bg-white hover:bg-zinc-200 transition text-black rounded-2xl font-black text-lg"
          >

            {editingId
              ? "Сохранить"
              : "Добавить"}

          </button>

        </div>

        {/* TABLE */}

        <div className="bg-zinc-900/80 backdrop-blur-xl rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl">

          <div className="overflow-x-auto">

            <div className="min-w-[950px]">

              {/* HEADER */}

              <div className="grid grid-cols-6 bg-zinc-800 text-zinc-300 p-5 font-bold uppercase text-sm tracking-wide">

                <div>Комментарий</div>

                <div>Категория</div>

                <div>Тип</div>

                <div>Сумма</div>

                <div>Время</div>

                <div className="text-right">
                  Действия
                </div>

              </div>

              {/* ROWS */}

              {filteredRecords.map((item) => (

                <div
                  key={item.id}
                  className={`grid grid-cols-6 items-center p-5 border-t border-zinc-800 transition-all hover:bg-zinc-800/50 ${
                    !item.active
                      ? "opacity-40"
                      : ""
                  }`}
                >

                  {/* COMMENT */}

                  <div
                    className={`font-semibold text-base ${
                      !item.active
                        ? "line-through"
                        : ""
                    }`}
                  >

                    {item.comment || "Без комментария"}

                  </div>

                  {/* CATEGORY */}

                  <div>

                    <span
                      className={`px-4 py-2 rounded-2xl text-sm font-bold ${
                        item.category === "Закуп"
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"

                          : item.category === "Выручка"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"

                          : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                      }`}
                    >

                      {item.category}

                    </span>

                  </div>

                  {/* TYPE */}

                  <div
                    className={`text-2xl font-black ${
                      item.type === "+"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >

                    {item.type}

                  </div>

                  {/* AMOUNT */}

                  <div
                    className={`text-2xl font-black ${
                      item.type === "+"
                        ? "text-green-400"
                        : "text-red-400"
                    } ${
                      !item.active
                        ? "line-through"
                        : ""
                    }`}
                  >

                    {item.amount}

                  </div>

                  {/* TIME */}

                  <div className="text-zinc-400">

                    {item.time}

                  </div>

                  {/* ACTIONS */}

                  <div className="flex justify-end gap-2">

                    <button
                      onClick={() => editRecord(item)}
                      className="bg-blue-500 hover:bg-blue-400 transition px-4 py-2 rounded-2xl text-sm font-bold"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => toggleRecord(item.id)}
                      className={`px-4 py-2 rounded-2xl text-sm font-black transition ${
                        item.active
                          ? "bg-yellow-500 text-black hover:bg-yellow-400"

                          : "bg-green-500 text-black hover:bg-green-400"
                      }`}
                    >

                      {item.active
                        ? "OFF"
                        : "ON"}

                    </button>

                    <button
                      onClick={() => deleteRecord(item.id)}
                      className="bg-red-500 hover:bg-red-400 transition px-4 py-2 rounded-2xl text-sm font-black"
                    >
                      X
                    </button>

                  </div>

                </div>

              ))}

              {/* EMPTY */}

              {filteredRecords.length === 0 && (

                <div className="p-12 text-center text-zinc-500 text-lg">

                  Нет записей за эту дату

                </div>

              )}

            </div>

          </div>

        </div>

      </div>

    </div>

  )
}

export default App
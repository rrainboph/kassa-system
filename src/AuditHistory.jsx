
import { useEffect, useState } from "react"
import {
  collection, onSnapshot, orderBy,
  query, where, Timestamp
} from "firebase/firestore"
import { db } from "./firebase"
import { getEmployeeByUid } from "./employeeRoles"

const TZ = "Asia/Bishkek"
const names = {
  create: "Добавление",
  edit: "Изменение",
  disable: "Отключение",
  enable: "Включение",
  trash: "Перемещение в корзину",
  restore: "Восстановление",
  purge: "Окончательное удаление"
}

const fields = {
  amount: "Сумма",
  comment: "Комментарий",
  category: "Категория",
  type: "Тип",
  date: "Дата записи",
  active: "Активность",
  deleted: "Удалена"
}

function dayOf(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ, year: "numeric",
    month: "2-digit", day: "2-digit"
  }).format(date)
}

function display(value) {
  if (value === undefined || value === null) return "—"
  if (value === true) return "Да"
  if (value === false) return "Нет"
  return String(value)
}

export default function AuditHistory() {
  const [logs, setLogs] = useState([])
  const [day, setDay] = useState(() => dayOf(new Date()))
  const [employee, setEmployee] = useState("all")
  const [opened, setOpened] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const cutoff = Timestamp.fromMillis(
      Date.now() - 31 * 24 * 60 * 60 * 1000
    )

    const q = query(
      collection(db, "audit_logs"),
      where("createdAt", ">=", cutoff),
      orderBy("createdAt", "desc")
    )

    return onSnapshot(q, snapshot => {
      setLogs(snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      })))
      setError("")
    }, err => setError(err.message))
  }, [])

  const filtered = logs.filter(log => {
    const date = log.createdAt?.toDate?.()
    if (!date || dayOf(date) !== day) return false
    return employee === "all" || log.actorUid === employee
  })

  const actors = [
    ["all", "Все сотрудники"],
    ["2PJqANixFFNQ1yQgl8Rag7Xwu1v2", "Сумая"],
    ["DRneOP59srbQaSwrchhyIp2LHaN2", "Егор"],
    ["eB1Ny5JLr0giCLvE1mFn8JhZC8M2", "Ренат"]
  ]

  return (
    <div className="bg-zinc-900 rounded-3xl p-4 md:p-6 mb-6">
      <h2 className="text-2xl font-black mb-4">
        История сотрудников
      </h2>

      <div className="flex flex-wrap gap-3 mb-5">
        <input type="date" value={day}
          onChange={e => setDay(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl p-3"
        />
        <select value={employee}
          onChange={e => setEmployee(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          {actors.map(([uid, name]) =>
            <option key={uid} value={uid}>{name}</option>
          )}
        </select>
      </div>

      <p className="text-zinc-400 text-sm mb-4">
        Всего действий за день: {filtered.length}
      </p>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {filtered.length === 0 && !error &&
        <p className="text-zinc-500">Действий за этот день нет.</p>
      }

      <div className="space-y-3">
        {filtered.map(log => {
          const actor = getEmployeeByUid(log.actorUid)
          const date = log.createdAt?.toDate?.()
          const deletedRecord = ["trash", "purge"].includes(log.action) ? log.before : null
          const changes = Object.keys(fields).filter(key =>
            log.before?.[key] !== log.after?.[key]
          )

          return (
            <div key={log.id}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <strong>{actor?.name || "Неизвестный"}</strong>
                  <p className="text-sm text-zinc-300">
                    {names[log.action] || log.action}
                  </p>
                  {deletedRecord && (
                    <div className="text-sm text-zinc-200 mt-2 space-y-1">
                      <p><strong>Сумма:</strong> {display(deletedRecord.amount)}</p>
                      <p><strong>Категория:</strong> {display(deletedRecord.category)}</p>
                      <p><strong>Тип:</strong> {display(deletedRecord.type)}</p>
                      <p><strong>Комментарий:</strong> {display(deletedRecord.comment)}</p>
                      <p><strong>Дата записи:</strong> {display(deletedRecord.date)} {display(deletedRecord.time) === "—" ? "" : display(deletedRecord.time)}</p>
                    </div>
                  )}
                </div>
                <span className="text-xs text-zinc-400">
                  {date?.toLocaleTimeString("ru-RU", {
                    timeZone: TZ,
                    hour: "2-digit",
                    minute: "2-digit"
                  }) || ""}
                </span>
              </div>

              <button
                className="text-blue-400 text-sm mt-3"
                onClick={() => setOpened(
                  opened === log.id ? null : log.id
                )}>
                {opened === log.id
                  ? "Скрыть изменения"
                  : "Посмотреть изменения"}
              </button>

              {opened === log.id && (
                <div className="mt-3 space-y-2 text-sm">
                  {changes.length === 0 &&
                    <p className="text-zinc-400">
                      Изменённых полей нет
                    </p>
                  }
                  {changes.map(key => (
                    <div key={key}
                      className="border-t border-zinc-800 pt-2">
                      <p className="font-semibold">{fields[key]}</p>
                      <p className="text-zinc-400">
                        Было: {display(log.before?.[key])}
                      </p>
                      <p>
                        Стало: {display(log.after?.[key])}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

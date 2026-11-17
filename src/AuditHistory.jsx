import { useEffect, useState } from "react"
import {
  collection, onSnapshot, orderBy,
  query, where, Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"
import { getEmployeeByUid } from "./employeeRoles"

// Дата и время действия — Бишкек. Дата самой кассовой записи показывается отдельно.
const TZ = "Asia/Bishkek"
const HISTORY_DAYS = 31

const ACTIONS = {
  create: "Добавил запись",
  edit: "Изменил запись",
  disable: "Отключил запись (OFF)",
  enable: "Включил запись (ON)",
  trash: "Переместил в корзину",
  restore: "Восстановил из корзины",
  purge: "Удалил навсегда",
}

const FIELDS = {
  comment: "Комментарий",
  category: "Категория",
  type: "Тип (+/−)",
  amount: "Сумма",
  date: "Дата записи",
  time: "Время записи",
  active: "Учитывается в итоге",
  deleted: "В корзине",
}

const STAFF = [
  ["all", "Все сотрудники"],
  ["2PJqANixFFNQ1yQgl8Rag7Xwu1v2", "Сумая"],
  ["DRneOP59srbQaSwrchhyIp2LHaN2", "Егор"],
  ["eB1Ny5JLr0giCLvE1mFn8JhZC8M2", "Ренат"],
]

function eventDate(value) {
  if (!value) return null
  if (typeof value.toDate === "function") return value.toDate()
  if (value instanceof Date) return value
  return null
}

function dayKey(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date)
}

function eventDateTime(date) {
  if (!date) return "Время не указано"
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ,
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(date)
}

function recordDate(value) {
  if (!value) return "—"
  const result = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
  return result ? `${result[3]}.${result[2]}.${result[1]}` : String(value)
}

function amountText(value) {
  if (value === null || value === undefined || value === "") return "—"
  const num = Number(value)
  return Number.isFinite(num)
    ? `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(num)} сом`
    : String(value)
}

function valueText(key, value) {
  if (value === undefined || value === null || value === "") return "—"
  if (key === "amount") return amountText(value)
  if (key === "date") return recordDate(value)
  if (key === "active") return value === false ? "Нет (OFF)" : "Да (ON)"
  if (key === "deleted") return value ? "Да" : "Нет"
  return String(value)
}

function recordFor(log) {
  // Для удаления показываем именно ту запись, которую удаляли,
  // для добавления / редактирования — новое состояние.
  if (log.action === "trash" || log.action === "purge") {
    return log.before || log.after || null
  }
  return log.after || log.before || null
}

function changedFields(log) {
  if (!log.before || !log.after) return []
  return Object.keys(FIELDS).filter(key => log.before[key] !== log.after[key])
}

export default function AuditHistory() {
  const [logs, setLogs] = useState([])
  // По умолчанию видны все действия за доступный период, а не только за сегодня.
  const [selectedDay, setSelectedDay] = useState("")
  const [employee, setEmployee] = useState("all")
  const [action, setAction] = useState("all")
  const [search, setSearch] = useState("")
  const [opened, setOpened] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const cutoff = Timestamp.fromMillis(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000)
    const q = query(
      collection(db, "audit_logs"),
      where("createdAt", ">=", cutoff),
      orderBy("createdAt", "desc"),
    )

    return onSnapshot(q, snapshot => {
      setLogs(snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
      setError("")
      setLoading(false)
    }, err => {
      setError(`Не удалось прочитать журнал действий. Проверьте правила доступа к audit_logs в Firebase. ${err?.message || ""}`)
      setLoading(false)
    })
  }, [])

  const filtered = logs.filter(log => {
    const date = eventDate(log.createdAt)
    if (selectedDay && (!date || dayKey(date) !== selectedDay)) return false
    if (employee !== "all" && log.actorUid !== employee) return false
    if (action !== "all" && log.action !== action) return false
    const record = recordFor(log)
    const queryText = search.trim().toLocaleLowerCase("ru-RU")
    if (!queryText) return true
    const haystack = [
      getEmployeeByUid(log.actorUid)?.name,
      ACTIONS[log.action],
      log.before?.comment, log.after?.comment,
      record?.category, record?.date, record?.amount,
    ].filter(value => value !== undefined && value !== null)
      .join(" ").toLocaleLowerCase("ru-RU")
    return haystack.includes(queryText)
  })

  return (
    <section className="bg-zinc-900 rounded-3xl p-4 md:p-6 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h2 className="text-2xl font-black">История сотрудников</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Кто, когда и какую запись добавил, изменил или удалил.
          </p>
        </div>
        <span className="text-sm bg-zinc-800 rounded-xl px-3 py-2">
          Найдено: {filtered.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Дата действия (не дата записи)
          <input type="date" value={selectedDay} onChange={e => setSelectedDay(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Сотрудник
          <select value={employee} onChange={e => setEmployee(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white">
            {STAFF.map(([uid, name]) => <option key={uid} value={uid}>{name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Действие
          <select value={action} onChange={e => setAction(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white">
            <option value="all">Все действия</option>
            {Object.entries(ACTIONS).map(([key, name]) =>
              <option key={key} value={key}>{name}</option>
            )}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Поиск по записи
          <input type="search" placeholder="Ремонт двери, 5000..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        {selectedDay && (
          <button type="button" onClick={() => setSelectedDay("")}
            className="text-sm text-blue-400 underline">
            Показать все даты
          </button>
        )}
        <p className="text-xs text-zinc-500">
          Показаны действия за последние {HISTORY_DAYS} день. Время — Бишкек. Старые события, которые не сохранились в журнале, восстановить по этому экрану нельзя.
        </p>
      </div>

      {error && <p role="alert" className="text-red-400 mb-4 text-sm">{error}</p>}
      {loading && <p className="text-zinc-400">Загрузка истории...</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-zinc-400">По выбранным фильтрам действий нет.</p>
      )}

      <div className="space-y-3">
        {filtered.map(log => {
          const actor = getEmployeeByUid(log.actorUid)
          const date = eventDate(log.createdAt)
          const record = recordFor(log)
          const changes = changedFields(log)
          const title = record?.comment?.trim?.() || "Без комментария"
          const isOpen = opened === log.id

          return (
            <article key={log.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
              <div className="flex flex-wrap justify-between gap-2 mb-3">
                <div>
                  <p className="font-bold text-white">{actor?.name || "Неизвестный сотрудник"}</p>
                  <p className="text-sm text-blue-300 font-semibold mt-1">
                    {ACTIONS[log.action] || log.action || "Неизвестное действие"}
                  </p>
                </div>
                <div className="text-xs text-zinc-400 text-left sm:text-right">
                  <p>Действие: {eventDateTime(date)}</p>
                  <p>Дата записи: {recordDate(record?.date)}</p>
                </div>
              </div>

              {record ? (
                <div className="bg-zinc-900 rounded-xl p-3 space-y-2">
                  <p className="font-semibold text-white break-words">{title}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-300">
                    <span>Сумма: <strong className="text-white">{amountText(record.amount)}</strong></span>
                    <span>Категория: <strong className="text-white">{valueText("category", record.category)}</strong></span>
                    <span>Тип: <strong className="text-white">{valueText("type", record.type)}</strong></span>
                  </div>
                </div>
              ) : (
                <p className="text-amber-300 text-sm">В этой старой записи журнала не сохранены подробности операции.</p>
              )}

              <button type="button" className="text-blue-400 text-sm mt-3 font-medium"
                aria-expanded={isOpen}
                onClick={() => setOpened(isOpen ? null : log.id)}>
                {isOpen ? "Скрыть подробности" : "Посмотреть подробности"}
              </button>

              {isOpen && (
                <div className="mt-3 border-t border-zinc-800 pt-3 space-y-3 text-sm">
                  {log.action === "edit" && changes.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-semibold">Что именно изменилось:</p>
                      {changes.map(key => (
                        <div key={key} className="rounded-xl bg-zinc-900 p-3">
                          <p className="font-semibold mb-1">{FIELDS[key]}</p>
                          <p className="text-zinc-400 break-words">Было: {valueText(key, log.before?.[key])}</p>
                          <p className="text-white break-words">Стало: {valueText(key, log.after?.[key])}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {log.action === "edit" && changes.length === 0 && (
                    <p className="text-zinc-400">Значения основных полей не изменились.</p>
                  )}
                  {(log.action === "disable" || log.action === "enable") && (
                    <p>Влияние на итог кассы: <strong>{log.action === "disable" ? "перестала учитываться" : "снова учитывается"}</strong>.</p>
                  )}
                  {(log.action === "trash" || log.action === "purge") && (
                    <p className="text-zinc-300">Выше показаны данные записи до её удаления.</p>
                  )}
                  {log.action === "create" && (
                    <p className="text-zinc-300">Выше показаны данные добавленной записи.</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {Object.entries(FIELDS).map(([key, label]) => (
                      <div key={key} className="border-b border-zinc-800 pb-2">
                        <span className="text-zinc-500">{label}: </span>
                        <span className="text-white break-words">{valueText(key, record?.[key])}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 break-all">ID записи: {log.recordId || "—"}</p>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

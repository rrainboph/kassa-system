
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore"

import { auth, db } from "./firebase"
import { getEmployeeByUid } from "./employeeRoles"

const records = collection(db, "records")
const audit = collection(db, "audit_logs")

function currentActor() {
  const uid = auth.currentUser?.uid

  if (!uid || !getEmployeeByUid(uid)) {
    throw new Error(
      "Войдите в кассу под своим аккаунтом."
    )
  }

  return uid
}

function logEntry({
  actorUid,
  action,
  recordId,
  before,
  after
}) {
  return {
    actorUid,
    action,
    recordId,
    before,
    after,
    createdAt: serverTimestamp(),
    expireAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
  }
}

// Добавление новой записи
export async function addRecordWithHistory(data) {
  const actorUid = currentActor()
  const recordRef = doc(records)
  const logRef = doc(audit)

  const after = {
    ...data,
    createdBy: actorUid,
    lastAuditId: logRef.id,
    changedBy: actorUid,
  }

  const batch = writeBatch(db)

  batch.set(recordRef, after)

  batch.set(logRef, logEntry({
    actorUid,
    action: "create",
    recordId: recordRef.id,
    before: null,
    after,
  }))

  await batch.commit()

  return recordRef.id
}

// Редактирование, отключение и восстановление
export async function updateRecordWithHistory(
  id,
  changes,
  action = "edit"
) {
  const actorUid = currentActor()
  const recordRef = doc(records, id)
  const logRef = doc(audit)

  const allowedActions = [
    "edit",
    "disable",
    "enable",
    "trash",
    "restore"
  ]

  if (!allowedActions.includes(action)) {
    throw new Error("Неизвестное действие с записью.")
  }

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(recordRef)

    if (!snapshot.exists()) {
      throw new Error("Запись не найдена.")
    }

    const before = snapshot.data()
    if (action === "restore" && getEmployeeByUid(actorUid)?.role !== "owner") {
      throw new Error("Восстанавливать записи может только владелец.")
    }
    if (before.deleted && action !== "restore") {
      throw new Error("Запись находится в корзине.")
    }

    const after = {
      ...before,
      ...changes,
      lastAuditId: logRef.id,
      changedBy: actorUid,
    }

    transaction.set(recordRef, after)

    transaction.set(logRef, logEntry({
      actorUid,
      action,
      recordId: id,
      before,
      after,
    }))
  })
}

// Окончательное удаление — только владелец
export async function permanentlyDeleteWithHistory(id) {
  const actorUid = currentActor()

  if (getEmployeeByUid(actorUid)?.role !== "owner") {
    throw new Error(
      "Удалять записи навсегда может только владелец."
    )
  }

  const recordRef = doc(records, id)
  const logRef = doc(audit)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(recordRef)

    if (!snapshot.exists()) {
      throw new Error("Запись уже удалена.")
    }

    transaction.delete(recordRef)

    transaction.set(logRef, logEntry({
      actorUid,
      action: "purge",
      recordId: id,
      before: snapshot.data(),
      after: null,
    }))
  })
}

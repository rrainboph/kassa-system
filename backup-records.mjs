
import { collection, getDocsFromServer } from "firebase/firestore"
import { db } from "./src/firebase.js"
import { writeFileSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const snapshot = await getDocsFromServer(
  collection(db, "records")
)

const backup = {
  project: db.app.options.projectId,
  exportedAt: new Date().toISOString(),
  records: snapshot.docs.map(item => ({
    id: item.id,
    data: item.data()
  }))
}

const path = join(
  homedir(),
  `kassa-records-backup-${Date.now()}.json`
)

writeFileSync(path, JSON.stringify(backup, null, 2), {
  encoding: "utf8",
  flag: "wx"
})

const saved = JSON.parse(readFileSync(path, "utf8"))

if (saved.records.length !== snapshot.size) {
  throw new Error("Ошибка проверки резервной копии")
}

console.log("Резервная копия:", path)
console.log("Сохранено записей:", saved.records.length)

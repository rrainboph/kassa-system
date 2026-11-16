
const STAFF_BY_UID = {
  "eB1Ny5JLr0giCLvE1mFn8JhZC8M2": {
    name: "Ренат",
    role: "owner"
  },

  "2PJqANixFFNQ1yQgl8Rag7Xwu1v2": {
    name: "Сумая",
    role: "employee"
  },

  "DRneOP59srbQaSwrchhyIp2LHaN2": {
    name: "Егор",
    role: "employee"
  }
}

export function getEmployeeByUid(uid) {
  if (!uid) return null
  return Object.prototype.hasOwnProperty.call(STAFF_BY_UID, uid)
    ? STAFF_BY_UID[uid]
    : null
}

export function isOwner(uid) {
  return getEmployeeByUid(uid)?.role === "owner"
}

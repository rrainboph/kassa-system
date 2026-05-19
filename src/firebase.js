import { initializeApp } from "firebase/app"

import { getFirestore } from "firebase/firestore"

const firebaseConfig = {

  apiKey: "AIzaSyCJZlhFLrXFVgFWo2271VlDVfBroluIdlY",

  authDomain: "kassa-system.firebaseapp.com",

  projectId: "kassa-system",

  storageBucket: "kassa-system.firebasestorage.app",

  messagingSenderId: "311638298851",

  appId: "1:311638298851:web:36081528879e0ed0aa35d6",

  measurementId: "G-MF3P4R0ZMW"

}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
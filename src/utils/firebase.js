import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCyS2peoRy18jN_O1rgewJFsm7WiIEqEgM",
  authDomain: "shop-mangemnt.firebaseapp.com",
  projectId: "shop-mangemnt",
  storageBucket: "shop-mangemnt.appspot.com",
  messagingSenderId: "284757858513",
  appId: "1:284757858513:web:ca0bdf1e86ec68a17e4df0"
}

console.log('Firebase API key embedded (for local test):', firebaseConfig.apiKey ? 'present' : 'missing')

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCyS2peoRy18jN_O1rgewJFsm7WiIEqEgM",
    authDomain: "shop-mangemnt.firebaseapp.com",
    projectId: "shop-mangemnt",
    storageBucket: "shop-mangemnt.firebasestorage.app",
    messagingSenderId: "284757858513",
    appId: "1:284757858513:web:ca0bdf1e86ec68a17e4df0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Modern persistence setup with multi-tab support
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

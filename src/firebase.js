import { initializeApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCnz26wUZ-78tDbkmnOiu2HSxxnwrFpztA",
  authDomain: "kuma-6c130.firebaseapp.com",
  projectId: "kuma-6c130",
  storageBucket: "kuma-6c130.firebasestorage.app",
  messagingSenderId: "753252248655",
  appId: "1:753252248655:web:f2b28c34cb40ea3aea8e3a",
};

const app = initializeApp(firebaseConfig);
// SSO トークンはセッション毎に kuma-app から発行されるためメモリのみに保持
// browserLocalPersistence だと cross-origin セッション検証で sessionStorage エラーが発生する
export const auth = initializeAuth(app, {
  persistence: inMemoryPersistence,
});
export const db = getFirestore(app);

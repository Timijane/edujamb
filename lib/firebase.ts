import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAQIuDr8q8h58peF8_ddq23ZNxqt2kf0Js",
  authDomain: "jambmaster-4fa55.firebaseapp.com",
  projectId: "jambmaster-4fa55",
  storageBucket: "jambmaster-4fa55.firebasestorage.app",
  messagingSenderId: "173062038657",
  appId: "1:173062038657:web:25d59dfff57689fcf25980",
  measurementId: "G-S8GFJ5EG40",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

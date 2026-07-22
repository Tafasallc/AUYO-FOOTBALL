import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION = "auyo_storage";

// Mirrors the get/set shape the app uses, but backed by a real free
// cloud database so every visitor sees the same live scores and news.
export const storage = {
  async get(key) {
    const snap = await getDoc(doc(db, COLLECTION, key));
    if (!snap.exists()) return null;
    return { key, value: snap.data().value };
  },
  async set(key, value) {
    await setDoc(doc(db, COLLECTION, key), { value });
    return { key, value };
  },
};

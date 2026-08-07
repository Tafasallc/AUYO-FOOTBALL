import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, fbStorage } from "./firebase";

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

// Uploads an image file (from an <input type="file">) to Firebase Storage
// and returns a public URL that can be saved on a news post.
export async function uploadImage(file) {
  const path = `news-images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const imageRef = ref(fbStorage, path);
  await uploadBytes(imageRef, file);
  return await getDownloadURL(imageRef);
}

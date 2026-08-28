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
  const compressed = await compressImage(file);
  const path = `news-images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}.jpg`;
  const imageRef = ref(fbStorage, path);
  await uploadBytes(imageRef, compressed);
  return await getDownloadURL(imageRef);
}

// Resizes an image down to a max dimension and re-encodes it as a
// moderate-quality JPEG. Phone camera photos are often 3-8MB; this
// typically brings that down to a few hundred KB, which is the single
// biggest lever for the app feeling fast on slower connections/devices.
function compressImage(file, maxDimension = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // If compression fails for any reason, fall back to the original file
      // rather than blocking the upload entirely.
      resolve(file);
    };
    img.src = objectUrl;
  });
}


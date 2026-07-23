import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDJ_Yw3JOHtIH-gD514o2CxKdvPDIACW9Y",
  authDomain: "auyo-football-2f524.firebaseapp.com",
  projectId: "auyo-football-2f524",
  storageBucket: "auyo-football-2f524.firebasestorage.app",
  messagingSenderId: "1000098430892",
  appId: "1:1000098430892:web:359ca9878b6de2a38d8409",
  measurementId: "G-GE0CWWWJCD"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

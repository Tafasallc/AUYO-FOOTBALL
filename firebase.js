import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 1. Go to https://console.firebase.google.com, create a free project.
// 2. Inside the project: Build > Firestore Database > Create database > Start in test mode.
// 3. Project settings (gear icon) > General > "Your apps" > Add app > Web (</>).
// 4. Copy the config object Firebase gives you and paste it below, replacing this placeholder.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

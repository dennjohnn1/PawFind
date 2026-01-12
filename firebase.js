import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  FIREBASE_API_KEY,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_ANDROID_APP_ID,
  FIREBASE_PROJECT_NUMBER,
} from "@env";

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_PROJECT_NUMBER,
  appId: FIREBASE_ANDROID_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);

// ✅ ADD THIS
export const auth = getAuth(firebaseApp);

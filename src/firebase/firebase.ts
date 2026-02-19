import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";
import { collection, getDocs } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyAYvQtEhnmJuQ98d6pE0FuDMM4BidAMODE",
  authDomain: "loqtazone.firebaseapp.com",
  projectId: "loqtazone",
  storageBucket: "loqtazone.firebasestorage.app",
  messagingSenderId: "122947081944",
  appId: "1:122947081944:web:44602c0e995e8f2f8729ad",
  measurementId: "G-0DEFWCEYTZ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
export const functions = getFunctions(app);





export default app;
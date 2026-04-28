import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBB_Iaswwh_gA8JXQHnR2_4t0HPKfAPCHE",
  authDomain: "itain-bell-schools.firebaseapp.com",
  projectId: "itain-bell-schools",
  storageBucket: "itain-bell-schools.firebasestorage.app",
  messagingSenderId: "400144242932",
  appId: "1:400144242932:web:ee2959bd3ebed0b666a6a1",
  measurementId: "G-P4BE58VCDZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;

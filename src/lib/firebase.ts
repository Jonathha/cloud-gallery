import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAZipNnDxapiWfN1is5XrgyyabtcSbK7D0",
  authDomain: "pupururim.firebaseapp.com",
  projectId: "pupururim",
  storageBucket: "pupururim.firebasestorage.app",
  messagingSenderId: "403052157138",
  appId: "1:403052157138:web:88e800733fbabf7120350b",
  measurementId: "G-BJTDQ783HL"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

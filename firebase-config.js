import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
    signOut, onAuthStateChanged, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { 
    getFirestore, collection, doc, setDoc, getDoc, getDocs,
    updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-V5suvNo46FndhUbqMiIomiuVma3li-w",
  authDomain: "meipper-74267.firebaseapp.com",
  projectId: "meipper-74267",
  storageBucket: "meipper-74267.firebasestorage.app",
  messagingSenderId: "619482964791",
  appId: "1:619482964791:web:2937f0ecead659e54d30b2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Auth exports
window.firebaseAuth = auth;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.signOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;
window.sendPasswordResetEmail = sendPasswordResetEmail;

// Firestore exports
window.firebaseDB = db;
window.collection = collection;
window.doc = doc;
window.setDoc = setDoc;
window.getDoc = getDoc;
window.getDocs = getDocs;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;
window.serverTimestamp = serverTimestamp;

console.log("Firebase configurado com sucesso!");

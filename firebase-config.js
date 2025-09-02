// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDocs, getDoc,
  updateDoc, deleteDoc, serverTimestamp, query, where, addDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

// 🔑 Suas chaves aqui
const firebaseConfig = {
  apiKey: "AIzaSyC-V5suvNo46FndhUbqMiIomiuVma3li-w",
  authDomain: "meipper-74267.firebaseapp.com",
  projectId: "meipper-74267",
  storageBucket: "meipper-74267.firebasestorage.app",
  messagingSenderId: "619482964791",
  appId: "1:619482964791:web:2937f0ecead659e54d30b2"
};

// Inicializa primeiro
const app = initializeApp(firebaseConfig);

// Serviços
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Expor globalmente (Auth)
window.firebaseAuth = auth;
window.onAuthStateChanged = onAuthStateChanged;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.signOut = signOut;
window.sendPasswordResetEmail = sendPasswordResetEmail;
window.updateProfile = updateProfile;

// Expor globalmente (Firestore)
window.firebaseDB = db;
window.collection = collection;
window.doc = doc;
window.setDoc = setDoc;
window.getDocs = getDocs;
window.getDoc = getDoc;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;
window.serverTimestamp = serverTimestamp;
window.query = query;
window.where = where;
window.addDoc = addDoc;

// Expor globalmente (Storage)
window.firebaseStorage = storage;
window.ref = ref;
window.uploadBytes = uploadBytes;
window.getDownloadURL = getDownloadURL;

console.log("Firebase configurado com sucesso!");

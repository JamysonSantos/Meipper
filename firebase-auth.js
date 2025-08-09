// firebase-auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-V5suvNo46FndhUbqMiIomiuVma3li-w",
  authDomain: "meipper-74267.firebaseapp.com",
  projectId: "meipper-74267",
  storageBucket: "meipper-74267.appspot.com",
  messagingSenderId: "619482964791",
  appId: "1:619482964791:web:2937f0ecead659e54d30b2"
};

// Inicialize o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Exporte os métodos necessários para o script principal
export { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  onAuthStateChanged, 
  signOut 
};

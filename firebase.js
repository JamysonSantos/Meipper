const firebaseConfig = {
  apiKey: "AIzaSyC-V5suvNo46FndhUbqMiIomiuVma3li-w",
    authDomain: "meipper-74267.firebaseapp.com",
    projectId: "meipper-74267",
    storageBucket: "meipper-74267.firebasestorage.app",
    messagingSenderId: "619482964791",
    appId: "1:619482964791:web:2937f0ecead659e54d30b2"
};

// Inicialize o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Exporte apenas o necessário
export { auth };

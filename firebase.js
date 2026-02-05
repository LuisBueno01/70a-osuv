// Inicializar Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCTfSxhhCXKFkZqFOHpDxuk7UDlwhHLoAc",
  authDomain: "eventoaniversariouv.firebaseapp.com",
  projectId: "eventoaniversariouv",
  storageBucket: "eventoaniversariouv.firebasestorage.app",
  messagingSenderId: "847831410524",
  appId: "1:847831410524:web:1548c883b91fab42020399"
};

firebase.initializeApp(firebaseConfig);

// Servicios globales
const db = firebase.firestore();
const auth = firebase.auth();

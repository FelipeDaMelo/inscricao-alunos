
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


  const firebaseConfig = {
    apiKey: "AIzaSyBtKWotxt9EVCs4rfVg6qgleiMeBVwnPag",
    authDomain: "inscricao-de-alunos.firebaseapp.com",
    projectId: "inscricao-de-alunos",
    storageBucket: "inscricao-de-alunos.firebasestorage.app",
    messagingSenderId: "930778561912",
    appId: "1:930778561912:web:b1d931aacbb2805d739c8d",
    measurementId: "G-0FYP3S555K"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

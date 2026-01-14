import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// SUAS CREDENCIAIS DO FIREBASE (já configuradas)
const firebaseConfig = {
  apiKey: "AIzaSyB_QlCMb8Ekd-LyruneaCcL7JnNpF-ChIc",
  authDomain: "contadorquestoes.firebaseapp.com",
  projectId: "contadorquestoes",
  storageBucket: "contadorquestoes.firebasestorage.app",
  messagingSenderId: "458226671962",
  appId: "1:458226671962:web:d6c705ad3a5fee0b909363",
  measurementId: "G-RRV1PRP3H8"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
const db = getFirestore(app);

// Coleção para salvar os dados
const COLLECTION_NAME = "questionCounters";
const DOCUMENT_ID = "userCounters"; // Você pode mudar para um ID por usuário se quiser

// Função para salvar dados no Firebase
export const saveToFirebase = async (correctCount, incorrectCount) => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, DOCUMENT_ID), {
      correctCount,
      incorrectCount,
      lastUpdated: new Date().toISOString(),
      timestamp: Date.now()
    });
    console.log("✅ Dados salvos no Firebase!");
    return true;
  } catch (error) {
    console.error("❌ Erro ao salvar no Firebase:", error);
    return false;
  }
};

// Função para carregar dados do Firebase
export const loadFromFirebase = async () => {
  try {
    const docRef = doc(db, COLLECTION_NAME, DOCUMENT_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("📥 Dados carregados do Firebase:", data);
      return {
        correctCount: data.correctCount || 0,
        incorrectCount: data.incorrectCount || 0,
        lastUpdated: data.lastUpdated || null
      };
    } else {
      console.log("📭 Nenhum dado encontrado no Firebase. Usando valores padrão.");
      return { 
        correctCount: 0, 
        incorrectCount: 0,
        lastUpdated: null 
      };
    }
  } catch (error) {
    console.error("❌ Erro ao carregar do Firebase:", error);
    return { 
      correctCount: 0, 
      incorrectCount: 0,
      lastUpdated: null 
    };
  }
};

// Função para resetar dados no Firebase
export const resetFirebaseData = async () => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, DOCUMENT_ID), {
      correctCount: 0,
      incorrectCount: 0,
      lastUpdated: new Date().toISOString(),
      timestamp: Date.now(),
      reset: true
    });
    console.log("🔄 Dados resetados no Firebase!");
    return true;
  } catch (error) {
    console.error("❌ Erro ao resetar no Firebase:", error);
    return false;
  }
};

export { db };
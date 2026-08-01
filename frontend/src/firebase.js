import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDTT9jAXfooRoYnBimnZbKLboccoIzwOkw",
  authDomain: "translator-22b3d.firebaseapp.com",
  projectId: "translator-22b3d",
  storageBucket: "translator-22b3d.firebasestorage.app",
  messagingSenderId: "1041555747228",
  appId: "1:1041555747228:web:d2a560ab03f5dfe0711859",
  measurementId: "G-QMHP77HWRF"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics safely
export let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(() => {});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Auth Helper: Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

// Auth Helper: Sign in Anonymously (Guest Mode)
export const signInAsGuest = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Guest Auth Error:", error);
    throw error;
  }
};

// Auth Helper: Sign Out
export const logoutUser = () => signOut(auth);

// Firestore Helper: Save Transliteration Entry to User's History
export const saveToHistory = async (userId, entry) => {
  if (!userId) return;
  try {
    const historyRef = collection(db, 'users', userId, 'history');
    await addDoc(historyRef, {
      inputType: entry.inputType || 'text',
      originalText: entry.originalText || '',
      transliteratedText: entry.transliteratedText || '',
      fileName: entry.fileName || null,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error saving history to Firestore:", error);
  }
};

// Firestore Helper: Fetch Recent History (Last 50 entries)
export const fetchUserHistory = async (userId) => {
  if (!userId) return [];
  try {
    const historyRef = collection(db, 'users', userId, 'history');
    const q = query(historyRef, orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error("Error fetching history from Firestore:", error);
    return [];
  }
};

// Firestore Helper: Delete Single Entry
export const deleteHistoryEntry = async (userId, historyId) => {
  if (!userId || !historyId) return;
  try {
    const docRef = doc(db, 'users', userId, 'history', historyId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting history entry:", error);
  }
};

// Firestore Helper: Clear All History
export const clearAllHistory = async (userId) => {
  if (!userId) return;
  try {
    const historyRef = collection(db, 'users', userId, 'history');
    const snapshot = await getDocs(historyRef);
    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error("Error clearing history:", error);
  }
};

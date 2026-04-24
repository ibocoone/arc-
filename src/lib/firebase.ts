import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "test2-6b5b2",
  apiKey: "AIzaSyCC_JuJco5VyADciTMu3NKnzrVPLA2Uk6s",
  authDomain: "test2-6b5b2.firebaseapp.com",
  storageBucket: "test2-6b5b2.appspot.com",
  messagingSenderId: "114430716868651210220",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Default Firestore database (no custom ID needed for new project)
export const db = getFirestore(app);

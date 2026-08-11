import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyAP5OXrafFgZ0vZRUfdgl7zw3EOJJs0bwk",
  authDomain: "studio-411611899-37c44.firebaseapp.com",
  projectId: "studio-411611899-37c44",
  storageBucket: "studio-411611899-37c44.firebasestorage.app",
  messagingSenderId: "712982436079",
  appId: "1:712982436079:web:9adc47303be613f80b631a"
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Test Connection
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase offline or configuration issue:", error);
      return false;
    }
    // Document not existing still means connection succeeded
    return true;
  }
}

// Firebase Auth Helpers
export async function loginOrRegisterWithEmail(name: string, email: string, pass: string): Promise<FirebaseUser> {
  let user: FirebaseUser;
  try {
    // Attempt sign in
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    user = cred.user;
    if (name && (!user.displayName || user.displayName !== name)) {
      await updateProfile(user, { displayName: name });
    }
  } catch (err: any) {
    // If user does not exist or credentials fail, attempt registration
    if (
      err.code === 'auth/user-not-found' || 
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/wrong-password'
    ) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        user = cred.user;
        if (name) {
          await updateProfile(user, { displayName: name });
        }
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          throw new Error('Senha incorreta para este e-mail já cadastrado.');
        } else if (createErr.code === 'auth/weak-password') {
          throw new Error('A senha deve ter pelo menos 6 caracteres no Firebase.');
        } else if (createErr.code === 'auth/invalid-email') {
          throw new Error('E-mail em formato inválido.');
        } else {
          throw new Error(createErr.message || 'Erro ao autenticar com e-mail.');
        }
      }
    } else if (err.code === 'auth/invalid-email') {
      throw new Error('E-mail em formato inválido.');
    } else if (err.code === 'auth/weak-password') {
      throw new Error('A senha deve ter pelo menos 6 caracteres no Firebase.');
    } else {
      throw new Error(err.message || 'Falha na autenticação do Firebase.');
    }
  }
  return user;
}

export async function loginWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  return res.user;
}

export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Admin / Bride Firebase Auth & Firestore Helpers
export async function saveAdminToFirestore(user: FirebaseUser, role: string = 'bride_admin') {
  try {
    const adminRef = doc(db, 'admins', user.uid);
    const docData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Noiva / Noivo',
      role,
      updatedAt: new Date().toISOString()
    };
    const { setDoc } = await import('firebase/firestore');
    await setDoc(adminRef, docData, { merge: true });
  } catch (e) {
    console.warn('Note: Firestore admin save warning:', e);
  }
}

export async function saveCoupleToFirestore(uid: string, eventInfo: any, gifts?: any[], guests?: any[]) {
  try {
    const coupleRef = doc(db, 'couples', uid);
    const { setDoc } = await import('firebase/firestore');
    const docData = {
      uid,
      eventInfo,
      gifts: gifts || [],
      guests: guests || [],
      updatedAt: new Date().toISOString()
    };
    await setDoc(coupleRef, docData, { merge: true });
  } catch (e) {
    console.warn('Note: Could not save couple record to Firestore:', e);
  }
}

export async function getCoupleFromFirestore(uid: string) {
  try {
    const coupleRef = doc(db, 'couples', uid);
    const { getDoc } = await import('firebase/firestore');
    const docSnap = await getDoc(coupleRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (e) {
    console.warn('Note: Could not read couple record from Firestore:', e);
    return null;
  }
}

export async function authenticateBrideAdminWithFirebase(
  email: string, 
  pass: string, 
  mode: 'login' | 'register'
): Promise<FirebaseUser> {
  let user: FirebaseUser;
  if (mode === 'register') {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    user = cred.user;
    await updateProfile(user, { displayName: 'Noiva / Noivo' });
  } else {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      user = cred.user;
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, pass);
          user = cred.user;
          await updateProfile(user, { displayName: 'Noiva / Noivo' });
        } catch (createErr: any) {
          throw new Error('Email ou senha incorretos no Firebase Auth.');
        }
      } else if (err.code === 'auth/wrong-password') {
        throw new Error('Senha incorreta para este e-mail cadastrado no Firebase.');
      } else {
        throw new Error(err.message || 'Erro ao autenticar no Firebase.');
      }
    }
  }

  await saveAdminToFirestore(user, 'bride_admin');
  return user;
}



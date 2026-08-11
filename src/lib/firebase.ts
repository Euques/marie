import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer, 
  collection, 
  getDocs, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
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
import { EventInfo, Gift, Guest } from '../types';

import appletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = appletConfig as any;

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Error handling standard per Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
}

// Upload Photo directly to Firebase Storage
export async function uploadPhotoToStorage(fileOrBase64: File | string, folder: string = 'couples'): Promise<string> {
  const uid = auth.currentUser?.uid || 'guest';
  const fileName = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
  const fileReference = storageRef(storage, `${folder}/${uid}/${fileName}`);

  try {
    if (typeof fileOrBase64 === 'string') {
      // Base64 data string
      const snapshot = await uploadString(fileReference, fileOrBase64, 'data_url');
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } else {
      // File object
      const snapshot = await uploadBytes(fileReference, fileOrBase64);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    }
  } catch (error) {
    console.warn('Firebase Storage direct upload notice:', error);
    throw error;
  }
}

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
    return true;
  }
}

// Direct Firestore Event Syncing Functions
export async function saveEventInfoToFirestore(info: Partial<EventInfo>): Promise<void> {
  try {
    const mainRef = doc(db, 'event_info', 'main');
    const coupleRef = doc(db, 'couples', 'default');
    const payload = { ...info, updatedAt: new Date().toISOString() };
    await setDoc(mainRef, payload, { merge: true });
    await setDoc(coupleRef, { eventInfo: payload, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'event_info/main');
  }
}

export async function saveGiftToFirestore(gift: Gift): Promise<void> {
  try {
    const giftRef = doc(db, 'gifts', gift.id);
    await setDoc(giftRef, { ...gift, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `gifts/${gift.id}`);
  }
}

export async function deleteGiftFromFirestore(giftId: string): Promise<void> {
  try {
    const giftRef = doc(db, 'gifts', giftId);
    await deleteDoc(giftRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `gifts/${giftId}`);
  }
}

export async function saveGuestToFirestore(guest: Guest): Promise<void> {
  try {
    const guestRef = doc(db, 'guests', guest.id);
    await setDoc(guestRef, { ...guest, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `guests/${guest.id}`);
  }
}

export async function deleteGuestFromFirestore(guestId: string): Promise<void> {
  try {
    const guestRef = doc(db, 'guests', guestId);
    await deleteDoc(guestRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `guests/${guestId}`);
  }
}

// Synchronize all data into Firestore
export async function syncAllToFirestore(appData: { eventInfo?: EventInfo | null; gifts?: Gift[]; guests?: Guest[] }): Promise<boolean> {
  try {
    if (appData.eventInfo) {
      await saveEventInfoToFirestore(appData.eventInfo);
    }
    if (appData.gifts && appData.gifts.length > 0) {
      for (const gift of appData.gifts) {
        await saveGiftToFirestore(gift);
      }
    }
    if (appData.guests && appData.guests.length > 0) {
      for (const guest of appData.guests) {
        await saveGuestToFirestore(guest);
      }
    }
    return true;
  } catch (err) {
    console.error('Error syncing all to Firestore:', err);
    return false;
  }
}

// Load all data from Firestore
export async function loadAllFromFirestore() {
  try {
    const eventSnap = await getDoc(doc(db, 'event_info', 'main'));
    const giftsSnap = await getDocs(collection(db, 'gifts'));
    const guestsSnap = await getDocs(collection(db, 'guests'));

    const eventInfo = eventSnap.exists() ? (eventSnap.data() as EventInfo) : null;
    const gifts = giftsSnap.docs.map(d => d.data() as Gift);
    const guests = guestsSnap.docs.map(d => d.data() as Guest);

    return { eventInfo, gifts, guests };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'all_collections');
    return null;
  }
}

// Firebase Auth Helpers
export async function loginOrRegisterWithEmail(name: string, email: string, pass: string): Promise<FirebaseUser> {
  let user: FirebaseUser;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    user = cred.user;
    if (name && (!user.displayName || user.displayName !== name)) {
      await updateProfile(user, { displayName: name });
    }
  } catch (err: any) {
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
    await setDoc(adminRef, docData, { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `admins/${user.uid}`);
  }
}

export async function saveCoupleToFirestore(uid: string, eventInfo: any, gifts?: any[], guests?: any[]) {
  try {
    const coupleRef = doc(db, 'couples', uid);
    const defaultRef = doc(db, 'couples', 'default');
    const mainRef = doc(db, 'event_info', 'main');

    const docData = {
      uid,
      eventInfo,
      gifts: gifts || [],
      guests: guests || [],
      updatedAt: new Date().toISOString()
    };
    await setDoc(coupleRef, docData, { merge: true });
    await setDoc(defaultRef, docData, { merge: true });
    if (eventInfo) {
      await setDoc(mainRef, { ...eventInfo, updatedAt: new Date().toISOString() }, { merge: true });
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `couples/${uid}`);
  }
}

export async function getCoupleFromFirestore(uid: string) {
  try {
    const coupleRef = doc(db, 'couples', uid);
    const docSnap = await getDoc(coupleRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, `couples/${uid}`);
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

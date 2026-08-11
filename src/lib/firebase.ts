import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
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
  signInAnonymously,
  User as FirebaseUser
} from 'firebase/auth';
import { EventInfo, Gift, Guest } from '../types';

import appletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = appletConfig as any;

// Helper to remove 'undefined' values before passing to Firestore setDoc
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }
  return JSON.parse(JSON.stringify(data, (_key, value) => (value === undefined ? null : value)));
}

// Initialize Firebase App
const existingApps = getApps();
export const app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);

// Initialize Firestore properly with ignoreUndefinedProperties
export const db = (() => {
  const dbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') 
    ? firebaseConfig.firestoreDatabaseId 
    : undefined;
  try {
    return dbId 
      ? initializeFirestore(app, { ignoreUndefinedProperties: true }, dbId)
      : initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
})();

export const auth = getAuth(app);
export { signOut };
export const storage = getStorage(
  app,
  firebaseConfig.storageBucket
    ? (firebaseConfig.storageBucket.startsWith('gs://') ? firebaseConfig.storageBucket : `gs://${firebaseConfig.storageBucket}`)
    : undefined
);

// Helper to ensure an authenticated session exists
export async function ensureAuth(): Promise<void> {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      if (err?.code === 'auth/admin-restricted-operation') {
        console.warn('Para usar autenticação anônima, ative o provedor "Anônimo" em Firebase Console > Authentication > Sign-in method.');
      } else {
        console.warn('Aviso de autenticação anônima:', err?.message || err);
      }
    }
  }
}

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
export async function uploadPhotoToStorage(fileOrBase64: File | string, folder: string = 'couples'): Promise<string | null> {
  await ensureAuth();

  const uid = auth.currentUser?.uid || 'anonymous';
  const fileName = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
  const fileReference = storageRef(storage, `${folder}/${uid}/${fileName}`);

  try {
    if (typeof fileOrBase64 === 'string') {
      // Base64 data string
      const snapshot = await uploadString(fileReference, fileOrBase64, 'data_url');
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log('Sucesso no upload para Firebase Storage:', downloadUrl);
      return downloadUrl;
    } else {
      // File object
      const snapshot = await uploadBytes(fileReference, fileOrBase64);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log('Sucesso no upload para Firebase Storage:', downloadUrl);
      return downloadUrl;
    }
  } catch (error: any) {
    if (error?.code === 'storage/unauthorized') {
      console.warn('Firebase Storage requer permissão de gravação. Verifique as Regras (Rules) no Firebase Console > Storage > Regras.');
    } else {
      console.error('Erro no upload para Firebase Storage:', error?.code || error?.message || error);
    }
    return null;
  }
}

// Test Connection
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await ensureAuth();
    const testDocRef = doc(db, 'test', 'ping');
    await setDoc(testDocRef, cleanForFirestore({ ping: true, timestamp: new Date().toISOString() }), { merge: true });
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
    await ensureAuth();
    const mainRef = doc(db, 'event_info', 'main');
    const payload = cleanForFirestore({ ...info, updatedAt: new Date().toISOString() });
    await setDoc(mainRef, payload, { merge: true });
    if (info.id && info.id !== 'main') {
      const coupleRef = doc(db, 'couples', info.id);
      await setDoc(coupleRef, { eventInfo: payload, updatedAt: new Date().toISOString() }, { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'event_info/main');
    throw err;
  }
}

export async function saveGiftToFirestore(gift: Gift): Promise<void> {
  try {
    await ensureAuth();
    const giftRef = doc(db, 'gifts', gift.id);
    const payload = cleanForFirestore({ ...gift, updatedAt: new Date().toISOString() });
    await setDoc(giftRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `gifts/${gift.id}`);
    throw err;
  }
}

export async function deleteGiftFromFirestore(giftId: string): Promise<void> {
  try {
    await ensureAuth();
    const giftRef = doc(db, 'gifts', giftId);
    await deleteDoc(giftRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `gifts/${giftId}`);
  }
}

export async function saveGuestToFirestore(guest: Guest): Promise<void> {
  try {
    await ensureAuth();
    const guestRef = doc(db, 'guests', guest.id);
    const payload = cleanForFirestore({ ...guest, updatedAt: new Date().toISOString() });
    await setDoc(guestRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `guests/${guest.id}`);
    throw err;
  }
}

export async function deleteGuestFromFirestore(guestId: string): Promise<void> {
  try {
    await ensureAuth();
    const guestRef = doc(db, 'guests', guestId);
    await deleteDoc(guestRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `guests/${guestId}`);
  }
}

// Synchronize all data into Firestore
export async function syncAllToFirestore(appData: { eventInfo?: EventInfo | null; gifts?: Gift[]; guests?: Guest[] }): Promise<boolean> {
  try {
    await ensureAuth();
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
export async function saveUserToFirestore(user: FirebaseUser, extraRole?: string) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const docData = cleanForFirestore({
      uid: user.uid,
      displayName: user.displayName || 'Usuário Sem Nome',
      email: user.email || '',
      photoURL: user.photoURL || '',
      isAnonymous: user.isAnonymous || false,
      role: extraRole || (user.email?.toLowerCase() === 'euques@gmail.com' ? 'superadmin' : 'user'),
      updatedAt: new Date().toISOString()
    });
    await setDoc(userRef, docData, { merge: true });

    if (user.email?.toLowerCase() === 'euques@gmail.com' || extraRole === 'superadmin') {
      const adminRef = doc(db, 'admins', user.uid);
      await setDoc(adminRef, { ...docData, role: 'superadmin' }, { merge: true });
      sessionStorage.setItem('cha_superadmin_authenticated', 'true');
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
  }
}

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

  // Auto-create / update user document in Firestore
  await saveUserToFirestore(user);
  return user;
}

export async function loginWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  const user = res.user;

  // Auto-create / update user document in Firestore
  await saveUserToFirestore(user);

  if (user.email?.toLowerCase() === 'euques@gmail.com') {
    sessionStorage.setItem('cha_superadmin_authenticated', 'true');
    await saveAdminToFirestore(user, 'superadmin');
  }

  return user;
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
    await ensureAuth();
    const coupleRef = doc(db, 'couples', uid);
    const mainRef = doc(db, 'event_info', 'main');

    const docData = cleanForFirestore({
      id: uid,
      uid,
      eventInfo: { ...eventInfo, id: uid },
      gifts: gifts || [],
      guests: guests || [],
      updatedAt: new Date().toISOString()
    });
    await setDoc(coupleRef, docData, { merge: true });
    if (eventInfo) {
      await setDoc(mainRef, cleanForFirestore({ ...eventInfo, id: uid, updatedAt: new Date().toISOString() }), { merge: true });
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

export async function getAllCouplesFromFirestore(): Promise<any[]> {
  try {
    await ensureAuth();
    const querySnapshot = await getDocs(collection(db, 'couples'));
    const rawCouples: any[] = [];
    
    querySnapshot.forEach((docSnap) => {
      rawCouples.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (rawCouples.length === 0) return [];

    // Filter out 'default' document if non-default couple profiles exist
    const nonDefault = rawCouples.filter(c => c.id !== 'default');
    const sourceList = nonDefault.length > 0 ? nonDefault : rawCouples;

    // Deduplicate by Bride & Groom Name or ID
    const uniqueMap = new Map<string, any>();

    for (const item of sourceList) {
      const bride = (item.eventInfo?.brideName || '').trim().toLowerCase();
      const groom = (item.eventInfo?.groomName || '').trim().toLowerCase();
      const title = (item.eventInfo?.eventTitle || '').trim().toLowerCase();
      
      // Key by names if available, otherwise by doc ID
      const nameKey = (bride || groom) ? `${bride}_${groom}_${title}` : item.id;

      if (!uniqueMap.has(nameKey)) {
        uniqueMap.set(nameKey, item);
      } else {
        const existing = uniqueMap.get(nameKey);
        // Prefer real UID over default or keep the one with more gifts / guests / recent update
        if (existing.id === 'default' && item.id !== 'default') {
          uniqueMap.set(nameKey, item);
        } else if ((item.gifts?.length || 0) > (existing.gifts?.length || 0)) {
          uniqueMap.set(nameKey, item);
        } else if (new Date(item.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
          uniqueMap.set(nameKey, item);
        }
      }
    }

    return Array.from(uniqueMap.values());
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, 'couples');
    return [];
  }
}

export async function deleteCoupleFromFirestore(uid: string): Promise<void> {
  try {
    await ensureAuth();
    const coupleRef = doc(db, 'couples', uid);
    await deleteDoc(coupleRef);
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `couples/${uid}`);
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

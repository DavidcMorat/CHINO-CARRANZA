import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  Auth
} from 'firebase/auth';
import { AppData } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyDgd0hZFb64DPCmrRedcDgD0ZkwwyatDfs",
  authDomain: "app-taller-e07d2.firebaseapp.com",
  projectId: "app-taller-e07d2",
  storageBucket: "app-taller-e07d2.firebasestorage.app",
  messagingSenderId: "762019943290",
  appId: "1:762019943290:web:7989917d245f62243e7cc3",
  measurementId: "G-W89C5GRMG7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Optimización: Habilitar caché offline para reducir lecturas a la base de datos
export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const auth: Auth = getAuth(app);

export { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User };

function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as unknown as T;
  return JSON.parse(JSON.stringify(data, (_key, value) => (value === undefined ? null : value)));
}

export async function saveUserData(user: User, data: AppData): Promise<boolean> {
  if (!user) return false;
  try {
    const docRef = doc(db, 'users', user.uid, 'data', 'mainData');
    const rawPayload = {
      trabajos: data.trabajos || [],
      trabajadores: data.trabajadores || [],
      materiales: data.materiales || [],
      clientes: data.clientes || [],
      presupuestos: data.presupuestos || [],
      egresos: data.egresos || [],
      asistencias: data.asistencias || [],
      anticipos: data.anticipos || [],
      notasImportantes: data.notasImportantes || [],
      configuracionNotificaciones: data.configuracionNotificaciones || null,
      lastUpdate: new Date().toISOString()
    };
    await setDoc(docRef, sanitizeForFirestore(rawPayload));
    return true;
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    // Backup to local storage
    try {
      localStorage.setItem(`taller_backup_${user.uid}`, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving local backup:', e);
    }
    return false;
  }
}

export async function loadUserData(user: User): Promise<AppData | null> {
  if (!user) return null;
  try {
    const docRef = doc(db, 'users', user.uid, 'data', 'mainData');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const fd = docSnap.data();
      return {
        trabajos: fd.trabajos || [],
        trabajadores: fd.trabajadores || [],
        materiales: fd.materiales || [],
        clientes: fd.clientes || [],
        presupuestos: fd.presupuestos || [],
        egresos: fd.egresos || [],
        asistencias: fd.asistencias || [],
        anticipos: fd.anticipos || [],
        notasImportantes: fd.notasImportantes || [],
        configuracionNotificaciones: fd.configuracionNotificaciones || undefined
      };
    }
  } catch (error) {
    console.error('Error loading from Firestore:', error);
  }
  
  // Try local backup
  try {
    const backup = localStorage.getItem(`taller_backup_${user.uid}`);
    if (backup) {
      return JSON.parse(backup);
    }
  } catch (e) {
    console.error('Error loading local backup:', e);
  }

  return {
    trabajos: [],
    trabajadores: [],
    materiales: [],
    clientes: [],
    presupuestos: [],
    egresos: [],
    asistencias: [],
    anticipos: [],
    notasImportantes: [],
    configuracionNotificaciones: undefined
  };
}

export function subscribeUserData(user: User, onUpdate: (data: AppData) => void): () => void {
  if (!user) return () => {};
  const docRef = doc(db, 'users', user.uid, 'data', 'mainData');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const fd = docSnap.data();
        onUpdate({
          trabajos: fd.trabajos || [],
          trabajadores: fd.trabajadores || [],
          materiales: fd.materiales || [],
          clientes: fd.clientes || [],
          presupuestos: fd.presupuestos || [],
          egresos: fd.egresos || [],
          asistencias: fd.asistencias || [],
          anticipos: fd.anticipos || [],
          notasImportantes: fd.notasImportantes || [],
          configuracionNotificaciones: fd.configuracionNotificaciones || undefined
        });
      }
    },
    (error) => {
      console.warn('Realtime snapshot listener error:', error);
    }
  );
}

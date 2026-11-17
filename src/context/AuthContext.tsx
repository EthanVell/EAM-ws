import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  clampStr,
  FACTORY_ID,
  UserProfile,
  UserRole,
} from '../types/eam';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  previewRole: UserRole | null;
  effectiveRole: UserRole;
  setPreviewRole: (role: UserRole | null) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      setFirebaseUser(user);
      setPreviewRole(null);

      if (!user) {
        setProfile(null);
        setAuthReady(true);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const contactRef = doc(db, 'users', user.uid, 'private', 'contact');

      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const isAdminEmail =
            user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() &&
            user.emailVerified;
          const initialRole: UserRole = isAdminEmail ? 'supervisor' : 'operator';
          const displayName = clampStr(
            user.displayName || user.email?.split('@')[0] || '工厂成员',
            80
          );

          const batch = writeBatch(db);
          batch.set(userRef, {
            uid: user.uid,
            displayName,
            role: initialRole,
            workshop: initialRole === 'supervisor' ? '全厂统筹' : '提取浓缩车间',
            factoryId: FACTORY_ID,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          batch.set(contactRef, {
            uid: user.uid,
            email: clampStr(user.email || 'unknown@bencao.local', 160),
            updatedAt: serverTimestamp(),
          });
          await batch.commit();
        } else {
          // Ensure private contact exists
          const contactSnap = await getDoc(contactRef);
          if (!contactSnap.exists() && user.email) {
            const batch = writeBatch(db);
            batch.set(contactRef, {
              uid: user.uid,
              email: clampStr(user.email, 160),
              updatedAt: serverTimestamp(),
            });
            await batch.commit();
          }
        }
      } catch (err) {
        console.error('Failed to provision user profile:', err);
        setAuthError('初始化账号角色档案失败，请刷新重试。');
      }

      unsubProfile = onSnapshot(
        userRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
          setAuthReady(true);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const signInWithGoogle = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(`Google 登录失败：${msg}`);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signOut = async () => {
    setPreviewRole(null);
    await firebaseSignOut(auth);
  };

  const actualRole: UserRole = profile?.role ?? 'operator';
  const effectiveRole: UserRole =
    actualRole === 'supervisor' && previewRole ? previewRole : actualRole;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        authReady,
        signingIn,
        authError,
        previewRole,
        effectiveRole,
        setPreviewRole,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

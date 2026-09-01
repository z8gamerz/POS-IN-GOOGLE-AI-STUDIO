'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, STORES, dbUtil } from '@/lib/db/idb';
import { useRouter, usePathname } from 'next/navigation';
import { userService } from '@/lib/services/user-service';
import { auditService } from '@/lib/services/audit-service';
import { pullSync, pullStore, processQueue, getFirebaseRtdbUrl } from '@/lib/db/sync-queue';

export type UserRole = 'admin' | 'cashier';

interface AuthContextType {
  user: Omit<User, 'passwordHash'> | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isCashier: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple hash function for simulation
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Omit<User, 'passwordHash'> | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUserId = localStorage.getItem('pos-user-id');
        if (savedUserId) {
          const userData = await userService.getById(savedUserId);
          if (userData) {
            const { passwordHash, ...userWithoutPassword } = userData;
            setUser(userWithoutPassword);
          } else {
            localStorage.removeItem('pos-user-id');
          }
        }
      } catch (error) {
        console.error('Failed to load user session:', error);
      } finally {
        setLoading(false);
      }

      // Non-blocking background sync of user and store profiles
      if (typeof window !== 'undefined' && window.navigator.onLine) {
        pullStore(STORES.USERS).catch(() => {});
        pullStore(STORES.STORE_INFO).catch(() => {});
      }
    };
    
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Check local database first for instant login
    let users = await userService.getAll();
    let foundUser = users.find(u => u.email.trim().toLowerCase() === normalizedEmail);

    // If not found locally, fetch latest users from Firebase Cloud with a fast timeout
    if (!foundUser && typeof window !== 'undefined' && window.navigator.onLine) {
      try {
        const rawUrl = getFirebaseRtdbUrl();
        const BASE_URL = rawUrl.replace(/\/$/, '');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${BASE_URL}/users.json`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const cloudData = await res.json();
          if (cloudData) {
            const items: User[] = Array.isArray(cloudData) ? cloudData.filter(Boolean) : Object.values(cloudData);
            for (const item of items) {
              if (item && item.id) {
                await dbUtil.updateItem(STORES.USERS, item);
              }
            }
          }
        }
      } catch (cloudErr) {
        console.warn('[Auth] Cloud user check note:', cloudErr);
      }
      users = await userService.getAll();
      foundUser = users.find(u => u.email.trim().toLowerCase() === normalizedEmail);
    }
    
    if (!foundUser) {
      if (users.length === 0) {
        throw new Error('No user account found in database. Ensure you click Sync on your primary device or Sign Up first as an Admin.');
      }
      throw new Error(`No account found for "${email}". Please verify your email spelling or sync with the primary device.`);
    }

    const hashedPassword = await hashPassword(password);
    const isPasswordMatch = (foundUser.passwordHash === hashedPassword) || (foundUser.passwordHash === password);
    
    if (!isPasswordMatch) {
      throw new Error('Incorrect password. Please verify your credentials and try again.');
    }

    const { passwordHash, ...userWithoutPassword } = foundUser;
    setUser(userWithoutPassword);
    localStorage.setItem('pos-user-id', foundUser.id);

    // Trigger non-blocking full sync in the background so the user is immediately redirected without waiting
    if (typeof window !== 'undefined' && window.navigator.onLine) {
      pullSync().then(() => processQueue()).catch((syncErr) => {
        console.warn('[CloudSync] Post-login background sync note:', syncErr);
      });
    }

    auditService.log('USER_LOGIN', `User ${foundUser.email} logged in`, foundUser.email).catch(() => {});
    router.push('/');
  };

  const signup = async (name: string, email: string, password: string, role: UserRole) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Ensure we have latest users from cloud before creating
    if (typeof window !== 'undefined' && window.navigator.onLine) {
      try {
        const rawUrl = getFirebaseRtdbUrl();
        const BASE_URL = rawUrl.replace(/\/$/, '');
        const res = await fetch(`${BASE_URL}/users.json`);
        if (res.ok) {
          const cloudData = await res.json();
          if (cloudData) {
            const items: User[] = Array.isArray(cloudData) ? cloudData.filter(Boolean) : Object.values(cloudData);
            for (const item of items) {
              if (item && item.id) {
                await dbUtil.updateItem(STORES.USERS, item);
              }
            }
          }
        }
      } catch (e) {}
      await pullStore(STORES.USERS);
    }

    const users = await userService.getAll();
    
    // Check if any user exists
    if (users.length > 0) {
      // If users exist, only an admin can create new users via management
      if (user?.role !== 'admin') {
        throw new Error('A registered admin account already exists. Please log in with the administrator credentials.');
      }
    } else {
      // First user MUST be an admin
      if (role !== 'admin') {
        throw new Error('The initial registered account must be an Administrator.');
      }
    }

    if (users.some(u => u.email.trim().toLowerCase() === normalizedEmail)) {
      throw new Error('This email address is already registered. Please log in instead.');
    }

    const hashedPassword = await hashPassword(password);
    const businessId = 'main_config'; // Default business ID
    const newUser: User = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: hashedPassword,
      role,
      businessId,
      assignedBranchIds: [], // Admins have access to all
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await userService.create(newUser);

    // Direct immediate upload to Firebase Realtime Database
    if (typeof window !== 'undefined' && window.navigator.onLine) {
      try {
        const rawUrl = getFirebaseRtdbUrl();
        const BASE_URL = rawUrl.replace(/\/$/, '');
        await fetch(`${BASE_URL}/users/${newUser.id}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });
      } catch (err) {
        console.warn('[Auth] Direct cloud push on signup notice:', err);
      }
    }

    await processQueue();
    await auditService.log('USER_SIGNUP', `User ${normalizedEmail} signed up as ${role}`, normalizedEmail);
    
    // Auto login after signup if it's the first user
    if (users.length === 0) {
      const { passwordHash, ...userWithoutPassword } = newUser;
      setUser(userWithoutPassword);
      localStorage.setItem('pos-user-id', newUser.id);
      
      if (typeof window !== 'undefined' && window.navigator.onLine) {
        await pullSync();
      }
      router.push('/');
    }
  };

  const logout = () => {
    if (user) {
      auditService.log('USER_LOGOUT', `User ${user.email} logged out`, user.email);
    }
    setUser(null);
    localStorage.removeItem('pos-user-id');
    router.push('/login');
  };

  const value = {
    user,
    login,
    signup,
    logout,
    isAdmin: user?.role === 'admin',
    isCashier: user?.role === 'cashier',
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

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
        // Pull latest users and store info from Firebase Cloud on initial app load
        if (typeof window !== 'undefined' && window.navigator.onLine) {
          await pullStore(STORES.USERS);
          await pullStore(STORES.STORE_INFO);
        }

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
    };
    
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Fetch latest user credentials directly from Firebase Cloud first so other devices can log in instantly
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
      } catch (cloudErr) {
        console.warn('[Auth] Direct cloud user fetch notice:', cloudErr);
      }
      await pullStore(STORES.USERS);
    }

    const users = await userService.getAll();
    const foundUser = users.find(u => u.email.trim().toLowerCase() === normalizedEmail);
    
    if (!foundUser) {
      if (users.length === 0) {
        throw new Error('Walang nakitang user account sa cloud database. Siguraduhing na-click ang Cloud Sync sa primary device kung saan ginawa ang account, o mag-Sign Up muna bilang Admin.');
      }
      throw new Error(`Walang nakitang account para sa "${email}". Pakisuri ang spelling ng email o mag-sync sa primary device.`);
    }

    const hashedPassword = await hashPassword(password);
    // Also allow raw password comparison as fallback in case a legacy record was saved without hash
    const isPasswordMatch = (foundUser.passwordHash === hashedPassword) || (foundUser.passwordHash === password);
    
    if (!isPasswordMatch) {
      throw new Error('Maling password. Pakisuri ang inyong password at subukan muli.');
    }

    const { passwordHash, ...userWithoutPassword } = foundUser;
    setUser(userWithoutPassword);
    localStorage.setItem('pos-user-id', foundUser.id);

    // 2. Automatically pull ALL store data from Firebase Cloud immediately upon login
    try {
      if (typeof window !== 'undefined' && window.navigator.onLine) {
        await pullSync();
        await processQueue();
      }
    } catch (syncErr) {
      console.warn('[CloudSync] Post-login sync warning:', syncErr);
    }

    await auditService.log('USER_LOGIN', `User ${foundUser.email} logged in`, foundUser.email);
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
        throw new Error('Mayroon nang registered admin account sa system. Mangyaring mag-log in na lamang gamit ang admin account.');
      }
    } else {
      // First user MUST be an admin
      if (role !== 'admin') {
        throw new Error('Ang unang account na gagawin ay dapat Administrator.');
      }
    }

    if (users.some(u => u.email.trim().toLowerCase() === normalizedEmail)) {
      throw new Error('Naka-rehistro na ang email na ito. Mag-log in na lamang.');
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

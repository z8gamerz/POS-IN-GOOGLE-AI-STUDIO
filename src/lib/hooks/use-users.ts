'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, STORES } from '@/lib/db/idb';
import { useAuth } from '@/lib/contexts/auth-context';
import { userService } from '@/lib/services/user-service';
import { auditService } from '@/lib/services/audit-service';
import { pullStore, processQueue, getFirebaseRtdbUrl } from '@/lib/db/sync-queue';

export function useUsers() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<Omit<User, 'passwordHash'>[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!currentUser || !isAdmin) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.navigator.onLine) {
        await pullStore(STORES.USERS);
      }
      const allUsers = await userService.getAll();
      // Remove passwordHash from the results and deduplicate by email/id
      const seenEmails = new Set<string>();
      const safeUsers: Omit<User, 'passwordHash'>[] = [];
      for (const { passwordHash, ...u } of allUsers) {
        const normEmail = u.email.trim().toLowerCase();
        if (!seenEmails.has(normEmail)) {
          seenEmails.add(normEmail);
          safeUsers.push(u);
        }
      }
      
      setUsers(safeUsers.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUserBranches = async (userId: string, branchIds: string[]) => {
    if (!isAdmin) return;

    try {
      const userData = await userService.getById(userId);
      if (!userData) throw new Error('User not found');

      const updatedUser: User = {
        ...userData,
        assignedBranchIds: branchIds,
        updatedAt: Date.now(),
      };

      await userService.update(updatedUser);
      if (typeof window !== 'undefined' && window.navigator.onLine) {
        try {
          const rawUrl = getFirebaseRtdbUrl();
          const BASE_URL = rawUrl.replace(/\/$/, '');
          await fetch(`${BASE_URL}/users/${userId}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedUser)
          });
        } catch (e) {}
      }
      await auditService.log('USER_BRANCH_ASSIGNMENT', `Updated branch assignments for ${userData.email}`);
      await processQueue();
      await fetchUsers();
    } catch (error) {
      console.error('Failed to update user branches:', error);
      throw error;
    }
  };

  const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!isAdmin || !currentUser) return;

    try {
      const newUser: User = {
        ...userData,
        id: crypto.randomUUID(),
        businessId: currentUser.businessId || 'main_config',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await userService.create(newUser);
      if (typeof window !== 'undefined' && window.navigator.onLine) {
        try {
          const rawUrl = getFirebaseRtdbUrl();
          const BASE_URL = rawUrl.replace(/\/$/, '');
          await fetch(`${BASE_URL}/users/${newUser.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
          });
        } catch (e) {}
      }
      await auditService.log('USER_CREATED', `Created new user: ${userData.email}`);
      await processQueue();
      await fetchUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  };

  const updateUser = async (userId: string, data: Partial<Omit<User, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>>) => {
    if (!isAdmin) return;

    try {
      const existingUser = await userService.getById(userId);
      if (!existingUser) throw new Error('User not found');

      const updatedUser: User = {
        ...existingUser,
        ...data,
        updatedAt: Date.now(),
      };

      await userService.update(updatedUser);
      if (typeof window !== 'undefined' && window.navigator.onLine) {
        try {
          const rawUrl = getFirebaseRtdbUrl();
          const BASE_URL = rawUrl.replace(/\/$/, '');
          await fetch(`${BASE_URL}/users/${updatedUser.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedUser)
          });
        } catch (e) {}
      }
      await auditService.log('USER_UPDATED', `Updated user: ${existingUser.email}`);
      await processQueue();
      await fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    if (!isAdmin || userId === currentUser?.id) return;

    try {
      const existingUser = await userService.getById(userId);
      if (!existingUser) throw new Error('User not found');

      await userService.delete(userId);
      if (typeof window !== 'undefined' && window.navigator.onLine) {
        try {
          const rawUrl = getFirebaseRtdbUrl();
          const BASE_URL = rawUrl.replace(/\/$/, '');
          await fetch(`${BASE_URL}/users/${userId}.json`, {
            method: 'DELETE'
          });
        } catch (e) {}
      }
      await auditService.log('USER_DELETED', `Deleted user: ${existingUser.email}`);
      await processQueue();
      await fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  };

  return {
    users,
    loading,
    createUser,
    updateUser,
    updateUserBranches,
    deleteUser,
    refresh: fetchUsers,
  };
}

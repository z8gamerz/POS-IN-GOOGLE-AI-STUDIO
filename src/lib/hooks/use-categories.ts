'use client';

import { useState, useEffect, useCallback } from 'react';
import { Category } from '@/lib/db/idb';
import { categoryService } from '@/lib/services/category-service';
import { auditService } from '@/lib/services/audit-service';

const DEFAULT_CATEGORIES = ['Drinks', 'Snacks', 'Canned Goods', 'Essentials', 'Others'];

export function useCategories(branchId?: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!branchId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      let data = await categoryService.getByBranch(branchId);
      
      // Auto-seed default categories if none exist for this branch
      if (data.length === 0) {
        const now = Date.now();
        const seeded: Category[] = [];
        for (const name of DEFAULT_CATEGORIES) {
          const catId = crypto.randomUUID();
          const newCat: Category = {
            id: catId,
            name,
            branchId,
            createdAt: now,
            updatedAt: now,
            isDeleted: false,
          };
          await categoryService.create(newCat);
          seeded.push(newCat);
        }
        data = seeded;
        try {
          await auditService.log('CATEGORIES_AUTO_SEED', JSON.stringify({ branchId, count: seeded.length }));
        } catch (e) {
          console.warn('Failed to log audit:', e);
        }
      }
      
      setCategories(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (name: string) => {
    if (!branchId) throw new Error('Branch ID is required to add a category');
    const id = crypto.randomUUID();
    const now = Date.now();
    const newCategory: Category = {
      id,
      name: name.trim(),
      branchId,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    await categoryService.create(newCategory);
    try {
      await auditService.log('CATEGORY_ADD', JSON.stringify({ name, id }));
    } catch (e) {
      console.warn('Failed to log audit:', e);
    }
    await fetchCategories();
    return newCategory;
  };

  const updateCategory = async (category: Category) => {
    await categoryService.update(category);
    try {
      await auditService.log('CATEGORY_EDIT', JSON.stringify({ name: category.name, id: category.id }));
    } catch (e) {
      console.warn('Failed to log audit:', e);
    }
    await fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    await categoryService.delete(id);
    try {
      await auditService.log('CATEGORY_DELETE', JSON.stringify({ id }));
    } catch (e) {
      console.warn('Failed to log audit:', e);
    }
    await fetchCategories();
  };

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    refresh: fetchCategories,
  };
}

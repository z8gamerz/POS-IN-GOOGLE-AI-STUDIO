'use client';

import { useState } from 'react';
import { useCategories } from '@/lib/hooks/use-categories';
import { X, Plus, Edit2, Trash2, Save, Undo2, FolderOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { Category } from '@/lib/db/idb';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
}

export function CategoryModal({ isOpen, onClose, branchId }: CategoryModalProps) {
  const { categories, addCategory, updateCategory, deleteCategory, loading } = useCategories(branchId);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsAdding(true);
    try {
      await addCategory(newCategoryName);
      setNewCategoryName('');
    } catch (err) {
      console.error('Failed to add category:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleStartEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const handleSaveEdit = async (category: Category) => {
    if (!editingName.trim()) return;
    try {
      await updateCategory({
        ...category,
        name: editingName.trim(),
      });
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this category? Products currently assigned to this category will keep their category name but you will not be able to assign new products to it unless recreated.')) {
      try {
        await deleteCategory(id);
      } catch (err) {
        console.error('Failed to delete category:', err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col h-[550px]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl text-white">
              <FolderOpen className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Manage Categories
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Add Form */}
        <div className="px-8 pt-6 pb-4 border-b border-gray-50">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              required
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Fresh Produce, Canned Goods"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm font-medium"
            />
            <button
              type="submit"
              disabled={isAdding}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-orange-100 transition-all active:scale-95 disabled:opacity-50 text-sm whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </form>
        </div>

        {/* List of Categories */}
        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin border-4 border-orange-200 border-t-orange-600 rounded-full w-8 h-8 mb-2" />
              <p className="text-gray-400 text-xs">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No categories found. Add some above.
            </div>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100/70 border border-gray-100 transition-all"
              >
                {editingId === category.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-4">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-1 focus:ring-orange-500 outline-none bg-white text-sm font-medium"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(category)}
                      className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors cursor-pointer"
                      title="Save"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors cursor-pointer"
                      title="Cancel"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-gray-800 text-sm">{category.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(category)}
                        className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-500 hover:text-gray-900 cursor-pointer"
                        title="Edit name"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category.id)}
                        className="p-2 hover:bg-red-50 rounded-xl transition-colors text-gray-400 hover:text-red-600 cursor-pointer"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

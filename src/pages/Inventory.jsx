import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import ProductModal from '../components/inventory/ProductModal';
import { useFirestore } from '../hooks/useFirestore';
import ErrorAlert from '../components/common/ErrorAlert';
import { useAuth } from '../context/AuthContext';

const Inventory = () => {
    // Remove orderBy to avoid Index Required error on products
    const { data: products, loading, error } = useFirestore('products');
    const { currentShop } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const handleSave = async (productData) => {
        if (!currentShop) {
            toast.error("Shop information missing. Please refresh or relogin.");
            return;
        }

        setActionLoading(true);
        try {
            if (editingProduct) {
                await updateDoc(doc(db, "products", editingProduct.id), productData);
                toast.success("Product updated successfully");
            } else {
                await addDoc(collection(db, "products"), {
                    ...productData,
                    shopId: currentShop.id, // Scope to current shop
                    createdAt: new Date().toISOString()
                });
                toast.success("Product added successfully");
            }
            setIsModalOpen(false);
            setEditingProduct(null);
        } catch (error) {
            console.error("Error saving product:", error);
            toast.error("Failed to save product");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await deleteDoc(doc(db, "products", id));
                toast.success("Product deleted");
            } catch (error) {
                toast.error("Failed to delete product");
            }
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Package className="w-8 h-8 text-indigo-600" />
                    Inventory Management
                </h2>
                <Button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                </Button>
            </div>

            {error && <ErrorAlert error={error} />}

            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -tranneutral-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search by name or category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-50 dark:bg-neutral-900/50 text-neutral-500 dark:text-neutral-400 text-sm uppercase tracking-wider">
                                <th className="p-4 font-medium">Product Name</th>
                                <th className="p-4 font-medium">Category</th>
                                <th className="p-4 font-medium">Expiry Date</th>
                                <th className="p-4 font-medium">Price</th>
                                <th className="p-4 font-medium">Stock</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {loading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-neutral-500">Loading inventory...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-neutral-500">No products found</td></tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
                                        <td className="p-4 font-medium text-neutral-900 dark:text-white">{product.name}</td>
                                        <td className="p-4 text-neutral-600 dark:text-neutral-300">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-neutral-500 font-mono text-sm">{product.expiryDate}</td>
                                        <td className="p-4 text-neutral-900 dark:text-white font-medium">₹{Number(product.price).toFixed(2)}</td>
                                        <td className="p-4">
                                            <span className={`font-medium ${product.stock < 10 ? 'text-red-500' : 'text-green-500'}`}>
                                                {product.stock} units
                                            </span>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button
                                                onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingProduct(null); }}
                onSave={handleSave}
                product={editingProduct}
                isLoading={actionLoading}
            />
        </div>
    );
};

export default Inventory;

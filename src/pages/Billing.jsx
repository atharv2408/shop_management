import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, FileText, Plus, Minus } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, writeBatch, doc, increment, addDoc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { generateInvoice } from '../lib/invoice';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useFirestore } from '../hooks/useFirestore';
import ErrorAlert from '../components/common/ErrorAlert';
import { useAuth } from '../context/AuthContext';
import { serverTimestamp, getDoc } from 'firebase/firestore';

const Billing = () => {
    // Remove orderBy from these hooks to avoid "Index Required" errors for simple lists
    const { data: products, loading, error } = useFirestore('products');
    const { data: customers } = useFirestore('customers');

    // Check orders with index because we really need the limit(10) for performance
    const { data: recentOrders } = useFirestore('orders', [orderBy('createdAt', 'desc'), limit(10)]);

    const { currentShop } = useAuth();
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [customerSearch, setCustomerSearch] = useState(''); // Search for customer
    const [selectedCustomer, setSelectedCustomer] = useState(null); // Selected customer obj
    const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' or 'credit'
    const [discount, setDiscount] = useState(0);
    const [showCustomerList, setShowCustomerList] = useState(false);
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [activeTab, setActiveTab] = useState('products'); // 'products' or 'cart' for mobile

    const handleCreateCustomer = async () => {
        if (!newCustomerName.trim()) return toast.error("Name is required");
        if (!currentShop) return toast.error("Shop info missing");

        try {
            const docRef = await addDoc(collection(db, 'customers'), {
                name: newCustomerName,
                phone: newCustomerPhone,
                shopId: currentShop.id,
                totalDue: 0,
                createdAt: new Date().toISOString()
            });

            const newCustomer = {
                id: docRef.id,
                name: newCustomerName,
                phone: newCustomerPhone,
                totalDue: 0
            };

            setSelectedCustomer(newCustomer);
            setCustomerSearch(newCustomerName);
            setIsCreatingCustomer(false);
            setShowCustomerList(false);
            setNewCustomerName('');
            setNewCustomerPhone('');
            toast.success("Customer created and selected!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to create customer");
        }
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) {
                    toast.error("Out of stock!");
                    return prev;
                }
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta;
                if (newQty < 1) return item;
                if (newQty > item.stock) {
                    toast.error("Max stock reached");
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = Math.max(0, subtotal - discount);


    // Filter and Sort customers client-side
    const filteredCustomers = customers
        .filter(c =>
            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            (c.phone && c.phone.includes(customerSearch))
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error("Cart is empty");
        if (!currentShop) return toast.error("Shop info missing");
        if (paymentMode === 'credit' && !selectedCustomer) return toast.error("Select a customer for Pay Later");

        const toastId = toast.loading("Processing checkout...");
        try {
            const batch = writeBatch(db);

            // 1. Update Stock
            cart.forEach(item => {
                const productRef = doc(db, "products", item.id);
                batch.update(productRef, {
                    stock: increment(-item.quantity)
                });
            });

            // 2. Handle Pay Later (Update Customer Due & Create Transaction)
            if (paymentMode === 'credit' && selectedCustomer) {
                const customerRef = doc(db, "customers", selectedCustomer.id);

                // Increment total due
                batch.update(customerRef, {
                    totalDue: increment(total)
                });

                // Create Transaction Record
                const transactionRef = doc(collection(db, `customers/${selectedCustomer.id}/transactions`));
                batch.set(transactionRef, {
                    type: 'credit', // 'credit' = debt added
                    amount: total,
                    note: 'Purchase Invoice',
                    items: cart.map(i => `${i.quantity}x ${i.name}`).join(', '),
                    cartItems: cart, // Store detailed items for history
                    createdAt: serverTimestamp(),
                    date: new Date().toISOString()
                });
            }

            // 3. Create Order
            const orderRef = doc(collection(db, "orders"));
            batch.set(orderRef, {
                items: cart,
                total: total,
                subtotal: subtotal,
                discount: Number(discount),
                customerName: selectedCustomer ? selectedCustomer.name : customerSearch,
                customerId: selectedCustomer ? selectedCustomer.id : null,
                paymentMode: paymentMode,
                shopId: currentShop.id,
                createdAt: new Date().toISOString()
            });

            await batch.commit();

            // Capture data for invoice before clearing state
            const invoiceCart = [...cart];
            const invoiceTotal = total;
            const invoiceDiscount = Number(discount);
            const invoiceCustomerName = selectedCustomer ? selectedCustomer.name : customerSearch;

            toast.success(
                (t) => (
                    <div className="flex flex-col gap-2">
                        <span>Order processed successfully!</span>
                        <button
                            onClick={() => {
                                generateInvoice(invoiceCart, invoiceTotal, invoiceDiscount, invoiceCustomerName);
                                toast.dismiss(t.id);
                            }}
                            className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition-colors"
                        >
                            Download Invoice
                        </button>
                    </div>
                ),
                { id: toastId, duration: 5000 }
            );

            setCart([]);
            setCustomerSearch('');
            setSelectedCustomer(null);
            setPaymentMode('cash');
            setDiscount(0);
        } catch (error) {
            console.error(error);
            toast.error("Failed to process checkout", { id: toastId });
        }
    };

    const filteredProducts = products
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] lg:h-[calc(100vh-100px)] relative">
            {error && <div className="col-span-full"><ErrorAlert error={error} /></div>}

            {/* Product Grid - Hidden on mobile if tab is cart */}
            <div className={`flex-1 flex flex-col gap-4 ${activeTab === 'cart' ? 'hidden lg:flex' : 'flex'}`}>
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -tranneutral-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 pb-20 lg:pb-0">
                    {filteredProducts.map(product => (
                        <div
                            key={product.id}
                            onClick={() => addToCart(product)}
                            className="bg-white dark:bg-neutral-800 p-3 lg:p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:shadow-md hover:border-indigo-500 transition-all group flex flex-col"
                        >
                            <div className="aspect-video lg:h-24 bg-neutral-100 dark:bg-neutral-700 rounded-lg mb-3 flex items-center justify-center shrink-0">
                                <span className="text-xl lg:text-2xl font-bold text-neutral-300 dark:text-neutral-600">
                                    {product.name.substring(0, 2).toUpperCase()}
                                </span>
                            </div>
                            <h3 className="font-medium text-neutral-900 dark:text-white truncate text-sm lg:text-base">{product.name}</h3>
                            <div className="flex justify-between items-center mt-auto pt-2">
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm lg:text-base">₹{product.price}</span>
                                <span className="text-[10px] lg:text-xs text-neutral-500">{product.stock} left</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Floating Cart Button for Mobile */}
            {activeTab === 'products' && cart.length > 0 && (
                <div className="lg:hidden fixed bottom-16 left-0 right-0 p-4 z-40">
                    <button
                        onClick={() => setActiveTab('cart')}
                        className="w-full bg-indigo-600 text-white p-4 rounded-xl shadow-xl flex items-center justify-between animate-in slide-in-from-bottom"
                    >
                        <div className="flex items-center gap-2">
                            <span className="bg-white/20 px-2 py-1 rounded-lg text-xs font-bold">{cart.length} items</span>
                            <span className="font-medium">View Cart</span>
                        </div>
                        <span className="font-bold text-lg">₹{total.toFixed(2)}</span>
                    </button>
                </div>
            )}

            {/* Cart Sidebar - Show on mobile only if activeTab is cart */}
            <div className={`w-full lg:w-96 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 flex flex-col h-full lg:flex ${activeTab === 'products' ? 'hidden' : 'flex'}`}>
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Mobile Back Button */}
                        <button onClick={() => setActiveTab('products')} className="lg:hidden p-1 -ml-2 mr-1">
                            <Search className="w-5 h-5 text-neutral-500" />
                        </button>
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            Current Order
                        </h2>
                    </div>
                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full text-xs font-bold">
                        {cart.length} Items
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                            <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
                            <p>Cart is empty</p>
                            <button onClick={() => setActiveTab('products')} className="mt-4 text-indigo-600 text-sm font-medium lg:hidden">
                                Add Items
                            </button>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg">
                                <div className="flex-1">
                                    <h4 className="font-medium text-neutral-900 dark:text-white text-sm">{item.name}</h4>
                                    <p className="text-xs text-neutral-500">₹{item.price} x {item.quantity}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded">
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                                <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-500 p-1">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 space-y-4 pb-24 lg:pb-4">
                    <div className="relative">
                        <label className="text-xs font-semibold text-neutral-500 mb-1 block">Customer</label>
                        {selectedCustomer ? (
                            <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800">
                                <span className="font-medium text-indigo-700 dark:text-indigo-300">{selectedCustomer.name}</span>
                                <button onClick={() => setSelectedCustomer(null)} className="text-xs text-red-500 hover:underline">Change</button>
                            </div>
                        ) : (
                            <>
                                <Input
                                    placeholder="Search or Enter Name"
                                    value={customerSearch}
                                    onChange={(e) => {
                                        setCustomerSearch(e.target.value);
                                        setShowCustomerList(true);
                                    }}
                                    onFocus={() => setShowCustomerList(true)}
                                    // onBlur={() => setTimeout(() => setShowCustomerList(false), 200)} // Delay for click
                                    className="text-sm"
                                />
                                {showCustomerList && customerSearch && (
                                    <div className="absolute w-full z-10 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto bottom-full mb-1">
                                        {isCreatingCustomer ? (
                                            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 sticky top-0">
                                                <h4 className="text-xs font-bold text-neutral-500 mb-2 uppercase">New Customer</h4>
                                                <Input
                                                    placeholder="Name"
                                                    value={newCustomerName}
                                                    onChange={e => setNewCustomerName(e.target.value)}
                                                    className="mb-2 text-sm"
                                                    autoFocus
                                                />
                                                <Input
                                                    placeholder="Phone (Optional)"
                                                    value={newCustomerPhone}
                                                    onChange={e => setNewCustomerPhone(e.target.value)}
                                                    className="mb-2 text-sm"
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <Button size="sm" variant="ghost" onClick={() => setIsCreatingCustomer(false)}>Cancel</Button>
                                                    <Button size="sm" onClick={handleCreateCustomer}>Save</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div
                                                    onClick={() => {
                                                        setNewCustomerName(customerSearch);
                                                        setIsCreatingCustomer(true);
                                                    }}
                                                    className="p-2 border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer flex items-center gap-2 text-indigo-600 dark:text-indigo-400"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Add "{customerSearch}"</span>
                                                </div>
                                                {filteredCustomers.map(c => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => {
                                                            setSelectedCustomer(c);
                                                            setCustomerSearch(c.name);
                                                            setShowCustomerList(false);
                                                        }}
                                                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer text-sm"
                                                    >
                                                        <div className="font-medium">{c.name}</div>
                                                        <div className="text-xs text-neutral-500">{c.phone}</div>
                                                    </div>
                                                ))}
                                                {filteredCustomers.length === 0 && (
                                                    <div className="p-4 text-center text-xs text-neutral-400">
                                                        No matches found
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                        {showCustomerList && !isCreatingCustomer && <div className="fixed inset-0 z-0" onClick={() => setShowCustomerList(false)}></div>}
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-neutral-500 mb-2 block">Payment Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setPaymentMode('cash')}
                                className={`py-2 rounded-lg text-sm font-medium transition-colors border ${paymentMode === 'cash'
                                    ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400'
                                    }`}
                            >
                                Cash / Paid
                            </button>
                            <button
                                onClick={() => setPaymentMode('credit')}
                                className={`py-2 rounded-lg text-sm font-medium transition-colors border ${paymentMode === 'credit'
                                    ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400'
                                    }`}
                            >
                                Pay Later
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-600 dark:text-neutral-400">Subtotal</span>
                        <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-600 dark:text-neutral-400">Discount</span>
                        <input
                            type="number"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                            className="w-20 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent text-right outline-none focus:border-indigo-500"
                        />
                    </div>
                    <div className="flex items-center justify-between text-lg font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span>Total</span>
                        <span>₹{total.toFixed(2)}</span>
                    </div>

                    <Button onClick={handleCheckout} className="w-full" disabled={cart.length === 0}>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Invoice
                    </Button>
                </div>
            </div>

            {/* Recent Orders Side Panel - Hidden on Mobile */}
            <div className="w-full lg:w-64 bg-white dark:bg-neutral-800 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-700 flex flex-col hidden xl:flex">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Recent Orders</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {recentOrders ? recentOrders.map(order => (
                        <div key={order.id} className="p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-neutral-100 dark:border-neutral-700 text-sm">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-neutral-900 dark:text-white truncate max-w-[100px]">{order.customerName}</span>
                                <span className={`font-medium ${order.paymentMode === 'credit' ? 'text-red-500' : 'text-green-500'}`}>
                                    ₹{order.total}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs text-neutral-500">
                                <span>{order.items.length} items</span>
                                <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center text-neutral-400 py-4 text-sm">No recent orders</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Billing;

import React, { useState } from 'react';
import { Users, FileText, Plus, Search } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { orderBy } from 'firebase/firestore';
import ErrorAlert from '../components/common/ErrorAlert';
import CustomerList from '../components/paylater/CustomerList';
import CustomerDetails from '../components/paylater/CustomerDetails';
import PayLaterReports from '../components/paylater/PayLaterReports';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

const PayLater = () => {
    // Remove orderBy to avoid Index Required error
    const { data: customers, loading, error } = useFirestore('customers');
    const { currentShop } = useAuth();
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm))
    ).sort((a, b) => a.name.localeCompare(b.name));

    const handleCreateCustomer = async () => {
        if (!newCustomerName.trim()) return toast.error("Name is required");
        if (!currentShop) return toast.error("Shop information missing. Please try again.");

        try {
            await addDoc(collection(db, 'customers'), {
                name: newCustomerName,
                phone: newCustomerPhone,
                shopId: currentShop.id,
                totalDue: 0,
                createdAt: new Date().toISOString()
            });
            toast.success("Customer created!");
            setIsCreating(false);
            setNewCustomerName('');
            setNewCustomerPhone('');
        } catch (err) {
            console.error(err);
            toast.error("Failed to create customer");
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] lg:h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Left Sidebar: Customer List */}
            <div className={`w-full lg:w-1/3 bg-white dark:bg-neutral-800 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-700 flex flex-col ${selectedCustomer ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Customers
                        </h2>
                        <Button size="sm" onClick={() => setIsCreating(!isCreating)}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    {isCreating && (
                        <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg space-y-2 animate-in slide-in-from-top-2">
                            <Input
                                placeholder="Name"
                                value={newCustomerName}
                                onChange={e => setNewCustomerName(e.target.value)}
                                autoFocus
                            />
                            <Input
                                placeholder="Phone (Optional)"
                                value={newCustomerPhone}
                                onChange={e => setNewCustomerPhone(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                                <Button size="sm" onClick={handleCreateCustomer}>Save</Button>
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Placeholder for CustomerList component if I were to separate it, but keeping inline for now or will implement separated next */}
                    <CustomerList
                        customers={filteredCustomers}
                        selectedId={selectedCustomer?.id}
                        onSelect={setSelectedCustomer}
                    />
                </div>
            </div>



            {/* Right Side: Customer Details & Transactions or Reports */}
            <div className={`flex-1 bg-white dark:bg-neutral-800 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-700 overflow-hidden ${selectedCustomer ? 'flex' : 'hidden lg:flex'}`}>
                {selectedCustomer ? (
                    <CustomerDetails
                        customer={selectedCustomer}
                        onBack={() => setSelectedCustomer(null)}
                    />
                ) : (
                    <PayLaterReports customers={customers} />
                )}
            </div>
        </div>
    );
};

export default PayLater;

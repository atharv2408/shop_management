import React, { useState, useEffect } from 'react';
// import { useFirestore } from '../../hooks/useFirestore';
import { collection, addDoc, serverTimestamp, runTransaction, doc, orderBy, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Phone, Calendar, Plus, CreditCard, ArrowDownLeft, ArrowUpRight, ArrowLeft } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import { toast } from 'react-hot-toast';

const CustomerDetails = ({ customer, onBack }) => {
    // Custom fetch for transactions to avoid requiring 'shopId' on the transaction doc itself
    // (useFirestore hook automatically adds where('shopId', ...) which filters out existing transactions)
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Listen to real-time updates for the specific customer document
    const [currentCustomer, setCurrentCustomer] = useState(customer);

    useEffect(() => {
        // Update local state when prop changes to handle selection changes
        setCurrentCustomer(customer);

        const unsubCustomer = onSnapshot(doc(db, "customers", customer.id), (doc) => {
            if (doc.exists()) {
                setCurrentCustomer({ id: doc.id, ...doc.data() });
            }
        });

        // Transactions listener
        setLoading(true);
        const q = query(
            collection(db, `customers/${customer.id}/transactions`),
            orderBy('createdAt', 'desc')
        );

        const unsubTransactions = onSnapshot(q, (snapshot) => {
            setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => {
            unsubCustomer();
            unsubTransactions();
        };
    }, [customer.id]);

    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    const handleTransaction = async (transactionMode) => {
        if (!amount || isNaN(amount) || Number(amount) <= 0) return toast.error("Invalid amount");

        const val = Number(amount);
        const isPayment = transactionMode === 'payment';

        try {
            await runTransaction(db, async (transaction) => {
                const customerRef = doc(db, "customers", currentCustomer.id);
                const customerDoc = await transaction.get(customerRef);

                if (!customerDoc.exists()) throw "Customer does not exist!";

                const newTotalDue = isPayment
                    ? customerDoc.data().totalDue - val
                    : customerDoc.data().totalDue + val;

                // Update customer total
                transaction.update(customerRef, { totalDue: newTotalDue });

                // Create transaction record
                const newTransactionRef = doc(collection(db, `customers/${currentCustomer.id}/transactions`));
                transaction.set(newTransactionRef, {
                    type: isPayment ? 'payment' : 'credit',
                    amount: val,
                    note: note || (isPayment ? 'Payment Received' : 'Manual Charge'),
                    createdAt: serverTimestamp(), // Use server timestamp
                    date: new Date().toISOString() // For easier frontend display if needed immediately
                });
            });

            toast.success("Transaction successful");
            setAmount('');
            setNote('');
        } catch (error) {
            console.error(error);
            toast.error("Transaction failed");
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
                <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                        {onBack && (
                            <button onClick={onBack} className="lg:hidden p-1 -mt-1 -ml-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                                <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{customer.name}</h2>
                            <div className="flex items-center gap-4 mt-2 text-neutral-600 dark:text-neutral-400 text-sm">
                                <span className="flex items-center gap-1">
                                    <Phone className="w-4 h-4" /> {customer.phone || 'N/A'}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" /> Joined {new Date(customer.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-neutral-500 mb-1">Total Due</div>
                        <div className={`text-3xl font-bold ${currentCustomer.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{currentCustomer.totalDue?.toFixed(2) || '0.00'}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 flex gap-3">
                    <div className="flex-1 bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 flex gap-2">
                        <Input
                            type="number"
                            placeholder="Amount"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-32"
                        />
                        <Input
                            placeholder="Note (Optional)"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="flex-1"
                        />
                        <div className="flex gap-2">
                            <Button
                                onClick={() => handleTransaction('payment')}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={!amount}
                            >
                                <ArrowDownLeft className="w-4 h-4 mr-2" />
                                Pay
                            </Button>
                            <Button
                                onClick={() => handleTransaction('credit')}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={!amount}
                            >
                                <ArrowUpRight className="w-4 h-4 mr-2" />
                                Add Due
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-lg font-bold mb-4 px-2">Transaction History</h3>
                <div className="space-y-3">
                    {transactions.map(t => (
                        <div key={t.id} className="flex items-center gap-4 p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 shadow-sm">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'payment'
                                ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                }`}>
                                {t.type === 'payment' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-neutral-900 dark:text-white capitalize">{t.note || t.type}</h4>
                                <p className="text-xs text-neutral-500">
                                    {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleString() : new Date(t.date).toLocaleString()}
                                </p>
                                {t.cartItems && (
                                    <div className="mt-2 pl-3 border-l-2 border-neutral-200 dark:border-neutral-600 max-h-32 overflow-y-auto">
                                        {t.cartItems.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                                                <span>{item.quantity}x {item.name}</span>
                                                <span>₹{item.quantity * item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span className={`font-bold ${t.type === 'payment' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {t.type === 'payment' ? '-' : '+'}₹{t.amount}
                            </span>
                        </div>
                    ))}
                    {transactions.length === 0 && (
                        <div className="text-center text-neutral-500 py-10">
                            No transactions yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerDetails;

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export const useFirestore = (collectionName, constraints = []) => {
    const { currentShop } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!currentShop?.id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        // Automatically scope to shopId
        const q = query(collection(db, collectionName), where('shopId', '==', currentShop.id), ...constraints);

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const documents = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setData(documents);
                setLoading(false);
                setError(null);
            },
            (err) => {
                if (err.code === 'permission-denied') {
                    console.warn(`Access denied to ${collectionName}. Check Firestore rules.`);
                } else {
                    console.error(`Error fetching ${collectionName}:`, err);
                }
                setError(err);
                setLoading(false);
                toast.error(`Failed to sync ${collectionName}`);
            }
        );

        return () => unsubscribe();
    }, [collectionName, JSON.stringify(constraints), currentShop?.id]); // Re-run when shop changes

    return { data, loading, error };
};

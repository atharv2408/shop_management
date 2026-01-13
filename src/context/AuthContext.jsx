import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, onSnapshot, deleteDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null); // 'admin' | 'staff'
    const [currentShop, setCurrentShop] = useState(null); // { id, name }
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let profileUnsubscribe;

        const authUnsubscribe = onAuthStateChanged(auth, (user) => {
            // Cleanup previous profile listener if any
            if (profileUnsubscribe) {
                profileUnsubscribe();
                profileUnsubscribe = null;
            }

            if (user) {
                setCurrentUser(user);

                // Check for pending invitations (Auto-Join)
                // This handles cases where an existing user is invited to a new shop
                const checkInvite = async () => {
                    try {
                        const inviteRef = doc(db, "invitations", user.email.toLowerCase());
                        const inviteSnap = await getDoc(inviteRef);
                        if (inviteSnap.exists()) {
                            const inviteData = inviteSnap.data();
                            // Update user profile to join the new shop
                            await setDoc(doc(db, "users", user.uid), {
                                shopId: inviteData.shopId,
                                shopName: inviteData.shopName,
                                role: inviteData.role || 'staff',
                                email: user.email // ensure email is synced
                            }, { merge: true });

                            // Clean up invitation
                            await deleteDoc(inviteRef);
                            toast.success(`Welcome to ${inviteData.shopName}!`);
                        }
                    } catch (err) {
                        console.error("Error checking invites:", err);
                    }
                };
                checkInvite();

                // Subscribe to user profile changes
                profileUnsubscribe = onSnapshot(doc(db, "users", user.uid),
                    async (docSnapshot) => {
                        if (docSnapshot.exists()) {
                            const userData = docSnapshot.data();
                            setUserRole(userData.role);
                            if (userData.shopId) {
                                setCurrentShop({ id: userData.shopId, name: userData.shopName });
                            } else {
                                // Profile exists but no shop? Repair.
                                console.warn("Profile exists but missing shop info. Repairing...");
                                await repairUserProfile(user);
                            }
                        } else {
                            // Profile doesn't exist yet (or deleted).
                            // This shouldn't persist for long. Repair immediately.
                            console.warn("User profile missing. Attempting repair...");
                            await repairUserProfile(user);

                            // Defaulting effectively, but listener stays active for when it appears!
                            setUserRole('staff');
                        }
                        setLoading(false);
                    },
                    (error) => {
                        console.error("Error fetching user role:", error);
                        if (error.code === 'permission-denied') {
                            console.warn("User profile access denied. Defaulting to 'staff'.");
                        }
                        setUserRole('staff');
                        setLoading(false);
                    }
                );
            } else {
                setCurrentUser(null);
                setUserRole(null);
                setCurrentShop(null);
                setLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            if (profileUnsubscribe) profileUnsubscribe();
        };
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = async () => {
        const result = await signInWithPopup(auth, googleProvider);
        try {
            // Check if user doc exists, if not create it
            const userDoc = await getDoc(doc(db, "users", result.user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", result.user.uid), {
                    email: result.user.email,
                    role: 'staff', // Default role
                    createdAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error("Firestore access failed:", error);
            // If Firestore fails (e.g. DB not created), we still allow login but warn
            if (error.code === 'unavailable' || error.message && error.message.includes('offline')) {
                console.warn("Firestore appears to be offline or not created. User role defaults to 'staff'.");
            } else {
                // We don't re-throw here to allow login to proceed even if DB write fails
                // But in a real app you might want to handle this differently
                console.error("Non-offline Firestore error:", error);
            }
        }
        return result;
    };

    const repairUserProfile = async (user) => {
        try {
            console.log("Attempting to repair user profile...");
            // 1. Check if they already own a shop
            const shopsQuery = query(collection(db, "shops"), where("ownerId", "==", user.uid));
            const shopSnapshot = await getDocs(shopsQuery);

            let shopId;
            let shopName;

            if (!shopSnapshot.empty) {
                // Found existing shop
                const shopDoc = shopSnapshot.docs[0];
                shopId = shopDoc.id;
                shopName = shopDoc.data().name;
                console.log("Found existing shop for user:", shopName);
            } else {
                // Create new shop
                console.log("Creating new shop for user...");
                const newShopRef = await addDoc(collection(db, "shops"), {
                    name: "My Shop",
                    ownerId: user.uid,
                    createdAt: new Date().toISOString(),
                    members: [user.uid]
                });
                shopId = newShopRef.id;
                shopName = "My Shop";
            }

            // 2. Update/Create User Profile
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: 'level1', // Default to admin-like role for owner
                shopId: shopId,
                shopName: shopName,
                createdAt: new Date().toISOString() // Or keep existing if merging
            }, { merge: true });

            console.log("User profile repaired successfully.");
            return { shopId, shopName };

        } catch (err) {
            console.error("Error repairing user profile:", err);
            return null;
        }
    };

    const signup = async (email, password, role = 'staff', shopName = 'My Shop') => {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        try {
            // 0. Check for Invitation
            const inviteRef = doc(db, "invitations", email.toLowerCase());
            const inviteSnap = await getDoc(inviteRef);

            let finalShopId;
            let finalShopName;

            if (inviteSnap.exists()) {
                const inviteData = inviteSnap.data();
                finalShopId = inviteData.shopId;
                finalShopName = inviteData.shopName;
                console.log("Found invitation for shop:", finalShopName);
            } else {
                // 1. Create the Shop (if no invite)
                const shopRef = await addDoc(collection(db, "shops"), {
                    name: shopName,
                    ownerId: result.user.uid,
                    createdAt: new Date().toISOString(),
                    members: [result.user.uid]
                });
                finalShopId = shopRef.id;
                finalShopName = shopName;
            }

            // 2. Create User Profile
            await setDoc(doc(db, "users", result.user.uid), {
                email,
                role,
                shopId: finalShopId,
                shopName: finalShopName,
                createdAt: new Date().toISOString()
            });

        } catch (error) {
            console.error("Error creating user profile/shop:", error);
        }
        return result;
    };

    const logout = () => {
        return signOut(auth);
    };

    const value = {
        currentUser,
        userRole,
        currentShop,
        login,
        loginWithGoogle,
        signup,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

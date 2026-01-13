import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { getAuthErrorMessage } from '../../lib/authErrors';

const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [shopName, setShopName] = useState(''); // New state
    const [loading, setLoading] = useState(false);
    const { signup, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return toast.error('Passwords do not match');
        }

        setLoading(true);
        try {
            // Pass shopName to signup function
            await signup(email, password, 'staff', shopName);
            toast.success('Account & Shop created successfully!');
            navigate('/dashboard');
        } catch (error) {
            const message = getAuthErrorMessage(error);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500 to-indigo-500 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl p-8 w-full max-w-md backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90"
            >
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Create Account</h2>
                    <p className="text-neutral-600 dark:text-neutral-400">Get started with Shop Inventory</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Shop Name"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="My Awesome Shop"
                        required
                    />
                    <Input
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                    <Input
                        label="Confirm Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />

                    <Button
                        type="submit"
                        variant="secondary"
                        className="w-full"
                        isLoading={loading}
                    >
                        Sign Up
                    </Button>
                </form>

                <div className="mt-4">
                    {/* Google Sign-in disabled for now to ensure Shop creation */}
                </div>

                <div className="mt-6 text-center">
                    <p className="text-slate-600 dark:text-slate-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-pink-600 hover:text-pink-500 font-medium">
                            Sign in
                        </Link>
                    </p>
                </div>
            </motion.div >
        </div >
    );
};

export default Signup;

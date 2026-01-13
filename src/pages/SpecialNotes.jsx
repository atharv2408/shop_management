import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, StickyNote } from 'lucide-react';
import { collection, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useFirestore } from '../hooks/useFirestore';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import ErrorAlert from '../components/common/ErrorAlert';

const SpecialNotes = () => {
    const { currentShop } = useAuth();
    const { data: notes, loading, error } = useFirestore('special_notes');

    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [itemsRequired, setItemsRequired] = useState('');

    const resetForm = () => {
        setTitle('');
        setAmount('');
        setItemsRequired('');
        setIsCreating(false);
        setEditingId(null);
    };

    const handleEdit = (note) => {
        setTitle(note.title);
        setAmount(note.amount);
        setItemsRequired(note.itemsRequired);
        setEditingId(note.id);
        setIsCreating(true);
    };

    const handleSave = async () => {
        if (!title.trim()) return toast.error("Title is required");
        if (!currentShop) return toast.error("Shop info missing");

        try {
            const noteData = {
                shopId: currentShop.id,
                title,
                amount: Number(amount) || 0,
                itemsRequired,
                updatedAt: serverTimestamp()
            };

            if (editingId) {
                await updateDoc(doc(db, 'special_notes', editingId), noteData);
                toast.success("Note updated");
            } else {
                await addDoc(collection(db, 'special_notes'), {
                    ...noteData,
                    createdAt: serverTimestamp()
                });
                toast.success("Note created");
            }
            resetForm();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save note");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this note?")) return;
        try {
            await deleteDoc(doc(db, 'special_notes', id));
            toast.success("Note deleted");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete note");
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] lg:h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <StickyNote className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    Special Notes
                </h1>
                {!isCreating && (
                    <Button onClick={() => setIsCreating(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Note
                    </Button>
                )}
            </div>

            {error && <ErrorAlert error={error} />}

            <div className="flex-1 overflow-y-auto">
                {isCreating && (
                    <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 mb-6 animate-in slide-in-from-top-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                                {editingId ? 'Edit Note' : 'New Special Note'}
                            </h3>
                            <button onClick={resetForm} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Occasion / Title"
                                    placeholder="e.g. Deepavali Sale"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                                <Input
                                    label="Expected / Actual Amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    Items Required / Notes
                                </label>
                                <textarea
                                    className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                                    placeholder="List items required for this occasion..."
                                    value={itemsRequired}
                                    onChange={e => setItemsRequired(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
                                <Button onClick={handleSave}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Note
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-24">
                    {notes
                        .sort((a, b) => {
                            const dateA = a.createdAt?.seconds || 0;
                            const dateB = b.createdAt?.seconds || 0;
                            return dateB - dateA;
                        })
                        .map(note => (
                            <div key={note.id} className="bg-white dark:bg-neutral-800 p-5 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow group relative">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-neutral-900 dark:text-white">{note.title}</h3>
                                        <span className="text-xs text-neutral-500">
                                            {note.createdAt?.seconds ? new Date(note.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-neutral-500">Amount</div>
                                        <div className="font-bold text-indigo-600 dark:text-indigo-400">₹{note.amount}</div>
                                    </div>
                                </div>

                                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap min-h-[80px] mb-8">
                                    {note.itemsRequired || <span className="text-neutral-400 italic">No notes added.</span>}
                                </div>

                                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(note)}
                                        className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(note.id)}
                                        className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}

                    {!loading && notes.length === 0 && !isCreating && (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 text-neutral-400 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
                            <StickyNote className="w-12 h-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">No special notes yet</p>
                            <p className="text-sm mb-4">Create a note to track sales and items for special occasions.</p>
                            <Button variant="outline" onClick={() => setIsCreating(true)}>
                                Create First Note
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpecialNotes;

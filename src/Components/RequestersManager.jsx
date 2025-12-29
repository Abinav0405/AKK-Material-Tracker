import React, { useState, useEffect } from 'react';
import { supabase } from "./supbase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function RequestersManager() {
    const [requesters, setRequesters] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ requester_id: '', name: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);

    const fetchRequesters = async () => {
        try {
            const { data, error } = await supabase
                .from('requesters')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setRequesters(data || []);
        } catch (error) {
            console.error('Error fetching requesters:', error);
            toast.error('Failed to load requesters');
        }
    };

    useEffect(() => {
        fetchRequesters();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.requester_id || !formData.name || (!editingId && !formData.password)) {
            toast.error('All fields are required');
            return;
        }

        setIsLoading(true);
        try {
            const requesterData = {
                requester_id: formData.requester_id,
                name: formData.name,
            };

            // If password is provided, update it (only for new or when changing password)
            if (formData.password) {
                // In a real app, you would hash the password before saving
                requesterData.password_hash = formData.password; // In production, use a proper hashing function
            }

            if (editingId) {
                const { error } = await supabase
                    .from('requesters')
                    .update(requesterData)
                    .eq('id', editingId);
                
                if (error) throw error;
                toast.success('Requester updated successfully');
            } else {
                const { error } = await supabase
                    .from('requesters')
                    .insert([requesterData]);
                
                if (error) throw error;
                toast.success('Requester added successfully');
            }

            setFormData({ requester_id: '', name: '', password: '' });
            setEditingId(null);
            fetchRequesters();
        } catch (error) {
            console.error('Error saving requester:', error);
            toast.error(error.message || 'Failed to save requester');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (requester) => {
        setEditingId(requester.id);
        setFormData({
            requester_id: requester.requester_id,
            name: requester.name,
            password: '' // Don't show existing password
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this requester? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('requesters')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            toast.success('Requester deleted successfully');
            fetchRequesters();
        } catch (error) {
            console.error('Error deleting requester:', error);
            toast.error('Failed to delete requester');
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({ requester_id: '', name: '', password: '' });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">
                        {editingId ? 'Edit Requester' : 'Add New Requester'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium leading-none mb-1 block">
                                    Requester ID
                                </label>
                                <Input
                                    name="requester_id"
                                    value={formData.requester_id}
                                    onChange={handleInputChange}
                                    placeholder="Enter requester ID"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium leading-none mb-1 block">
                                    Name
                                </label>
                                <Input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium leading-none mb-1 block">
                                    {editingId ? 'New Password (leave blank to keep current)' : 'Password'}
                                </label>
                                <Input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder={editingId ? 'Enter new password' : 'Enter password'}
                                    required={!editingId}
                                />
                            </div>
                        </div>
                        <div className="flex space-x-2 pt-2">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <span className="flex items-center">
                                        <span className="animate-spin mr-2">↻</span>
                                        {editingId ? 'Updating...' : 'Adding...'}
                                    </span>
                                ) : editingId ? (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Update Requester
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Requester
                                    </>
                                )}
                            </Button>
                            {editingId && (
                                <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Requesters List</CardTitle>
                </CardHeader>
                <CardContent>
                    {requesters.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No requesters found. Add one using the form above.
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Created At</TableHead>
                                        <TableHead className="w-32">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requesters.map((requester) => (
                                        <TableRow key={requester.id}>
                                            <TableCell className="font-medium">{requester.requester_id}</TableCell>
                                            <TableCell>{requester.name}</TableCell>
                                            <TableCell>
                                                {new Date(requester.created_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(requester)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(requester.id)}
                                                        className="text-red-500 border-red-200 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

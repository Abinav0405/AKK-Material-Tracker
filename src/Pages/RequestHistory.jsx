import React, { useState, useEffect } from 'react';
import { supabase } from "@/Components/supbase";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Badge } from "@/Components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/Components/ui/tabs";
import { 
    ArrowLeft, Search, Package, RotateCcw, 
    Calendar, Clock, User, Loader2, CheckCircle, XCircle, AlertCircle, Edit2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import MaterialForm from "@/Components/MaterialForm";

export default function RequestHistory() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [editingTransaction, setEditingTransaction] = useState(null);
    const queryClient = useQueryClient();

    const { data: transactions = [], isLoading } = useQuery({
        queryKey: ['transactions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1000);
            if (error) throw error;
            return data || [];
        },
        refetchInterval: 3000,
    });

    useEffect(() => {
        if (!isLoading && transactions.length > 0) {
            const allIds = transactions.map(t => t.id);
            localStorage.setItem('seenRequestIds', JSON.stringify(allIds));
        }
    }, [transactions, isLoading]);

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            setEditingTransaction(null);
        },
    });

    const handleEditSuccess = () => {
        setEditingTransaction(null);
    };

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = 
            t.worker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.worker_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.materials?.some(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || t.approval_status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status) => {
        switch(status) {
            case 'approved':
                return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
            case 'declined':
                return <Badge className="bg-red-600"><XCircle className="w-3 h-3 mr-1" />Declined</Badge>;
            default:
                return <Badge className="bg-yellow-600"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
            {/* Header */}
            <header className="bg-[#dc6b2f] text-white py-6 px-4 shadow-lg">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to={createPageUrl('RequestPortal')}>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-white hover:bg-white/10"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <img 
                            src="/akk logo.jpg"
                            alt="AKK Engineering Logo"
                            className="h-12 w-12 object-contain"
                        />
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Request History
                            </h1>
                            <p className="text-slate-300 text-sm font-bold" style={{ fontFamily: 'Calibri, sans-serif' }}>
                                AKK ENGINEERING PTE. LTD.
                            </p>
                            <p className="text-slate-300 text-xs mt-1" style={{ fontFamily: 'Aptos Narrow, Aptos, sans-serif' }}>
                                15 Kaki Bukit Rd 4, #01-50, Singapore 417808
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Search */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                <Card className="border-0 shadow-lg">
                    <CardContent className="p-4">
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search by name, ID, or material..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 border-slate-200"
                                />
                            </div>
                            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                                <TabsList className="bg-slate-100">
                                    <TabsTrigger value="all">All Status</TabsTrigger>
                                    <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">
                                        Pending
                                    </TabsTrigger>
                                    <TabsTrigger value="approved" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
                                        Approved
                                    </TabsTrigger>
                                    <TabsTrigger value="declined" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                                        Declined
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Requests List */}
            <div className="max-w-6xl mx-auto px-4 pb-8">
                <AnimatePresence mode="wait">
                    {editingTransaction ? (
                        <MaterialForm
                            key={editingTransaction.id}
                            type={editingTransaction.transaction_type}
                            editMode={true}
                            existingTransaction={editingTransaction}
                            onBack={() => setEditingTransaction(null)}
                            onSuccess={handleEditSuccess}
                            onDelete={() => deleteMutation.mutate(editingTransaction.id)}
                        />
                    ) : isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-[#dc6b2f]" />
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <Card className="border-0 shadow-lg">
                            <CardContent className="py-20 text-center">
                                <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                <h3 className="text-xl font-semibold text-slate-700 mb-2">No Requests Found</h3>
                                <p className="text-slate-500">
                                    {searchTerm ? 'Try a different search term' : 'Start by creating a material request'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {filteredTransactions.map((transaction, index) => (
                                <motion.div
                                    key={transaction.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                                        <div className={`h-1 ${transaction.transaction_type === 'return' ? 'bg-emerald-600' : 'bg-[#f97316]'}`} />
                                        <CardContent className="p-5">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                                        transaction.transaction_type === 'return' 
                                                            ? 'bg-emerald-100' 
                                                            : 'bg-[#f97316]/10'
                                                    }`}>
                                                        {transaction.transaction_type === 'return' ? (
                                                            <RotateCcw className="w-6 h-6 text-emerald-600" />
                                                        ) : (
                                                            <Package className="w-6 h-6 text-[#f97316]" />
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge variant={transaction.transaction_type === 'return' ? 'default' : 'secondary'}
                                                                className={transaction.transaction_type === 'return' 
                                                                    ? 'bg-emerald-600' 
                                                                    : 'bg-[#f97316] text-white'
                                                                }
                                                            >
                                                                {transaction.transaction_type === 'return' ? 'Return' : 'Take'}
                                                            </Badge>
                                                            {getStatusBadge(transaction.approval_status)}
                                                            <span className="text-sm text-slate-500 flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                {transaction.transaction_date}
                                                            </span>
                                                            <span className="text-sm text-slate-500 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {transaction.transaction_time}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-slate-700">
                                                            <User className="w-4 h-4 text-slate-400" />
                                                            <span className="font-medium">{transaction.worker_name}</span>
                                                            <span className="text-slate-400">•</span>
                                                            <span className="text-sm text-slate-500">ID: {transaction.worker_id}</span>
                                                        </div>
                                                        {transaction.approved_by && transaction.approval_status !== 'pending' && (
                                                            <div className="text-sm text-slate-500 mt-1">
                                                                {transaction.approval_status === 'approved' ? 'Approved' : 'Declined'} by {transaction.approved_by}
                                                                {transaction.approval_date && ` on ${transaction.approval_date}`}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="ml-16 md:ml-0 flex-1">
                                                    <div className="flex flex-wrap gap-2">
                                                        {transaction.materials?.map((material, idx) => (
                                                            <Badge 
                                                                key={idx} 
                                                                variant="outline"
                                                                className="bg-slate-50 border-slate-200"
                                                            >
                                                                {material.name} 
                                                                <span className="ml-1 text-slate-500">
                                                                    ({material.quantity} {material.unit})
                                                                </span>
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    {transaction.notes && (
                                                        <p className="text-sm text-slate-500 mt-2 italic">
                                                            "{transaction.notes}"
                                                        </p>
                                                    )}
                                                </div>

                                                {transaction.approval_status === 'pending' && (
                                                    <div className="ml-16 md:ml-0">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => setEditingTransaction(transaction)}
                                                            className="bg-blue-600 hover:bg-blue-700"
                                                        >
                                                            <Edit2 className="w-4 h-4 mr-1" />
                                                            Edit
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

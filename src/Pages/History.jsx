import React, { useState } from 'react';
import { supabase } from "@/Components/supbase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Badge } from "@/Components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/Components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/Components/ui/dialog";
import { 
    ArrowLeft, Download, Search, Package, RotateCcw, 
    Calendar, Clock, User, FileSpreadsheet, Loader2, Trash2, Printer 
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from 'xlsx';

export default function History() {
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [workerIdFilter, setWorkerIdFilter] = useState('');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [showPrintDialog, setShowPrintDialog] = useState(false);
    const [printStartDate, setPrintStartDate] = useState('');
    const [printEndDate, setPrintEndDate] = useState('');
    const [printWorkerId, setPrintWorkerId] = useState('');
    
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
    });

    const deleteAllMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast.success('All history deleted successfully');
            setShowDeleteDialog(false);
            setPassword('');
        },
    });

    const handleDeleteHistory = () => {
        if (password === '1432') {
            setPasswordError('');
            deleteAllMutation.mutate();
        } else {
            setPasswordError('Incorrect password');
        }
    };

    const filteredTransactions = transactions.filter(t => {
        const matchesFilter = filter === 'all' || t.transaction_type === filter;
        const matchesSearch = 
            t.worker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.worker_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.materials?.some(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesWorkerId = !workerIdFilter || t.worker_id?.toLowerCase().includes(workerIdFilter.toLowerCase());
        
        // Date filtering
        let matchesDate = true;
        if (dateFilter !== 'all' && t.transaction_date) {
            const transDate = new Date(t.transaction_date);
            const now = new Date();
            
            if (dateFilter === 'week') {
                const weekAgo = new Date(now.setDate(now.getDate() - 7));
                matchesDate = transDate >= weekAgo;
            } else if (dateFilter === 'month') {
                matchesDate = transDate.getMonth() === new Date().getMonth() && 
                             transDate.getFullYear() === new Date().getFullYear();
            } else if (dateFilter === 'year') {
                matchesDate = transDate.getFullYear() === new Date().getFullYear();
            }
        }
        
        return matchesFilter && matchesSearch && matchesDate && matchesWorkerId;
    });

    const printTransaction = (transaction) => {
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Transaction Receipt</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                        .info { margin-bottom: 20px; }
                        .info-row { display: flex; margin-bottom: 8px; }
                        .label { font-weight: bold; width: 150px; }
                        .materials { margin-top: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>AKK Engineering Pte. Ltd.</h1>
                        <h2>Transaction Receipt</h2>
                    </div>
                    <div class="info">
                        <div class="info-row"><span class="label">Transaction Type:</span> ${transaction.transaction_type === 'take' ? 'TAKE' : 'RETURN'}</div>
                        <div class="info-row"><span class="label">Date:</span> ${transaction.transaction_date}</div>
                        <div class="info-row"><span class="label">Time:</span> ${transaction.transaction_time}</div>
                        <div class="info-row"><span class="label">Worker Name:</span> ${transaction.worker_name}</div>
                        <div class="info-row"><span class="label">Worker ID:</span> ${transaction.worker_id}</div>
                    </div>
                    <div class="materials">
                        <h3>Materials</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Material Name</th>
                                    <th>Quantity</th>
                                    <th>Unit</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${transaction.materials?.map(m => `
                                    <tr>
                                        <td>${m.name}</td>
                                        <td>${m.quantity}</td>
                                        <td>${m.unit}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ${transaction.notes ? `<div style="margin-top: 20px;"><strong>Notes:</strong> ${transaction.notes}</div>` : ''}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const printBulk = () => {
        let transactionsToPrint = filteredTransactions;
        
        if (printStartDate || printEndDate || printWorkerId) {
            transactionsToPrint = transactions.filter(t => {
                let matches = true;
                
                if (printStartDate && t.transaction_date < printStartDate) {
                    matches = false;
                }
                if (printEndDate && t.transaction_date > printEndDate) {
                    matches = false;
                }
                if (printWorkerId && t.worker_id !== printWorkerId) {
                    matches = false;
                }
                
                return matches;
            });
        }

        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Transaction History</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                        .transaction { margin-bottom: 30px; page-break-inside: avoid; border: 1px solid #ddd; padding: 15px; }
                        .info-row { margin-bottom: 5px; }
                        .label { font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>AKK Engineering Pte. Ltd.</h1>
                        <h2>Transaction History Report</h2>
                        ${printStartDate || printEndDate ? `<p>Period: ${printStartDate || 'Start'} to ${printEndDate || 'End'}</p>` : ''}
                        ${printWorkerId ? `<p>Worker ID: ${printWorkerId}</p>` : '<p>All Workers</p>'}
                    </div>
                    ${transactionsToPrint.map(t => `
                        <div class="transaction">
                            <div class="info-row"><span class="label">Type:</span> ${t.transaction_type === 'take' ? 'TAKE' : 'RETURN'} | <span class="label">Date:</span> ${t.transaction_date} | <span class="label">Time:</span> ${t.transaction_time}</div>
                            <div class="info-row"><span class="label">Worker:</span> ${t.worker_name} (ID: ${t.worker_id})</div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Material</th>
                                        <th>Quantity</th>
                                        <th>Unit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${t.materials?.map(m => `
                                        <tr>
                                            <td>${m.name}</td>
                                            <td>${m.quantity}</td>
                                            <td>${m.unit}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${t.notes ? `<div style="margin-top: 10px;"><strong>Notes:</strong> ${t.notes}</div>` : ''}
                        </div>
                    `).join('')}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        setShowPrintDialog(false);
    };

    const exportToExcel = () => {
        const data = [];
        filteredTransactions.forEach(t => {
            if (t.materials && t.materials.length > 0) {
                t.materials.forEach(m => {
                    data.push({
                        'Date': t.transaction_date,
                        'Time': t.transaction_time,
                        'Type': t.transaction_type,
                        'Worker Name': t.worker_name,
                        'Worker ID': t.worker_id,
                        'Material': m.name,
                        'Quantity': m.quantity,
                        'Unit': m.unit,
                        'Notes': t.notes || ''
                    });
                });
            } else {
                data.push({
                    'Date': t.transaction_date,
                    'Time': t.transaction_time,
                    'Type': t.transaction_type,
                    'Worker Name': t.worker_name,
                    'Worker ID': t.worker_id,
                    'Material': '',
                    'Quantity': '',
                    'Unit': '',
                    'Notes': t.notes || ''
                });
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
        
        XLSX.writeFile(workbook, `AKK_Materials_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
            {/* Header */}
            <header className="bg-[#dc6b2f] text-white py-6 px-4 shadow-lg">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to={createPageUrl('Home')}>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-white hover:bg-white/10"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <img 
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693f9bfa0ecf7ec8a55925fd/f4b1b086f_akklogo.jpg"
                            alt="AKK Engineering Logo"
                            className="h-12 w-12 object-contain"
                        />
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Transaction History
                            </h1>
                            <p className="text-slate-300 text-sm">AKK Engineering Pte. Ltd.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={exportToExcel}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Export to Excel</span>
                            <Download className="w-4 h-4 sm:hidden" />
                        </Button>
                        <Button 
                            onClick={() => setShowDeleteDialog(true)}
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Delete All</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                <Card className="border-0 shadow-lg">
                    <CardContent className="p-4">
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Search by name, ID, or material..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 border-slate-200"
                                    />
                                </div>
                                <Button 
                                    onClick={() => setShowPrintDialog(true)}
                                    className="bg-slate-700 hover:bg-slate-800"
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    <span className="hidden sm:inline">Bulk Print</span>
                                </Button>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 items-center flex-wrap">
                                <Tabs value={filter} onValueChange={setFilter}>
                                    <TabsList className="bg-slate-100">
                                        <TabsTrigger value="all">All</TabsTrigger>
                                        <TabsTrigger value="take" className="data-[state=active]:bg-[#f97316] data-[state=active]:text-white">
                                            Take
                                        </TabsTrigger>
                                        <TabsTrigger value="return" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                                            Return
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <Tabs value={dateFilter} onValueChange={setDateFilter}>
                                    <TabsList className="bg-slate-100">
                                        <TabsTrigger value="all">All Time</TabsTrigger>
                                        <TabsTrigger value="week">Week</TabsTrigger>
                                        <TabsTrigger value="month">Month</TabsTrigger>
                                        <TabsTrigger value="year">Year</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <Input
                                    placeholder="Filter by Worker ID"
                                    value={workerIdFilter}
                                    onChange={(e) => setWorkerIdFilter(e.target.value)}
                                    className="w-48 border-slate-200"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions List */}
            <div className="max-w-6xl mx-auto px-4 pb-8">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#f97316]" />
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <Card className="border-0 shadow-lg">
                        <CardContent className="py-20 text-center">
                            <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Transactions Found</h3>
                            <p className="text-slate-500">
                                {searchTerm ? 'Try a different search term' : 'Start by recording a material take or return'}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence>
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
                                            <div className="flex items-start justify-between gap-4 mb-4">
                                                <div className="flex-1" />
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => printTransaction(transaction)}
                                                    className="text-slate-600 hover:text-slate-800"
                                                >
                                                    <Printer className="w-4 h-4 mr-2" />
                                                    Print
                                                </Button>
                                            </div>
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-start gap-4">
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
                                                    </div>
                                                </div>

                                                <div className="ml-16 md:ml-0">
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
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Bulk Print Dialog */}
            <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bulk Print Transactions</DialogTitle>
                        <DialogDescription>
                            Select date range and worker ID to print multiple transactions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Start Date</label>
                            <Input
                                type="date"
                                value={printStartDate}
                                onChange={(e) => setPrintStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">End Date</label>
                            <Input
                                type="date"
                                value={printEndDate}
                                onChange={(e) => setPrintEndDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Worker ID (Optional - leave empty for all)</label>
                            <Input
                                placeholder="Enter Worker ID or leave empty"
                                value={printWorkerId}
                                onChange={(e) => setPrintWorkerId(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setShowPrintDialog(false);
                                setPrintStartDate('');
                                setPrintEndDate('');
                                setPrintWorkerId('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={printBulk}
                            className="bg-slate-700 hover:bg-slate-800"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete All History</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. Please enter the password to confirm deletion of all transaction history.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setPasswordError('');
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleDeleteHistory()}
                        />
                        {passwordError && (
                            <p className="text-sm text-red-600">{passwordError}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setShowDeleteDialog(false);
                                setPassword('');
                                setPasswordError('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDeleteHistory}
                            disabled={deleteAllMutation.isPending}
                        >
                            {deleteAllMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete All'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
            );
            }
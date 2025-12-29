import React, { useState, useEffect, useRef } from 'react';
import { supabase } from "@/Components/supbase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/Components/ui/card";
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
    Calendar, Clock, User, FileSpreadsheet, Loader2, Trash2, Printer,
    CheckCircle, XCircle, AlertCircle, LogOut, Edit2, ChevronDown, ChevronUp
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import { sendBrowserNotification } from "@/lib/emailNotification";
import RequestersManager from "@/Components/RequestersManager";
// Component to display GitHub-style commit history for returns
const ReturnHistoryDisplay = ({ referenceNumber, totalQuantity, materialName, materialUnit }) => {
    const [returnHistory, setReturnHistory] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchReturnHistory = async () => {
            try {
                const { data: returns, error } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('transaction_type', 'return')
                    .eq('approval_status', 'approved')
                    .order('created_at', { ascending: true }); // Chronological order

                if (error) throw error;

                // Filter returns for this specific reference number
                const relevantReturns = returns.filter(transaction =>
                    transaction.materials?.some(material =>
                        material.reference_number === referenceNumber
                    )
                );

                // Extract individual return entries
                const history = [];
                relevantReturns.forEach(transaction => {
                    const materialReturn = transaction.materials?.find(m =>
                        m.reference_number === referenceNumber
                    );
                    if (materialReturn && materialReturn.return_quantity > 0) {
                        history.push({
                            returner: transaction.worker_name,
                            quantity: materialReturn.return_quantity,
                            date: transaction.transaction_date,
                            time: transaction.transaction_time,
                            transactionId: transaction.id
                        });
                    }
                });

                setReturnHistory(history);
            } catch (error) {
                console.error('Error fetching return history:', error);
            } finally {
                setLoading(false);
            }
        };

        if (referenceNumber) {
            fetchReturnHistory();
        }
    }, [referenceNumber]);

    if (loading) {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1">
                <div className="text-blue-700 font-medium text-xs">Loading return history...</div>
            </div>
        );
    }

    if (returnHistory.length === 0) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                <div className="text-yellow-700 font-medium">
                    Taken to Site
                </div>
                <div className="text-yellow-600 text-xs mt-1">
                    Not Returned
                </div>
            </div>
        );
    }

    // Calculate total returned and remaining
    const totalReturned = returnHistory.reduce((sum, entry) => sum + entry.quantity, 0);
    const remaining = totalQuantity - totalReturned;
    const isFullyReturned = remaining <= 0;

    return (
        <div className="space-y-1">
            {/* Individual return entries */}
            {returnHistory.map((entry, index) => (
                <div key={entry.transactionId} className="bg-blue-50 border border-blue-200 rounded px-2 py-1">
                    <div className="text-blue-700 font-medium">
                        🔄 Returned {entry.quantity}/{totalQuantity} {materialName} by {entry.returner}
                    </div>
                    <div className="text-blue-600 text-xs mt-1">
                        on {entry.date} at {entry.time}
                    </div>
                </div>
            ))}

            {/* Final status */}
            {isFullyReturned ? (
                <div className="bg-green-50 border border-green-200 rounded px-2 py-1">
                    <div className="text-green-700 font-medium">
                        ✅ Fully returned {totalQuantity}/{totalQuantity} {materialName}
                    </div>
                    <div className="text-green-600 text-xs mt-1">
                        All materials returned
                    </div>
                </div>
            ) : (
                <div className="bg-orange-50 border border-orange-200 rounded px-2 py-1">
                    <div className="text-orange-700 font-medium">
                        🔄 Partially returned {totalReturned}/{totalQuantity} {materialName}
                    </div>
                    <div className="text-orange-600 text-xs mt-1">
                        Remaining qty to return: {remaining}/{totalQuantity}
                    </div>
                </div>
            )}
        </div>
    );
};

import MaterialForm from "@/Components/MaterialForm";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('transactions');
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
    const [statusFilter, setStatusFilter] = useState('all');
    const [materialReturnFilter, setMaterialReturnFilter] = useState('all');
    const [adminStatusId, setAdminStatusId] = useState(null);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [expandedCards, setExpandedCards] = useState(new Set());
    const [isBulkPrinting, setIsBulkPrinting] = useState(false);
    
    const queryClient = useQueryClient();
    const adminEmail = sessionStorage.getItem('adminEmail');

    useEffect(() => {
        const loggedIn = sessionStorage.getItem('adminLoggedIn');
        if (!loggedIn) {
            navigate(createPageUrl('AdminLogin'));
        }

        // Request notification permission when admin logs in
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("Notification permission granted");
                }
            });
        }
    }, [navigate]);

    // Track admin online status
    useEffect(() => {
        if (!adminEmail) return;

        const setOnlineStatus = async () => {
            try {
                const { data: existingStatus } = await supabase
                    .from('admin_status')
                    .select('*')
                    .limit(1);

                if (existingStatus && existingStatus.length > 0) {
                    const { error } = await supabase
                        .from('admin_status')
                        .update({
                            admin_email: adminEmail,
                            last_seen: new Date().toISOString(),
                            is_online: true
                        })
                        .eq('id', existingStatus[0].id);
                    if (error) throw error;
                    setAdminStatusId(existingStatus[0].id);
                } else {
                    const { data, error } = await supabase
                        .from('admin_status')
                        .insert([{
                            admin_email: adminEmail,
                            last_seen: new Date().toISOString(),
                            is_online: true
                        }])
                        .select()
                        .single();
                    if (error) throw error;
                    setAdminStatusId(data.id);
                }
            } catch (error) {
                console.error('Failed to set online status:', error);
            }
        };

        setOnlineStatus();

        const heartbeat = setInterval(async () => {
            try {
                const { data: existingStatus } = await supabase
                    .from('admin_status')
                    .select('*')
                    .limit(1);

                if (existingStatus && existingStatus.length > 0) {
                    await supabase
                        .from('admin_status')
                        .update({
                            admin_email: adminEmail,
                            last_seen: new Date().toISOString(),
                            is_online: true
                        })
                        .eq('id', existingStatus[0].id);
                }
            } catch (error) {
                console.error('Heartbeat failed:', error);
            }
        }, 5000);

        const handleBeforeUnload = () => {
            if (adminStatusId) {
                navigator.sendBeacon(
                    `${supabase.supabaseUrl}/rest/v1/admin_status?id=eq.${adminStatusId}`,
                    JSON.stringify({ is_online: false })
                );
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(heartbeat);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (adminStatusId) {
                supabase
                    .from('admin_status')
                    .update({ is_online: false })
                    .eq('id', adminStatusId);
            }
        };
    }, [adminEmail, adminStatusId]);

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

    const prevTransactionsRef = useRef([]);
    
    useEffect(() => {
        const checkNewRequests = async () => {
            if (!isLoading && transactions.length > 0 && prevTransactionsRef.current.length > 0) {
                // Only show notifications for admin users, not workers
                const isAdmin = !!adminEmail;
                if (!isAdmin) return;

                const newRequests = transactions.filter(t =>
                    t.approval_status === 'pending' &&
                    !prevTransactionsRef.current.find(pt => pt.id === t.id)
                );

                if (newRequests.length > 0) {
                    toast.info(`${newRequests.length} new request(s) received`, {
                        description: 'Pending approval',
                    });

                    // Send browser notification for the latest new request
                    const latestRequest = newRequests[0];
                    sendBrowserNotification(latestRequest);
                }
            }

            prevTransactionsRef.current = transactions;
        };

        checkNewRequests();
    }, [transactions, isLoading, adminEmail]);

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

    const approveRequestMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            const adminName = sessionStorage.getItem('adminName') || 'Admin';

            // First, get the transaction to check if it's a return request
            const { data: transaction, error: fetchError } = await supabase
                .from('transactions')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // Update the request transaction status first
            const { error: statusError } = await supabase
                .from('transactions')
                .update({
                    approval_status: status,
                    approved_by: adminName,
                    approval_date: format(new Date(), 'yyyy-MM-dd HH:mm')
                })
                .eq('id', id);
            if (statusError) throw statusError;

            // If this is a return request, update the original take transaction
            if (transaction.transaction_type === 'return') {
                // Find the original take transaction(s) that this return references
                const returnMaterials = transaction.materials || [];
                const referenceNumbers = returnMaterials.map(m => m.reference_number).filter(Boolean);

                if (referenceNumbers.length > 0) {
                    // Find all take transactions with these reference numbers
                    const { data: takeTransactions, error: takeError } = await supabase
                        .from('transactions')
                        .select('*')
                        .eq('transaction_type', 'take')
                        .eq('approval_status', 'approved');

                    if (takeError) throw takeError;

                    const transactionUpdates = new Map();

                    for (const refNum of referenceNumbers) {
                        const takeTransaction = takeTransactions?.find(t =>
                            t.materials?.some(m => m.reference_number === refNum)
                        );

                        if (takeTransaction) {
                            if (!transactionUpdates.has(takeTransaction.id)) {
                                transactionUpdates.set(takeTransaction.id, takeTransaction.materials);
                            }

                            const currentMaterials = transactionUpdates.get(takeTransaction.id);

                            if (status === 'approved') {
                                // Calculate total returned from ALL approved returns for this reference number
                                // (including the one we just approved)
                                const { data: allApprovedReturns, error: returnsError } = await supabase
                                    .from('transactions')
                                    .select('*')
                                    .eq('transaction_type', 'return')
                                    .eq('approval_status', 'approved');

                                if (returnsError) throw returnsError;

                                let totalReturnedForRef = 0;
                                for (const approvedReturn of allApprovedReturns || []) {
                                    const approvedMaterial = approvedReturn.materials?.find(m =>
                                        m.reference_number === refNum
                                    );
                                    if (approvedMaterial && approvedMaterial.return_quantity) {
                                        totalReturnedForRef += approvedMaterial.return_quantity;
                                    }
                                }

                                const originalQuantity = takeTransaction.materials.find(m => m.reference_number === refNum).quantity;
                                const isFullyReturned = totalReturnedForRef >= originalQuantity;

                                const updatedMaterials = currentMaterials.map(material =>
                                    material.reference_number === refNum
                                        ? {
                                            // Preserve all original material properties
                                            ...material,
                                            // Only update return-related fields
                                            returned: isFullyReturned,
                                            returned_quantity: totalReturnedForRef,
                                            return_date: isFullyReturned ? format(new Date(), 'yyyy-MM-dd HH:mm') : material.return_date,
                                            // Clear any decline status since it's now approved
                                            return_declined: false,
                                            return_declined_by: null,
                                            return_declined_date: null
                                        }
                                        : material
                                );
                                transactionUpdates.set(takeTransaction.id, updatedMaterials);
                            } else if (status === 'declined') {
                                // For declined returns, recalculate returned_quantity excluding this declined return
                                const { data: allApprovedReturns, error: returnsError } = await supabase
                                    .from('transactions')
                                    .select('*')
                                    .eq('transaction_type', 'return')
                                    .eq('approval_status', 'approved');

                                if (returnsError) throw returnsError;

                                let totalReturnedForRef = 0;
                                for (const approvedReturn of allApprovedReturns || []) {
                                    const approvedMaterial = approvedReturn.materials?.find(m =>
                                        m.reference_number === refNum
                                    );
                                    if (approvedMaterial && approvedMaterial.return_quantity) {
                                        totalReturnedForRef += approvedMaterial.return_quantity;
                                    }
                                }

                                const originalQuantity = takeTransaction.materials.find(m => m.reference_number === refNum).quantity;
                                const isFullyReturned = totalReturnedForRef >= originalQuantity;

                                const updatedMaterials = currentMaterials.map(material =>
                                    material.reference_number === refNum
                                        ? {
                                            ...material,
                                            returned: isFullyReturned,
                                            returned_quantity: totalReturnedForRef,
                                            return_date: isFullyReturned ? material.return_date : null,
                                            return_declined: true,
                                            return_declined_by: adminName,
                                            return_declined_date: format(new Date(), 'yyyy-MM-dd HH:mm'),
                                        }
                                        : material
                                );
                                transactionUpdates.set(takeTransaction.id, updatedMaterials);
                            }
                        }
                    }

                    // Update all affected take transactions
                    for (const [transactionId, updatedMaterials] of transactionUpdates) {
                        const { error: updateError } = await supabase
                            .from('transactions')
                            .update({ materials: updatedMaterials })
                            .eq('id', transactionId);

                        if (updateError) throw updateError;
                    }
                }
            }

            return; // Early return since we already updated the status above

            // Update the request transaction (return request) status
            const { error } = await supabase
                .from('transactions')
                .update({
                    approval_status: status,
                    approved_by: adminName,
                    approval_date: format(new Date(), 'yyyy-MM-dd HH:mm')
                })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            const action = variables.status === 'approved' ? 'approved' : 'declined';
            toast.success(`Request ${action} successfully`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async ({ id, password }) => {
            if (password !== '722379') {
                throw new Error('Incorrect password');
            }
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            setEditingTransaction(null);
            toast.success('Transaction deleted successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to delete transaction');
        },
    });

    const handleDeleteHistory = () => {
        if (password === '722379') {
            setPasswordError('');
            deleteAllMutation.mutate();
        } else {
            setPasswordError('Incorrect password');
        }
    };

    const handleEditSuccess = () => {
        setEditingTransaction(null);
    };

    const handleLogout = async () => {
        try {
            if (adminStatusId) {
                await supabase
                    .from('admin_status')
                    .update({ is_online: false })
                    .eq('id', adminStatusId);
            }
        } catch (error) {
            console.error('Failed to update status on logout:', error);
        }
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminName');
        sessionStorage.removeItem('adminEmail');
        navigate(createPageUrl('Home'));
    };

    const filteredTransactions = transactions.filter(t => {
        const matchesFilter = filter === 'all' || t.transaction_type === filter;
        let matchesSearch = false;

        if (searchTerm.startsWith('/')) {
            // Special search syntax: /approver_name to search by who approved the transaction
            const approverName = searchTerm.slice(1).toLowerCase().trim();
            matchesSearch = t.approved_by?.toLowerCase().includes(approverName);
        } else {
            // Regular search: worker name, worker ID, material name, or reference number
            matchesSearch =
                t.worker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.worker_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.materials?.some(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       m.reference_number?.includes(searchTerm));
        }

        const matchesWorkerId = !workerIdFilter || t.worker_id?.toLowerCase().includes(workerIdFilter.toLowerCase());
        const matchesStatus = statusFilter === 'all' || t.approval_status === statusFilter;

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

        let matchesMaterialReturn = true;
        if (materialReturnFilter !== 'all' && t.transaction_type === 'take' && t.materials) {
            if (materialReturnFilter === 'returned') {
                // Show only take transactions where ALL materials are returned
                matchesMaterialReturn = t.materials.every(m => m.returned === true);
            } else if (materialReturnFilter === 'partially_returned') {
                // Show only take transactions where some materials are returned but not all
                matchesMaterialReturn = t.materials.some(m => (m.returned_quantity || 0) > 0) &&
                                       t.materials.some(m => (m.returned_quantity || 0) < m.quantity);
            } else if (materialReturnFilter === 'not_returned') {
                // Show only take transactions where no materials are returned
                matchesMaterialReturn = t.materials.every(m => (m.returned_quantity || 0) === 0);
            }
        } else if (materialReturnFilter !== 'all') {
            // For non-take transactions (like return requests), don't show them in material return filters
            matchesMaterialReturn = false;
        }

        return matchesFilter && matchesSearch && matchesDate && matchesWorkerId && matchesStatus && matchesMaterialReturn;
    });

    const pendingCount = transactions.filter(t => t.approval_status === 'pending').length;

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
                        'Status': t.approval_status,
                        'Notes': t.notes || ''
                    });
                });
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
        
        XLSX.writeFile(workbook, `AKK_Materials_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    const printTransaction = async (transaction) => {
        // Fetch return history for materials that have reference numbers
        const returnHistoryMap = new Map();

        for (const material of transaction.materials || []) {
            if (material.reference_number && transaction.transaction_type === 'take') {
                try {
                    const { data: returns, error } = await supabase
                        .from('transactions')
                        .select('*')
                        .eq('transaction_type', 'return')
                        .eq('approval_status', 'approved')
                        .order('created_at', { ascending: true });

                    if (!error && returns) {
                        const relevantReturns = returns.filter(t =>
                            t.materials?.some(m => m.reference_number === material.reference_number)
                        );

                        const history = [];
                        relevantReturns.forEach(t => {
                            const returnMaterial = t.materials?.find(m =>
                                m.reference_number === material.reference_number
                            );
                            if (returnMaterial && returnMaterial.return_quantity > 0) {
                                history.push({
                                    returner: t.worker_name,
                                    quantity: returnMaterial.return_quantity,
                                    date: t.transaction_date,
                                    time: t.transaction_time
                                });
                            }
                        });

                        if (history.length > 0) {
                            returnHistoryMap.set(material.reference_number, history);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching return history for print:', error);
                }
            }
        }

        // Set filename for PDF save: ID number dd/mm/yy time
        const [year, month, day] = transaction.transaction_date.split('-');
        const shortYear = year.slice(-2); // Get last 2 digits of year
        const formattedDate = `${day}/${month}/${shortYear}`;
        const fileName = `${transaction.worker_id} ${formattedDate} ${transaction.transaction_time}`;

        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${fileName}</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            padding: 30px;
                            position: relative;
                            min-height: 100vh;
                            background: #ffffff;
                            color: #333;
                        }
                        .receipt-container {
                            background: white;
                            border-radius: 15px;
                            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                            overflow: hidden;
                            max-width: 800px;
                            margin: 0 auto;
                            page-break-inside: avoid;
                        }
                        .header {
                            background: #dc6b2f;
                            color: white;
                            text-align: center;
                            padding: 25px;
                            position: relative;
                        }
                        .header::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%);
                        }
                        .company-name {
                            font-family: 'Calibri', 'Segoe UI', sans-serif;
                            font-weight: 700;
                            font-size: 24px;
                            margin: 0;
                            position: relative;
                            z-index: 1;
                            color: #b22222;
                            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        }
                        .company-address {
                            font-family: 'Aptos Narrow', 'Segoe UI', sans-serif;
                            font-size: 14px;
                            margin: 8px 0 0 0;
                            position: relative;
                            z-index: 1;
                            color: #b22222;
                        }
                        .date-header {
                            position: absolute;
                            top: 20px;
                            right: 25px;
                            font-size: 12px;
                            color: #b22222;
                            font-weight: 600;
                            z-index: 2;
                        }
                        .content-section {
                            padding: 30px;
                            background: #f8f9fa;
                        }
                        .info {
                            background: white;
                            border-radius: 10px;
                            padding: 20px;
                            margin-bottom: 25px;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                            border-left: 4px solid #667eea;
                        }
                        .info-row {
                            display: flex;
                            margin-bottom: 12px;
                            align-items: center;
                        }
                        .label {
                            font-weight: 600;
                            width: 160px;
                            color: #495057;
                            font-size: 14px;
                        }
                        .value {
                            color: #212529;
                            font-weight: 500;
                        }
                        .materials {
                            margin-top: 25px;
                        }
                        .materials h3 {
                            color: #495057;
                            font-size: 16px;
                            margin-bottom: 15px;
                            font-weight: 600;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 15px;
                            background: white;
                            border-radius: 8px;
                            overflow: hidden;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                        }
                        th {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 12px 15px;
                            text-align: left;
                            font-weight: 600;
                            font-size: 14px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        td {
                            border-bottom: 1px solid #e9ecef;
                            padding: 12px 15px;
                            vertical-align: top;
                        }
                        tr:nth-child(even) {
                            background-color: #f8f9fa;
                        }
                        tr:hover {
                            background-color: #e3f2fd;
                            transition: background-color 0.2s ease;
                        }
                        .return-history {
                            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                            border: 1px solid #90caf9;
                            border-radius: 6px;
                            padding: 6px 8px;
                            margin: 3px 0;
                            font-size: 11px;
                            color: #1565c0;
                        }
                        .notes-section {
                            background: #fff3cd;
                            border: 1px solid #ffeaa7;
                            border-radius: 8px;
                            padding: 15px;
                            margin-top: 20px;
                            color: #856404;
                        }
                        .notes-section strong {
                            color: #533f00;
                        }
                        .approval-info {
                            margin-top: 20px;
                            text-align: left;
                            font-size: 12px;
                            color: #495057;
                            background: white;
                            border: 1px solid #dee2e6;
                            border-radius: 8px;
                            padding: 15px;
                            width: 100%;
                            max-width: 300px;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                            page-break-inside: avoid;
                        }
                        .approval-info strong {
                            color: #28a745;
                        }
                        .signature-line {
                            margin-top: 20px;
                            border-bottom: 2px solid #6c757d;
                            width: 200px;
                            height: 1px;
                        }
                        .status-returned {
                            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                            color: #155724;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-weight: 600;
                            font-size: 12px;
                        }
                        @media print {
                            body { background: white !important; padding: 10px !important; }
                            .receipt-container { box-shadow: none !important; page-break-inside: avoid !important; break-inside: avoid !important; }
                            .approval-info { page-break-before: avoid !important; page-break-inside: avoid !important; break-inside: avoid !important; }
                            .content-section { page-break-inside: avoid !important; break-inside: avoid !important; }
                        }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">
                        <div class="header">
                            <div class="company-info">
                                <h1 class="company-name">AKK ENGINEERING PTE. LTD.</h1>
                                <p class="company-address">15 Kaki Bukit Rd 4, #01-50, Singapore 417808</p>
                            </div>
                            <div class="date-header">${transaction.transaction_date}</div>
                        </div>
                        <div class="content-section">
                            <div class="info">
                                <div class="info-row"><span class="label">Transaction Type:</span> <span class="value">${transaction.transaction_type === 'take' ? 'TAKE' : 'RETURN'}</span></div>
                                <div class="info-row"><span class="label">Status:</span> <span class="value">${transaction.approval_status.toUpperCase()}</span></div>
                                <div class="info-row"><span class="label">Date:</span> <span class="value">${transaction.transaction_date}</span></div>
                                <div class="info-row"><span class="label">Time:</span> <span class="value">${transaction.transaction_time}</span></div>
                                <div class="info-row"><span class="label">Requestor Name:</span> <span class="value">${transaction.worker_name}</span></div>
                                <div class="info-row"><span class="label">Requestor ID:</span> <span class="value">${transaction.worker_id}</span></div>
                            </div>
                            <div class="materials">
                                <h3>Materials</h3>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Material Name</th>
                                            <th>Quantity</th>
                                            <th>Unit</th>
                                            <th>Reference #</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${transaction.materials?.map(m => `
                                            <tr>
                                                <td>${m.name}</td>
                                                <td>${m.quantity}</td>
                                                <td>${m.unit}</td>
                                                <td>${m.reference_number || 'N/A'}</td>
                                                <td>
                                                    ${(() => {
                                                        // For return transactions, show simple "Returned X/Y" format
                                                        if (transaction.transaction_type === 'return') {
                                                            return `<span class="status-returned">Returned ${m.return_quantity || m.quantity}/${m.quantity}</span>`;
                                                        }

                                                        // For take transactions, show return history
                                                        if (!m.reference_number) {
                                                            return 'Not Returned';
                                                        }

                                                            const history = returnHistoryMap.get(m.reference_number);
                                                            if (!history || history.length === 0) {
                                                                return m.returned ? `Returned (${m.return_date})` : 'Taken to Site<br>Not Returned';
                                                            }

                                                        const totalReturned = history.reduce((sum, entry) => sum + entry.quantity, 0);
                                                        const remaining = m.quantity - totalReturned;
                                                        const isFullyReturned = remaining <= 0;

                                                        let html = '';
                                                        // Individual return entries
                                                        history.forEach(entry => {
                                                            html += `<div class="return-history">🔄 Returned ${entry.quantity}/${m.quantity} ${m.name} by ${entry.returner}<br><small>on ${entry.date} at ${entry.time}</small></div>`;
                                                        });

                                                        // Final status
                                                        if (isFullyReturned) {
                                                            html += `<div class="return-history" style="background: #dcfce7; border-color: #bbf7d0;">✅ Fully returned ${m.quantity}/${m.quantity} ${m.name}<br><small>All materials returned</small></div>`;
                                                        } else {
                                                            html += `<div class="return-history" style="background: #fed7aa; border-color: #fdba74;">🔄 Partially returned ${totalReturned}/${m.quantity} ${m.name}<br><small>Remaining qty to return: ${remaining}/${m.quantity}</small></div>`;
                                                        }

                                                        return html;
                                                    })()}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ${transaction.notes ? `<div class="notes-section"><strong>Notes:</strong> ${transaction.notes}</div>` : ''}
                        </div>
                    </div>
                    ${transaction.approval_status !== 'pending' ? `
                        <div class="approval-info">
                            <strong>This request was ${transaction.approval_status === 'approved' ? 'APPROVED' : 'DECLINED'}</strong>
                            ${transaction.approved_by ? `<br>by ${transaction.approved_by}` : ''}
                            ${transaction.approval_date ? `<br>on ${transaction.approval_date}` : ''}
                            <div class="signature-line"></div>
                            <div style="font-size: 10px; margin-top: 5px;">Signature</div>
                        </div>
                    ` : ''}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const printBulk = async () => {
        setIsBulkPrinting(true);
        try {
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

        // Fetch return history for all materials in bulk print
        const returnHistoryMap = new Map();

        for (const transaction of transactionsToPrint) {
            for (const material of transaction.materials || []) {
                if (material.reference_number && transaction.transaction_type === 'take') {
                    try {
                        const { data: returns, error } = await supabase
                            .from('transactions')
                            .select('*')
                            .eq('transaction_type', 'return')
                            .eq('approval_status', 'approved')
                            .order('created_at', { ascending: true });

                        if (!error && returns) {
                            const relevantReturns = returns.filter(t =>
                                t.materials?.some(m => m.reference_number === material.reference_number)
                            );

                            const history = [];
                            relevantReturns.forEach(t => {
                                const returnMaterial = t.materials?.find(m =>
                                    m.reference_number === material.reference_number
                                );
                                if (returnMaterial && returnMaterial.return_quantity > 0) {
                                    history.push({
                                        returner: t.worker_name,
                                        quantity: returnMaterial.return_quantity,
                                        date: t.transaction_date,
                                        time: t.transaction_time
                                    });
                                }
                            });

                            if (history.length > 0) {
                                returnHistoryMap.set(material.reference_number, history);
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching return history for bulk print:', error);
                    }
                }
            }
        }

        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Transaction History Report</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            padding: 20px;
                            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                            color: #333;
                        }
                        .report-container {
                            max-width: 900px;
                            margin: 0 auto;
                            background: white;
                            border-radius: 15px;
                            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                            overflow: hidden;
                        }
                        .header {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            text-align: center;
                            padding: 30px;
                            position: relative;
                        }
                        .header::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%);
                        }
                        .company-name {
                            font-family: 'Calibri', 'Segoe UI', sans-serif;
                            font-weight: 700;
                            font-size: 28px;
                            margin: 0;
                            position: relative;
                            z-index: 1;
                            color: #b22222;
                            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        }
                        .company-address {
                            font-family: 'Aptos Narrow', 'Segoe UI', sans-serif;
                            font-size: 14px;
                            margin: 8px 0 0 0;
                            position: relative;
                            z-index: 1;
                            color: #b22222;
                        }
                        .report-title {
                            font-size: 20px;
                            font-weight: 600;
                            margin-top: 15px;
                            position: relative;
                            z-index: 1;
                            color: #b22222;
                        }
                        .report-meta {
                            background: #f8f9fa;
                            padding: 15px 30px;
                            border-bottom: 1px solid #e9ecef;
                            font-size: 14px;
                            color: #495057;
                        }
                        .transaction {
                            margin: 0;
                            padding: 25px 30px;
                            page-break-inside: avoid;
                            border-bottom: 1px solid #e9ecef;
                            background: #f8f9fa;
                        }
                        .transaction:nth-child(even) {
                            background: white;
                        }
                        .transaction-header {
                            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                            padding: 15px 20px;
                            margin: -25px -30px 20px -30px;
                            border-radius: 0 0 10px 10px;
                            border-left: 4px solid #2196f3;
                        }
                        .info-row {
                            margin-bottom: 8px;
                            font-size: 14px;
                        }
                        .label {
                            font-weight: 600;
                            color: #495057;
                            margin-right: 8px;
                        }
                        .value {
                            color: #212529;
                            font-weight: 500;
                        }
                        .materials-section {
                            margin-top: 20px;
                        }
                        .materials-title {
                            font-size: 16px;
                            font-weight: 600;
                            color: #495057;
                            margin-bottom: 12px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 12px;
                            background: white;
                            border-radius: 8px;
                            overflow: hidden;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                        }
                        th {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 12px 15px;
                            text-align: left;
                            font-weight: 600;
                            font-size: 14px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        td {
                            border-bottom: 1px solid #e9ecef;
                            padding: 12px 15px;
                            vertical-align: top;
                        }
                        tr:nth-child(even) {
                            background-color: #f8f9fa;
                        }
                        tr:hover {
                            background-color: #e3f2fd;
                            transition: background-color 0.2s ease;
                        }
                        .return-history {
                            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                            border: 1px solid #90caf9;
                            border-radius: 6px;
                            padding: 6px 8px;
                            margin: 3px 0;
                            font-size: 11px;
                            color: #1565c0;
                        }
                        .notes-section {
                            background: #fff3cd;
                            border: 1px solid #ffeaa7;
                            border-radius: 8px;
                            padding: 12px 15px;
                            margin-top: 15px;
                            color: #856404;
                            font-size: 13px;
                        }
                        .notes-section strong {
                            color: #533f00;
                        }
                        .approval-section {
                            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                            border: 1px solid #c3e6cb;
                            border-radius: 8px;
                            padding: 12px 15px;
                            margin-top: 15px;
                            color: #155724;
                            font-size: 12px;
                        }
                        .approval-section strong {
                            color: #0f5132;
                        }
                        .status-returned {
                            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                            color: #155724;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-weight: 600;
                            font-size: 12px;
                        }
                        .page-break {
                            page-break-before: always;
                        }
                        @media print {
                            body { background: white; padding: 10px; }
                            .report-container { box-shadow: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="report-container">
                        <div class="header">
                            <h1 class="company-name">AKK ENGINEERING PTE. LTD.</h1>
                            <p class="company-address">15 Kaki Bukit Rd 4, #01-50, Singapore 417808</p>
                            <h2 class="report-title">Transaction History Report</h2>
                        </div>
                        <div class="report-meta">
                            ${printStartDate || printEndDate ? `<strong>Period:</strong> ${printStartDate || 'Start'} to ${printEndDate || 'End'}` : ''}
                            ${printWorkerId ? ` | <strong>Worker ID:</strong> ${printWorkerId}` : ''}
                        </div>
                        ${transactionsToPrint.map((t, index) => `
                            <div class="transaction">
                                <div class="transaction-header">
                                    <div class="info-row"><span class="label">Type:</span> <span class="value">${t.transaction_type === 'take' ? 'TAKE' : 'RETURN'}</span> | <span class="label">Status:</span> <span class="value">${t.approval_status.toUpperCase()}</span></div>
                                    <div class="info-row"><span class="label">Date:</span> <span class="value">${t.transaction_date}</span> | <span class="label">Time:</span> <span class="value">${t.transaction_time}</span></div>
                                    <div class="info-row"><span class="label">Worker:</span> <span class="value">${t.worker_name} (ID: ${t.worker_id})</span></div>
                                </div>
                                <div class="materials-section">
                                    <h3 class="materials-title">Materials</h3>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Material Name</th>
                                                <th>Quantity</th>
                                                <th>Unit</th>
                                                <th>Reference #</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${t.materials?.map(m => `
                                                <tr>
                                                    <td>${m.name}</td>
                                                    <td>${m.quantity}</td>
                                                    <td>${m.unit}</td>
                                                    <td>${m.reference_number || 'N/A'}</td>
                                                    <td>
                                                        ${(() => {
                                                            // For return transactions, show simple "Returned X/Y" format
                                                            if (t.transaction_type === 'return') {
                                                                return `<span class="status-returned">Returned ${m.return_quantity || m.quantity}/${m.quantity}</span>`;
                                                            }

                                                            // For take transactions, show return history
                                                            if (!m.reference_number) {
                                                                return 'Not Returned';
                                                            }

                                                            const history = returnHistoryMap.get(m.reference_number);
                                                            if (!history || history.length === 0) {
                                                                return m.returned ? `Returned (${m.return_date})` : 'Taken to Site<br>Not Returned';
                                                            }

                                                            const totalReturned = history.reduce((sum, entry) => sum + entry.quantity, 0);
                                                            const remaining = m.quantity - totalReturned;
                                                            const isFullyReturned = remaining <= 0;

                                                            let html = '';
                                                            // Individual return entries
                                                            history.forEach(entry => {
                                                                html += `<div class="return-history">🔄 Returned ${entry.quantity}/${m.quantity} ${m.name} by ${entry.returner}<br><small>on ${entry.date} at ${entry.time}</small></div>`;
                                                            });

                                                            // Final status
                                                            if (isFullyReturned) {
                                                                html += `<div class="return-history" style="background: #dcfce7; border-color: #bbf7d0;">✅ Fully returned ${m.quantity}/${m.quantity} ${m.name}<br><small>All materials returned</small></div>`;
                                                            } else {
                                                                html += `<div class="return-history" style="background: #fed7aa; border-color: #fdba74;">🔄 Partially returned ${totalReturned}/${m.quantity} ${m.name}<br><small>Remaining qty to return: ${remaining}/${m.quantity}</small></div>`;
                                                            }

                                                            return html;
                                                        })()}
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                ${t.notes ? `<div class="notes-section"><strong>Notes:</strong> ${t.notes}</div>` : ''}
                                ${t.approval_status !== 'pending' ? `<div class="approval-section"><strong>${t.approval_status === 'approved' ? 'APPROVED' : 'DECLINED'}</strong> by ${t.approved_by || 'Unknown'} on ${t.approval_date || 'Unknown date'}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        setShowPrintDialog(false);
        } catch (error) {
            console.error('Error during bulk print:', error);
            toast.error('Failed to generate bulk print. Please try again.');
        } finally {
            setIsBulkPrinting(false);
        }
    };

    const toggleCardExpansion = (transactionId) => {
        const newExpanded = new Set(expandedCards);
        if (newExpanded.has(transactionId)) {
            newExpanded.delete(transactionId);
        } else {
            newExpanded.add(transactionId);
        }
        setExpandedCards(newExpanded);
    };

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
            <header className="bg-slate-700 text-white py-6 px-4 shadow-lg">
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
                            src="/akk logo.jpg"
                            alt="AKK Engineering Logo"
                            className="h-12 w-12 object-contain"
                        />
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Admin Dashboard
                            </h1>
                            <p className="text-slate-300 text-sm font-bold" style={{ fontFamily: 'Calibri, sans-serif' }}>
                                AKK ENGINEERING PTE. LTD.
                            </p>
                            <p className="text-slate-300 text-xs mt-1" style={{ fontFamily: 'Aptos Narrow, Aptos, sans-serif' }}>
                                15 Kaki Bukit Rd 4, #01-50, Singapore 417808
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {pendingCount > 0 && (
                            <Badge className="bg-yellow-500 text-white px-3 py-1">
                                {pendingCount} Pending
                            </Badge>
                        )}
                        <Button 
                            onClick={handleLogout}
                            variant="outline"
                            className="border-white/30 text-white hover:bg-white/10 bg-transparent"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            {/* Action Buttons */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex gap-2 justify-end">
                    <Button 
                        onClick={exportToExcel}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Button 
                        onClick={() => setShowPrintDialog(true)}
                        className="bg-slate-600 hover:bg-slate-700"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Bulk Print
                    </Button>
                    <Button 
                        onClick={() => setShowDeleteDialog(true)}
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete All
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-6xl mx-auto px-4 pb-6">
                <Card className="border-0 shadow-lg">
                    <CardContent className="p-4">
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        className="pl-10 w-[300px]"
                                        placeholder="Search by name, ID, or material..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 items-center flex-wrap">
                                <Tabs value={activeTab} onValueChange={setActiveTab}>
                                    <TabsList>
                                        <TabsTrigger 
                                            value="transactions" 
                                            data-state={activeTab === 'transactions' ? 'active' : 'inactive'}
                                        >
                                            Transactions
                                        </TabsTrigger>
                                        <TabsTrigger 
                                            value="requesters" 
                                            data-state={activeTab === 'requesters' ? 'active' : 'inactive'}
                                        >
                                            Manage Requesters
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <Tabs value={filter} onValueChange={setFilter}>
                                    <TabsList className="bg-slate-100">
                                        <TabsTrigger value="all">All Types</TabsTrigger>
                                        <TabsTrigger value="take">Take</TabsTrigger>
                                        <TabsTrigger value="return">Return</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                                    <TabsList className="bg-slate-100">
                                        <TabsTrigger value="all">All Status</TabsTrigger>
                                        <TabsTrigger value="pending">Pending</TabsTrigger>
                                        <TabsTrigger value="approved">Approved</TabsTrigger>
                                        <TabsTrigger value="declined">Declined</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                    <Tabs value={materialReturnFilter} onValueChange={setMaterialReturnFilter}>
                                        <TabsList className="bg-slate-100 grid w-full grid-cols-2 sm:flex">
                                            <TabsTrigger value="all" className="text-xs sm:text-sm">All Materials</TabsTrigger>
                                            <TabsTrigger value="returned" className="text-xs sm:text-sm data-[state=active]:bg-green-600 data-[state=active]:text-white">Returned</TabsTrigger>
                                            <TabsTrigger value="partially_returned" className="text-xs sm:text-sm data-[state=active]:bg-orange-600 data-[state=active]:text-white">Partially Returned</TabsTrigger>
                                            <TabsTrigger value="not_returned" className="text-xs sm:text-sm data-[state=active]:bg-yellow-600 data-[state=active]:text-white">Not Returned</TabsTrigger>
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
                <AnimatePresence mode="wait">
                    {activeTab === 'requesters' ? (
                        <RequestersManager />
                    ) : editingTransaction ? (
                        <MaterialForm
                            key={editingTransaction.id}
                            type={editingTransaction.transaction_type}
                            editMode={true}
                            existingTransaction={editingTransaction}
                            onBack={() => setEditingTransaction(null)}
                            onSuccess={handleEditSuccess}
                            onDelete={async () => {
                                const password = prompt('Please enter the delete password:');
                                if (password) {
                                    try {
                                        await deleteMutation.mutateAsync({ id: editingTransaction.id, password });
                                    } catch (error) {
                                        // Error is already handled by the mutation
                                    }
                                } else if (password === '') {
                                    toast.error('Password is required');
                                }
                            }}
                        />
                    ) : isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <Card className="border-0 shadow-lg">
                            <CardContent className="py-20 text-center">
                                <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                <h3 className="text-xl font-semibold text-slate-700 mb-2">No Transactions Found</h3>
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
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => toggleCardExpansion(transaction.id)}
                                                        className="text-slate-500 hover:text-slate-700 p-1"
                                                    >
                                                        {expandedCards.has(transaction.id) ? (
                                                            <ChevronUp className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <div className="flex gap-2">
                                                        {transaction.approval_status === 'pending' ? (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => setEditingTransaction(transaction)}
                                                                    className="bg-blue-600 hover:bg-blue-700"
                                                                >
                                                                    <Edit2 className="w-4 h-4 mr-1" />
                                                                    Edit
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => approveRequestMutation.mutate({ id: transaction.id, status: 'approved' })}
                                                                    className="bg-green-600 hover:bg-green-700"
                                                                    disabled={approveRequestMutation.isPending}
                                                                >
                                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => approveRequestMutation.mutate({ id: transaction.id, status: 'declined' })}
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                    disabled={approveRequestMutation.isPending}
                                                                >
                                                                    <XCircle className="w-4 h-4 mr-1" />
                                                                    Decline
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Badge className={transaction.approval_status === 'approved' ? 'bg-green-600' : 'bg-red-600'}>
                                                                {transaction.approval_status === 'approved' ? 'Already Approved' : 'Already Declined'}
                                                            </Badge>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => printTransaction(transaction)}
                                                        >
                                                            <Printer className="w-4 h-4 mr-1" />
                                                            Print
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={async () => {
                                                                const password = prompt('Please enter the delete password:');
                                                                if (password) {
                                                                    if (window.confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
                                                                        try {
                                                                            await deleteMutation.mutateAsync({ id: transaction.id, password });
                                                                        } catch (error) {
                                                                            // Error is already handled by the mutation
                                                                        }
                                                                    }
                                                                } else if (password === '') {
                                                                    toast.error('Password is required');
                                                                }
                                                            }}
                                                            disabled={deleteMutation.isPending}
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-1" />
                                                            Delete
                                                        </Button>
                                                    </div>
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
                                                                <Badge
                                                                    variant={transaction.transaction_type === 'return' ? 'default' : 'secondary'}
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

                                                <div className="ml-16 md:ml-0">
                                                    {/* Collapsed view - horizontal layout */}
                                                    {!expandedCards.has(transaction.id) && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {transaction.materials?.map((material, idx) => (
                                                                <Badge
                                                                    key={idx}
                                                                    variant="outline"
                                                                    className={`${
                                                                        material.returned
                                                                            ? 'bg-green-50 border-green-200 text-green-800'
                                                                            : transaction.transaction_type === 'take'
                                                                            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                                                                            : 'bg-slate-50 border-slate-200'
                                                                    }`}
                                                                >
                                                                    {material.name}
                                                                    <span className="ml-1 text-slate-500">
                                                                        {transaction.transaction_type === 'return' && material.return_quantity
                                                                            ? `(${material.return_quantity}/${material.quantity} ${material.unit})`
                                                                            : `(${material.quantity} ${material.unit})`
                                                                        }
                                                                    </span>
                                                                    {material.reference_number && (
                                                                        <span className="ml-2 font-mono text-xs">
                                                                            #{material.reference_number}
                                                                        </span>
                                                                    )}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Expanded view - vertical layout with status history */}
                                                    {expandedCards.has(transaction.id) && (
                                                        <div className="space-y-3">
                                                            {transaction.materials?.map((material, idx) => (
                                                                <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={`${
                                                                                material.returned
                                                                                    ? 'bg-green-50 border-green-200 text-green-800'
                                                                                    : transaction.transaction_type === 'take'
                                                                                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                                                                                    : 'bg-slate-50 border-slate-200'
                                                                            }`}
                                                                        >
                                                                            {material.name}
                                                                            <span className="ml-1 text-slate-500">
                                                                                {transaction.transaction_type === 'return' && material.return_quantity
                                                                                    ? `(${material.return_quantity}/${material.quantity} ${material.unit})`
                                                                                    : `(${material.quantity} ${material.unit})`
                                                                                }
                                                                            </span>
                                                                            {material.reference_number && (
                                                                                <span className="ml-2 font-mono text-xs">
                                                                                    #{material.reference_number}
                                                                                </span>
                                                                            )}
                                                                        </Badge>
                                                                    </div>

                                                                {transaction.transaction_type === 'take' && material.reference_number && (
                                                                    <ReturnHistoryDisplay
                                                                        referenceNumber={material.reference_number}
                                                                        totalQuantity={material.quantity}
                                                                        materialName={material.name}
                                                                        materialUnit={material.unit}
                                                                    />
                                                                )}

                                                                {!material.reference_number && (
                                                                    <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1 ml-2">
                                                                        <div className="text-gray-700 font-medium">
                                                                            📦 {material.name} - No reference number
                                                                        </div>
                                                                        <div className="text-gray-600 text-xs mt-1">
                                                                            This material cannot be returned (missing reference number)
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

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
                </AnimatePresence>
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
                            disabled={isBulkPrinting}
                            className="bg-slate-700 hover:bg-slate-800"
                        >
                            {isBulkPrinting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print
                                </>
                            )}
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

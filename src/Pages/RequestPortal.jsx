import React, { useState, useEffect } from 'react';
import { Card } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import { Package, RotateCcw, History, ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/Components/supbase";
import MaterialForm from "@/Components/MaterialForm";

export default function RequestPortal() {
    const [activeForm, setActiveForm] = useState(null);
    const [notificationCount, setNotificationCount] = useState(0);

    const { data: transactions = [] } = useQuery({
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
        const seenIds = JSON.parse(localStorage.getItem('seenRequestIds') || '[]');
        const newApprovals = transactions.filter(t => 
            (t.approval_status === 'approved' || t.approval_status === 'declined') && 
            !seenIds.includes(t.id)
        );
        setNotificationCount(newApprovals.length);
    }, [transactions]);

    const handleSuccess = () => {
        setActiveForm(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
            {/* Header */}
            <header className="bg-[#dc6b2f] text-white py-6 px-4 shadow-lg">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
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
                            className="h-12 w-12 md:h-16 md:w-16 object-contain"
                        />
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                                AKK Engineering
                            </h1>
                            <p className="text-slate-300 text-sm mt-1">Pte. Ltd.</p>
                        </div>
                    </div>
                    <Link to={createPageUrl('RequestHistory')}>
                        <Button 
                            variant="outline" 
                            className="border-white/30 text-white hover:bg-white/10 bg-transparent relative"
                        >
                            <History className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">View History</span>
                            {notificationCount > 0 && (
                                <Badge className="absolute -top-2 -right-2 bg-red-600 text-white h-5 w-5 flex items-center justify-center p-0 text-xs">
                                    {notificationCount > 4 ? '4+' : notificationCount}
                                </Badge>
                            )}
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
                <AnimatePresence mode="wait">
                    {!activeForm ? (
                        <motion.div
                            key="selection"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            {/* Title */}
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
                                    Material Request
                                </h2>
                                <p className="text-slate-600 max-w-md mx-auto">
                                    Submit a request for materials to take or return
                                </p>
                            </div>

                            {/* Selection Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                {/* Take Materials */}
                                <motion.div
                                    whileHover={{ scale: 1.02, y: -4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Card
                                        onClick={() => setActiveForm('take')}
                                        className="cursor-pointer border-0 shadow-xl bg-white overflow-hidden group"
                                    >
                                        <div className="p-8 md:p-10">
                                            <div className="w-16 h-16 bg-[#f97316]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#f97316]/20 transition-colors">
                                                <Package className="w-8 h-8 text-[#f97316]" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-slate-800 mb-2">
                                                Take Materials
                                            </h3>
                                            <p className="text-slate-500 mb-6">
                                                Request materials from inventory
                                            </p>
                                            <div className="flex items-center text-[#f97316] font-medium">
                                                Start Request
                                                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                        <div className="h-2 bg-[#f97316]" />
                                    </Card>
                                </motion.div>

                                {/* Return Materials */}
                                <motion.div
                                    whileHover={{ scale: 1.02, y: -4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Card
                                        onClick={() => setActiveForm('return')}
                                        className="cursor-pointer border-0 shadow-xl bg-white overflow-hidden group"
                                    >
                                        <div className="p-8 md:p-10">
                                            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                                                <RotateCcw className="w-8 h-8 text-emerald-600" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-slate-800 mb-2">
                                                Return Materials
                                            </h3>
                                            <p className="text-slate-500 mb-6">
                                                Return materials to inventory
                                            </p>
                                            <div className="flex items-center text-emerald-600 font-medium">
                                                Start Request
                                                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                        <div className="h-2 bg-emerald-600" />
                                    </Card>
                                </motion.div>
                            </div>
                        </motion.div>
                    ) : (
                        <MaterialForm
                            key={activeForm}
                            type={activeForm}
                            onBack={() => setActiveForm(null)}
                            onSuccess={handleSuccess}
                        />
                    )}
                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-slate-200 py-3 px-4">
                <p className="text-center text-slate-500 text-sm">
                    © {new Date().getFullYear()} AKK Engineering Pte. Ltd. — Material Tracking System
                </p>
            </footer>
        </div>
    );
}
import React from 'react';
import { Card } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { ClipboardList, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils";

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
            {/* Header */}
            <header className="bg-[#dc6b2f] text-white py-8 px-4 shadow-lg">
                <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
                    <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693f9bfa0ecf7ec8a55925fd/f4b1b086f_akklogo.jpg"
                        alt="AKK Engineering Logo"
                        className="h-16 w-16 object-contain"
                    />
                    <div className="text-center">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                            AKK Engineering
                        </h1>
                        <p className="text-slate-200 text-lg mt-1">Pte. Ltd.</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-12 md:py-20">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
                        Material Tracking System
                    </h2>
                    <p className="text-slate-600 text-lg">
                        Select your portal to continue
                    </p>
                </div>

                {/* Portal Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    {/* Worker Portal */}
                    <Link to={createPageUrl('RequestPortal')}>
                        <motion.div
                            whileHover={{ scale: 1.03, y: -8 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Card className="cursor-pointer border-0 shadow-2xl bg-white overflow-hidden group h-full">
                                <div className="p-10 md:p-12 text-center">
                                    <div className="w-24 h-24 bg-[#dc6b2f]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#dc6b2f]/20 transition-colors">
                                        <ClipboardList className="w-12 h-12 text-[#dc6b2f]" />
                                    </div>
                                    <h3 className="text-3xl font-bold text-slate-800 mb-4">
                                        Fill Out Request
                                    </h3>
                                    <p className="text-slate-600 text-lg mb-8">
                                        Submit material take or return requests and view your request history
                                    </p>
                                    <Button className="bg-[#dc6b2f] hover:bg-[#c85a23] text-white px-8 py-6 text-lg">
                                        Enter Portal
                                    </Button>
                                </div>
                                <div className="h-3 bg-[#dc6b2f]" />
                            </Card>
                        </motion.div>
                    </Link>

                    {/* Admin Portal */}
                    <Link to={createPageUrl('AdminLogin')}>
                        <motion.div
                            whileHover={{ scale: 1.03, y: -8 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Card className="cursor-pointer border-0 shadow-2xl bg-white overflow-hidden group h-full">
                                <div className="p-10 md:p-12 text-center">
                                    <div className="w-24 h-24 bg-slate-700/10 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-slate-700/20 transition-colors">
                                        <Shield className="w-12 h-12 text-slate-700" />
                                    </div>
                                    <h3 className="text-3xl font-bold text-slate-800 mb-4">
                                        Admin
                                    </h3>
                                    <p className="text-slate-600 text-lg mb-8">
                                        Manage requests, approve or decline, and access full history
                                    </p>
                                    <Button className="bg-slate-700 hover:bg-slate-800 text-white px-8 py-6 text-lg">
                                        Admin Login
                                    </Button>
                                </div>
                                <div className="h-3 bg-slate-700" />
                            </Card>
                        </motion.div>
                    </Link>
                </div>
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
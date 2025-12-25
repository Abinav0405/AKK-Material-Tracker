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
                        src="/akk logo.jpg"
                        alt="AKK Engineering Logo"
                        className="h-16 w-16 object-contain"
                    />
                    <div className="text-center">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'Calibri, sans-serif' }}>
                            AKK ENGINEERING PTE. LTD.
                        </h1>
                        <p className="text-slate-200 text-sm mt-1" style={{ fontFamily: 'Aptos Narrow, Aptos, sans-serif' }}>
                            15 Kaki Bukit Rd 4, #01-50, Singapore 417808
                        </p>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {/* Worker Portal */}
                    <Link to={createPageUrl('WorkerLogin')}>
                        <motion.div
                            whileHover={{ scale: 1.03, y: -8 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Card className="cursor-pointer border-0 shadow-2xl bg-white overflow-hidden group h-full">
                                <div className="p-8 md:p-10 text-center">
                                    <div className="w-20 h-20 bg-[#dc6b2f]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#dc6b2f]/20 transition-colors">
                                        <ClipboardList className="w-10 h-10 text-[#dc6b2f]" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-4">
                                        Worker Portal
                                    </h3>
                                    <p className="text-slate-600 text-base mb-6">
                                        Submit material take or return requests
                                    </p>
                                    <Button className="bg-[#dc6b2f] hover:bg-[#c85a23] text-white px-6 py-4 text-base">
                                        Worker Login
                                    </Button>
                                </div>
                                <div className="h-3 bg-[#dc6b2f]" />
                            </Card>
                        </motion.div>
                    </Link>

                    {/* Requestor Portal */}
                    <Link to={createPageUrl('RequestorLogin')}>
                        <motion.div
                            whileHover={{ scale: 1.03, y: -8 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Card className="cursor-pointer border-0 shadow-2xl bg-white overflow-hidden group h-full">
                                <div className="p-8 md:p-10 text-center">
                                    <div className="w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-green-500/20 transition-colors">
                                        <ClipboardList className="w-10 h-10 text-green-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-4">
                                        Requestor Portal
                                    </h3>
                                    <p className="text-slate-600 text-base mb-6">
                                        View and manage your material requests
                                    </p>
                                    <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 text-base">
                                        Requestor Login
                                    </Button>
                                </div>
                                <div className="h-3 bg-green-600" />
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
                                <div className="p-8 md:p-10 text-center">
                                    <div className="w-20 h-20 bg-slate-700/10 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-slate-700/20 transition-colors">
                                        <Shield className="w-10 h-10 text-slate-700" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-4">
                                        Admin Portal
                                    </h3>
                                    <p className="text-slate-600 text-base mb-6">
                                        Manage requests and access full history
                                    </p>
                                    <Button className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-4 text-base">
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
                    © {new Date().getFullYear()} AKK ENGINEERING PTE. LTD. — Material Tracking System
                </p>
            </footer>
        </div>
    );
}

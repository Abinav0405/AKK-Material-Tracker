import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/Components/supbase";
import { createPageUrl } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Shield, User, Mail, Lock, ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            toast.error(error.message);
            setIsLoading(false);
            return;
        }

        sessionStorage.setItem('adminLoggedIn', 'true');
        sessionStorage.setItem('adminName', name);
        sessionStorage.setItem('adminEmail', data.user.email);
        setIsLoading(false);
        navigate(createPageUrl('AdminDashboard'));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Back to Home Button */}
                <Link to={createPageUrl('Home')}>
                    <Button
                        variant="ghost"
                        className="mb-6 text-slate-600 hover:text-slate-900"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Button>
                </Link>

                {/* Login Card */}
                <Card className="border-0 shadow-2xl overflow-hidden">
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-8">
                        <div className="flex items-center justify-center mb-6">
                            {/* Logo */}
                            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-sm overflow-hidden">
                                <img 
                                    src="/akk logo.jpg"
                                    alt="AKK Engineering Logo"
                                    className="h-full w-full object-cover drop-shadow-lg"
                                />
                            </div>
                        </div>
                        <CardHeader className="p-0 text-center">
                            <CardTitle className="text-3xl font-bold mb-2">
                                Admin Portal
                            </CardTitle>
                            <CardDescription className="text-slate-200 text-base">
                                Secure access to the administration dashboard
                            </CardDescription>
                        </CardHeader>
                    </div>

                    {/* Form Section */}
                    <CardContent className="p-8">
                        <form onSubmit={handleLogin} className="space-y-6">
                            {/* Name Field */}
                            <div className="space-y-2">
                                <label 
                                    htmlFor="name" 
                                    className="text-sm font-semibold text-slate-700 flex items-center gap-2"
                                >
                                    <User className="w-4 h-4" />
                                    Name
                                </label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    placeholder="Enter your name"
                                    className="h-12 text-base border-slate-200 focus:border-slate-700 focus:ring-slate-700 transition-colors"
                                />
                            </div>

                            {/* Email Field */}
                            <div className="space-y-2">
                                <label 
                                    htmlFor="email" 
                                    className="text-sm font-semibold text-slate-700 flex items-center gap-2"
                                >
                                    <Mail className="w-4 h-4" />
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="admin@example.com"
                                    className="h-12 text-base border-slate-200 focus:border-slate-700 focus:ring-slate-700 transition-colors"
                                />
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label 
                                    htmlFor="password" 
                                    className="text-sm font-semibold text-slate-700 flex items-center gap-2"
                                >
                                    <Lock className="w-4 h-4" />
                                    Password
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="Enter your password"
                                    className="h-12 text-base border-slate-200 focus:border-slate-700 focus:ring-slate-700 transition-colors"
                                />
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 text-base font-semibold bg-slate-700 hover:bg-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                                size="lg"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Logging in...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-5 h-5 mr-2" />
                                        Login to Dashboard
                                    </>
                                )}
                            </Button>
                        </form>

                        {/* Footer Note */}
                        <div className="mt-6 pt-6 border-t border-slate-200">
                            <p className="text-xs text-center text-slate-500">
                                🔒 Your credentials are securely encrypted
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Company Info */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-slate-600 font-semibold" style={{ fontFamily: 'Calibri, sans-serif' }}>
                        AKK ENGINEERING PTE. LTD.
                    </p>
                    <p className="text-xs text-slate-500 mt-1" style={{ fontFamily: 'Aptos Narrow, Aptos, sans-serif' }}>
                        15 Kaki Bukit Rd 4, #01-50, Singapore 417808
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
import React, { useState } from 'react';
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Textarea } from "@/Components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { ArrowLeft, Send, Package, RotateCcw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import MaterialInput from "./MaterialInput";
import { supabase } from "@/Components/supbase";
import { toast } from "sonner";

export default function MaterialForm({ type, onBack, onSuccess }) {
    const isReturn = type === 'return';
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        worker_name: '',
        worker_id: '',
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        transaction_time: format(new Date(), 'HH:mm'),
        notes: ''
    });
    
    const [materials, setMaterials] = useState([{ name: '', quantity: 1, unit: 'pcs' }]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.worker_name.trim() || !formData.worker_id.trim()) {
            toast.error('Please fill in worker name and ID');
            return;
        }
        
        const validMaterials = materials.filter(m => m.name.trim());
        if (validMaterials.length === 0) {
            toast.error('Please add at least one material');
            return;
        }

        setIsSubmitting(true);
        
        try {
            const transaction = {
                ...formData,
                transaction_type: type,
                materials: validMaterials,
                approval_status: 'pending'
            };

            const { error } = await supabase
                .from('transactions')
                .insert([transaction]);

            if (error) throw error;

            toast.success(`Request submitted successfully! Awaiting approval.`);
            onSuccess();
        } catch (error) {
            console.error('Error submitting request:', error);
            toast.error('Failed to submit request');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-2xl mx-auto"
        >
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className={`${isReturn ? 'bg-emerald-600' : 'bg-[#f97316]'} text-white rounded-t-xl`}>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack}
                            className="text-white hover:bg-white/20"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            {isReturn ? (
                                <RotateCcw className="w-6 h-6" />
                            ) : (
                                <Package className="w-6 h-6" />
                            )}
                            <CardTitle className="text-xl font-semibold">
                                {isReturn ? 'Return Materials' : 'Take Materials'}
                            </CardTitle>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Worker Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Worker Name</label>
                                <Input
                                    placeholder="Enter full name"
                                    value={formData.worker_name}
                                    onChange={(e) => handleInputChange('worker_name', e.target.value)}
                                    className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Worker ID</label>
                                <Input
                                    placeholder="Enter ID number"
                                    value={formData.worker_id}
                                    onChange={(e) => handleInputChange('worker_id', e.target.value)}
                                    className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/20"
                                />
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Date</label>
                                <Input
                                    type="date"
                                    value={formData.transaction_date}
                                    onChange={(e) => handleInputChange('transaction_date', e.target.value)}
                                    className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Time</label>
                                <Input
                                    type="time"
                                    value={formData.transaction_time}
                                    onChange={(e) => handleInputChange('transaction_time', e.target.value)}
                                    className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/20"
                                />
                            </div>
                        </div>

                        {/* Materials */}
                        <div className="pt-4 border-t border-slate-100">
                            <MaterialInput materials={materials} setMaterials={setMaterials} />
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Notes (Optional)</label>
                            <Textarea
                                placeholder="Any additional notes..."
                                value={formData.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/20 min-h-[80px]"
                            />
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-6 text-lg font-medium ${
                                isReturn 
                                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                                    : 'bg-[#f97316] hover:bg-[#ea580c]'
                            }`}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5 mr-2" />
                            )}
                            {isSubmitting ? 'Submitting...' : `Submit ${isReturn ? 'Return' : 'Take'} Record`}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    );
}
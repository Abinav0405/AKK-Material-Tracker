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
import { sendBrowserNotification } from "@/lib/emailNotification";

export default function MaterialForm({ type, onBack, onSuccess, editMode = false, existingTransaction = null, onDelete = null }) {
    const isReturn = type === 'return';
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState(
        editMode && existingTransaction ? {
            worker_name: existingTransaction.worker_name || '',
            worker_id: existingTransaction.worker_id || '',
            transaction_date: existingTransaction.transaction_date || format(new Date(), 'yyyy-MM-dd'),
            transaction_time: existingTransaction.transaction_time || format(new Date(), 'HH:mm'),
            notes: existingTransaction.notes || ''
        } : {
            worker_name: sessionStorage.getItem('workerName') || sessionStorage.getItem('adminName') || '',
            worker_id: sessionStorage.getItem('workerId') || '',
            transaction_date: format(new Date(), 'yyyy-MM-dd'),
            transaction_time: format(new Date(), 'HH:mm'),
            notes: ''
        }
    );

    const [materials, setMaterials] = useState(
        editMode && existingTransaction?.materials?.length > 0
            ? existingTransaction.materials
            : isReturn
            ? [{ name: '', quantity: 1, unit: 'pcs', reference_number: '' }]
            : [{ name: '', quantity: 1, unit: 'pcs' }]
    );

    // Auto-fill material details when reference number is entered
    const handleReferenceNumberChange = async (index, referenceNumber) => {
        const updated = [...materials];
        updated[index] = { ...updated[index], reference_number: referenceNumber };
        setMaterials(updated);

        // Auto-fill material details if reference number is provided
        if (referenceNumber.trim() && isReturn) {
            try {
                const { data: allTransactions, error } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('transaction_type', 'take')
                    .eq('approval_status', 'approved');

                if (error) throw error;

                let foundMaterial = null;
                // Search through all approved take transactions for the reference number
                for (const transaction of allTransactions || []) {
                    const material = transaction.materials?.find(m =>
                        m.reference_number === referenceNumber.trim() && !m.returned
                    );
                    if (material) {
                        foundMaterial = material;
                        break;
                    }
                }

                if (foundMaterial) {
                    // Auto-fill the material details
                    updated[index] = {
                        ...updated[index],
                        name: foundMaterial.name,
                        quantity: foundMaterial.quantity,
                        unit: foundMaterial.unit,
                        reference_number: referenceNumber.trim()
                    };
                    setMaterials(updated);
                }
            } catch (error) {
                console.error('Error fetching material details:', error);
            }
        }
    };

    // Add a new reference number input for return form
    const addReferenceNumberInput = () => {
        setMaterials([...materials, { name: '', quantity: 1, unit: 'pcs', reference_number: '' }]);
    };

    // Remove a reference number input
    const removeReferenceNumberInput = (index) => {
        if (materials.length > 1) {
            setMaterials(materials.filter((_, i) => i !== index));
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Generate reference number for a single material
    const generateReferenceNumber = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    // Generate sequential reference numbers for multiple materials
    const generateSequentialReferenceNumbers = (count) => {
        const startNumber = Math.floor(100000 + Math.random() * 900000);
        const numbers = [];
        for (let i = 0; i < count; i++) {
            numbers.push((startNumber + i).toString());
        }
        return numbers;
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
            let processedMaterials = validMaterials;

            // For take requests, generate reference numbers and add tracking fields
            if (type === 'take' && !editMode) {
                if (validMaterials.length === 1) {
                    // Single material - random reference number
                    processedMaterials = validMaterials.map(material => ({
                        ...material,
                        reference_number: generateReferenceNumber(),
                        returned: false,
                        return_date: null,
                        taken_date: format(new Date(), 'yyyy-MM-dd HH:mm')
                    }));
                } else {
                    // Multiple materials - sequential reference numbers
                    const referenceNumbers = generateSequentialReferenceNumbers(validMaterials.length);
                    processedMaterials = validMaterials.map((material, index) => ({
                        ...material,
                        reference_number: referenceNumbers[index],
                        returned: false,
                        return_date: null,
                        taken_date: format(new Date(), 'yyyy-MM-dd HH:mm')
                    }));
                }
            }

            // For return requests, find and update the matching materials
            if (type === 'return' && !editMode) {
                const validReferenceNumbers = materials
                    .map(m => m.reference_number?.trim())
                    .filter(ref => ref);

                if (validReferenceNumbers.length === 0) {
                    toast.error('Please enter at least one reference number');
                    setIsSubmitting(false);
                    return;
                }

                // Find all take transactions with approved status
                const { data: allTransactions, error: fetchError } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('transaction_type', 'take')
                    .eq('approval_status', 'approved');

                if (fetchError) throw fetchError;

                const returnMaterials = [];
                const transactionUpdates = new Map(); // transaction.id -> updated materials

                // Process each reference number
                for (const referenceNumber of validReferenceNumbers) {
                    let foundMaterial = null;
                    let transactionToUpdate = null;

                    // Search through all approved take transactions for the reference number
                    for (const transaction of allTransactions || []) {
                        const material = transaction.materials?.find(m =>
                            m.reference_number === referenceNumber && !m.returned
                        );
                        if (material) {
                            foundMaterial = material;
                            transactionToUpdate = transaction;
                            break;
                        }
                    }

                    if (!foundMaterial || !transactionToUpdate) {
                        toast.error(`Reference number ${referenceNumber} not found or material already returned`);
                        setIsSubmitting(false);
                        return;
                    }

                    // Add to return materials list
                    returnMaterials.push({
                        ...foundMaterial,
                        reference_number: referenceNumber,
                        returned: true,
                        return_date: format(new Date(), 'yyyy-MM-dd HH:mm'),
                        taken_date: foundMaterial.taken_date
                    });

                    // Prepare transaction update
                    if (!transactionUpdates.has(transactionToUpdate.id)) {
                        transactionUpdates.set(transactionToUpdate.id, transactionToUpdate.materials);
                    }

                    const currentMaterials = transactionUpdates.get(transactionToUpdate.id);
                    const updatedMaterials = currentMaterials.map(material =>
                        material.reference_number === referenceNumber
                            ? {
                                ...material,
                                returned: true,
                                return_date: format(new Date(), 'yyyy-MM-dd HH:mm')
                            }
                            : material
                    );
                    transactionUpdates.set(transactionToUpdate.id, updatedMaterials);
                }

                // Update all affected transactions
                for (const [transactionId, updatedMaterials] of transactionUpdates) {
                    const { error: updateError } = await supabase
                        .from('transactions')
                        .update({ materials: updatedMaterials })
                        .eq('id', transactionId);

                    if (updateError) throw updateError;
                }

                processedMaterials = returnMaterials;
            }

            if (editMode && existingTransaction) {
                const updatedTransaction = { ...formData, materials: processedMaterials };

                const { error } = await supabase
                    .from('transactions')
                    .update(updatedTransaction)
                    .eq('id', existingTransaction.id);

                if (error) throw error;

                toast.success('Request updated successfully!');
            } else {
                const transaction = {
                    ...formData,
                    transaction_type: type,
                    materials: processedMaterials,
                    approval_status: 'pending'
                };

                const { data: insertedData, error } = await supabase
                    .from('transactions')
                    .insert([transaction])
                    .select()
                    .single();

                if (error) throw error;

                toast.success('Request submitted successfully! Awaiting approval.');
            }
            onSuccess();
        } catch (error) {
            console.error('Error submitting request:', error);
            toast.error(editMode ? 'Failed to update request' : 'Failed to submit request');
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
                            {isReturn ? <RotateCcw className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                            <CardTitle className="text-xl font-semibold">
                                {editMode ? `Edit ${isReturn ? 'Return' : 'Take'} Request` : isReturn ? 'Return Materials' : 'Take Materials'}
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
                            {isReturn ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-slate-700">Reference Numbers</label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={addReferenceNumberInput}
                                                className="text-[#1e3a5f] border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/5"
                                            >
                                                <Package className="w-4 h-4 mr-1" />
                                                Add Reference
                                            </Button>
                                        </div>
                                        <div className="space-y-3">
                                            {materials.map((material, index) => (
                                                <div key={index} className="flex gap-2 items-start">
                                                    <div className="flex-1 space-y-2">
                                                        <Input
                                                            placeholder="Enter reference number (e.g., 482739)"
                                                            value={material.reference_number || ''}
                                                            onChange={(e) => handleReferenceNumberChange(index, e.target.value)}
                                                            className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/20"
                                                        />
                                                        {material.name && (
                                                            <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                                                                {material.name} - {material.quantity} {material.unit}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {materials.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeReferenceNumberInput(index)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 mt-1"
                                                        >
                                                            <ArrowLeft className="w-4 h-4 rotate-45" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-500">Enter reference numbers from your take requests to mark materials as returned</p>
                                    </div>
                                </div>
                            ) : (
                                <MaterialInput materials={materials} setMaterials={setMaterials} />
                            )}
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

                        {/* Submit / Delete */}
                        <div className="flex gap-3">
                            {editMode && onDelete && (
                                <Button
                                    type="button"
                                    onClick={onDelete}
                                    variant="destructive"
                                    className="flex-1 py-6 text-lg font-medium bg-red-600 hover:bg-red-700"
                                >
                                    Delete Request
                                </Button>
                            )}
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className={`${editMode && onDelete ? 'flex-1' : 'w-full'} py-6 text-lg font-medium ${
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
                                {isSubmitting 
                                    ? (editMode ? 'Updating...' : 'Submitting...') 
                                    : (editMode ? 'Update Request' : `Submit ${isReturn ? 'Return' : 'Take'} Record`)
                                }
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    );
}

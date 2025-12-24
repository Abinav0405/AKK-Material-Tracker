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
        updated[index] = { ...updated[index], reference_number: referenceNumber, loading: true };
        setMaterials(updated);

                // Auto-fill material details if reference number is provided
        if (referenceNumber.trim() && isReturn) {
            try {
                // Get current user info
                const currentWorkerId = sessionStorage.getItem('workerId');
                const currentWorkerName = sessionStorage.getItem('workerName');

                if (!currentWorkerId) {
                    toast.error('User session expired. Please log in again.');
                    updated[index] = {
                        ...updated[index],
                        name: '',
                        quantity: 1,
                        available_quantity: 0,
                        unit: 'pcs',
                        loading: false,
                        error: 'Please log in again'
                    };
                    setMaterials(updated);
                    return;
                }

                // First, find the take transaction with this reference number that belongs to the current user
                const { data: takeTransactions, error: takeError } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('transaction_type', 'take')
                    .eq('approval_status', 'approved')
                    .eq('worker_id', currentWorkerId); // Only allow returns for materials taken by this user

                if (takeError) throw takeError;

                let foundMaterial = null;
                let takeTransaction = null;

                // Search through the user's approved take transactions for the reference number
                for (const transaction of takeTransactions || []) {
                    const material = transaction.materials?.find(m =>
                        m.reference_number === referenceNumber.trim()
                    );
                    if (material) {
                        foundMaterial = material;
                        takeTransaction = transaction;
                        console.log(`Found material in user's take transaction ${transaction.id}:`, {
                            name: material.name,
                            quantity: material.quantity,
                            returned_quantity: material.returned_quantity,
                            returned: material.returned,
                            return_declined: material.return_declined,
                            worker_id: transaction.worker_id,
                            worker_name: transaction.worker_name
                        });
                        break;
                    }
                }

                if (foundMaterial && takeTransaction) {
                    // Now calculate actually returned by checking ALL approved return transactions for this reference number
                    const { data: returnTransactions, error: returnError } = await supabase
                        .from('transactions')
                        .select('*')
                        .eq('transaction_type', 'return')
                        .eq('approval_status', 'approved');

                    if (returnError) throw returnError;

                    // Find all approved returns for this reference number and sum the quantities
                    let totalActuallyReturned = 0;
                    for (const returnTxn of returnTransactions || []) {
                        const returnMaterial = returnTxn.materials?.find(m =>
                            m.reference_number === referenceNumber.trim()
                        );
                        if (returnMaterial && returnMaterial.return_quantity) {
                            totalActuallyReturned += returnMaterial.return_quantity;
                        }
                    }

                    console.log(`Calculated total actually returned from approved returns: ${totalActuallyReturned}`);

                    // Calculate available quantity based on approved returns only
                    let availableQuantity;
                    if (foundMaterial.returned || totalActuallyReturned >= foundMaterial.quantity) {
                        // Fully returned - nothing available
                        availableQuantity = 0;
                    } else {
                        // Available = total taken - actually returned (only approved returns count)
                        availableQuantity = Math.max(0, foundMaterial.quantity - totalActuallyReturned);

                        // Debug logging
                        console.log(`Material: ${foundMaterial.name}`);
                        console.log(`Total taken: ${foundMaterial.quantity}`);
                        console.log(`Actually returned (from approved returns): ${totalActuallyReturned}`);
                        console.log(`Available: ${availableQuantity}`);
                        console.log(`Stored returned_quantity (may be outdated): ${foundMaterial.returned_quantity}`);
                        console.log(`Declined status: ${foundMaterial.return_declined}`);
                    }

                    // Auto-fill the material details
                    updated[index] = {
                        ...updated[index],
                        name: foundMaterial.name,
                        quantity: foundMaterial.quantity,
                        available_quantity: availableQuantity,
                        unit: foundMaterial.unit,
                        reference_number: referenceNumber.trim(),
                        loading: false
                    };
                    setMaterials(updated);
                } else {
                    // Material not found
                    updated[index] = {
                        ...updated[index],
                        name: '',
                        quantity: 1,
                        available_quantity: 0,
                        unit: 'pcs',
                        loading: false,
                        error: 'Invalid reference number'
                    };
                    setMaterials(updated);
                }
            } catch (error) {
                console.error('Error fetching material details:', error);
                updated[index] = {
                    ...updated[index],
                    loading: false,
                    error: 'Error loading material details'
                };
                setMaterials(updated);
            }
        } else {
            // Clear material details if reference number is empty
            updated[index] = {
                ...updated[index],
                name: '',
                quantity: 1,
                available_quantity: 0,
                unit: 'pcs',
                loading: false,
                error: ''
            };
            setMaterials(updated);
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
                // Ensure all materials have valid quantities (convert strings to numbers)
                const materialsWithDefaults = validMaterials.map(material => {
                    const qty = material.quantity;
                    let numericQty = 1; // default

                    if (typeof qty === 'string' && qty.trim() === '') {
                        numericQty = 1; // empty string -> 1
                    } else if (typeof qty === 'string') {
                        const parsed = parseInt(qty.trim());
                        numericQty = isNaN(parsed) || parsed < 1 ? 1 : parsed;
                    } else if (typeof qty === 'number' && qty >= 1) {
                        numericQty = qty;
                    }

                    return {
                        ...material,
                        quantity: numericQty
                    };
                });

                // Always generate sequential reference numbers for consistency
                const referenceNumbers = generateSequentialReferenceNumbers(materialsWithDefaults.length);
                processedMaterials = materialsWithDefaults.map((material, index) => ({
                    ...material,
                    reference_number: referenceNumbers[index],
                    returned: false,
                    returned_quantity: 0, // Track returned quantity for partial returns
                    return_date: null,
                    return_declined: false,
                    return_declined_by: null,
                    return_declined_date: null,
                    taken_date: format(new Date(), 'yyyy-MM-dd HH:mm')
                }));

                console.log(`Generated ${referenceNumbers.length} reference numbers for take request:`, referenceNumbers);
                console.log('Processed materials:', processedMaterials);
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

                // Validate return quantities
                for (const material of materials) {
                    if (material.reference_number && material.name && (!material.return_quantity || material.return_quantity <= 0)) {
                        toast.error(`Please enter a valid return quantity for ${material.name}`);
                        setIsSubmitting(false);
                        return;
                    }
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
                for (const materialInput of materials) {
                    const referenceNumber = materialInput.reference_number?.trim();
                    if (!referenceNumber || !materialInput.name) continue;

                    let foundMaterial = null;
                    let transactionToUpdate = null;

                    // Search through all approved take transactions for the reference number
                    for (const transaction of allTransactions || []) {
                        const material = transaction.materials?.find(m =>
                            m.reference_number === referenceNumber
                        );
                        if (material) {
                            foundMaterial = material;
                            transactionToUpdate = transaction;
                            break;
                        }
                    }

                    if (!foundMaterial || !transactionToUpdate) {
                        toast.error(`Reference number ${referenceNumber} not found`);
                        setIsSubmitting(false);
                        return;
                    }

                    // Check if trying to return more than available
                    const alreadyReturned = foundMaterial.returned_quantity || 0;
                    const availableToReturn = foundMaterial.quantity - alreadyReturned;

                    if (materialInput.return_quantity > availableToReturn) {
                        toast.error(`Cannot return ${materialInput.return_quantity} ${foundMaterial.unit} of ${foundMaterial.name}. Only ${availableToReturn} ${foundMaterial.unit} available to return.`);
                        setIsSubmitting(false);
                        return;
                    }

                    // Calculate new returned quantity
                    const newReturnedQuantity = alreadyReturned + materialInput.return_quantity;
                    const isFullyReturned = newReturnedQuantity >= foundMaterial.quantity;

                    // Add to return materials list
                    returnMaterials.push({
                        ...foundMaterial,
                        reference_number: referenceNumber,
                        return_quantity: materialInput.return_quantity,
                        returned: isFullyReturned,
                        return_date: format(new Date(), 'yyyy-MM-dd HH:mm'),
                        taken_date: foundMaterial.taken_date,
                        returned_quantity: newReturnedQuantity
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
                                returned: isFullyReturned,
                                returned_quantity: newReturnedQuantity,
                                return_date: isFullyReturned ? format(new Date(), 'yyyy-MM-dd HH:mm') : material.return_date
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
                let finalMaterials = processedMaterials;

                // For take requests being edited, ensure all materials have reference numbers
                if (type === 'take') {
                    // Find materials that don't have reference numbers and generate them
                    const materialsWithoutRefs = finalMaterials.filter(m => m.reference_number == null || m.reference_number === '');
                    if (materialsWithoutRefs.length > 0) {
                        // Generate sequential reference numbers for new materials
                        const existingRefs = finalMaterials
                            .map(m => m.reference_number)
                            .filter(ref => ref && ref !== '');
                        const maxExistingRef = existingRefs.length > 0
                            ? Math.max(...existingRefs.map(ref => parseInt(ref)))
                            : Math.floor(100000 + Math.random() * 900000);

                        const newRefs = [];
                        for (let i = 0; i < materialsWithoutRefs.length; i++) {
                            newRefs.push((maxExistingRef + i + 1).toString());
                        }

                        // Update materials with new reference numbers
                        let refIndex = 0;
                        finalMaterials = finalMaterials.map(material => {
                            if (material.reference_number == null || material.reference_number === '') {
                                const newRef = newRefs[refIndex++];
                                return {
                                    ...material,
                                    reference_number: newRef,
                                    returned: false,
                                    returned_quantity: 0,
                                    return_date: null,
                                    return_declined: false,
                                    return_declined_by: null,
                                    return_declined_date: null,
                                    taken_date: format(new Date(), 'yyyy-MM-dd HH:mm')
                                };
                            }
                            return material;
                        });
                    }
                }

                const updatedTransaction = { ...formData, materials: finalMaterials };

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
                                                <div key={`${index}-${material.name}-${material.reference_number}`} className="space-y-3 p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                                                    <div className="flex gap-2 items-start">
                                                        <div className="flex-1 space-y-2">
                                                            <label className="text-sm font-medium text-slate-700">Reference Number</label>
                                                            <Input
                                                                placeholder="Enter reference number (e.g., 482739)"
                                                                value={material.reference_number || ''}
                                                                onChange={(e) => handleReferenceNumberChange(index, e.target.value)}
                                                                className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/20"
                                                            />
                                                        </div>
                                                        {materials.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeReferenceNumberInput(index)}
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 mt-7"
                                                            >
                                                                <ArrowLeft className="w-4 h-4 rotate-45" />
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {material.name && (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <label className="text-sm font-medium text-slate-700">Material</label>
                                                                <div className="text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded border">
                                                                    {material.name}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-sm font-medium text-slate-700">Available Quantity</label>
                                                                <div className="text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded border">
                                                                    {material.available_quantity || material.quantity} {material.unit}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {material.name && (
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium text-slate-700">
                                                                Return Quantity <span className="text-red-500">*</span>
                                                            </label>
                                                            <div className="flex gap-2 items-center">
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Enter quantity to return"
                                                                    value={material.return_quantity ?? ''}
                                                                    onChange={(e) => {
                                                                        const inputValue = e.target.value;

                                                                        // Store the raw input value without any parsing or validation
                                                                        // This prevents any automatic changes to what the user types
                                                                        const updated = [...materials];
                                                                        updated[index] = { ...updated[index], return_quantity: inputValue };
                                                                        setMaterials(updated);
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        // Only validate and parse when the user finishes typing (onBlur)
                                                                        const inputValue = e.target.value.trim();
                                                                        let finalValue;

                                                                        if (inputValue === '') {
                                                                            finalValue = undefined;
                                                                        } else {
                                                                            const parsed = parseFloat(inputValue);
                                                                            if (isNaN(parsed) || parsed <= 0) {
                                                                                finalValue = undefined;
                                                                                toast.error('Please enter a valid quantity greater than 0');
                                                                            } else {
                                                                                // Validate against available quantity
                                                                                const maxQuantity = material.available_quantity || material.quantity;
                                                                                if (parsed > maxQuantity) {
                                                                                    finalValue = undefined;
                                                                                    toast.error(`Cannot return more than ${maxQuantity} ${material.unit}`);
                                                                                    // Reset to empty to let user try again
                                                                                    const updated = [...materials];
                                                                                    updated[index] = { ...updated[index], return_quantity: '' };
                                                                                    setMaterials(updated);
                                                                                    return;
                                                                                } else {
                                                                                    finalValue = parsed;
                                                                                }
                                                                            }
                                                                        }

                                                                        // Update with final validated value
                                                                        const updated = [...materials];
                                                                        updated[index] = { ...updated[index], return_quantity: finalValue };
                                                                        setMaterials(updated);
                                                                    }}
                                                                    className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                                                                    min="0.01"
                                                                    step="0.01"
                                                                />
                                                                <span className="text-sm text-slate-500 whitespace-nowrap">{material.unit}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-500">
                                                                Enter the quantity you want to return (can be partial)
                                                            </p>
                                                        </div>
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

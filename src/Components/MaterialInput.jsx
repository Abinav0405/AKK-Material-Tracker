import React from 'react';
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import { Plus, Trash2, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MaterialInput({ materials, setMaterials, showReferenceNumbers = false, isReturn = false }) {
    // Generate reference number for a single material
    const generateReferenceNumber = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    // Generate sequential reference numbers for multiple materials
    const generateSequentialReferenceNumbers = (count, startNumber = null) => {
        if (!startNumber) {
            startNumber = Math.floor(100000 + Math.random() * 900000);
        }
        const numbers = [];
        for (let i = 0; i < count; i++) {
            numbers.push((startNumber + i).toString());
        }
        return numbers;
    };

    const addMaterial = () => {
        const newMaterials = [...materials, { name: '', quantity: 1, unit: 'pcs' }];
        setMaterials(newMaterials);
    };

    const removeMaterial = (index) => {
        setMaterials(materials.filter((_, i) => i !== index));
    };

    const updateMaterial = (index, field, value) => {
        const updated = [...materials];
        updated[index] = { ...updated[index], [field]: value };
        setMaterials(updated);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Materials List</label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMaterial}
                    className="text-[#1e3a5f] border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/5"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                </Button>
            </div>

            <AnimatePresence>
                {materials.map((material, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex gap-2 items-start"
                    >
                        <div className="flex-1">
                            <Input
                                placeholder="Material name"
                                value={material.name}
                                onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                                className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/20"
                            />
                        </div>
                        <div className="w-20">
                            <Input
                                type="number"
                                min="1"
                                placeholder="Qty"
                                value={material.quantity}
                                onChange={(e) => updateMaterial(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/20"
                            />
                        </div>
                        <div className="w-20">
                            <Input
                                placeholder="Unit"
                                value={material.unit}
                                onChange={(e) => updateMaterial(index, 'unit', e.target.value)}
                                className="border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/20"
                            />
                        </div>
                        {showReferenceNumbers && material.reference_number && (
                            <div className="w-24 flex items-center">
                                <Badge variant="outline" className="font-mono text-xs">
                                    #{material.reference_number}
                                </Badge>
                            </div>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMaterial(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </motion.div>
                ))}
            </AnimatePresence>

            {materials.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                    <p className="text-slate-400 text-sm">No materials added yet</p>
                    <Button
                        type="button"
                        variant="link"
                        onClick={addMaterial}
                        className="text-[#f97316] mt-1"
                    >
                        Add your first item
                    </Button>
                </div>
            )}
        </div>
    );
}

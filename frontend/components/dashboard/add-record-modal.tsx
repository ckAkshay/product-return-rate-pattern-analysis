"use client";

import React, { useState, useEffect } from "react";
import { X, PlusCircle, AlertTriangle, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import { ReturnRecord } from "@/lib/types";

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecord: (newRecord: ReturnRecord, note?: string) => void;
  existingCategories: string[];
  existingWeeks: string[];
}

export function AddRecordModal({
  isOpen,
  onClose,
  onAddRecord,
  existingCategories,
  existingWeeks,
}: AddRecordModalProps) {
  const defaultCategories = [
    "Footwear",
    "Clothing",
    "Electronics",
    "Furniture",
    "Toys",
    "Sports",
    "Beauty",
    "Home & Kitchen",
  ];

  const categories = Array.from(new Set([...defaultCategories, ...existingCategories]));

  const [category, setCategory] = useState<string>("Footwear");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [week, setWeek] = useState<string>("2025-W14");
  const [totalSold, setTotalSold] = useState<number>(150);
  const [totalReturned, setTotalReturned] = useState<number>(25);
  const [note, setNote] = useState<string>("Supplier quality batch test");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Live calculated return rate
  const calculatedRate =
    totalSold > 0 ? Number(((totalReturned / totalSold) * 100).toFixed(2)) : 0;
  const isHighReturn = calculatedRate > 10.0;

  // Reset fields when opening
  useEffect(() => {
    if (isOpen) {
      if (existingWeeks.length > 0) {
        const lastWeek = existingWeeks[existingWeeks.length - 1];
        // Generate next week or default to last week
        const match = lastWeek.match(/(\d{4})-W(\d+)/);
        if (match) {
          const nextWeekNum = String(Number(match[2]) + 1).padStart(2, "0");
          setWeek(`${match[1]}-W${nextWeekNum}`);
        } else {
          setWeek("2025-W14");
        }
      }
    }
  }, [isOpen, existingWeeks]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalSold <= 0) return;

    setIsSubmitting(true);
    const selectedCategory = category === "OTHER" ? customCategory.trim() || "Miscellaneous" : category;

    const record: ReturnRecord = {
      week: week.trim() || "2025-W14",
      category: selectedCategory,
      total_sold: Number(totalSold),
      total_returned: Number(totalReturned),
      return_rate: calculatedRate,
      status: isHighReturn ? "HIGH RETURNS" : "NORMAL",
      flagged: isHighReturn,
    };

    setTimeout(() => {
      onAddRecord(record, note);
      setIsSubmitting(false);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#0b1222] shadow-2xl shadow-indigo-950/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/20">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Add Return Record
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Live Dynamic Input
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Log a new batch to immediately test alerts & threshold detection
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Category Selection */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">
              Product Category <span className="text-rose-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/15 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-white">
                  {c}
                </option>
              ))}
              <option value="OTHER" className="bg-slate-900 text-white">
                + Add Custom Category...
              </option>
            </select>
            {category === "OTHER" && (
              <input
                type="text"
                placeholder="Enter custom category name"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
                className="mt-2 w-full px-3.5 py-2 rounded-xl bg-slate-950/70 border border-indigo-500/50 text-white focus:outline-none"
              />
            )}
          </div>

          {/* Week and Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Reporting Week <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 2025-W14"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/15 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Batch Tag / Reason
              </label>
              <input
                type="text"
                placeholder="e.g. Size defect, damaged box"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/15 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Units Sold and Returned */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Units Sold <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="50000"
                value={totalSold}
                onChange={(e) => setTotalSold(Math.max(1, Number(e.target.value)))}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/15 text-white font-mono focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Units Returned <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                max={totalSold}
                value={totalReturned}
                onChange={(e) => setTotalReturned(Math.max(0, Number(e.target.value)))}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/15 text-white font-mono focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Live Dynamic Return Rate Preview Card */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isHighReturn
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                {isHighReturn ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <span>Calculated Return Rate:</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Calculated Return Rate:</span>
                  </>
                )}
              </span>
              <span className="text-base font-extrabold font-mono">
                {calculatedRate.toFixed(2)}%
              </span>
            </div>

            <div className="w-full bg-slate-950/60 rounded-full h-2 overflow-hidden my-2 border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isHighReturn ? "bg-rose-500" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(100, (calculatedRate / 35) * 100)}%` }}
              />
            </div>

            <p className="text-[11px] opacity-90 mt-1">
              {isHighReturn
                ? "⚠️ This batch exceeds the 10.0% threshold. It will trigger a live High-Return Alert and appear in the Spikes section."
                : "✅ This batch is within normal e-commerce thresholds (≤ 10.0%)."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || totalSold <= 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 active:scale-95 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isSubmitting ? "Adding..." : "Add to Dashboard"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

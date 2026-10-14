"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Package, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;

    const cleanOrder = orderNumber.trim();
    const query = phone ? `?phone=${phone.replace(/\D/g, "")}` : "";
    router.push(`/order/${cleanOrder}${query}`);
  };

  return (
    <div className="min-h-screen bg-[#FFFDFB] text-[#1E222B] flex items-center justify-center p-4 antialiased selection:bg-[#FF7A00] selection:text-white">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full">
        <div className="flex flex-col items-center justify-center mb-6">
          <Link href="/">
            <img
              src="/logo.png"
              alt="Shoplume"
              className="h-9 w-auto object-contain mb-3"
            />
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-[#1E222B] text-center tracking-tight">
            Track Your Order
          </h1>
          <p className="text-xs text-slate-500 text-center mt-1">
            Enter your Order Number and Mobile Number to view live dispatch & tracking updates.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Order Number
            </label>
            <input
              type="text"
              placeholder="e.g. MSH-20261010-8421"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Mobile Number
            </label>
            <div className="relative">
              <span className="text-xs font-bold text-slate-400 absolute left-3 top-3">
                +91
              </span>
              <input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className="w-full pl-11 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full">
            <span>Track Status</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#FF7A00]" />
          <span>Secure direct customer lookup</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Lock,
  Truck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building,
  MapPin,
  User,
  Phone,
  Mail,
  Zap,
} from "lucide-react";
import { ProductWithDetails, CustomerAddress } from "@/types";
import { formatINR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

interface CheckoutViewProps {
  products: ProductWithDetails[];
}

export function CheckoutView({ products }: CheckoutViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const productId = searchParams.get("productId") || products[0]?.id;
  const variantId = searchParams.get("variantId");
  const qtyParam = Number(searchParams.get("qty")) || 1;

  const product = products.find((p) => p.id === productId) || products[0];
  const variant = product?.variants.find((v) => v.id === variantId) || product?.variants[0];

  const [quantity, setQuantity] = useState(qtyParam);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Customer Form State
  const [form, setForm] = useState<CustomerAddress & { fullName: string; phone: string; email: string }>({
    fullName: "",
    phone: "",
    email: "",
    house: "",
    street: "",
    landmark: "",
    city: "",
    district: "",
    state: "Karnataka",
    pincode: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FFFDFB] text-[#1E222B] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md w-full shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[#1E222B]">Product Not Found</h2>
          <p className="text-sm text-slate-600 mt-2 mb-6">
            The item you are trying to purchase is currently unavailable.
          </p>
          <Button onClick={() => router.push("/")} className="w-full">
            Return to Store
          </Button>
        </div>
      </div>
    );
  }

  const unitPrice =
    variant?.selling_price_override && variant.selling_price_override > 0
      ? variant.selling_price_override
      : product.selling_price;
  const originalPrice = product.original_price;
  const subtotal = unitPrice * quantity;
  const totalSavings = (originalPrice - unitPrice) * quantity;
  const shippingCharge = 0; // Free shipping
  const finalAmount = subtotal + shippingCharge;

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      errs.fullName = "Please enter your full name (minimum 2 letters)";
    }

    const cleanPhone = form.phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = "Please enter a valid 10-digit Indian mobile number starting with 6-9";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Please enter a valid email address";
    }

    if (!form.house.trim()) {
      errs.house = "Flat / House No. / Building is required";
    }

    if (!form.street.trim() || form.street.trim().length < 3) {
      errs.street = "Area / Street / Colony is required";
    }

    if (!form.city.trim()) {
      errs.city = "City is required";
    }

    if (!form.district.trim()) {
      errs.district = "District is required";
    }

    if (!form.state) {
      errs.state = "Please select your state";
    }

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      errs.pincode = "Please enter a valid 6-digit PIN code";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePaymentSuccess = async (paymentData: {
    orderId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    try {
      const res = await fetch("/api/checkout/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });

      const data = await res.json();

      if (data.success) {
        toast("Payment verified! Order placed successfully.", "success");
        router.push(
          `/order/${data.orderNumber}?token=${data.orderAccessToken}`
        );
      } else {
        setErrorMessage(
          data.error || "Payment verification failed. Please contact support."
        );
        toast(data.error || "Payment verification failed", "error");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Verification error:", err);
      setErrorMessage("Network error during verification. Please retry.");
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validateForm()) {
      toast("Please correct the errors in the shipping form", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Initialize order on backend with server-authoritative pricing
      const createRes = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variantId: variant?.id || null,
          quantity,
          customer: {
            fullName: form.fullName.trim(),
            phone: form.phone.replace(/\D/g, ""),
            email: form.email ? form.email.trim() : undefined,
            house: form.house.trim(),
            street: form.street.trim(),
            landmark: form.landmark ? form.landmark.trim() : undefined,
            city: form.city.trim(),
            district: form.district.trim(),
            state: form.state,
            pincode: form.pincode.trim(),
          },
        }),
      });

      const orderData = await createRes.json();

      if (!orderData.success) {
        throw new Error(orderData.error || "Failed to create order");
      }

      // Step 2: Open Razorpay Checkout or fallback in mock/demo mode
      const isRazorpayAvailable =
        typeof window !== "undefined" && (window as any).Razorpay;

      if (!isRazorpayAvailable || orderData.isMock) {
        // Mock / Development Demo Mode: instant simulated payment verification
        console.log("Processing mock payment verification...");
        await handlePaymentSuccess({
          orderId: orderData.orderId,
          razorpay_order_id: orderData.razorpayOrderId,
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_signature: "mock_verified_signature",
        });
        return;
      }

      // Real Razorpay Checkout flow
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Shoplume",
        description: `Order ${orderData.orderNumber}`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: form.fullName,
          contact: form.phone,
          email: form.email || undefined,
        },
        theme: {
          color: "#FF5520",
        },
        handler: async function (response: any) {
          await handlePaymentSuccess({
            orderId: orderData.orderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
            toast("Payment window closed. You can retry now.", "info");
          },
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.on("payment.failed", function (response: any) {
        console.error("Payment failed:", response.error);
        setErrorMessage(
          response.error?.description ||
          "Payment failed. You have not been charged. Please retry."
        );
        setIsSubmitting(false);
      });
      rzpInstance.open();
    } catch (err) {
      console.error("Checkout submission error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDFB] text-[#1E222B] pb-16 antialiased selection:bg-[#FF7A00] selection:text-white">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-orange-100/60 px-4 py-3 sm:py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-700 hover:text-[#FF7A00] hover:border-orange-300 hover:bg-orange-50/40 transition-all text-xs sm:text-sm font-bold shadow-xs cursor-pointer active:scale-95"
            title="Go Back"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <Link href="" className="flex items-center group cursor-pointer">
            <img
              src="/logo.png"
              alt="Shoplume"
              className="h-8 sm:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
            />
          </Link>

          {/* Spacer to keep logo centered */}
          <div className="w-9 sm:w-16" aria-hidden="true" />
        </div>
      </header>

      {/* Main Checkout Area */}
      <main className="max-w-5xl mx-auto px-4 pt-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ================= LEFT COLUMN: CUSTOMER & ADDRESS DETAILS ================= */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Step 1: Customer Contact Info */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <span className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                  1
                </span>
                <h2 className="font-bold text-[#1E222B] text-base">
                  Contact Information
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={form.fullName}
                      onChange={(e) =>
                        setForm({ ...form, fullName: e.target.value })
                      }
                      className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.fullName ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                        }`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="text-xs font-bold text-slate-400 absolute left-3 top-3">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="9876543210"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          phone: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      className={`w-full pl-11 pr-3 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.phone ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                        }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{errors.phone}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Email Address <span className="text-slate-400 font-normal">(Optional, for tracking updates)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.email ? "border-rose-400" : "border-slate-200"
                        }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{errors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Delivery Address */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <span className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                  2
                </span>
                <h2 className="font-bold text-[#1E222B] text-base">
                  Delivery Address
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Flat / House No. / Building Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. Flat 304, Green Heights Apartment"
                      value={form.house}
                      onChange={(e) =>
                        setForm({ ...form, house: e.target.value })
                      }
                      className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.house ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                        }`}
                    />
                  </div>
                  {errors.house && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{errors.house}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Street / Area / Colony <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. 5th Main, 2nd Cross, Near Metro Station"
                      value={form.street}
                      onChange={(e) =>
                        setForm({ ...form, street: e.target.value })
                      }
                      className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.street ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                        }`}
                    />
                  </div>
                  {errors.street && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{errors.street}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Landmark <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Opposite City Hospital"
                    value={form.landmark}
                    onChange={(e) =>
                      setForm({ ...form, landmark: e.target.value })
                    }
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    PIN Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 560038"
                    value={form.pincode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pincode: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className={`w-full px-3 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.pincode ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                      }`}
                  />
                  {errors.pincode && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{errors.pincode}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru"
                    value={form.city}
                    onChange={(e) =>
                      setForm({ ...form, city: e.target.value })
                    }
                    className={`w-full px-3 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.city ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                      }`}
                  />
                  {errors.city && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{errors.city}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    District <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru Urban"
                    value={form.district}
                    onChange={(e) =>
                      setForm({ ...form, district: e.target.value })
                    }
                    className={`w-full px-3 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.district ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                      }`}
                  />
                  {errors.district && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{errors.district}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.state}
                    onChange={(e) =>
                      setForm({ ...form, state: e.target.value })
                    }
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: ORDER SUMMARY & PAYMENT ================= */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <h2 className="font-bold text-[#1E222B] text-base pb-3 border-b border-slate-100">
                Order Summary
              </h2>

              {/* Product item display */}
              <div className="flex gap-3.5 pb-4 border-b border-slate-100">
                <img
                  src={product.images[0]?.image_url}
                  alt={product.name}
                  className="w-18 h-22 object-cover rounded-xl border border-slate-200 shrink-0"
                />
                <div className="flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-[#1E222B] text-sm line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-slate-600 font-medium">
                      {variant?.size && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                          Size: {variant.size}
                        </span>
                      )}
                      {variant?.color && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                          Color: {variant.color}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500 font-medium">
                      Qty: {quantity}
                    </span>
                    <span className="font-extrabold text-[#1E222B] text-sm">
                      {formatINR(subtotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Price ({quantity} item{quantity > 1 ? "s" : ""})</span>
                  <span>{formatINR(originalPrice * quantity)}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between text-[#FF5520] font-bold">
                    <span>Special Discount</span>
                    <span>- {formatINR(totalSavings)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="text-emerald-600 font-bold">FREE</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between">
                <div>
                  <span className="font-bold text-[#1E222B] text-sm block">
                    Total Payable Amount
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Inclusive of all taxes
                  </span>
                </div>
                <span className="text-2xl font-black text-[#1E222B]">
                  {formatINR(finalAmount)}
                </span>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* PAY BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#FF7A00] via-[#FF5520] to-[#FF2D55] text-white font-black text-base shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:brightness-105 active:scale-[0.99] disabled:opacity-60 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Securing Order...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>PAY {formatINR(finalAmount)} SECURELY</span>
                  </>
                )}
              </button>

              {/* Supported Payment Badges */}
              <div className="flex flex-col items-center gap-2 text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#FF7A00]" /> Razorpay Safe Payment Gateway
                </span>
                <span className="text-[11px] text-slate-400">
                  Supports Google Pay, PhonePe, Paytm, BHIM UPI, Cards & NetBanking
                </span>
              </div>
            </div>

            {/* Trust and Safety Banner */}
            <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100/80 text-xs text-slate-700 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold text-[#1E222B]">
                <Truck className="w-4 h-4 text-[#FF7A00]" />
                <span>Pan-India Direct Delivery</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Your order is dispatched directly with verified suppliers. Live SMS and tracking updates will be provided upon dispatch.
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

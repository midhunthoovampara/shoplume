"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  Banknote,
  Minus,
  Plus,
  Sparkles,
  MessageCircle,
  RotateCcw,
  Loader2,
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
  const variant =
    product?.variants.find((v) => v.id === variantId) || product?.variants[0];

  const [quantity, setQuantity] = useState(qtyParam > 0 ? qtyParam : 1);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLookingUpPin, setIsLookingUpPin] = useState(false);
  const [pinSuccessText, setPinSuccessText] = useState("");

  // Customer Form State
  const [form, setForm] = useState<
    CustomerAddress & { fullName: string; phone: string; email: string }
  >({
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
  const shippingCharge = 0; // 100% Free Shipping
  const finalAmount = subtotal + shippingCharge;

  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1 || newQty > 10) return;
    setQuantity(newQty);
  };

  // Instant PIN Code Auto-Fill
  const handlePincodeChange = async (val: string) => {
    const cleanPin = val.replace(/\D/g, "").slice(0, 6);
    setForm((prev) => ({ ...prev, pincode: cleanPin }));

    if (errors.pincode) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.pincode;
        return next;
      });
    }

    if (cleanPin.length === 6) {
      setIsLookingUpPin(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (data && data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          const detectedCity = po.District || po.Block || po.Circle;
          const detectedState = po.State;
          const matchedState =
            INDIAN_STATES.find(
              (s) => s.toLowerCase() === detectedState.toLowerCase()
            ) || detectedState;

          setForm((prev) => ({
            ...prev,
            city: prev.city || detectedCity,
            district: prev.district || detectedCity,
            state: matchedState,
          }));
          setPinSuccessText(`${detectedCity}, ${matchedState}`);
        }
      } catch {
        // Fallback silently if offline or network error
      } finally {
        setIsLookingUpPin(false);
      }
    } else {
      setPinSuccessText("");
    }
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      errs.fullName = "Please enter your full name (at least 2 letters)";
    }

    const cleanPhone = form.phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = "Please enter a valid 10-digit mobile number";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Please enter a valid email address";
    }

    if (!form.house.trim()) {
      errs.house = "House / Flat / Building No. is required";
    }

    if (!form.street.trim() || form.street.trim().length < 3) {
      errs.street = "Road / Area / Colony is required";
    }

    if (!form.city.trim()) {
      errs.city = "City / Town is required";
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
      toast("Please fill in the required delivery fields highlighted below", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const effectiveDistrict = form.district.trim() || form.city.trim();

      // Step 1: Initialize order on backend with server-authoritative pricing
      const createRes = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variantId: variant?.id || null,
          quantity,
          paymentMethod,
          customer: {
            fullName: form.fullName.trim(),
            phone: form.phone.replace(/\D/g, ""),
            email: form.email ? form.email.trim() : undefined,
            house: form.house.trim(),
            street: form.street.trim(),
            landmark: form.landmark ? form.landmark.trim() : undefined,
            city: form.city.trim(),
            district: effectiveDistrict,
            state: form.state,
            pincode: form.pincode.trim(),
          },
        }),
      });

      const orderData = await createRes.json();

      if (!orderData.success) {
        throw new Error(orderData.error || "Failed to create order");
      }

      // Step 2: If Cash on Delivery, redirect immediately without Razorpay
      if (orderData.isCod) {
        toast("Order placed successfully with Cash on Delivery!", "success");
        router.push(
          `/order/${orderData.orderNumber}?token=${orderData.orderAccessToken}`
        );
        return;
      }

      // Step 3: Open Razorpay Checkout or fallback in mock/demo mode
      const isRazorpayAvailable =
        typeof window !== "undefined" && (window as any).Razorpay;

      if (!isRazorpayAvailable || orderData.isMock) {
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
            toast("Payment cancelled. You can retry anytime.", "info");
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
        err instanceof Error
          ? err.message
          : "Something went wrong. Please check your network and try again."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDFB] text-[#1E222B] pb-28 lg:pb-16 antialiased selection:bg-[#FF7A00] selection:text-white">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-orange-100/60 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-[#FF7A00] hover:border-orange-300 transition-all text-xs font-bold shadow-2xs cursor-pointer active:scale-95"
            title="Go Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <Link href="" className="flex items-center group cursor-pointer">
            <img
              src="/logo.png"
              alt="Shoplume"
              className="h-7 sm:h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
            />
          </Link>

          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">100% Safe Checkout</span>
            <span className="sm:hidden">Safe</span>
          </div>
        </div>
      </header>

      {/* Main Checkout Area */}
      <main className="max-w-5xl mx-auto px-4 pt-4 sm:pt-6 space-y-5">
        {/* ================= TOP COMPACT PRODUCT CARD (MOBILE & DESKTOP) ================= */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src={product.images[0]?.image_url}
              alt={product.name}
              className="w-16 h-20 sm:w-18 sm:h-22 object-cover rounded-xl border border-slate-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-extrabold text-emerald-700 mb-1">
                <Truck className="w-3 h-3" />
                <span>FREE Pan-India Delivery</span>
              </div>
              <h1 className="font-bold text-[#1E222B] text-sm sm:text-base line-clamp-1">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                {variant?.size && (
                  <span className="font-semibold text-slate-700">
                    Size: {variant.size}
                  </span>
                )}
                {variant?.size && variant?.color && <span>•</span>}
                {variant?.color && (
                  <span className="font-semibold text-slate-700">
                    Color: {variant.color}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-black text-[#1E222B] text-lg sm:text-xl">
                  {formatINR(subtotal)}
                </span>
                {originalPrice > unitPrice && (
                  <>
                    <span className="text-xs text-slate-400 line-through">
                      {formatINR(originalPrice * quantity)}
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                      Save {formatINR(totalSavings)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <span className="text-xs font-bold text-slate-600">Quantity:</span>
            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                title="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-black text-slate-800">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= 10}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                title="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= FORM GRID ================= */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: ADDRESS & PAYMENT (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* STEP 1: CONTACT & DELIVERY ADDRESS */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-black flex items-center justify-center shadow-xs">
                  1
                </span>
                <div>
                  <h2 className="font-bold text-[#1E222B] text-base leading-tight">
                    Delivery Address
                  </h2>
                  <p className="text-xs text-slate-500">
                    Where should we deliver your parcel?
                  </p>
                </div>
              </div>

              {/* Contact Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
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
                      className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/80 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.fullName ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                        }`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="text-xs font-bold text-slate-500 absolute left-3 top-3">
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
                      className={`w-full pl-11 pr-3 py-2.5 text-sm bg-slate-50/80 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.phone ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                        }`}
                    />
                  </div>
                  {errors.phone ? (
                    <p className="text-xs text-rose-500 mt-1 font-medium">
                      {errors.phone}
                    </p>
                  ) : (
                    <span className="text-[10px] text-slate-500 block mt-1">
                      For delivery calls & live dispatch updates
                    </span>
                  )}
                </div>
              </div>

              {/* Address Fields */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
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
                      className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/80 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.house ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                        }`}
                    />
                  </div>
                  {errors.house && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">
                      {errors.house}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Road / Area / Colony <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. 5th Main, Near Metro Station, Indiranagar"
                      value={form.street}
                      onChange={(e) =>
                        setForm({ ...form, street: e.target.value })
                      }
                      className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/80 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.street ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                        }`}
                    />
                  </div>
                  {errors.street && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">
                      {errors.street}
                    </p>
                  )}
                </div>

                {/* PIN Code, City & State Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      PIN Code <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="e.g. 560038"
                        value={form.pincode}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        className={`w-full px-3 py-2.5 text-sm bg-slate-50/80 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono ${errors.pincode ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                          }`}
                      />
                      {isLookingUpPin && (
                        <Loader2 className="w-4 h-4 text-orange-500 animate-spin absolute right-3 top-3" />
                      )}
                    </div>
                    {errors.pincode ? (
                      <p className="text-xs text-rose-500 mt-1 font-medium">
                        {errors.pincode}
                      </p>
                    ) : pinSuccessText ? (
                      <p className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{pinSuccessText}</span>
                      </p>
                    ) : (
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Auto-fills city & state
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      City / Town <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru"
                      value={form.city}
                      onChange={(e) =>
                        setForm({ ...form, city: e.target.value })
                      }
                      className={`w-full px-3 py-2.5 text-sm bg-slate-50/80 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.city ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                        }`}
                    />
                    {errors.city && (
                      <p className="text-xs text-rose-500 mt-1 font-medium">
                        {errors.city}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      State <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={form.state}
                      onChange={(e) =>
                        setForm({ ...form, state: e.target.value })
                      }
                      className="w-full px-3 py-2.5 text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Landmark & Optional Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Landmark <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Near City Hospital or Temple"
                      value={form.landmark}
                      onChange={(e) =>
                        setForm({ ...form, landmark: e.target.value })
                      }
                      className="w-full px-3 py-2.5 text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Email <span className="text-slate-400 font-normal">(Optional)</span>
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
                        className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/80 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.email ? "border-rose-400" : "border-slate-200"
                          }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2: PAYMENT METHOD SELECTION */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-black flex items-center justify-center shadow-xs">
                    2
                  </span>
                  <div>
                    <h2 className="font-bold text-[#1E222B] text-base leading-tight">
                      Payment Option
                    </h2>
                    <p className="text-xs text-slate-500">
                      Choose how you want to pay
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  100% Safe & Verified
                </span>
              </div>

              {/* Payment Radio Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option 1: Cash on Delivery (COD) */}
                <div
                  onClick={() => setPaymentMethod("cod")}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${paymentMethod === "cod"
                      ? "border-[#FF5520] bg-orange-50/40 ring-2 ring-orange-500/20 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${paymentMethod === "cod"
                            ? "border-[#FF5520] bg-[#FF5520]"
                            : "border-slate-300 bg-white"
                          }`}
                      >
                        {paymentMethod === "cod" && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#1E222B] flex items-center gap-1.5">
                          <span>Cash on Delivery</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 border border-amber-500/30">
                            Popular
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 block mt-0.5">
                          Pay Cash or UPI when parcel arrives
                        </span>
                      </div>
                    </div>
                    <Banknote className="w-5 h-5 text-emerald-600 shrink-0" />
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Zero advance payment • Pay at doorstep</span>
                  </div>
                </div>

                {/* Option 2: Online Payment */}
                <div
                  onClick={() => setPaymentMethod("online")}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${paymentMethod === "online"
                      ? "border-[#FF5520] bg-orange-50/40 ring-2 ring-orange-500/20 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${paymentMethod === "online"
                            ? "border-[#FF5520] bg-[#FF5520]"
                            : "border-slate-300 bg-white"
                          }`}
                      >
                        {paymentMethod === "online" && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#1E222B] flex items-center gap-1.5">
                          <span>Online Payment</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            Instant
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 block mt-0.5">
                          UPI, GPay, PhonePe, Cards & NetBanking
                        </span>
                      </div>
                    </div>
                    <CreditCard className="w-5 h-5 text-slate-500 shrink-0" />
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <span>Fastest dispatch queue via Razorpay</span>
                  </div>
                </div>
              </div>

              {/* Informative COD banner */}
              {paymentMethod === "cod" ? (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                  <Truck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Cash on Delivery (COD) Selected:</strong> Pay{" "}
                    <strong>{formatINR(finalAmount)}</strong> in cash or scan the courier QR code using any UPI app upon delivery.
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-900 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>100% Secure Razorpay Payment:</strong> Protected by 256-bit bank-grade encryption. Instant digital invoice & confirmation.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: ORDER SUMMARY & PLACE ORDER (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 lg:sticky lg:top-20">
              <h2 className="font-bold text-[#1E222B] text-base pb-3 border-b border-slate-100 flex items-center justify-between">
                <span>Price Details</span>
                <span className="text-xs font-semibold text-slate-500">
                  {quantity} item{quantity > 1 ? "s" : ""}
                </span>
              </h2>

              {/* Price Breakdown */}
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Total MRP ({quantity} item{quantity > 1 ? "s" : ""})</span>
                  <span>{formatINR(originalPrice * quantity)}</span>
                </div>

                {totalSavings > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount on MRP</span>
                    <span>- {formatINR(totalSavings)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span>Delivery Charges</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                    FREE
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="font-medium text-slate-700">Payment Mode</span>
                  <span
                    className={`font-black px-2.5 py-0.5 rounded text-[11px] ${paymentMethod === "cod"
                        ? "bg-amber-500/15 text-amber-800 border border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                      }`}
                  >
                    {paymentMethod === "cod"
                      ? "💵 Cash on Delivery"
                      : "⚡ Online Payment"}
                  </span>
                </div>
              </div>

              {/* Total Row */}
              <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between">
                <div>
                  <span className="font-bold text-[#1E222B] text-sm block">
                    Total Payable Amount
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {paymentMethod === "cod"
                      ? "Payable upon courier arrival"
                      : "Inclusive of all taxes"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-[#1E222B]">
                    {formatINR(finalAmount)}
                  </span>
                  {totalSavings > 0 && (
                    <span className="text-[11px] text-emerald-600 block font-bold">
                      You save {formatINR(totalSavings)}
                    </span>
                  )}
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* DESKTOP SUBMIT / PLACE ORDER BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#FF7A00] via-[#FF5520] to-[#FF2D55] text-white font-black text-base shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:brightness-105 active:scale-[0.99] disabled:opacity-60 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>
                      {paymentMethod === "cod"
                        ? "Placing COD Order..."
                        : "Opening Payment Gateway..."}
                    </span>
                  </>
                ) : paymentMethod === "cod" ? (
                  <>
                    <Banknote className="w-5 h-5" />
                    <span>CONFIRM CASH ON DELIVERY ORDER</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>PAY {formatINR(finalAmount)} SECURELY</span>
                  </>
                )}
              </button>

              {/* Reassuring Trust Badges */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-slate-600 text-[11px]">
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50">
                  <Truck className="w-3.5 h-3.5 text-[#FF7A00] shrink-0" />
                  <span>Fast Free Delivery</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50">
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>7-Day Easy Return</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Genuine Quality</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>WhatsApp Support</span>
                </div>
              </div>
            </div>
          </div>

          {/* ================= MOBILE STICKY FLOATING CHECKOUT BAR ================= */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold leading-none">
                {paymentMethod === "cod" ? "Due on Delivery" : "Total Price"}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-[#1E222B]">
                  {formatINR(finalAmount)}
                </span>
                <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  FREE Delivery
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 max-w-[250px] py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#FF7A00] via-[#FF5520] to-[#FF2D55] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-orange-500/25 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : paymentMethod === "cod" ? (
                <>
                  <Banknote className="w-4 h-4" />
                  <span>Confirm COD Order</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Pay {formatINR(finalAmount)}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

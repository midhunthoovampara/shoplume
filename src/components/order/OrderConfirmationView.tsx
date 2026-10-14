"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  Package,
  Truck,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Phone,
  MessageSquare,
  AlertCircle,
  Copy,
  ChevronRight,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface OrderConfirmationViewProps {
  orderNumber: string;
  initialToken?: string;
}

export function OrderConfirmationView({
  orderNumber,
  initialToken,
}: OrderConfirmationViewProps) {
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phoneVerification, setPhoneVerification] = useState("");
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

  const fetchOrder = async (token?: string, phone?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (token) params.set("token", token);
      if (phone) params.set("phone", phone);

      const res = await fetch(
        `/api/orders/${orderNumber}?${params.toString()}`
      );
      const data = await res.json();

      if (data.success && data.order) {
        setOrder(data.order);
        // Trigger celebratory confetti on initial load
        if (data.order.payment_status === "paid") {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      } else {
        setError(data.error || "Order not found or requires verification");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load order information.");
    } finally {
      setIsLoading(false);
      setIsVerifyingPhone(false);
    }
  };

  useEffect(() => {
    fetchOrder(initialToken);
  }, [orderNumber, initialToken]);

  const handlePhoneVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneVerification || phoneVerification.length < 10) {
      toast("Please enter your 10-digit mobile number", "error");
      return;
    }
    setIsVerifyingPhone(true);
    fetchOrder(undefined, phoneVerification);
  };

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(orderNumber);
    toast("Order number copied!", "success");
  };

  const openWhatsAppSupport = () => {
    const text = encodeURIComponent(
      `Hi, I have a question regarding my order #${orderNumber}`
    );
    window.open(`https://wa.me/919876543210?text=${text}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFDFB] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF7A00]" />
          <p className="text-sm font-semibold text-[#1E222B]">
            Retrieving your order details...
          </p>
        </div>
      </div>
    );
  }

  // If token was missing or unauthorized, show secure phone verification prompt
  if (error && !order) {
    return (
      <div className="min-h-screen bg-[#FFFDFB] text-[#1E222B] flex items-center justify-center p-4 antialiased selection:bg-[#FF7A00] selection:text-white">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-lg max-w-md w-full">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4 border border-orange-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#1E222B] text-center">
            Verify Order Access
          </h2>
          <p className="text-xs text-slate-500 text-center mt-1.5 mb-6">
            To protect customer privacy, please enter the mobile number used when placing order <strong>#{orderNumber}</strong>.
          </p>

          <form onSubmit={handlePhoneVerifySubmit} className="space-y-4">
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
                  value={phoneVerification}
                  onChange={(e) =>
                    setPhoneVerification(e.target.value.replace(/\D/g, ""))
                  }
                  className="w-full pl-11 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 font-medium">{error}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isVerifyingPhone}
            >
              View Order Details
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Get current milestone step
  const statusSteps = [
    {
      id: "paid",
      title: "Order Placed & Paid",
      description: "Payment confirmed via Razorpay",
      isDone: true,
      current: order.fulfillment_status === "awaiting_purchase",
    },
    {
      id: "purchased_from_meesho",
      title: "Processed with Supplier",
      description: "Packaged & prepared for courier dispatch",
      isDone: [
        "purchased_from_meesho",
        "shipped",
        "delivered",
      ].includes(order.fulfillment_status),
      current: order.fulfillment_status === "purchased_from_meesho",
    },
    {
      id: "shipped",
      title: "Shipped & In Transit",
      description: order.tracking?.courier_name
        ? `Via ${order.tracking.courier_name}`
        : "On the way to your city",
      isDone: ["shipped", "delivered"].includes(order.fulfillment_status),
      current: order.fulfillment_status === "shipped",
    },
    {
      id: "delivered",
      title: "Delivered",
      description: "Delivered to your doorstep",
      isDone: order.fulfillment_status === "delivered",
      current: order.fulfillment_status === "delivered",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDFB] text-[#1E222B] pb-16 antialiased selection:bg-[#FF7A00] selection:text-white">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-orange-100/60 px-4 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <img
                src="/logo.png"
                alt="Shoplume"
                className="h-7 sm:h-8 w-auto object-contain"
              />
            </Link>
            <span className="text-slate-300 font-light hidden sm:inline">|</span>
            <span className="font-bold text-[#1E222B] tracking-tight text-xs sm:text-sm">
              Order Confirmation
            </span>
          </div>
          <button
            onClick={openWhatsAppSupport}
            className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200/60 hover:bg-orange-100 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Need Help?</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-[#1E222B] via-[#2A1D25] to-[#1E222B] text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-orange-500/20 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gradient-to-br from-[#FF7A00]/20 to-[#FF2D55]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#FF2D55] text-white flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/30 relative z-10">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 relative z-10">
            <span className="text-xs uppercase tracking-widest font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-[#FF2D55]">
              Payment Confirmed • Verified Order
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-0.5 tracking-tight text-white">
              Thank You for Your Order!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              We have received your payment via Razorpay. Your order has been placed into our direct supplier dispatch queue.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
              <span className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-white">
                Order #{order.order_number}
                <button
                  onClick={copyOrderNumber}
                  className="hover:text-orange-400 transition-colors"
                  title="Copy Order ID"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </span>
              <span className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl font-semibold text-orange-200">
                Amount Paid: {formatINR(order.total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Live Delivery Status Stepper */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-[#1E222B] text-sm sm:text-base mb-6 flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#FF7A00]" />
            <span>Live Delivery Timeline</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {statusSteps.map((step, idx) => (
              <div
                key={step.id}
                className={`relative flex md:flex-col items-start gap-3 p-3 rounded-xl transition-all ${
                  step.current
                    ? "bg-orange-50/80 border border-orange-200 shadow-xs"
                    : "bg-slate-50/50"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step.isDone
                      ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-xs"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {step.isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>

                <div className="flex-1">
                  <h3
                    className={`text-xs font-bold ${
                      step.current ? "text-orange-950 font-black" : "text-slate-800"
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Courier Tracking Info if Shipped */}
          {order.tracking?.tracking_number && (
            <div className="mt-5 p-4 rounded-xl bg-orange-50/40 border border-orange-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-semibold text-slate-500 block">
                  Courier Partner: {order.tracking.courier_name || "Express Courier"}
                </span>
                <span className="font-bold text-[#1E222B] text-sm font-mono">
                  AWB Tracking No: {order.tracking.tracking_number}
                </span>
              </div>
              {order.tracking.tracking_url && (
                <a
                  href={order.tracking.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-rose-600 text-white font-bold hover:brightness-105 transition-colors shadow-xs"
                >
                  <span>Track Live on Courier Site</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Order Details & Address Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Purchased Items */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <h2 className="font-bold text-[#1E222B] text-sm sm:text-base pb-3 border-b border-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#FF7A00]" />
              <span>Purchased Item</span>
            </h2>

            {order.items?.map((item: any) => (
              <div key={item.id} className="flex gap-3.5">
                {item.image_snapshot && (
                  <img
                    src={item.image_snapshot}
                    alt={item.product_name_snapshot}
                    className="w-18 h-22 object-cover rounded-xl border border-slate-200 shrink-0"
                  />
                )}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-[#1E222B] text-sm leading-snug">
                      {item.product_name_snapshot}
                    </h3>
                    {item.variant_snapshot && (
                      <span className="inline-block mt-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                        {item.variant_snapshot}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-baseline text-xs mt-2">
                    <span className="text-slate-500 font-medium">
                      Qty: {item.quantity}
                    </span>
                    <span className="font-extrabold text-[#1E222B] text-sm">
                      {formatINR(item.total_price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatINR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="text-emerald-600 font-bold">FREE</span>
              </div>
              <div className="flex justify-between font-extrabold text-[#1E222B] text-sm pt-2 border-t border-slate-100">
                <span>Total Amount Paid</span>
                <span>{formatINR(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="font-bold text-[#1E222B] text-sm sm:text-base pb-3 border-b border-slate-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FF7A00]" />
                <span>Shipping Address</span>
              </h2>

              <div className="mt-4 space-y-1 text-xs text-slate-700">
                <p className="font-bold text-[#1E222B] text-sm">
                  {order.customer_name}
                </p>
                <p>{order.shipping_address.house}</p>
                <p>{order.shipping_address.street}</p>
                {order.shipping_address.landmark && (
                  <p className="text-slate-500">
                    Landmark: {order.shipping_address.landmark}
                  </p>
                )}
                <p>
                  {order.shipping_address.city}, {order.shipping_address.district},{" "}
                  {order.shipping_address.state} -{" "}
                  <strong>{order.shipping_address.pincode}</strong>
                </p>
                <p className="pt-2 font-medium text-slate-600">
                  Phone: +91 {order.customer_phone}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={openWhatsAppSupport}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1E222B] text-white text-xs font-bold hover:bg-[#2A303D] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span>Contact Customer Support</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

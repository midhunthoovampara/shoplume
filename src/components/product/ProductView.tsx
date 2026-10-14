"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Share2,
  Check,
  Star,
  MapPin,
  ChevronDown,
  ChevronUp,
  Ruler,
  AlertCircle,
  Eye,
  Zap,
  Clock,
  Flame,
  Maximize2,
  X,
  Lock,
  Award,
  BadgePercent,
  CheckCircle2,
  Banknote,
} from "lucide-react";
import { ProductWithDetails } from "@/types";
import { formatINR, calculateDiscount } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface ProductViewProps {
  product: ProductWithDetails;
}

export function ProductView({ product }: ProductViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  // State Management
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants[0]?.id || ""
  );
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState("");
  const [pincodeResult, setPincodeResult] = useState<{
    status: "idle" | "valid" | "invalid";
    message: string;
    deliveryDate?: string;
  }>({ status: "idle", message: "" });
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<"details" | "specs">("details");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Live countdown timer state (hours, minutes, seconds)
  const [timeLeft, setTimeLeft] = useState({ hours: 3, minutes: 42, seconds: 18 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 4, minutes: 30, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Track scroll position to show sticky buy bar when passing main CTA
  useEffect(() => {
    const handleScroll = () => {
      const buyButton = document.getElementById("main-buy-button");
      if (buyButton) {
        const rect = buyButton.getBoundingClientRect();
        setShowStickyBar(rect.bottom < 0);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Touch Swipe for Mobile Gallery
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const images =
    product.images.length > 0
      ? product.images
      : [
        {
          id: "default-img",
          product_id: product.id,
          image_url:
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85",
          sort_order: 0,
        },
      ];

  const currentImage = images[selectedImageIndex] || images[0];

  // Pricing calculations
  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const currentSellingPrice =
    selectedVariant?.selling_price_override || product.selling_price;
  const currentOriginalPrice = product.original_price;
  const discountPercent = calculateDiscount(
    currentOriginalPrice,
    currentSellingPrice
  );
  const totalSavings = currentOriginalPrice - currentSellingPrice;

  // Group variants
  const availableSizes = Array.from(
    new Set(product.variants.map((v) => v.size).filter(Boolean))
  );
  const availableColors = Array.from(
    new Set(product.variants.map((v) => v.color).filter(Boolean))
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50 && selectedImageIndex < images.length - 1) {
      setSelectedImageIndex((prev) => prev + 1);
    } else if (diff < -50 && selectedImageIndex > 0) {
      setSelectedImageIndex((prev) => prev - 1);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPosition({ x, y });
  };

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeResult({
        status: "invalid",
        message: "Please enter a valid 6-digit Indian PIN code",
      });
      return;
    }

    const delDate = new Date();
    delDate.setDate(delDate.getDate() + 4);
    const dateFormatted = delDate.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    setPincodeResult({
      status: "valid",
      message: `Guaranteed delivery by ${dateFormatted}`,
      deliveryDate: dateFormatted,
    });
    toast(`Delivery available to ${pincode}! Free express dispatch.`, "success");
  };

  const handleBuyNow = () => {
    if (product.variants.length > 0 && !selectedVariantId) {
      toast("Please select a size / variant first", "error");
      const picker = document.getElementById("variant-picker");
      picker?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const query = new URLSearchParams({
      productId: product.id,
      ...(selectedVariantId ? { variantId: selectedVariantId } : {}),
      qty: quantity.toString(),
    });

    router.push(`/checkout?${query.toString()}`);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `Check out this deal on ${product.name} at only ${formatINR(
      currentSellingPrice
    )}! Free Delivery & Cash/UPI. Order here: ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        await navigator.clipboard.writeText(shareUrl);
        toast("Product link copied! Share on WhatsApp or Instagram.", "success");
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast("Link copied to clipboard! Share on WhatsApp.", "success");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDFB] text-[#1E222B] pb-28 md:pb-20 antialiased selection:bg-[#FF7A00] selection:text-white">
      {/* 1. Single Line Minimal Moving Flash Sale Ticker */}
      <div className="h-8 overflow-hidden bg-gradient-to-r from-[#1E222B] via-[#2A1D25] to-[#1E222B] text-white border-b border-orange-500/20 text-[11px] sm:text-xs font-semibold flex items-center select-none shadow-xs">
        <div className="animate-marquee flex items-center whitespace-nowrap">
          {/* Set 1 */}
          <div className="flex items-center gap-8 px-4">
            <span className="flex items-center gap-1.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF7A00] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF2D55]" />
              </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-[#FF2D55] font-black uppercase tracking-wider">
                ⚡ FLASH SALE LIVE:
              </span>
              <span className="text-slate-200">
                Save <strong className="text-white">{formatINR(totalSavings)}</strong> ({discountPercent}% OFF)
              </span>
            </span>
            <span className="text-orange-500/60 font-bold">•</span>
            <span className="text-slate-300 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#FF7A00]" /> FREE PAN-INDIA DELIVERY
            </span>
            <span className="text-orange-500/60 font-bold">•</span>
            <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
              <Banknote className="w-3.5 h-3.5 text-emerald-400" /> CASH ON DELIVERY (COD) AVAILABLE
            </span>
            <span className="text-orange-500/60 font-bold">•</span>
          </div>

          {/* Set 2 (Duplicate for continuous seamless loop) */}
          <div className="flex items-center gap-8 px-4" aria-hidden="true">
            <span className="flex items-center gap-1.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF7A00] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF2D55]" />
              </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-[#FF2D55] font-black uppercase tracking-wider">
                ⚡ FLASH SALE LIVE:
              </span>
              <span className="text-slate-200">
                Save <strong className="text-white">{formatINR(totalSavings)}</strong> ({discountPercent}% OFF)
              </span>
            </span>
            <span className="text-orange-500/60 font-bold">•</span>
            <span className="text-slate-300 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#FF7A00]" /> FREE PAN-INDIA DELIVERY
            </span>
            <span className="text-orange-500/60 font-bold">•</span>
            <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
              <Banknote className="w-3.5 h-3.5 text-emerald-400" /> CASH ON DELIVERY (COD) AVAILABLE
            </span>
            <span className="text-orange-500/60 font-bold">•</span>
          </div>
        </div>
      </div>

      {/* 2. Glassmorphism Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-orange-100/60 px-4 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="" className="flex items-center gap-2.5 group cursor-pointer">
            <img
              src="/logo.png"
              alt="Shoplume"
              className="h-8 sm:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
            />
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200/60">
              <Award className="w-3 h-3 text-[#FF7A00]" />
              Verified Brand
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-orange-50/50 px-3 py-1.5 rounded-full border border-orange-200/50">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>100% Quality Inspected</span>
            </div>

            <button
              onClick={handleShare}
              className="p-2 sm:px-3 sm:py-1.5 rounded-2xl border border-orange-200/70 bg-white text-slate-700 hover:text-[#FF7A00] hover:border-orange-400 hover:bg-orange-50/40 transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer active:scale-95"
              title="Share Deal"
            >
              <Share2 className="w-4 h-4 text-[#FF7A00]" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Main Product Funnel Container */}
      <main className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-5 md:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ================= LEFT COLUMN: LUXURY IMAGE GALLERY ================= */}
          <div className="lg:col-span-7">
            <div className="sticky top-20 flex flex-col gap-4">
              {/* Main Interactive Stage */}
              <div
                className="relative aspect-4/5 w-full bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-lg shadow-orange-950/5 cursor-zoom-in select-none group"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
                onMouseMove={handleMouseMove}
                onClick={() => setShowLightbox(true)}
              >
                {/* Floating Badges */}
                <div className="absolute top-3.5 left-3.5 z-20 flex flex-col gap-2 pointer-events-none">
                  {discountPercent > 0 && (
                    <span className="bg-gradient-to-r from-[#FF7A00] via-[#FF5520] to-[#FF2D55] text-white text-xs font-black px-3 py-1 rounded-xl shadow-lg shadow-orange-500/30 tracking-wider uppercase">
                      {discountPercent}% OFF
                    </span>
                  )}
                  <span className="bg-[#1E222B]/90 backdrop-blur-md text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1.5 border border-white/10">
                    <Flame className="w-3.5 h-3.5 fill-[#FF7A00] text-[#FF7A00] animate-pulse" />
                    <span>Best Seller #1</span>
                  </span>
                </div>

                {/* Top Right Expand Icon */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLightbox(true);
                  }}
                  className="absolute top-3.5 right-3.5 z-20 p-2 rounded-2xl bg-white/85 backdrop-blur-md text-slate-700 hover:text-[#FF7A00] hover:bg-white shadow-md border border-slate-200 transition-all opacity-85 group-hover:opacity-100 cursor-pointer"
                  title="Expand Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Main Image */}
                <img
                  src={currentImage.image_url}
                  alt={currentImage.alt_text || product.name}
                  className={`w-full h-full object-cover transition-opacity duration-150 ${isZoomed ? "opacity-0 md:opacity-0" : "opacity-100"
                    }`}
                  loading="eager"
                />

                {/* Desktop Zoom Lens */}
                {isZoomed && (
                  <div
                    className="hidden md:block absolute inset-0 w-full h-full bg-no-repeat pointer-events-none"
                    style={{
                      backgroundImage: `url(${currentImage.image_url})`,
                      backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                      backgroundSize: "230%",
                    }}
                  />
                )}

                {/* Bottom Image Counter & Hint */}
                <div className="absolute bottom-3.5 left-3.5 z-10 bg-[#1E222B]/80 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-xl border border-white/10 flex items-center gap-1.5 pointer-events-none">
                  <Eye className="w-3 h-3 text-[#FF7A00]" />
                  <span>
                    Image {selectedImageIndex + 1} of {images.length} • Tap to enlarge
                  </span>
                </div>

                {/* Mobile Dot Indicators */}
                {images.length > 1 && (
                  <div className="md:hidden absolute bottom-3.5 right-3.5 flex gap-1.5 z-10 pointer-events-none">
                    {images.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === selectedImageIndex
                          ? "w-5 bg-gradient-to-r from-[#FF7A00] to-[#FF2D55]"
                          : "w-1.5 bg-slate-300/80"
                          }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Time Indicator - Flash Deal Urgency Countdown directly down of image */}
              <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-[#1E222B] via-[#2A1D25] to-[#1E222B] text-white border border-orange-500/30 shadow-md">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF2D55] flex items-center justify-center shrink-0 shadow-md shadow-orange-500/30">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-[#FF2D55] truncate">
                        ⚡ FLASH DEAL
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                    </div>
                    <p className="text-[11px] sm:text-xs font-bold text-slate-200 leading-tight truncate">
                      <span className="hidden xs:inline">Special Price </span>Ends In:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 sm:gap-1 font-mono text-center shrink-0 ml-1">
                  <div className="flex flex-col items-center">
                    <span className="min-w-7 sm:min-w-9 py-0.5 sm:py-1 px-1 sm:px-1.5 rounded-lg sm:rounded-xl bg-white/10 text-xs sm:text-sm font-black text-white border border-white/10 shadow-inner">
                      {String(timeLeft.hours).padStart(2, "0")}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-slate-400 font-sans uppercase mt-0.5 font-bold">hrs</span>
                  </div>
                  <span className="text-orange-400 font-black text-xs sm:text-sm -mt-2.5 sm:-mt-3">:</span>
                  <div className="flex flex-col items-center">
                    <span className="min-w-7 sm:min-w-9 py-0.5 sm:py-1 px-1 sm:px-1.5 rounded-lg sm:rounded-xl bg-white/10 text-xs sm:text-sm font-black text-white border border-white/10 shadow-inner">
                      {String(timeLeft.minutes).padStart(2, "0")}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-slate-400 font-sans uppercase mt-0.5 font-bold">mins</span>
                  </div>
                  <span className="text-orange-400 font-black text-xs sm:text-sm -mt-2.5 sm:-mt-3">:</span>
                  <div className="flex flex-col items-center">
                    <span className="min-w-7 sm:min-w-9 py-0.5 sm:py-1 px-1 sm:px-1.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF2D55] text-xs sm:text-sm font-black text-white border border-white/20 shadow-sm shadow-orange-500/40">
                      {String(timeLeft.seconds).padStart(2, "0")}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-orange-300 font-sans uppercase mt-0.5 font-bold">secs</span>
                  </div>
                </div>
              </div>

              {/* Thumbnails Row */}
              {images.length > 1 && (
                <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none snap-x touch-pan-x">
                  {images.map((img, idx) => {
                    const isSelected = selectedImageIndex === idx;
                    return (
                      <button
                        key={img.id || idx}
                        type="button"
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative w-16 h-20 sm:w-22 sm:h-28 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 border-2 transition-all duration-200 cursor-pointer snap-start ${isSelected
                          ? "border-[#FF7A00] ring-3 sm:ring-4 ring-orange-500/20 shadow-md scale-102"
                          : "border-slate-200/90 hover:border-orange-200 opacity-70 hover:opacity-100"
                          }`}
                      >
                        <img
                          src={img.image_url}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Trust & Guarantee Luxury Grid */}
              {/* <div className="grid grid-cols-3 gap-3 p-4 sm:p-5 bg-white rounded-3xl border border-orange-100/80 shadow-sm text-xs">
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2.5 text-slate-700">
                  <div className="w-9 h-9 rounded-2xl bg-orange-50 text-[#FF7A00] flex items-center justify-center shrink-0 border border-orange-100">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-[#1E222B] font-bold text-xs">
                      100% Inspected
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Quality verified before dispatch
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2.5 text-slate-700">
                  <div className="w-9 h-9 rounded-2xl bg-rose-50 text-[#FF2D55] flex items-center justify-center shrink-0 border border-rose-100">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-[#1E222B] font-bold text-xs">
                      Free Shipping
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      All-India doorstep delivery
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2.5 text-slate-700">
                  <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-[#1E222B] font-bold text-xs">
                      7 Days Exchange
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Hassle-free replacement
                    </span>
                  </div>
                </div>
              </div> */}
            </div>
          </div>

          {/* ================= RIGHT COLUMN: PRODUCT CONVERSION DETAILS ================= */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Live Social Proof Badge */}
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-950 bg-gradient-to-r from-orange-50/90 to-rose-50/90 border border-orange-200/80 px-4 py-2.5 rounded-2xl shadow-xs">
              <Flame className="w-4 h-4 text-[#FF7A00] fill-[#FF7A00] shrink-0" />
              <span>
                <strong>High Demand:</strong> 28 people looking at this item right now
              </span>
            </div>

            {/* Product Title & Ratings */}
            <div className="space-y-2">
              {/* <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-gradient-to-r from-[#FF7A00] to-[#FF2D55] text-white px-2.5 py-0.5 rounded-xl text-xs font-black shadow-sm">
                  <span>4.8</span>
                  <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  1,842 Ratings • 420+ Verified Photos
                </span>
                <span className="ml-auto text-xs text-orange-700 font-bold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[#FF7A00]" /> Shoplume Assured
                </span>
              </div> */}

              <h1 className="text-2xl sm:text-3xl font-black text-[#1E222B] leading-snug tracking-tight">
                {product.name}
              </h1>
            </div>

            {/* Price & Offer Card */}
            <div className="p-4 sm:p-6 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5 sm:space-y-4">
              {/* Primary Price & Savings Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1E222B] tracking-tight">
                    {formatINR(currentSellingPrice)}
                  </span>
                  {currentOriginalPrice > currentSellingPrice && (
                    <span className="text-sm sm:text-lg text-slate-400 line-through font-medium">
                      {formatINR(currentOriginalPrice)}
                    </span>
                  )}
                </div>

                {discountPercent > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black text-white bg-gradient-to-r from-[#FF7A00] via-[#FF5520] to-[#FF2D55] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-xs whitespace-nowrap">
                    Save {formatINR(totalSavings)} ({discountPercent}% OFF)
                  </span>
                )}
              </div>

              {/* Symmetrical High-Trust Badges Grid */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-0.5">
                {/* 1. COD Available - Highlighted */}
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-[10px] sm:text-xs font-bold text-center">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">COD Available</span>
                </div>

                {/* 2. Free Delivery */}
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-xl bg-orange-50 border border-orange-200/70 text-orange-950 text-[10px] sm:text-xs font-bold text-center">
                  <Truck className="w-3.5 h-3.5 text-[#FF7A00] shrink-0" />
                  <span className="truncate">Free Delivery</span>
                </div>

                {/* 3. Inclusive of Taxes */}
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 text-[10px] sm:text-xs font-bold text-center">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Taxes Included</span>
                </div>
              </div>

              {/* Clean Payment Assurance Strip */}
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-orange-50/40 via-white to-slate-50/60 border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-[#FF7A00] shrink-0" />
                  <span className="text-slate-700 font-medium text-[10px] sm:text-xs truncate">
                    <strong className="text-[#1E222B] font-bold">Payment:</strong> UPI, Cards, NetBanking & COD
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-slate-400 shrink-0 ml-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span className="hidden xs:inline">100% Safe</span>
                </div>
              </div>
            </div>

            {/* Variant Selector (Size & Color) */}
            <div
              id="variant-picker"
              className="p-4 sm:p-6 bg-white rounded-2xl sm:rounded-3xl border border-orange-100/90 shadow-sm space-y-4"
            >
              {/* Size Selector */}
              {availableSizes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Select Size
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSizeGuide(true)}
                      className="text-xs font-bold text-[#FF5520] hover:text-[#FF2D55] flex items-center gap-1.5 cursor-pointer hover:underline"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>Size Chart</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariantId === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariantId(v.id)}
                          className={`p-3 rounded-2xl text-xs font-extrabold transition-all duration-200 border text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${isSelected
                            ? "bg-[#1E222B] text-white border-[#1E222B] shadow-md ring-4 ring-orange-500/20 scale-[1.02]"
                            : "bg-orange-50/20 text-slate-800 border-slate-200 hover:border-orange-300 hover:bg-orange-50/50"
                            } ${!v.is_available ? "opacity-40 cursor-not-allowed" : ""}`}
                          disabled={!v.is_available}
                        >
                          <span className="text-sm font-black">{v.size || "Standard"}</span>
                          <span
                            className={`text-[10px] ${isSelected ? "text-amber-300 font-semibold" : "text-slate-400"
                              }`}
                          >
                            {v.stock_quantity && v.stock_quantity < 10
                              ? "Few Left"
                              : "In Stock"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Color Swatch Display */}
              {availableColors.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Available Color:{" "}
                      <span className="text-[#FF5520] font-bold normal-case">
                        {selectedVariant?.color || availableColors[0]}
                      </span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map((col) => (
                      <span
                        key={col}
                        className="px-3 py-1.5 rounded-xl bg-orange-50/70 text-slate-800 text-xs font-bold border border-orange-200/60"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Counter */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 block">
                    Quantity
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Max 10 units per order
                  </span>
                </div>

                <div className="flex items-center border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center font-bold text-slate-700 hover:bg-orange-100 hover:text-orange-700 active:bg-orange-200 text-lg select-none cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-sm font-black text-slate-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    className="w-10 h-10 flex items-center justify-center font-bold text-slate-700 hover:bg-orange-100 hover:text-orange-700 active:bg-orange-200 text-lg select-none cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* PIN Code Delivery Checker */}
            {/* <div className="p-5 sm:p-6 bg-white rounded-3xl border border-orange-100/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Delivery & Pincode Check
                </label>
                <span className="text-[11px] text-[#FF5520] font-bold">
                  Fast Courier Dispatch
                </span>
              </div>

              <form onSubmit={handlePincodeCheck} className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit Delivery PIN"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00] font-medium"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-[#1E222B] text-white hover:bg-slate-800 text-sm font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Check
                </button>
              </form>

              {pincodeResult.status === "valid" && (
                <div className="p-3 rounded-2xl bg-orange-50/90 border border-orange-200/70 text-xs font-semibold text-orange-950 flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-[#FF7A00] shrink-0" />
                  <span>
                    {pincodeResult.message} • <strong>FREE Express Shipping</strong>
                  </span>
                </div>
              )}
              {pincodeResult.status === "invalid" && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pincodeResult.message}</span>
                </div>
              )}
            </div> */}

            {/* BUY NOW Call-To-Action (Shoplume Signature Gradient) */}
            <div id="main-buy-button" className="flex flex-col gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl bg-gradient-to-r from-[#FF7A00] via-[#FF5520] to-[#FF2D55] text-white font-black text-base sm:text-lg shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:brightness-105 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 sm:gap-3 border border-white/20"
              >
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-300 text-amber-300 shrink-0" />
                <span className="truncate">
                  BUY NOW • {formatINR(currentSellingPrice * quantity)}
                </span>
              </button>

              <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs text-slate-500 font-medium text-center">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-[#FF7A00]" /> 100% Safe Payments
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-[#FF7A00]" /> Doorstep Dispatch
                </span>
                <span className="flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" /> COD Available
                </span>
              </div>
            </div>

            {/* Product Details & Specifications Tabbed Section */}
            <div className="p-4 sm:p-6 bg-white rounded-2xl sm:rounded-3xl border border-orange-100/90 shadow-sm space-y-4">
              <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTab("details")}
                  className={`pb-2.5 sm:pb-3 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer border-b-2 mr-3 sm:mr-5 whitespace-nowrap ${activeTab === "details"
                    ? "border-[#FF7A00] text-[#FF5520]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                    }`}
                >
                  Description
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("specs")}
                  className={`pb-2.5 sm:pb-3 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer border-b-2 whitespace-nowrap ${activeTab === "specs"
                    ? "border-[#FF7A00] text-[#FF5520]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                    }`}
                >
                  Specifications
                </button>
              </div>

              {activeTab === "details" && (
                <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line space-y-3">
                  <p>{product.description}</p>
                </div>
              )}

              {activeTab === "specs" && (
                <div className="space-y-2">
                  {product.specifications &&
                    Object.keys(product.specifications).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {Object.entries(product.specifications).map(([key, val]) => (
                        <div
                          key={key}
                          className="flex justify-between p-2.5 rounded-2xl bg-orange-50/40 border border-orange-100/80"
                        >
                          <span className="text-slate-500 font-medium">{key}:</span>
                          <span className="text-slate-900 font-bold text-right ml-2">
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Standard verified specifications apply.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Verified Buyer Ratings & Reviews Breakdown */}
            <div className="p-4 sm:p-6 bg-white rounded-2xl sm:rounded-3xl border border-orange-100/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#1E222B]">
                    Customer Ratings & Reviews
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Based on 1,842 verified Indian buyers
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-[#1E222B]">4.8</span>
                  <div className="flex text-amber-400 text-xs justify-end">{"★".repeat(5)}</div>
                </div>
              </div>

              {/* Star Rating Breakdown Bar */}
              <div className="space-y-1.5 text-xs">
                {[
                  { star: "5 ★", pct: "84%" },
                  { star: "4 ★", pct: "11%" },
                  { star: "3 ★", pct: "3%" },
                  { star: "2 ★", pct: "1%" },
                  { star: "1 ★", pct: "1%" },
                ].map((item) => (
                  <div key={item.star} className="flex items-center gap-2 sm:gap-3">
                    <span className="w-8 text-slate-600 font-semibold text-[11px] sm:text-xs">{item.star}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#FF7A00] to-[#FF2D55] rounded-full"
                        style={{ width: item.pct }}
                      />
                    </div>
                    <span className="w-8 text-right text-slate-400 text-[10px] sm:text-[11px]">
                      {item.pct}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Frequently Asked Questions (FAQ) Accordion */}
            <div className="p-4 sm:p-6 bg-white rounded-2xl sm:rounded-3xl border border-orange-100/90 shadow-sm space-y-3">
              <h3 className="font-extrabold text-sm sm:text-base text-[#1E222B] mb-2">
                Frequently Asked Questions
              </h3>

              {[
                {
                  q: "What payment methods are supported?",
                  a: "We support 100% secure payments via Razorpay including Google Pay, PhonePe, Paytm, BHIM UPI, all major Debit/Credit Cards, Net Banking, and Cash on Delivery (COD).",
                },
                {
                  q: "How long does delivery take?",
                  a: "Orders are processed within 24 hours and delivered in 3 to 5 business days across India via express couriers (Delhivery, Shadowfax).",
                },
                {
                  q: "How can I track my order?",
                  a: "After completing your purchase, you receive an instant order tracking page with live status updates and your courier AWB number.",
                },
              ].map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-orange-100 rounded-xl sm:rounded-2xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-3 sm:p-3.5 text-left text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-between hover:bg-orange-50/40 transition-colors cursor-pointer"
                    >
                      <span className="pr-2">{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-[#FF7A00] shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-3 sm:px-3.5 pb-3 sm:pb-3.5 text-xs text-slate-600 leading-relaxed border-t border-orange-100 pt-2 bg-orange-50/30">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* ================= FIXED STICKY MOBILE & SCROLL CTA BAR (Shoplume Signature) ================= */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-orange-100 px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-2xl transition-transform duration-300 ${showStickyBar ? "translate-y-0" : "translate-y-0 md:translate-y-full"
          }`}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src={currentImage.image_url}
              alt={product.name}
              className="w-10 h-12 sm:w-12 sm:h-14 object-cover rounded-xl sm:rounded-2xl border border-orange-200 shrink-0 hidden sm:block"
            />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-2xl font-black text-[#1E222B] whitespace-nowrap">
                  {formatINR(currentSellingPrice * quantity)}
                </span>
                {currentOriginalPrice > currentSellingPrice && (
                  <span className="text-[11px] sm:text-xs text-slate-400 line-through whitespace-nowrap hidden xs:inline">
                    {formatINR(currentOriginalPrice * quantity)}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="text-[9px] sm:text-[10px] font-extrabold text-white bg-gradient-to-r from-[#FF7A00] to-[#FF2D55] px-1 sm:px-1.5 py-0.5 rounded-md whitespace-nowrap hidden xs:inline">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
                COD Available
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBuyNow}
            className="flex-1 max-w-[200px] sm:max-w-[280px] py-3 sm:py-3.5 px-3.5 sm:px-6 rounded-2xl bg-gradient-to-r from-[#FF7A00] via-[#FF5520] to-[#FF2D55] text-white font-black text-xs sm:text-base shadow-lg shadow-orange-500/30 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border border-white/20 whitespace-nowrap"
          >
            <Zap className="w-4 h-4 fill-amber-300 text-amber-300 shrink-0" />
            <span>BUY NOW</span>
          </button>
        </div>
      </div>

      {/* ================= FULLSCREEN IMAGE LIGHTBOX MODAL ================= */}
      {showLightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            onClick={() => setShowLightbox(false)}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
            aria-label="Close Lightbox"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] w-full flex items-center justify-center">
            <img
              src={currentImage.image_url}
              alt="Fullscreen Zoom"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl sm:rounded-3xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* ================= SIZE GUIDE MODAL ================= */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 border border-orange-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm sm:text-base text-[#1E222B] flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[#FF7A00]" /> Standard Size Chart
              </h3>
              <button
                type="button"
                onClick={() => setShowSizeGuide(false)}
                className="text-slate-400 hover:text-slate-700 min-w-[36px] min-h-[36px] flex items-center justify-center font-bold cursor-pointer"
                aria-label="Close Size Chart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 sm:mt-4 text-xs space-y-3">
              <p className="text-slate-500 text-[11px] sm:text-xs">
                All measurements are in inches. If you prefer a loose or comfort fit, we recommend ordering one size up.
              </p>
              <div className="overflow-x-auto -mx-1 sm:mx-0">
                <table className="w-full text-left border-collapse border border-slate-200 rounded-xl overflow-hidden min-w-[270px]">
                  <thead>
                    <tr className="bg-orange-50/70 text-slate-800 font-bold text-[11px] sm:text-xs">
                      <th className="p-2 sm:p-2.5 border border-slate-200">Size</th>
                      <th className="p-2 sm:p-2.5 border border-slate-200">Bust/Chest</th>
                      <th className="p-2 sm:p-2.5 border border-slate-200">Waist</th>
                      <th className="p-2 sm:p-2.5 border border-slate-200">Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-600 font-medium text-[11px] sm:text-xs">
                    <tr>
                      <td className="p-2 sm:p-2.5 font-bold border border-slate-200 text-slate-900">
                        S (36)
                      </td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">36"</td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">32"</td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">46"</td>
                    </tr>
                    <tr>
                      <td className="p-2 sm:p-2.5 font-bold border border-slate-200 text-slate-900">
                        M (38)
                      </td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">38"</td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">34"</td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">47"</td>
                    </tr>
                    <tr>
                      <td className="p-2 sm:p-2.5 font-bold border border-slate-200 text-slate-900">
                        L (40)
                      </td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">40"</td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">36"</td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">48"</td>
                    </tr>
                    <tr>
                      <td className="p-2 sm:p-2.5 font-bold border border-slate-200 text-slate-900">
                        XL (42)
                      </td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">42"</td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">38"</td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">48"</td>
                    </tr>
                    <tr>
                      <td className="p-2 sm:p-2.5 font-bold border border-slate-200 text-slate-900">
                        XXL (44)
                      </td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">44"</td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">40"</td>
                      <td className="p-2 sm:p-2.5 border border-slate-200">49"</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 sm:mt-5">
              <button
                type="button"
                className="w-full py-2.5 rounded-2xl bg-[#1E222B] text-white hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
                onClick={() => setShowSizeGuide(false)}
              >
                Close Size Chart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

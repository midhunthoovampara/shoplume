import Link from "next/link";
import { getAllProducts } from "@/lib/data/store";
import { formatINR, calculateDiscount } from "@/lib/utils";
import { ArrowRight, ShieldCheck, Zap, Lock, Truck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const products = await getAllProducts(false);
  const featuredProduct = products[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-orange-500/10 via-rose-500/10 to-orange-500/10 border-b border-orange-500/20 py-2.5 px-4 text-center text-xs text-orange-200 font-semibold flex items-center justify-center gap-2">
        <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        <span>Direct-to-Consumer Link Commerce Platform • Manual Meesho Sourcing</span>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-12 flex-1 flex flex-col justify-center items-center text-center">
        <div className="mb-6 flex flex-col items-center">
          <img
            src="/logo-white.png"
            alt="Shoplume"
            className="h-12 sm:h-14 w-auto object-contain mb-4"
          />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
            <span>Direct-Link Selling Model Active</span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight max-w-2xl">
          Direct Product Selling with Shoplume
        </h1>
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
          Customized for traffic from WhatsApp, Instagram Ads, and Facebook. Customers buy directly from independent product landing funnels with Razorpay, and orders are fulfilled manually from Meesho.
        </p>

        {/* Quick Launch Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {featuredProduct && (
            <Link href={`/product/${featuredProduct.slug}`}>
              <button className="py-3 px-6 rounded-2xl bg-gradient-to-r from-[#FF7A00] via-[#FF5520] to-[#FF2D55] text-white font-extrabold text-sm shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer">
                <span>View Live Product Funnel</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          )}

          <Link href="/admin">
            <button className="py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer">
              <Lock className="w-4 h-4 text-orange-400" />
              <span>Admin Console</span>
            </button>
          </Link>

          <Link href="/track">
            <button className="py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer">
              <Truck className="w-4 h-4 text-slate-400" />
              <span>Track Order</span>
            </button>
          </Link>
        </div>

        {/* Available Live Direct Product Links */}
        <div className="mt-14 w-full text-left">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 text-center">
            Active Direct Product Selling Links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {products.map((p) => {
              const discount = calculateDiscount(p.original_price, p.selling_price);
              return (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className="group p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-850 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={p.images[0]?.image_url}
                      alt={p.name}
                      className="w-12 h-14 object-cover rounded-xl border border-slate-800 shrink-0"
                    />
                    <div>
                      <h3 className="font-bold text-xs text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                        {p.name}
                      </h3>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-sm font-black text-[#FF7A00]">
                          {formatINR(p.selling_price)}
                        </span>
                        <span className="text-[11px] text-slate-500 line-through">
                          {formatINR(p.original_price)}
                        </span>
                        {discount > 0 && (
                          <span className="text-[10px] text-rose-400 font-bold">
                            {discount}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-900 text-center text-xs text-slate-600">
        <p>
          Minimal E-Commerce with Manual Meesho Fulfillment • Razorpay & Supabase Integrated
        </p>
      </footer>
    </div>
  );
}

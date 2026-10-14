import { Suspense } from "react";
import { Metadata } from "next";
import { getAllProducts } from "@/lib/data/store";
import { CheckoutView } from "@/components/checkout/CheckoutView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Secure Checkout | Shoplume",
  description: "Fast 1-page guest checkout. 100% secure payment via Razorpay.",
};

export default async function CheckoutPage() {
  const products = await getAllProducts(false);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFFDFB] flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7A00]" />
        </div>
      }
    >
      <CheckoutView products={products} />
    </Suspense>
  );
}

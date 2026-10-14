import { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAuthenticatedAdmin } from "@/lib/auth";
import {
  getAdminOrders,
  getAllProducts,
  getAdminDashboardMetrics,
} from "@/lib/data/store";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Console | Meesho Direct Fulfillment",
  description: "Manage orders, manual Meesho fulfillment, and product catalog.",
};

export default async function AdminPage() {
  const isAuth = await isAuthenticatedAdmin();

  if (!isAuth) {
    redirect("/admin/login");
  }

  const [orders, products, metrics] = await Promise.all([
    getAdminOrders(),
    getAllProducts(true),
    getAdminDashboardMetrics(),
  ]);

  return (
    <AdminDashboard
      initialOrders={orders}
      initialProducts={products}
      initialMetrics={metrics}
    />
  );
}

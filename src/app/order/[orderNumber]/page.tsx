import { Metadata } from "next";
import { OrderConfirmationView } from "@/components/order/OrderConfirmationView";

interface PageProps {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ token?: string }>;
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Status & Confirmation | Shoplume",
  description: "Live delivery status and order confirmation details.",
};

export default async function OrderConfirmationPage(props: PageProps) {
  const { orderNumber } = await props.params;
  const { token } = await props.searchParams;

  return (
    <OrderConfirmationView
      orderNumber={orderNumber}
      initialToken={token}
    />
  );
}

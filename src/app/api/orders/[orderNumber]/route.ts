import { NextRequest, NextResponse } from "next/server";
import { getOrderByNumberAndToken } from "@/lib/data/store";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await context.params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const phone = searchParams.get("phone");

    const order = await getOrderByNumberAndToken(orderNumber, token);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found or unauthorized access" },
        { status: 404 }
      );
    }

    // If phone verification is used instead of token
    if (!token && phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      const orderPhone = order.customer_phone.replace(/\D/g, "");
      if (cleanPhone !== orderPhone) {
        return NextResponse.json(
          { error: "Phone number does not match this order" },
          { status: 403 }
        );
      }
    } else if (!token && !phone) {
      return NextResponse.json(
        { error: "Access token or customer phone is required to track this order" },
        { status: 401 }
      );
    }

    // Sanitize output to never expose internal Meesho supplier info or admin cost
    const publicSafeOrder = {
      order_number: order.order_number,
      customer_name: order.customer_name,
      shipping_address: order.shipping_address,
      subtotal: order.subtotal,
      shipping_charge: order.shipping_charge,
      total_amount: order.total_amount,
      payment_status: order.payment_status,
      fulfillment_status: order.fulfillment_status,
      created_at: order.created_at,
      items: order.items,
      tracking: order.supplier_purchase
        ? {
            courier_name: order.supplier_purchase.courier_name,
            tracking_number: order.supplier_purchase.tracking_number,
            tracking_url: order.supplier_purchase.tracking_url,
          }
        : null,
      history: (order.history || []).map((h) => ({
        status: h.new_status,
        date: h.changed_at,
      })),
    };

    return NextResponse.json({ success: true, order: publicSafeOrder });
  } catch (error) {
    console.error("Order lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

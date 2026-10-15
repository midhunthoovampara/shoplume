import { NextRequest, NextResponse } from "next/server";
import { createOrderInputSchema } from "@/types";
import { createPendingOrder } from "@/lib/data/store";
import { createRazorpayOrder } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = createOrderInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const input = parseResult.data;
    const isCod = input.paymentMethod === "cod";

    // Create the pending order first in the database with server-authoritative price
    const { order, authoritativeAmount } = await createPendingOrder(
      input,
      undefined,
      isCod ? "cod" : "online"
    );

    // If Cash on Delivery, return confirmed order immediately (no Razorpay order needed)
    if (isCod) {
      return NextResponse.json({
        success: true,
        isCod: true,
        orderId: order.id,
        orderNumber: order.order_number,
        orderAccessToken: order.order_access_token,
        amountInRupees: authoritativeAmount,
        customer: {
          name: order.customer_name,
          phone: order.customer_phone,
          email: order.customer_email,
        },
      });
    }

    // Create Razorpay order using the server-calculated amount
    const rzpOrder = await createRazorpayOrder({
      amountInRupees: authoritativeAmount,
      receipt: order.order_number,
      notes: {
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: input.customer.fullName,
        customerPhone: input.customer.phone,
      },
    });

    return NextResponse.json({
      success: true,
      isCod: false,
      orderId: order.id,
      orderNumber: order.order_number,
      orderAccessToken: order.order_access_token,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount, // in paise
      amountInRupees: authoritativeAmount,
      currency: "INR",
      keyId:
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        process.env.RAZORPAY_KEY_ID ||
        "rzp_test_demo_mode",
      isMock: rzpOrder.isMock,
      customer: {
        name: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email,
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initialize order",
      },
      { status: 500 }
    );
  }
}

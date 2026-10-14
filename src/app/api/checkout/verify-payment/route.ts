import { NextRequest, NextResponse } from "next/server";
import { verifyPaymentSchema } from "@/types";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { markOrderAsPaid, getOrderById } from "@/lib/data/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = verifyPaymentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment verification data",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      parseResult.data;

    // Verify cryptographic signature
    const isValid = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      console.warn("Invalid payment signature received:", {
        orderId,
        razorpay_order_id,
        razorpay_payment_id,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Payment verification failed. Signature mismatch.",
          retryable: true,
        },
        { status: 400 }
      );
    }

    // Atomically mark order as Paid and transition to awaiting_purchase
    const updatedOrder = await markOrderAsPaid(orderId, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!updatedOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified and order confirmed",
      orderNumber: updatedOrder.order_number,
      orderAccessToken: updatedOrder.order_access_token,
      paymentStatus: updatedOrder.payment_status,
      fulfillmentStatus: updatedOrder.fulfillment_status,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Server error during payment verification",
      },
      { status: 500 }
    );
  }
}

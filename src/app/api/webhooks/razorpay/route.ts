import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { markOrderAsPaid, getOrderById } from "@/lib/data/store";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.warn("Unauthorized webhook call: signature mismatch");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const payload = event.payload;

    console.log(`Received Razorpay webhook event: ${eventType}`);

    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = payload.payment?.entity;
      const orderEntity = payload.order?.entity;

      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const razorpayPaymentId = paymentEntity?.id;
      const receipt = orderEntity?.receipt || paymentEntity?.notes?.orderNumber;

      if (receipt || razorpayOrderId) {
        await markOrderAsPaid(receipt || razorpayOrderId, {
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId || `pay_wh_${Date.now()}`,
          amount: paymentEntity?.amount ? paymentEntity.amount / 100 : undefined,
        });
      }
    }

    return NextResponse.json({ received: true, event: eventType });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

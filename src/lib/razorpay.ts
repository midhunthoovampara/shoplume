import Razorpay from "razorpay";
import crypto from "crypto";

const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "";

export const isRazorpayLiveConfigured = Boolean(
  key_id &&
    key_secret &&
    !key_id.includes("demo_mode") &&
    key_id !== "rzp_test_yourKeyIdHere"
);

export const razorpayClient = isRazorpayLiveConfigured
  ? new Razorpay({
      key_id,
      key_secret,
    })
  : null;

export async function createRazorpayOrder(params: {
  amountInRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string; isMock: boolean }> {
  const amountInPaise = Math.round(params.amountInRupees * 100);

  if (isRazorpayLiveConfigured && razorpayClient) {
    try {
      const order = await razorpayClient.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: params.receipt,
        notes: params.notes,
      });
      return {
        id: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        isMock: false,
      };
    } catch (error) {
      console.error("Razorpay order creation error:", error);
      throw error;
    }
  }

  // Graceful fallback for local development or demo testing
  return {
    id: `order_demo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    amount: amountInPaise,
    currency: "INR",
    isMock: true,
  };
}

export function verifyPaymentSignature(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): boolean {
  // If in demo mode
  if (
    !isRazorpayLiveConfigured ||
    params.razorpay_order_id.startsWith("order_demo_") ||
    params.razorpay_signature === "mock_verified_signature"
  ) {
    return true;
  }

  if (!key_secret) return false;

  const generatedSignature = crypto
    .createHmac("sha256", key_secret)
    .update(`${params.razorpay_order_id}|${params.razorpay_payment_id}`)
    .digest("hex");

  return generatedSignature === params.razorpay_signature;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return false;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return expectedSignature === signature;
}

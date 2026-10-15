import { z } from "zod";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type FulfillmentStatus =
  | "awaiting_purchase"
  | "purchased_from_meesho"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "purchase_failed"
  | "return_requested"
  | "returned";

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text?: string;
  sort_order: number;
  created_at?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size?: string;
  color?: string;
  sku?: string;
  selling_price_override?: number | null;
  expected_purchase_cost?: number | null;
  is_available: boolean;
  stock_quantity?: number;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  selling_price: number;
  original_price: number;
  expected_purchase_cost: number;
  meesho_product_url?: string;
  meesho_product_id?: string;
  supplier_notes?: string;
  last_verified_price?: number | null;
  last_verified_availability?: boolean;
  is_active: boolean;
  specifications?: Record<string, string>;
  video_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductWithDetails extends Product {
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface CustomerAddress {
  house: string;
  street: string;
  landmark?: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string | null;
  product_name_snapshot: string;
  variant_snapshot?: string | null;
  image_snapshot?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface SupplierPurchase {
  id: string;
  order_id: string;
  meesho_order_id?: string | null;
  actual_purchase_cost?: number | null;
  purchased_at?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  courier_name?: string | null;
  admin_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status?: string | null;
  new_status: string;
  changed_by?: string;
  changed_at?: string;
  notes?: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  order_access_token: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  shipping_address: CustomerAddress;
  subtotal: number;
  shipping_charge: number;
  total_amount: number;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderWithDetails extends Order {
  items: OrderItem[];
  supplier_purchase?: SupplierPurchase | null;
  history?: OrderStatusHistory[];
  payment?: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    status?: string;
    amount?: number;
    verified_at?: string;
    payment_method?: "online" | "cod" | string;
  } | null;
  payment_method?: "online" | "cod" | string;
  product_supplier_url?: string; // admin view helper
}

// Zod Validation Schemas
export const checkoutAddressSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  house: z.string().min(2, "House / Flat / Building is required"),
  street: z.string().min(3, "Street / Area is required"),
  landmark: z.string().optional().or(z.literal("")),
  city: z.string().min(2, "City is required"),
  district: z.string().min(2, "District is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Must be a valid 6-digit PIN code"),
});

export const createOrderInputSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().min(1).max(10).default(1),
  customer: checkoutAddressSchema,
  paymentMethod: z.enum(["online", "cod"]).default("online"),
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export const updateSupplierPurchaseSchema = z.object({
  meesho_order_id: z.string().optional().nullable(),
  actual_purchase_cost: z.number().min(0).optional().nullable(),
  purchased_at: z.string().optional().nullable(),
  tracking_number: z.string().optional().nullable(),
  tracking_url: z.string().optional().nullable(),
  courier_name: z.string().optional().nullable(),
  admin_notes: z.string().optional().nullable(),
  fulfillment_status: z
    .enum([
      "awaiting_purchase",
      "purchased_from_meesho",
      "shipped",
      "delivered",
      "cancelled",
      "purchase_failed",
      "return_requested",
      "returned",
    ])
    .optional(),
});

export type UpdateSupplierPurchaseInput = z.infer<
  typeof updateSupplierPurchaseSchema
>;

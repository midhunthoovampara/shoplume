import {
  ProductWithDetails,
  OrderWithDetails,
  CreateOrderInput,
  UpdateSupplierPurchaseInput,
  Product,
} from "@/types";
import { INITIAL_PRODUCTS, INITIAL_ORDERS } from "./mock-data";
import { generateOrderNumber, generateToken } from "../utils";
import { supabaseAdmin, isSupabaseAdminConfigured } from "../supabase/admin";

// In-memory persistent cache for zero-config local development and preview
declare global {
  // eslint-disable-next-line no-var
  var __meesho_products_store: ProductWithDetails[] | undefined;
  // eslint-disable-next-line no-var
  var __meesho_orders_store: OrderWithDetails[] | undefined;
}

function getLocalProductsStore(): ProductWithDetails[] {
  if (!global.__meesho_products_store) {
    global.__meesho_products_store = JSON.parse(
      JSON.stringify(INITIAL_PRODUCTS)
    );
  }
  return global.__meesho_products_store!;
}

function getLocalOrdersStore(): OrderWithDetails[] {
  if (!global.__meesho_orders_store) {
    global.__meesho_orders_store = JSON.parse(JSON.stringify(INITIAL_ORDERS));
  }
  return global.__meesho_orders_store!;
}

// Strip confidential Meesho supplier information for public customer queries
export function sanitizePublicProduct(
  product: ProductWithDetails
): ProductWithDetails {
  const sanitized: ProductWithDetails = {
    ...product,
    expected_purchase_cost: 0,
    meesho_product_url: undefined,
    meesho_product_id: undefined,
    supplier_notes: undefined,
    last_verified_price: undefined,
    variants: product.variants.map((v) => ({
      ...v,
      expected_purchase_cost: 0,
    })),
  };
  return sanitized;
}

export async function getProductBySlug(
  slug: string,
  isAdmin = false
): Promise<ProductWithDetails | null> {
  if (isSupabaseAdminConfigured && supabaseAdmin) {
    try {
      const { data: product, error } = await supabaseAdmin
        .from("products")
        .select("*, images:product_images(*), variants:product_variants(*)")
        .eq("slug", slug)
        .single();

      if (error || !product) {
        console.warn("Supabase fetch failed, falling back to local store:", error);
      } else {
        const fullProduct = {
          ...product,
          images: (product.images || []).sort(
            (a: { sort_order: number }, b: { sort_order: number }) =>
              a.sort_order - b.sort_order
          ),
          variants: product.variants || [],
        } as ProductWithDetails;

        return isAdmin ? fullProduct : sanitizePublicProduct(fullProduct);
      }
    } catch (err) {
      console.warn("Supabase exception, falling back to local store:", err);
    }
  }

  const products = getLocalProductsStore();
  const found = products.find(
    (p) => p.slug === slug && (isAdmin || p.is_active)
  );
  if (!found) return null;
  return isAdmin ? found : sanitizePublicProduct(found);
}

export async function getProductById(
  id: string,
  isAdmin = false
): Promise<ProductWithDetails | null> {
  if (isSupabaseAdminConfigured && supabaseAdmin) {
    try {
      const { data: product, error } = await supabaseAdmin
        .from("products")
        .select("*, images:product_images(*), variants:product_variants(*)")
        .eq("id", id)
        .single();

      if (!error && product) {
        const fullProduct = {
          ...product,
          images: (product.images || []).sort(
            (a: { sort_order: number }, b: { sort_order: number }) =>
              a.sort_order - b.sort_order
          ),
          variants: product.variants || [],
        } as ProductWithDetails;
        return isAdmin ? fullProduct : sanitizePublicProduct(fullProduct);
      }
    } catch (err) {
      console.warn("Supabase exception, falling back:", err);
    }
  }

  const products = getLocalProductsStore();
  const found = products.find((p) => p.id === id);
  if (!found) return null;
  return isAdmin ? found : sanitizePublicProduct(found);
}

export async function getAllProducts(
  isAdmin = false
): Promise<ProductWithDetails[]> {
  if (isSupabaseAdminConfigured && supabaseAdmin) {
    try {
      let query = supabaseAdmin
        .from("products")
        .select("*, images:product_images(*), variants:product_variants(*)");

      if (!isAdmin) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (!error && data && data.length > 0) {
        const mapped = data.map((p) => ({
          ...p,
          images: (p.images || []).sort(
            (a: { sort_order: number }, b: { sort_order: number }) =>
              a.sort_order - b.sort_order
          ),
          variants: p.variants || [],
        })) as ProductWithDetails[];
        return isAdmin ? mapped : mapped.map(sanitizePublicProduct);
      }
    } catch (err) {
      console.warn("Supabase fetch failed, falling back to local store:", err);
    }
  }

  const products = getLocalProductsStore();
  const filtered = isAdmin ? products : products.filter((p) => p.is_active);
  return isAdmin ? filtered : filtered.map(sanitizePublicProduct);
}

function isValidUUID(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export async function saveProduct(
  productData: Partial<ProductWithDetails>
): Promise<ProductWithDetails> {
  const products = getLocalProductsStore();
  const isNew = !productData.id || !products.some((p) => p.id === productData.id);

  const id = isValidUUID(productData.id) ? productData.id! : crypto.randomUUID();
  const slug =
    productData.slug ||
    (productData.name || "product")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  const fullProduct: ProductWithDetails = {
    id,
    name: productData.name || "Untitled Product",
    slug,
    description: productData.description || "",
    selling_price: Number(productData.selling_price) || 0,
    original_price: Number(productData.original_price) || 0,
    expected_purchase_cost: Number(productData.expected_purchase_cost) || 0,
    meesho_product_url: productData.meesho_product_url || "",
    meesho_product_id: productData.meesho_product_id || "",
    supplier_notes: productData.supplier_notes || "",
    last_verified_price: Number(productData.last_verified_price) || 0,
    last_verified_availability: productData.last_verified_availability ?? true,
    is_active: productData.is_active ?? true,
    specifications: productData.specifications || {},
    video_url: productData.video_url || "",
    images:
      productData.images && productData.images.length > 0
        ? productData.images.map((img, idx) => ({
            id: isValidUUID(img.id) ? img.id : crypto.randomUUID(),
            product_id: id,
            image_url: img.image_url,
            alt_text: img.alt_text || productData.name,
            sort_order: idx,
          }))
        : [
            {
              id: crypto.randomUUID(),
              product_id: id,
              image_url:
                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80",
              alt_text: productData.name,
              sort_order: 0,
            },
          ],
    variants:
      productData.variants && productData.variants.length > 0
        ? productData.variants.map((v, idx) => ({
            id: isValidUUID(v.id) ? v.id : crypto.randomUUID(),
            product_id: id,
            size: v.size?.trim() || undefined,
            color: v.color?.trim() || undefined,
            sku: v.sku || `SKU-${Date.now()}-${idx}`,
            selling_price_override: v.selling_price_override ?? null,
            expected_purchase_cost: v.expected_purchase_cost ?? null,
            is_available: v.is_available ?? true,
            stock_quantity: v.stock_quantity ?? 50,
          }))
        : [],
    created_at: productData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isNew) {
    products.unshift(fullProduct);
  } else {
    const idx = products.findIndex((p) => p.id === id);
    if (idx !== -1) {
      products[idx] = fullProduct;
    } else {
      products.unshift(fullProduct);
    }
  }

  // Also write to Supabase if configured
  if (isSupabaseAdminConfigured && supabaseAdmin) {
    try {
      const { error: pErr } = await supabaseAdmin.from("products").upsert({
        id: fullProduct.id,
        name: fullProduct.name,
        slug: fullProduct.slug,
        description: fullProduct.description,
        selling_price: fullProduct.selling_price,
        original_price: fullProduct.original_price,
        expected_purchase_cost: fullProduct.expected_purchase_cost,
        meesho_product_url: fullProduct.meesho_product_url,
        meesho_product_id: fullProduct.meesho_product_id,
        supplier_notes: fullProduct.supplier_notes,
        last_verified_price: fullProduct.last_verified_price,
        last_verified_availability: fullProduct.last_verified_availability,
        is_active: fullProduct.is_active,
        specifications: fullProduct.specifications,
        video_url: fullProduct.video_url,
        updated_at: new Date().toISOString(),
      });
      if (pErr) {
        console.warn("Supabase product upsert error:", pErr);
      } else {
        // Upsert images
        if (fullProduct.images && fullProduct.images.length > 0) {
          await supabaseAdmin
            .from("product_images")
            .delete()
            .eq("product_id", fullProduct.id);
          const imagesToInsert = fullProduct.images.map((img) => ({
            id: img.id,
            product_id: fullProduct.id,
            image_url: img.image_url,
            alt_text: img.alt_text || fullProduct.name,
            sort_order: img.sort_order ?? 0,
          }));
          const { error: imgErr } = await supabaseAdmin
            .from("product_images")
            .insert(imagesToInsert);
          if (imgErr) console.warn("Supabase images insert error:", imgErr);
        }

        // Upsert variants
        if (fullProduct.variants && fullProduct.variants.length > 0) {
          await supabaseAdmin
            .from("product_variants")
            .delete()
            .eq("product_id", fullProduct.id);
          const variantsToInsert = fullProduct.variants.map((v) => ({
            id: v.id,
            product_id: fullProduct.id,
            size: v.size || null,
            color: v.color || null,
            sku: v.sku || null,
            selling_price_override: v.selling_price_override || null,
            expected_purchase_cost: v.expected_purchase_cost || null,
            is_available: v.is_available ?? true,
            stock_quantity: v.stock_quantity ?? 50,
          }));
          const { error: varErr } = await supabaseAdmin
            .from("product_variants")
            .insert(variantsToInsert);
          if (varErr) console.warn("Supabase variants insert error:", varErr);
        }
      }
    } catch (e) {
      console.warn("Supabase upsert exception:", e);
    }
  }

  return fullProduct;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const products = getLocalProductsStore();
  const idx = products.findIndex((p) => p.id === id);
  if (idx !== -1) {
    products.splice(idx, 1);
  }

  if (isSupabaseAdminConfigured && supabaseAdmin) {
    try {
      if (isValidUUID(id)) {
        await supabaseAdmin.from("products").delete().eq("id", id);
      }
    } catch (e) {
      console.warn("Supabase delete exception:", e);
    }
  }
  return true;
}

// Order Management
export async function createPendingOrder(
  input: CreateOrderInput,
  razorpayOrderId?: string,
  paymentMethod: "online" | "cod" = "online"
): Promise<{ order: OrderWithDetails; authoritativeAmount: number }> {
  const product = await getProductById(input.productId, true);
  if (!product) {
    throw new Error("Product not found");
  }

  const isCod = paymentMethod === "cod" || input.paymentMethod === "cod";
  const finalPaymentMethod = isCod ? "cod" : "online";

  let unitPrice = product.selling_price;
  let variantSnapshot: string | null = null;

  if (input.variantId) {
    const variant = product.variants.find((v) => v.id === input.variantId);
    if (variant) {
      if (
        variant.selling_price_override &&
        variant.selling_price_override > 0
      ) {
        unitPrice = variant.selling_price_override;
      }
      variantSnapshot = [variant.size, variant.color]
        .filter(Boolean)
        .join(" / ") || null;
    }
  }

  const quantity = Math.max(1, input.quantity || 1);
  const subtotal = unitPrice * quantity;
  const shippingCharge = 0; // Free shipping
  const totalAmount = subtotal + shippingCharge;

  const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const orderNumber = generateOrderNumber();
  const orderAccessToken = generateToken(32);

  const mainImage = product.images[0]?.image_url || "";

  const newOrder: OrderWithDetails = {
    id: orderId,
    order_number: orderNumber,
    order_access_token: orderAccessToken,
    customer_name: input.customer.fullName,
    customer_phone: input.customer.phone,
    customer_email: input.customer.email || null,
    shipping_address: {
      house: input.customer.house,
      street: input.customer.street,
      landmark: input.customer.landmark || "",
      city: input.customer.city,
      district: input.customer.district,
      state: input.customer.state,
      pincode: input.customer.pincode,
    },
    subtotal,
    shipping_charge: shippingCharge,
    total_amount: totalAmount,
    payment_status: "pending",
    fulfillment_status: "awaiting_purchase",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      {
        id: `item-${Date.now()}`,
        order_id: orderId,
        product_id: product.id,
        variant_id: input.variantId || null,
        product_name_snapshot: product.name,
        variant_snapshot: variantSnapshot,
        image_snapshot: mainImage,
        quantity,
        unit_price: unitPrice,
        total_price: subtotal,
      },
    ],
    payment: {
      razorpay_order_id: isCod ? `COD-${orderNumber}` : (razorpayOrderId || `order_demo_${Date.now()}`),
      status: isCod ? "pending_cod" : "created",
      amount: totalAmount,
      payment_method: finalPaymentMethod,
    },
    payment_method: finalPaymentMethod,
    supplier_purchase: {
      id: `sp-${Date.now()}`,
      order_id: orderId,
      meesho_order_id: null,
      actual_purchase_cost: null,
      purchased_at: null,
      tracking_number: null,
      tracking_url: null,
      courier_name: null,
      admin_notes: isCod ? "Cash on Delivery (COD) order. Collect cash/UPI on delivery." : null,
    },
    history: [
      {
        id: `hist-${Date.now()}`,
        order_id: orderId,
        previous_status: null,
        new_status: "pending",
        changed_by: "system_checkout",
        changed_at: new Date().toISOString(),
        notes: isCod
          ? "Order placed with Cash on Delivery (COD)"
          : "Order created at checkout (Online Payment)",
      },
    ],
    product_supplier_url: product.meesho_product_url,
  };

  const orders = getLocalOrdersStore();
  orders.unshift(newOrder);

  // Write to Supabase if configured
  if (isSupabaseAdminConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from("orders").insert({
        id: newOrder.id,
        order_number: newOrder.order_number,
        order_access_token: newOrder.order_access_token,
        customer_name: newOrder.customer_name,
        customer_phone: newOrder.customer_phone,
        customer_email: newOrder.customer_email,
        shipping_address: newOrder.shipping_address,
        subtotal: newOrder.subtotal,
        shipping_charge: newOrder.shipping_charge,
        total_amount: newOrder.total_amount,
        payment_status: newOrder.payment_status,
        fulfillment_status: newOrder.fulfillment_status,
      });

      await supabaseAdmin.from("order_items").insert({
        id: newOrder.items[0].id,
        order_id: newOrder.id,
        product_id: newOrder.items[0].product_id,
        variant_id: newOrder.items[0].variant_id,
        product_name_snapshot: newOrder.items[0].product_name_snapshot,
        variant_snapshot: newOrder.items[0].variant_snapshot,
        image_snapshot: newOrder.items[0].image_snapshot,
        quantity: newOrder.items[0].quantity,
        unit_price: newOrder.items[0].unit_price,
        total_price: newOrder.items[0].total_price,
      });
    } catch (e) {
      console.warn("Supabase order insert error:", e);
    }
  }

  return { order: newOrder, authoritativeAmount: totalAmount };
}

export async function markOrderAsPaid(
  orderIdOrNumber: string,
  paymentDetails: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature?: string;
    amount?: number;
  }
): Promise<OrderWithDetails | null> {
  const orders = getLocalOrdersStore();
  const order = orders.find(
    (o) => o.id === orderIdOrNumber || o.order_number === orderIdOrNumber
  );

  if (!order) return null;

  // Idempotency: if already marked paid, return immediately
  if (order.payment_status === "paid") {
    return order;
  }

  order.payment_status = "paid";
  order.fulfillment_status = "awaiting_purchase";
  order.updated_at = new Date().toISOString();

  order.payment = {
    razorpay_order_id: paymentDetails.razorpay_order_id,
    razorpay_payment_id: paymentDetails.razorpay_payment_id,
    status: "captured",
    amount: paymentDetails.amount || order.total_amount,
    verified_at: new Date().toISOString(),
  };

  order.history = order.history || [];
  order.history.push({
    id: `hist-${Date.now()}`,
    order_id: order.id,
    previous_status: "pending",
    new_status: "awaiting_purchase",
    changed_by: "razorpay_verified",
    changed_at: new Date().toISOString(),
    notes: `Payment verified via Razorpay ID: ${paymentDetails.razorpay_payment_id}`,
  });

  if (isSupabaseAdminConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          fulfillment_status: "awaiting_purchase",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      await supabaseAdmin.from("payments").insert({
        order_id: order.id,
        razorpay_order_id: paymentDetails.razorpay_order_id,
        razorpay_payment_id: paymentDetails.razorpay_payment_id,
        razorpay_signature: paymentDetails.razorpay_signature || null,
        amount: order.total_amount,
        status: "captured",
        verified_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Supabase update error:", e);
    }
  }

  return order;
}

export async function getOrderByNumberAndToken(
  orderNumber: string,
  token?: string | null
): Promise<OrderWithDetails | null> {
  const orders = getLocalOrdersStore();
  const found = orders.find((o) => o.order_number.toUpperCase() === orderNumber.toUpperCase());
  if (!found) return null;

  // Security check: Customer access requires valid matching token
  if (token && found.order_access_token !== token) {
    return null;
  }

  return found;
}

export async function getOrderById(
  id: string,
  isAdmin = false
): Promise<OrderWithDetails | null> {
  const orders = getLocalOrdersStore();
  const found = orders.find((o) => o.id === id || o.order_number === id);
  if (!found) return null;

  if (isAdmin && !found.product_supplier_url) {
    const prod = await getProductById(found.items[0]?.product_id || "", true);
    if (prod) {
      found.product_supplier_url = prod.meesho_product_url;
    }
  }
  return found;
}

export async function getAdminOrders(filters?: {
  status?: string;
  search?: string;
}): Promise<OrderWithDetails[]> {
  const orders = getLocalOrdersStore();
  let result = [...orders];

  if (filters?.status && filters.status !== "all") {
    result = result.filter(
      (o) =>
        o.fulfillment_status === filters.status ||
        o.payment_status === filters.status
    );
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    result = result.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q)
    );
  }

  // Populate supplier link for each order
  for (const o of result) {
    if (!o.product_supplier_url && o.items[0]?.product_id) {
      const prod = getLocalProductsStore().find(
        (p) => p.id === o.items[0].product_id
      );
      if (prod) {
        o.product_supplier_url = prod.meesho_product_url;
      }
    }
  }

  return result;
}

export async function updateSupplierPurchase(
  orderId: string,
  input: UpdateSupplierPurchaseInput,
  adminUser = "admin"
): Promise<OrderWithDetails | null> {
  const orders = getLocalOrdersStore();
  const order = orders.find((o) => o.id === orderId || o.order_number === orderId);
  if (!order) return null;

  const prevStatus = order.fulfillment_status;

  if (!order.supplier_purchase) {
    order.supplier_purchase = {
      id: `sp-${Date.now()}`,
      order_id: order.id,
      meesho_order_id: null,
      actual_purchase_cost: null,
      purchased_at: null,
      tracking_number: null,
      tracking_url: null,
      courier_name: null,
      admin_notes: null,
    };
  }

  if (input.meesho_order_id !== undefined) {
    order.supplier_purchase.meesho_order_id = input.meesho_order_id;
  }
  if (input.actual_purchase_cost !== undefined) {
    order.supplier_purchase.actual_purchase_cost = input.actual_purchase_cost;
  }
  if (input.purchased_at !== undefined) {
    order.supplier_purchase.purchased_at = input.purchased_at;
  }
  if (input.tracking_number !== undefined) {
    order.supplier_purchase.tracking_number = input.tracking_number;
  }
  if (input.tracking_url !== undefined) {
    order.supplier_purchase.tracking_url = input.tracking_url;
  }
  if (input.courier_name !== undefined) {
    order.supplier_purchase.courier_name = input.courier_name;
  }
  if (input.admin_notes !== undefined) {
    order.supplier_purchase.admin_notes = input.admin_notes;
  }

  if (input.fulfillment_status && input.fulfillment_status !== prevStatus) {
    order.fulfillment_status = input.fulfillment_status;
    order.history = order.history || [];
    order.history.push({
      id: `hist-${Date.now()}`,
      order_id: order.id,
      previous_status: prevStatus,
      new_status: input.fulfillment_status,
      changed_by: adminUser,
      changed_at: new Date().toISOString(),
      notes: input.admin_notes || `Status updated to ${input.fulfillment_status}`,
    });
  }

  order.updated_at = new Date().toISOString();

  // Supabase sync if enabled
  if (isSupabaseAdminConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from("supplier_purchases").upsert({
        order_id: order.id,
        meesho_order_id: order.supplier_purchase.meesho_order_id,
        actual_purchase_cost: order.supplier_purchase.actual_purchase_cost,
        purchased_at: order.supplier_purchase.purchased_at,
        tracking_number: order.supplier_purchase.tracking_number,
        tracking_url: order.supplier_purchase.tracking_url,
        courier_name: order.supplier_purchase.courier_name,
        admin_notes: order.supplier_purchase.admin_notes,
      });

      if (input.fulfillment_status) {
        await supabaseAdmin
          .from("orders")
          .update({
            fulfillment_status: input.fulfillment_status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);
      }
    } catch (e) {
      console.warn("Supabase supplier purchase sync error:", e);
    }
  }

  return order;
}

export async function getAdminDashboardMetrics() {
  const orders = getLocalOrdersStore();

  let totalSalesRevenue = 0;
  let totalSupplierCost = 0;
  let totalGatewayFees = 0; // ~2% Razorpay fee
  let awaitingPurchaseCount = 0;
  let purchasedCount = 0;
  let shippedCount = 0;
  let deliveredCount = 0;
  let cancelledCount = 0;
  let paidCount = 0;

  for (const o of orders) {
    if (o.payment_status === "paid") {
      paidCount++;
      totalSalesRevenue += o.total_amount;
      totalGatewayFees += Math.round(o.total_amount * 0.02);

      const actualCost = o.supplier_purchase?.actual_purchase_cost;
      if (actualCost && actualCost > 0) {
        totalSupplierCost += actualCost;
      } else {
        // Fallback to expected cost from products
        const prod = getLocalProductsStore().find(
          (p) => p.id === o.items[0]?.product_id
        );
        totalSupplierCost +=
          (prod?.expected_purchase_cost || 0) * (o.items[0]?.quantity || 1);
      }
    }

    if (o.fulfillment_status === "awaiting_purchase") awaitingPurchaseCount++;
    else if (o.fulfillment_status === "purchased_from_meesho") purchasedCount++;
    else if (o.fulfillment_status === "shipped") shippedCount++;
    else if (o.fulfillment_status === "delivered") deliveredCount++;
    else if (o.fulfillment_status === "cancelled") cancelledCount++;
  }

  const estimatedGrossProfit = Math.max(
    0,
    totalSalesRevenue - totalSupplierCost - totalGatewayFees
  );

  return {
    totalOrders: orders.length,
    paidOrders: paidCount,
    pendingPurchase: awaitingPurchaseCount,
    purchasedFromMeesho: purchasedCount,
    shippedOrders: shippedCount,
    deliveredOrders: deliveredCount,
    cancelledOrders: cancelledCount,
    totalSalesRevenue,
    totalSupplierCost,
    totalGatewayFees,
    estimatedGrossProfit,
    recentOrders: orders.slice(0, 5),
  };
}

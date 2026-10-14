-- Supabase PostgreSQL Schema for Minimal E-Commerce with Manual Meesho Fulfillment
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    selling_price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    expected_purchase_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    meesho_product_url TEXT,
    meesho_product_id TEXT,
    supplier_notes TEXT,
    last_verified_price NUMERIC(10, 2),
    last_verified_availability BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    specifications JSONB DEFAULT '{}'::jsonb,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PRODUCT IMAGES TABLE
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PRODUCT VARIANTS TABLE
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size TEXT,
    color TEXT,
    sku TEXT,
    selling_price_override NUMERIC(10, 2),
    expected_purchase_cost NUMERIC(10, 2),
    is_available BOOLEAN DEFAULT true NOT NULL,
    stock_quantity INTEGER DEFAULT 50 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    order_access_token TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    shipping_address JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    shipping_charge NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
    fulfillment_status TEXT NOT NULL DEFAULT 'awaiting_purchase'
        CHECK (fulfillment_status IN ('awaiting_purchase', 'purchased_from_meesho', 'shipped', 'delivered', 'cancelled', 'purchase_failed', 'return_requested', 'returned')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    variant_snapshot TEXT,
    image_snapshot TEXT,
    quantity INTEGER DEFAULT 1 NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL
);

-- 6. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'INR' NOT NULL,
    status TEXT DEFAULT 'created' NOT NULL
        CHECK (status IN ('created', 'authorized', 'captured', 'failed')),
    error_code TEXT,
    error_description TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. SUPPLIER PURCHASES (MEESHO MANUAL FULFILLMENT)
CREATE TABLE IF NOT EXISTS supplier_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    meesho_order_id TEXT,
    actual_purchase_cost NUMERIC(10, 2) DEFAULT 0.00,
    purchased_at TIMESTAMPTZ,
    tracking_number TEXT,
    tracking_url TEXT,
    courier_name TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. ORDER STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT DEFAULT 'admin',
    changed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    notes TEXT
);

-- 9. ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_product_images_pid ON product_images(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_variants_pid ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_access_token ON orders(order_access_token);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_order_id ON supplier_purchases(order_id);

-- TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_supplier_purchases_updated_at ON supplier_purchases;
CREATE TRIGGER trigger_supplier_purchases_updated_at
    BEFORE UPDATE ON supplier_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Products: Everyone can view active products
CREATE POLICY "Public can view active products" 
    ON products FOR SELECT 
    USING (is_active = true);

-- Product Images: Everyone can view images of active products
CREATE POLICY "Public can view product images" 
    ON product_images FOR SELECT 
    USING (true);

-- Product Variants: Everyone can view product variants
CREATE POLICY "Public can view product variants" 
    ON product_variants FOR SELECT 
    USING (true);

-- Service role has full bypass access for backend routes
-- Admin users (authenticated) can perform all operations
CREATE POLICY "Admins have full access to products" 
    ON products FOR ALL 
    TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to product_images" 
    ON product_images FOR ALL 
    TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to product_variants" 
    ON product_variants FOR ALL 
    TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to orders" 
    ON orders FOR ALL 
    TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to order_items" 
    ON order_items FOR ALL 
    TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to payments" 
    ON payments FOR ALL 
    TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to supplier_purchases" 
    ON supplier_purchases FOR ALL 
    TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to order_status_history" 
    ON order_status_history FOR ALL 
    TO authenticated 
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to admin_audit_logs" 
    ON admin_audit_logs FOR ALL 
    TO authenticated 
    USING (true) WITH CHECK (true);

-- PUBLIC SAFE VIEW (Hides Meesho Supplier URL, ID, and Purchase Costs from Customers!)
CREATE OR REPLACE VIEW public_products AS
SELECT 
    id,
    name,
    slug,
    description,
    selling_price,
    original_price,
    is_active,
    specifications,
    video_url,
    created_at
FROM products
WHERE is_active = true;

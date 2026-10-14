-- Seed Data for Meesho Direct Sales Platform

-- Product 1: Designer Embroidered Anarkali Kurti Set
INSERT INTO products (
    id, name, slug, description, selling_price, original_price, expected_purchase_cost,
    meesho_product_url, meesho_product_id, supplier_notes, last_verified_price, last_verified_availability, is_active,
    specifications
) VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Royal Emerald Embroidered Anarkali Kurti with Dupatta Set',
    'royal-emerald-embroidered-anarkali-kurti-set',
    'Step out in majestic grace with this exquisitely crafted Anarkali suit set. Featuring heavy zari thread embroidery on the yoke and sleeves, paired with a matching flared silhouette and a lightweight organza dupatta with scalloped borders. Perfect for festive celebrations, weddings, and parties. Crafted from breathable cotton silk blend fabric with a rich sheen and comfortable cotton inner lining.',
    899.00,
    2499.00,
    380.00,
    'https://www.meesho.com/s/p/4v9k1z?utm_source=ws',
    '4V9K1Z',
    'Supplier: Surat Textiles Hub (Rating 4.4/5). Fast dispatch within 24 hours. Stock always available in Green and Wine.',
    380.00,
    true,
    true,
    '{"Fabric": "Premium Cotton Silk", "Dupatta Fabric": "Pure Organza", "Pattern": "Ethnic Zari Embroidery", "Length": "Ankle Length (48 inches)", "Wash Care": "Dry Clean Recommended / Gentle Hand Wash", "Package Contains": "1 Kurti, 1 Pant, 1 Dupatta"}'::jsonb
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_images (product_id, image_url, alt_text, sort_order) VALUES
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80', 'Front View - Royal Emerald Kurti', 0),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80', 'Close-up Embroidery Detail', 1),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80', 'Model Pose with Dupatta Flare', 2)
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id, size, color, selling_price_override, expected_purchase_cost, is_available, stock_quantity) VALUES
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'M (38)', 'Emerald Green', 899.00, 380.00, true, 45),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'L (40)', 'Emerald Green', 899.00, 380.00, true, 60),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'XL (42)', 'Emerald Green', 899.00, 380.00, true, 30),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'XXL (44)', 'Emerald Green', 949.00, 410.00, true, 20)
ON CONFLICT DO NOTHING;

-- Product 2: Men's Pure Linen Slim-Fit Casual Shirt
INSERT INTO products (
    id, name, slug, description, selling_price, original_price, expected_purchase_cost,
    meesho_product_url, meesho_product_id, supplier_notes, last_verified_price, last_verified_availability, is_active,
    specifications
) VALUES (
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    'Men Pure Breathable Linen Solid Casual Shirt',
    'mens-pure-breathable-linen-solid-shirt',
    'Elevate your everyday wardrobe with our crisp 100% pure linen shirt. Designed for year-round breathability and timeless style, featuring a structured spread collar, curved hemline, and mother-of-pearl finish buttons. Pairs effortlessly with chinos, denim, or formal trousers for work or relaxed weekend outings.',
    649.00,
    1899.00,
    270.00,
    'https://www.meesho.com/s/p/8x3m2y?utm_source=ws',
    '8X3M2Y',
    'Supplier: Ahmedabad Menswear Direct. Ships with branded packaging. Verified supplier.',
    270.00,
    true,
    true,
    '{"Fabric": "100% Organic Linen", "Fit": "Slim Contemporary Fit", "Collar": "Spread Collar", "Sleeve": "Full Sleeve with Button Cuffs", "Wash Care": "Machine Wash Cold, Hang Dry"}'::jsonb
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_images (product_id, image_url, alt_text, sort_order) VALUES
('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80', 'Front White Linen Shirt', 0),
('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80', 'Collar and Texture Detail', 1)
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id, size, color, selling_price_override, expected_purchase_cost, is_available, stock_quantity) VALUES
('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'M (39)', 'Classic White', 649.00, 270.00, true, 35),
('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'L (42)', 'Classic White', 649.00, 270.00, true, 50),
('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'XL (44)', 'Classic White', 649.00, 270.00, true, 25)
ON CONFLICT DO NOTHING;

-- Product 3: ANC Wireless Bluetooth Earbuds
INSERT INTO products (
    id, name, slug, description, selling_price, original_price, expected_purchase_cost,
    meesho_product_url, meesho_product_id, supplier_notes, last_verified_price, last_verified_availability, is_active,
    specifications
) VALUES (
    'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    'AuraPod Pro Wireless Active Noise Cancelling Earbuds (48h Battery)',
    'aurapod-pro-anc-wireless-earbuds',
    'Immerse yourself in rich, deep bass and crystal-clear acoustic highs. AuraPod Pro offers active noise cancellation up to 35dB, environmental ENC quad-microphones for crisp calling, ultra-low latency gaming mode, and a massive 48 hours total playback with USB-C fast charging case.',
    999.00,
    3499.00,
    420.00,
    'https://www.meesho.com/s/p/5k7p9w?utm_source=ws',
    '5K7P9W',
    'Supplier: Delhi Tech Zone. Tested 100% working before dispatch. 6 Months replacement guarantee from supplier.',
    420.00,
    true,
    true,
    '{"Bluetooth Version": "5.3 with EDR", "Playtime": "8h Earbuds + 40h Case", "Driver": "13mm Titanium Dynamic Drivers", "Water Resistance": "IPX5 Splash & Sweat Resistant", "Fast Charge": "10 min charge = 2 hours playtime"}'::jsonb
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_images (product_id, image_url, alt_text, sort_order) VALUES
('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1000&q=80', 'AuraPod Earbuds in Open Case', 0),
('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=1000&q=80', 'Earbuds Solo Angle View', 1)
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id, size, color, selling_price_override, expected_purchase_cost, is_available, stock_quantity) VALUES
('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Standard', 'Matte Black', 999.00, 420.00, true, 80),
('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Standard', 'Pure White', 999.00, 420.00, true, 65)
ON CONFLICT DO NOTHING;

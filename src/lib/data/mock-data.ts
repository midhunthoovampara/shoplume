import { ProductWithDetails, OrderWithDetails } from "@/types";

export const INITIAL_PRODUCTS: ProductWithDetails[] = [
  {
    id: "b86a8398-7517-488b-a25e-2f9cf8ce1729",
    name: "test",
    slug: "test",
    description: "test product",
    selling_price: 799,
    original_price: 1999,
    expected_purchase_cost: 320,
    meesho_product_url: "",
    meesho_product_id: "",
    supplier_notes: "",
    last_verified_price: 0,
    last_verified_availability: true,
    is_active: true,
    specifications: {
      "Fit": "Regular Fit",
      "Neck": "Round Neck",
      "tesrt": "Cotton Blend",
      "Pattern": "Solid",
      "Occasion": "Daily Wear",
    },
    video_url: "",
    images: [
      {
        id: "c11e6490-21a4-4a57-b08e-8a1a3648f321",
        product_id: "b86a8398-7517-488b-a25e-2f9cf8ce1729",
        image_url:
          "https://lyztdneafruttmhyzwmq.supabase.co/storage/v1/object/public/product-images/1792062602846-7z72gl-sailboat_gliding_through_sunli.png",
        alt_text: "test",
        sort_order: 0,
      },
      {
        id: "d22f7591-32b5-4b68-c19f-9b2b4759e432",
        product_id: "b86a8398-7517-488b-a25e-2f9cf8ce1729",
        image_url:
          "https://lyztdneafruttmhyzwmq.supabase.co/storage/v1/object/public/product-images/1792062614059-v8o6pk-airborne_over_a_sunlit_seascap.png",
        alt_text: "test",
        sort_order: 1,
      },
    ],
    variants: [
      {
        id: "e33a8692-43c6-4c79-d20a-0c3c5860f543",
        product_id: "b86a8398-7517-488b-a25e-2f9cf8ce1729",
        color: "Black",
        sku: "SKU-TEST-BLACK",
        selling_price_override: null,
        expected_purchase_cost: null,
        is_available: true,
        stock_quantity: 50,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const INITIAL_ORDERS: OrderWithDetails[] = [];

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  BookOpen,
  LogOut,
  ExternalLink,
  Copy,
  Check,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  X,
  Share2,
  Eye,
  RefreshCw,
  Layers,
  Sparkles,
  Palette,
  Ruler,
  Ban,
  Image as ImageIcon,
  UploadCloud,
  Upload,
  Star,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { ProductWithDetails, OrderWithDetails, ProductVariant } from "@/types";
import { formatINR, calculateDiscount } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface AdminDashboardProps {
  initialOrders: OrderWithDetails[];
  initialProducts: ProductWithDetails[];
  initialMetrics: any;
}

export function AdminDashboard({
  initialOrders,
  initialProducts,
  initialMetrics,
}: AdminDashboardProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "orders" | "products" | "sop"
  >("dashboard");

  // Orders State
  const [orders, setOrders] = useState<OrderWithDetails[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(
    null
  );
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState<string>("");
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // Products State
  const [products, setProducts] = useState<ProductWithDetails[]>(initialProducts);
  const [editingProduct, setEditingProduct] = useState<Partial<ProductWithDetails> | null>(null);
  type VariantMode = "both" | "color_only" | "size_only" | "none";
  const [variantMode, setVariantMode] = useState<VariantMode>("both");
  const [specRows, setSpecRows] = useState<{ id: string; key: string; value: string }[]>([]);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showUrlFallback, setShowUrlFallback] = useState(false);

  // Metrics State
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Order Fulfillment Form State
  const [fulfillmentForm, setFulfillmentForm] = useState({
    meesho_order_id: "",
    actual_purchase_cost: 0,
    courier_name: "",
    tracking_number: "",
    tracking_url: "",
    admin_notes: "",
    fulfillment_status: "awaiting_purchase",
  });

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const [ordRes, prodRes, metRes] = await Promise.all([
        fetch("/api/admin/orders"),
        fetch("/api/admin/products"),
        fetch("/api/admin/metrics"),
      ]);
      const ordData = await ordRes.json();
      const prodData = await prodRes.json();
      const metData = await metRes.json();

      if (ordData.success) setOrders(ordData.orders);
      if (prodData.success) setProducts(prodData.products);
      if (metData.success) setMetrics(metData.metrics);
      toast("Dashboard refreshed with latest data", "info");
    } catch {
      toast("Failed to refresh data", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    toast("Logged out", "info");
    router.push("/admin/login");
  };

  const openOrderModal = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setFulfillmentForm({
      meesho_order_id: order.supplier_purchase?.meesho_order_id || "",
      actual_purchase_cost:
        order.supplier_purchase?.actual_purchase_cost ||
        initialProducts.find((p) => p.id === order.items[0]?.product_id)
          ?.expected_purchase_cost ||
        0,
      courier_name: order.supplier_purchase?.courier_name || "",
      tracking_number: order.supplier_purchase?.tracking_number || "",
      tracking_url: order.supplier_purchase?.tracking_url || "",
      admin_notes: order.supplier_purchase?.admin_notes || "",
      fulfillment_status: order.fulfillment_status,
    });
  };

  const copyShippingAddress = (order: OrderWithDetails) => {
    const addr = order.shipping_address;
    const formatted = `${order.customer_name}
${addr.house}, ${addr.street}
${addr.landmark ? `Landmark: ${addr.landmark}\n` : ""}${addr.city}, ${addr.district}, ${addr.state} - ${addr.pincode}
Phone: ${order.customer_phone}`;

    navigator.clipboard.writeText(formatted);
    toast("Shipping address copied! Ready to paste into Meesho.", "success");
  };

  const handleSaveFulfillment = async (targetStatus?: string) => {
    if (!selectedOrder) return;
    setIsUpdatingOrder(true);

    const payload = {
      ...fulfillmentForm,
      actual_purchase_cost: Number(fulfillmentForm.actual_purchase_cost) || 0,
      fulfillment_status: targetStatus || fulfillmentForm.fulfillment_status,
    };

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast("Fulfillment details updated successfully", "success");
        setSelectedOrder(data.order);
        setOrders((prev) =>
          prev.map((o) => (o.id === data.order.id ? data.order : o))
        );
        refreshData();
      } else {
        toast(data.error || "Update failed", "error");
      }
    } catch {
      toast("Error updating fulfillment", "error");
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // Product Modal Open & State Management Handlers
  const detectVariantMode = (variants?: ProductVariant[]): VariantMode => {
    if (!variants || variants.length === 0) return "none";

    const nonDummySizes = variants
      .map((v) => (v.size || "").trim())
      .filter(
        (s) =>
          s.length > 0 &&
          s.toLowerCase() !== "standard" &&
          s.toLowerCase() !== "default"
      );
    const nonDummyColors = variants
      .map((v) => (v.color || "").trim())
      .filter(
        (c) =>
          c.length > 0 &&
          c.toLowerCase() !== "standard" &&
          c.toLowerCase() !== "default"
      );

    const hasSizes = variants.some((v) => v.size && v.size.trim().length > 0);
    const hasColors = variants.some((v) => v.color && v.color.trim().length > 0);

    if (nonDummySizes.length > 0 && nonDummyColors.length > 0) {
      return "both";
    }
    if (nonDummySizes.length > 0 && nonDummyColors.length === 0) {
      return "size_only";
    }
    if (nonDummyColors.length > 0 && nonDummySizes.length === 0) {
      return "color_only";
    }
    if (hasSizes && hasColors) {
      const isOnlyStandardDefault = variants.every(
        (v) =>
          (!v.size || v.size.toLowerCase() === "standard") &&
          (!v.color || v.color.toLowerCase() === "default")
      );
      if (isOnlyStandardDefault) return "none";
      return "both";
    }
    if (hasSizes) return "size_only";
    if (hasColors) return "color_only";

    return "none";
  };

  const handleOpenAddProduct = () => {
    const newId = `prod-${Date.now()}`;
    setVariantMode("both");
    setEditingProduct({
      name: "",
      slug: "",
      description: "",
      selling_price: 799,
      original_price: 1999,
      expected_purchase_cost: 320,
      meesho_product_url: "",
      meesho_product_id: "",
      supplier_notes: "",
      is_active: true,
      images: [],
      variants: [
        {
          id: `var-${Date.now()}-1`,
          product_id: newId,
          size: "S",
          color: "Standard",
          is_available: true,
          stock_quantity: 50,
          selling_price_override: null,
        },
        {
          id: `var-${Date.now()}-2`,
          product_id: newId,
          size: "M",
          color: "Standard",
          is_available: true,
          stock_quantity: 50,
          selling_price_override: null,
        },
        {
          id: `var-${Date.now()}-3`,
          product_id: newId,
          size: "L",
          color: "Standard",
          is_available: true,
          stock_quantity: 50,
          selling_price_override: null,
        },
        {
          id: `var-${Date.now()}-4`,
          product_id: newId,
          size: "XL",
          color: "Standard",
          is_available: true,
          stock_quantity: 50,
          selling_price_override: null,
        },
      ],
      specifications: {
        Fabric: "Cotton Blend",
        Pattern: "Solid",
        Fit: "Regular Fit",
        Neck: "Round Neck",
        Occasion: "Daily Wear",
      },
    });
    setSpecRows([
      { id: "s-1", key: "Fabric", value: "Cotton Blend" },
      { id: "s-2", key: "Pattern", value: "Solid" },
      { id: "s-3", key: "Fit", value: "Regular Fit" },
      { id: "s-4", key: "Neck", value: "Round Neck" },
      { id: "s-5", key: "Occasion", value: "Daily Wear" },
    ]);
  };

  const handleOpenEditProduct = (p: ProductWithDetails) => {
    const detectedMode = detectVariantMode(p.variants);
    setVariantMode(detectedMode);

    setEditingProduct({
      ...p,
      variants:
        p.variants && p.variants.length > 0
          ? p.variants.map((v) => ({ ...v }))
          : [],
    });
    const rows = Object.entries(p.specifications || {}).map(
      ([key, value], idx) => ({
        id: `spec-${idx}-${Date.now()}`,
        key,
        value: String(value),
      })
    );
    setSpecRows(
      rows.length > 0
        ? rows
        : [{ id: `spec-${Date.now()}`, key: "Fabric", value: "" }]
    );
  };

  const handleSwitchVariantMode = (mode: VariantMode) => {
    setVariantMode(mode);
    if (!editingProduct) return;

    const currentVariants = editingProduct.variants || [];

    if (mode === "none") {
      return;
    }

    if (mode === "size_only") {
      if (currentVariants.length === 0) {
        const standardSizes = ["S", "M", "L", "XL", "XXL"];
        setEditingProduct({
          ...editingProduct,
          variants: standardSizes.map((sz, idx) => ({
            id: `var-${Date.now()}-${idx}`,
            product_id: editingProduct.id || "",
            size: sz,
            color: "",
            stock_quantity: 50,
            is_available: true,
            selling_price_override: null,
          })),
        });
      } else {
        setEditingProduct({
          ...editingProduct,
          variants: currentVariants.map((v) => ({
            ...v,
            color: "",
            size: v.size && v.size !== "Standard" ? v.size : "M",
          })),
        });
      }
    } else if (mode === "color_only") {
      if (currentVariants.length === 0) {
        const standardColors = ["Black", "Navy Blue", "Maroon", "Olive Green", "White"];
        setEditingProduct({
          ...editingProduct,
          variants: standardColors.map((col, idx) => ({
            id: `var-${Date.now()}-${idx}`,
            product_id: editingProduct.id || "",
            size: "",
            color: col,
            stock_quantity: 50,
            is_available: true,
            selling_price_override: null,
          })),
        });
      } else {
        setEditingProduct({
          ...editingProduct,
          variants: currentVariants.map((v) => ({
            ...v,
            size: "",
            color:
              v.color && v.color !== "Default" && v.color !== "Standard"
                ? v.color
                : "Black",
          })),
        });
      }
    } else if (mode === "both") {
      if (currentVariants.length === 0) {
        const standardSizes = ["S", "M", "L", "XL"];
        setEditingProduct({
          ...editingProduct,
          variants: standardSizes.map((sz, idx) => ({
            id: `var-${Date.now()}-${idx}`,
            product_id: editingProduct.id || "",
            size: sz,
            color: "Standard",
            stock_quantity: 50,
            is_available: true,
            selling_price_override: null,
          })),
        });
      } else {
        setEditingProduct({
          ...editingProduct,
          variants: currentVariants.map((v) => ({
            ...v,
            size: v.size || "M",
            color: v.color || "Standard",
          })),
        });
      }
    }
  };

  const handleAddVariant = () => {
    if (!editingProduct) return;
    const currentVariants = editingProduct.variants || [];
    const lastColor = currentVariants[currentVariants.length - 1]?.color || "";
    const lastSize = currentVariants[currentVariants.length - 1]?.size || "";

    let newSize = "";
    let newColor = "";

    if (variantMode === "size_only") {
      newSize = "M";
      newColor = "";
    } else if (variantMode === "color_only") {
      newSize = "";
      newColor = lastColor || "Black";
    } else {
      newSize = lastSize || "M";
      newColor = lastColor || "Standard";
    }

    const newVariant: ProductVariant = {
      id: `var-${Date.now()}`,
      product_id: editingProduct.id || "",
      size: newSize,
      color: newColor,
      stock_quantity: 50,
      is_available: true,
      selling_price_override: null,
    };
    setEditingProduct({
      ...editingProduct,
      variants: [...currentVariants, newVariant],
    });
  };

  const handleQuickAddSizes = () => {
    if (!editingProduct) return;
    const currentVariants = editingProduct.variants || [];
    const defaultColor =
      variantMode === "size_only" ? "" : currentVariants[0]?.color || "Standard";
    const standardSizes = ["S", "M", "L", "XL", "XXL"];
    const newVariants: ProductVariant[] = standardSizes.map((sz, idx) => ({
      id: `var-${Date.now()}-${idx}`,
      product_id: editingProduct.id || "",
      size: sz,
      color: defaultColor,
      stock_quantity: 50,
      is_available: true,
      selling_price_override: null,
    }));
    setEditingProduct({
      ...editingProduct,
      variants: newVariants,
    });
    toast("Generated S, M, L, XL, XXL sizes", "info");
  };

  const handleQuickAddNumericSizes = () => {
    if (!editingProduct) return;
    const currentVariants = editingProduct.variants || [];
    const defaultColor =
      variantMode === "size_only" ? "" : currentVariants[0]?.color || "Standard";
    const numericSizes = ["28", "30", "32", "34", "36", "38"];
    const newVariants: ProductVariant[] = numericSizes.map((sz, idx) => ({
      id: `var-${Date.now()}-${idx}`,
      product_id: editingProduct.id || "",
      size: sz,
      color: defaultColor,
      stock_quantity: 50,
      is_available: true,
      selling_price_override: null,
    }));
    setEditingProduct({
      ...editingProduct,
      variants: newVariants,
    });
    toast("Generated 28-38 numeric sizes", "info");
  };

  const handleQuickAddColors = () => {
    if (!editingProduct) return;
    const currentVariants = editingProduct.variants || [];
    const defaultSize =
      variantMode === "color_only" ? "" : currentVariants[0]?.size || "Free Size";
    const standardColors = ["Black", "Navy Blue", "Maroon", "Olive Green", "Wine Red"];
    const newVariants: ProductVariant[] = standardColors.map((col, idx) => ({
      id: `var-${Date.now()}-${idx}`,
      product_id: editingProduct.id || "",
      size: defaultSize,
      color: col,
      stock_quantity: 50,
      is_available: true,
      selling_price_override: null,
    }));
    setEditingProduct({
      ...editingProduct,
      variants: newVariants,
    });
    toast("Generated 5 popular color variants", "info");
  };

  const handleUpdateVariant = (
    index: number,
    field: keyof ProductVariant,
    value: any
  ) => {
    if (!editingProduct || !editingProduct.variants) return;
    const updated = [...editingProduct.variants];
    updated[index] = { ...updated[index], [field]: value };
    setEditingProduct({ ...editingProduct, variants: updated });
  };

  const handleRemoveVariant = (index: number) => {
    if (!editingProduct || !editingProduct.variants) return;
    const updated = editingProduct.variants.filter((_, i) => i !== index);
    setEditingProduct({ ...editingProduct, variants: updated });
  };

  const handleAddSpecRow = (initialKey = "", initialVal = "") => {
    setSpecRows((prev) => [
      ...prev,
      {
        id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        key: initialKey,
        value: initialVal,
      },
    ]);
  };

  const handleUpdateSpecRow = (
    id: string,
    field: "key" | "value",
    text: string
  ) => {
    setSpecRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: text } : r))
    );
  };

  const handleRemoveSpecRow = (id: string) => {
    setSpecRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleImageFilesUpload = async (files: FileList | File[]) => {
    if (!editingProduct || !files || files.length === 0) return;

    const validFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );

    if (validFiles.length === 0) {
      toast("Please select valid image files (JPG, PNG, WEBP, AVIF)", "error");
      return;
    }

    setIsUploadingImages(true);
    setUploadProgressText(
      `Uploading ${validFiles.length} photo${validFiles.length > 1 ? "s" : ""}...`
    );

    try {
      const formData = new FormData();
      validFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast(data.error || "Failed to upload image", "error");
        return;
      }

      const newUploaded: { url: string }[] = data.files || [{ url: data.url }];
      const currentImages = editingProduct.images ? [...editingProduct.images] : [];

      newUploaded.forEach((uploaded, idx) => {
        currentImages.push({
          id: `img-${Date.now()}-${idx}`,
          product_id: editingProduct.id || "",
          image_url: uploaded.url,
          sort_order: currentImages.length,
        });
      });

      setEditingProduct({
        ...editingProduct,
        images: currentImages,
      });

      toast(
        `Added ${newUploaded.length} product photo${newUploaded.length > 1 ? "s" : ""}`,
        "success"
      );
    } catch (err) {
      console.error("Upload error:", err);
      toast("Error uploading image files", "error");
    } finally {
      setIsUploadingImages(false);
      setUploadProgressText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSetCoverImage = (index: number) => {
    if (!editingProduct || !editingProduct.images) return;
    const list = [...editingProduct.images];
    if (index <= 0 || index >= list.length) return;
    const [selected] = list.splice(index, 1);
    list.unshift(selected);
    const reindexed = list.map((item, i) => ({ ...item, sort_order: i }));
    setEditingProduct({ ...editingProduct, images: reindexed });
    toast("Set as primary cover photo", "info");
  };

  const handleMoveImage = (fromIdx: number, toIdx: number) => {
    if (!editingProduct || !editingProduct.images) return;
    const list = [...editingProduct.images];
    if (toIdx < 0 || toIdx >= list.length) return;
    const temp = list[fromIdx];
    list[fromIdx] = list[toIdx];
    list[toIdx] = temp;
    const reindexed = list.map((item, i) => ({ ...item, sort_order: i }));
    setEditingProduct({ ...editingProduct, images: reindexed });
  };

  const handleAddImage = () => {
    if (!editingProduct) return;
    const currentImages = editingProduct.images ? [...editingProduct.images] : [];
    currentImages.push({
      id: `img-${Date.now()}`,
      product_id: editingProduct.id || "",
      image_url: "",
      sort_order: currentImages.length,
    });
    setEditingProduct({ ...editingProduct, images: currentImages });
  };

  const handleUpdateImage = (index: number, url: string) => {
    if (!editingProduct) return;
    const currentImages = editingProduct.images ? [...editingProduct.images] : [];
    if (currentImages[index]) {
      currentImages[index] = { ...currentImages[index], image_url: url };
    } else {
      currentImages.push({
        id: `img-${Date.now()}`,
        product_id: editingProduct.id || "",
        image_url: url,
        sort_order: index,
      });
    }
    setEditingProduct({ ...editingProduct, images: currentImages });
  };

  const handleRemoveImage = (index: number) => {
    if (!editingProduct || !editingProduct.images) return;
    const currentImages = editingProduct.images.filter((_, i) => i !== index);
    const reindexed = currentImages.map((item, i) => ({ ...item, sort_order: i }));
    setEditingProduct({ ...editingProduct, images: reindexed });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct.selling_price) {
      toast("Name and Selling Price are required", "error");
      return;
    }

    // Build specifications dictionary from specRows
    const specsObject: Record<string, string> = {};
    specRows.forEach((row) => {
      const k = row.key.trim();
      if (k) {
        specsObject[k] = row.value.trim();
      }
    });

    // Clean and validate variants based on variantMode
    let cleanedVariants: ProductVariant[] = [];

    if (variantMode === "none") {
      cleanedVariants = [];
    } else if (variantMode === "size_only") {
      const filtered = (editingProduct.variants || []).filter(
        (v) => v.size && v.size.trim().length > 0
      );
      if (filtered.length === 0) {
        toast("Please add at least one size variant or disable variants", "error");
        return;
      }
      cleanedVariants = filtered.map((v, idx) => ({
        ...v,
        id: v.id || `var-${Date.now()}-${idx}`,
        product_id: editingProduct.id || "",
        size: (v.size || "").trim(),
        color: undefined,
        stock_quantity:
          Number(v.stock_quantity) >= 0 ? Number(v.stock_quantity) : 0,
        selling_price_override:
          v.selling_price_override && Number(v.selling_price_override) > 0
            ? Number(v.selling_price_override)
            : null,
        is_available: v.is_available ?? true,
      }));
    } else if (variantMode === "color_only") {
      const filtered = (editingProduct.variants || []).filter(
        (v) => v.color && v.color.trim().length > 0
      );
      if (filtered.length === 0) {
        toast("Please add at least one color variant or disable variants", "error");
        return;
      }
      cleanedVariants = filtered.map((v, idx) => ({
        ...v,
        id: v.id || `var-${Date.now()}-${idx}`,
        product_id: editingProduct.id || "",
        size: undefined,
        color: (v.color || "").trim(),
        stock_quantity:
          Number(v.stock_quantity) >= 0 ? Number(v.stock_quantity) : 0,
        selling_price_override:
          v.selling_price_override && Number(v.selling_price_override) > 0
            ? Number(v.selling_price_override)
            : null,
        is_available: v.is_available ?? true,
      }));
    } else {
      // "both"
      const filtered = (editingProduct.variants || []).filter(
        (v) =>
          (v.size && v.size.trim().length > 0) ||
          (v.color && v.color.trim().length > 0)
      );
      if (filtered.length === 0) {
        toast("Please add at least one variant or disable variants", "error");
        return;
      }
      cleanedVariants = filtered.map((v, idx) => ({
        ...v,
        id: v.id || `var-${Date.now()}-${idx}`,
        product_id: editingProduct.id || "",
        size: v.size?.trim() || "Standard",
        color: v.color?.trim() || "Standard",
        stock_quantity:
          Number(v.stock_quantity) >= 0 ? Number(v.stock_quantity) : 0,
        selling_price_override:
          v.selling_price_override && Number(v.selling_price_override) > 0
            ? Number(v.selling_price_override)
            : null,
        is_available: v.is_available ?? true,
      }));
    }

    // Clean image URLs (remove empty items)
    const cleanedImages = (editingProduct.images || [])
      .filter((img) => img.image_url && img.image_url.trim().length > 0)
      .map((img, idx) => ({
        ...img,
        id: img.id || `img-${Date.now()}-${idx}`,
        product_id: editingProduct.id || "",
        sort_order: idx,
      }));

    if (cleanedImages.length === 0) {
      toast("Please upload at least one image photo for this product", "error");
      return;
    }

    const payload: Partial<ProductWithDetails> = {
      ...editingProduct,
      selling_price: Number(editingProduct.selling_price),
      original_price: Number(editingProduct.original_price) || 0,
      expected_purchase_cost: Number(editingProduct.expected_purchase_cost) || 0,
      specifications: specsObject,
      variants: cleanedVariants,
      images: cleanedImages,
    };

    setIsSavingProduct(true);
    try {
      const isEdit = Boolean(payload.id);
      const url = isEdit
        ? `/api/admin/products/${payload.id}`
        : "/api/admin/products";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast(`Product ${isEdit ? "updated" : "created"} successfully!`, "success");
        setEditingProduct(null);
        setSpecRows([]);
        refreshData();
      } else {
        toast(data.error || "Failed to save product", "error");
      }
    } catch {
      toast("Network error saving product", "error");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast("Product deleted", "info");
        setProducts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      toast("Failed to delete", "error");
    }
  };

  const copyProductLink = (slug: string) => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://yourdomain.com";
    const url = `${origin}/product/${slug}`;
    navigator.clipboard.writeText(url);
    toast("Direct product link copied! Ready to share.", "success");
  };

  const isCodOrder = (o: OrderWithDetails) => {
    return (
      o.payment_method === "cod" ||
      o.payment?.payment_method === "cod" ||
      Boolean(o.payment?.razorpay_order_id?.startsWith("COD-")) ||
      Boolean(o.supplier_purchase?.admin_notes?.toLowerCase().includes("cash on delivery")) ||
      Boolean(o.history?.some((h) => h.notes?.toLowerCase().includes("cash on delivery")))
    );
  };

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const isCod = isCodOrder(o);
    const matchesStatus =
      orderFilter === "all" ||
      (orderFilter === "cod" && isCod) ||
      (orderFilter === "online" && !isCod) ||
      o.fulfillment_status === orderFilter ||
      o.payment_status === orderFilter;
    const matchesSearch =
      !orderSearch ||
      o.order_number.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customer_phone.includes(orderSearch);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* ================= SIDEBAR ================= */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 shrink-0 flex flex-col justify-between p-4">
        <div>
          {/* Logo & Admin Branding */}
          <div className="flex flex-col gap-1.5 px-2 py-3 mb-6">
            <Link href="/" className="flex items-center">
              <img
                src="/logo-white.png"
                alt="Shoplume"
                className="h-7 w-auto object-contain"
              />
            </Link>
            <span className="text-[10px] text-amber-400 font-extrabold tracking-widest uppercase pl-0.5">
              Admin Console
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "orders"
                  ? "bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4" />
                <span>Orders & Fulfillment</span>
              </div>
              {metrics.pendingPurchase > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {metrics.pendingPurchase}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("products")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "products"
                  ? "bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Product Catalog</span>
            </button>

            <button
              onClick={() => setActiveTab("sop")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "sop"
                  ? "bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Fulfillment SOP Guide</span>
            </button>
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh Data</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
        {/* ================= TAB 1: DASHBOARD ================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Business Overview
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Track direct sales, Meesho supplier costs, and manual fulfillment progress.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("products")}
                  className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/70 border border-slate-700/80 shadow-md">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Sales Revenue
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-white">
                    {formatINR(metrics.totalSalesRevenue)}
                  </span>
                </div>
                <span className="text-[11px] text-orange-400 font-semibold mt-1 block">
                  {metrics.paidOrders} Successful Payments
                </span>
              </div>

              {/* Estimated Gross Profit */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-950/40 via-slate-800 to-slate-800 border border-orange-500/30 shadow-md">
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-300">
                  Estimated Gross Profit
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">
                    {formatINR(metrics.estimatedGrossProfit)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  After Meesho costs & ~2% gateway fee
                </span>
              </div>

              {/* Awaiting Meesho Purchase */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/30 shadow-md">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Awaiting Meesho Order
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-300">
                    {metrics.pendingPurchase}
                  </span>
                  <span className="text-xs text-amber-400 font-semibold">
                    Action Needed
                  </span>
                </div>
                <button
                  onClick={() => {
                    setOrderFilter("awaiting_purchase");
                    setActiveTab("orders");
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold mt-1 block cursor-pointer"
                >
                  Fulfill pending orders →
                </button>
              </div>

              {/* Purchased & In Transit */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/70 border border-slate-700/80 shadow-md">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Purchased & In Transit
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-white">
                    {metrics.purchasedFromMeesho + metrics.shippedOrders}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {metrics.shippedOrders} shipped • {metrics.deliveredOrders} delivered
                </span>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 shadow-md">
              <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-4">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Recent Customer Orders
                </h3>
                <button
                  onClick={() => setActiveTab("orders")}
                  className="text-xs text-orange-400 hover:text-orange-300 font-bold cursor-pointer"
                >
                  View All Orders →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 font-bold border-b border-slate-700/60">
                    <tr>
                      <th className="pb-3">Order Number</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Product</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Fulfillment</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40 text-slate-300">
                    {orders.slice(0, 5).map((order) => {
                      const isCod = isCodOrder(order);
                      return (
                      <tr key={order.id} className="hover:bg-slate-750">
                        <td className="py-3 font-mono font-bold text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{order.order_number}</span>
                            {isCod && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                COD
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="font-bold text-white">
                            {order.customer_name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {order.customer_phone}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="line-clamp-1 max-w-[200px]">
                            {order.items[0]?.product_name_snapshot}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {order.items[0]?.variant_snapshot}
                          </div>
                        </td>
                        <td className="py-3 font-bold text-white">
                          <div>{formatINR(order.total_amount)}</div>
                          {isCod && (
                            <div className="text-[10px] text-amber-400 font-semibold">Pay on Delivery</div>
                          )}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              order.fulfillment_status === "awaiting_purchase"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : order.fulfillment_status === "shipped"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : order.fulfillment_status === "delivered"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {order.fulfillment_status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openOrderModal(order)}
                            className="text-xs py-1 px-2.5 h-auto"
                          >
                            Fulfill Order
                          </Button>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: ORDERS MANAGEMENT ================= */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Orders & Manual Fulfillment
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fulfill customer orders by purchasing on Meesho with customer address.
                </p>
              </div>
            </div>

            {/* Filter Pills and Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "All Orders" },
                  { id: "awaiting_purchase", label: "Awaiting Purchase" },
                  { id: "cod", label: "💵 COD Orders" },
                  { id: "purchased_from_meesho", label: "Purchased" },
                  { id: "shipped", label: "Shipped" },
                  { id: "delivered", label: "Delivered" },
                  { id: "cancelled", label: "Cancelled" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setOrderFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      orderFilter === f.id
                        ? "bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-xs"
                        : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by order # or phone..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800 border border-slate-700 text-white rounded-xl focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-700/60">
                    <tr>
                      <th className="p-3.5">Order / Date</th>
                      <th className="p-3.5">Customer & Shipping</th>
                      <th className="p-3.5">Product & Variant</th>
                      <th className="p-3.5">Selling Price</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Est. Profit</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40 text-slate-300">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No orders found matching the filter.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const isCod = isCodOrder(order);
                        const sellingPrice = order.total_amount;
                        const meeshoCost =
                          order.supplier_purchase?.actual_purchase_cost ||
                          initialProducts.find(
                            (p) => p.id === order.items[0]?.product_id
                          )?.expected_purchase_cost ||
                          0;
                        const gatewayFee = isCod ? 0 : Math.round(sellingPrice * 0.02);
                        const estProfit = sellingPrice - meeshoCost - gatewayFee;

                        return (
                          <tr
                            key={order.id}
                            className="hover:bg-slate-750 transition-colors"
                          >
                            <td className="p-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-white block">
                                  {order.order_number}
                                </span>
                                {isCod && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                                    COD
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {new Date(order.created_at).toLocaleDateString(
                                  "en-IN",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </td>

                            <td className="p-3.5">
                              <div className="font-bold text-white">
                                {order.customer_name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                +91 {order.customer_phone}
                              </div>
                              <div className="text-[11px] text-slate-500 line-clamp-1 max-w-[180px]">
                                {order.shipping_address.city},{" "}
                                {order.shipping_address.state} (
                                {order.shipping_address.pincode})
                              </div>
                            </td>

                            <td className="p-3.5">
                              <div className="line-clamp-1 font-semibold text-white max-w-[200px]">
                                {order.items[0]?.product_name_snapshot}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {order.items[0]?.variant_snapshot} • Qty:{" "}
                                {order.items[0]?.quantity}
                              </div>
                            </td>

                            <td className="p-3.5 font-bold text-white">
                              {formatINR(sellingPrice)}
                            </td>

                            <td className="p-3.5">
                              <div className="flex flex-col gap-1">
                                {isCod ? (
                                  <span className="text-[10px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full inline-block w-fit">
                                    COD (PAY ON DELIVERY)
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-block w-fit">
                                    ONLINE {order.payment_status.toUpperCase()}
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block w-fit ${
                                    order.fulfillment_status ===
                                    "awaiting_purchase"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : order.fulfillment_status === "shipped"
                                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                      : order.fulfillment_status === "delivered"
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      : "bg-slate-700 text-slate-300"
                                  }`}
                                >
                                  {order.fulfillment_status.replace(/_/g, " ")}
                                </span>
                              </div>
                            </td>

                            <td className="p-3.5">
                              <span className="font-extrabold text-emerald-400 block">
                                {formatINR(estProfit)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Meesho: {formatINR(meeshoCost)}
                              </span>
                              {isCod && (
                                <span className="text-[9px] text-amber-400/80 block">
                                  No gateway fee
                                </span>
                              )}
                            </td>

                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => copyShippingAddress(order)}
                                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                  title="Copy Customer Shipping Address"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => openOrderModal(order)}
                                  className="text-xs py-1 px-2.5 h-auto"
                                >
                                  Fulfill
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: PRODUCT MANAGEMENT ================= */}
        {activeTab === "products" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Product Catalog
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage products, Meesho source URLs, supplier costs, and share links.
                </p>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={handleOpenAddProduct}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Add New Product</span>
              </Button>
            </div>

            {/* Products Grid */}
            {products.length === 0 ? (
              <div className="p-12 rounded-2xl bg-slate-800/40 border-2 border-dashed border-slate-700/80 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto">
                  <Package className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Your Product Catalog is Empty</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    No products in your catalog yet. Click &quot;Add New Product&quot; to upload your photos, set pricing, configure variants, and link Meesho supplier items.
                  </p>
                </div>
                <div className="pt-2">
                  <Button variant="primary" size="md" onClick={handleOpenAddProduct}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    <span>Add First Product</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((p) => {
                const discount = calculateDiscount(
                  p.original_price,
                  p.selling_price
                );
                const estMargin = p.selling_price - p.expected_purchase_cost;

                return (
                  <div
                    key={p.id}
                    className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between"
                  >
                    <div>
                      {/* Product Thumbnail */}
                      <div className="relative aspect-16/10 w-full bg-slate-950 overflow-hidden">
                        <img
                          src={p.images[0]?.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              p.is_active
                                ? "bg-emerald-500/90 text-white"
                                : "bg-slate-700/90 text-slate-300"
                            }`}
                          >
                            {p.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <h3 className="font-bold text-white text-sm line-clamp-2 leading-snug">
                          {p.name}
                        </h3>

                        {/* Pricing and margin */}
                        <div className="flex items-baseline justify-between text-xs">
                          <div>
                            <span className="text-base font-extrabold text-white">
                              {formatINR(p.selling_price)}
                            </span>
                            <span className="ml-1.5 text-slate-500 line-through">
                              {formatINR(p.original_price)}
                            </span>
                          </div>
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            Profit: {formatINR(estMargin)}
                          </span>
                        </div>

                        {/* Variants and Specs Indicators */}
                        <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-300">
                          <span className="inline-flex items-center gap-1 bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-800 text-[10px] font-semibold text-slate-300">
                            <Layers className="w-3 h-3 text-orange-400" />
                            <span>
                              {!p.variants || p.variants.length === 0
                                ? "Single Item"
                                : p.variants.every((v) => v.size && !v.color)
                                ? `${p.variants.length} Sizes`
                                : p.variants.every((v) => v.color && !v.size)
                                ? `${p.variants.length} Colors`
                                : `${p.variants.length} Variants`}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1 bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-800 text-[10px] font-semibold text-slate-300">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>{Object.keys(p.specifications || {}).length} Specs</span>
                          </span>
                        </div>

                        {/* Confidential Meesho Supplier Info (Admin Only) */}
                        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
                          <div className="flex justify-between text-slate-400">
                            <span>Expected Meesho Cost:</span>
                            <strong className="text-amber-400 font-mono">
                              {formatINR(p.expected_purchase_cost)}
                            </strong>
                          </div>
                          {p.meesho_product_url && (
                            <a
                              href={p.meesho_product_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold truncate pt-1"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">Open Meesho Supplier Page</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => copyProductLink(p.slug)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Copy direct customer buying link"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditProduct(p)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Edit Product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: MEESHO FULFILLMENT SOP GUIDE ================= */}
        {activeTab === "sop" && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Standard Operating Procedure (SOP)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Step-by-step workflow for manual Meesho order fulfillment and customer delight.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex gap-4">
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  1
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Customer Places Order on Your Store
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Customer clicks your direct link (shared via WhatsApp/Instagram/Ads), selects variant, fills shipping address, and pays securely via Razorpay. Order arrives with status <strong>Awaiting Purchase</strong>.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex gap-4">
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  2
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Open Order & Copy Shipping Address
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    In the Admin Orders tab, click <strong>"Fulfill"</strong> on the order. Click the <strong>"📋 Copy Shipping Address"</strong> button. The customer's full address and phone number are automatically copied to your clipboard.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex gap-4">
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  3
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Open Meesho Product & Place Order
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Click <strong>"🔗 Open Meesho Product"</strong>. Meesho opens in a new tab. Paste the customer's shipping address into Meesho. Choose online payment or reseller mode if available, and complete checkout.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex gap-4">
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  4
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Record Meesho Order ID & Update Status
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Paste the Meesho Order ID and actual cost into the modal. Click <strong>"Mark as Purchased from Meesho"</strong>. Your gross profit is automatically calculated.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex gap-4">
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  5
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Update Courier Tracking
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    When Meesho dispatches the parcel (via Delhivery, Shadowfax, etc.), copy the courier name and AWB tracking number into the order details. Click <strong>"Update Tracking & Mark Shipped"</strong>. The customer can track the package immediately on their order tracking link!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= ORDER DETAILS & FULFILLMENT MODAL ================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl animate-in fade-in my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700">
              <div>
                <h3 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
                  <span>Fulfill Order #{selectedOrder.order_number}</span>
                  {isCodOrder(selectedOrder) ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Cash on Delivery (COD)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Online Paid
                    </span>
                  )}
                </h3>
                <span className="text-xs text-slate-400">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString("en-IN")}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-white p-1 text-lg font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
              {isCodOrder(selectedOrder) && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200">
                    <p className="font-bold text-amber-300">Cash on Delivery (COD) Order</p>
                    <p className="mt-0.5">
                      Place this order on Meesho selecting <strong>Cash on Delivery (COD)</strong> or enter your reseller margin. The customer will pay <strong>{formatINR(selectedOrder.total_amount)}</strong> in cash or UPI when the courier delivers the package.
                    </p>
                  </div>
                </div>
              )}

              {/* Customer Info & Quick Copy Address */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">
                    Customer Shipping Information
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyShippingAddress(selectedOrder)}
                    className="bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30 text-xs py-1 h-auto"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Shipping Address
                  </Button>
                </div>

                <div className="text-slate-300 space-y-0.5 pt-1">
                  <p className="font-bold text-white text-sm">
                    {selectedOrder.customer_name}
                  </p>
                  <p>{selectedOrder.shipping_address.house}</p>
                  <p>{selectedOrder.shipping_address.street}</p>
                  {selectedOrder.shipping_address.landmark && (
                    <p className="text-slate-400">
                      Landmark: {selectedOrder.shipping_address.landmark}
                    </p>
                  )}
                  <p>
                    {selectedOrder.shipping_address.city},{" "}
                    {selectedOrder.shipping_address.district},{" "}
                    {selectedOrder.shipping_address.state} -{" "}
                    <strong>{selectedOrder.shipping_address.pincode}</strong>
                  </p>
                  <p className="font-bold text-emerald-400 pt-1">
                    Phone: +91 {selectedOrder.customer_phone}
                  </p>
                </div>
              </div>

              {/* Product Info & Open Meesho Button */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex gap-3">
                  {selectedOrder.items[0]?.image_snapshot && (
                    <img
                      src={selectedOrder.items[0].image_snapshot}
                      alt="Product"
                      className="w-14 h-18 object-cover rounded-xl border border-slate-700 shrink-0"
                    />
                  )}
                  <div>
                    <h4 className="font-bold text-white text-sm line-clamp-1">
                      {selectedOrder.items[0]?.product_name_snapshot}
                    </h4>
                    <p className="text-slate-400">
                      Variant: {selectedOrder.items[0]?.variant_snapshot}
                    </p>
                    <p className="text-slate-400">
                      Quantity: {selectedOrder.items[0]?.quantity}
                    </p>
                    <p className="font-extrabold text-white mt-1">
                      {isCodOrder(selectedOrder) ? (
                        <span className="text-amber-300">
                          Collect on Delivery: {formatINR(selectedOrder.total_amount)}
                        </span>
                      ) : (
                        <span>Customer Paid: {formatINR(selectedOrder.total_amount)}</span>
                      )}
                    </p>
                  </div>
                </div>

                {selectedOrder.product_supplier_url ? (
                  <a
                    href={selectedOrder.product_supplier_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-rose-600 hover:brightness-105 text-white font-bold transition-all shadow-md shadow-orange-500/20 shrink-0 cursor-pointer"
                  >
                    <span>Open Meesho Product</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <span className="text-slate-500 text-xs italic">
                    No supplier URL configured
                  </span>
                )}
              </div>

              {/* Supplier Purchase Fields (Fulfillment Workflow) */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/80 space-y-4">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[11px] block">
                  Meesho Purchase Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Meesho Order ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MEESHO-891029"
                      value={fulfillmentForm.meesho_order_id}
                      onChange={(e) =>
                        setFulfillmentForm({
                          ...fulfillmentForm,
                          meesho_order_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Actual Meesho Purchase Cost (₹)
                    </label>
                    <input
                      type="number"
                      value={fulfillmentForm.actual_purchase_cost || ""}
                      onChange={(e) =>
                        setFulfillmentForm({
                          ...fulfillmentForm,
                          actual_purchase_cost: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Courier Partner
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Delhivery, Shadowfax, Xpressbees"
                      value={fulfillmentForm.courier_name}
                      onChange={(e) =>
                        setFulfillmentForm({
                          ...fulfillmentForm,
                          courier_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Tracking / AWB Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DEL18928190IN"
                      value={fulfillmentForm.tracking_number}
                      onChange={(e) =>
                        setFulfillmentForm({
                          ...fulfillmentForm,
                          tracking_number: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-orange-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Tracking URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.delhivery.com/track/package/..."
                      value={fulfillmentForm.tracking_url}
                      onChange={(e) =>
                        setFulfillmentForm({
                          ...fulfillmentForm,
                          tracking_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Admin Remarks / Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Ordered on Meesho with alternate color confirmed..."
                      value={fulfillmentForm.admin_notes}
                      onChange={(e) =>
                        setFulfillmentForm({
                          ...fulfillmentForm,
                          admin_notes: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Profit Breakdown Calculation */}
                <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block">Calculated Profit:</span>
                    <span className="font-extrabold text-orange-400 text-sm">
                      {formatINR(
                        selectedOrder.total_amount -
                          (Number(fulfillmentForm.actual_purchase_cost) || 0) -
                          (isCodOrder(selectedOrder)
                            ? 0
                            : Math.round(selectedOrder.total_amount * 0.02))
                      )}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    {isCodOrder(selectedOrder)
                      ? "Customer Price − Meesho Cost (No Gateway Fee for COD)"
                      : "Customer Price − Meesho Cost − 2% Gateway Fee"}
                  </span>
                </div>
              </div>

              {/* Status Update Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  isLoading={isUpdatingOrder}
                  onClick={() =>
                    handleSaveFulfillment("purchased_from_meesho")
                  }
                  className="bg-amber-600 hover:bg-amber-500 text-white"
                >
                  Mark as Purchased from Meesho
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  isLoading={isUpdatingOrder}
                  onClick={() => handleSaveFulfillment("shipped")}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Update Tracking & Mark Shipped
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  isLoading={isUpdatingOrder}
                  onClick={() => handleSaveFulfillment("delivered")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Mark Delivered
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  isLoading={isUpdatingOrder}
                  onClick={() => handleSaveFulfillment()}
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 ml-auto"
                >
                  Save Notes Only
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD / EDIT PRODUCT MODAL ================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl animate-in fade-in my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF7A00]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base sm:text-lg">
                    {editingProduct.id ? "Edit Product" : "Add New Product"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configure catalog details, pricing, variants, specifications & gallery.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setSpecRows([]);
                }}
                className="text-slate-400 hover:text-white p-1 text-lg font-bold rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveProduct}
              className="mt-5 space-y-6 text-xs max-h-[75vh] overflow-y-auto pr-2"
            >
              {/* 1. Basic Product Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span>General Information</span>
                </h4>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Designer Embroidered Anarkali Kurta Set"
                    value={editingProduct.name || ""}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    URL Slug (Optional - auto generated if empty)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. designer-embroidered-anarkali-kurta-set"
                    value={editingProduct.slug || ""}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        slug: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide a compelling product description highlighting design, fit, fabric and style appeal..."
                    value={editingProduct.description || ""}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. Pricing & Cost Structure */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Pricing & Profit Margin
                  </h4>
                  {editingProduct.selling_price && editingProduct.expected_purchase_cost ? (
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      Est. Profit per unit: {formatINR(Number(editingProduct.selling_price) - Number(editingProduct.expected_purchase_cost))}
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Selling Price (₹) *
                    </label>
                    <input
                      type="number"
                      value={editingProduct.selling_price || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          selling_price: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold focus:border-orange-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Original MRP (₹)
                    </label>
                    <input
                      type="number"
                      value={editingProduct.original_price || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          original_price: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                      Expected Meesho Cost (₹)
                    </label>
                    <input
                      type="number"
                      value={editingProduct.expected_purchase_cost || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          expected_purchase_cost: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Meesho Supplier Information Box (Admin Only) */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-3">
                <span className="font-bold uppercase tracking-wider text-amber-400 text-[11px] block">
                  Meesho Supplier Details (Confidential - Hidden from Customers)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Meesho Product URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.meesho.com/s/p/..."
                      value={editingProduct.meesho_product_url || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          meesho_product_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Meesho Product ID / Catalog Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4V9K1Z"
                      value={editingProduct.meesho_product_id || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          meesho_product_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Supplier Notes & Seller Quality Details
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Surat Hub 4.4/5 stars. Dispatches within 24h."
                      value={editingProduct.supplier_notes || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          supplier_notes: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Product Image Gallery (File Upload & Supabase Storage) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-4">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleImageFilesUpload(e.target.files);
                    }
                  }}
                />

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider">
                          Product Photos
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          {editingProduct.images?.length || 0} photo{editingProduct.images?.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Upload image files from your computer or phone. First photo is the main product cover.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImages}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    {isUploadingImages ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Upload Image Files</span>
                  </button>
                </div>

                {/* Drag & Drop Upload Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleImageFilesUpload(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => {
                    if (!isUploadingImages) fileInputRef.current?.click();
                  }}
                  className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center relative overflow-hidden group ${
                    isDraggingOver
                      ? "border-sky-400 bg-sky-500/10 ring-4 ring-sky-500/20 scale-[0.99]"
                      : "border-slate-700/80 bg-slate-950/60 hover:border-sky-500/50 hover:bg-slate-950/90"
                  }`}
                >
                  {isUploadingImages ? (
                    <div className="flex flex-col items-center justify-center py-4 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center animate-pulse">
                        <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                      </div>
                      <span className="text-sm font-bold text-white">
                        {uploadProgressText || "Uploading images..."}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Saving to cloud storage... Please wait
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-2">
                      <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-sky-500/20 transition-all shadow-sm">
                        <UploadCloud className="w-7 h-7" />
                      </div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span className="text-sky-400 underline decoration-sky-400/40 underline-offset-4">
                          Click to browse
                        </span>{" "}
                        <span>or drag & drop image files</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        PNG, JPG, JPEG, WEBP or AVIF up to 15MB each. You can select multiple photos at once.
                      </p>
                      <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-300 border border-sky-500/20 text-xs font-semibold group-hover:bg-sky-500/20 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Choose Photos from Computer</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Uploaded Photos Gallery Grid */}
                {editingProduct.images && editingProduct.images.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span>Uploaded Photos ({editingProduct.images.length})</span>
                      <span className="text-[10px] text-amber-400/90 font-medium">
                        Tip: First photo is shown on catalog cards & product page cover
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {editingProduct.images.map((img, idx) => (
                        <div
                          key={img.id || idx}
                          className={`relative group rounded-xl border overflow-hidden bg-slate-950 flex flex-col transition-all shadow-sm ${
                            idx === 0
                              ? "border-amber-500 ring-2 ring-amber-500/20"
                              : "border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {/* Photo Thumbnail */}
                          <div className="aspect-[4/5] w-full relative bg-slate-900 overflow-hidden">
                            <img
                              src={img.image_url}
                              alt={img.alt_text || `Product photo ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />

                            {/* Badge */}
                            <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                              {idx === 0 ? (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md flex items-center gap-1">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  <span>Cover Photo</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-900/90 backdrop-blur-sm text-slate-300 border border-slate-700">
                                  #{idx + 1}
                                </span>
                              )}
                            </div>

                            {/* Card Hover Action Buttons */}
                            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 z-20">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSetCoverImage(idx)}
                                  className="w-full py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                  title="Make this the primary cover photo"
                                >
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                  <span>Make Cover</span>
                                </button>
                              )}

                              <div className="flex items-center gap-1.5">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveImage(idx, idx - 1)}
                                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white shadow transition-colors cursor-pointer"
                                    title="Move earlier in gallery"
                                  >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {idx < (editingProduct.images?.length || 0) - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveImage(idx, idx + 1)}
                                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white shadow transition-colors cursor-pointer"
                                    title="Move later in gallery"
                                  >
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(idx)}
                                  className="p-2 rounded-lg bg-rose-500/80 hover:bg-rose-500 text-white shadow transition-colors cursor-pointer"
                                  title="Delete photo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Card Footer */}
                          <div className="p-2 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950">
                            <span className="truncate pr-1 text-[10px]">
                              {idx === 0 ? "Cover Photo" : `Slide #${idx + 1}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title="Delete photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Controls: Add More & Optional URL Fallback */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImages}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-400" />
                    <span>+ Add More Photos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUrlFallback(!showUrlFallback)}
                    className="text-slate-400 hover:text-slate-200 underline text-[11px] cursor-pointer"
                  >
                    {showUrlFallback ? "Hide manual URL fields" : "Need to paste an external image URL instead?"}
                  </button>
                </div>

                {/* Optional Manual URL Fallback Box */}
                {showUrlFallback && (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        External Image URLs (Optional)
                      </span>
                      <button
                        type="button"
                        onClick={handleAddImage}
                        className="text-[11px] text-sky-400 font-bold hover:underline"
                      >
                        + Add URL Field
                      </button>
                    </div>
                    {editingProduct.images?.map((img, idx) => (
                      <div key={img.id || idx} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-5">#{idx + 1}</span>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={img.image_url || ""}
                          onChange={(e) => handleUpdateImage(idx, e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:border-sky-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Color & Size Variants Builder */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-4">
                {/* Header & Mode Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider">
                          Product Variants
                        </h4>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            variantMode === "none"
                              ? "bg-slate-800 text-slate-400 border-slate-700"
                              : variantMode === "color_only"
                              ? "bg-pink-500/20 text-pink-400 border-pink-500/30"
                              : variantMode === "size_only"
                              ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                              : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                          }`}
                        >
                          {variantMode === "none"
                            ? "Disabled (Single Item)"
                            : variantMode === "color_only"
                            ? "Color Only"
                            : variantMode === "size_only"
                            ? "Size Only"
                            : "Color & Size"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Configure both color and size, color only, size only, or disable variants completely.
                      </p>
                    </div>
                  </div>

                  {/* Quick Toggle Button */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSwitchVariantMode(variantMode === "none" ? "both" : "none")
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        variantMode === "none"
                          ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700"
                      }`}
                    >
                      {variantMode === "none" ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Enable Variants</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5 text-rose-400" />
                          <span>Disable Variants</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 4 Mode Selection Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Option 1: Color & Size */}
                  <button
                    type="button"
                    onClick={() => handleSwitchVariantMode("both")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      variantMode === "both"
                        ? "bg-orange-500/15 border-orange-500/60 ring-2 ring-orange-500/20 text-white"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                      <Layers
                        className={`w-3.5 h-3.5 ${
                          variantMode === "both" ? "text-orange-400" : "text-slate-400"
                        }`}
                      />
                      <span>Color & Size</span>
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-1">
                      Both color and size options
                    </span>
                  </button>

                  {/* Option 2: Color Only */}
                  <button
                    type="button"
                    onClick={() => handleSwitchVariantMode("color_only")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      variantMode === "color_only"
                        ? "bg-pink-500/15 border-pink-500/60 ring-2 ring-pink-500/20 text-white"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                      <Palette
                        className={`w-3.5 h-3.5 ${
                          variantMode === "color_only" ? "text-pink-400" : "text-slate-400"
                        }`}
                      />
                      <span>Color Only</span>
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-1">
                      Multiple colors, no sizes
                    </span>
                  </button>

                  {/* Option 3: Size Only */}
                  <button
                    type="button"
                    onClick={() => handleSwitchVariantMode("size_only")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      variantMode === "size_only"
                        ? "bg-indigo-500/15 border-indigo-500/60 ring-2 ring-indigo-500/20 text-white"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                      <Ruler
                        className={`w-3.5 h-3.5 ${
                          variantMode === "size_only" ? "text-indigo-400" : "text-slate-400"
                        }`}
                      />
                      <span>Size Only</span>
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-1">
                      Multiple sizes, no colors
                    </span>
                  </button>

                  {/* Option 4: Disabled */}
                  <button
                    type="button"
                    onClick={() => handleSwitchVariantMode("none")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      variantMode === "none"
                        ? "bg-rose-500/15 border-rose-500/60 ring-2 ring-rose-500/20 text-white"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                      <Ban
                        className={`w-3.5 h-3.5 ${
                          variantMode === "none" ? "text-rose-400" : "text-slate-400"
                        }`}
                      />
                      <span>Disabled</span>
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-1">
                      Single item, no variants
                    </span>
                  </button>
                </div>

                {/* If Mode is Disabled ("none") */}
                {variantMode === "none" ? (
                  <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Ban className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <h5 className="font-bold text-white text-sm">Variants are Disabled for this Product</h5>
                      <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                        This product will sell as a single standard item. Customers will directly choose quantity and purchase without selecting size or color. Base selling price (<strong>{formatINR(Number(editingProduct.selling_price) || 0)}</strong>) and base inventory apply.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSwitchVariantMode("both")}
                        className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Enable Color & Size</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchVariantMode("color_only")}
                        className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Palette className="w-3.5 h-3.5" />
                        <span>Enable Color Only</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchVariantMode("size_only")}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Ruler className="w-3.5 h-3.5" />
                        <span>Enable Size Only</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Variants List & Action Bar */
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="text-xs text-slate-400">
                        <span className="font-bold text-white">
                          {editingProduct.variants?.length || 0}
                        </span>{" "}
                        {variantMode === "size_only"
                          ? "sizes"
                          : variantMode === "color_only"
                          ? "colors"
                          : "variants"}{" "}
                        configured
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {variantMode === "size_only" && (
                          <>
                            <button
                              type="button"
                              onClick={handleQuickAddSizes}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Generate standard S, M, L, XL, XXL sizes"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span>+ S, M, L, XL, XXL</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleQuickAddNumericSizes}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Generate 28-38 numeric waist/chest sizes"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                              <span>+ 28, 30, 32, 34, 36</span>
                            </button>
                          </>
                        )}

                        {variantMode === "color_only" && (
                          <button
                            type="button"
                            onClick={handleQuickAddColors}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Generate 5 popular color variants"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                            <span>+ Quick Colors (5 Popular)</span>
                          </button>
                        )}

                        {variantMode === "both" && (
                          <>
                            <button
                              type="button"
                              onClick={handleQuickAddSizes}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span>+ Sizes (S-XXL)</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleQuickAddColors}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                              <span>+ Colors</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={handleAddVariant}
                          className="px-2.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>
                            {variantMode === "size_only"
                              ? "Add Size Row"
                              : variantMode === "color_only"
                              ? "Add Color Row"
                              : "Add Variant Row"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Variant Rows Table/Cards */}
                    {(!editingProduct.variants || editingProduct.variants.length === 0) ? (
                      <div className="text-center py-6 border border-dashed border-slate-700 rounded-xl">
                        <p className="text-xs text-slate-400">No variant rows created yet.</p>
                        <button
                          type="button"
                          onClick={handleAddVariant}
                          className="mt-2 text-xs text-orange-400 hover:underline font-bold"
                        >
                          + Add your first variant row
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Table Header on Desktop */}
                        <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {variantMode === "size_only" && (
                            <span className="col-span-6">Size</span>
                          )}
                          {variantMode === "color_only" && (
                            <span className="col-span-6">Color / Shade</span>
                          )}
                          {variantMode === "both" && (
                            <>
                              <span className="col-span-3">Size</span>
                              <span className="col-span-3">Color</span>
                            </>
                          )}
                          <span className="col-span-2">Stock Qty</span>
                          <span className="col-span-2">Price Override (₹)</span>
                          <span className="col-span-1 text-center">In Stock</span>
                          <span className="col-span-1 text-right">Delete</span>
                        </div>

                        {editingProduct.variants.map((v, idx) => (
                          <div
                            key={v.id || idx}
                            className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center"
                          >
                            {/* SIZE FIELD: Visible in "size_only" (col-span-6) or "both" (col-span-3) */}
                            {(variantMode === "size_only" || variantMode === "both") && (
                              <div className={variantMode === "size_only" ? "sm:col-span-6" : "sm:col-span-3"}>
                                <label className="sm:hidden block text-[10px] uppercase font-bold text-slate-400 mb-1">
                                  Size
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. S, M, L, XL, Free Size"
                                  value={v.size || ""}
                                  onChange={(e) =>
                                    handleUpdateVariant(idx, "size", e.target.value)
                                  }
                                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-semibold focus:border-orange-500 focus:outline-none"
                                />
                                {/* Quick Size Chips */}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {["S", "M", "L", "XL", "XXL", "Free Size"].map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => handleUpdateVariant(idx, "size", s)}
                                      className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                                        v.size === s
                                          ? "bg-orange-500 text-white border-orange-500 font-bold"
                                          : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                                      }`}
                                    >
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* COLOR FIELD: Visible in "color_only" (col-span-6) or "both" (col-span-3) */}
                            {(variantMode === "color_only" || variantMode === "both") && (
                              <div className={variantMode === "color_only" ? "sm:col-span-6" : "sm:col-span-3"}>
                                <label className="sm:hidden block text-[10px] uppercase font-bold text-slate-400 mb-1">
                                  Color
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Black, Navy Blue, Maroon"
                                  value={v.color || ""}
                                  onChange={(e) =>
                                    handleUpdateVariant(idx, "color", e.target.value)
                                  }
                                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:border-orange-500 focus:outline-none"
                                />
                                {/* Quick Color Chips */}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {["Black", "Navy", "Maroon", "Red", "Green", "White"].map((c) => (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => handleUpdateVariant(idx, "color", c)}
                                      className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                                        v.color === c
                                          ? "bg-orange-500 text-white border-orange-500 font-bold"
                                          : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                                      }`}
                                    >
                                      {c}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Stock */}
                            <div className="sm:col-span-2">
                              <label className="sm:hidden block text-[10px] uppercase font-bold text-slate-400 mb-1">
                                Stock Qty
                              </label>
                              <input
                                type="number"
                                min="0"
                                placeholder="50"
                                value={v.stock_quantity ?? 50}
                                onChange={(e) =>
                                  handleUpdateVariant(
                                    idx,
                                    "stock_quantity",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:border-orange-500 focus:outline-none"
                              />
                            </div>

                            {/* Price Override */}
                            <div className="sm:col-span-2">
                              <label className="sm:hidden block text-[10px] uppercase font-bold text-slate-400 mb-1">
                                Price Override (₹)
                              </label>
                              <input
                                type="number"
                                min="0"
                                placeholder="Base Price"
                                value={v.selling_price_override ?? ""}
                                onChange={(e) =>
                                  handleUpdateVariant(
                                    idx,
                                    "selling_price_override",
                                    e.target.value ? Number(e.target.value) : null
                                  )
                                }
                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:border-orange-500 focus:outline-none"
                              />
                            </div>

                            {/* Available Status Toggle */}
                            <div className="sm:col-span-1 flex items-center justify-between sm:justify-center">
                              <label className="sm:hidden text-[10px] uppercase font-bold text-slate-400">
                                In Stock
                              </label>
                              <input
                                type="checkbox"
                                checked={v.is_available ?? true}
                                onChange={(e) =>
                                  handleUpdateVariant(idx, "is_available", e.target.checked)
                                }
                                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 bg-slate-900 border-slate-700 cursor-pointer"
                                title="Toggle in-stock status"
                              />
                            </div>

                            {/* Delete Button */}
                            <div className="sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(idx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete variant"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 6. Product Specifications & Attributes Builder */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider">
                          Product Specifications & Details
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {specRows.length} attributes
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Displayed under the "Specifications" tab on the product detail page.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddSpecRow()}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Specification</span>
                  </button>
                </div>

                {/* Quick Suggestion Chips */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-2">
                    Quick Suggestions:
                  </span>
                  <div className="inline-flex flex-wrap gap-1.5 mt-1">
                    {[
                      "Fabric",
                      "Pattern",
                      "Fit",
                      "Neck",
                      "Occasion",
                      "Sleeve Length",
                      "Length",
                      "Wash Care",
                      "Country of Origin",
                      "Package Contains",
                    ].map((chip) => {
                      const isAlreadyAdded = specRows.some(
                        (r) => r.key.toLowerCase() === chip.toLowerCase()
                      );
                      return (
                        <button
                          key={chip}
                          type="button"
                          disabled={isAlreadyAdded}
                          onClick={() => handleAddSpecRow(chip, "")}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold transition-all ${
                            isAlreadyAdded
                              ? "bg-slate-800 text-slate-500 border-slate-700/50 cursor-not-allowed opacity-60"
                              : "bg-slate-800/80 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 hover:border-amber-400 cursor-pointer"
                          }`}
                        >
                          + {chip}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Specification Rows */}
                {specRows.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-700 rounded-xl">
                    <p className="text-xs text-slate-400">No specifications added yet.</p>
                    <button
                      type="button"
                      onClick={() => handleAddSpecRow("Fabric", "")}
                      className="mt-2 text-xs text-amber-400 hover:underline font-bold"
                    >
                      + Add first specification (e.g. Fabric)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span className="col-span-4">Attribute / Key</span>
                      <span className="col-span-7">Value / Specification Detail</span>
                      <span className="col-span-1 text-right">Delete</span>
                    </div>

                    {specRows.map((row) => (
                      <div
                        key={row.id}
                        className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center"
                      >
                        {/* Key */}
                        <div className="sm:col-span-4">
                          <label className="sm:hidden block text-[10px] uppercase font-bold text-slate-400 mb-1">
                            Attribute Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Fabric, Pattern, Fit"
                            value={row.key}
                            onChange={(e) => handleUpdateSpecRow(row.id, "key", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-semibold focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        {/* Value */}
                        <div className="sm:col-span-7">
                          <label className="sm:hidden block text-[10px] uppercase font-bold text-slate-400 mb-1">
                            Attribute Value
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Pure Georgette / Regular Fit / Machine Wash"
                            value={row.value}
                            onChange={(e) => handleUpdateSpecRow(row.id, "value", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        {/* Delete */}
                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecRow(row.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete specification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 7. Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="prod_active"
                  checked={editingProduct.is_active ?? true}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      is_active: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 bg-slate-950 border-slate-700 cursor-pointer"
                />
                <label
                  htmlFor="prod_active"
                  className="font-bold text-slate-300 cursor-pointer text-xs"
                >
                  Active (Visible to Customers via Direct Link)
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingProduct(null);
                    setSpecRows([]);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSavingProduct}
                >
                  Save Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

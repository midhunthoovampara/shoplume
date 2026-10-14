import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/data/store";
import { ProductView } from "@/components/product/ProductView";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug, false);

  if (!product) {
    return {
      title: "Product Not Found",
      description: "The requested product does not exist or is currently unavailable.",
    };
  }

  const mainImage = product.images[0]?.image_url;

  return {
    title: `${product.name} | Shoplume`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      images: mainImage ? [{ url: mainImage }] : [],
    },
  };
}

export default async function ProductDetailPage(props: PageProps) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug, false);

  if (!product) {
    notFound();
  }

  return <ProductView product={product} />;
}

import { NextRequest, NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "@/lib/auth";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";

const BUCKET_NAME = "product-images";
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function POST(req: NextRequest) {
  const isAuth = await isAuthenticatedAdmin(req);
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    // Accept either "file" or "files"
    const files: File[] = [];
    const directFile = formData.get("file");
    if (directFile && typeof directFile === "object" && "arrayBuffer" in directFile) {
      files.push(directFile as File);
    }
    const directFiles = formData.getAll("files");
    for (const f of directFiles) {
      if (f && typeof f === "object" && "arrayBuffer" in f) {
        files.push(f as File);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    const uploadedResults: {
      url: string;
      fileName: string;
      size: number;
      type: string;
    }[] = [];

    for (const file of files) {
      // Validate MIME type
      const mimeType = file.type || "image/jpeg";
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          {
            error: `Unsupported file type: ${mimeType}. Please upload JPEG, PNG, WEBP, or AVIF.`,
          },
          { status: 400 }
        );
      }

      // Max file size 15MB
      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} is too large. Maximum size is 15MB.` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || `.${mimeType.split("/")[1] || "jpg"}`;
      const baseCleanName = path
        .basename(file.name, ext)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .toLowerCase()
        .slice(0, 30);
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseCleanName}${ext}`;

      let filePublicUrl = "";

      // 1. Try Supabase Storage first if configured
      if (isSupabaseAdminConfigured && supabaseAdmin) {
        try {
          const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .upload(uniqueFileName, buffer, {
              contentType: mimeType,
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicData } = supabaseAdmin.storage
              .from(BUCKET_NAME)
              .getPublicUrl(uniqueFileName);
            if (publicData?.publicUrl) {
              filePublicUrl = publicData.publicUrl;
            }
          } else {
            console.warn(
              "Supabase Storage upload warning, falling back to local storage:",
              uploadError.message
            );
          }
        } catch (supabaseErr) {
          console.warn("Supabase Storage exception, falling back:", supabaseErr);
        }
      }

      // 2. Fallback to local /public/uploads/products/ if Supabase not used or failed
      if (!filePublicUrl) {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, uniqueFileName);
        await fs.promises.writeFile(filePath, buffer);
        filePublicUrl = `/uploads/products/${uniqueFileName}`;
      }

      uploadedResults.push({
        url: filePublicUrl,
        fileName: uniqueFileName,
        size: file.size,
        type: mimeType,
      });
    }

    return NextResponse.json({
      success: true,
      url: uploadedResults[0].url,
      fileName: uploadedResults[0].fileName,
      files: uploadedResults,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process upload";
    console.error("Upload error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

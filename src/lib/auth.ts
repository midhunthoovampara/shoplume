import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@meeshoapp.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_COOKIE_NAME = "meesho_admin_token";
const ADMIN_SESSION_SECRET =
  process.env.ADMIN_JWT_SECRET || "meesho-admin-super-secure-token-2026";

export function createAdminToken(email: string): string {
  const timestamp = Date.now();
  const payload = `${email}:${timestamp}:${ADMIN_SESSION_SECRET}`;
  return Buffer.from(payload).toString("base64");
}

export function verifyAdminToken(token: string): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [email, timestamp, secret] = decoded.split(":");
    if (secret !== ADMIN_SESSION_SECRET) return false;
    // Expire session after 7 days
    if (Date.now() - Number(timestamp) > 7 * 86400 * 1000) return false;
    return email === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

export async function isAuthenticatedAdmin(
  req?: NextRequest
): Promise<boolean> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(ADMIN_COOKIE_NAME)?.value ||
    req?.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) return false;
  return verifyAdminToken(token);
}

export async function setAdminSession(email: string) {
  const cookieStore = await cookies();
  const token = createAdminToken(email);
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
  return token;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export function validateAdminCredentials(email: string, pass: string): boolean {
  return email.trim() === ADMIN_EMAIL && pass.trim() === ADMIN_PASSWORD;
}

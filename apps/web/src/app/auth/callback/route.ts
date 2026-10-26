import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/** Handles email confirmation and magic links (PKCE code or token_hash). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("siguiente");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/panel";

  const supabase = await supabaseServer();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const dest = url.clone();
  dest.search = "";
  if (ok) {
    dest.pathname = type === "recovery" ? "/ajustes" : safeNext;
  } else {
    dest.pathname = "/entrar";
    dest.searchParams.set("error", "enlace");
  }
  return NextResponse.redirect(dest);
}

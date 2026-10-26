import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const APP_PREFIXES = ["/panel", "/movimientos", "/cuentas", "/presupuestos", "/metas", "/recurrentes", "/ajustes"];
const AUTH_PAGES = ["/entrar", "/registro"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Refreshes the session cookie when needed. Do not run code between
  // createServerClient and getClaims.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = to === "/entrar" && path !== "/" ? `?siguiente=${encodeURIComponent(path)}` : "";
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!signedIn && APP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return redirect("/entrar");
  if (signedIn && (AUTH_PAGES.includes(path) || path === "/")) return redirect("/panel");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

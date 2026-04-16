import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Rotas públicas — nunca bloquear
  const rotasPublicas = [
    "/login",
    "/planos",
    "/renovar",
    "/obrigado",
    "/api/hotmart",
  ];

  if (rotasPublicas.some((rota) => pathname.startsWith(rota))) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ✅ getUser é mais seguro que getSession
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Não logado → login
  if (!user && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Logado → verifica assinatura
  if (user && pathname.startsWith("/dashboard")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("pago, status_assinatura, data_expiracao")
      .eq("id", user.id)
      .single();

    const agora = new Date();
    const expirado =
      profile?.data_expiracao && new Date(profile.data_expiracao) < agora;

    const assinaturaAtiva =
      profile?.pago === true &&
      profile?.status_assinatura === "active" &&
      !expirado;

    if (!assinaturaAtiva) {
      // Nunca pagou → página de vendas
      if (!profile?.pago) {
        return NextResponse.redirect(new URL("/planos", request.url));
      }
      // Já foi cliente, expirou → direto pro checkout
      return NextResponse.redirect(new URL("/renovar", request.url));
    }
  }

  // Já logado tentando acessar /login → dashboard
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};

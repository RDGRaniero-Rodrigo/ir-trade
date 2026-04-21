import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ✅ Não logado tentando acessar dashboard → login
  if (!user && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ✅ Já logado tentando acessar /login → dashboard
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ✅ Logado no dashboard → verificar assinatura ativa
  if (user && pathname.startsWith("/dashboard")) {
    const { data: profile, error } = await supabase
  .from("profiles")
  .select("pago, status_assinatura, data_expiracao")
  .eq("email", user.email)
  .single();

console.log("USER EMAIL:", user.email);
console.log("PROFILE:", profile);
console.log("ERROR:", error);


    const expirado =
  profile?.data_expiracao
    ? new Date(profile.data_expiracao) < new Date()
    : false; // ← NULL = sem expiração = acesso liberado ✅


    const semAcesso =
      !profile?.pago ||
      profile?.status_assinatura !== "active" ||
      expirado;

    if (semAcesso) {
      return NextResponse.redirect(new URL("/planos", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};

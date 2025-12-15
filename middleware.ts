import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;

	const token = req.cookies.get("aws_token")?.value;

	const isPublic =
		pathname === "/" ||
		pathname.startsWith("/api/auth/login") ||
		pathname.startsWith("/_next") ||
		pathname.startsWith("/favicon") ||
		pathname.startsWith("/logo-");

	// ✅ HOME sempre é pública (não redireciona)
	if (pathname === "/") {
		return NextResponse.next();
	}

	// ✅ rotas públicas liberadas
	if (isPublic) return NextResponse.next();

	// ✅ rotas protegidas sem token => volta pro login
	if (!token) {
		const url = req.nextUrl.clone();
		url.pathname = "/";
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

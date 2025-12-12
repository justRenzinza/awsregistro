// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;

	// libera arquivos estáticos e rotas internas
	if (
		pathname.startsWith("/_next") ||
		pathname.startsWith("/favicon.ico") ||
		pathname.startsWith("/logo") ||
		PUBLIC_FILE.test(pathname)
	) {
		return NextResponse.next();
	}

	// libera APIs (proxy/login/logout) sem exigir cookie
	if (pathname.startsWith("/api/")) {
		return NextResponse.next();
	}

	// sua tela de login é a "/"
	const isLoginPage = pathname === "/";

	// cookie httpOnly que o /api/login define
	const token = req.cookies.get("aws_token")?.value;

	// se não tem token e está tentando acessar área logada -> manda pro login
	if (!token && !isLoginPage) {
		const url = req.nextUrl.clone();
		url.pathname = "/";
		url.searchParams.set("next", pathname); // opcional (voltar depois do login)
		return NextResponse.redirect(url);
	}

	// se tem token e está no login -> manda pra /clientes
	if (token && isLoginPage) {
		const url = req.nextUrl.clone();
		url.pathname = "/clientes";
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

// protege tudo, exceto api e arquivos
export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

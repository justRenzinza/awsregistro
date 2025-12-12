import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
	"/clientes",
	"/controle-sistema",
	"/cadastro-sistema",
	"/clientes-versao",
	"/versao-sistema",
	"/atualizar-clientes",
];

export function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;

	// protege rotas do app
	const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
	if (!isProtected) return NextResponse.next();

	const token = req.cookies.get("aws_token")?.value;

	// sem token -> volta pro login
	if (!token) {
		const url = req.nextUrl.clone();
		url.pathname = "/";
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

// evita rodar em static/assets/api
export const config = {
	matcher: [
		"/clientes/:path*",
		"/controle-sistema/:path*",
		"/cadastro-sistema/:path*",
		"/clientes-versao/:path*",
		"/versao-sistema/:path*",
		"/atualizar-clientes/:path*",
	],
};

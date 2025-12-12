import { NextRequest, NextResponse } from "next/server";

const ROTAS_PROTEGIDAS = [
	"/clientes",
	"/controle-sistema",
	"/cadastro-sistema",
	"/clientes-versao",
	"/versao-sistema",
	"/atualizar-clientes",
];

export function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;

	// verifica se a rota é protegida
	const rotaProtegida = ROTAS_PROTEGIDAS.some((rota) =>
		pathname.startsWith(rota)
	);

	if (!rotaProtegida) {
		return NextResponse.next();
	}

	// 🔐 verifica cookie httpOnly
	const token = req.cookies.get("aws_token")?.value;

	// ❌ sem token → volta pro login
	if (!token) {
		const loginUrl = req.nextUrl.clone();
		loginUrl.pathname = "/";
		return NextResponse.redirect(loginUrl);
	}

	// ✅ com token → segue
	return NextResponse.next();
}

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

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ✅ Prefira uma env só do servidor. Mantive fallback para não quebrar.
const BACKEND_BASE =
	process.env.BACKEND_URL ||
	process.env.NEXT_PUBLIC_BACKEND_URL ||
	"http://189.50.1.222:8046/v1";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();

		const upstream = await fetch(`${BACKEND_BASE}/autenticacao`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		const text = await upstream.text();
		let data: any = null;

		try {
			data = text ? JSON.parse(text) : null;
		} catch {
			data = text;
		}

		if (!upstream.ok) {
			return NextResponse.json(data ?? { error: "Login falhou" }, {
				status: upstream.status,
			});
		}

		const token = data?.token;
		if (!token) {
			return NextResponse.json(
				{ error: "Login OK, mas token não retornou" },
				{ status: 500 }
			);
		}

		const res = NextResponse.json(data, { status: 200 });

		// ✅ Cookie httpOnly para o middleware conseguir bloquear/permitir rotas
		res.cookies.set("aws_token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production", // ✅ localhost funciona
			sameSite: "lax",
			path: "/",
			// maxAge: 60 * 60 * 24, // opcional: 1 dia
		});

		return res;
	} catch (e: any) {
		return NextResponse.json(
			{ error: "Erro no login", detail: String(e?.message || e) },
			{ status: 500 }
		);
	}
}

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
			cache: "no-store",
		});

		const text = await upstream.text();
		let data: any = null;

		try {
			data = text ? JSON.parse(text) : null;
		} catch {
			data = text;
		}

		if (!upstream.ok) {
			// ✅ se falhou, garante que não fica cookie antigo "fantasma"
			const res = NextResponse.json(
				data ?? { error: "Login falhou" },
				{ status: upstream.status }
			);
			res.cookies.set("aws_token", "", {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				path: "/",
				maxAge: 0,
			});
			return res;
		}

		const token = data?.token;
		if (!token || typeof token !== "string") {
			const res = NextResponse.json(
				{ error: "Login OK, mas token não retornou" },
				{ status: 500 }
			);
			res.cookies.set("aws_token", "", {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				path: "/",
				maxAge: 0,
			});
			return res;
		}

		const res = NextResponse.json(data, { status: 200 });

		// ✅ Cookie httpOnly para o middleware conseguir bloquear/permitir rotas
		// ✅ define expiração pra não ficar preso com token antigo no dev
		res.cookies.set("aws_token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production", // ✅ localhost funciona
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 8, // ✅ 8h (ajuste se quiser)
		});

		return res;
	} catch (e: any) {
		// ✅ em erro, também limpa cookie pra evitar redirecionamento errado
		const res = NextResponse.json(
			{ error: "Erro no login", detail: String(e?.message || e) },
			{ status: 500 }
		);
		res.cookies.set("aws_token", "", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 0,
		});
		return res;
	}
}

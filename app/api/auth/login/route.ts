import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function normalizeBaseUrl(url: string) {
	return url.trim().replace(/\/+$/, "");
}

export async function POST(req: NextRequest) {
	const rawBase = process.env.BACKEND_URL;

	if (!rawBase) {
		return NextResponse.json(
			{
				error: "BACKEND_URL não configurado",
				hint: "No .env.local deixe APENAS uma linha: BACKEND_URL=http://15.228.147.235:9001 (ou .../v1). Depois reinicie o npm run dev.",
			},
			{ status: 500 }
		);
	}

	const BACKEND_BASE = normalizeBaseUrl(rawBase);

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
			const res = NextResponse.json(
				data ?? { error: "Login falhou" },
				{ status: upstream.status }
			);

			// limpa cookie antigo pra evitar redirect errado
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

		res.cookies.set("aws_token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 8, // 8h
		});

		return res;
	} catch (e: any) {
		console.error("[api/auth/login] error:", e);

		// também limpa cookie em caso de erro
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

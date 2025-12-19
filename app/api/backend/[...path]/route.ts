// app/api/backend/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function normalizeBaseUrl(url: string) {
	return url.replace(/\/+$/, "");
}

async function forward(req: NextRequest, pathParts: string[]) {
	const rawBase = process.env.BACKEND_URL;
	if (!rawBase) {
		console.error("❌ BACKEND_URL não configurado no servidor");
		return NextResponse.json(
			{ error: "BACKEND_URL não configurado no servidor" },
			{ status: 500 }
		);
	}

	const BACKEND_BASE = normalizeBaseUrl(rawBase);
	const token = req.cookies.get("aws_token")?.value;
	const upstreamUrl =
		`${BACKEND_BASE}/${pathParts.join("/")}` + req.nextUrl.search;

	console.log("🔵 Proxy request:", {
		path: pathParts.join("/"),
		upstreamUrl,
		hasToken: !!token,
	});

	const headers = new Headers(req.headers);
	headers.delete("host");
	headers.delete("content-length");

	// ✅ injeta Authorization a partir do cookie httpOnly
	if (token) {
		headers.set("Authorization", `Bearer ${token}`);
	}

	const method = req.method.toUpperCase();
	const hasBody = method !== "GET" && method !== "HEAD";

	try {
		const upstream = await fetch(upstreamUrl, {
			method,
			headers,
			body: hasBody ? await req.arrayBuffer() : undefined,
			cache: "no-store",
		});

		console.log("📡 Backend response:", {
			status: upstream.status,
			statusText: upstream.statusText,
		});

		const respHeaders = new Headers(upstream.headers);
		respHeaders.delete("content-encoding");
		respHeaders.delete("content-length"); // evita inconsistência

		// ✅ MUITO IMPORTANTE: 204/205 não podem ter body
		if (upstream.status === 204 || upstream.status === 205) {
			return new NextResponse(null, {
				status: upstream.status,
				headers: respHeaders,
			});
		}

		// Para outros status, repassa o body normalmente
		const body = await upstream.arrayBuffer();

		return new NextResponse(body, {
			status: upstream.status,
			headers: respHeaders,
		});
	} catch (error) {
		console.error("❌ Erro ao conectar com backend:", {
			url: upstreamUrl,
			method,
			error: error instanceof Error ? error.message : String(error),
		});

		return NextResponse.json(
			{
				error: "Falha ao conectar com o backend",
				details:
					process.env.NODE_ENV === "development"
						? error instanceof Error
							? error.message
							: String(error)
						: undefined,
			},
			{ status: 502 }
		);
	}
}

// ✅ CORREÇÃO: await params antes de acessar params.path
export async function GET(
	req: NextRequest,
	context: { params: Promise<{ path: string[] }> }
) {
	const params = await context.params;
	return forward(req, params.path);
}

export async function POST(
	req: NextRequest,
	context: { params: Promise<{ path: string[] }> }
) {
	const params = await context.params;
	return forward(req, params.path);
}

export async function PUT(
	req: NextRequest,
	context: { params: Promise<{ path: string[] }> }
) {
	const params = await context.params;
	return forward(req, params.path);
}

export async function PATCH(
	req: NextRequest,
	context: { params: Promise<{ path: string[] }> }
) {
	const params = await context.params;
	return forward(req, params.path);
}

export async function DELETE(
	req: NextRequest,
	context: { params: Promise<{ path: string[] }> }
) {
	const params = await context.params;
	return forward(req, params.path);
}

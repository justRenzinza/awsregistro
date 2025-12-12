import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// coloque aqui a BASE do seu backend
// (deixe com /v1 se seu backend usa /v1 mesmo)
const BACKEND_BASE =
	process.env.NEXT_PUBLIC_BACKEND_URL || "http://189.50.1.222:8046/v1";

type Ctx = { params: Promise<{ path: string[] }> };

async function handler(req: NextRequest, ctx: Ctx) {
	const { path } = await ctx.params;

	// monta URL final (mantém querystring)
	const url = new URL(req.url);
	const target = new URL(
		`${BACKEND_BASE.replace(/\/$/, "")}/${(path || []).join("/")}`
	);
	target.search = url.search; // mantém ?a=b

	// copia headers (remove host)
	const headers = new Headers(req.headers);
	headers.delete("host");

	// body só quando não for GET/HEAD
	const method = req.method.toUpperCase();
	const hasBody = method !== "GET" && method !== "HEAD";
	const body = hasBody ? await req.arrayBuffer() : undefined;

	let upstream: Response;
	try {
		upstream = await fetch(target.toString(), {
			method,
			headers,
			body,
			redirect: "manual",
		});
	} catch (e: any) {
		return NextResponse.json(
			{ error: "Falha ao conectar no backend", detail: String(e?.message || e) },
			{ status: 502 }
		);
	}

	// repassa status + headers + corpo
	const respHeaders = new Headers(upstream.headers);
	respHeaders.delete("content-encoding"); // evita problemas em alguns casos

	return new NextResponse(upstream.body, {
		status: upstream.status,
		headers: respHeaders,
	});
}

export async function GET(req: NextRequest, ctx: Ctx) {
	return handler(req, ctx);
}
export async function POST(req: NextRequest, ctx: Ctx) {
	return handler(req, ctx);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
	return handler(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
	return handler(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
	return handler(req, ctx);
}
export async function OPTIONS(req: NextRequest, ctx: Ctx) {
	return handler(req, ctx);
}

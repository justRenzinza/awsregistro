import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_HTTP =
	process.env.BACKEND_HTTP_URL ||
	process.env.NEXT_PUBLIC_BACKEND_URL || // fallback (se você já usa)
	"http://189.50.1.222:8046";

function joinUrl(base: string, path: string) {
	const b = base.replace(/\/+$/, "");
	const p = path.replace(/^\/+/, "");
	return `${b}/${p}`;
}

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
	return forward(req, ctx);
}
export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
	return forward(req, ctx);
}
export async function PUT(req: NextRequest, ctx: { params: { path: string[] } }) {
	return forward(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
	return forward(req, ctx);
}

async function forward(req: NextRequest, ctx: { params: { path: string[] } }) {
	const path = ctx.params.path?.join("/") || "";
	const baseUrl = joinUrl(BACKEND_HTTP, path);

	const search = req.nextUrl.searchParams.toString();
	const targetUrl = search ? `${baseUrl}?${search}` : baseUrl;

	// copia headers e remove alguns que podem atrapalhar
	const headers = new Headers(req.headers);
	headers.delete("host");
	headers.delete("origin");

	// (opcional) se seu backend exige Authorization, já vai junto
	// headers.set("Authorization", req.headers.get("authorization") ?? "");

	const method = req.method.toUpperCase();
	const body =
		method === "GET" || method === "HEAD" ? undefined : await req.text();

	try {
		const resp = await fetch(targetUrl, {
			method,
			headers,
			body,
			// @ts-ignore
			redirect: "manual",
		});

		const outHeaders = new Headers(resp.headers);
		outHeaders.set("Access-Control-Allow-Origin", "*");

		return new NextResponse(await resp.arrayBuffer(), {
			status: resp.status,
			headers: outHeaders,
		});
	} catch (err: any) {
		return NextResponse.json(
			{
				error: "Falha ao acessar o backend via proxy",
				detail: String(err?.message || err),
				targetUrl,
			},
			{ status: 502 }
		);
	}
}

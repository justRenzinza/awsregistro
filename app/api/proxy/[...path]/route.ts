import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_HTTP =
	process.env.BACKEND_HTTP_URL ||
	process.env.NEXT_PUBLIC_BACKEND_URL ||
	"http://189.50.1.222:8046/v1";

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

// 🔽 ATENÇÃO: params agora é Promise no Next 16
type RouteCtx = {
	params: Promise<{
		path: string[];
	}>;
};

export async function GET(req: NextRequest, ctx: RouteCtx) {
	return forward(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteCtx) {
	return forward(req, ctx);
}
export async function PUT(req: NextRequest, ctx: RouteCtx) {
	return forward(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
	return forward(req, ctx);
}

async function forward(req: NextRequest, ctx: RouteCtx) {
	const { path = [] } = await ctx.params;

	const targetBase = joinUrl(BACKEND_HTTP, path.join("/"));
	const search = req.nextUrl.searchParams.toString();
	const targetUrl = search ? `${targetBase}?${search}` : targetBase;

	const headers = new Headers(req.headers);
	headers.delete("host");
	headers.delete("origin");

	const method = req.method.toUpperCase();
	const body =
		method === "GET" || method === "HEAD" ? undefined : await req.text();

	try {
		const resp = await fetch(targetUrl, {
			method,
			headers,
			body,
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
				error: "Falha ao acessar backend via proxy",
				detail: String(err?.message || err),
				targetUrl,
			},
			{ status: 502 }
		);
	}
}

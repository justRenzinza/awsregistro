// app/api/teste-db/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
	try {
		const ping = await query<{ now: string }>("select now() as now");
		const countCli = await query<{ n: number }>("select count(*)::int as n from public.cliente");
		const countSis = await query<{ n: number }>("select count(*)::int as n from public.sistema");
		const countRel = await query<{ n: number }>("select count(*)::int as n from public.cliente_sistema");

		return NextResponse.json({
			ok: true,
			now: ping.rows[0]?.now,
			tabelas: {
				cliente: countCli.rows[0]?.n ?? 0,
				sistema: countSis.rows[0]?.n ?? 0,
				cliente_sistema: countRel.rows[0]?.n ?? 0,
			},
		});
	} catch (e: any) {
		console.error("GET /api/teste-db erro:", e);
		return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
	}
}

// app/api/clientes/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// agora o contexto tem params assíncrono
type Ctx = { params: Promise<{ id: string }> };

// ===== ATUALIZAR =====
export async function PUT(req: NextRequest, ctx: Ctx) {
	try {
		const { id: idParam } = await ctx.params; // 👈 await aqui
		const id = Number(idParam);

		if (!id || Number.isNaN(id)) {
			return NextResponse.json(
				{ ok: false, error: "ID inválido." },
				{ status: 400 }
			);
		}

		const body = await req.json();

		const razaoSocial: string = (body.razaoSocial ?? "").toString().trim();
		const cnpjDigits: string = (body.cnpj ?? "").toString().replace(/\D/g, "");
		const dataRegistro: string =
			(body.dataRegistro ?? "").toString().trim() ||
			new Date().toLocaleDateString("pt-BR");
		const contato: string = (body.contato ?? "").toString().trim();
		const telefoneDigits: string = (body.telefone ?? "").toString().replace(/\D/g, "");
		const email: string = (body.email ?? "").toString().trim();

		if (!razaoSocial) {
			return NextResponse.json(
				{ ok: false, error: "Razão Social é obrigatória." },
				{ status: 400 }
			);
		}
		if (!cnpjDigits) {
			return NextResponse.json(
				{ ok: false, error: "CNPJ é obrigatório." },
				{ status: 400 }
			);
		}

		const sql = `
			UPDATE public.cliente
			SET
				nome = $1,
				cnpj = $2,
				data_registro = TO_DATE($3, 'DD/MM/YYYY'),
				nome_contato = $4,
				telefone = $5,
				email = $6
			WHERE id = $7;
		`;

		const paramsSql = [
			razaoSocial,
			cnpjDigits,
			dataRegistro,
			contato || null,
			telefoneDigits || null,
			email || null,
			id,
		];

		await query(sql, paramsSql);

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error("PUT /api/clientes/[id] erro:", err);
		return NextResponse.json(
			{ ok: false, error: "Falha ao atualizar cliente." },
			{ status: 500 }
		);
	}
}

// ===== DELETAR =====
export async function DELETE(_req: NextRequest, ctx: Ctx) {
	try {
		const { id: idParam } = await ctx.params; // 👈 await aqui também
		const id = Number(idParam);

		if (!id || Number.isNaN(id)) {
			return NextResponse.json(
				{ ok: false, error: "ID inválido." },
				{ status: 400 }
			);
		}

		const sql = `DELETE FROM public.cliente WHERE id = $1;`;
		await query(sql, [id]);

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error("DELETE /api/clientes/[id] erro:", err);
		return NextResponse.json(
			{ ok: false, error: "Falha ao excluir cliente." },
			{ status: 500 }
		);
	}
}

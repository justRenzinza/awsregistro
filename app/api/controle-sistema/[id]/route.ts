// app/api/controle-sistema/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

type Ctx = {
	params: Promise<{ id: string }>;
};

// ------------------- helpers -------------------
function statusLabelToId(label: string | null | undefined): number {
	const v = (label ?? "").trim();
	switch (v) {
		case "Irregular (Sem Restrição)":
			return 2;
		case "Irregular (Contrato Cancelado)":
			return 3;
		case "Irregular (Com Restrição)":
			return 4;
		case "Regular":
		default:
			return 1;
	}
}

// ============= ATUALIZAR =============
export async function PUT(req: NextRequest, ctx: Ctx) {
	try {
		const { id: idParam } = await ctx.params;
		const id = Number(idParam);

		if (!id || Number.isNaN(id)) {
			return NextResponse.json(
				{ ok: false, error: "ID inválido." },
				{ status: 400 }
			);
		}

		const body = await req.json();

		const clienteId = Number(body.clienteId ?? 0);
		const qtdLicenca = Number(body.qtdLicenca ?? 0);
		const qtdDiaLiberacao = Number(body.qtdDiaLiberacao ?? 0);
		const statusLabel = (body.status ?? "").toString().trim();

		if (!clienteId) {
			return NextResponse.json(
				{ ok: false, error: "Cliente é obrigatório." },
				{ status: 400 }
			);
		}
		if (qtdLicenca < 0 || qtdDiaLiberacao < 0) {
			return NextResponse.json(
				{ ok: false, error: "Valores não podem ser negativos." },
				{ status: 400 }
			);
		}

		const idStatus = statusLabelToId(statusLabel);

		const sql = `
			UPDATE public.cliente_sistema
			SET
				id_cliente              = $1,
				quantidade_licenca      = $2,
				quantidade_dia_liberacao = $3,
				id_status               = $4
			WHERE id = $5;
		`;

		const paramsSql = [
			clienteId,
			qtdLicenca,
			qtdDiaLiberacao,
			idStatus,
			id
		];

		await query(sql, paramsSql);

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error("PUT /api/controle-sistema/[id] erro:", err);
		return NextResponse.json(
			{ ok: false, error: "Falha ao atualizar controle de sistema." },
			{ status: 500 }
		);
	}
}

// ============= DELETAR =============
export async function DELETE(_req: NextRequest, ctx: Ctx) {
	try {
		const { id: idParam } = await ctx.params;
		const id = Number(idParam);

		if (!id || Number.isNaN(id)) {
			return NextResponse.json(
				{ ok: false, error: "ID inválido." },
				{ status: 400 }
			);
		}

		const sql = `DELETE FROM public.cliente_sistema WHERE id = $1;`;
		await query(sql, [id]);

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error("DELETE /api/controle-sistema/[id] erro:", err);
		return NextResponse.json(
			{ ok: false, error: "Falha ao excluir controle de sistema." },
			{ status: 500 }
		);
	}
}

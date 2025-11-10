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
		const qtdBanco = Number(body.qtdBanco ?? 0);
		const qtdCnpj = Number(body.qtdCnpj ?? 0);
		const statusLabel = (body.status ?? "").toString().trim();
		const sistemaLabel = (body.sistema ?? "").toString().trim();
		const ipMblockRaw = (body.ipMblock ?? "").toString().trim();
		const portaMblockRaw = (body.portaMblock ?? "").toString().trim();
		const observacao = (body.observacao ?? "").toString().trim();

		if (!clienteId) {
			return NextResponse.json(
				{ ok: false, error: "Cliente é obrigatório." },
				{ status: 400 }
			);
		}
		if (!sistemaLabel) {
			return NextResponse.json(
				{ ok: false, error: "Sistema é obrigatório." },
				{ status: 400 }
			);
		}
		if (qtdLicenca < 0 || qtdDiaLiberacao < 0 || qtdBanco < 0 || qtdCnpj < 0) {
			return NextResponse.json(
				{ ok: false, error: "Valores numéricos não podem ser negativos." },
				{ status: 400 }
			);
		}

		const idStatus = statusLabelToId(statusLabel);

		// 1) Tenta encontrar o sistema pelo nome
		const sqlBuscaSistema = `
			SELECT id
			FROM public.sistema
			WHERE nome ILIKE $1
			LIMIT 1;
		`;
		const resSistema = await query<{ id: number }>(sqlBuscaSistema, [
			sistemaLabel,
		]);

		let idSistema: number;

		if (resSistema.rows.length > 0) {
			// já existe na tabela sistema
			idSistema = resSistema.rows[0].id;
		} else {
			// 2) Não existe: cria um novo sistema com esse nome
			const sqlInsSistema = `
				INSERT INTO public.sistema (nome)
				VALUES ($1)
				RETURNING id;
			`;
			const resIns = await query<{ id: number }>(sqlInsSistema, [
				sistemaLabel,
			]);

			idSistema = resIns.rows[0].id;
		}

		// Se não for MBLOCK, limpamos IP/porta
		const isMblock = sistemaLabel.toUpperCase() === "MBLOCK";
		const ipMblock = isMblock && ipMblockRaw ? ipMblockRaw : null;
		const portaMblock = isMblock && portaMblockRaw ? portaMblockRaw : null;

		// 3) Atualiza cliente_sistema com o id_sistema correto
		const sql = `
			UPDATE public.cliente_sistema
			SET
				id_cliente               = $1,
				id_sistema               = $2,
				quantidade_licenca       = $3,
				quantidade_dia_liberacao = $4,
				id_status                = $5,
				quantidade_banco_dados   = $6,
				quantidade_cnpj          = $7,
				ip_mblock                = $8,
				porta_mblock             = $9,
				observacao_status        = $10
			WHERE id = $11;
		`;

		const paramsSql = [
			clienteId,
			idSistema,
			qtdLicenca,
			qtdDiaLiberacao,
			idStatus,
			qtdBanco,
			qtdCnpj,
			ipMblock,
			portaMblock,
			observacao || null,
			id,
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

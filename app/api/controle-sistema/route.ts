// app/api/controle-sistema/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/*
	UI espera:

	{
		id: number;
		clienteId: number;
		sistema: string;              // devolve "SACEX"
		qtdLicenca: number;           // quantidade_licenca
		qtdDiaLiberacao: number;      // quantidade_dia_liberacao
		status: string;               // mapeado de id_status
	}

	Tabela real: public.cliente_sistema
	(id, id_cliente, id_sistema, quantidade_licenca, quantidade_dia_liberacao, id_status, observacao_status)
*/

// ------------------- helpers -------------------
function statusIdToLabel(id: number | null): string {
	switch (id) {
		case 2:
			return "Irregular (Sem Restrição)";
		case 3:
			return "Irregular (Contrato Cancelado)";
		case 4:
			return "Irregular (Com Restrição)";
		case 1:
		default:
			return "Regular";
	}
}

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

// ============= LISTAR TODOS (GET) =============
export async function GET() {
	try {
		const sql = `
			SELECT
				id,
				id_cliente              AS "clienteId",
				quantidade_licenca      AS "qtdLicenca",
				quantidade_dia_liberacao AS "qtdDiaLiberacao",
				id_status               AS "idStatus"
			FROM public.cliente_sistema
			ORDER BY id ASC;
		`;

		const { rows } = await query(sql);

		const data = (rows as any[]).map((r) => ({
			id: r.id,
			clienteId: r.clienteId,
			sistema: "SACEX",
			qtdLicenca: r.qtdLicenca,
			qtdDiaLiberacao: r.qtdDiaLiberacao,
			status: statusIdToLabel(r.idStatus),
		}));

		return NextResponse.json({ ok: true, data });
	} catch (err: any) {
		console.error("GET /api/controle-sistema erro:", err);
		return NextResponse.json(
			{ ok: false, error: "Falha ao consultar controle de sistema." },
			{ status: 500 }
		);
	}
}

// ============= CRIAR NOVO (POST) =============
export async function POST(req: NextRequest) {
	try {
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
				{ ok: false, error: "Quantidade de licença e dias não podem ser negativos." },
				{ status: 400 }
			);
		}

		const idStatus = statusLabelToId(statusLabel);

		const sql = `
			INSERT INTO public.cliente_sistema
				(id_cliente, id_sistema, quantidade_licenca, quantidade_dia_liberacao, id_status, observacao_status)
			VALUES
				(
					$1,
					(SELECT id FROM public.sistema ORDER BY id ASC LIMIT 1),
					$2,
					$3,
					$4,
					$5
				);
		`;

		const paramsSql = [
			clienteId,
			qtdLicenca,
			qtdDiaLiberacao,
			idStatus,
			null
		];

		await query(sql, paramsSql);

		return NextResponse.json({ ok: true }, { status: 201 });
	} catch (err: any) {
		console.error("POST /api/controle-sistema erro:", err);
		return NextResponse.json(
			{ ok: false, error: "Falha ao criar registro de controle de sistema." },
			{ status: 500 }
		);
	}
}

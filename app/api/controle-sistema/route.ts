// app/api/controle-sistema/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

type StatusContrato =
	| "Regular"
	| "Irregular (Sem Restrição)"
	| "Irregular (Contrato Cancelado)"
	| "Irregular (Com Restrição)";

type LinhaControleSistema = {
	id: number;
	clienteId: number;
	sistema: string;
	qtdLicenca: number;
	qtdDiaLiberacao: number;
	qtdBanco: number;
	qtdCnpj: number;
	ipMblock: string | null;
	portaMblock: string | null;
	observacao: string | null;
	status: StatusContrato | string;
};

// ------------ helpers --------------
function statusIdToLabel(id: number): StatusContrato {
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

async function getOrCreateSistemaId(nomeSistema: string): Promise<number> {
	const nome = nomeSistema.trim();
	if (!nome) {
		throw new Error("Nome de sistema vazio.");
	}

	// procura pelo nome
	const sqlBusca = `
		SELECT id
		FROM public.sistema
		WHERE nome ILIKE $1
		LIMIT 1;
	`;
	const resBusca = await query<{ id: number }>(sqlBusca, [nome]);
	if (resBusca.rows.length > 0) {
		return resBusca.rows[0].id;
	}

	// se não existir, cria
	const sqlIns = `
		INSERT INTO public.sistema (nome)
		VALUES ($1)
		RETURNING id;
	`;
	const resIns = await query<{ id: number }>(sqlIns, [nome]);
	return resIns.rows[0].id;
}

// ============= LISTAR (GET) =============
export async function GET() {
	try {
		const sql = `
			SELECT
				cs.id,
				cs.id_cliente               AS "clienteId",
				s.nome                      AS sistema,
				cs.quantidade_licenca       AS "qtdLicenca",
				cs.quantidade_dia_liberacao AS "qtdDiaLiberacao",
				cs.quantidade_banco_dados   AS "qtdBanco",
				cs.quantidade_cnpj          AS "qtdCnpj",
				cs.ip_mblock                AS "ipMblock",
				cs.porta_mblock             AS "portaMblock",
				cs.observacao_status        AS "observacao",
				cs.id_status                AS "idStatus"
			FROM public.cliente_sistema cs
			JOIN public.sistema s ON s.id = cs.id_sistema
			ORDER BY cs.id;
		`;

		const res = await query<{
			id: number;
			clienteId: number;
			sistema: string;
			qtdLicenca: number;
			qtdDiaLiberacao: number;
			qtdBanco: number | null;
			qtdCnpj: number | null;
			ipMblock: string | null;
			portaMblock: string | null;
			observacao: string | null;
			idStatus: number;
		}>(sql);

		const data: LinhaControleSistema[] = res.rows.map((r) => ({
			id: r.id,
			clienteId: r.clienteId,
			sistema: r.sistema,
			qtdLicenca: r.qtdLicenca,
			qtdDiaLiberacao: r.qtdDiaLiberacao,
			qtdBanco: r.qtdBanco ?? 0,
			qtdCnpj: r.qtdCnpj ?? 0,
			ipMblock: r.ipMblock,
			portaMblock: r.portaMblock,
			observacao: r.observacao,
			status: statusIdToLabel(r.idStatus),
		}));

		return NextResponse.json({ ok: true, data });
	} catch (err: any) {
		console.error("GET /api/controle-sistema erro:", err);
		return NextResponse.json(
			{ ok: false, error: "Falha ao listar controle de sistema." },
			{ status: 500 }
		);
	}
}

// ============= CRIAR (POST) =============
export async function POST(req: NextRequest) {
	try {
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
		const idSistema = await getOrCreateSistemaId(sistemaLabel);

		const isMblock = sistemaLabel.toUpperCase() === "MBLOCK";
		const ipMblock = isMblock && ipMblockRaw ? ipMblockRaw : null;
		const portaMblock = isMblock && portaMblockRaw ? portaMblockRaw : null;

		const sql = `
			INSERT INTO public.cliente_sistema (
				id_cliente,
				id_sistema,
				quantidade_licenca,
				quantidade_dia_liberacao,
				id_status,
				quantidade_banco_dados,
				quantidade_cnpj,
				ip_mblock,
				porta_mblock,
				observacao_status
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING id;
		`;

		const resIns = await query<{ id: number }>(sql, [
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
		]);

		return NextResponse.json({ ok: true, id: resIns.rows[0].id });
	} catch (err: any) {
		console.error("POST /api/controle-sistema erro:", err);
		return NextResponse.json(
			{ ok: false, error: "Falha ao criar controle de sistema." },
			{ status: 500 }
		);
	}
}

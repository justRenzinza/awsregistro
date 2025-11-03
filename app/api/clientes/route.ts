// app/api/clientes/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/*
	Formatação padrão usada pela UI:

	{
		id: number,
		codigo: number,        // compat: usamos o próprio id
		razaoSocial: string,   // mapeado de nome
		cnpj: string,          // só dígitos (máscara no front)
		dataRegistro: string,  // "dd/mm/yyyy"
		contato: string,       // mapeado de nome_contato
		telefone: string,      // só dígitos (máscara no front)
		email: string
	}
*/

// ===== LISTAR TODOS =====
export async function GET() {
	try {
		const sql = `
			SELECT
				id,
				id AS codigo,
				nome AS "razaoSocial",
				REGEXP_REPLACE(COALESCE(cnpj, ''), '\\D', '', 'g') AS cnpj,
				TO_CHAR(data_registro, 'DD/MM/YYYY') AS "dataRegistro",
				COALESCE(nome_contato, '') AS contato,
				REGEXP_REPLACE(COALESCE(telefone, ''), '\\D', '', 'g') AS telefone,
				COALESCE(email, '') AS email
			FROM public.cliente
			ORDER BY nome ASC, id ASC;
		`;
		const { rows } = await query(sql);
		return NextResponse.json({ ok: true, data: rows });
	} catch (err: any) {
		console.error("GET /api/clientes erro:", err);
		return NextResponse.json(
			{ ok: false, error: "Falha ao consultar clientes." },
			{ status: 500 }
		);
	}
}

// ===== CRIAR NOVO =====
export async function POST(req: NextRequest) {
	try {
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
			INSERT INTO public.cliente
				(nome, cnpj, data_registro, nome_contato, telefone, email)
			VALUES
				($1, $2, TO_DATE($3, 'DD/MM/YYYY'), $4, $5, $6)
			RETURNING id;
		`;

		const params = [
			razaoSocial,
			cnpjDigits,
			dataRegistro,
			contato || null,
			telefoneDigits || null,
			email || null,
		];

		const { rows } = await query<{ id: number }>(sql, params);
		const novoId = rows[0]?.id;

		return NextResponse.json({ ok: true, id: novoId }, { status: 201 });
	} catch (err: any) {
		console.error("POST /api/clientes erro:", err);
		return NextResponse.json(
			{ ok: false, error: "Falha ao criar cliente." },
			{ status: 500 }
		);
	}
}

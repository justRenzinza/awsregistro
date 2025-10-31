// app/api/clientes/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { query } from "@/lib/db";

/*
	Retorna a lista de clientes no formato esperado pela UI:
	{
		id: number,
		codigo: number,          // compat: usamos o próprio id
		razaoSocial: string,     // mapeado de nome
		cnpj: string,            // só dígitos (máscara fica no front)
		dataRegistro: string,    // "dd/mm/yyyy"
		contato: string,         // mapeado de nome_contato
		telefone: string,        // só dígitos (máscara fica no front)
		email: string
	}
*/
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
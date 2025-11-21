// app/api/clientes-versao/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type ClienteVersaoRow = {
	id: number;
	nome_cliente: string;
	nome_sistema: string;
	versao_atual: string | null;
	versao_anterior: string | null;
};

export async function GET() {
	try {
		const sql = `
			SELECT 
				c.id,
				c.nome          AS nome_cliente,
				s.nome          AS nome_sistema,
				cs.versao_atual,
				cs.versao_anterior
			FROM public.cliente c
			INNER JOIN public.cliente_sistema cs 
					ON cs.id_cliente = c.id
			INNER JOIN public.sistema s
					ON s.id = cs.id_sistema
			ORDER BY c.nome, s.nome;
		`;

		const result = await query<ClienteVersaoRow>(sql);

		return NextResponse.json({
			ok: true,
			data: result.rows,
		});
	} catch (error) {
		console.error("Erro ao listar clientes por versão:", error);
		return NextResponse.json(
			{ ok: false, error: "Erro ao listar clientes por versão." },
			{ status: 500 }
		);
	}
}

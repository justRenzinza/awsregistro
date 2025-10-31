// app/api/teste-db/route.ts
export const runtime = "nodejs"; // garante que use o ambiente Node (não Edge)

import { NextResponse } from "next/server";
import { query } from "@/lib/db"; // se der erro de import, use caminho relativo: "../../lib/db"

export async function GET() {
	try {
		// Teste simples: consulta o horário atual do servidor PostgreSQL
		const resultado = await query<{ now: string }>("SELECT NOW() as now");
		return NextResponse.json({
			ok: true,
			mensagem: "Conexão com PostgreSQL funcionando ✅",
			dataServidor: resultado.rows[0].now,
		});
	} catch (erro: any) {
		console.error("Erro ao conectar ao banco:", erro);
		return NextResponse.json(
			{ ok: false, erro: "Falha ao conectar ao banco" },
			{ status: 500 }
		);
	}
}

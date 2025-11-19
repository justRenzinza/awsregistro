// app/api/versao-sistema/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type VersaoSistemaRow = {
	id: number;
	idSistema: number;
	versao: string;
	dataVersao: string;    // yyyy-mm-dd
	sistemaNome: string;
};

export async function GET() {
	try {
		const result = await query<VersaoSistemaRow>(
			`
			SELECT
				vs.id,
				vs.id_sistema AS "idSistema",
				vs.versao,
				TO_CHAR(vs.data_versao, 'YYYY-MM-DD') AS "dataVersao",
				s.nome AS "sistemaNome"
			FROM versao_sistema vs
			JOIN sistema s ON s.id = vs.id_sistema
			ORDER BY s.nome, vs.data_versao DESC
			`
		);

		return NextResponse.json({ ok: true, data: result.rows });
	} catch (error) {
		console.error("Erro ao listar versões:", error);
		return NextResponse.json(
			{ ok: false, error: "Erro ao listar versões." },
			{ status: 500 }
		);
	}
}

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const idSistema: number | undefined = body?.idSistema;
		const versao: string | undefined = body?.versao;
		const dataVersao: string | undefined = body?.dataVersao; // "2025-11-19"

		if (!idSistema || !versao || !dataVersao) {
			return NextResponse.json(
				{ ok: false, error: "Sistema, Versão e Data são obrigatórios." },
				{ status: 400 }
			);
		}

		const insert = await query<VersaoSistemaRow>(
			`
			INSERT INTO versao_sistema (id_sistema, versao, data_versao)
			VALUES ($1, $2, $3)
			RETURNING
				id,
				id_sistema AS "idSistema",
				versao,
				TO_CHAR(data_versao, 'YYYY-MM-DD') AS "dataVersao"
			`,
			[idSistema, versao, dataVersao]
		);

		return NextResponse.json({ ok: true, ...insert.rows[0] }, { status: 201 });
	} catch (error) {
		console.error("Erro ao cadastrar versão:", error);
		return NextResponse.json(
			{ ok: false, error: "Erro ao cadastrar versão." },
			{ status: 500 }
		);
	}
}

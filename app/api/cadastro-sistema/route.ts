// app/api/cadastro-sistema/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type SistemaRow = {
	id: number;
	nome: string;
};

export async function GET() {
	try {
		const result = await query<SistemaRow>(
			"SELECT id, nome FROM sistema ORDER BY id"
		);

		return NextResponse.json(result.rows);
	} catch (error) {
		console.error("Erro ao listar sistemas:", error);
		return NextResponse.json(
			{ error: "Erro ao listar sistemas." },
			{ status: 500 }
		);
	}
}

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const nome: string | undefined = body?.nome;

		// agora só valida o nome
		if (!nome) {
			return NextResponse.json(
				{ error: "Nome do sistema é obrigatório." },
				{ status: 400 }
			);
		}

		// banco gera o ID automaticamente (SERIAL / IDENTITY)
		const insert = await query<SistemaRow>(
			`
			INSERT INTO sistema (nome)
			VALUES ($1)
			RETURNING id, nome
			`,
			[nome]
		);

		return NextResponse.json(insert.rows[0], { status: 201 });
	} catch (error) {
		console.error("Erro ao cadastrar sistema:", error);
		return NextResponse.json(
			{ error: "Erro ao cadastrar sistema." },
			{ status: 500 }
		);
	}
}

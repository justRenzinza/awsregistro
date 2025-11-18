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
			"SELECT id, nome FROM cadastro_sistema ORDER BY id"
		);
		return NextResponse.json(result.rows);
	} catch (error) {
		console.error("Erro ao carregar sistemas:", error);
		return NextResponse.json(
			{ error: "Erro ao listar sistemas." },
			{ status: 500 }
		);
	}
}

export async function POST(req: Request) {
	try {
		const { id, nome } = await req.json();

		if (!id || !nome) {
			return NextResponse.json(
				{ error: "ID e Nome são obrigatórios." },
				{ status: 400 }
			);
		}

		const insert = await query<SistemaRow>(
			"INSERT INTO cadastro_sistema (id, nome) VALUES ($1, $2) RETURNING id, nome",
			[id, nome]
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

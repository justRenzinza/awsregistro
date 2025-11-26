// app/api/atualizar-clientes/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type ClientePayload = {
	id: number;            // id_cliente
	nome_cliente: string;
	nome_sistema: string;  // "SACEX", "SAGRAM", etc.
	versao_atual: string | null;
	versao_anterior: string | null;
};

export async function POST(req: Request) {
	try {
		const body = await req.json();

		const versaoAtual: string = body?.versaoAtual;
		const dataAtualizacao: string | undefined = body?.dataAtualizacao; // "yyyy-mm-dd"
		const clientes: ClientePayload[] = body?.clientes ?? [];

		// validações
		if (!versaoAtual) {
			return NextResponse.json(
				{ error: "Versão nova é obrigatória." },
				{ status: 400 }
			);
		}

		if (!dataAtualizacao) {
			return NextResponse.json(
				{ error: "Data da atualização é obrigatória." },
				{ status: 400 }
			);
		}

		if (!Array.isArray(clientes) || clientes.length === 0) {
			return NextResponse.json(
				{ error: "Nenhum cliente foi enviado para atualização." },
				{ status: 400 }
			);
		}

		for (const c of clientes) {
			await query(
				`
				UPDATE cliente_sistema cs
				SET
					versao_anterior  = cs.versao_atual,
					versao_atual     = $1,
					data_atualizacao = $2::date
				FROM sistema s
				WHERE
					cs.id_cliente = $3
					AND cs.id_sistema = s.id
					AND s.nome = $4
				`,
				[versaoAtual, dataAtualizacao, c.id, c.nome_sistema]
			);
		}

		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		console.error("Erro ao atualizar clientes:", error);
		return NextResponse.json(
			{ error: "Erro ao atualizar clientes." },
			{ status: 500 }
		);
	}
}

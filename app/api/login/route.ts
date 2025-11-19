import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type UsuarioRow = {
	id: number;
	nome: string;
	login: string;
	senha: string;
	id_status: number;
};

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const login: string | undefined = body?.login;
		const senha: string | undefined = body?.senha;

		// Validação básica
		if (!login || !senha) {
			return NextResponse.json(
				{ error: "Login e senha são obrigatórios." },
				{ status: 400 }
			);
		}

		// Busca usuário pelo login (e somente ativos, id_status = 2)
		const result = await query<UsuarioRow>(
			`
			SELECT id, nome, login, senha, id_status
			FROM usuario
			WHERE login = $1
			LIMIT 1
			`,
			[login]
		);

		if (result.rowCount === 0) {
			return NextResponse.json(
				{ error: "Usuário não encontrado." },
				{ status: 404 }
			);
		}

		const user = result.rows[0];

		// Comparação de senha (texto puro)
		if (senha !== user.senha) {
			return NextResponse.json(
				{ error: "Senha incorreta." },
				{ status: 401 }
			);
		}

		// Sucesso — nunca devolve a senha!
		return NextResponse.json({
			ok: true,
			user: {
				id: user.id,
				nome: user.nome,
				login: user.login,
				id_status: user.id_status,
			},
		});
	} catch (error) {
		console.error("Erro no login:", error);
		return NextResponse.json(
			{ error: "Erro interno no servidor." },
			{ status: 500 }
		);
	}
}

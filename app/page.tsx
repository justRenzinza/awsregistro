"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { backendFetch } from "@/lib/backend";

export default function LoginPage() {
	const router = useRouter();

	const [login, setLogin] = useState("");
	const [senha, setSenha] = useState("");
	const [lembrar, setLembrar] = useState(false);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// carrega login salvo (lembrar)
	useEffect(() => {
		if (typeof window === "undefined") return;
		const saved = localStorage.getItem("aws_login");
		if (saved) {
			setLogin(saved);
			setLembrar(true);
		}
	}, []);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);

		if (!login.trim() || !senha.trim()) {
			setError("Informe usuário e senha.");
			return;
		}

		setLoading(true);

		try {
			// ✅ IMPORTANTÍSSIMO: usar backendFetch (no Vercel ele vai pra /api/proxy)
			const data = await backendFetch("/autenticacao", {
				method: "POST",
				body: JSON.stringify({ login, senha }),
			});

			// guarda token / refresh / cliente
			if (typeof window !== "undefined") {
				if (data?.token) localStorage.setItem("aws_token", data.token);
				if (data?.refresh) localStorage.setItem("aws_refresh", data.refresh);

				if (data?.cliente) {
					localStorage.setItem("aws_cliente", JSON.stringify(data.cliente));
					if (data.cliente.idSistema != null) {
						localStorage.setItem("aws_idSistema", String(data.cliente.idSistema));
					}
				}

				// lembrar login (apesar do texto estar "Lembrar senha" 😅)
				if (lembrar) localStorage.setItem("aws_login", login);
				else localStorage.removeItem("aws_login");
			}

			router.push("/clientes");
		} catch (err: any) {
			console.error(err);

			// backendFetch joga Error com .status e .data
			const status = err?.status;
			const payload = err?.data;

			if (status === 401) {
				setError("Usuário ou senha inválidos.");
				return;
			}
			if (status === 404) {
				setError('Backend error 404 - "Not Found"');
				return;
			}

			// tenta pegar msg do backend
			const msg =
				payload?.mensagem ||
				payload?.message ||
				payload?.erro ||
				(status ? `Erro ${status} ao conectar com o servidor.` : null);

			setError(msg || "Erro ao conectar com o servidor.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex h-screen items-center justify-center bg-gray-100 bg-cover bg-center">
			<div className="bg-gradient-to-b from-blue-700 to-blue-400 rounded-2xl shadow-lg p-10 w-full max-w-sm text-white">
				{/* logo */}
				<div className="mb-4 flex justify-center">
					<Image
						src="/logo-branca.png"
						alt="Logo Allware 30 anos"
						width={256}
						height={256}
						className="mx-auto object-contain -mt-2"
						priority
					/>
				</div>

				{/* Título */}
				<h2 className="text-center text-2xl font-semibold mb-2">AWSRegistro</h2>
				<p className="text-center text-sm mb-4 text-white/80">
					Acesse com seu usuário de sistema
				</p>

				{/* Mensagem de erro */}
				{error && (
					<div className="mb-3 rounded-md bg-red-500/90 px-3 py-2 text-sm">
						{error}
					</div>
				)}

				{/* Formulário */}
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div>
						<input
							type="text"
							placeholder="Usuário"
							value={login}
							onChange={(e) => setLogin(e.target.value)}
							className="w-full bg-transparent border-b border-white focus:outline-none placeholder-white/80"
							autoComplete="username"
						/>
					</div>

					<div>
						<input
							type="password"
							placeholder="Senha"
							value={senha}
							onChange={(e) => setSenha(e.target.value)}
							className="w-full bg-transparent border-b border-white focus:outline-none placeholder-white/80"
							autoComplete="current-password"
						/>
					</div>

					<div className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							id="remember"
							checked={lembrar}
							onChange={(e) => setLembrar(e.target.checked)}
						/>
						<label htmlFor="remember">Lembrar senha</label>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-white text-blue-500 font-medium rounded-full py-2 mt-4 transition-transform duration-200 ease-in-out transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
					>
						{loading ? "Entrando..." : "Login"}
					</button>
				</form>
			</div>
		</div>
	);
}

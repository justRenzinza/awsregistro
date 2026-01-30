"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
			// ✅ Login cria cookie httpOnly no servidor
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include", // ✅ garante set/uso de cookies
				body: JSON.stringify({ login: login.trim(), senha }),
			});

			const text = await res.text();
			let data: any = null;

			try {
				data = text ? JSON.parse(text) : null;
			} catch {
				data = text;
			}

			if (!res.ok) {
				const status = res.status;

				if (status === 401) {
					setError("Usuário ou senha inválidos.");
					return;
				}
				if (status === 404) {
					setError('Backend error 404 - "Not Found"');
					return;
				}

				const msg =
					(data &&
						typeof data === "object" &&
						(data.mensagem || data.message || data.erro || data.error)) ||
					(status ? `Erro ${status} ao conectar com o servidor.` : null);

				setError(msg || "Erro ao conectar com o servidor.");
				return;
			}

			// ✅ caches locais (opcionais)
			if (typeof window !== "undefined") {
				// pra Sidebar mostrar o usuário logado
				localStorage.setItem("aws_user", login.trim());

				if (data?.cliente) {
					localStorage.setItem("aws_cliente", JSON.stringify(data.cliente));
					if (data.cliente.idSistema != null) {
						localStorage.setItem("aws_idSistema", String(data.cliente.idSistema));
					}
				}

				// lembrar usuário
				if (lembrar) localStorage.setItem("aws_login", login.trim());
				else localStorage.removeItem("aws_login");
			}

			// ✅ melhor UX (não volta pro login no botão voltar)
			router.replace("/clientes");
		} catch (err) {
			console.error(err);
			setError("Erro ao conectar com o servidor.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-100 bg-cover bg-center px-4">
			<div className="w-full max-w-sm rounded-2xl bg-white shadow-lg p-8 sm:p-10 text-gray-900">
				<div className="mb-6 flex justify-center">
					<div className="relative h-40 w-full max-w-md mx-auto">
						<Image
							src="/awsregistro-novo-letrado.jpeg"
							alt="Logo Allware 30 anos"
							fill
							className="object-cover scale-125"
							priority
							unoptimized
						/>
					</div>
				</div>
				<p className="text-center text-sm mb-5 text-gray-600">
					Acesse com seu usuário de sistema
				</p>

				{error && (
					<div className="mb-4 rounded-md bg-red-500 px-3 py-2 text-sm text-white">
						{error}
					</div>
				)}

				<form className="space-y-4" onSubmit={handleSubmit}>
					<div>
						<input
							type="text"
							placeholder="Usuário"
							value={login}
							onChange={(e) => setLogin(e.target.value)}
							className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
							autoComplete="username"
						/>
					</div>

					<div>
						<input
							type="password"
							placeholder="Senha"
							value={senha}
							onChange={(e) => setSenha(e.target.value)}
							className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
							autoComplete="current-password"
						/>
					</div>

					<div className="flex items-center gap-2 text-sm text-gray-700">
						<input
							type="checkbox"
							id="remember"
							checked={lembrar}
							onChange={(e) => setLembrar(e.target.checked)}
							className="h-4 w-4 accent-blue-600"
						/>
						<label htmlFor="remember">Lembrar usuário</label>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full rounded-full py-2 mt-4 font-medium text-white bg-gradient-to-b from-blue-700 to-blue-400 transition-transform duration-200 ease-in-out transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
					>
						{loading ? "Entrando..." : "Entrar"}
					</button>
				</form>
			</div>
		</div>
	);
}

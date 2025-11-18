"use client";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
	const router = useRouter();

	const [login, setLogin] = useState("");
	const [senha, setSenha] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const res = await fetch("/api/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ login, senha }),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data?.error || "Falha ao fazer login.");
				return;
			}

			// Sucesso: redireciona para a área logada
			// ajuste o path se quiser ir para outra página
			router.push("/clientes");
		} catch (err) {
			console.error(err);
			setError("Erro ao conectar com o servidor.");
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
						className="mx-auto object-cointain -mt-2"
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
						/>
					</div>
					<div>
						<input
							type="password"
							placeholder="Senha"
							value={senha}
							onChange={(e) => setSenha(e.target.value)}
							className="w-full bg-transparent border-b border-white focus:outline-none placeholder-white/80"
						/>
					</div>

					<div className="flex items-center gap-2 text-sm">
						<input type="checkbox" id="remember" />
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

"use client";

import { useState, FormEvent } from "react";
import Sidebar from "@/app/components/Sidebar";

export default function CadastroSistemaPage() {
	/* sidebar mobile */
	const [openSidebar, setOpenSidebar] = useState(false);

	/* formulário */
	const [nome, setNome] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		if (!nome.trim()) {
			setError("Preencha o Nome do sistema.");
			return;
		}

		try {
			setLoading(true);
			const resp = await fetch("/api/cadastro-sistema", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ nome }),
			});

			const data = await resp.json();

			if (!resp.ok) {
				setError(data?.error || "Erro ao cadastrar sistema.");
				return;
			}

			setSuccess(`Sistema "${data.nome}" cadastrado com sucesso!`);
			setNome("");
		} catch (e) {
			console.error(e);
			setError("Erro ao conectar com o servidor.");
		} finally {
			setLoading(false);
		}
	}

	function handleNovo() {
		setNome("");
		setError(null);
		setSuccess(null);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="flex">
				{/* sidebar reutilizável (desktop) */}
				<Sidebar active="cadastro-sistema" />

				{/* overlay do menu mobile (igual clientes/page.tsx) */}
				{openSidebar && (
					<div
						className="fixed inset-0 z-40 sm:hidden"
						aria-hidden="true"
						onClick={() => setOpenSidebar(false)}
					>
						<div className="absolute inset-0 bg-black/40" />
					</div>
				)}

				{/* área principal */}
				<div className="flex-1">
					{/* topo mobile */}
					<div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 sm:hidden">
						<button
							className="rounded-xl border px-3 py-2 text-sm shadow transition-transform hover:scale-105"
							onClick={() => setOpenSidebar(true)}
						>
							☰
						</button>
						<div className="ml-1 flex-1 text-center font-semibold text-white">
							AWSRegistro | Cadastro de Sistema
						</div>
					</div>

					<main className="mx-auto max-w-7xl p-4 md:p-6">
						{/* CARD DE CADASTRO — sem barra de busca */}
						<div className="rounded-xl bg-white shadow overflow-hidden">
							<div className="border-b px-4 py-3 sm:px-6">
								<h2 className="text-base sm:text-lg font-semibold text-gray-800">
									Cadastro de Sistema
								</h2>
								<p className="text-sm text-gray-500">
									Informe o nome do sistema para registrá-lo. Não é necessário
									informar o ID do sistema, pois o banco irá fazer isso
									automaticamente.
								</p>
							</div>

							<div className="px-4 py-4 sm:px-6 sm:py-6">
								{error && (
									<div className="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700">
										{error}
									</div>
								)}

								{success && (
									<div className="mb-3 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
										{success}
									</div>
								)}

								<form
									onSubmit={handleSubmit}
									className="grid grid-cols-1 gap-4 md:grid-cols-2"
								>
									<div className="md:col-span-2">
										<label className="mb-1 block text-xs font-bold text-slate-600">
											Nome do Sistema
										</label>
										<input
											type="text"
											value={nome}
											onChange={(e) => setNome(e.target.value)}
											className="w-full rounded-md border text-black border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500"
											placeholder="Ex.: SACEX, SAGRAM, MBLOCK..."
										/>
									</div>

									<div className="md:col-span-2 flex justify-end gap-2">
										<button
											type="button"
											onClick={handleNovo}
											className="rounded-xl bg-red-400 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transform transition-transform hover:scale-105"
										>
											Limpar
										</button>
										<button
											type="submit"
											disabled={loading}
											className="rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transform transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70"
										>
											{loading ? "Salvando..." : "Salvar Sistema"}
										</button>
									</div>
								</form>
							</div>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}

"use client";

import { useState, FormEvent } from "react";

export default function CadastroSistemaPage() {
	/* sidebar mobile */
	const [openSidebar, setOpenSidebar] = useState(false);

	/* formulário */
	const [id, setId] = useState("");
	const [nome, setNome] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		if (!id.trim() || !nome.trim()) {
			setError("Preencha o ID e o Nome do sistema.");
			return;
		}

		const idNumber = Number(id);
		if (!idNumber || idNumber <= 0) {
			setError("ID deve ser um número inteiro maior que zero.");
			return;
		}

		try {
			setLoading(true);
			const resp = await fetch("/api/cadastro-sistema", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: idNumber, nome }),
			});

			const data = await resp.json();

			if (!resp.ok) {
				setError(data?.error || "Erro ao cadastrar sistema.");
				return;
			}

			setSuccess(`Sistema "${data.nome}" cadastrado com sucesso!`);
			setId("");
			setNome("");
		} catch (e) {
			console.error(e);
			setError("Erro ao conectar com o servidor.");
		} finally {
			setLoading(false);
		}
	}

	function handleNovo() {
		setId("");
		setNome("");
		setError(null);
		setSuccess(null);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="flex">
				{/* sidebar (desktop) */}
				<aside className="hidden sm:flex sm:flex-col sm:w-64 sm:min-h-screen sm:sticky sm:top-0 sm:bg-white sm:shadow sm:border-r">
					<div className="bg-gradient-to-r from-blue-700 to-blue-500 p-4 text-white">
						<div className="flex items-center gap-3">
							<div className="font-semibold flex-1 text-center">
								AWSRegistro | Painel
							</div>
						</div>
					</div>

					<nav className="flex-1 p-3">
						<a
							href="/clientes"
							className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
						>
							Clientes
						</a>
						<a
							href="/controle-sistema"
							className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
						>
							Controle de Sistema
						</a>
						<a
							href="/cadastro-sistema"
							className="mb-1 flex font-semibold items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-900 bg-blue-50 border border-blue-200"
						>
							<span>Cadastro de Sistema</span>
						</a>
						<a
							href="#"
							className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
						>
							Controle Registro
						</a>
					</nav>

					<div className="p-3 text-sm text-gray-600">
						<div className="rounded-lg border p-3">
							<div className="mb-1 font-medium text-gray-800">Usuário</div>
							<div className="flex items-center justify-between">
								<span className="text-gray-700">AWS</span>
								<span className="text-gray-400">▾</span>
							</div>
						</div>
					</div>
				</aside>

				{/* sidebar mobile (drawer) */}
				{openSidebar && (
					<div
						className="fixed inset-0 z-40 sm:hidden"
						aria-hidden="true"
						onClick={() => setOpenSidebar(false)}
					>
						<div className="absolute inset-0 bg-black/40" />
						<div
							className="absolute left-0 top-0 h-full w-64 bg-white shadow-lg"
							onClick={(e) => e.stopPropagation()}
							role="dialog"
						>
							<div className="bg-gradient-to-r from-blue-700 to-blue-500 p-4 text-white">
								<div className="font-semibold text-center">
									AWSRegistro | Painel
								</div>
							</div>
							<nav className="p-3">
								<a
									href="/clientes"
									className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
								>
									Clientes
								</a>
								<a
									href="/controle-sistema"
									className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
								>
									Controle de Sistema
								</a>
								<a
									href="/cadastro-sistema"
									className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 bg-blue-50 border border-blue-200"
								>
									<span>Cadastro de Sistema</span>
								</a>
								<a
									href="#"
									className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
								>
									Controle Registro
								</a>
							</nav>
						</div>
					</div>
				)}

				{/* área principal */}
				<div className="flex-1">
					{/* topo mobile */}
					<div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 sm:hidden">
						<button
							className="rounded-xl border px-3 py-2 text-sm shadow transition-transform hover:scale-105"
							onClick={() => setOpenSidebar(true)}
							aria-label="Abrir menu"
						>
							☰
						</button>
						<div className="ml-1 flex-1 text-center font-semibold text-white">
							AWSRegistro | Cadastro de Sistema
						</div>
					</div>

					<main className="mx-auto max-w-7xl p-4 md:p-6">
						{/* barra de busca + botões (visual igual clientes) */}
						<div className="mb-4 space-y-2">
							{/* MOBILE */}
							<div className="flex flex-wrap items-center gap-2 sm:hidden w-full">
								<input
									type="text"
									placeholder="Pesquisa rápida"
									disabled
									className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 placeholder:text-gray-500 text-md shadow opacity-60"
								/>
								<button
									onClick={handleNovo}
									className="inline-flex items-center bg-white border border-gray-200 justify-center w-10 h-10 rounded-lg shadow transform transition-transform hover:scale-105"
									title="Novo"
									aria-label="Novo"
								>
									➕
								</button>
								<button
									type="button"
									className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white text-blue-600 shadow transform transition-transform hover:scale-105"
									title="Exportar CSV"
									aria-label="Exportar CSV"
									disabled
								>
									⬇️
								</button>
							</div>

							{/* DESKTOP */}
							<div className="hidden sm:flex sm:items-center sm:justify-between">
								<div className="flex w-full items-center gap-2">
									<input
										type="text"
										placeholder="Pesquisa rápida"
										disabled
										className="rounded-xl w-full sm:w-72 border border-gray-200 placeholder:text-gray-500 bg-white px-3 py-2 text-md text-gray-600 shadow opacity-60"
									/>
									<button
										onClick={handleNovo}
										className="rounded-xl px-3 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-600 shadow transform transition-transform hover:scale-105"
										title="Novo"
										aria-label="Novo"
									>
										➕ Novo
									</button>
									<button
										type="button"
										className="rounded-xl px-3 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-400 shadow cursor-default"
										disabled
									>
										⬇️ Exportar CSV
									</button>
                                </div>
							</div>
						</div>

						{/* CARD DE CADASTRO (no lugar da tabela) */}
						<div className="rounded-xl bg-white shadow overflow-hidden">
							<div className="border-b px-4 py-3 sm:px-6">
								<h2 className="text-base sm:text-lg font-semibold text-gray-800">
									Cadastro de Sistema
								</h2>
								<p className="text-sm text-gray-500">
									Informe o ID e o Nome do sistema para registrá-lo.
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
									<div>
										<label className="mb-1 block text-xs font-medium text-slate-600">
											ID do Sistema
										</label>
										<input
											type="number"
											value={id}
											onChange={(e) => setId(e.target.value)}
											className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500"
											placeholder="Ex.: 1, 2, 3..."
										/>
									</div>

									<div>
										<label className="mb-1 block text-xs font-medium text-slate-600">
											Nome do Sistema
										</label>
										<input
											type="text"
											value={nome}
											onChange={(e) => setNome(e.target.value)}
											className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500"
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

"use client";

import { useEffect, useState, FormEvent } from "react";

type Sistema = {
	id: number;
	nome: string;
};

export default function CadastroVersaoSistemaPage() {
	const [openSidebar, setOpenSidebar] = useState(false);

	const [sistemas, setSistemas] = useState<Sistema[]>([]);
	const [idSistema, setIdSistema] = useState("");
	const [versao, setVersao] = useState("");
	const [dataVersao, setDataVersao] = useState("");

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// carrega sistemas para o combo
	useEffect(() => {
		async function loadSistemas() {
			try {
				const resp = await fetch("/api/cadastro-sistema", { cache: "no-store" });
				const data = await resp.json();
				if (Array.isArray(data)) {
					setSistemas(data);
				}
			} catch (e) {
				console.error("Erro ao carregar sistemas:", e);
			}
		}
		loadSistemas();
	}, []);

	function handleNovo() {
		setIdSistema("");
		setVersao("");
		setDataVersao("");
		setError(null);
		setSuccess(null);
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		if (!idSistema || !versao.trim() || !dataVersao) {
			setError("Selecione o sistema, preencha a versão e a data.");
			return;
		}

		try {
			setLoading(true);
			const resp = await fetch("/api/versao-sistema", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					idSistema: Number(idSistema),
					versao,
					dataVersao,
				}),
			});

			const data = await resp.json();

			if (!resp.ok || !data.ok) {
				setError(data?.error || "Erro ao cadastrar versão.");
				return;
			}

			setSuccess("Versão cadastrada com sucesso!");
			handleNovo();
		} catch (e) {
			console.error(e);
			setError("Erro ao conectar com o servidor.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="flex">
				{/* sidebar desktop */}
				<aside className="hidden sm:flex sm:flex-col sm:w-64 sm:min-h-screen sm:sticky sm:top-0 sm:bg-white sm:shadow sm:border-r">
					<div className="bg-gradient-to-r from-blue-700 to-blue-500 p-4 text-white">
						<div className="font-semibold text-center">AWSRegistro | Painel</div>
					</div>

					<nav className="flex-1 p-3">
						<a href="/clientes" className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
							Clientes
						</a>
						<a href="/controle-sistema" className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
							Controle de Sistema
						</a>
						<a href="/cadastro-sistema" className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
							Cadastro de Sistema
						</a>
						<a href="/versao-sistema" className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 bg-blue-50 border border-blue-200">
							Versão dos Sistemas
						</a>
						<a href="#" className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
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

				{/* sidebar mobile */}
				{openSidebar && (
					<div className="fixed inset-0 z-40 sm:hidden" aria-hidden="true" onClick={() => setOpenSidebar(false)}>
						<div className="absolute inset-0 bg-black/40" />
						<div className="absolute left-0 top-0 h-full w-64 bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
							<div className="bg-gradient-to-r from-blue-700 to-blue-500 p-4 text-white">
								<div className="font-semibold text-center">AWSRegistro | Painel</div>
							</div>
							<nav className="p-3">
								<a href="/clientes" className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
									Clientes
								</a>
								<a href="/controle-sistema" className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
									Controle de Sistema
								</a>
								<a href="/cadastro-sistema" className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
									Cadastro de Sistema
								</a>
								<a href="/versao-sistema" className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 bg-blue-50 border border-blue-200">
									Versionamento dos Sistemas
								</a>
								<a href="#" className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
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
							AWSRegistro | Versões por Sistema
						</div>
					</div>

					<main className="mx-auto max-w-7xl p-4 md:p-6">
						<div className="rounded-xl bg-white shadow overflow-hidden">
							<div className="border-b px-4 py-3 sm:px-6">
								<h2 className="text-base sm:text-lg font-semibold text-gray-800">
									Cadastro de Versão por Sistema
								</h2>
								<p className="text-sm text-gray-500">
									Selecione o sistema e informe a versão e a data.
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

								<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<div>
										<label className="mb-1 block text-xs font-bold text-slate-600">
											Sistema
										</label>
										<select
											value={idSistema}
											onChange={(e) => setIdSistema(e.target.value)}
											className="w-full rounded-md border text-black border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500 bg-white"
										>
											<option value="">Selecione...</option>
											{sistemas.map((s) => (
												<option key={s.id} value={s.id}>
													{s.nome}
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="mb-1 block text-xs font-bold text-slate-600">
											Versão
										</label>
										<input
											type="text"
											value={versao}
											onChange={(e) => setVersao(e.target.value)}
											className="w-full rounded-md border text-black border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500"
											placeholder="Ex.: 2025.1.15.29"
										/>
									</div>

									<div>
										<label className="mb-1 block text-xs font-bold text-slate-600">
											Data da Versão
										</label>
										<input
											type="date"
											value={dataVersao}
											onChange={(e) => setDataVersao(e.target.value)}
											className="w-full rounded-md border text-black border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500"
										/>
									</div>

									<div className="md:col-span-3 flex justify-end gap-2 mt-2">
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
											{loading ? "Salvando..." : "Salvar Versão"}
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

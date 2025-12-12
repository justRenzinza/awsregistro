"use client";

import { useEffect, useState, FormEvent } from "react";
import Sidebar from "@/app/components/Sidebar";
import { backendFetch } from "@/lib/backend";

type Sistema = {
	id: number;
	nome: string;
};

export default function CadastroSistemaPage() {
	/* ===== Estados ===== */
	const [nome, setNome] = useState("");
	const [idEditando, setIdEditando] = useState<number | null>(null);

	const [sistemas, setSistemas] = useState<Sistema[]>([]);
	const [query, setQuery] = useState("");

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	/* ===== Carregar Sistemas (GET /sistema) ===== */
	async function loadSistemas() {
		try {
			setError(null);

			const resp = await backendFetch("/sistema", { method: "GET" });
			if (!resp) throw new Error("Resposta inválida");

			console.log("Sistemas carregados:", resp);

			if (Array.isArray(resp)) {
				setSistemas(resp);
			} else if (Array.isArray(resp?.data)) {
				setSistemas(resp.data);
			} else {
				setSistemas([]);
			}
		} catch (e) {
			console.error("Erro ao carregar sistemas:", e);
			setError("Não foi possível carregar os sistemas.");
		}
	}

	useEffect(() => {
		loadSistemas();
	}, []);

	/* ===== SUBMIT (POST OU PUT) ===== */
	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		if (!nome.trim()) {
			setError("Informe o nome do sistema.");
			return;
		}

		try {
			setLoading(true);

			// Se está editando → PUT
			if (idEditando !== null) {
				await backendFetch(`/sistema/${idEditando}`, {
					method: "PUT",
					body: JSON.stringify({ nome }),
				});
				setSuccess("Sistema atualizado com sucesso!");
			} else {
				// Novo cadastro → POST
				await backendFetch(`/sistema`, {
					method: "POST",
					body: JSON.stringify({ nome }),
				});
				setSuccess("Sistema cadastrado com sucesso!");
			}

			setNome("");
			setIdEditando(null);
			loadSistemas();
		} catch (e) {
			console.error(e);
			setError("Erro ao salvar sistema.");
		} finally {
			setLoading(false);
		}
	}

	/* ===== Editar ===== */
	function startEdit(s: Sistema) {
		setIdEditando(s.id);
		setNome(s.nome);
		setError(null);
		setSuccess(null);
	}

	/* ===== Limpar ===== */
	function handleNovo() {
		setIdEditando(null);
		setNome("");
		setError(null);
		setSuccess(null);
	}

	/* ===== Excluir ===== */
	async function handleDelete(id: number) {
		if (!confirm("Deseja realmente excluir este sistema?")) return;

		try {
			await backendFetch(`/sistema/${id}`, { method: "DELETE" });
			loadSistemas();
		} catch (e) {
			console.error(e);
			alert("Erro ao excluir sistema.");
		}
	}

	/* ===== Filtro ===== */
	const filtered = sistemas.filter((s) =>
		s.nome.toLowerCase().includes(query.toLowerCase())
	);

	/* ===== Render ===== */
	return (
		<div className="min-h-screen bg-gray-50">
			<div className="flex">
				<Sidebar active="cadastro-sistema" />

				<div className="flex-1">
					{/* topo mobile */}
					<div className="sticky top-0 z-20 sm:hidden bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 border-b flex justify-center">
						<div className="font-semibold text-white">Cadastro de Sistema</div>
					</div>

					<main className="mx-auto max-w-7xl p-4 md:p-6">
						{/* FORMULÁRIO */}
						<div className="rounded-xl bg-white shadow mb-6">
							<div className="border-b px-4 py-3 sm:px-6">
								<h2 className="text-lg font-semibold text-gray-800">
									{ idEditando ? "Editar Sistema" : "Cadastro de Sistema" }
								</h2>
								<p className="text-sm text-gray-500">
									Informe o nome do sistema abaixo.
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

								<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
									<div>
										<label className="block text-xs font-bold text-slate-600 mb-1">
											Nome do Sistema
										</label>
										<input
											type="text"
											value={nome}
											onChange={(e) => setNome(e.target.value)}
											className="w-full rounded-xl border text-black border-slate-300 px-3 py-2 text-sm focus:border-blue-500 outline-none shadow"
											placeholder="Ex.: SACEX, SAGRAM..."
										/>
									</div>

									<div className="flex justify-end gap-2 pt-2">
										<button
											type="button"
											onClick={handleNovo}
											className="rounded-xl bg-red-400 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transform hover:scale-105"
										>
											Limpar
										</button>

										<button
											type="submit"
											disabled={loading}
											className="rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 transform hover:scale-105"
										>
											{loading ? "Salvando..." : (idEditando ? "Atualizar" : "Salvar Sistema")}
										</button>
									</div>
								</form>
							</div>
						</div>

						{/* LISTA DE SISTEMAS */}
						<div className="rounded-xl bg-white shadow overflow-hidden">
							{/* Cabeçalho branco com título + pesquisa (separado do azul) */}
							<div className="px-4 py-3 sm:px-6 border-b">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<div>
										<h2 className="text-lg font-semibold text-gray-800">
											Lista de Sistemas
										</h2>
										<p className="text-xs text-gray-500">
											Veja, edite ou exclua os sistemas cadastrados.
										</p>
									</div>

									<div className="w-full sm:w-64">
										<label className="block text-xs font-medium text-gray-600 mb-1">
											Pesquisa rápida
										</label>
										<input
											type="text"
											placeholder="Digite para filtrar..."
											value={query}
											onChange={(e) => setQuery(e.target.value)}
											className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow bg-white text-gray-700"
										/>
									</div>
								</div>
							</div>

							{/* Tabela */}
							<div className="overflow-x-auto">
								<table className="min-w-full text-sm border-separate border-spacing-0">
									<thead>
										<tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-center">
											{/* AÇÕES — primeira coluna */}
											<th className="px-3 py-3 w-24">Ações</th>
											{/* ID */}
											<th className="px-3 py-3 w-20">ID</th>
											{/* Nome */}
											<th className="px-3 py-3">Nome do Sistema</th>
										</tr>
									</thead>

									<tbody className="text-gray-900 text-center">
										{filtered.map((s, idx) => (
											<tr
												key={s.id}
												className={idx % 2 === 0 ? "bg-white" : "bg-gray-100"}
											>
												{/* AÇÕES */}
												<td className="px-3 py-3">
													<div className="flex items-center justify-center gap-2">
														<button
															onClick={() => startEdit(s)}
															className="rounded-xl bg-yellow-400 text-white font-semibold w-7 h-7 hover:bg-yellow-500 transition-transform transform hover:scale-110"
															title="Editar"
														>
															✎
														</button>

														<button
															onClick={() => handleDelete(s.id)}
															className="rounded-xl bg-red-400 text-white font-semibold w-7 h-7 hover:bg-red-600 transition-transform transform hover:scale-110"
															title="Excluir"
														>
															✖
														</button>
													</div>
												</td>

												{/* ID */}
												<td className="px-3 py-3">{s.id}</td>

												{/* Nome */}
												<td className="px-3 py-3">{s.nome}</td>
											</tr>
										))}

										{filtered.length === 0 && (
											<tr>
												<td colSpan={3} className="px-3 py-6 text-gray-500">
													Nenhum sistema encontrado.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}

"use client";

import { useState, useMemo, useEffect } from "react";
import Sidebar from "@/app/components/Sidebar";

/* ---- tipos ---- */
type LinhaClienteVersao = {
	id: number;
	nome_cliente: string;
	nome_sistema: string;
	versao_atual: string | null;
	versao_anterior: string | null;
};

type SortKey =
	| "id"
	| "nome_cliente"
	| "nome_sistema"
	| "versao_atual"
	| "versao_anterior";
type SortDir = "asc" | "desc" | null;

export default function AtualizarClientesPage() {
	/* estados base */
	const [rows, setRows] = useState<LinhaClienteVersao[]>([]);
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);

	const [sortKey, setSortKey] = useState<SortKey | null>(null);
	const [sortDir, setSortDir] = useState<SortDir>(null);

	const [openSidebar, setOpenSidebar] = useState(false);

	/* estados de atualização */
	const [versaoNova, setVersaoNova] = useState("2025.1.15.28");
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	/* carregar dados */
	async function loadRows() {
		try {
			const resp = await fetch("/api/clientes-versao", {
				cache: "no-store",
			});
			if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

			const json = await resp.json();
			console.log("Resposta /api/clientes-versao:", json);

			if (json?.ok && Array.isArray(json.data)) {
				setRows(json.data as LinhaClienteVersao[]);
			} else if (Array.isArray(json)) {
				setRows(json as LinhaClienteVersao[]);
			} else {
				console.warn("Formato inesperado em /api/clientes-versao:", json);
				setRows([]);
			}
		} catch (e) {
			console.error("Erro ao carregar Clientes por Versão:", e);
			alert("Erro ao carregar Clientes por Versão.");
		}
	}

	useEffect(() => {
		loadRows();
	}, []);

	/* ordenação */
	function toggleSort(key: SortKey) {
		if (sortKey !== key) {
			setSortKey(key);
			setSortDir("asc");
			return;
		}
		if (sortDir === "asc") setSortDir("desc");
		else if (sortDir === "desc") {
			setSortKey(null);
			setSortDir(null);
		} else setSortDir("asc");
	}

	/* filtragem + ordenação */
	const filtered = useMemo(() => {
		const q = query.toLowerCase().trim();
		let data = rows.filter((r) =>
			[
				String(r.id),
				r.nome_cliente,
				r.nome_sistema,
				r.versao_atual ?? "",
				r.versao_anterior ?? "",
			]
				.join(" ")
				.toLowerCase()
				.includes(q)
		);

		if (sortKey && sortDir) {
			data = [...data].sort((a, b) => {
				if (sortKey === "id") {
					const va = a.id;
					const vb = b.id;
					return sortDir === "asc" ? va - vb : vb - va;
				}

				const va = String(a[sortKey] ?? "").toLowerCase();
				const vb = String(b[sortKey] ?? "").toLowerCase();

				if (va < vb) return sortDir === "asc" ? -1 : 1;
				if (va > vb) return sortDir === "asc" ? 1 : -1;
				return 0;
			});
		}

		return data;
	}, [rows, query, sortKey, sortDir]);

	/* paginação */
	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
	const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

	useEffect(() => setPage(1), [query]);

	/* seleção de clientes */
	function toggleSelect(id: number) {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
		);
	}

	function isSelected(id: number) {
		return selectedIds.includes(id);
	}

	function selecionarTodosDaPagina() {
		const idsPagina = pageData.map((r) => r.id);
		setSelectedIds((prev) => {
			const set = new Set(prev);
			let mudouAlgo = false;

			for (const id of idsPagina) {
				if (!set.has(id)) {
					set.add(id);
					mudouAlgo = true;
				}
			}

			// se todos já estavam selecionados, desmarca todos da página
			const todosSelecionados = idsPagina.every((id) => set.has(id));
			if (todosSelecionados) {
				idsPagina.forEach((id) => set.delete(id));
			}

			return Array.from(set);
		});
	}

	function limparSelecao() {
		setSelectedIds([]);
	}

	/* submit da atualização */
	async function handleAtualizar() {
		if (!versaoNova.trim()) {
			alert("Informe a versão nova antes de atualizar.");
			return;
		}
		if (selectedIds.length === 0) {
			alert("Selecione pelo menos um cliente para atualizar.");
			return;
		}

		const confirmar = window.confirm(
			`Confirmar atualização da versão "${versaoNova}" para ${selectedIds.length} cliente(s)?`
		);
		if (!confirmar) return;

		try {
			setIsSubmitting(true);

			const clientesSelecionados = rows.filter((r) =>
				selectedIds.includes(r.id)
			);

			const resp = await fetch("/api/atualizar-clientes-versao", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					versaoAtual: versaoNova,
					clientes: clientesSelecionados.map((c) => ({
						id: c.id,
						nome_cliente: c.nome_cliente,
						nome_sistema: c.nome_sistema,
						versao_atual: c.versao_atual,
						versao_anterior: c.versao_anterior,
					})),
				}),
			});

			if (!resp.ok) {
				const txt = await resp.text();
				throw new Error(`HTTP ${resp.status} - ${txt}`);
			}

			const json = await resp.json();
			console.log("Resposta /api/atualizar-clientes-versao:", json);

			alert("Atualização enviada com sucesso!");
			// se quiser recarregar a tabela após o backend atualizar:
			limparSelecao();
			// await loadRows();
		} catch (e) {
			console.error("Erro ao enviar atualização:", e);
			alert("Erro ao enviar atualização. Verifique o console para mais detalhes.");
		} finally {
			setIsSubmitting(false);
		}
	}

	/* componente lista mobile */
	const MobileList = () => (
		<ul className="sm:hidden space-y-3">
			{pageData.map((r) => (
                <li
					key={`${r.id}-${r.nome_sistema}`}
					className="rounded-xl border bg-white p-4 shadow text-gray-800"
				>
					<div className="flex items-start justify-between gap-3">
						<div>
							<div className="text-xs text-gray-500 mb-1">
								Código {r.id}
							</div>
							<div className="font-bold text-lg">{r.nome_cliente}</div>
							<div className="text-sm text-gray-500">{r.nome_sistema}</div>
							<div className="mt-2 text-sm">
								<div>
									<span className="text-gray-500">Versão Atual:</span>{" "}
									{r.versao_atual ?? "—"}
								</div>
								<div>
									<span className="text-gray-500">Versão Anterior:</span>{" "}
									{r.versao_anterior ?? "—"}
								</div>
							</div>
						</div>

						<div className="flex flex-col items-end gap-2">
							<input
								type="checkbox"
								checked={isSelected(r.id)}
								onChange={() => toggleSelect(r.id)}
								className="w-5 h-5"
							/>
							<span className="text-xs text-gray-600">
								{isSelected(r.id) ? "Selecionado" : "Selecionar"}
							</span>
						</div>
					</div>
				</li>
			))}

			{pageData.length === 0 && (
				<li className="text-center text-gray-500 py-6">
					Nenhum registro encontrado.
				</li>
			)}
		</ul>
	);

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="flex">
				{/* sidebar desktop reutilizável.
				    Por enquanto deixei active="clientes-versao".
					Depois, se você criar uma chave nova na Sidebar ("atualizar-clientes"),
					é só trocar aqui. */}
				<Sidebar active="clientes-versao" />

				{/* sidebar mobile */}
				{openSidebar && (
					<div
						className="fixed inset-0 z-40 sm:hidden"
						onClick={() => setOpenSidebar(false)}
					>
						<div className="absolute inset-0 bg-black/40" />
						<div
							className="absolute left-0 top-0 h-full w-64 bg-white shadow-lg"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="bg-gradient-to-r from-blue-700 to-blue-500 p-4 text-white text-center font-semibold">
								AWSRegistro | Painel
							</div>

							<nav className="p-3">
								<a
									href="/clientes"
									className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
								>
									<span>Clientes</span>
								</a>

								<a
									href="/controle-sistema"
									className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
								>
									<span>Controle de Sistema</span>
								</a>

								<a
									href="/cadastro-sistema"
									className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
								>
									<span>Cadastro de Sistema</span>
								</a>

								<a
									href="/versao-sistema"
									className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
								>
									<span>Versão dos Sistemas</span>
								</a>

								<a
									href="/clientes-versao"
									className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
								>
									<span>Clientes por Versão</span>
								</a>

								{/* você pode adicionar o link oficial da tela aqui depois */}
								<a
									href="/atualizar-clientes"
									className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold bg-blue-50 border border-blue-200 text-gray-900"
								>
									<span>Atualizar Clientes</span>
								</a>

								<a
									href="#"
									className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
								>
									<span>Controle Registro</span>
								</a>
							</nav>
						</div>
					</div>
				)}

				{/* área principal */}
				<div className="flex-1">
					{/* topo mobile */}
					<div className="sticky top-0 z-20 sm:hidden bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 border-b flex items-center justify-between">
						<button
							className="rounded-xl border px-3 py-1 shadow text-white"
							onClick={() => setOpenSidebar(true)}
						>
							☰
						</button>
						<div className="font-semibold text-white">
							Atualizar Clientes
						</div>
					</div>

					<main className="p-4 md:p-6 mx-auto max-w-7xl">
						{/* cabeçalho e formulário de versão */}
						<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<h1 className="text-xl font-semibold text-gray-900">
									Atualizar Clientes por Versão
								</h1>
								<p className="text-sm text-gray-600">
									Informe a versão que será aplicada e selecione os
									clientes que receberão a atualização.
								</p>
							</div>

							<div className="flex flex-col gap-2 sm:items-end">
								<label className="text-sm font-medium text-gray-700">
									Versão a aplicar
								</label>
								<input
									type="text"
									value={versaoNova}
									onChange={(e) => setVersaoNova(e.target.value)}
									placeholder="2025.1.15.28"
									className="rounded-xl border border-gray-300 px-3 py-2 shadow bg-white text-gray-700 w-full sm:w-56"
								/>
							</div>
                        </div>

						{/* controles de busca e seleção */}
						<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<input
								type="text"
								placeholder="Pesquisa rápida"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								className="rounded-xl w-full sm:w-72 border border-gray-300 px-3 py-2 shadow bg-white text-gray-700"
							/>

							<div className="flex flex-wrap gap-2 text-sm">
								<button
									type="button"
									onClick={selecionarTodosDaPagina}
									className="rounded-xl border border-gray-300 bg-white px-3 py-2 shadow-sm hover:bg-gray-50"
								>
									Selecionar / Desmarcar página
								</button>
								<button
									type="button"
									onClick={limparSelecao}
									className="rounded-xl border border-gray-300 bg-white px-3 py-2 shadow-sm hover:bg-gray-50"
								>
									Limpar seleção
								</button>
							</div>
						</div>

						{/* resumo seleção */}
						<div className="mb-4 rounded-xl border bg-white px-4 py-3 shadow-sm text-sm text-gray-700 flex flex-wrap items-center justify-between gap-2">
							<span>
								<strong>{filtered.length}</strong> registro(s) filtrados •{" "}
								<strong>{selectedIds.length}</strong> cliente(s) selecionado(s)
							</span>
							<span className="text-gray-500">
								Versão a aplicar:{" "}
								<strong>{versaoNova || "—"}</strong>
							</span>
						</div>

						{/* lista mobile */}
						<MobileList />

						{/* tabela desktop */}
						<div className="hidden sm:block rounded-xl bg-white shadow overflow-hidden">
							<table className="min-w-full text-sm border-separate border-spacing-0">
								<thead>
									<tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-center">
										<th className="px-3 py-3 w-10 text-center">
											{/* checkbox geral da página */}
											<input
												type="checkbox"
												onChange={selecionarTodosDaPagina}
												checked={
													pageData.length > 0 &&
													pageData.every((r) => isSelected(r.id))
												}
											/>
										</th>

										<th
											className="px-3 py-3 cursor-pointer w-24 text-center"
											onClick={() => toggleSort("id")}
										>
											Código{" "}
											{sortKey === "id"
												? sortDir === "asc"
													? "▲"
													: "▼"
												: ""}
										</th>

										<th
											className="px-3 py-3 cursor-pointer text-center"
											onClick={() => toggleSort("nome_cliente")}
										>
											Cliente{" "}
											{sortKey === "nome_cliente"
												? sortDir === "asc"
													? "▲"
													: "▼"
												: ""}
										</th>

										<th
											className="px-3 py-3 cursor-pointer text-center"
											onClick={() => toggleSort("nome_sistema")}
										>
											Sistema{" "}
											{sortKey === "nome_sistema"
												? sortDir === "asc"
													? "▲"
													: "▼"
												: ""}
										</th>

										<th
											className="px-3 py-3 cursor-pointer text-center"
											onClick={() => toggleSort("versao_atual")}
										>
											Versão Atual{" "}
											{sortKey === "versao_atual"
												? sortDir === "asc"
													? "▲"
													: "▼"
												: ""}
										</th>

										<th
											className="px-3 py-3 cursor-pointer text-center"
											onClick={() => toggleSort("versao_anterior")}
										>
											Versão Anterior{" "}
											{sortKey === "versao_anterior"
												? sortDir === "asc"
													? "▲"
													: "▼"
												: ""}
										</th>
									</tr>
                                </thead>
								<tbody className="text-gray-900 text-center">
									{pageData.map((r, idx) => (
										<tr
											key={`${r.id}-${r.nome_sistema}`}
											className={idx % 2 === 0 ? "bg-white" : "bg-gray-100"}
										>
											<td className="px-3 py-3 text-center">
												<input
													type="checkbox"
													checked={isSelected(r.id)}
													onChange={() => toggleSelect(r.id)}
												/>
											</td>
											<td className="px-3 py-3 tabular-nums text-center">
												{r.id}
											</td>
											<td className="px-3 py-3 text-center">
												{r.nome_cliente}
											</td>
											<td className="px-3 py-3 text-center">
												{r.nome_sistema}
											</td>
											<td className="px-3 py-3 text-center">
												{r.versao_atual ?? "—"}
											</td>
											<td className="px-3 py-3 text-center">
												{r.versao_anterior ?? "—"}
											</td>
										</tr>
									))}

									{pageData.length === 0 && (
										<tr>
											<td
												className="px-3 py-8 text-center text-gray-500"
												colSpan={6}
											>
												Nenhum registro encontrado.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>

						{/* paginação + botão de atualizar */}
						<div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div className="flex flex-wrap items-center justify-between gap-3 text-black">
								<div className="text-sm text-gray-700">
									{filtered.length} registro(s) • Página {page} de {totalPages}
								</div>

								<div
									className="flex items-center gap-2"
									role="navigation"
									aria-label="Paginação"
								>
									<button
										className="flex text-sm items-center justify-center rounded-xl border border-gray-200 bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110 disabled:opacity-40"
										onClick={() => setPage(1)}
										disabled={page === 1}
										aria-label="Primeira página"
									>
										◀◀
									</button>
									<button
										className="flex text-sm items-center justify-center rounded-xl border border-gray-200 bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110 disabled:opacity-40"
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										disabled={page === 1}
										aria-label="Página anterior"
									>
										◀
									</button>
									<button
										className="flex text-sm items-center justify-center rounded-xl border border-gray-200 bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110 disabled:opacity-40"
										onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
										disabled={page === totalPages}
										aria-label="Próxima página"
									>
										▶
									</button>
									<button
										className="flex text-sm items-center justify-center rounded-xl border border-gray-200 bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110 disabled:opacity-40"
										onClick={() => setPage(totalPages)}
										disabled={page === totalPages}
										aria-label="Última página"
									>
										▶▶
									</button>
								</div>
							</div>

							<div className="flex justify-end">
								<button
									type="button"
									onClick={handleAtualizar}
									disabled={
										isSubmitting ||
										!versaoNova.trim() ||
										selectedIds.length === 0
									}
									className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isSubmitting ? "Enviando..." : "Atualizar clientes selecionados"}
								</button>
							</div>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}

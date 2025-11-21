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

export default function ClientesVersaoPage() {
	/* estados */
	const [rows, setRows] = useState<LinhaClienteVersao[]>([]);
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);

	const [sortKey, setSortKey] = useState<SortKey | null>(null);
	const [sortDir, setSortDir] = useState<SortDir>(null);

	const [openSidebar, setOpenSidebar] = useState(false);

	/* carregar dados */
	async function loadRows() {
		try {
			const resp = await fetch("/api/clientes-versao", {
				cache: "no-store",
			});
			if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

			const json = await resp.json();
			console.log("Resposta /api/clientes-versao:", json);

			// API retorna: { ok: true, data: [...] }
			if (json?.ok && Array.isArray(json.data)) {
				setRows(json.data as LinhaClienteVersao[]);
			} else if (Array.isArray(json)) {
				// fallback, caso algum dia a API volte a devolver array puro
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

	/* componente lista mobile */
	const MobileList = () => (
		<ul className="sm:hidden space-y-3">
			{pageData.map((r) => (
				<li
					key={`${r.id}-${r.nome_sistema}`}
					className="rounded-xl border bg-white p-4 shadow text-gray-800"
				>
					<div className="text-xs text-gray-500 mb-1">Código {r.id}</div>
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
				</li>
			))}
		</ul>
	);

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="flex">
				{/* sidebar desktop reutilizável */}
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

								{/* ativo */}
								<a
									href="/clientes-versao"
									className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold bg-blue-50 border border-blue-200 text-gray-900"
								>
									<span>Clientes por Versão</span>
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
							Clientes por Versão
						</div>
					</div>

					<main className="p-4 md:p-6 mx-auto max-w-7xl">
						{/* busca */}
						<div className="mb-4">
							<input
								type="text"
								placeholder="Pesquisa rápida"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								className="rounded-xl w-full sm:w-72 border border-gray-300 px-3 py-2 shadow bg-white text-gray-700"
							/>
						</div>

						{/* lista mobile */}
						<MobileList />

						{/* tabela desktop */}
						<div className="hidden sm:block rounded-xl bg-white shadow overflow-hidden">
							<table className="min-w-full text-sm border-separate border-spacing-0">
								<thead>
									<tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-center">
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
												colSpan={5}
											>
												Nenhum registro encontrado.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>

						{/* paginação */}
						<div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-black">
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
					</main>
				</div>
			</div>
		</div>
	);
}

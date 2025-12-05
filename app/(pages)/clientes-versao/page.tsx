"use client";

import { useState, useMemo, useEffect } from "react";
import Sidebar from "@/app/components/Sidebar";
import { backendFetch } from "@/lib/backend";

/* ---- tipos ---- */
type LinhaClienteVersao = {
	id: number;
	nome_cliente: string;
	nome_sistema: string;
	versao_atual: string | null;
	versao_anterior: string | null;
};

/* ---- ordenação ---- */
type SortKey =
	| "id"
	| "nome_cliente"
	| "nome_sistema"
	| "versao_atual"
	| "versao_anterior";
type SortDir = "asc" | "desc" | null;

/* ========= mapeamento da API ========= */
/* Mesma ideia do atualizar-clientes, mas trazendo só o que precisamos aqui */
function mapRowFromApi(row: any): LinhaClienteVersao {
	const versaoAtual =
		row.versaoAtual ??
		row.versao_atual ??
		row.versaoSistemaAtual ??
		row.versao_sistema_atual ??
		row.versao ??
		null;

	const versaoAnterior =
		row.versaoAnterior ??
		row.versao_anterior ??
		row.versaoSistemaAnterior ??
		row.versao_sistema_anterior ??
		row.versaoOld ??
		row.versao_antiga ??
		null;

	return {
		id: Number(row.codigo ?? row.idCliente ?? row.id ?? 0),
		nome_cliente:
			row.razaoSocial ??
			row.nome ??
			row.nomeCliente ??
			row.cliente ??
			"",
		nome_sistema: row.sistema ?? row.nomeSistema ?? row.nome_sistema ?? "",
		versao_atual: versaoAtual,
		versao_anterior: versaoAnterior,
	};
}

export default function ClientesVersaoPage() {
	/* estados */
	const [rows, setRows] = useState<LinhaClienteVersao[]>([]);
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);

	const [sortKey, setSortKey] = useState<SortKey | null>(null);
	const [sortDir, setSortDir] = useState<SortDir>(null);
	const [isLoading, setIsLoading] = useState(false);

	/* carregar dados do backend AWS */
	async function loadRows() {
		try {
			setIsLoading(true);

			const data = await backendFetch("/autenticacao/listaclientes", {
				method: "GET",
			});

			console.log("Resposta /autenticacao/listaclientes (ClientesVersao):", data);

			let lista: any[] = [];
			const anyData: any = data;

			// tenta encontrar o array certo, igual fizemos no atualizar-clientes
			if (Array.isArray(anyData?.listaclientes)) {
				lista = anyData.listaclientes;
			} else if (Array.isArray(anyData?.listacliente)) {
				lista = anyData.listacliente;
			} else if (Array.isArray(anyData)) {
				lista = anyData;
			} else if (anyData && typeof anyData === "object") {
				const d: any = anyData;
				if (Array.isArray(d.data)) lista = d.data;
				else if (Array.isArray(d.items)) lista = d.items;
				else if (Array.isArray(d.result)) lista = d.result;
				else if (Array.isArray(d.clientes)) lista = d.clientes;
				else if (Array.isArray(d.lista)) lista = d.lista;
				else if (Array.isArray(d.value)) lista = d.value;
				else if (Array.isArray(d.$values)) lista = d.$values;
				else {
					const values = Object.values(d);
					if (values.length === 1 && Array.isArray(values[0])) {
						lista = values[0] as any[];
					}
				}
			}

			const mapped = lista.map((row) => mapRowFromApi(row));
			setRows(mapped);
		} catch (e) {
			console.error("Erro ao carregar Clientes por Versão:", e);
			alert("Erro ao carregar Clientes por Versão.");
			setRows([]);
		} finally {
			setIsLoading(false);
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
			{isLoading ? (
				<li className="rounded-xl border bg-white p-8 text-center text-gray-500">
					Carregando...
				</li>
			) : pageData.length === 0 ? (
				<li className="rounded-xl border bg-white p-8 text-center text-gray-500">
					Nenhum registro encontrado.
				</li>
			) : (
				pageData.map((r) => (
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
				))
			)}
		</ul>
	);

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="flex">
				{/* sidebar reutilizável (desktop + mobile) */}
				<Sidebar active="clientes-versao" />

				{/* área principal */}
				<div className="flex-1">
					{/* topo mobile apenas com título */}
					<div className="sticky top-0 z-20 sm:hidden bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 border-b flex items-center justify-center">
						<div className="font-semibold text-white">Clientes por Versão</div>
					</div>

					<main className="p-4 md:p-6 mx-auto max-w-7xl">
						{/* busca */}
						<div className="mb-4">
							<input
								type="text"
								placeholder="Digite para filtrar..."
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								className="rounded-xl w-full sm:w-72 border border-gray-300 px-3 py-2 shadow bg-white text-gray-700 placeholder:text-gray-500"
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
											className="px-3 py-3 cursor-pointer w-24 text-left"
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
											className="px-3 py-3 cursor-pointer text-left"
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
											className="px-3 py-3 cursor-pointer text-left"
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
											className="px-3 py-3 cursor-pointer text-left"
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
											className="px-3 py-3 cursor-pointer text-left"
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
								<tbody className="text-gray-900 text-left">
									{isLoading ? (
										<tr>
											<td
												colSpan={5}
												className="px-3 py-8 text-left text-gray-500"
											>
												Carregando...
											</td>
										</tr>
									) : pageData.length === 0 ? (
										<tr>
											<td
												className="px-3 py-8 text-left text-gray-500"
												colSpan={5}
											>
												Nenhum registro encontrado.
											</td>
										</tr>
									) : (
										pageData.map((r, idx) => (
											<tr
												key={`${r.id}-${r.nome_sistema}`}
												className={
													idx % 2 === 0 ? "bg-white" : "bg-gray-100"
												}
											>
												<td className="px-3 py-3 tabular-nums text-left">
													{r.id}
												</td>
												<td className="px-3 py-3 text-left">
													{r.nome_cliente}
												</td>
												<td className="px-3 py-3 text-left">
													{r.nome_sistema}
												</td>
												<td className="px-3 py-3 text-left">
													{r.versao_atual ?? "—"}
												</td>
												<td className="px-3 py-3 text-left">
													{r.versao_anterior ?? "—"}
												</td>
											</tr>
										))
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
									onClick={() =>
										setPage((p) => Math.min(totalPages, p + 1))
									}
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

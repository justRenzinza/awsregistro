"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import { backendFetch } from "@/lib/backend";

/* ========= tipos ========= */

type SistemaOption = {
	id: number;
	nome: string;
};

type ClienteVersaoRow = {
	idCliente: number;
	idSistema: number;
	codigo: number;
	cliente: string;
	sistema: string;
	versaoAtual: string | null;
	versaoAnterior: string | null;

	cnpj: string;
	dataRegistro: string;
	nomeContato: string;
	telefone: string;
	email: string;
	quantidadeLicenca?: number;
	quantidadeDiaLiberacao?: number;
	idStatus?: number;
	status?: string | null;
};

/* ========= helpers ========= */

function formatBRDateFromISO(d: string | null | undefined) {
	if (!d) return "";
	const iso = d.split("T")[0];
	const [yyyy, mm, dd] = iso.split("-");
	if (!yyyy || !mm || !dd) return d;
	return `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yyyy}`;
}

function toISOFromInputDate(d: string | null | undefined) {
	if (!d) return new Date().toISOString().slice(0, 10);
	return d.split("T")[0];
}

/* ========= mapeamento da API ========= */
function mapRowFromApi(row: any): ClienteVersaoRow {
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
		idCliente: Number(row.idCliente ?? row.id ?? row.codigo ?? 0),
		idSistema: Number(row.idSistema ?? row.id_sistema ?? 0),
		codigo: Number(row.codigo ?? row.idCliente ?? row.id ?? 0),
		cliente:
			row.razaoSocial ??
			row.nome ??
			row.nomeCliente ??
			row.cliente ??
			"",
		sistema: row.sistema ?? row.nomeSistema ?? row.nome_sistema ?? "",
		versaoAtual,
		versaoAnterior,
		cnpj: row.cnpj ?? row.cnpjCpf ?? row.cnpj_cpf ?? "",
		dataRegistro: formatBRDateFromISO(
			row.dataRegistro ?? row.data_registro ?? row.datCadastro ?? row.data
		),
		nomeContato: row.nomeContato ?? row.contato ?? row.responsavel ?? "",
		telefone: row.telefone ?? row.telefoneContato ?? row.celular ?? "",
		email: row.email ?? row.emailContato ?? "",
		quantidadeLicenca: row.quantidadeLicenca ?? row.qtdLicenca ?? 0,
		quantidadeDiaLiberacao:
			row.quantidadeDiaLiberacao ?? row.qtdDiaLiberacao ?? 0,
		idStatus: row.idStatus ?? row.id_status ?? 1,
		status: row.status ?? row.descricaoStatus ?? "",
	};
}

/* ========= opções de sistema ========= */
/* Corrigido: 2 = SACEX, 1 = SAGRAM */
const sistemasMock: SistemaOption[] = [
	{ id: 2, nome: "SACEX" },
	{ id: 1, nome: "SAGRAM" },
];

/* ========= ordenação ========= */

type SortKey = keyof Pick<
	ClienteVersaoRow,
	"codigo" | "cliente" | "sistema" | "versaoAtual" | "versaoAnterior"
>;
type SortDir = "asc" | "desc" | null;

/* ========= componente ========= */

export default function AtualizarClientesPorVersaoPage() {
	const [query, setQuery] = useState("");
	const [rows, setRows] = useState<ClienteVersaoRow[]>([]);
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);
	const [sortKey, setSortKey] = useState<SortKey | null>(null);
	const [sortDir, setSortDir] = useState<SortDir>(null);

	const [sistemaSelecionado, setSistemaSelecionado] = useState<
		SistemaOption | undefined
	>(sistemasMock[0]); // default SACEX
	const [novaVersao, setNovaVersao] = useState("2025.1.15.30");
	const [dataVersao, setDataVersao] = useState(""); // yyyy-mm-dd

	// seleção por chave única "idCliente-idSistema"
	const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);

	/* ====== helpers de seleção ====== */

	function rowKey(r: ClienteVersaoRow) {
		return `${r.idCliente}-${r.idSistema}`;
	}

	function isSelected(r: ClienteVersaoRow) {
		return selectedKeys.includes(rowKey(r));
	}

	function toggleRowSelection(r: ClienteVersaoRow) {
		const key = rowKey(r);
		setSelectedKeys((prev) =>
			prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
		);
	}

	/* ====== carregar clientes ====== */
	async function loadRows() {
		if (!sistemaSelecionado) {
			setRows([]);
			return;
		}

		try {
			setIsLoading(true);

			const data = await backendFetch("/autenticacao/listaclientes", {
				method: "GET",
			});

			console.log(
				"Resposta bruta /autenticacao/listaclientes (para debug de versão):",
				data
			);

			let lista: any[] = [];

			const anyData: any = data;
			if (Array.isArray(anyData?.listaclientes)) {
				lista = anyData.listaclientes;
			} else if (Array.isArray(anyData?.listacliente)) {
				lista = anyData.listacliente;
			} else if (Array.isArray(data)) {
				lista = data;
			} else if (data && typeof data === "object") {
				const d: any = data;

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

			const mappedAll = lista.map((row) => mapRowFromApi(row));

			// filtra pelo idSistema (IDs corrigidos)
      // SACEX = 2, SAGRAM = 1
			const somenteDoSistema = mappedAll.filter(
				(r) => !sistemaSelecionado || r.idSistema === sistemaSelecionado.id
			);

			setRows(somenteDoSistema);
			setSelectedKeys([]);
			setPage(1);
		} catch (e) {
			console.error("Falha ao carregar clientes/versão:", e);
			alert("Não foi possível carregar os clientes para atualização.");
			setRows([]);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		loadRows();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sistemaSelecionado?.id]);

	/* ===== busca + ordenação ===== */
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		let data = rows.filter((r) =>
			[
				String(r.codigo),
				r.cliente,
				r.sistema,
				r.versaoAtual ?? "",
				r.versaoAnterior ?? "",
			]
				.join(" ")
				.toLowerCase()
				.includes(q)
		);

		if (sortKey && sortDir) {
			data = [...data].sort((a, b) => {
				let cmp: number;
				if (sortKey === "codigo") {
					cmp = (a.codigo ?? 0) - (b.codigo ?? 0);
				} else {
					const va = String(a[sortKey] ?? "").toLowerCase();
					const vb = String(b[sortKey] ?? "").toLowerCase();
					cmp = va < vb ? -1 : va > vb ? 1 : 0;
				}
				return sortDir === "asc" ? cmp : -cmp;
			});
		}

		return data;
	}, [rows, query, sortKey, sortDir]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
	const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

	useEffect(() => {
		setPage((p) => Math.min(p, totalPages));
	}, [totalPages]);

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

	/* ===== payloads ===== */

	// continua usando o PUT /autenticacao/cliente/{cnpj}/{idSistema}
	// só pra manter observacaoStatus / status etc.
	function buildClientePayload(
		row: ClienteVersaoRow,
		novaVersao: string,
		dataVersaoISO: string
	) {
		const hojeBR = new Date().toLocaleDateString("pt-BR");
		const dataRegistro = row.dataRegistro || hojeBR;

		return {
			nome: row.cliente,
			cnpj: row.cnpj.replace(/\D/g, ""),
			dataRegistro: dataRegistro,
			nomeContato: row.nomeContato ?? "",
			telefone: row.telefone ?? "",
			email: row.email ?? "",
			quantidadeLicenca: row.quantidadeLicenca ?? 0,
			quantidadeDiaLiberacao: row.quantidadeDiaLiberacao ?? 0,
			idStatus: row.idStatus ?? 1,
			status: row.status ?? "",
			idSistema: row.idSistema || (sistemaSelecionado?.id ?? 0),
			observacaoStatus: `Versão atualizada para ${novaVersao} em ${dataVersaoISO}`,
		};
	}

	// NOVO: payload específico da rota PUT /autenticacao/atualizaversao
	function buildAtualizaVersaoPayload(
		row: ClienteVersaoRow,
		novaVersao: string,
		dataVersaoISO: string
	) {
		return {
			cnpjCliente: row.cnpj.replace(/\D/g, ""),
			idSistema: String(row.idSistema || sistemaSelecionado?.id || 0),
			versaoAtual: novaVersao,
			versaoAnterior: row.versaoAtual ?? "",
			dataAtualizacao: dataVersaoISO,
			passoAtualizacao: 0,
		};
	}

	/* ===== atualização via PUT ===== */

	async function handleAtualizarClientesSelecionados() {
		if (!sistemaSelecionado) {
			alert("Selecione o sistema da versão.");
			return;
		}
		if (!novaVersao.trim()) {
			alert("Informe a versão a aplicar.");
			return;
		}
		if (selectedKeys.length === 0) {
			alert("Selecione pelo menos um cliente na tabela.");
			return;
		}

		const versao = novaVersao.trim();
		const dataVersaoISO = toISOFromInputDate(dataVersao);

		const confirmMsg = `Aplicar a versão ${versao} para ${selectedKeys.length} cliente(s)?`;
		if (!window.confirm(confirmMsg)) return;

		try {
			setIsUpdating(true);

			for (const key of selectedKeys) {
				const [idClienteStr, idSistemaStr] = key.split("-");
				const idCliente = Number(idClienteStr);
				const idSistema = Number(idSistemaStr);

				const row = rows.find(
					(r) => r.idCliente === idCliente && r.idSistema === idSistema
				);
				if (!row) continue;

				const cnpjDigits = row.cnpj.replace(/\D/g, "");
				const sistemaPathId = row.idSistema || sistemaSelecionado.id;

				// 1) PUT /autenticacao/cliente/{cnpj}/{idSistema}
				//    (mantém observacaoStatus e demais dados do cliente)
				const payloadCliente = buildClientePayload(
					row,
					versao,
					dataVersaoISO
				);

				const pathCliente = `/autenticacao/cliente/${cnpjDigits}/${sistemaPathId}`;

				console.log("Atualizando cliente (dados básicos):", {
					pathCliente,
					payloadCliente,
				});

				await backendFetch(pathCliente, {
					method: "PUT",
					body: JSON.stringify(payloadCliente),
				});

				// 2) PUT /autenticacao/atualizaversao
				//    (grava versaoAtual, versaoAnterior, dataAtualizacao)
				const payloadVersao = buildAtualizaVersaoPayload(
					row,
					versao,
					dataVersaoISO
				);

				console.log("Atualizando VERSÃO do cliente:", {
					url: "/autenticacao/atualizaversao",
					payloadVersao,
				});

				await backendFetch("/autenticacao/atualizaversao", {
					method: "PUT",
					body: JSON.stringify(payloadVersao),
				});
			}

			// Atualiza o estado local pra refletir as novas versões
			setRows((prev) =>
				prev.map((r) => {
					const key = rowKey(r);
					if (!selectedKeys.includes(key)) return r;

					const oldVersaoAtual = r.versaoAtual || "";
					return {
						...r,
						versaoAnterior: oldVersaoAtual,
						versaoAtual: versao,
					};
				})
			);
			setSelectedKeys([]);

			alert("Clientes atualizados com sucesso!");
		} catch (e) {
			console.error("Erro ao atualizar clientes por versão:", e);
			alert("Não foi possível atualizar os clientes. Verifique o log.");
		} finally {
			setIsUpdating(false);
		}
	}

	const resumoSistema = sistemaSelecionado?.nome ?? "—";
	const resumoData = dataVersao ? formatBRDateFromISO(dataVersao) : "—";

	/* ===== render ===== */

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="flex">
				<Sidebar active="atualizar-clientes" />

				<div className="flex-1">
					{/* topo mobile */}
					<div className="sticky top-0 z-20 sm:hidden bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 border-b flex items-center justify-center">
						<div className="font-semibold text-white">
							AWSRegistro | Atualizar Clientes por Versão
						</div>
					</div>

					<main className="mx-auto max-w-7xl p-4 md:p-6">
						<h1 className="text-lg md:text-xl font-semibold text-gray-800 mb-1">
							Atualizar Clientes por Versão
						</h1>
						<p className="text-sm text-gray-600 mb-4">
							Selecione o sistema, informe a versão e a data, depois
							escolha os clientes que receberão a atualização.
						</p>

						{/* filtros / cabeçalho */}
						<div className="bg-white rounded-xl shadow p-4 mb-4">
							<div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">
										Pesquisa rápida
									</label>
									<input
										type="text"
										placeholder="Digite para filtrar..."
										className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 placeholder:text-gray-500 shadow"
										value={query}
										onChange={(e) => {
											setQuery(e.target.value);
											setPage(1);
										}}
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">
										Sistema da versão
									</label>
									<select
										className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow"
										value={sistemaSelecionado?.id ?? ""}
										onChange={(e) => {
											const id = Number(e.target.value) || 0;
											const found = sistemasMock.find(
												(s) => s.id === id
											);
											setSistemaSelecionado(found);
										}}
									>
										<option value="">Selecione...</option>
										{sistemasMock.map((s) => (
											<option key={s.id} value={s.id}>
												{s.nome}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">
										Versão a aplicar
									</label>
									<input
										type="text"
										className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 placeholder:text-gray-500 shadow"
										value={novaVersao}
										onChange={(e) => setNovaVersao(e.target.value)}
										placeholder="Ex.: 2025.1.15.30"
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-gray-600 mb-1">
										Data da versão
									</label>
									<input
										type="date"
										className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow"
										value={dataVersao}
										onChange={(e) => setDataVersao(e.target.value)}
									/>
								</div>
							</div>

							<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
								<div>
									Sistema:{" "}
									<span className="font-medium text-gray-800">
										{resumoSistema}
									</span>{" "}
									• Versão:{" "}
									<span className="font-medium text-gray-800">
										{novaVersao || "—"}
									</span>{" "}
									• Data:{" "}
									<span className="font-medium text-gray-800">
										{resumoData}
									</span>
								</div>
							</div>
						</div>

						{/* tabela desktop */}
						<div className="hidden sm:block rounded-xl bg-white shadow overflow-hidden">
							<div className="w-full overflow-x-auto">
								<table className="min-w-full border-separate border-spacing-0 text-sm">
									<thead>
										<tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
											<th className="px-3 py-3 w-10 text-left whitespace-nowrap"></th>
											<th
												className="px-3 py-3 w-20 text-left whitespace-nowrap cursor-pointer"
												onClick={() => toggleSort("codigo")}
											>
												Código{" "}
												{sortKey === "codigo"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
											<th
												className="px-3 py-3 text-left whitespace-nowrap cursor-pointer"
												onClick={() => toggleSort("cliente")}
											>
												Cliente{" "}
												{sortKey === "cliente"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
											<th
												className="px-3 py-3 text-left whitespace-nowrap cursor-pointer"
												onClick={() => toggleSort("sistema")}
											>
												Sistema{" "}
												{sortKey === "sistema"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
											<th
												className="px-3 py-3 text-left whitespace-nowrap cursor-pointer"
												onClick={() => toggleSort("versaoAtual")}
											>
												Versão Atual{" "}
												{sortKey === "versaoAtual"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
											<th
												className="px-3 py-3 text-left whitespace-nowrap cursor-pointer"
												onClick={() =>
													toggleSort("versaoAnterior")
												}
											>
												Versão Anterior{" "}
												{sortKey === "versaoAnterior"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
										</tr>
									</thead>
									<tbody className="text-gray-900">
										{isLoading ? (
											<tr>
												<td
													colSpan={6}
													className="px-4 py-8 text-left text-gray-500"
												>
													Carregando...
												</td>
											</tr>
										) : pageData.length === 0 ? (
											<tr>
												<td
													colSpan={6}
													className="px-4 py-8 text-left text-gray-500"
												>
													Nenhum registro encontrado.
												</td>
											</tr>
										) : (
											pageData.map((r, idx) => {
												const selected = isSelected(r);
												return (
													<tr
														key={`${page}-${idx}`}
														className={`${
															selected
																? "bg-blue-50"
																: idx % 2 === 0
																? "bg-white"
																: "bg-gray-100"
														} hover:bg-blue-50 transition-colors`}
													>
														<td className="px-3 py-3 text-left">
															<input
																type="checkbox"
																checked={selected}
																onChange={() =>
																	toggleRowSelection(r)
																}
																aria-label={`Selecionar cliente ${r.cliente} - ${r.sistema}`}
															/>
														</td>
														<td className="px-3 py-3 whitespace-nowrap text-left tabular-nums">
															{r.codigo}
														</td>
														<td
															className="px-3 py-3 text-left max-w-[18rem] truncate"
															title={r.cliente}
														>
															{r.cliente}
														</td>
														<td className="px-3 py-3 text-left">
															{r.sistema}
														</td>
														<td className="px-3 py-3 text-left">
															{r.versaoAtual || "—"}
														</td>
														<td className="px-3 py-3 text-left">
															{r.versaoAnterior || "—"}
														</td>
													</tr>
												);
											})
										)}
									</tbody>
								</table>
							</div>
						</div>

						{/* versão mobile (cards) */}
						<div className="sm:hidden space-y-3">
							{isLoading ? (
								<div className="rounded-xl border bg-white p-6 text-center text-gray-500">
									Carregando...
								</div>
							) : pageData.length === 0 ? (
								<div className="rounded-xl border bg-white p-6 text-center text-gray-500">
									Nenhum registro encontrado.
								</div>
							) : (
								pageData.map((r, idx) => {
									const selected = isSelected(r);
									return (
										<div
											key={`${page}-${idx}`}
											onClick={() => toggleRowSelection(r)}
											className={`rounded-xl border bg-white p-4 shadow cursor-pointer ${
												selected ? "ring-2 ring-blue-400" : ""
											}`}
										>
											<div className="flex justify-between items-start gap-3">
												<div className="min-w-0 flex-1">
													<div className="text-xs text-gray-500">
														Código {r.codigo}
													</div>
													<div className="font-medium text-gray-900 break-words">
														{r.cliente}
													</div>
													<div className="text-xs text-gray-600 mt-1">
														Sistema: {r.sistema}
													</div>
												</div>
											</div>
											<div className="mt-2 text-xs text-gray-700 space-y-1">
												<div>
													<span className="text-gray-500">
														Versão atual:
													</span>{" "}
													{r.versaoAtual || "—"}
												</div>
												<div>
													<span className="text-gray-500">
														Versão anterior:
													</span>{" "}
													{r.versaoAnterior || "—"}
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>

						{/* footer / paginação + botão */}
						<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
							<div className="text-sm text-gray-700">
								{filtered.length} registro(s) • Página {page} de{" "}
								{totalPages} • {selectedKeys.length} linha(s){" "}
								selecionada(s)
							</div>

							<div className="flex items-center gap-2">
								<button
									className="flex text-sm items-center justify-center rounded-xl bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110 disabled:opacity-40"
									onClick={() => setPage(1)}
									disabled={page === 1}
									aria-label="Primeira página"
								>
									◀◀
								</button>
								<button
									className="flex text-sm items-center justify-center rounded-xl bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110 disabled:opacity-40"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
									aria-label="Página anterior"
								>
									◀
								</button>
								<button
									className="flex text-sm items-center justify-center rounded-xl bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110 disabled:opacity-40"
									onClick={() =>
										setPage((p) => Math.min(totalPages, p + 1))
									}
									disabled={page === totalPages}
									aria-label="Próxima página"
								>
									▶
								</button>
								<button
									className="flex text-sm items-center justify-center rounded-xl bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110 disabled:opacity-40"
									onClick={() => setPage(totalPages)}
									disabled={page === totalPages}
									aria-label="Última página"
								>
									▶▶
								</button>

								<button
									type="button"
									onClick={handleAtualizarClientesSelecionados}
									disabled={
										isUpdating ||
										selectedKeys.length === 0 ||
										!sistemaSelecionado ||
										!novaVersao.trim()
									}
									className="ml-2 inline-flex items-center justify-center rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isUpdating
										? "Atualizando..."
										: "Atualizar clientes selecionados"}
								</button>
							</div>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}

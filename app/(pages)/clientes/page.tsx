"use client";

import { useMemo, useState, useEffect } from "react";
import { toCSV, downloadCSV } from "../../helpers/export";
import Sidebar from "@/app/components/Sidebar";
import { backendFetch } from "@/lib/backend";

/* ========= configuração do sistema ========= */
const SISTEMA_ID = 2;

/* ========= tipos ========= */
export type Cliente = {
	id: number;
	codigo: number;
	razaoSocial: string;
	cnpj: string;
	dataRegistro: string; // dd/mm/yyyy
	contato: string;
	telefone: string;
	email: string;
	// status / contrato
	idStatus?: number; // 1=Regular, 2=Irregular(S/Restrição), 3=Cancelado (soft delete), 4=Com Restrição
	status?: string | null;
};

/* ========= helpers visuais ========= */
function formatCNPJ(v: string) {
	const s = (v || "").replace(/\D/g, "").slice(0, 14);
	return s
		.replace(/^(\d{2})(\d)/, "$1.$2")
		.replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
		.replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1/$2")
		.replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d{1,2}).*$/, "$1-$2");
}

function formatPhone(v: string) {
	const s = (v || "").replace(/\D/g, "").slice(0, 11);
	if (s.length <= 10) {
		return s
			.replace(/^(\d{2})(\d)/, "($1) $2")
			.replace(/(\d{4})(\d{4})$/, "$1-$2");
	}
	return s
		.replace(/^(\d{2})(\d)/, "($1) $2")
		.replace(/(\d{5})(\d{4})$/, "$1-$2");
}

/* ========= validações ========= */
function isValidEmail(email: string) {
	const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
	return re.test((email || "").trim());
}

function isValidCNPJ(cnpjRaw: string) {
	const cnpj = (cnpjRaw || "").replace(/\D/g, "");
	if (cnpj.length !== 14) return false;
	if (/^(\d)\1{13}$/.test(cnpj)) return false;

	const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	const arr = cnpj.split("").map((n) => parseInt(n, 10));

	const soma1 = arr
		.slice(0, 12)
		.reduce((acc, n, i) => acc + n * pesos1[i], 0);
	const d1 = 11 - (soma1 % 11);
	const dv1 = d1 >= 10 ? 0 : d1;

	const soma2 = [...arr.slice(0, 12), dv1].reduce(
		(acc, n, i) => acc + n * pesos2[i],
		0
	);
	const d2 = 11 - (soma2 % 11);
	const dv2 = d2 >= 10 ? 0 : d2;

	return cnpj.slice(-2) === `${dv1}${dv2}`;
}

/* ========= datas ========= */
function parseBRDate(d: string) {
	const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d || "");
	if (!m) return 0;
	const [_, dd, mm, yyyy] = m;
	return new Date(Number(yyyy), Number(mm) - 1, Number(dd)).getTime();
}

/** Converte "2024-10-21" ou "2024-10-21T00:00:00" em "21/10/2024" */
function formatBackendDate(d: string) {
	if (!d) return "";
	const iso = d.split("T")[0];
	const [yyyy, mm, dd] = iso.split("-");
	if (!yyyy || !mm || !dd) return d;
	return `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yyyy}`;
}

/* ========= mapeamento da API externa ========= */
function mapClienteFromApi(row: any): Cliente {
	return {
		id: Number(row.id ?? row.idCliente ?? row.codigo ?? 0),
		codigo: Number(row.codigo ?? row.id ?? row.idCliente ?? 0),
		razaoSocial:
			row.razaoSocial ??
			row.razao_social ??
			row.nome ?? // alguns backends usam "nome"
			row.nomeCliente ??
			"",
		cnpj: row.cnpj ?? row.cnpjCpf ?? row.cnpj_cpf ?? "",
		dataRegistro: formatBackendDate(
			row.dataRegistro ??
				row.data_registro ??
				row.datCadastro ??
				row.data ??
				""
		),
		contato: row.contato ?? row.nomeContato ?? row.responsavel ?? "",
		telefone: row.telefone ?? row.telefoneContato ?? row.celular ?? "",
		email: row.email ?? row.emailContato ?? "",
		idStatus:
			row.idStatus ??
			row.id_status ??
			(row.status === "Irregular (Contrato Cancelado)" ? 3 : undefined),
		status: row.status ?? row.descricaoStatus ?? null,
	};
}

/* ========= componente ========= */
type SortKey = keyof Pick<
	Cliente,
	| "codigo"
	| "razaoSocial"
	| "cnpj"
	| "dataRegistro"
	| "contato"
	| "telefone"
	| "email"
>;
type SortDir = "asc" | "desc" | null;

export default function ClientesPage() {
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);
	const [sortKey, setSortKey] = useState<SortKey | null>(null);
	const [sortDir, setSortDir] = useState<SortDir>(null);
	const [rows, setRows] = useState<Cliente[]>([]);

	const [editingId, setEditingId] = useState<number | null>(null); // 0 = novo
	const [editForm, setEditForm] = useState<Partial<Cliente>>({});
	const [errors, setErrors] = useState<{
		cnpj?: string;
		email?: string;
		razaoSocial?: string;
	}>({});
	const [originalCnpj, setOriginalCnpj] = useState<string | null>(null);

	/* ====== carregar dados do backend (nova rota listaclientes) ====== */
	async function loadRows() {
		try {
			const data = await backendFetch("/autenticacao/listaclientes", {
				method: "GET",
			});

			console.log(
				"Resposta bruta da API /autenticacao/listaclientes:",
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

			if (!Array.isArray(lista)) {
				console.warn(
					"Não foi possível identificar a lista de clientes na resposta:",
					data
				);
				setRows([]);
				return;
			}

			const mapped: Cliente[] = lista.map(mapClienteFromApi);

			const uniqueMap = new Map<string, Cliente>();
			for (const c of mapped) {
				const cnpjDigits = (c.cnpj || "").replace(/\D/g, "");
				const key = String(
					c.id || c.codigo || cnpjDigits || c.razaoSocial.toLowerCase()
				);
				if (!uniqueMap.has(key)) {
					uniqueMap.set(key, c);
				}
			}
			let unique = Array.from(uniqueMap.values());

			// remove do front clientes com contrato cancelado (idStatus = 3)
			unique = unique.filter(
				(c) =>
					c.idStatus !== 3 &&
					!String(c.status || "")
						.toLowerCase()
						.includes("cancelado")
			);

			setRows(unique);
		} catch (e) {
			console.error("Falha ao buscar clientes no backend:", e);
			alert("Não foi possível carregar os clientes do servidor.");
		}
	}

	useEffect(() => {
		loadRows();
	}, []);

	/* ===== busca + ordenação ===== */
	const filtered = useMemo<Cliente[]>(() => {
		const q = query.trim().toLowerCase();
		let data = rows.filter((r) =>
			[
				String(r.codigo),
				r.razaoSocial,
				r.cnpj,
				r.dataRegistro,
				r.contato,
				r.telefone,
				r.email,
			]
				.join(" ")
				.toLowerCase()
				.includes(q)
		);

		if (sortKey && sortDir) {
			data = [...data].sort((a, b) => {
				let cmp = 0;
				if (sortKey === "codigo") {
					cmp = (a.codigo ?? 0) - (b.codigo ?? 0);
				} else if (sortKey === "dataRegistro") {
					cmp =
						parseBRDate(a.dataRegistro ?? "") -
						parseBRDate(b.dataRegistro ?? "");
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

	useEffect(() => {
		if (editingId !== null) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [editingId]);

	/* ===== ações ===== */
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

	async function handleDelete(id: number) {
		const cliente = rows.find((r) => r.id === id);
		if (!cliente) return;

		const ok = window.confirm(
			`Você deseja realmente cancelar o contrato do cliente "${cliente.razaoSocial}"?`
		);
		if (!ok) return;

		const cnpjDigits = (cliente.cnpj || "").replace(/\D/g, "");
		const hojeISO = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
		const hojeBR = new Date().toLocaleDateString("pt-BR");

		// payload conforme Swagger, focando na mudança de status (soft delete)
		const payload = {
			// campos principais
			nome: cliente.razaoSocial,
			cnpj: cnpjDigits,
			dataRegistro: cliente.dataRegistro || hojeBR,
			nomeContato: cliente.contato ?? "",
			telefone: cliente.telefone ?? "",
			email: cliente.email ?? "",
			// se o backend usar esses campos, mantemos valores neutros
			quantidadeLicenca: 0,
			quantidadeDiaLiberacao: 0,
			// status / controle
			idStatus: 3,
			status: "Irregular (Contrato Cancelado)",
			idSistema: SISTEMA_ID,
			observacaoStatus: `Cancelado via AWSRegistro em ${hojeBR}`,
			versaoAnterior: "",
			versaoAtual: "",
			dataAtualizacao: hojeISO,
			passoAtualizacao: 0,
		};

		try {
			await backendFetch(
				`/autenticacao/cliente/${cnpjDigits}/${SISTEMA_ID}`,
				{
					method: "PUT",
					body: JSON.stringify(payload),
				}
			);

			// recarrega lista já sem o cliente cancelado
			await loadRows();
		} catch (e) {
			console.error("Falha ao cancelar cliente no backend:", e);
			alert("Não foi possível cancelar o contrato do cliente.");
		}
	}

	function handleEditOpen(id: number) {
		const c = rows.find((r) => r.id === id);
		if (!c) return;
		setEditingId(id);

		setOriginalCnpj(c.cnpj?.replace(/\D/g, "") || null);

		setEditForm({ ...c, cnpj: c.cnpj?.replace(/\D/g, "") });
		setErrors({});
	}

	function handleEditCancel() {
		setEditingId(null);
		setEditForm({});
		setErrors({});
		setOriginalCnpj(null);
	}

	async function handleEditSave() {
		if (editingId === null) return;

		const errs: {
			cnpj?: string;
			email?: string;
			razaoSocial?: string;
		} = {};

		const email = (editForm.email ?? "").trim();
		const cnpjDigits = (editForm.cnpj ?? "").toString().replace(/\D/g, "");
		const razaoSocial = (editForm.razaoSocial ?? "").trim();

		if (!razaoSocial) errs.razaoSocial = "Razão social é obrigatória.";
		if (!email) errs.email = "Email é obrigatório.";
		else if (!isValidEmail(email)) errs.email = "Email inválido.";
		if (!cnpjDigits) errs.cnpj = "CNPJ é obrigatório.";
		else if (!isValidCNPJ(cnpjDigits)) errs.cnpj = "CNPJ inválido.";

		if (errs.email || errs.cnpj || errs.razaoSocial) {
			setErrors(errs);
			return;
		}

		// payload no padrão do Swagger: nome, nomeContato etc
		const payloadBase = {
			// nomes "oficiais"
			nome: razaoSocial,
			nomeContato: editForm.contato ?? "",
			// nomes usados em outros lugares da API (garante compatibilidade)
			razaoSocial: razaoSocial,
			contato: editForm.contato ?? "",
			// campos básicos
			cnpj: cnpjDigits,
			dataRegistro:
				editForm.dataRegistro ?? new Date().toLocaleDateString("pt-BR"),
			telefone: editForm.telefone ?? "",
			email: email,
			// se o backend usar isso no body, já está aqui também
			idSistema: SISTEMA_ID,
		};

		try {
			if (editingId === 0) {
				// novo cliente
				await backendFetch("/autenticacao/cliente", {
					method: "POST",
					body: JSON.stringify({
						...payloadBase,
					}),
				});
			} else {
				// alteração de cliente existente
				// IdCliente na URL = CNPJ ANTIGO
				const pathCnpj = originalCnpj || cnpjDigits;

				await backendFetch(
					`/autenticacao/cliente/${pathCnpj}/${SISTEMA_ID}`,
					{
						method: "PUT",
						body: JSON.stringify({
							...payloadBase,
						}),
					}
				);
			}

			setEditingId(null);
			setEditForm({});
			setErrors({});
			setOriginalCnpj(null);
			await loadRows();
		} catch (e) {
			console.error("Falha ao salvar cliente no backend:", e);
			alert("Não foi possível salvar o cliente.");
		}
	}

	function handleAdd() {
		setEditingId(0);
		setOriginalCnpj(null);
		setEditForm({
			codigo: rows.length ? Math.max(...rows.map((r) => r.codigo)) + 1 : 1,
			razaoSocial: "",
			cnpj: "",
			dataRegistro: new Date().toLocaleDateString("pt-BR"),
			contato: "",
			telefone: "",
			email: "",
		});
		setErrors({});
	}

	function handleExport() {
		const csv = toCSV(filtered);
		const nome = `clientes_${new Date().toISOString().slice(0, 10)}.csv`;
		downloadCSV(csv, nome);
	}

	/* ====== LISTA MOBILE ====== */
	const MobileList = () => (
		<ul className="sm:hidden space-y-3">
			{pageData.map((r, idx) => (
				<li
					key={`${page}-${idx}`}
					className="rounded-xl border bg-white p-4 shadow"
				>
					<div className="flex items-start gap-3">
						<div className="min-w-0 flex-1">
							<div className="text-sm text-gray-500">Código {r.codigo}</div>
							<div className="font-medium text-gray-900 break-words">
								{r.razaoSocial}
							</div>
						</div>

						<div className="flex items-start gap-1">
							<button
								onClick={() => handleEditOpen(r.id)}
								className="inline-flex items-center justify-center rounded-xl bg-yellow-400 w-7 h-7 text-white font-semibold hover:bg-yellow-500 transition-transform transform hover:scale-110"
								aria-label={`Editar ${r.razaoSocial}`}
								title="Editar"
							>
								✎
							</button>
							<button
								onClick={() => handleDelete(r.id)}
								className="inline-flex items-center justify-center rounded-xl bg-red-500 w-7 h-7 text-white font-semibold hover:bg-red-600 transition-transform transform hover:scale-110"
								aria-label={`Excluir ${r.razaoSocial}`}
								title="Excluir"
							>
								✖
							</button>
						</div>
					</div>

					<div className="mt-2 grid grid-cols-1 gap-1 text-sm text-gray-700">
						<div>
							<span className="text-gray-500">CNPJ:</span>{" "}
							{formatCNPJ(r.cnpj)}
						</div>
						<div>
							<span className="text-gray-500">Data:</span> {r.dataRegistro}
						</div>
						<div>
							<span className="text-gray-500">Contato:</span> {r.contato}
						</div>
						<div>
							<span className="text-gray-500">Telefone:</span>{" "}
							{formatPhone(r.telefone)}
						</div>
						<div className="break-all">
							<span className="text-gray-500">Email:</span>{" "}
							{isValidEmail(r.email) ? (
								<a
									href={`mailto:${r.email}`}
									className="underline underline-offset-2"
								>
									{r.email}
								</a>
							) : (
								<span className="text-gray-400">—</span>
							)}
						</div>
					</div>
				</li>
			))}
			{pageData.length === 0 && (
				<li className="rounded-xl border bg-white p-8 text-center text-gray-500">
					Nenhum registro encontrado.
				</li>
			)}
		</ul>
	);

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="flex">
				<Sidebar active="clientes" />

				<div className="flex-1">
					<div className="sticky top-0 z-20 sm:hidden bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 border-b flex items-center justify-center">
						<div className="font-semibold text-white">
							Clientes
						</div>
					</div>

					<main className="mx-auto max-w-7xl p-4 md:p-6">
						<div className="mb-4 space-y-2">
							{/* mobile */}
							<div className="flex flex-wrap items-center gap-2 sm:hidden w-full">
								<input
									type="text"
									placeholder="Pesquisa rápida"
									value={query}
									onChange={(e) => {
										setQuery(e.target.value);
										setPage(1);
									}}
									className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 placeholder:text-gray-500 text-md shadow"
								/>
								<button
									onClick={handleAdd}
									className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white text-gray-700 shadow transform transition-transform hover:scale-105"
									title="Adicionar"
									aria-label="Adicionar"
								>
									➕
								</button>
								<button
									onClick={handleExport}
									className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white text-blue-600 shadow transform transition-transform hover:scale-105"
									title="Exportar CSV"
									aria-label="Exportar CSV"
								>
									⬇️
								</button>
							</div>

							{/* desktop */}
							<div className="hidden sm:flex sm:items-center sm:justify-between">
								<div className="flex w-full items-center gap-2">
									<input
										type="text"
										placeholder="Pesquisa rápida"
										value={query}
										onChange={(e) => {
											setQuery(e.target.value);
											setPage(1);
										}}
										className="w-full sm:w-72 rounded-xl border border-gray-200 placeholder:text-gray-500 bg-white px-3 py-2 text-md text-gray-600 shadow"
									/>
									<button
										onClick={handleAdd}
										className="rounded-xl px-3 py-2 bg-white text-sm font-medium text-gray-600 shadow transform transition-transform hover:scale-105"
										title="Adicionar"
										aria-label="Adicionar"
									>
										➕ Adicionar
									</button>
									<button
										onClick={handleExport}
										className="rounded-xl px-3 py-2 bg-white text-sm font-medium text-gray-600 shadow transform transition-transform hover:scale-105"
										title="Exportar"
										aria-label="Exportar"
									>
										⬇️ Exportar
									</button>
								</div>
							</div>
						</div>

						<MobileList />

						<div className="hidden sm:block rounded-xl bg-white shadow overflow-hidden">
							<div className="w-full overflow-x-auto">
								<table className="min-w-full border-separate border-spacing-0 text-sm">
									<thead>
										<tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
											<th className="px-3 py-3 w-28 text-left whitespace-nowrap">
												Ações
											</th>
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
												onClick={() => toggleSort("razaoSocial")}
											>
												Razão Social{" "}
												{sortKey === "razaoSocial"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
											<th
												className="px-3 py-3 text-left whitespace-nowrap cursor-pointer"
												onClick={() => toggleSort("cnpj")}
											>
												CNPJ{" "}
												{sortKey === "cnpj"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
											<th
												className="px-3 py-3 text-left whitespace-nowrap cursor-pointer"
												onClick={() => toggleSort("dataRegistro")}
											>
												Data Registro{" "}
												{sortKey === "dataRegistro"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
											<th
												className="px-3 py-3 text-left whitespace-nowrap cursor-pointer"
												onClick={() => toggleSort("contato")}
											>
												Contato{" "}
												{sortKey === "contato"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
											<th
												className="px-3 py-3 text-left whitespace-nowrap cursor-pointer"
												onClick={() => toggleSort("telefone")}
											>
												Telefone{" "}
												{sortKey === "telefone"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
											<th
												className="px-3 py-3 text-left whitespace-nowrap cursor-pointer"
												onClick={() => toggleSort("email")}
											>
												Email{" "}
												{sortKey === "email"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
										</tr>
									</thead>

									<tbody className="text-gray-900">
										{pageData.map((r, idx) => (
											<tr
												key={`${page}-${idx}`}
												className={idx % 2 === 0 ? "bg-white" : "bg-gray-100"}
											>
												<td className="px-3 py-3">
													<div className="flex items-center justify-center gap-2">
														<button
															onClick={() => handleEditOpen(r.id)}
															className="rounded-xl bg-yellow-400 text-white font-semibold w-7 h-7 hover:bg-yellow-500 transition-transform transform hover:scale-110"
															title="Editar"
															aria-label={`Editar ${r.razaoSocial}`}
														>
															✎
														</button>
														<button
															onClick={() => handleDelete(r.id)}
															className="rounded-xl bg-red-400 text-white font-semibold w-7 h-7 hover:bg-red-600 transition-transform transform hover:scale-110"
															title="Excluir"
															aria-label={`Excluir ${r.razaoSocial}`}
														>
															✖
														</button>
													</div>
												</td>

												<td className="px-3 py-3 whitespace-nowrap text-left tabular-nums">
													{r.codigo}
												</td>

												<td
													className="px-3 py-3 text-left max-w-[18rem] truncate"
													title={r.razaoSocial}
												>
													{r.razaoSocial}
												</td>

												<td className="px-3 py-3 whitespace-nowrap text-left">
													{formatCNPJ(r.cnpj)}
												</td>
												<td className="px-3 py-3 whitespace-nowrap text-left">
													{r.dataRegistro}
												</td>
												<td className="px-3 py-3 whitespace-nowrap text-left">
													{r.contato}
												</td>
												<td className="px-3 py-3 whitespace-nowrap text-left">
													{formatPhone(r.telefone)}
												</td>
												<td className="px-3 py-3 whitespace-nowrap text-left">
													{isValidEmail(r.email) ? (
														<a
															href={`mailto:${r.email}`}
															className="underline-offset-2 hover:underline"
														>
															{r.email}
														</a>
													) : (
														<span className="text-gray-400">—</span>
													)}
												</td>
											</tr>
										))}

										{pageData.length === 0 && (
											<tr>
												<td
													className="px-3 py-8 text-center text-gray-500"
													colSpan={8}
												>
													Nenhum registro encontrado.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>

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
							</div>
						</div>
					</main>
				</div>
			</div>

			{editingId !== null && (
				<div
					className="fixed inset-0 z-50"
					role="dialog"
					aria-modal="true"
					aria-label={editingId === 0 ? "Adicionar Cliente" : "Editar Cliente"}
				>
					<div className="absolute inset-0 bg-black/50" />
					<div className="absolute inset-0 flex items-stretch sm:items-center justify-center p-0 sm:p-3">
						<div className="h-full w-full sm:h-auto sm:w-full sm:max-w-2xl rounded-none sm:rounded-xl bg-white shadow-lg overflow-y-auto">
							<h2 className="sticky top-0 z-10 px-6 py-4 text-xl font-semibold text-blue-700 bg-white border-b">
								{editingId === 0 ? "Adicionar Cliente" : "Editar Cliente"}
							</h2>

							<div className="p-6">
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<label className="text-sm">
										<span className="mb-1 block text-black">Código</span>
										<input
											type="number"
											value={String(editForm.codigo ?? "")}
											onChange={(e) =>
												setEditForm((prev) => ({
													...prev,
													codigo: Number(e.target.value),
												}))
											}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										/>
									</label>

									<label className="text-sm">
										<span className="mb-1 block text-black">Razão Social</span>
										<input
											type="text"
											value={editForm.razaoSocial ?? ""}
											onChange={(e) => {
												const v = e.target.value;
												setEditForm((prev) => ({
													...prev,
													razaoSocial: v,
												}));
												setErrors((prev) => ({
													...prev,
													razaoSocial: v.trim()
														? undefined
														: "Razão social é obrigatória.",
												}));
											}}
											className={`w-full rounded border px-3 py-2 text-sm ${
												errors.razaoSocial
													? "border-red-500"
													: "border-gray-300"
											} text-black`}
										/>
										{errors.razaoSocial && (
											<p className="mt-1 text-xs text-red-600">
												{errors.razaoSocial}
											</p>
										)}
									</label>

									<label className="text-sm">
										<span className="mb-1 block text-black">CNPJ</span>
										<input
											type="text"
											value={editForm.cnpj ?? ""}
											onChange={(e) => {
												const digits = e.target.value
													.replace(/\D/g, "")
													.slice(0, 14);
												setEditForm((prev) => ({ ...prev, cnpj: digits }));
												if (!digits)
													setErrors((prev) => ({
														...prev,
														cnpj: "CNPJ é obrigatório.",
													}));
												else if (!isValidCNPJ(digits))
													setErrors((prev) => ({
														...prev,
														cnpj: "CNPJ inválido.",
													}));
												else
													setErrors((prev) => ({
														...prev,
														cnpj: undefined,
													}));
											}}
											onBlur={() => {
												setEditForm((prev) => ({
													...prev,
													cnpj: formatCNPJ(String(prev.cnpj ?? "")),
												}));
											}}
											className={`w-full rounded border px-3 py-2 text-sm ${
												errors.cnpj ? "border-red-500" : "border-gray-300"
											} text-black`}
										/>
										{errors.cnpj && (
											<p className="mt-1 text-xs text-red-600">
												{errors.cnpj}
											</p>
										)}
									</label>

									<label className="text-sm">
										<span className="mb-1 block text-black">Data Registro</span>
										<input
											type="text"
											value={editForm.dataRegistro ?? ""}
											onChange={(e) =>
												setEditForm((prev) => ({
													...prev,
													dataRegistro: e.target.value,
												}))
											}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
											placeholder="dd/mm/aaaa"
										/>
									</label>

									<label className="text-sm">
										<span className="mb-1 block text-black">Contato</span>
										<input
											type="text"
											value={editForm.contato ?? ""}
											onChange={(e) =>
												setEditForm((prev) => ({
													...prev,
													contato: e.target.value,
												}))
											}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										/>
									</label>

									<label className="text-sm">
										<span className="mb-1 block text-black">Telefone</span>
										<input
											type="text"
											value={editForm.telefone ?? ""}
											onChange={(e) =>
												setEditForm((prev) => ({
													...prev,
													telefone: e.target.value,
												}))
											}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										/>
									</label>

									<label className="text-sm md:col-span-2">
										<span className="mb-1 block text-black">Email</span>
										<input
											type="email"
											value={editForm.email ?? ""}
											onChange={(e) => {
												const v = e.target.value;
												setEditForm((prev) => ({ ...prev, email: v }));
												if (!v)
													setErrors((prev) => ({
														...prev,
														email: "Email é obrigatório.",
													}));
												else if (!isValidEmail(v))
													setErrors((prev) => ({
														...prev,
														email: "Email inválido.",
													}));
												else
													setErrors((prev) => ({
														...prev,
														email: undefined,
													}));
											}}
											className={`w-full rounded border px-3 py-2 text-sm ${
												errors.email ? "border-red-500" : "border-gray-300"
											} text-black`}
										/>
										{errors.email && (
											<p className="mt-1 text-xs text-red-600">
												{errors.email}
											</p>
										)}
									</label>
								</div>

								<div className="mt-6 flex justify-end gap-2">
									<button
										onClick={handleEditCancel}
										className="rounded-xl bg-red-400 px-4 py-2 text-white hover:bg-red-500 transform transition-transform hover:scale-105"
									>
										Cancelar
									</button>
									<button
										onClick={handleEditSave}
										className="rounded-xl bg-green-500 px-4 py-2 text-white hover:bg-green-600 transform transition-transform hover:scale-105"
									>
										Salvar
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

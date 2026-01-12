"use client";

import { useMemo, useState, useEffect } from "react";
import { downloadCSV, toCSVControleSistema } from "../../helpers/export";
import Sidebar from "@/app/components/Sidebar";
import { backendFetch } from "@/lib/backend";

/* ------------ tipos básicos ----------- */
type ClienteBase = {
	id: number;
	nome: string;
	idStatus?: number;
	status?: string | null;
};

type Sistema = {
	id: number;
	nome: string;
};

type StatusContrato =
	| "Regular"
	| "Irregular (Sem Restrição)"
	| "Irregular (Contrato Cancelado)"
	| "Irregular (Com Restrição)";

type ControleSistema = {
	id: number;
	clienteId: number;
	idSistema: number;
	sistema: string;
	qtdLicenca: number;
	qtdDiaLiberacao: number;
	status: StatusContrato | string;
	idStatus?: number;
	qtdBanco?: number;
	qtdCnpj?: number;
	ipMblock?: string | null;
	portaMblock?: string | null;
	observacao?: string | null;
};

/* ===== helpers genéricos para parse de resposta ===== */

function normalizeList(data: any): any[] {
	if (!data) return [];
	if (Array.isArray(data)) return data;

	const d: any = data;

	if (Array.isArray(d.data)) return d.data;
	if (Array.isArray(d.items)) return d.items;
	if (Array.isArray(d.result)) return d.result;
	if (Array.isArray(d.lista)) return d.lista;
	if (Array.isArray(d.clientes)) return d.clientes;
	if (Array.isArray(d.sistemas)) return d.sistemas;
	if (Array.isArray(d.listaSistemas)) return d.listaSistemas;
	if (Array.isArray(d.listaclientes)) return d.listaclientes;
	if (Array.isArray(d.listacliente)) return d.listacliente;
	if (Array.isArray(d.value)) return d.value;
	if (Array.isArray(d.$values)) return d.$values;

	const values = Object.values(d);
	if (values.length === 1 && Array.isArray(values[0])) {
		return values[0] as any[];
	}

	return [];
}

function mapClienteFromApi(row: any): ClienteBase {
	const base = row?.cliente ?? row;

	const id = Number(
		base?.id ?? base?.idCliente ?? base?.codigo ?? row?.idCliente ?? 0
	);

	const nome =
		base?.nome ??
		base?.razaoSocial ??
		base?.razao_social ??
		base?.nomeCliente ??
		"";

	const idStatus =
		base?.idStatus ??
		base?.id_status ??
		(base?.status === "Irregular (Contrato Cancelado)" ? 3 : undefined);

	const status = base?.status ?? base?.descricaoStatus ?? null;

	return { id, nome, idStatus, status };
}

function mapSistemaFromApi(row: any): Sistema {
	const nome =
		row?.nome ??
		row?.sistema ??
		row?.nomeSistema ??
		row?.sistemaNome ??
		row?.descricao ??
		"";

	const id = Number(row?.id ?? row?.idSistema ?? row?.sistemaId ?? 0) || 0;

	return { id, nome };
}

/* ===== helpers STATUS ===== */

function statusLabelFromId(id: number): StatusContrato {
	switch (id) {
		case 1:
			return "Regular";
		case 2:
			return "Irregular (Sem Restrição)";
		case 3:
			return "Irregular (Contrato Cancelado)";
		case 4:
			return "Irregular (Com Restrição)";
		default:
			return "Regular";
	}
}

function statusIdFromLabel(label: string | null | undefined): number {
	const v = String(label ?? "").trim();
	if (v === "Regular") return 1;
	if (v === "Irregular (Sem Restrição)") return 2;
	if (v === "Irregular (Contrato Cancelado)") return 3;
	if (v === "Irregular (Com Restrição)") return 4;
	return 1;
}

function isUnauthorized(e: any) {
	return e?.status === 401;
}

/* ===== parse num seguro (evita valores absurdos tipo 57429800) ===== */
function toSafeInt(value: any, defaultValue = 0, limit = 100000): number {
	if (value === null || value === undefined) return defaultValue;

	if (typeof value === "number") {
		if (!Number.isFinite(value)) return defaultValue;
		const n = Math.trunc(value);
		return Math.abs(n) > limit ? defaultValue : n;
	}

	const s = String(value).trim();
	if (!s) return defaultValue;

	// tenta número direto (aceita "10", "10.5", "10,5")
	const direct = Number(s.replace(",", "."));
	if (Number.isFinite(direct)) {
		const n = Math.trunc(direct);
		return Math.abs(n) > limit ? defaultValue : n;
	}

	// fallback: só dígitos
	const digits = s.replace(/[^\d-]/g, "");
	if (!digits) return defaultValue;

	const n2 = Number(digits);
	if (!Number.isFinite(n2)) return defaultValue;

	const n = Math.trunc(n2);
	return Math.abs(n) > limit ? defaultValue : n;
}

function mapControleFromClienteSistema(row: any): ControleSistema {
	return {
		id: toSafeInt(row?.id, 0, 1_000_000_000),
		clienteId: toSafeInt(row?.idCliente, 0, 1_000_000_000),
		idSistema: toSafeInt(row?.idSistema, 0, 1_000_000_000),
		sistema: String(row?.nome ?? ""),
		qtdLicenca: toSafeInt(row?.quantidadeLicenca, 0, 100000),
		qtdDiaLiberacao: toSafeInt(row?.quantidadeDiaLiberacao, 0, 100000),
		status: row?.status ?? row?.descricaoStatus ?? "Regular",
		idStatus: toSafeInt(row?.idStatus, 0, 10) || undefined,
		qtdBanco: toSafeInt(row?.quantidadeBancoDados, 0, 100000),
		qtdCnpj: toSafeInt(row?.quantidadeCnpj, 0, 100000),
		ipMblock: row?.ipMblock ?? null,
		portaMblock:
			row?.portaMblock !== undefined && row?.portaMblock !== null
				? String(row.portaMblock)
				: null,
		observacao: row?.observacaoStatus ?? row?.observacao ?? null,
	};
}

export default function ControleDeSistemaPage() {
	/* estados */
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);

	const [rows, setRows] = useState<ControleSistema[]>([]);
	const [clientes, setClientes] = useState<ClienteBase[]>([]);
	const [sistemas, setSistemas] = useState<Sistema[]>([]);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	/* ordenação */
	type SortKey =
		| keyof Pick<
				ControleSistema,
				"sistema" | "qtdLicenca" | "qtdDiaLiberacao" | "status"
		>
		| "cliente";

	type SortDir = "asc" | "desc" | null;
	const [sortKey, setSortKey] = useState<SortKey | null>("cliente");
	const [sortDir, setSortDir] = useState<SortDir | null>("asc");


	/* popup */
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState<Partial<ControleSistema>>({});
	const [saving, setSaving] = useState(false);

	/* helper nome do cliente */
	const nomeCliente = (id: number) =>
		clientes.find((c) => c.id === id)?.nome ?? "—";

	const statusUI = (r: ControleSistema) =>
		statusLabelFromId(Number(r.idStatus ?? statusIdFromLabel(r.status)));

	/* trava scroll quando modal abre */
	useEffect(() => {
		document.body.style.overflow = editingId !== null ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [editingId]);

	/* ===== carregar CLIENTES + SISTEMAS + CLIENTESISTEMA ===== */
	async function loadRows() {
		try {
			setLoading(true);
			setError(null);

			const clienteStatusMap = new Map<
				number,
				{ idStatus?: number; status?: string | null }
			>();

			let clientesArr: ClienteBase[] = [];
			let sistemasArr: Sistema[] = [];

			// --- CLIENTES ---
			try {
				const clientesResp = await backendFetch("/autenticacao/listaclientes", {
					method: "GET",
				});

				const listaClientes = normalizeList(clientesResp);
				const mapCli = new Map<number, ClienteBase>();

				for (const item of listaClientes) {
					const c = mapClienteFromApi(item);
					if (c.id && c.nome && !mapCli.has(c.id)) mapCli.set(c.id, c);
				}

				clientesArr = Array.from(mapCli.values()).sort((a, b) =>
					a.nome.localeCompare(b.nome, "pt-BR")
				);

				setClientes(clientesArr);

				for (const c of clientesArr) {
					clienteStatusMap.set(c.id, { idStatus: c.idStatus, status: c.status });
				}

				console.log(`✅ ${clientesArr.length} clientes carregados`);
			} catch (e: any) {
				console.error("❌ Erro /autenticacao/listaclientes:", e);
				if (isUnauthorized(e) && typeof window !== "undefined") {
					window.location.href = "/";
					return;
				}
				throw new Error("Não foi possível carregar os clientes.");
			}

			// --- SISTEMAS ---
			try {
				const sistemasResp = await backendFetch("/sistema", { method: "GET" });

				const sisLista = normalizeList(sistemasResp);

				sistemasArr = sisLista
					.map(mapSistemaFromApi)
					.filter((s: Sistema) => s.nome)
					.sort((a: Sistema, b: Sistema) =>
						a.nome.localeCompare(b.nome, "pt-BR")
					);

				setSistemas(sistemasArr);
				console.log(`✅ ${sistemasArr.length} sistemas carregados`);
			} catch (e: any) {
				console.error("❌ Erro /sistema:", e);
				if (isUnauthorized(e) && typeof window !== "undefined") {
					window.location.href = "/";
					return;
				}
				throw new Error("Não foi possível carregar os sistemas.");
			}

			// --- CLIENTE/SISTEMA ---
			try {
				const clienteSistemaResp = await backendFetch("/clientesistema", {
					method: "GET",
				});

				const csLista = normalizeList(clienteSistemaResp);

				const sistemaMap = new Map<number, string>();
				for (const s of sistemasArr) sistemaMap.set(s.id, s.nome);

				const mappedRows = csLista.map((row: any) => {
					const base = mapControleFromClienteSistema(row);
					const cliStatus = clienteStatusMap.get(base.clienteId);

					const clienteCancelado =
						String(cliStatus?.status ?? "").trim() ===
						"Irregular (Contrato Cancelado)";

					// ✅ NORMALIZA idStatus (fonte de verdade) e status (texto) SEMPRE coerente
					const idStatusNormalized = clienteCancelado
						? 3
						: Number(base.idStatus) > 0
							? Number(base.idStatus)
							: Number(cliStatus?.idStatus) > 0
								? Number(cliStatus?.idStatus)
								: statusIdFromLabel(base.status);

					const statusNormalized = statusLabelFromId(idStatusNormalized);

					const sistemaNome =
						(base.sistema && base.sistema.trim()) ||
						sistemaMap.get(base.idSistema) ||
						"";

					return {
						...base,
						sistema: sistemaNome,
						idStatus: idStatusNormalized,
						status: statusNormalized,
					};
				});

				setRows(mappedRows);
				console.log(`✅ ${mappedRows.length} registros carregados`);
			} catch (e: any) {
				console.error("❌ Erro /clientesistema:", e);
				if (isUnauthorized(e) && typeof window !== "undefined") {
					window.location.href = "/";
					return;
				}
				throw new Error(
					"Não foi possível carregar os registros do Controle de Sistema."
				);
			}
		} catch (e: any) {
			setRows([]);
			setError(e?.message || "Erro ao carregar os dados.");
		} finally {
			setLoading(false);
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
	const filtered = useMemo<ControleSistema[]>(() => {
		const q = query.toLowerCase();

		let data = rows.filter((r) =>
			[
				nomeCliente(r.clienteId),
				r.sistema,
				String(r.qtdLicenca),
				String(r.qtdDiaLiberacao),
				r.status,
			]
				.join(" ")
				.toLowerCase()
				.includes(q)
		);

		if (sortKey && sortDir) {
			data = [...data].sort((a, b) => {
				// cliente
				if (sortKey === "cliente") {
					const va = nomeCliente(a.clienteId).toLowerCase();
					const vb = nomeCliente(b.clienteId).toLowerCase();
					if (va < vb) return sortDir === "asc" ? -1 : 1;
					if (va > vb) return sortDir === "asc" ? 1 : -1;
					return 0;
				}

				// numéricos
				if (sortKey === "qtdLicenca" || sortKey === "qtdDiaLiberacao") {
					const na = Number(a[sortKey] ?? 0);
					const nb = Number(b[sortKey] ?? 0);
					const cmp = na - nb;
					return sortDir === "asc" ? cmp : -cmp;
				}

				// texto
				const va = String(a[sortKey] ?? "").toLowerCase();
				const vb = String(b[sortKey] ?? "").toLowerCase();
				if (va < vb) return sortDir === "asc" ? -1 : 1;
				if (va > vb) return sortDir === "asc" ? 1 : -1;
				return 0;
			});
		}

		return data;
	}, [rows, query, sortKey, sortDir, clientes]);

	/* paginação */
	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
	const pageData = useMemo(
		() => filtered.slice((page - 1) * pageSize, page * pageSize),
		[filtered, page, pageSize]
	);

	useEffect(() => {
		setPage((p) => Math.min(p, totalPages));
	}, [totalPages]);

	/* ações */
	function handleAdd() {
		// ✅ NÃO seleciona automaticamente o primeiro cliente/sistema
		setEditingId(0);
		setForm({
			clienteId: undefined,
			sistema: "",
			qtdLicenca: 0,
			qtdDiaLiberacao: 0,
			qtdBanco: 0,
			qtdCnpj: 0,
			ipMblock: "",
			portaMblock: "",
			observacao: "",
			status: "Regular",
			idStatus: 1,
		});
	}

	function handleEdit(id: number) {
		const r = rows.find((x) => x.id === id);
		if (!r) return;

		const idStatusInicial =
			Number(r.idStatus) > 0 ? Number(r.idStatus) : statusIdFromLabel(r.status);

		setEditingId(id);
		setForm({
			...r,
			qtdBanco: r.qtdBanco ?? 0,
			qtdCnpj: r.qtdCnpj ?? 0,
			ipMblock: r.ipMblock ?? "",
			portaMblock: r.portaMblock ?? "",
			observacao: r.observacao ?? "",
			idStatus: idStatusInicial,
			status: statusLabelFromId(idStatusInicial),
		});
	}

	async function handleDelete(id: number) {
		const alvo = rows.find((r) => r.id === id);

		if (
			!window.confirm(
				`Excluir registro do cliente "${nomeCliente(alvo?.clienteId ?? 0)}"?`
			)
		)
			return;

		try {
			await backendFetch(`/clientesistema/${id}`, { method: "DELETE" });
			setRows((prev) => prev.filter((r) => r.id !== id));
			console.log(`✅ Registro ${id} deletado com sucesso`);
		} catch (e: any) {
			console.error("❌ Erro ao deletar:", e);
			alert(`Erro ao deletar o registro:\n${e?.message || "Erro desconhecido"}`);
		}
	}

	function handleCancel() {
		setEditingId(null);
		setForm({});
	}

	function setStatus(id: number) {
		setForm((prev) => ({
			...prev,
			idStatus: id,
			status: statusLabelFromId(id),
		}));
	}

	async function handleSave() {
		// ✅ validação: não pode salvar sem selecionar
		if (!form.clienteId || !String(form.sistema ?? "").trim()) {
			alert("Cliente e Sistema são obrigatórios.");
			return;
		}

		setSaving(true);

		try {
			const idSistema = sistemas.find((s) => s.nome === form.sistema)?.id ?? 0;

			const idStatusFinal =
				Number(form.idStatus) > 0
					? Number(form.idStatus)
					: statusIdFromLabel(form.status);

			const statusFinal = statusLabelFromId(idStatusFinal);

			const payload = {
				idCliente: Number(form.clienteId),
				idSistema: Number(idSistema),

				quantidadeLicenca: Number(form.qtdLicenca ?? 0),
				quantidadeDiaLiberacao: Number(form.qtdDiaLiberacao ?? 0),
				quantidadeBancoDados: Number(form.qtdBanco ?? 0),
				quantidadeCnpj: Number(form.qtdCnpj ?? 0),

				ipMblock: form.ipMblock || null,
				portaMblock: form.portaMblock || null,
				observacaoStatus: form.observacao || null,

				idStatus: idStatusFinal,
				status: statusFinal,
			};

			console.log("📤 Enviando payload:", { editingId, payload });

			if (editingId === 0) {
				await backendFetch("/clientesistema", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
			} else {
				await backendFetch(`/clientesistema/${editingId}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
			}

			await loadRows();
			setEditingId(null);
			setForm({});
		} catch (e: any) {
			console.error("❌ Erro ao salvar:", e);

			const errorMessage =
				e?.data?.error ||
				e?.data?.message ||
				e?.message ||
				"Erro desconhecido ao salvar";

			alert(`Erro ao salvar o registro:\n\n${errorMessage}`);
		} finally {
			setSaving(false);
		}
	}

	function handleExport() {
		const csv = toCSVControleSistema(filtered, nomeCliente);
		downloadCSV(
			csv,
			`controle_sistema_${new Date().toISOString().slice(0, 10)}.csv`
		);
	}

	/* LISTA MOBILE */
	const MobileList = () => (
		<ul className="sm:hidden space-y-3">
			{pageData.map((r, idx) => (
				<li
					key={`${page}-${idx}`}
					className="rounded-xl border bg-white p-4 shadow"
				>
					<div className="flex items-start gap-3">
						<div className="flex-1 min-w-0">
							<div className="font-medium text-gray-900 break-words">
								{nomeCliente(r.clienteId)}
							</div>
							<div className="text-sm text-gray-500">{r.sistema}</div>
						</div>
						<div className="flex gap-1">
							<button
								onClick={() => handleEdit(r.id)}
								className="w-7 h-7 rounded-xl bg-yellow-400 text-white hover:bg-yellow-500 transition-transform transform hover:scale-110"
							>
								✎
							</button>
							<button
								onClick={() => handleDelete(r.id)}
								className="w-7 h-7 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-transform transform hover:scale-110"
							>
								✖
							</button>
						</div>
					</div>

					<div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700">
						<div>
							<span className="text-gray-500">Licenças:</span> {r.qtdLicenca}
						</div>
						<div>
							<span className="text-gray-500">Dias Lib.:</span>{" "}
							{r.qtdDiaLiberacao}
						</div>
						<div className="col-span-2">
							<span className="text-gray-500">Status:</span> {statusUI(r)}
						</div>
					</div>
				</li>
			))}

			{pageData.length === 0 && !loading && !error && (
				<li className="rounded-xl border bg-white p-8 text-center text-gray-500">
					Nenhum registro encontrado.
				</li>
			)}
		</ul>
	);

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="flex">
				<Sidebar active="controle-sistema" />

				<div className="flex-1">
					<div className="sticky top-0 z-20 sm:hidden bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 border-b text-center font-semibold text-white">
						Controle de Sistema
					</div>

					<main className="mx-auto max-w-7xl p-4 md:p-6">
						<div className="mb-4 space-y-2">
							<div className="flex sm:hidden items-center gap-2">
								<input
									type="text"
									placeholder="Pesquisa rápida"
									value={query}
									onChange={(e) => {
										setQuery(e.target.value);
										setPage(1);
									}}
									className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow text-md text-gray-700"
								/>
								<button
									onClick={handleAdd}
									className="w-10 h-10 rounded-lg border border-gray-200 bg-white shadow text-gray-700 transform transition-transform hover:scale-105"
								>
									➕
								</button>
								<button
									onClick={handleExport}
									className="w-10 h-10 rounded-lg border border-gray-200 bg-white shadow text-blue-600 transform transition-transform hover:scale-105"
								>
									⬇️
								</button>
							</div>

							<div className="hidden sm:flex items-center justify-between">
								<input
									type="text"
									placeholder="Pesquisa rápida"
									value={query}
									onChange={(e) => {
										setQuery(e.target.value);
										setPage(1);
									}}
									className="w-full sm:w-72 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow text-md text-gray-600"
								/>
								<div className="flex items-center gap-2">
									<button
										onClick={handleAdd}
										className="rounded-xl px-3 py-2 bg-white text-sm border border-gray-200 shadow text-gray-700 hover:scale-105 transform"
									>
										➕ Adicionar
									</button>
									<button
										onClick={handleExport}
										className="rounded-xl px-3 py-2 bg-white text-sm border border-gray-200 shadow text-gray-700 hover:scale-105 transform"
									>
										⬇️ Exportar CSV
									</button>
								</div>
							</div>
						</div>

						<MobileList />

						{/* TABELA DESKTOP */}
						<div className="hidden sm:block rounded-xl bg-white shadow overflow-hidden">
							<div className="w-full overflow-x-auto">
								<table className="min-w-full border-separate border-spacing-0 text-sm">
									<thead>
										<tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
											<th className="px-3 py-3 w-28 text-left whitespace-nowrap">
												Ações
											</th>
											<th
												className="px-3 py-3 cursor-pointer text-left whitespace-nowrap"
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
												className="px-3 py-3 cursor-pointer text-left whitespace-nowrap"
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
												className="px-3 py-3 cursor-pointer text-left whitespace-nowrap"
												onClick={() => toggleSort("qtdLicenca")}
											>
												Qtd Licença{" "}
												{sortKey === "qtdLicenca"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
											<th
												className="px-3 py-3 cursor-pointer text-left whitespace-nowrap"
												onClick={() => toggleSort("qtdDiaLiberacao")}
											>
												Qtd Dia Liberação{" "}
												{sortKey === "qtdDiaLiberacao"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}{" "}
											</th>
											<th
												className="px-3 py-3 cursor-pointer text-left whitespace-nowrap"
												onClick={() => toggleSort("status")}
											>
												Status{" "}
												{sortKey === "status"
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
													<div className="flex text-left gap-2">
														<button
															onClick={() => handleEdit(r.id)}
															className="w-7 h-7 rounded-xl bg-yellow-400 text-white hover:bg-yellow-500 transition-transform transform hover:scale-110"
														>
															✎
														</button>
														<button
															onClick={() => handleDelete(r.id)}
															className="w-7 h-7 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-transform transform hover:scale-110"
														>
															✖
														</button>
													</div>
												</td>

												<td
													className="px-3 py-3 text-left truncate max-w-[18rem]"
													title={nomeCliente(r.clienteId)}
												>
													{nomeCliente(r.clienteId)}
												</td>

												<td className="px-3 py-3 text-left whitespace-nowrap">
													{r.sistema}
												</td>

												<td className="px-3 py-3 text-left whitespace-nowrap">
													{r.qtdLicenca}
												</td>

												<td className="px-3 py-3 text-left whitespace-nowrap">
													{r.qtdDiaLiberacao}
												</td>

												<td className="px-3 py-3 text-left whitespace-nowrap">
													{statusUI(r)}
												</td>
											</tr>
										))}

										{pageData.length === 0 && (
											<tr>
												<td colSpan={6} className="px-3 py-8 text-center text-gray-500">
													Nenhum registro encontrado.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>

						{/* paginação */}
						<div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-black">
							<div className="text-sm text-gray-700">
								{filtered.length} registro(s) • Página {page} de {totalPages}
							</div>

							<div className="flex items-center gap-2">
								<button
									className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-blue-500 shadow-sm hover:scale-110 transition-transform disabled:opacity-40"
									onClick={() => setPage(1)}
									disabled={page === 1}
								>
									◀◀
								</button>

								<button
									className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-blue-500 shadow-sm hover:scale-110 transition-transform disabled:opacity-40"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
								>
									◀
								</button>

								<button
									className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-blue-500 shadow-sm hover:scale-110 transition-transform disabled:opacity-40"
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={page === totalPages}
								>
									▶
								</button>

								<button
									className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-blue-500 shadow-sm hover:scale-110 transition-transform disabled:opacity-40"
									onClick={() => setPage(totalPages)}
									disabled={page === totalPages}
								>
									▶▶
								</button>
							</div>
						</div>

						{error && (
							<div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
								{error}
							</div>
						)}

					</main>
				</div>
			</div>

			{/* POPUP */}
			{editingId !== null && (
				<div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
					<div className="absolute inset-0 bg-black/50" />

					<div className="absolute inset-0 flex items-stretch sm:items-center justify-center p-0 sm:p-3">
						<div className="h-full w-full sm:h-auto sm:w-full sm:max-w-2xl bg-white rounded-none sm:rounded-xl shadow-lg overflow-y-auto">
							<h2 className="sticky top-0 z-10 px-6 py-4 bg-white border-b text-xl font-semibold text-blue-700">
								{editingId === 0 ? "Adicionar Registro" : "Editar Registro"}
							</h2>

							<div className="p-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<label className="text-sm md:col-span-2">
										<span className="block mb-1 text-black">Cliente *</span>
										<select
											value={form.clienteId ?? ""}
											onChange={(e) =>
												setForm((prev) => ({
													...prev,
													clienteId: e.target.value ? Number(e.target.value) : undefined,
												}))
											}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										>
											<option value="">Selecione</option>
											{clientes.map((c) => (
												<option key={c.id} value={c.id}>
													{c.nome}
												</option>
											))}
										</select>
									</label>

									<label className="text-sm md:col-span-2">
										<span className="block mb-1 text-black">Sistema *</span>
										<select
											value={form.sistema ?? ""}
											onChange={(e) =>
												setForm((prev) => ({
													...prev,
													sistema: e.target.value,
												}))
											}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										>
											<option value="">Selecione</option>
											{sistemas.map((s) => (
												<option key={s.id} value={s.nome}>
													{s.nome}
												</option>
											))}
										</select>
									</label>

									<label className="text-sm">
										<span className="block mb-1 text-black">Qtd Licença *</span>
										<input
											type="number"
											min={0}
											value={form.qtdLicenca ?? 0}
											onChange={(e) =>
												setForm((prev) => ({
													...prev,
													qtdLicenca: Number(e.target.value),
												}))
											}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										/>
									</label>

									<label className="text-sm">
										<span className="block mb-1 text-black">Qtd Dia Liberação *</span>
										<input
											type="number"
											min={0}
											value={form.qtdDiaLiberacao ?? 0}
											onChange={(e) =>
												setForm((prev) => ({
													...prev,
													qtdDiaLiberacao: Number(e.target.value),
												}))
											}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										/>
									</label>

									<label className="text-sm">
										<span className="block mb-1 text-black">Qtd Bancos de Dados</span>
										<input
											type="number"
											min={0}
											value={form.qtdBanco ?? 0}
											onChange={(e) =>
												setForm((prev) => ({
													...prev,
													qtdBanco: Number(e.target.value),
												}))
											}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										/>
									</label>

									<label className="text-sm">
										<span className="block mb-1 text-black">Qtd CNPJ</span>
										<input
											type="number"
											min={0}
											value={form.qtdCnpj ?? 0}
											onChange={(e) =>
												setForm((prev) => ({
													...prev,
													qtdCnpj: Number(e.target.value),
												}))
											}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										/>
									</label>

									{(form.sistema ?? "").toUpperCase() === "MBLOCK" && (
										<>
											<label className="text-sm">
												<span className="block mb-1 text-black">IP</span>
												<input
													type="text"
													value={form.ipMblock ?? ""}
													onChange={(e) =>
														setForm((prev) => ({
															...prev,
															ipMblock: e.target.value,
														}))
													}
													className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
												/>
											</label>

											<label className="text-sm">
												<span className="block mb-1 text-black">Porta</span>
												<input
													type="text"
													value={form.portaMblock ?? ""}
													onChange={(e) =>
														setForm((prev) => ({
															...prev,
															portaMblock: e.target.value,
														}))
													}
													className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
												/>
											</label>
										</>
									)}

									<label className="text-sm md:col-span-2">
										<span className="block mb-1 text-black">Observações</span>
										<textarea
											value={form.observacao ?? ""}
											onChange={(e) =>
												setForm((prev) => ({
													...prev,
													observacao: e.target.value,
												}))
											}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm min-h-[80px]"
										/>
									</label>

									<label className="text-sm md:col-span-2">
										<span className="block mb-1 text-black">Status *</span>

										<div className="space-y-2 text-black">
											{([1, 2, 3, 4] as const).map((id) => {
												const label = statusLabelFromId(id);
												return (
													<label key={id} className="flex items-center gap-2">
														<input
															type="radio"
															name="status"
															checked={Number(form.idStatus ?? 1) === id}
															onChange={() => setStatus(id)}
														/>
														<span>{label}</span>
													</label>
												);
											})}
										</div>
									</label>
								</div>

								<div className="mt-6 flex justify-end gap-2">
									<button
										onClick={handleCancel}
										disabled={saving}
										className="rounded-xl bg-red-400 px-4 py-2 text-white hover:bg-red-500 transform hover:scale-105 disabled:opacity-60"
									>
										Cancelar
									</button>
									<button
										onClick={handleSave}
										disabled={saving}
										className="rounded-xl bg-green-500 px-4 py-2 text-white hover:bg-green-600 transform hover:scale-105 disabled:opacity-60"
									>
										{saving ? "Salvando..." : "Gravar"}
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

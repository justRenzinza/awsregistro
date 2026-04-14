"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { downloadCSV, toCSVControleSistema } from "../../helpers/export";
import Sidebar from "@/app/components/Sidebar";
import { backendFetch } from "@/lib/backend";

type ClienteBase = {
	id: number;
	codigo: number;
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

	const codigo = Number(base?.codigo ?? base?.id ?? id);

	const nome =
		base?.nome ??
		base?.razaoSocial ??
		base?.razao_social ??
		base?.nomeCliente ??
		"";

	const sistemas = Array.isArray(base?.sistemas) ? base.sistemas : [];
	const sistema2 = sistemas.find((s: any) => Number(s?.idSistema) === 2);

	const idStatus =
		sistema2?.idStatus ??
		base?.idStatus ??
		base?.id_status ??
		(base?.status === "Irregular (Contrato Cancelado)" ? 3 : undefined);

	const status =
		sistema2?.status ?? base?.status ?? base?.descricaoStatus ?? null;

	return { id, codigo, nome, idStatus, status };
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

function toSafeInt(value: any, defaultValue = 0, limit = 100000): number {
	if (value === null || value === undefined) return defaultValue;

	if (typeof value === "number") {
		if (!Number.isFinite(value)) return defaultValue;
		const n = Math.trunc(value);
		return Math.abs(n) > limit ? defaultValue : n;
	}

	const s = String(value).trim();
	if (!s) return defaultValue;

	const direct = Number(s.replace(",", "."));
	if (Number.isFinite(direct)) {
		const n = Math.trunc(direct);
		return Math.abs(n) > limit ? defaultValue : n;
	}

	const digits = s.replace(/[^\d-]/g, "");
	if (!digits) return defaultValue;

	const n2 = Number(digits);
	if (!Number.isFinite(n2)) return defaultValue;

	const n = Math.trunc(n2);
	return Math.abs(n) > limit ? defaultValue : n;
}

function mapControleFromClienteSistema(row: any): ControleSistema {
	const clienteId = toSafeInt(
		row?.idCliente ?? row?.clienteId ?? row?.cliente_id ?? row?.cliente?.id,
		0,
		1_000_000_000
	);

	return {
		id: toSafeInt(row?.id, 0, 1_000_000_000),
		clienteId,
		idSistema: toSafeInt(row?.idSistema, 0, 1_000_000_000),
		sistema: String(row?.nome ?? row?.sistema ?? ""),
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
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);

	const [rows, setRows] = useState<ControleSistema[]>([]);
	const [clientes, setClientes] = useState<ClienteBase[]>([]);
	const [sistemas, setSistemas] = useState<Sistema[]>([]);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [registrosOrfaos, setRegistrosOrfaos] = useState(0);

	type SortKey =
		| keyof Pick<
				ControleSistema,
				"sistema" | "qtdLicenca" | "qtdDiaLiberacao" | "status"
		  >
		| "cliente"
		| "codigo";

	type SortDir = "asc" | "desc" | null;

	const [sortKey, setSortKey] = useState<SortKey | null>("cliente");
	const [sortDir, setSortDir] = useState<SortDir | null>("asc");

	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState<Partial<ControleSistema>>({});
	const [saving, setSaving] = useState(false);

	const [clienteSearch, setClienteSearch] = useState("");
	const [showClienteDropdown, setShowClienteDropdown] = useState(false);

	const [sistemaSearch, setSistemaSearch] = useState("");
	const [showSistemaDropdown, setShowSistemaDropdown] = useState(false);

	const isMblock = String(form.sistema ?? "").toUpperCase().includes("MBLOCK");

	const nomeCliente = (id: number) =>
		clientes.find((c) => c.id === id)?.nome ?? "—";

	const codigoCliente = (id: number) =>
		clientes.find((c) => c.id === id)?.codigo ?? 0;

	const statusUI = (r: ControleSistema) =>
		statusLabelFromId(Number(r.idStatus ?? statusIdFromLabel(r.status)));

	useEffect(() => {
		document.body.style.overflow = editingId !== null ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [editingId]);

	const loadRows = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const clienteStatusMap = new Map<
				number,
				{ idStatus?: number; status?: string | null }
			>();

			let clientesArr: ClienteBase[] = [];
			let sistemasArr: Sistema[] = [];

			try {
				const LIMIT = 200;
				let offset = 0;
				let allClientes: any[] = [];
				let hasMore = true;

				while (hasMore) {
					const data = await backendFetch(
						`/clientes?limit=${LIMIT}&offset=${offset}`,
						{ method: "GET" }
					);

					let lista: any[] = [];
					if (Array.isArray(data)) lista = data;
					else if (data && typeof data === "object") {
						const d: any = data;
						if (Array.isArray(d.data)) lista = d.data;
						else if (Array.isArray(d.items)) lista = d.items;
						else if (Array.isArray(d.result)) lista = d.result;
						else if (Array.isArray(d.value)) lista = d.value;
						else if (Array.isArray(d.$values)) lista = d.$values;
					}

					if (!lista.length) {
						hasMore = false;
						break;
					}

					allClientes = [...allClientes, ...lista];

					if (lista.length < LIMIT) hasMore = false;
					else offset += LIMIT;
				}

				const mapCli = new Map<number, ClienteBase>();

				for (const item of allClientes) {
					const c = mapClienteFromApi(item);
					if (c.id && c.nome && !mapCli.has(c.id)) {
						mapCli.set(c.id, c);
					}
				}

				clientesArr = Array.from(mapCli.values())
					.filter((c) => c.idStatus !== 3)
					.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

				setClientes(clientesArr);

				for (const c of clientesArr) {
					clienteStatusMap.set(c.id, {
						idStatus: c.idStatus,
						status: c.status,
					});
				}
			} catch (e: any) {
				if (isUnauthorized(e) && typeof window !== "undefined") {
					window.location.href = "/";
					return;
				}
				throw new Error("Não foi possível carregar os clientes.");
			}

			try {
				const sistemasResp = await backendFetch("/sistema", {
					method: "GET",
				});

				const sisLista = normalizeList(sistemasResp);

				sistemasArr = sisLista
					.map(mapSistemaFromApi)
					.filter((s: Sistema) => s.id > 0 && s.nome)
					.sort((a: Sistema, b: Sistema) =>
						a.nome.localeCompare(b.nome, "pt-BR")
					);

				setSistemas(sistemasArr);
			} catch (e: any) {
				if (isUnauthorized(e) && typeof window !== "undefined") {
					window.location.href = "/";
					return;
				}
				throw new Error("Não foi possível carregar os sistemas.");
			}

			try {
				const clienteSistemaResp = await backendFetch("/clientesistema", {
					method: "GET",
				});

				const csLista = normalizeList(clienteSistemaResp);

				const sistemaMap = new Map<number, string>();
				for (const s of sistemasArr) sistemaMap.set(s.id, s.nome);

				let contadorOrfaos = 0;

				const mappedRows = csLista
					.map((row: any) => {
						const base = mapControleFromClienteSistema(row);
						const cliStatus = clienteStatusMap.get(base.clienteId);

						const clienteCancelado =
							String(cliStatus?.status ?? "").trim() ===
							"Irregular (Contrato Cancelado)";

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
					})
					.filter((r) => {
						const clienteExiste = clienteStatusMap.has(r.clienteId);
						const clienteCancelado =
							clienteStatusMap.get(r.clienteId)?.idStatus === 3;

						if (!clienteExiste) contadorOrfaos++;

						return clienteExiste && !clienteCancelado;
					});

				setRows(mappedRows);
				setRegistrosOrfaos(contadorOrfaos);
			} catch (e: any) {
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
	}, []);

	useEffect(() => {
		loadRows();
	}, [loadRows]);

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

	const filtered = useMemo<ControleSistema[]>(() => {
		const q = query.toLowerCase();

		let data = rows.filter((r) =>
			[
				String(codigoCliente(r.clienteId)),
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
				if (sortKey === "codigo") {
					const cmp = codigoCliente(a.clienteId) - codigoCliente(b.clienteId);
					return sortDir === "asc" ? cmp : -cmp;
				}

				if (sortKey === "cliente") {
					const va = nomeCliente(a.clienteId).toLowerCase();
					const vb = nomeCliente(b.clienteId).toLowerCase();
					if (va < vb) return sortDir === "asc" ? -1 : 1;
					if (va > vb) return sortDir === "asc" ? 1 : -1;
					return 0;
				}

				if (sortKey === "qtdLicenca" || sortKey === "qtdDiaLiberacao") {
					const na = Number(a[sortKey] ?? 0);
					const nb = Number(b[sortKey] ?? 0);
					const cmp = na - nb;
					return sortDir === "asc" ? cmp : -cmp;
				}

				const va = String(a[sortKey] ?? "").toLowerCase();
				const vb = String(b[sortKey] ?? "").toLowerCase();
				if (va < vb) return sortDir === "asc" ? -1 : 1;
				if (va > vb) return sortDir === "asc" ? 1 : -1;
				return 0;
			});
		}

		return data;
	}, [rows, query, sortKey, sortDir, clientes]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

	const pageData = useMemo(
		() => filtered.slice((page - 1) * pageSize, page * pageSize),
		[filtered, page, pageSize]
	);

	useEffect(() => {
		setPage((p) => Math.min(p, totalPages));
	}, [totalPages]);

	const filteredClientes = useMemo(() => {
		if (!clienteSearch.trim()) return clientes;
		const search = clienteSearch.toLowerCase();
		return clientes.filter(
			(c) =>
				c.nome.toLowerCase().includes(search) ||
				String(c.codigo).includes(search)
		);
	}, [clientes, clienteSearch]);

	const filteredSistemas = useMemo(() => {
		if (!sistemaSearch.trim()) return sistemas;
		const search = sistemaSearch.toLowerCase();
		return sistemas.filter((s) => s.nome.toLowerCase().includes(search));
	}, [sistemas, sistemaSearch]);

	function handleAdd() {
		setEditingId(0);
		setForm({
			clienteId: undefined,
			idSistema: undefined,
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
		setClienteSearch("");
		setShowClienteDropdown(false);
		setSistemaSearch("");
		setShowSistemaDropdown(false);
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

		const cliente = clientes.find((c) => c.id === r.clienteId);
		if (cliente) {
			setClienteSearch(`${cliente.codigo} - ${cliente.nome}`);
		}

		const sistema = sistemas.find((s) => s.id === r.idSistema);
		setSistemaSearch(sistema?.nome ?? r.sistema ?? "");

		setShowClienteDropdown(false);
		setShowSistemaDropdown(false);
	}

	function handleCancel() {
		setEditingId(null);
		setForm({});
		setClienteSearch("");
		setShowClienteDropdown(false);
		setSistemaSearch("");
		setShowSistemaDropdown(false);
	}

	function setStatus(id: number) {
		setForm((prev) => ({
			...prev,
			idStatus: id,
			status: statusLabelFromId(id),
		}));
	}

	async function handleSave() {
		if (!form.clienteId) {
			alert("Cliente é obrigatório.");
			return;
		}

		const sistemaSelecionado = sistemas.find(
			(s) =>
				s.id === Number(form.idSistema) ||
				s.nome.trim().toLowerCase() === String(form.sistema ?? "").trim().toLowerCase()
		);

		if (!sistemaSelecionado) {
			alert("Sistema é obrigatório.");
			return;
		}

		setSaving(true);

		try {
			const idStatusFinal =
				Number(form.idStatus) > 0
					? Number(form.idStatus)
					: statusIdFromLabel(form.status);

			const statusFinal = statusLabelFromId(idStatusFinal);

			const payload = {
				idCliente: Number(form.clienteId),
				idSistema: Number(sistemaSelecionado.id),
				quantidadeLicenca: Number(form.qtdLicenca ?? 0),
				quantidadeDiaLiberacao: Number(form.qtdDiaLiberacao ?? 0),
				quantidadeBancoDados: Number(form.qtdBanco ?? 0),
				quantidadeCnpj: Number(form.qtdCnpj ?? 0),
				ipMblock: isMblock ? String(form.ipMblock ?? "").trim() || null : null,
				portaMblock: isMblock
					? String(form.portaMblock ?? "").trim() || null
					: null,
				observacaoStatus: String(form.observacao ?? "").trim() || null,
				idStatus: idStatusFinal,
				status: statusFinal,
			};

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
			handleCancel();
		} catch (e: any) {
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

	const MobileList = () => (
		<ul className="sm:hidden space-y-3">
			{pageData.map((r, idx) => (
				<li
					key={`${r.id}-${idx}`}
					className="rounded-xl border bg-white p-4 shadow"
				>
					<div className="flex items-start gap-3">
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<span className="text-xs text-black">
									{codigoCliente(r.clienteId)}
								</span>
								<div className="font-medium text-gray-900 break-words">
									{nomeCliente(r.clienteId)}
								</div>
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
									placeholder="Pesquisar por código, cliente, sistema..."
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
									placeholder="Pesquisar por código, cliente, sistema..."
									value={query}
									onChange={(e) => {
										setQuery(e.target.value);
										setPage(1);
									}}
									className="w-full sm:w-96 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow text-md text-gray-600"
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

						{registrosOrfaos > 0 && (
							<div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-yellow-800 text-sm">
								⚠️ {registrosOrfaos} registro(s) de cliente(s) que não existem
								mais foram ocultados.
							</div>
						)}

						<MobileList />

						<div className="hidden sm:block rounded-xl bg-white shadow overflow-hidden">
							<div className="w-full overflow-x-auto">
								<table className="min-w-full border-separate border-spacing-0 text-sm">
									<thead>
										<tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
											<th className="px-3 py-3 w-20 text-left whitespace-nowrap">
												Ações
											</th>
											<th
												className="px-3 py-3 cursor-pointer text-left whitespace-nowrap"
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
													: ""}
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
												key={`${r.id}-${idx}`}
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
													</div>
												</td>

												<td className="px-3 py-3 text-left text-gray-900">
													{codigoCliente(r.clienteId)}
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
												<td
													colSpan={7}
													className="px-3 py-8 text-center text-gray-500"
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

			{editingId !== null && (
				<div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
					<div className="absolute inset-0 bg-black/50" onClick={handleCancel} />

					<div className="absolute inset-0 flex items-stretch sm:items-center justify-center p-0 sm:p-3">
						<div className="h-full w-full sm:h-auto sm:w-full sm:max-w-2xl bg-white rounded-none sm:rounded-xl shadow-lg overflow-y-auto">
							<h2 className="sticky top-0 z-10 px-6 py-4 bg-white border-b text-xl font-semibold text-blue-700">
								{editingId === 0 ? "Adicionar Registro" : "Editar Registro"}
							</h2>

							<div className="p-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<label className="text-sm md:col-span-2 relative">
										<span className="block mb-1 text-black">Cliente *</span>
										<input
											type="text"
											placeholder="Digite para pesquisar..."
											value={clienteSearch}
											onChange={(e) => {
												setClienteSearch(e.target.value);
												setShowClienteDropdown(true);
											}}
											onFocus={() => setShowClienteDropdown(true)}
											onBlur={() =>
												setTimeout(() => setShowClienteDropdown(false), 150)
											}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										/>

										{showClienteDropdown && filteredClientes.length > 0 && (
											<ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg">
												{filteredClientes.slice(0, 50).map((c) => (
													<li
														key={c.id}
														onMouseDown={(e) => e.preventDefault()}
														onClick={() => {
															setForm((prev) => ({ ...prev, clienteId: c.id }));
															setClienteSearch(`${c.codigo} - ${c.nome}`);
															setShowClienteDropdown(false);
														}}
														className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm text-black"
													>
														<span className="font-semibold">{c.codigo}</span> -{" "}
														{c.nome}
													</li>
												))}
											</ul>
										)}
									</label>

									<label className="text-sm md:col-span-2 relative">
										<span className="block mb-1 text-black">Sistema *</span>
										<input
											type="text"
											placeholder="Digite para pesquisar..."
											value={sistemaSearch}
											onChange={(e) => {
												setSistemaSearch(e.target.value);
												setForm((prev) => ({
													...prev,
													sistema: e.target.value,
													idSistema: undefined,
												}));
												setShowSistemaDropdown(true);
											}}
											onFocus={() => setShowSistemaDropdown(true)}
											onBlur={() =>
												setTimeout(() => setShowSistemaDropdown(false), 150)
											}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										/>

										{showSistemaDropdown && filteredSistemas.length > 0 && (
											<ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg">
												{filteredSistemas.map((s) => (
													<li
														key={s.id}
														onMouseDown={(e) => e.preventDefault()}
														onClick={() => {
															setForm((prev) => ({
																...prev,
																sistema: s.nome,
																idSistema: s.id,
															}));
															setSistemaSearch(s.nome);
															setShowSistemaDropdown(false);
														}}
														className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm text-black"
													>
														{s.nome}
													</li>
												))}
											</ul>
										)}
									</label>

									<label className="text-sm">
										<span className="block mb-1 text-black">Qtd Licença</span>
										<input
											type="number"
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
										<span className="block mb-1 text-black">
											Qtd Dia Liberação
										</span>
										<input
											type="number"
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
										<span className="block mb-1 text-black">
											Qtd Banco de Dados
										</span>
										<input
											type="number"
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

									{isMblock && (
										<label className="text-sm">
											<span className="block mb-1 text-black">IP Mblock</span>
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
									)}

									{isMblock && (
										<label className="text-sm">
											<span className="block mb-1 text-black">
												Porta Mblock
											</span>
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
									)}

									<label className="text-sm md:col-span-2">
										<span className="block mb-1 text-black">Status</span>
										<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
											{[
												{ id: 1, label: "Regular" },
												{ id: 2, label: "Irregular (Sem Restrição)" },
												{ id: 3, label: "Irregular (Contrato Cancelado)" },
												{ id: 4, label: "Irregular (Com Restrição)" },
											].map((s) => (
												<button
													key={s.id}
													type="button"
													onClick={() => setStatus(s.id)}
													className={`px-3 py-2 text-xs rounded border transition ${
														form.idStatus === s.id
															? "bg-blue-600 text-white border-blue-600"
															: "bg-white text-gray-700 border-gray-300 hover:border-blue-500"
													}`}
												>
													{s.label}
												</button>
											))}
										</div>
									</label>

									<label className="text-sm md:col-span-2">
										<span className="block mb-1 text-black">Observação</span>
										<textarea
											value={form.observacao ?? ""}
											onChange={(e) =>
												setForm((prev) => ({
													...prev,
													observacao: e.target.value,
												}))
											}
											rows={3}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										/>
									</label>
								</div>

								<div className="mt-6 flex gap-2 justify-end">
									<button
										onClick={handleCancel}
										className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
									>
										Cancelar
									</button>
									<button
										onClick={handleSave}
										disabled={saving}
										className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
									>
										{saving ? "Salvando..." : "Salvar"}
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

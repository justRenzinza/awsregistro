"use client";

import { useMemo, useState, useEffect } from "react";
import { toCSV, downloadCSV } from "../../helpers/export";

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
};

const data_teste: Cliente[] = [
	{ id: 1, codigo: 40, razaoSocial: "CACAU SUL COMERCIO ATACADISTA EIRELI", cnpj: "24109887000145", dataRegistro: "09/08/2023", contato: "TAMILES", telefone: "7332311343", email: "gerencia@cacausulcomercio.com.br" },
	{ id: 2, codigo: 51, razaoSocial: "WKS EXPORTACOES LTDA", cnpj: "51447260000140", dataRegistro: "10/11/2023", contato: "WILLIAN", telefone: "27998612015", email: "louricafe@hotmail.com" },
	{ id: 3, codigo: 52, razaoSocial: "ALLWARE TESTE", cnpj: "20853254000160", dataRegistro: "09/02/2024", contato: "ALLWARE", telefone: "2721230020", email: "comercial@allware.com.br" },
	{ id: 4, codigo: 53, razaoSocial: "ALLWARE TESTE", cnpj: "22832313000149", dataRegistro: "09/02/2024", contato: "ALLWARE", telefone: "2721230020", email: "comercial@allware.com.br" },
	{ id: 5, codigo: 54, razaoSocial: "ROBSON PASSOS BARBOSA (TESTE GIUCAFE LOCAL)", cnpj: "15206866000120", dataRegistro: "19/02/2024", contato: "ROBSON", telefone: "27998259141", email: "robson@allware.com.br" },
	{ id: 6, codigo: 55, razaoSocial: "AGRO NORTE ARMAZENS GERAIS LTDA", cnpj: "47204452000159", dataRegistro: "20/02/2024", contato: "ALEX", telefone: "27996371350", email: "agronorteag@gmail.com" },
	{ id: 7, codigo: 56, razaoSocial: "B.M. ARMAZENS GERAIS LTDA", cnpj: "02958756000173", dataRegistro: "06/03/2024", contato: "POLIANA", telefone: "27997959533", email: "—" },
];

/* ========= helpers visuais ========= */
function formatCNPJ(v: string) {
	const s = (v || "").replace(/\D/g, "").slice(0, 14);
	return s
		.replace(/^(\d{2})(\d)/, "$1.$2")
		.replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
		.replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1\/$2")
		.replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d{1,2}).*$/, "$1-$2");
}
function formatPhone(v: string) {
	const s = (v || "").replace(/\D/g, "").slice(0, 11);
	if (s.length <= 10) {
		return s.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{4})$/, "$1-$2");
	}
	return s.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{4})$/, "$1-$2");
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
	const d1 = 11 - (arr.slice(0, 12).reduce((acc, n, i) => acc + n * pesos1[i], 0) % 11);
	const dv1 = d1 >= 10 ? 0 : d1;
	const d2 = 11 - ([...arr.slice(0, 12), dv1].reduce((acc, n, i) => acc + n * pesos2[i], 0) % 11);
	const dv2 = d2 >= 10 ? 0 : d2;
	return cnpj.slice(-2) === `${dv1}${dv2}`;
}

/* ========= helpers de ordenação ========= */
function parseBRDate(d: string) {
	const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d || "");
	if (!m) return 0;
	const [_, dd, mm, yyyy] = m;
	return new Date(Number(yyyy), Number(mm) - 1, Number(dd)).getTime();
}

/* ========= componente ========= */
type SortKey = keyof Pick<Cliente, "codigo" | "razaoSocial" | "cnpj" | "dataRegistro" | "contato" | "telefone" | "email">;
type SortDir = "asc" | "desc" | null;

export default function ClientesPage() {
	/* tabela */
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);
	const [sortKey, setSortKey] = useState<SortKey | null>(null);
	const [sortDir, setSortDir] = useState<SortDir>(null);
	const [rows, setRows] = useState<Cliente[]>(data_teste);

	/* sidebar mobile */
	const [openSidebar, setOpenSidebar] = useState(false);

	/* popup */
	const [editingId, setEditingId] = useState<number | null>(null); // 0 = novo
	const [editForm, setEditForm] = useState<Partial<Cliente>>({});
	const [errors, setErrors] = useState<{ cnpj?: string; email?: string }>({});

	/* busca + ordenação */
	const filtered = useMemo<Cliente[]>(() => {
		const q = query.trim().toLowerCase();
		let data = rows.filter((r) =>
			[r.codigo, r.razaoSocial, r.cnpj, r.dataRegistro, r.contato, r.telefone, r.email]
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
					cmp = parseBRDate(a.dataRegistro ?? "") - parseBRDate(b.dataRegistro ?? "");
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

	/* mantém a página válida quando o filtro muda */
	useEffect(() => {
		setPage((p) => Math.min(p, totalPages));
	}, [totalPages]);

	/* trava/destrava o scroll do body quando o modal abre/fecha */
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

	function handleDelete(id: number) {
		const alvo = rows.find((r) => r.id === id);
		const nome = alvo?.razaoSocial ?? "este registro";
		if (!window.confirm(`Tem certeza que deseja excluir ${nome}?`)) return;
		setRows((prev) => prev.filter((r) => r.id !== id));
	}

	function handleEditOpen(id: number) {
		const c = rows.find((r) => r.id === id);
		if (!c) return;
		setEditingId(id);
		setEditForm({ ...c });
		setErrors({});
	}

	function handleEditCancel() {
		setEditingId(null);
		setEditForm({});
		setErrors({});
	}

	function handleEditSave() {
		if (editingId === null) return;

		const errs: { cnpj?: string; email?: string } = {};
		const email = (editForm.email ?? "").trim();
		const cnpj = (editForm.cnpj ?? "").trim();

		if (!email) errs.email = "Email é obrigatório.";
		else if (!isValidEmail(email)) errs.email = "Email inválido.";
		if (!cnpj) errs.cnpj = "CNPJ é obrigatório.";
		else if (!isValidCNPJ(cnpj)) errs.cnpj = "CNPJ inválido.";

		if (errs.email || errs.cnpj) {
			setErrors(errs);
			return;
		}

		if (editingId === 0) {
			const novo: Cliente = {
				id: Date.now(),
				codigo: (editForm.codigo as number) ?? 0,
				razaoSocial: editForm.razaoSocial ?? "",
				cnpj,
				dataRegistro: editForm.dataRegistro ?? new Date().toLocaleDateString("pt-BR"),
				contato: editForm.contato ?? "",
				telefone: editForm.telefone ?? "",
				email,
			};
			setRows((prev) => [novo, ...prev]);
		} else {
			setRows((prev) =>
				prev.map((r) => (r.id === editingId ? ({ ...r, ...editForm, email, cnpj } as Cliente) : r))
			);
		}
		setEditingId(null);
		setEditForm({});
		setErrors({});
	}

	function handleAdd() {
		setEditingId(0);
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

	function handlePrint() {
		window.print();
	}

	/* ====== LISTA MOBILE ====== */
	const MobileList = () => (
		<ul className="sm:hidden space-y-3">
			{pageData.map((r) => (
				<li key={r.id} className="rounded-xl border bg-white p-4 shadow">
					{/* header do card com ações à direita */}
					<div className="flex items-start gap-3">
						<div className="min-w-0 flex-1">
							<div className="text-sm text-gray-500">Código {r.codigo}</div>
							<div className="font-medium text-gray-900 break-words">{r.razaoSocial}</div>
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

					{/* conteúdo */}
					<div className="mt-2 grid grid-cols-1 gap-1 text-sm text-gray-700">
						<div><span className="text-gray-500">CNPJ:</span> {formatCNPJ(r.cnpj)}</div>
						<div><span className="text-gray-500">Data:</span> {r.dataRegistro}</div>
						<div><span className="text-gray-500">Contato:</span> {r.contato}</div>
						<div><span className="text-gray-500">Telefone:</span> {formatPhone(r.telefone)}</div>
						<div className="break-all">
							<span className="text-gray-500">Email:</span>{" "}
							{isValidEmail(r.email) ? (
								<a href={`mailto:${r.email}`} className="underline underline-offset-2">{r.email}</a>
							) : (
								<span className="text-gray-400">—</span>
							)}
						</div>
					</div>
				</li>
			))}
			{pageData.length === 0 && (
				<li className="rounded-xl border bg-white p-8 text-center text-gray-500">Nenhum registro encontrado.</li>
			)}
		</ul>
	);

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="flex">
				{/* sidebar (desktop) */}
				<aside className="hidden sm:flex sm:flex-col sm:w-64 sm:min-h-screen sm:sticky sm:top-0 sm:bg-white sm:shadow sm:border-r">
					<div className="bg-gradient-to-r from-blue-700 to-blue-500 p-4 text-white">
						<div className="flex items-center gap-3">
							<div className="font-semibold flex-1 text-center">AWSRegistro | Painel</div>
						</div>
					</div>

					<nav className="flex-1 p-3">
						<a href="/clientes" className="mb-1 flex font-semibold items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-900 bg-blue-50 border border-blue-200">
							<span>Clientes</span>
							<span className="text-xs text-blue-600"></span>
						</a>
						<a href="/controle-sistema" className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Controle de Sistema</a>
						<a href="#" className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Controle Registro</a>
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
					<div className="fixed inset-0 z-40 sm:hidden" aria-hidden="true" onClick={() => setOpenSidebar(false)}>
						<div className="absolute inset-0 bg-black/40" />
						<div
							className="absolute left-0 top-0 h-full w-64 bg-white shadow-lg"
							onClick={(e) => e.stopPropagation()}
							role="dialog"
						>
							<div className="bg-gradient-to-r from-blue-700 to-blue-500 p-4 text-white">
								<div className="font-semibold text-center">AWSRegistro | Painel</div>
							</div>
							<nav className="p-3">
								<a href="/clientes" className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 bg-blue-50 border border-blue-200">
									<span>Clientes</span>
								</a>
								<a href="/controle-sistema" className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Controle de Sistema</a>
								<a href="#" className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Controle Registro</a>
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
						<div className="ml-1 flex-1 text-center font-semibold text-white">AWSRegistro | Clientes</div>
					</div>

					<main className="mx-auto max-w-7xl p-4 md:p-6">
						{/* busca + ações (mobile e desktop separados) */}
						<div className="mb-4 space-y-2">
							{/* MOBILE: input + botões compactos */}
							<div className="flex flex-wrap items-center gap-2 sm:hidden w-full">
								<input
									type="text"
									placeholder="Pesquisa rápida"
									value={query}
									onChange={(e) => { setQuery(e.target.value); setPage(1); }}
									className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 placeholder:text-gray-500 text-md shadow"
								/>
								<button
									onClick={handleAdd}
									className="inline-flex items-center bg-white border border-gray-200 justify-center w-10 h-10 rounded-lg text-white shadow transform transition-transform hover:scale-105"
									title="Adicionar"
									aria-label="Adicionar"
								>
									➕
								</button>
								<button
									onClick={handleExport}
									className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white text-blue-600 shadow transform transition-transform hover:scale-105"
									title="Exportar CSV"
									aria-label="Exportar CSV"
								>
									⬇️
								</button>
							</div>

							{/* DESKTOP: mantém botões com texto */}
							<div className="hidden sm:flex sm:items-center sm:justify-between">
								<div className="flex w-full items-center gap-2">
									<input
										type="text"
										placeholder="Pesquisa rápida"
										value={query}
										onChange={(e) => { setQuery(e.target.value); setPage(1); }}
										className="rounded-xl w-full sm:w-72 rounded-xl border border-gray-200 placeholder:text-gray-500 bg-white px-3 py-2 text-md text-gray-600 shadow"
									/>
									<button
										onClick={handleAdd}
										className="rounded-xl px-3 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-600 shadow transform transition-transform hover:scale-105"
										title="Adicionar"
										aria-label="Adicionar"
									>
										➕ Adicionar
									</button>
									<button
										onClick={handleExport}
										className="rounded-xl px-3 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-600 shadow transform transition-transform hover:scale-105"
										title="Exportar"
										aria-label="Exportar"
									>
										⬇️ Exportar CSV
									</button>
								</div>
							</div>
						</div>

						{/* LISTA MOBILE */}
						<MobileList />

						{/* TABELA (sm+) */}
						<div className="hidden sm:block rounded-xl bg-white shadow overflow-hidden">
							<div className="w-full overflow-x-auto">
								<table className="min-w-full border-separate border-spacing-0 text-sm">
									<thead>
										<tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
											<th className="px-3 py-3 w-28 text-center whitespace-nowrap">Ações</th>
											<th className="px-3 py-3 w-20 text-center whitespace-nowrap cursor-pointer" onClick={() => toggleSort("codigo")}>
												Código {sortKey === "codigo" ? (sortDir === "asc" ? "▲" : "▼") : ""}
											</th>
											<th className="px-3 py-3 text-center whitespace-nowrap cursor-pointer" onClick={() => toggleSort("razaoSocial")}>
												Razão Social {sortKey === "razaoSocial" ? (sortDir === "asc" ? "▲" : "▼") : ""}
											</th>
											<th className="px-3 py-3 text-center whitespace-nowrap cursor-pointer" onClick={() => toggleSort("cnpj")}>
												CNPJ {sortKey === "cnpj" ? (sortDir === "asc" ? "▲" : "▼") : ""}
											</th>
											<th className="px-3 py-3 text-center whitespace-nowrap cursor-pointer" onClick={() => toggleSort("dataRegistro")}>
												Data Registro {sortKey === "dataRegistro" ? (sortDir === "asc" ? "▲" : "▼") : ""}
											</th>
											<th className="px-3 py-3 text-center whitespace-nowrap cursor-pointer" onClick={() => toggleSort("contato")}>
												Contato {sortKey === "contato" ? (sortDir === "asc" ? "▲" : "▼") : ""}
											</th>
											<th className="px-3 py-3 text-center whitespace-nowrap cursor-pointer" onClick={() => toggleSort("telefone")}>
												Telefone {sortKey === "telefone" ? (sortDir === "asc" ? "▲" : "▼") : ""}
											</th>
											<th className="px-3 py-3 text-center whitespace-nowrap cursor-pointer" onClick={() => toggleSort("email")}>
												Email {sortKey === "email" ? (sortDir === "asc" ? "▲" : "▼") : ""}
											</th>
										</tr>
									</thead>

									<tbody className="text-gray-900">
										{pageData.map((r, idx) => (
											<tr key={r.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-100"}>
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

												<td className="px-3 py-3 whitespace-nowrap text-center tabular-nums">{r.codigo}</td>

												<td className="px-3 py-3 text-center max-w-[18rem] truncate" title={r.razaoSocial}>
													{r.razaoSocial}
												</td>

												<td className="px-3 py-3 whitespace-nowrap text-center">{formatCNPJ(r.cnpj)}</td>
												<td className="px-3 py-3 whitespace-nowrap text-center">{r.dataRegistro}</td>
												<td className="px-3 py-3 whitespace-nowrap text-center">{r.contato}</td>
												<td className="px-3 py-3 whitespace-nowrap text-center">{formatPhone(r.telefone)}</td>
												<td className="px-3 py-3 whitespace-nowrap text-center">
													{isValidEmail(r.email) ? (
														<a href={`mailto:${r.email}`} className="underline-offset-2 hover:underline">
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
												<td className="px-3 py-8 text-center text-gray-500" colSpan={8}>
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
							<div className="flex items-center gap-2" role="navigation" aria-label="Paginação">
								<button
									className="flex text-sm items-center justify-center rounded-xl border border-gray-200 bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110"
									onClick={() => setPage(1)}
									disabled={page === 1}
									aria-label="Primeira página"
								>
									◀◀
								</button>
								<button
									className="flex text-sm items-center justify-center rounded-xl border border-gray-200 bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
									aria-label="Página anterior"
								>
									◀
								</button>
								<button
									className="flex text-sm items-center justify-center rounded-xl border border-gray-200 bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110"
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={page === totalPages}
									aria-label="Próxima página"
								>
									▶
								</button>
								<button
									className="flex text-sm items-center justify-center rounded-xl border border-gray-200 bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110"
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

			{/* popup adicionar/editar */}
			{editingId !== null && (
				<div
					className="fixed inset-0 z-50"
					role="dialog"
					aria-modal="true"
					aria-label={editingId === 0 ? "Adicionar Cliente" : "Editar Cliente"}
				>
					{/* backdrop */}
					<div className="absolute inset-0 bg-black/50" />

					{/* wrapper: full-screen no mobile, centralizado no desktop */}
					<div className="absolute inset-0 flex items-stretch sm:items-center justify-center p-0 sm:p-3">
						{/* card: ocupa a tela no mobile; no desktop vira caixa centralizada */}
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
											onChange={(e) => setEditForm((prev) => ({ ...prev, codigo: Number(e.target.value) }))}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										/>
									</label>

									<label className="text-sm">
										<span className="mb-1 block text-black">Razão Social</span>
										<input
											type="text"
											value={editForm.razaoSocial ?? ""}
											onChange={(e) => setEditForm((prev) => ({ ...prev, razaoSocial: e.target.value }))}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										/>
									</label>

									<label className="text-sm">
										<span className="mb-1 block text-black">CNPJ</span>
										<input
											type="text"
											value={editForm.cnpj ?? ""}
											onChange={(e) => {
												const digits = e.target.value.replace(/\D/g, "").slice(0, 14);
												setEditForm((prev) => ({ ...prev, cnpj: digits }));
												if (!digits) setErrors((prev) => ({ ...prev, cnpj: "CNPJ é obrigatório." }));
												else if (!isValidCNPJ(digits)) setErrors((prev) => ({ ...prev, cnpj: "CNPJ inválido." }));
												else setErrors((prev) => ({ ...prev, cnpj: undefined }));
											}}
											onBlur={() => {
												setEditForm((prev) => ({ ...prev, cnpj: formatCNPJ(prev.cnpj ?? "") }));
											}}
											className={`w-full rounded border px-3 py-2 text-sm ${errors.cnpj ? "border-red-500" : "border-gray-300"} text-black`}
										/>
										{errors.cnpj && <p className="mt-1 text-xs text-red-600">{errors.cnpj}</p>}
									</label>

									<label className="text-sm">
										<span className="mb-1 block text-black">Data Registro</span>
										<input
											type="text"
											value={editForm.dataRegistro ?? ""}
											onChange={(e) => setEditForm((prev) => ({ ...prev, dataRegistro: e.target.value }))}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
											placeholder="dd/mm/aaaa"
										/>
									</label>

									<label className="text-sm">
										<span className="mb-1 block text-black">Contato</span>
										<input
											type="text"
											value={editForm.contato ?? ""}
											onChange={(e) => setEditForm((prev) => ({ ...prev, contato: e.target.value }))}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										/>
									</label>

									<label className="text-sm">
										<span className="mb-1 block text-black">Telefone</span>
										<input
											type="text"
											value={editForm.telefone ?? ""}
											onChange={(e) => setEditForm((prev) => ({ ...prev, telefone: e.target.value }))}
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
												if (!v) setErrors((prev) => ({ ...prev, email: "Email é obrigatório." }));
												else if (!isValidEmail(v)) setErrors((prev) => ({ ...prev, email: "Email inválido." }));
												else setErrors((prev) => ({ ...prev, email: undefined }));
											}}
											className={`w-full rounded border px-3 py-2 text-sm ${errors.email ? "border-red-500" : "border-gray-300"} text-black`}
										/>
										{errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
									</label>
								</div>

								<div className="mt-6 flex justify-end gap-2">
									<button onClick={handleEditCancel} className="rounded-xl bg-red-400 px-4 py-2 text-white hover:bg-red-500 transform transition-transform hover:scale-105">Cancelar</button>
									<button onClick={handleEditSave} className="rounded-xl bg-green-500 px-4 py-2 text-white hover:bg-green-600 transform transition-transform hover:scale-105">Salvar</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

"use client";

import { useMemo, useState, useEffect } from "react";
import { toCSV, downloadCSV, toCSVControleSistema } from "../../helpers/export";

/* ------------ base de clientes (para o select) ----------- */
type ClienteBase = { id: number; nome: string; };
const clientes: ClienteBase[] = [
	{ id: 1, nome: "CACAU SUL COMERCIO ATACADISTA EIRELI" },
	{ id: 2, nome: "WKS EXPORTACOES LTDA" },
	{ id: 3, nome: "ALLWARE TESTE" },
	{ id: 4, nome: "ALLWARE TESTE (2)" },
	{ id: 5, nome: "ROBSON PASSOS BARBOSA (TESTE GIUCAFE LOCAL)" },
	{ id: 6, nome: "AGRO NORTE ARMAZENS GERAIS LTDA" },
	{ id: 7, nome: "B.M. ARMAZENS GERAIS LTDA" },
];

/* ------------ opções de sistemas ----------- */
const sistemas = ["SACEX"] as const;

type StatusContrato =
	| "Regular"
	| "Irregular (Sem Restrição)"
	| "Irregular (Contrato Cancelado)"
	| "Irregular (Com Restrição)";

type ControleSistema = {
	id: number;
	clienteId: number;
	sistema: string;
	qtdLicenca: number;
	qtdDiaLiberacao: number;
	status: StatusContrato;
};

/* ------------ seed ----------- */
const seed: ControleSistema[] = clientes.map((c, idx) => {
	const sist = sistemas[idx % sistemas.length];
	const lic = [5, 3, 12, 8, 2, 10, 6][idx % 7];
	const dias = [31, 15, 7, 10, 20, 5, 30][idx % 7];
	const statusPool: StatusContrato[] = [
		"Regular",
		"Irregular (Sem Restrição)",
		"Irregular (Contrato Cancelado)",
		"Irregular (Com Restrição)",
	];
	return {
		id: 100 + idx,
		clienteId: c.id,
		sistema: sist,
		qtdLicenca: lic,
		qtdDiaLiberacao: dias,
		status: statusPool[idx % statusPool.length],
	};
});

/* ---------------------- helpers -------------------------- */
function nomeCliente(id: number) {
	return clientes.find(c => c.id === id)?.nome ?? "—";
}

/* --------------------- componente ------------------------ */
export default function ControleDeSistemaPage() {
	/* tabela e filtros */
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);
	const [rows, setRows] = useState<ControleSistema[]>(seed);

	/* ordenação */
	type SortKey = keyof Pick<ControleSistema, "sistema" | "qtdLicenca" | "qtdDiaLiberacao" | "status"> | "cliente";
	type SortDir = "asc" | "desc" | null;
	const [sortKey, setSortKey] = useState<SortKey | null>(null);
	const [sortDir, setSortDir] = useState<SortDir>(null);

	/* popup */
	const [editingId, setEditingId] = useState<number | null>(null); // 0 = novo
	const [form, setForm] = useState<Partial<ControleSistema>>({});

	/* sidebar mobile */
	const [openSidebar, setOpenSidebar] = useState(false);

	/* trava/destrava scroll do fundo quando modal abre/fecha */
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
		else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
		else setSortDir("asc");
	}

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		let data = rows.filter(r =>
			[
				nomeCliente(r.clienteId),
				r.sistema,
				String(r.qtdLicenca),
				String(r.qtdDiaLiberacao),
				r.status,
			].join(" ").toLowerCase().includes(q)
		);

		if (sortKey && sortDir) {
			data = [...data].sort((a, b) => {
				let va = "";
				let vb = "";
				if (sortKey === "cliente") {
					va = nomeCliente(a.clienteId).toLowerCase();
					vb = nomeCliente(b.clienteId).toLowerCase();
				} else {
					va = String(a[sortKey] ?? "").toLowerCase();
					vb = String(b[sortKey] ?? "").toLowerCase();
				}
				if (va < vb) return sortDir === "asc" ? -1 : 1;
				if (va > vb) return sortDir === "asc" ? 1 : -1;
				return 0;
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

	/* ------------------- ações ------------------- */
	function handleAdd() {
		setEditingId(0);
		setForm({
			clienteId: clientes[0]?.id,
			sistema: sistemas[0],
			qtdLicenca: 0,
			qtdDiaLiberacao: 0,
			status: "Regular",
		});
	}

	function handleEdit(id: number) {
		const r = rows.find(x => x.id === id);
		if (!r) return;
		setEditingId(id);
		setForm({ ...r });
	}

	function handleDelete(id: number) {
		const alvo = rows.find(r => r.id === id);
		if (!window.confirm(`Tem certeza que deseja excluir o registro de "${nomeCliente(alvo?.clienteId ?? 0)}"?`)) return;
		setRows(prev => prev.filter(r => r.id !== id));
	}

	function handleCancel() {
		setEditingId(null);
		setForm({});
	}

	function handleSave() {
		/* validação simples */
		if (!form.clienteId || (form.sistema ?? "").trim() === "") {
			alert("Cliente e Sistema são obrigatórios.");
			return;
		}
		if ((form.qtdLicenca ?? 0) < 0 || (form.qtdDiaLiberacao ?? 0) < 0) {
			alert("Quantidade de licença e dias de liberação não podem ser negativos.");
			return;
		}

		if (editingId === 0) {
			const novo: ControleSistema = {
				id: Date.now(),
				clienteId: form.clienteId!,
				sistema: form.sistema!.trim(),
				qtdLicenca: Number(form.qtdLicenca ?? 0),
				qtdDiaLiberacao: Number(form.qtdDiaLiberacao ?? 0),
				status: (form.status ?? "Regular") as StatusContrato,
			};
			setRows(prev => [novo, ...prev]);
		} else {
			setRows(prev => prev.map(r => r.id === editingId
				? {
					...r,
					clienteId: form.clienteId!,
					sistema: form.sistema!.trim(),
					qtdLicenca: Number(form.qtdLicenca ?? 0),
					qtdDiaLiberacao: Number(form.qtdDiaLiberacao ?? 0),
					status: (form.status ?? "Regular") as StatusContrato,
				}
				: r
			));
		}
		setEditingId(null);
		setForm({});
	}

	function handleExport() {
		const csv = toCSVControleSistema(filtered, nomeCliente);
		const nome = `controle_sistema_${new Date().toISOString().slice(0, 10)}.csv`;
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
					{/* header com cliente + ações à direita */}
					<div className="flex items-start gap-3">
						<div className="min-w-0 flex-1">
							<div className="font-medium text-gray-900 break-words">{nomeCliente(r.clienteId)}</div>
							<div className="text-sm text-gray-500">{r.sistema}</div>
						</div>
						<div className="flex items-start gap-1">
							<button
								onClick={() => handleEdit(r.id)}
								className="inline-flex items-center justify-center rounded-xl bg-yellow-400 w-7 h-7 text-white font-semibold hover:bg-yellow-500 transition-transform transform hover:scale-110"
								aria-label={`Editar ${nomeCliente(r.clienteId)}`}
								title="Editar"
							>
								✎
							</button>
							<button
								onClick={() => handleDelete(r.id)}
								className="inline-flex items-center justify-center rounded-xl bg-red-500 w-7 h-7 text-white font-semibold hover:bg-red-600 transition-transform transform hover:scale-110"
								aria-label={`Excluir ${nomeCliente(r.clienteId)}`}
								title="Excluir"
							>
								✖
							</button>
						</div>
					</div>

					{/* conteúdo */}
					<div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700">
						<div><span className="text-gray-500">Licenças:</span> {r.qtdLicenca}</div>
						<div><span className="text-gray-500">Dias Lib.:</span> {r.qtdDiaLiberacao}</div>
						<div className="col-span-2"><span className="text-gray-500">Status:</span> {r.status}</div>
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
						<a href="/clientes" className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Clientes</a>
						<a href="/controle-sistema" className="mb-1 flex font-semibold items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-900 bg-blue-50 border border-blue-200">
							<span>Controle de Sistema</span>
						</a>
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
							aria-label="Menu"
						>
							<div className="bg-gradient-to-r from-blue-700 to-blue-500 p-4 text-white">
								<div className="font-semibold">AWSRegistro | Painel</div>
							</div>
							<nav className="p-3">
								<a href="/clientes" className="mb-1 block font-semibold rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Clientes</a>
								<a href="/controle-sistema" className="mb-1 flex items-center justify-between rounded-lg px-3 py-2 font-semibold text-gray-900 bg-blue-50 border border-blue-200">
									<span>Controle de Sistema</span>
								</a>
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
						<div className="ml-1 flex-1 text-center font-semibold text-white">AWSRegistro | Painel</div>
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
									className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-700 shadow transform transition-transform hover:scale-105"
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

							{/* DESKTOP: input + botões com texto */}
							<div className="hidden sm:flex sm:items-center sm:justify-between">
								<div className="flex w-full items-center gap-2">
									<input
										type="text"
										placeholder="Pesquisa rápida"
										value={query}
										onChange={(e) => { setQuery(e.target.value); setPage(1); }}
										className="w-full sm:w-72 rounded-xl border border-gray-200 bg-white px-3 py-2 text-md text-gray-600 placeholder:text-gray-500 shadow"
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
											<th className="px-3 py-3 text-center whitespace-nowrap cursor-pointer" onClick={() => toggleSort("cliente")}>
												Cliente {sortKey === "cliente" ? (sortDir === "asc" ? "▲" : "▼") : ""}
											</th>
											<th className="px-3 py-3 text-center whitespace-nowrap cursor-pointer" onClick={() => toggleSort("sistema")}>
												Sistema {sortKey === "sistema" ? (sortDir === "asc" ? "▲" : "▼") : ""}
											</th>
											<th className="px-3 py-3 text-center whitespace-nowrap cursor-pointer" onClick={() => toggleSort("qtdLicenca")}>
												Qtd. Licença {sortKey === "qtdLicenca" ? (sortDir === "asc" ? "▲" : "▼") : ""}
											</th>
											<th className="px-3 py-3 text-center whitespace-nowrap cursor-pointer" onClick={() => toggleSort("qtdDiaLiberacao")}>
												Qtd. Dia Liberação {sortKey === "qtdDiaLiberacao" ? (sortDir === "asc" ? "▲" : "▼") : ""}
											</th>
											<th className="px-3 py-3 text-center whitespace-nowrap cursor-pointer" onClick={() => toggleSort("status")}>
												Status {sortKey === "status" ? (sortDir === "asc" ? "▲" : "▼") : ""}
											</th>
										</tr>
									</thead>

									<tbody className="text-gray-900">
										{pageData.map((r, idx) => (
											<tr key={r.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-100"}>
												<td className="px-3 py-3">
													<div className="flex items-center justify-center gap-2">
														<button
															onClick={() => handleEdit(r.id)}
															className="rounded-xl bg-yellow-400 text-white font-semibold w-7 h-7 hover:bg-yellow-500 transition-transform transform hover:scale-110"
															title="Editar"
															aria-label={`Editar ${nomeCliente(r.clienteId)}`}
														>
															✎
														</button>
														<button
															onClick={() => handleDelete(r.id)}
															className="rounded-xl bg-red-500 text-white font-semibold w-7 h-7 hover:bg-red-600 transition-transform transform hover:scale-110"
															title="Excluir"
															aria-label={`Excluir ${nomeCliente(r.clienteId)}`}
														>
															✖
														</button>
													</div>
												</td>

												<td className="px-3 py-3 text-center max-w-[18rem] truncate" title={nomeCliente(r.clienteId)}>
													{nomeCliente(r.clienteId)}
												</td>
												<td className="px-3 py-3 whitespace-nowrap text-center">{r.sistema}</td>
												<td className="px-3 py-3 whitespace-nowrap text-center">{r.qtdLicenca}</td>
												<td className="px-3 py-3 whitespace-nowrap text-center">{r.qtdDiaLiberacao}</td>
												<td className="px-3 py-3 whitespace-nowrap text-center">{r.status}</td>
											</tr>
										))}

										{pageData.length === 0 && (
											<tr>
												<td className="px-3 py-8 text-center text-gray-500" colSpan={6}>
													Nenhum registro encontrado.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>

						{/* Paginação */}
						<div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-black">
							<div className="text-sm text-gray-700">
								{filtered.length} registro(s) • Página {page} de {totalPages}
							</div>
							<div className="flex items-center gap-2" role="navigation" aria-label="Paginação">
								<button
									className="rounded-xl border border-gray-200 bg-white text-blue-500 px-2 py-2 w-9 h-9 text-sm shadow-sm transform transition-transform hover:scale-110"
									onClick={() => setPage(1)}
									disabled={page === 1}
									aria-label="Primeira página"
								>
									⏪
								</button>
								<button
									className="rounded-xl border border-gray-200 bg-white text-blue-500 px-2 py-2 w-9 h-9 text-sm shadow-sm transform transition-transform hover:scale-110"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
									aria-label="Página anterior"
								>
									◀
								</button>
								<button
									className="rounded-xl border border-gray-200 bg-white text-blue-500 px-2 py-2 w-9 h-9 text-sm shadow-sm transform transition-transform hover:scale-110"
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={page === totalPages}
									aria-label="Próxima página"
								>
									▶
								</button>
								<button
									className="rounded-xl border border-gray-200 bg-white text-blue-500 px-2 py-2 w-9 h-9 text-sm shadow-sm transform transition-transform hover:scale-110"
									onClick={() => setPage(totalPages)}
									aria-label="Última página"
								>
									⏩
								</button>
							</div>
						</div>
					</main>
				</div>
			</div>

			{/* -------------------- POPUP -------------------- */}
			{editingId !== null && (
				<div
					className="fixed inset-0 z-50"
					role="dialog"
					aria-modal="true"
					aria-label={editingId === 0 ? "Adicionar Registro" : "Editar Registro"}
				>
					{/* backdrop */}
					<div className="absolute inset-0 bg-black/50" />

					{/* wrapper full-screen no mobile; centralizado no desktop */}
					<div className="absolute inset-0 flex items-stretch sm:items-center justify-center p-0 sm:p-3">
						{/* card: ocupa toda a tela no mobile e rola internamente */}
						<div className="h-full w-full sm:h-auto sm:w-full sm:max-w-2xl rounded-none sm:rounded-xl bg-white shadow-lg overflow-y-auto">
							<h2 className="sticky top-0 z-10 px-6 py-4 text-xl font-semibold text-blue-700 bg-white border-b">
								{editingId === 0 ? "Adicionar Registro" : "Editar Registro"}
							</h2>

							<div className="p-6">
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<label className="text-sm md:col-span-2">
										<span className="mb-1 block text-black">Cliente *</span>
										<select
											value={form.clienteId ?? clientes[0]?.id}
											onChange={(e) => setForm(prev => ({ ...prev, clienteId: Number(e.target.value) }))}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										>
											{clientes.map(c => (
												<option key={c.id} value={c.id}>{c.nome}</option>
											))}
										</select>
									</label>

									<label className="text-sm md:col-span-2">
										<span className="mb-1 block text-black">Sistema *</span>
										<select
											value={form.sistema ?? sistemas[0]}
											onChange={(e) => setForm(prev => ({ ...prev, sistema: e.target.value }))}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										>
											{sistemas.map(s => (
												<option key={s} value={s}>{s}</option>
											))}
										</select>
									</label>

									<label className="text-sm">
										<span className="mb-1 block text-black">Qtd. Licença *</span>
										<input
											type="number"
											value={String(form.qtdLicenca ?? 0)}
											onChange={(e) => setForm(prev => ({ ...prev, qtdLicenca: Number(e.target.value) }))}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
											min={0}
										/>
									</label>

									<label className="text-sm">
										<span className="mb-1 block text-black">Qtd. Dia Liberação *</span>
										<input
											type="number"
											value={String(form.qtdDiaLiberacao ?? 0)}
											onChange={(e) => setForm(prev => ({ ...prev, qtdDiaLiberacao: Number(e.target.value) }))}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
											min={0}
										/>
									</label>

									<label className="text-sm md:col-span-2">
										<span className="mb-2 block text-black">Status *</span>
										<div className="space-y-2 text-black">
											{(["Regular",
												"Irregular (Sem Restrição)",
												"Irregular (Contrato Cancelado)",
												"Irregular (Com Restrição)"] as StatusContrato[]).map(st => (
												<label key={st} className="flex items-center gap-2">
													<input
														type="radio"
														name="status"
														checked={(form.status ?? "Regular") === st}
														onChange={() => setForm(prev => ({ ...prev, status: st }))}
													/>
													<span>{st}</span>
												</label>
											))}
										</div>
									</label>
								</div>

								<div className="mt-6 flex justify-end gap-2">
									<button onClick={handleCancel} className="rounded-xl bg-red-400 px-4 py-2 text-white hover:bg-red-500 transform transition-transform hover:scale-105">Cancelar</button>
									<button onClick={handleSave} className="rounded-xl bg-green-500 px-4 py-2 text-white hover:bg-green-600 transform transition-transform hover:scale-105">Gravar</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
			{/* ------------------------------------------------ */}
		</div>
	);
}

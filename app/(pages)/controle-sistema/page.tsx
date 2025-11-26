"use client";

import { useMemo, useState, useEffect } from "react";
import { downloadCSV, toCSVControleSistema } from "../../helpers/export";
import Sidebar from "@/app/components/Sidebar";

/* ------------ tipos básicos ----------- */
type ClienteBase = { id: number; nome: string };

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
	sistema: string;
	qtdLicenca: number;
	qtdDiaLiberacao: number;
	status: StatusContrato | string;
	qtdBanco?: number;
	qtdCnpj?: number;
	ipMblock?: string | null;
	portaMblock?: string | null;
	observacao?: string | null;
};

export default function ControleDeSistemaPage() {
	/* tabela e filtros */
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);
	const [rows, setRows] = useState<ControleSistema[]>([]);

	/* clientes */
	const [clientes, setClientes] = useState<ClienteBase[]>([]);

	/* sistemas (do banco) */
	const [sistemas, setSistemas] = useState<Sistema[]>([]);

	/* ordenação */
	type SortKey =
		| keyof Pick<
				ControleSistema,
				"sistema" | "qtdLicenca" | "qtdDiaLiberacao" | "status"
		  >
		| "cliente";
	type SortDir = "asc" | "desc" | null;
	const [sortKey, setSortKey] = useState<SortKey | null>(null);
	const [sortDir, setSortDir] = useState<SortDir>(null);

	/* popup */
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState<Partial<ControleSistema>>({});

	/* helper nome do cliente */
	const nomeCliente = (id: number) =>
		clientes.find((c) => c.id === id)?.nome ?? "—";

	/* trava scroll quando modal abre */
	useEffect(() => {
		document.body.style.overflow = editingId !== null ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [editingId]);

	/* carregar dados */
	async function loadClientes() {
		try {
			const resp = await fetch("/api/clientes", { cache: "no-store" });
			const json = await resp.json();

			if (json?.ok && Array.isArray(json.data)) {
				setClientes(
					json.data.map((c: any) => ({
						id: c.id,
						nome: c.razaoSocial,
					}))
				);
			}
		} catch (e) {
			console.error("Erro ao carregar clientes:", e);
		}
	}

	async function loadSistemas() {
		try {
			const resp = await fetch("/api/cadastro-sistema", {
				cache: "no-store",
			});
			const json = await resp.json();

			if (Array.isArray(json)) setSistemas(json);
			else if (json?.data) setSistemas(json.data);
		} catch (e) {
			console.error("Erro ao carregar sistemas:", e);
		}
	}

	async function loadRows() {
		try {
			const resp = await fetch("/api/controle-sistema", {
				cache: "no-store",
			});
			const json = await resp.json();

			if (json?.ok && Array.isArray(json.data)) {
				setRows(json.data);
			}
		} catch (e) {
			console.error("Erro ao carregar controle-sistema:", e);
			alert("Não foi possível carregar o Controle de Sistema.");
		}
	}

	useEffect(() => {
		loadClientes();
		loadSistemas();
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
				let va = "";
				let vb = "";

				if (sortKey === "cliente") {
					va = nomeCliente(a.clienteId).toLowerCase();
					vb = nomeCliente(b.clienteId).toLowerCase();
				} else {
					const k = sortKey as Exclude<SortKey, "cliente">;
					va = String(a[k] ?? "").toLowerCase();
					vb = String(b[k] ?? "").toLowerCase();
				}

				if (va < vb) return sortDir === "asc" ? -1 : 1;
				if (va > vb) return sortDir === "asc" ? 1 : -1;
				return 0;
			});
		}

		return data;
	}, [rows, query, sortKey, sortDir, clientes]);

	const totalPages = Math.max(
		1,
		Math.ceil(filtered.length / pageSize)
	);
	const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

	useEffect(
		() => setPage((p) => Math.min(p, totalPages)),
		[totalPages]
	);

	/* ações */
	function handleAdd() {
		const clienteId = clientes[0]?.id;
		const sistemaNome = sistemas[0]?.nome ?? "";

		setEditingId(0);
		setForm({
			clienteId,
			sistema: sistemaNome,
			qtdLicenca: 0,
			qtdDiaLiberacao: 0,
			qtdBanco: 0,
			qtdCnpj: 0,
			ipMblock: "",
			portaMblock: "",
			observacao: "",
			status: "Regular",
		});
	}

	function handleEdit(id: number) {
		const r = rows.find((x) => x.id === id);
		if (!r) return;

		setEditingId(id);
		setForm({
			...r,
			qtdBanco: r.qtdBanco ?? 0,
			qtdCnpj: r.qtdCnpj ?? 0,
			ipMblock: r.ipMblock ?? "",
			portaMblock: r.portaMblock ?? "",
			observacao: r.observacao ?? "",
		});
	}

	async function handleDelete(id: number) {
		const alvo = rows.find((r) => r.id === id);

		if (
			!window.confirm(
				`Excluir registro do cliente "${nomeCliente(
					alvo?.clienteId ?? 0
				)}"?`
			)
		)
			return;

		try {
			const resp = await fetch(`/api/controle-sistema/${id}`, {
				method: "DELETE",
			});
			if (!resp.ok) throw new Error();
			await loadRows();
		} catch {
			alert("Erro ao excluir registro.");
		}
	}

	function handleCancel() {
		setEditingId(null);
		setForm({});
	}

	async function handleSave() {
		if (!form.clienteId || !form.sistema?.trim()) {
			alert("Cliente e Sistema são obrigatórios.");
			return;
		}

		const payload = {
			clienteId: form.clienteId!,
			sistema: form.sistema!,
			qtdLicenca: Number(form.qtdLicenca ?? 0),
			qtdDiaLiberacao: Number(form.qtdDiaLiberacao ?? 0),
			qtdBanco: Number(form.qtdBanco ?? 0),
			qtdCnpj: Number(form.qtdCnpj ?? 0),
			ipMblock: form.ipMblock ?? "",
			portaMblock: form.portaMblock ?? "",
			observacao: form.observacao ?? "",
			status: (form.status ?? "Regular") as StatusContrato,
		};

		try {
			if (editingId === 0) {
				await fetch("/api/controle-sistema", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
			} else {
				await fetch(`/api/controle-sistema/${editingId}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
			}

			setEditingId(null);
			setForm({});
			await loadRows();
		} catch {
			alert("Erro ao salvar registro.");
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
			{pageData.map((r) => (
				<li
					key={r.id}
					className="rounded-xl border bg-white p-4 shadow"
				>
					<div className="flex items-start gap-3">
						<div className="flex-1 min-w-0">
							<div className="font-medium text-gray-900 break-words">
								{nomeCliente(r.clienteId)}
							</div>
							<div className="text-sm text-gray-500">
								{r.sistema}
							</div>
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
							<span className="text-gray-500">Licenças:</span>{" "}
							{r.qtdLicenca}
						</div>
						<div>
							<span className="text-gray-500">Dias Lib.:</span>{" "}
							{r.qtdDiaLiberacao}
						</div>
						<div className="col-span-2">
							<span className="text-gray-500">Status:</span>{" "}
							{r.status}
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
				{/* SIDEBAR PADRÃO */}
				<Sidebar active="controle-sistema" />

				{/* ÁREA PRINCIPAL */}
				<div className="flex-1">
					{/* topo mobile padronizado */}
					<div className="sticky top-0 z-20 sm:hidden bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 border-b text-center font-semibold text-white">
						Controle de Sistema
					</div>

					<main className="mx-auto max-w-7xl p-4 md:p-6">
						{/* BUSCA + BOTÕES */}
						<div className="mb-4 space-y-2">
							{/* mobile */}
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

							{/* desktop */}
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

						{/* LISTA MOBILE */}
						<MobileList />

						{/* TABELA DESKTOP */}
						<div className="hidden sm:block rounded-xl bg-white shadow overflow-hidden">
							<div className="w-full overflow-x-auto">
								<table className="min-w-full border-separate border-spacing-0 text-sm">
									<thead>
										<tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
											<th className="px-3 py-3 w-28 text-center whitespace-nowrap">
												Ações
											</th>
											<th
												className="px-3 py-3 cursor-pointer text-center whitespace-nowrap"
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
												className="px-3 py-3 cursor-pointer text-center whitespace-nowrap"
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
												className="px-3 py-3 cursor-pointer text-center whitespace-nowrap"
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
												className="px-3 py-3 cursor-pointer text-center whitespace-nowrap"
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
												className="px-3 py-3 cursor-pointer text-center whitespace-nowrap"
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
												key={r.id}
												className={
													idx % 2 === 0
														? "bg-white"
														: "bg-gray-100"
												}
											>
												<td className="px-3 py-3">
													<div className="flex items-center justify-center gap-2">
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
													className="px-3 py-3 text-center truncate max-w-[18rem]"
													title={nomeCliente(r.clienteId)}
												>
													{nomeCliente(r.clienteId)}
												</td>

												<td className="px-3 py-3 text-center whitespace-nowrap">
													{r.sistema}
												</td>

												<td className="px-3 py-3 text-center whitespace-nowrap">
													{r.qtdLicenca}
												</td>

												<td className="px-3 py-3 text-center whitespace-nowrap">
													{r.qtdDiaLiberacao}
												</td>

												<td className="px-3 py-3 text-center whitespace-nowrap">
													{r.status}
												</td>
											</tr>
										))}

										{pageData.length === 0 && (
											<tr>
												<td
													colSpan={6}
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

						{/* paginação */}
						<div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-black">
							<div className="text-sm text-gray-700">
								{filtered.length} registro(s) • Página {page} de{" "}
								{totalPages}
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
									onClick={() =>
										setPage((p) =>
											Math.min(totalPages, p + 1)
										)
									}
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
					</main>
				</div>
			</div>

			{/* POPUP */}
			{editingId !== null && (
				<div className="fixed inset-0 z-50">
					<div className="absolute inset-0 bg-black/50" />

					<div className="absolute inset-0 flex items-stretch sm:items-center justify-center p-0 sm:p-3">
						<div className="h-full w-full sm:h-auto sm:w-full sm:max-w-2xl bg-white rounded-none sm:rounded-xl shadow-lg overflow-y-auto">
							<h2 className="sticky top-0 z-10 px-6 py-4 bg-white border-b text-xl font-semibold text-blue-700">
								{editingId === 0 ? "Adicionar Registro" : "Editar Registro"}
							</h2>

							<div className="p-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{/* CLIENTE */}
									<label className="text-sm md:col-span-2">
										<span className="block mb-1 text-black">Cliente *</span>
										<select
											value={form.clienteId ?? ""}
											onChange={(e) =>
												setForm((prev) => ({
													...prev,
													clienteId: Number(e.target.value),
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

									{/* SISTEMA */}
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

									{/* LICENÇA */}
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

									{/* LIBERAÇÃO */}
									<label className="text-sm">
										<span className="block mb-1 text-black">
											Qtd Dia Liberação *
										</span>
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

									{/* QTD BANCO */}
									<label className="text-sm">
										<span className="block mb-1 text-black">
											Qtd Bancos de Dados
										</span>
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

									{/* QTD CNPJ */}
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

									{/* CAMPOS MBLOCK */}
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

									{/* OBS */}
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

									{/* STATUS */}
									<label className="text-sm md:col-span-2">
										<span className="block mb-1 text-black">Status *</span>

										<div className="space-y-2 text-black">
											{([
												"Regular",
												"Irregular (Sem Restrição)",
												"Irregular (Contrato Cancelado)",
												"Irregular (Com Restrição)",
											] as StatusContrato[]).map((st) => (
												<label key={st} className="flex items-center gap-2">
													<input
														type="radio"
														name="status"
														checked={(form.status ?? "Regular") === st}
														onChange={() =>
															setForm((prev) => ({
																...prev,
																status: st,
															}))
														}
													/>
													<span>{st}</span>
												</label>
											))}
										</div>
									</label>
								</div>

								<div className="mt-6 flex justify-end gap-2">
									<button
										onClick={handleCancel}
										className="rounded-xl bg-red-400 px-4 py-2 text-white hover:bg-red-500 transform hover:scale-105"
									>
										Cancelar
									</button>
									<button
										onClick={handleSave}
										className="rounded-xl bg-green-500 px-4 py-2 text-white hover:bg-green-600 transform hover:scale-105"
									>
										Gravar
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

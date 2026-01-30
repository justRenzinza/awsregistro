"use client";

import { useState, useMemo, useEffect } from "react";
import Sidebar from "@/app/components/Sidebar";
import { backendFetch } from "@/lib/backend";

/* ---- tipos ---- */
type Sistema = {
	id: number;
	nome: string;
	chaveRegistro?: string;
};

type Cliente = {
	id: number;
	nome: string;
	cnpj: string;
	sistemas: Sistema[];
};

type RegistroGerado = {
	id: string;
	chaveEnviada: string;
	chaveRetornada: string;
	cliente: string;
	sistema: string;
	licencas: number;
	dataGeracao: string;
	dataValidade: string;
};

export default function ControleRegistroPage() {
	const [clientes, setClientes] = useState<Cliente[]>([]);
	const [sistemasDisponiveis, setSistemasDisponiveis] = useState<Sistema[]>([]);
	const [historico, setHistorico] = useState<RegistroGerado[]>([]);

	const [clienteSelecionado, setClienteSelecionado] = useState<number | null>(null);
	const [sistemaSelecionado, setSistemaSelecionado] = useState<number | null>(null);
	const [chaveSagram, setChaveSagram] = useState("");

	const [registroAtual, setRegistroAtual] = useState<RegistroGerado | null>(null);
	const [showModalBloqueio, setShowModalBloqueio] = useState(false);

	const [isLoading, setIsLoading] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);

	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize] = useState(10);

	/* Carregar clientes com sistemas */
	async function loadData() {
		try {
			setIsLoading(true);

			const clientesData = await backendFetch("/clientes?limit=1000&offset=0", {
				method: "GET",
			});

			let listaClientes: any[] = [];
			if (Array.isArray(clientesData)) {
				listaClientes = clientesData;
			} else if (clientesData && typeof clientesData === "object") {
				const d: any = clientesData;
				if (Array.isArray(d.data)) listaClientes = d.data;
				else if (Array.isArray(d.items)) listaClientes = d.items;
				else if (Array.isArray(d.result)) listaClientes = d.result;
			}

			const clientesMapeados: Cliente[] = listaClientes
				.map((c: any) => {
					const sistemas = Array.isArray(c?.sistemas) ? c.sistemas : [];
					
					return {
						id: Number(c?.id ?? 0),
						nome: String(c?.nome ?? ""),
						cnpj: String(c?.cnpj ?? c?.cpfCnpj ?? ""),
						sistemas: sistemas.map((s: any) => ({
							id: Number(s?.idSistema ?? s?.id ?? 0),
							nome: String(s?.nome ?? s?.sistema ?? ""),
							chaveRegistro: String(s?.chaveRegistro ?? s?.chave ?? ""),
						})),
					};
				})
				.filter((c) => c.id && c.nome && c.cnpj)
				.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

			setClientes(clientesMapeados);

			const sistemasData = await backendFetch("/sistema", { method: "GET" });

			let listaSistemas: any[] = [];
			if (Array.isArray(sistemasData)) {
				listaSistemas = sistemasData;
			} else if (sistemasData && typeof sistemasData === "object") {
				const d: any = sistemasData;
				if (Array.isArray(d.data)) listaSistemas = d.data;
				else if (Array.isArray(d.items)) listaSistemas = d.items;
			}

			const sistemasMapeados = listaSistemas
				.map((s: any) => ({
					id: Number(s?.id ?? s?.idSistema ?? 0),
					nome: String(s?.nome ?? s?.sistema ?? ""),
				}))
				.filter((s) => s.id && s.nome)
				.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

			setSistemasDisponiveis(sistemasMapeados);
		} catch (e) {
			console.error("Erro ao carregar dados:", e);
			alert("Erro ao carregar dados. Verifique sua conexão.");
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		loadData();
	}, []);

	/* Auto-preencher chave quando cliente/sistema mudar */
	useEffect(() => {
		if (!clienteSelecionado || !sistemaSelecionado) {
			setChaveSagram("");
			return;
		}

		const cliente = clientes.find((c) => c.id === clienteSelecionado);
		if (!cliente) return;

		const sistemaDoCliente = cliente.sistemas.find((s) => s.id === sistemaSelecionado);
		
		if (sistemaDoCliente?.chaveRegistro && sistemaDoCliente.chaveRegistro.trim()) {
			console.log("✅ Chave encontrada no cadastro:", sistemaDoCliente.chaveRegistro);
			setChaveSagram(sistemaDoCliente.chaveRegistro);
		} else {
			console.log("⚠️ Nenhuma chave cadastrada para este cliente/sistema");
			setChaveSagram("");
		}
	}, [clienteSelecionado, sistemaSelecionado, clientes]);

	/* Contar quantos sistemas têm chave */
	function contarChavesCliente(cliente: Cliente): number {
		return cliente.sistemas.filter((s) => s.chaveRegistro && s.chaveRegistro.trim()).length;
	}

	/* Obter cliente selecionado */
	const clienteAtual = clienteSelecionado 
		? clientes.find((c) => c.id === clienteSelecionado) 
		: null;

	/* Verificar se sistema tem chave cadastrada */
	const sistemaTemChave = clienteAtual && sistemaSelecionado
		? clienteAtual.sistemas.find((s) => s.id === sistemaSelecionado)?.chaveRegistro?.trim()
		: null;

	/* ✅ PROCESSAR REGISTRO COM CNPJ */
	async function handleProcessarRegistro() {
		if (!clienteSelecionado || !sistemaSelecionado) {
			alert("Selecione um cliente e um sistema.");
			return;
		}

		if (!chaveSagram.trim()) {
			alert("Digite a CHAVE do SAGRAM ou cadastre no sistema.");
			return;
		}

		const cliente = clientes.find((c) => c.id === clienteSelecionado);
		const sistema = sistemasDisponiveis.find((s) => s.id === sistemaSelecionado);

		if (!cliente || !sistema) return;

		if (!cliente.cnpj || !cliente.cnpj.trim()) {
			alert("Cliente não possui CNPJ cadastrado!");
			return;
		}

		try {
			setIsGenerating(true);

			const url = `/autenticacao/chaveAcesso/${cliente.cnpj}/${sistemaSelecionado}?chaveSagram=${encodeURIComponent(chaveSagram.trim())}`;

			console.log("🔑 Processando registro:");
			console.log("   - Cliente:", cliente.nome);
			console.log("   - CNPJ (idCliente):", cliente.cnpj);
			console.log("   - Sistema ID:", sistemaSelecionado);
			console.log("   - URL completa:", url);

			const response = await backendFetch(url, { method: "GET" });

			console.log("✅ Resposta da API:", response);

			const chaveRetornada = response?.chave ?? "";

			if (!chaveRetornada) {
				throw new Error("Resposta da API não contém chave");
			}

			const hoje = new Date();
			// Validade: 1 ano a partir de hoje
			const dataValidade = new Date(hoje);
			dataValidade.setFullYear(dataValidade.getFullYear() + 1);

			const novoRegistro: RegistroGerado = {
				id: `${Date.now()}-${Math.random()}`,
				chaveEnviada: chaveSagram.trim(),
				chaveRetornada: chaveRetornada,
				cliente: cliente.nome,
				sistema: sistema.nome,
				licencas: 1, // TODO: Pegar do backend ou permitir configurar
				dataGeracao: hoje.toLocaleDateString("pt-BR"),
				dataValidade: dataValidade.toLocaleDateString("pt-BR"),
			};

			setRegistroAtual(novoRegistro);
			setHistorico((prev) => [novoRegistro, ...prev]);

			// TODO: Salvar no backend quando endpoint estiver pronto
			// await backendFetch("/registros", {
			//     method: "POST",
			//     body: JSON.stringify(novoRegistro)
			// });

		} catch (error: any) {
			console.error("❌ Erro ao processar:", error);

			if (error?.status === 403 || error?.response?.status === 403) {
				setShowModalBloqueio(true);
			} else {
				const errorMsg = error?.message ?? error?.data?.message ?? "Erro desconhecido";
				alert(`Erro ao processar registro:\n${errorMsg}`);
			}
		} finally {
			setIsGenerating(false);
		}
	}

	/* Permitir Enter */
	function handleKeyPress(e: React.KeyboardEvent) {
		if (e.key === "Enter" && !isGenerating) {
			handleProcessarRegistro();
		}
	}

	/* filtragem do histórico */
	const filteredHistorico = useMemo(() => {
		const q = query.toLowerCase().trim();
		return historico.filter((h) =>
			[h.chaveEnviada, h.chaveRetornada, h.cliente, h.sistema, h.dataGeracao, h.dataValidade]
				.join(" ")
				.toLowerCase()
				.includes(q)
		);
	}, [historico, query]);

	const totalPages = Math.max(1, Math.ceil(filteredHistorico.length / pageSize));
	const pageData = filteredHistorico.slice((page - 1) * pageSize, page * pageSize);

	useEffect(() => setPage(1), [query]);

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="flex">
				<Sidebar active="controle-registro" />

				<div className="flex-1">
					<div className="sticky top-0 z-20 sm:hidden bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 border-b flex items-center justify-center">
						<div className="font-semibold text-white">Controle de Registro</div>
					</div>

					<main className="p-4 md:p-6 mx-auto max-w-7xl">
						{/* Card de geração */}
						<div className="mb-6 rounded-xl bg-white shadow p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4">
								Processar Chave de Registro
							</h2>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
								{/* Select Cliente */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Cliente *
									</label>
									<select
										value={clienteSelecionado ?? ""}
										onChange={(e) => {
											setClienteSelecionado(
												e.target.value ? Number(e.target.value) : null
											);
											setSistemaSelecionado(null);
										}}
										className="w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none"
									>
										<option value="">Selecione um cliente</option>
										{clientes.map((c) => {
											const numChaves = contarChavesCliente(c);
											return (
												<option key={c.id} value={c.id}>
													{numChaves > 0 ? `🔑 ${c.nome} (${numChaves} chave${numChaves > 1 ? 's' : ''})` : c.nome}
												</option>
											);
										})}
									</select>
								</div>

								{/* Select Sistema */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Sistema *
									</label>
									<select
										value={sistemaSelecionado ?? ""}
										onChange={(e) =>
											setSistemaSelecionado(
												e.target.value ? Number(e.target.value) : null
											)
										}
										disabled={!clienteSelecionado}
										className="w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
									>
										<option value="">Selecione um sistema</option>
										{sistemasDisponiveis.map((s) => {
											const temChave = clienteAtual?.sistemas.find((cs) => cs.id === s.id)?.chaveRegistro;
											return (
												<option key={s.id} value={s.id}>
													{temChave && temChave.trim() ? `🔑 ${s.nome}` : s.nome}
												</option>
											);
										})}
									</select>
								</div>

								{/* Info visual de sistemas do cliente */}
								{clienteAtual && (
									<div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
										<div className="text-sm text-blue-800">
											<span className="font-semibold">ℹ️ Sistemas deste cliente:</span>
											<div className="mt-2 space-y-1">
												{clienteAtual.sistemas.length === 0 ? (
													<div className="text-gray-600">Nenhum sistema vinculado</div>
												) : (
													clienteAtual.sistemas.map((s) => (
														<div key={s.id} className="flex items-center gap-2">
															{s.chaveRegistro && s.chaveRegistro.trim() ? (
																<>
																	<span className="text-green-600">✅</span>
																	<span className="font-medium">{s.nome}</span>
																	<span className="text-xs text-green-600">(chave cadastrada)</span>
																</>
															) : (
																<>
																	<span className="text-yellow-500">⚠️</span>
																	<span className="text-gray-600">{s.nome}</span>
																	<span className="text-xs text-yellow-600">(sem chave - digite manualmente)</span>
																</>
															)}
														</div>
													))
												)}
											</div>
										</div>
									</div>
								)}

								{/* Input da chave SAGRAM */}
								{clienteSelecionado && sistemaSelecionado && (
									<div className="md:col-span-2">
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Chave SAGRAM *
										</label>
										<input
											type="text"
											value={chaveSagram}
											onChange={(e) => setChaveSagram(e.target.value)}
											onKeyPress={handleKeyPress}
											placeholder="Digite ou cole a chave do SAGRAM..."
											className="w-full rounded-xl border border-gray-300 px-3 py-2 font-mono text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
										/>
										{sistemaTemChave ? (
											<p className="mt-1 text-xs text-green-600">
												✅ Chave preenchida automaticamente do cadastro
											</p>
										) : (
											<p className="mt-1 text-xs text-yellow-600">
												⚠️ Nenhuma chave cadastrada - digite manualmente
											</p>
										)}
									</div>
								)}
							</div>

							{/* Botão processar */}
							<button
								onClick={handleProcessarRegistro}
								disabled={!clienteSelecionado || !sistemaSelecionado || !chaveSagram.trim() || isGenerating}
								className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isGenerating ? "Processando..." : "🔑 Processar Registro"}
							</button>
						</div>

						{/* Card do resultado */}
						{registroAtual && (
							<div className="mb-6 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500 shadow-lg p-6">
								<div className="flex items-center gap-2 mb-3">
									<span className="text-2xl">✅</span>
									<h3 className="text-lg font-semibold text-green-800">
										Registro Processado com Sucesso!
									</h3>
								</div>

								<div className="space-y-3">
									<div>
										<span className="text-gray-700 text-xs block mb-1">CHAVE (SAGRAM)</span>
										<div className="font-mono text-sm text-gray-700 bg-white p-3 rounded border break-all">
											{registroAtual.chaveEnviada}
										</div>
									</div>
									<div>
										<span className="text-gray-700 text-xs block mb-1">CONTRA-CHAVE</span>
										<div className="font-mono font-bold text-base text-green-700 bg-white p-3 rounded border break-all">
											{registroAtual.chaveRetornada}
										</div>
									</div>
									<div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
										<div>
											<span className="text-gray-700 text-xs">Cliente</span>
											<div className="font-medium text-gray-900">{registroAtual.cliente}</div>
										</div>
										<div>
											<span className="text-gray-700 text-xs">Sistema</span>
											<div className="font-medium text-gray-900">{registroAtual.sistema}</div>
										</div>
										<div>
											<span className="text-gray-700 text-xs">Licenças</span>
											<div className="font-medium text-gray-900">{registroAtual.licencas}</div>
										</div>
										<div>
											<span className="text-gray-700 text-xs">Gerada em</span>
											<div className="font-medium text-gray-900">{registroAtual.dataGeracao}</div>
										</div>
										<div className="col-span-2 md:col-span-1">
											<span className="text-gray-700 text-xs">Válida até</span>
											<div className="font-medium text-gray-900">{registroAtual.dataValidade}</div>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Histórico */}
						<div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
							<h2 className="text-xl font-semibold text-gray-900">
								Histórico de Registros
							</h2>
							<input
								type="text"
								placeholder="Filtrar histórico..."
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								className="rounded-xl w-full sm:w-72 border border-gray-300 px-3 py-2 shadow bg-white text-gray-700 placeholder:text-gray-500"
							/>
						</div>

						{/* Lista mobile */}
						<ul className="sm:hidden space-y-3 mb-4">
							{pageData.length === 0 ? (
								<li className="rounded-xl border bg-white p-8 text-center text-gray-500">
									Nenhum registro encontrado.
								</li>
							) : (
								pageData.map((h) => (
									<li
										key={h.id}
										className="rounded-xl border bg-white p-4 shadow text-gray-800"
									>
										<div className="text-sm space-y-2">
											<div>
												<span className="text-gray-500 text-xs block">CHAVE</span>
												<div className="font-mono text-xs text-gray-600 break-all">
													{h.chaveEnviada}
												</div>
											</div>
											<div>
												<span className="text-gray-500 text-xs block">CONTRA-CHAVE</span>
												<div className="font-mono font-bold text-sm text-blue-600 break-all">
													{h.chaveRetornada}
												</div>
											</div>
											<div className="grid grid-cols-2 gap-2 pt-2 border-t">
												<div>
													<span className="text-gray-500 text-xs">Cliente</span>
													<div className="text-sm">{h.cliente}</div>
												</div>
												<div>
													<span className="text-gray-500 text-xs">Sistema</span>
													<div className="text-sm">{h.sistema}</div>
												</div>
												<div>
													<span className="text-gray-500 text-xs">Licenças</span>
													<div className="text-sm">{h.licencas}</div>
												</div>
												<div>
													<span className="text-gray-500 text-xs">Gerada em</span>
													<div className="text-sm">{h.dataGeracao}</div>
												</div>
												<div className="col-span-2">
													<span className="text-gray-500 text-xs">Válida até</span>
													<div className="text-sm">{h.dataValidade}</div>
												</div>
											</div>
										</div>
									</li>
								))
							)}
						</ul>

						{/* Tabela desktop */}
						<div className="hidden sm:block rounded-xl bg-white shadow overflow-hidden">
							<div className="overflow-x-auto">
								<table className="min-w-full text-sm border-separate border-spacing-0">
									<thead>
										<tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
											<th className="px-3 py-3 text-left">Chave</th>
											<th className="px-3 py-3 text-left">Contra-Chave</th>
											<th className="px-3 py-3 text-left">Cliente</th>
											<th className="px-3 py-3 text-left">Sistema</th>
											<th className="px-3 py-3 text-left">Licenças</th>
											<th className="px-3 py-3 text-left">Gerada em</th>
											<th className="px-3 py-3 text-left">Válida até</th>
										</tr>
									</thead>
									<tbody className="text-gray-900">
										{pageData.length === 0 ? (
											<tr>
												<td colSpan={7} className="px-3 py-8 text-center text-gray-500">
													Nenhum registro encontrado.
												</td>
											</tr>
										) : (
											pageData.map((h, idx) => (
												<tr
													key={h.id}
													className={idx % 2 === 0 ? "bg-white" : "bg-gray-100"}
												>
													<td className="px-3 py-3 font-mono text-xs text-gray-600 max-w-[120px] truncate" title={h.chaveEnviada}>
														{h.chaveEnviada}
													</td>
													<td className="px-3 py-3 font-mono font-bold text-xs text-blue-600 max-w-[150px] truncate" title={h.chaveRetornada}>
														{h.chaveRetornada}
													</td>
													<td className="px-3 py-3">{h.cliente}</td>
													<td className="px-3 py-3">{h.sistema}</td>
													<td className="px-3 py-3 text-center">{h.licencas}</td>
													<td className="px-3 py-3 whitespace-nowrap">{h.dataGeracao}</td>
													<td className="px-3 py-3 whitespace-nowrap">{h.dataValidade}</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>

						{/* Paginação */}
						{filteredHistorico.length > 0 && (
							<div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-black">
								<div className="text-sm text-gray-700">
									{filteredHistorico.length} registro(s) • Página {page} de {totalPages}
								</div>

								<div className="flex items-center gap-2">
									<button
										className="flex text-sm items-center justify-center rounded-xl border border-gray-200 bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110 disabled:opacity-40"
										onClick={() => setPage(1)}
										disabled={page === 1}
									>
										◀◀
									</button>
									<button
										className="flex text-sm items-center justify-center rounded-xl border border-gray-200 bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110 disabled:opacity-40"
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										disabled={page === 1}
									>
										◀
									</button>
									<button
										className="flex text-sm items-center justify-center rounded-xl border border-gray-200 bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110 disabled:opacity-40"
										onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
										disabled={page === totalPages}
									>
										▶
									</button>
									<button
										className="flex text-sm items-center justify-center rounded-xl border border-gray-200 bg-white text-blue-500 w-9 h-9 shadow-sm transform transition-transform hover:scale-110 disabled:opacity-40"
										onClick={() => setPage(totalPages)}
										disabled={page === totalPages}
									>
										▶▶
									</button>
								</div>
							</div>
						)}
					</main>
				</div>
			</div>

			{/* Modal de Bloqueio */}
			{showModalBloqueio && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
					<div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
						<div className="flex items-center gap-3 mb-4">
							<span className="text-4xl">🚫</span>
							<h3 className="text-xl font-bold text-red-700">Cliente com Restrição</h3>
						</div>

						<p className="text-gray-700 mb-4">
							Favor entrar em contato com a Allware:
						</p>

						<div className="space-y-2 text-sm text-gray-800 bg-gray-50 p-4 rounded-lg">
							<div><strong>Telefone:</strong> 27 2123-0020</div>
							<div><strong>WhatsApp:</strong> 27 99659-2274 ou 27 99611-0020</div>
							<div>
								<strong>E-mail:</strong> atendimento@allware.com.br ou financeiro@allware.com.br
							</div>
						</div>

						<button
							onClick={() => setShowModalBloqueio(false)}
							className="mt-6 w-full px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
						>
							Fechar
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

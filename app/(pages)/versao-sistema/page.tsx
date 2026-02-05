// cadastro de versão
"use client";

import { useEffect, useState, FormEvent } from "react";
import Sidebar from "@/app/components/Sidebar";
import { backendFetch } from "@/lib/backend";

type Sistema = {
	id: number;
	nome: string;
	observacao?: string;
};

export default function CadastroVersaoSistemaPage() {
	const [sistemas, setSistemas] = useState<Sistema[]>([]);
	const [idSistema, setIdSistema] = useState("");
	const [versao, setVersao] = useState("");
	const [dataVersao, setDataVersao] = useState("");

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// carrega sistemas usando backendFetch (igual atualizar-clientes)
	useEffect(() => {
		async function loadSistemas() {
			try {
				const data = await backendFetch("/sistema", {
					method: "GET",
				});

				console.log("📊 Resposta de /sistema:", data);

				let lista: any[] = [];
				if (Array.isArray(data)) {
					lista = data;
				} else if (data && typeof data === "object") {
					const d: any = data;
					// A resposta vem como {data: [...], records: 7}
					if (Array.isArray(d.data)) lista = d.data;
					else if (Array.isArray(d.sistemas)) lista = d.sistemas;
					else if (Array.isArray(d.items)) lista = d.items;
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

				if (!Array.isArray(lista) || lista.length === 0) {
					console.warn("[VersaoSistema] /sistema retornou vazio.");
					setSistemas([]);
					return;
				}

				const mapped: Sistema[] = lista
					.map((s: any) => ({
						id: Number(s.id ?? s.idSistema ?? 0),
						nome: s.nome ?? s.nomeSistema ?? s.descricao ?? "",
						observacao: s.observacao ?? "",
					}))
					.filter(
						(s) =>
							s.nome &&
							s.nome.trim() !== "" &&
							s.nome.trim().toLowerCase() !== "sistema"
					);

				console.log("✅ Sistemas carregados:", mapped);
				setSistemas(mapped);
			} catch (e) {
				console.error("[VersaoSistema] Erro ao carregar /sistema:", e);
				setSistemas([]);
			}
		}
		loadSistemas();
	}, []);

	function handleNovo() {
		setIdSistema("");
		setVersao("");
		setDataVersao("");
		setError(null);
		setSuccess(null);
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		if (!idSistema || !versao.trim() || !dataVersao) {
			setError("Selecione o sistema, preencha a versão e a data.");
			return;
		}

		// TODO: Implementar lógica de salvamento quando definir o endpoint correto
		setError("Funcionalidade de salvamento ainda não implementada. Aguardando definição do endpoint.");
		
		/* Exemplo de como seria quando tiver o endpoint:
		try {
			setLoading(true);
			const resp = await backendFetch("/sistema/versao", {
				method: "POST",
				body: JSON.stringify({
					idSistema: Number(idSistema),
					versao,
					dataVersao,
				}),
			});

			if (!resp.ok) {
				setError("Erro ao cadastrar versão.");
				return;
			}

			setSuccess("Versão cadastrada com sucesso!");
			handleNovo();
		} catch (e) {
			console.error(e);
			setError("Erro ao conectar com o servidor.");
		} finally {
			setLoading(false);
		}
		*/
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="flex">
				{/* Sidebar reaproveitável */}
				<Sidebar active="versao-sistema" />

				{/* área principal */}
				<div className="flex-1">
					{/* topo mobile (sem botão de menu, igual opção A das outras telas) */}
					<div className="sticky top-0 z-20 sm:hidden bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 border-b text-center font-semibold text-white">
						Versões por Sistema
					</div>

					<main className="mx-auto max-w-7xl p-4 md:p-6">
						<div className="rounded-xl bg-white shadow overflow-hidden">
							<div className="border-b px-4 py-3 sm:px-6">
								<h2 className="text-base sm:text-lg font-semibold text-gray-800">
									Cadastro de Versão por Sistema
								</h2>
								<p className="text-sm text-gray-500">
									Selecione o sistema e informe a versão e a data.
								</p>
							</div>

							<div className="px-4 py-4 sm:px-6 sm:py-6">
								{error && (
									<div className="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700">
										{error}
									</div>
								)}

								{success && (
									<div className="mb-3 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
										{success}
									</div>
								)}

								<form
									onSubmit={handleSubmit}
									className="grid grid-cols-1 gap-4 md:grid-cols-3"
								>
									<div>
										<label className="mb-1 block text-xs font-bold text-slate-600">
											Sistema
										</label>
										<select
											value={idSistema}
											onChange={(e) => setIdSistema(e.target.value)}
											className="w-full rounded-md border text-black border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500 bg-white"
										>
											<option value="">Selecione...</option>
											{sistemas.map((s) => (
												<option key={s.id} value={s.id}>
													{s.nome}
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="mb-1 block text-xs font-bold text-slate-600">
											Versão
										</label>
										<input
											type="text"
											value={versao}
											onChange={(e) => setVersao(e.target.value)}
											className="w-full rounded-md border text-black border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500"
											placeholder="Ex.: 2025.1.15.29"
										/>
									</div>

									<div>
										<label className="mb-1 block text-xs font-bold text-slate-600">
											Data da Versão
										</label>
										<input
											type="date"
											value={dataVersao}
											onChange={(e) => setDataVersao(e.target.value)}
											className="w-full rounded-md border text-black border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500"
										/>
									</div>

									<div className="md:col-span-3 flex justify-end gap-2 mt-2">
										<button
											type="button"
											onClick={handleNovo}
											className="rounded-xl bg-red-400 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transform transition-transform hover:scale-105"
										>
											Limpar
										</button>
										<button
											type="submit"
											disabled={loading}
											className="rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transform transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70"
										>
											{loading ? "Salvando..." : "Salvar Versão"}
										</button>
									</div>
								</form>
							</div>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}
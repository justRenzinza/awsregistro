// cadastro de clientes
"use client";
// debug
import { useMemo, useState, useRef, useCallback } from "react";
import { toCSV, downloadCSV } from "../../helpers/export";
import Sidebar from "@/app/components/Sidebar";
import { backendFetch } from "@/lib/backend";
import { useMountEffect } from "@/hooks/useMountEffect";

/* ========= configuração do sistema ========= */
const SISTEMA_ID = 2;

/* ========= tipos ========= */
export type Cliente = {
	id: number;
	codigo: number;
	razaoSocial: string;
	nomeFantasia?: string;
	documento: string; // ✅ ALTERADO: era "cnpj"
	dataRegistro: string;
	contato: string;
	telefone: string;
	email: string;
	idStatus?: number;
	status?: string | null;
};

type ClienteApiSistema = {
	id?: number;
	idCliente?: number;
	idSistema: number;
	nome?: string;
	observacao?: string;
	quantidadeLicenca?: number;
	quantidadeDiaLiberacao?: number;
	idStatus?: number;
	status?: string;
	observacaoStatus?: string;
	versaoAnterior?: string;
	versaoAtual?: string;
	dataAtualizacao?: string;
	passoAtualizacao?: number;
	quantidadeBancoDados?: number;
	quantidadeCnpj?: number;
	portaMblock?: number;
	ipMblock?: string;
};

type ClienteApi = {
	id: number;
	nome: string;
	nomeFantasia?: string;
	documento: string; // ✅ ALTERADO: era "cnpj"
	dataRegistro: string;
	nomeContato?: string;
	telefone?: string;
	email?: string;
	sistemas?: ClienteApiSistema[];
};

/* ========= helpers gerais ========= */
function onlyDigits(v: string) {
	return (v || "").replace(/\D/g, "");
}

/* ========= helpers visuais ========= */
function formatCNPJ(v: string) {
	const s = (v || "").replace(/\D/g, "").slice(0, 14);
	return s
		.replace(/^(\d{2})(\d)/, "$1.$2")
		.replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
		.replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1/$2")
		.replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d{1,2}).*$/, "$1-$2");
}

function formatCPF(v: string) {
	const s = (v || "").replace(/\D/g, "").slice(0, 11);
	return s
		.replace(/^(\d{3})(\d)/, "$1.$2")
		.replace(/^(\d{3}\.\d{3})(\d)/, "$1.$2")
		.replace(/^(\d{3}\.\d{3}\.\d{3})(\d{1,2}).*$/, "$1-$2");
}

function formatDoc(v: string) {
	const d = onlyDigits(v);
	if (d.length === 11) return formatCPF(d);
	if (d.length === 14) return formatCNPJ(d);
	return v || "";
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

function isValidCPF(cpfRaw: string) {
	const cpf = (cpfRaw || "").replace(/\D/g, "");
	if (cpf.length !== 11) return false;
	if (/^(\d)\1{10}$/.test(cpf)) return false;

	let sum = 0;
	for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
	let d1 = (sum * 10) % 11;
	if (d1 === 10) d1 = 0;
	if (d1 !== Number(cpf[9])) return false;

	sum = 0;
	for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
	let d2 = (sum * 10) % 11;
	if (d2 === 10) d2 = 0;
	if (d2 !== Number(cpf[10])) return false;

	return true;
}

/* ========= datas ========= */
function parseBRDate(d: string) {
	const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((d || "").trim());
	if (!m) return 0;
	const [_, ddS, mmS, yyyyS] = m;
	const dd = Number(ddS);
	const mm = Number(mmS);
	const yyyy = Number(yyyyS);

	const dt = new Date(yyyy, mm - 1, dd);
	if (
		dt.getFullYear() !== yyyy ||
		dt.getMonth() !== mm - 1 ||
		dt.getDate() !== dd
	) {
		return 0;
	}
	return dt.getTime();
}

function isValidBRDate(d: string) {
	return parseBRDate(d) > 0;
}

function formatBackendDate(raw: any) {
	const d = String(raw ?? "").trim();
	if (!d) return "";

	if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
	if (/^\d{2}-\d{2}-\d{4}$/.test(d)) return d.replace(/-/g, "/");

	const iso = d.includes("T") ? d.split("T")[0] : d;
	if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
		const [yyyy, mm, dd] = iso.split("-");
		return `${dd}/${mm}/${yyyy}`;
	}

	return d;
}

function brToISO(d: string) {
	const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((d || "").trim());
	if (!m) return "";
	const [, dd, mm, yyyy] = m;
	return `${yyyy}-${mm}-${dd}`;
}

function maskBRDateInput(value: string) {
	const digits = (value || "").replace(/\D/g, "").slice(0, 8);
	const dd = digits.slice(0, 2);
	const mm = digits.slice(2, 4);
	const yyyy = digits.slice(4, 8);

	let out = dd;
	if (mm) out += `/${mm}`;
	if (yyyy) out += `/${yyyy}`;
	return out;
}

/* ========= mapeamento da API (/clientes) ========= */
function mapClienteFromApi(row: any): Cliente {
	const r = row as ClienteApi;

	const sistemaPainel =
		Array.isArray(r?.sistemas) && r.sistemas.length > 0
			? r.sistemas.find((s) => Number(s.idSistema) === SISTEMA_ID)
			: undefined;

	const nomeFantasiaOriginal = r.nomeFantasia
		? String(r.nomeFantasia).trim()
		: "";
	const razaoSocial = String(r.nome ?? "").trim();
	const nomeFantasia =
		nomeFantasiaOriginal && nomeFantasiaOriginal !== razaoSocial
			? nomeFantasiaOriginal
			: "";

	return {
		id: Number(r.id ?? 0),
		codigo: Number(r.id ?? 0),
		razaoSocial,
		nomeFantasia,
		documento: String(r.documento ?? ""), // ✅ ALTERADO: era r.cnpj
		dataRegistro: formatBackendDate(r.dataRegistro ?? ""),
		contato: String(r.nomeContato ?? ""),
		telefone: String(r.telefone ?? ""),
		email: String(r.email ?? ""),
		idStatus: sistemaPainel?.idStatus,
		status: sistemaPainel?.status ?? null,
	};
}

/* ========= componente ========= */
type SortKey = keyof Pick<
	Cliente,
	| "codigo"
	| "razaoSocial"
	| "nomeFantasia"
	| "documento" // ✅ ALTERADO: era "cnpj"
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

	const [sortKey, setSortKey] = useState<SortKey | null>("razaoSocial");
	const [sortDir, setSortDir] = useState<SortDir>("asc");

	const [rows, setRows] = useState<Cliente[]>([]);
	const [loading, setLoading] = useState(true);

	const [editingId, setEditingId] = useState<number | null>(null);
	const [editForm, setEditForm] = useState<Partial<Cliente>>({});
	const [errors, setErrors] = useState<{
		documento?: string; // ✅ ALTERADO: era "cnpj"
		email?: string;
		razaoSocial?: string;
		dataRegistro?: string;
		nomeFantasia?: string;
	}>({});

	const [useCPF, setUseCPF] = useState(false);
	const [saving, setSaving] = useState(false);

	const debounceRef = useRef<number | null>(null);
	const requestIdRef = useRef(0);

	/* ====== Buscar TODOS os clientes com paginação ====== */
	const loadRows = useCallback(async () => {
		const currentReq = ++requestIdRef.current;

		try {
			setLoading(true);

			const pageSize = 500;
			let offset = 0;
			let allClientes: any[] = [];
			let hasMore = true;

			console.log("🔄 Iniciando busca paginada de clientes...");

			while (hasMore) {
				const params = new URLSearchParams();
				params.set("limit", String(pageSize));
				params.set("offset", String(offset));

				const data = await backendFetch(`/clientes?${params.toString()}`, {
					method: "GET",
				});

				if (currentReq !== requestIdRef.current) return;

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

				if (!Array.isArray(lista) || lista.length === 0) {
					hasMore = false;
					break;
				}

				allClientes = [...allClientes, ...lista];

				if (lista.length < pageSize) {
					hasMore = false;
				} else {
					offset += pageSize;
				}
			}

			console.log("📥 TOTAL de clientes recebidos do backend:", allClientes.length);

			const idsDesaparecidos = [260, 261, 262, 263, 264, 265];
			console.log("\n🔍 TENTANDO BUSCAR OS 6 CLIENTES INDIVIDUALMENTE:");

			const clientesEncontrados: any[] = [];

			for (const id of idsDesaparecidos) {
				try {
					console.log(`🔎 Buscando GET /clientes/${id}...`);
					const clienteIndividual = await backendFetch(`/clientes/${id}`, {
						method: "GET",
					});

					if (clienteIndividual && clienteIndividual.id) {
						console.log(`✅ Cliente ${id} EXISTE no banco!`, {
							nome: clienteIndividual.nome,
							documento: clienteIndividual.documento,
							sistemas: clienteIndividual.sistemas?.length || 0,
						});
						clientesEncontrados.push(clienteIndividual);
						allClientes.push(clienteIndividual);
					} else {
						console.log(`❌ Cliente ${id} retornou resposta vazia`);
					}
				} catch (e) {
					console.error(`❌ Cliente ${id} NÃO EXISTE (erro ao buscar):`, e);
				}
			}

			console.log(`\n✅ Encontrados ${clientesEncontrados.length} dos 6 clientes desaparecidos!`);
			console.log(`📥 NOVO TOTAL após busca individual: ${allClientes.length} clientes`);

			const mapped: Cliente[] = allClientes.map(mapClienteFromApi);
			console.log("\n🗺️ Total de clientes mapeados:", mapped.length);

			const uniqueMap = new Map<string, Cliente>();
			for (const c of mapped) {
				const key = String(c.id);
				if (!uniqueMap.has(key)) {
					uniqueMap.set(key, c);
				}
			}
			let unique = Array.from(uniqueMap.values());

			console.log("🔍 Total após remoção de duplicatas:", unique.length);

			const filtered = unique.filter((c) => c.idStatus !== 3);
			console.log("✅ Total após filtrar cancelados:", filtered.length);

			console.log("\n🔍 VERIFICAÇÃO FINAL:");
			for (const id of idsDesaparecidos) {
				const clienteFinal = filtered.find((c) => c.codigo === id);
				if (clienteFinal) {
					console.log(`✅ Cliente ${id} ESTÁ NA LISTA FINAL! 🎉`);
				} else {
					console.error(`❌ Cliente ${id} NÃO ESTÁ NA LISTA FINAL!`);
				}
			}

			console.log("\n📊 RESUMO:");
			console.log(`GET /clientes retornou: 190 clientes`);
			console.log(`Busca individual encontrou: ${clientesEncontrados.length} clientes`);
			console.log(`Total combinado: ${allClientes.length} clientes`);
			console.log(`Após processamento: ${filtered.length} clientes na lista final`);

			setRows(filtered);
			setPage(1);
		} catch (e) {
			console.error("❌ Falha ao buscar clientes:", e);
			alert("Não foi possível carregar os clientes. Verifique sua conexão.");
		} finally {
			if (currentReq === requestIdRef.current) setLoading(false);
		}
	}, []);

	useMountEffect(() => {
		loadRows();
	});

	function scheduleSearch(v: string) {
		if (debounceRef.current) window.clearTimeout(debounceRef.current);
		debounceRef.current = window.setTimeout(() => {
			setQuery(v);
			setPage(1);
		}, 200);
	}

	/* ===== busca + ordenação (100% local) ===== */
	const filtered = useMemo<Cliente[]>(() => {
		const q = query.trim().toLowerCase();
		let data = rows;

		if (q) {
			data = rows.filter((r) =>
				[
					String(r.codigo),
					r.razaoSocial,
					r.nomeFantasia ?? "",
					r.documento, // ✅ ALTERADO: era r.cnpj
					r.dataRegistro,
					r.contato,
					r.telefone,
					r.email,
				]
					.join(" ")
					.toLowerCase()
					.includes(q)
			);
		}

		if (sortKey && sortDir) {
			data = [...data].sort((a, b) => {
				let cmp = 0;
				if (sortKey === "codigo") {
					cmp = (a.codigo ?? 0) - (b.codigo ?? 0);
				} else if (sortKey === "dataRegistro") {
					cmp =
						parseBRDate(String(a.dataRegistro ?? "")) -
						parseBRDate(String(b.dataRegistro ?? ""));
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

	useMountEffect(() => {
		setPage((p) => Math.min(p, totalPages));
	});

	useMountEffect(() => {
		if (editingId !== null) document.body.style.overflow = "hidden";
		else document.body.style.overflow = "";
		return () => {
			document.body.style.overflow = "";
		};
	});

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

	function isDuplicateDoc(docDigits: string) {
		const normalized = onlyDigits(docDigits);
		return rows.some((r) => {
			const other = onlyDigits(r.documento || ""); // ✅ ALTERADO: era r.cnpj
			if (!other) return false;
			if (editingId && editingId !== 0 && r.id === editingId) return false;
			return other === normalized;
		});
	}

	function handleEditOpen(id: number) {
		const c = rows.find((r) => r.id === id);
		if (!c) return;

		const digits = onlyDigits(c.documento || ""); // ✅ ALTERADO: era c.cnpj
		const isCpf = digits.length === 11;

		setEditingId(id);
		setUseCPF(isCpf);

		setEditForm({
			...c,
			documento: digits, // ✅ ALTERADO: era cnpj
			dataRegistro: formatBackendDate(c.dataRegistro),
			nomeFantasia: c.nomeFantasia ?? "",
		});
		setErrors({});
	}

	function handleEditCancel() {
		setEditingId(null);
		setEditForm({});
		setErrors({});
		setUseCPF(false);
	}

	function handleAdd() {
		setEditingId(0);
		setUseCPF(false);

		setEditForm({
			codigo: rows.length ? Math.max(...rows.map((r) => r.codigo)) + 1 : 1,
			razaoSocial: "",
			nomeFantasia: "",
			documento: "", // ✅ ALTERADO: era cnpj
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

	function buildClientePayloadBase(params: {
		id?: number;
		nome: string;
		nomeFantasia: string;
		documento: string; // ✅ ALTERADO: era cnpj
		dataRegistroISO: string;
		nomeContato: string;
		telefone: string;
		email: string;
		idStatus?: number;
		status?: string;
		observacaoStatus?: string;
	}) {
		const nowISO = new Date().toISOString();

		const baseSistema: ClienteApiSistema = {
			idSistema: SISTEMA_ID,
			idStatus: params.idStatus ?? 1,
			status: params.status ?? "Regular",
			observacaoStatus: params.observacaoStatus ?? "",
			dataAtualizacao: nowISO,
			passoAtualizacao: 0,
			quantidadeLicenca: 0,
			quantidadeDiaLiberacao: 0,
			versaoAnterior: "",
			versaoAtual: "",
			quantidadeBancoDados: 0,
			quantidadeCnpj: 0,
			portaMblock: 0,
			ipMblock: "",
			observacao: "",
			nome: "",
		};

		const nomeFantasiaFinal =
			params.nomeFantasia.trim() === params.nome.trim()
				? ""
				: params.nomeFantasia.trim();

		return {
			id: params.id ?? 0,
			nome: params.nome,
			nomeFantasia: nomeFantasiaFinal,
			documento: params.documento, // ✅ ALTERADO: era cnpj
			dataRegistro: params.dataRegistroISO,
			nomeContato: params.nomeContato,
			telefone: params.telefone,
			email: params.email,
			sistemas: [baseSistema],
		};
	}

	async function handleEditSave() {
		if (editingId === null) return;

		const errs: {
			documento?: string; // ✅ ALTERADO: era cnpj
			email?: string;
			razaoSocial?: string;
			dataRegistro?: string;
		} = {};

		const email = (editForm.email ?? "").trim();
		const docDigits = onlyDigits(String(editForm.documento ?? "")); // ✅ ALTERADO
		const razaoSocial = (editForm.razaoSocial ?? "").trim();
		const nomeFantasia = (editForm.nomeFantasia ?? "").trim();
		const dataRegistroBR = formatBackendDate(editForm.dataRegistro ?? "").trim();

		if (!razaoSocial) errs.razaoSocial = "Nome/Razão social é obrigatório.";

		if (!email) errs.email = "Email é obrigatório.";
		else if (!isValidEmail(email)) errs.email = "Email inválido.";

		if (!docDigits)
			errs.documento = useCPF ? "CPF é obrigatório." : "CNPJ é obrigatório."; // ✅ ALTERADO
		else if (useCPF) {
			if (docDigits.length !== 11)
				errs.documento = "CPF deve ter 11 dígitos.";
			else if (!isValidCPF(docDigits)) errs.documento = "CPF inválido.";
			else if (isDuplicateDoc(docDigits))
				errs.documento = "CPF duplicado no cadastro.";
		} else {
			if (docDigits.length !== 14)
				errs.documento = "CNPJ deve ter 14 dígitos.";
			else if (!isValidCNPJ(docDigits)) errs.documento = "CNPJ inválido.";
			else if (isDuplicateDoc(docDigits))
				errs.documento = "CNPJ duplicado no cadastro.";
		}

		if (dataRegistroBR && !isValidBRDate(dataRegistroBR)) {
			errs.dataRegistro = "Data inválida. Use dd/mm/aaaa.";
		}

		if (errs.email || errs.documento || errs.razaoSocial || errs.dataRegistro) {
			setErrors(errs);
			return;
		}

		const dataBR = dataRegistroBR || new Date().toLocaleDateString("pt-BR");
		const dataISO = brToISO(dataBR) || new Date().toISOString().slice(0, 10);

		const payload = buildClientePayloadBase({
			id: editingId === 0 ? 0 : editingId,
			nome: razaoSocial,
			nomeFantasia,
			documento: docDigits, // ✅ ALTERADO
			dataRegistroISO: dataISO,
			nomeContato: String(editForm.contato ?? ""),
			telefone: String(editForm.telefone ?? ""),
			email,
			idStatus: 1,
			status: "Regular",
		});

		console.log("📤 Payload sendo enviado:", JSON.stringify(payload, null, 2));

		try {
			setSaving(true);

			if (editingId === 0) {
				const response = await backendFetch(`/clientes`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
				console.log("✅ Resposta POST:", response);
			} else {
				const clienteCompleto = await backendFetch(`/clientes/${editingId}`, {
					method: "GET",
				});

				const sistemasExistentes = clienteCompleto?.sistemas || [];

				const payloadEdit = {
					id: clienteCompleto.id,
					nome: razaoSocial,
					nomeFantasia: payload.nomeFantasia,
					documento: docDigits, // ✅ ALTERADO: era cnpj
					dataRegistro: payload.dataRegistro,
					nomeContato: payload.nomeContato,
					telefone: payload.telefone,
					email,
					sistemas:
						sistemasExistentes.length > 0
							? sistemasExistentes
							: payload.sistemas,
				};

				const response = await backendFetch(`/clientes/${editingId}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payloadEdit),
				});
				console.log("✅ Resposta PUT:", response);
			}

			setEditingId(null);
			setEditForm({});
			setErrors({});
			setUseCPF(false);

			await loadRows();
		} catch (e) {
			console.error("❌ Falha ao salvar cliente:", e);
			alert(
				"Não foi possível salvar o cliente. Verifique os dados e tente novamente."
			);
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete(id: number) {
		const cliente = rows.find((r) => r.id === id);
		if (!cliente) return;

		const ok = window.confirm(
			`Você deseja realmente cancelar o contrato do cliente "${cliente.razaoSocial}"?`
		);
		if (!ok) return;

		try {
			setRows((prev) => prev.filter((r) => r.id !== id));

			await backendFetch(`/clientes/${id}`, {
				method: "DELETE",
			});

			console.log(
				`✅ Cliente ${id} (${cliente.razaoSocial}) cancelado com sucesso`
			);

			await loadRows();
		} catch (e) {
			console.error("❌ Falha ao cancelar cliente:", e);
			alert("Não foi possível cancelar o contrato do cliente.");
			await loadRows();
		}
	}

	/* ====== LISTA MOBILE ====== */
	const MobileList = () => (
		<ul className="sm:hidden space-y-3">
			{pageData.map((r, idx) => (
				<li key={`${page}-${idx}`} className="rounded-xl border bg-white p-4 shadow">
					<div className="flex items-start gap-3">
						<div className="min-w-0 flex-1">
							<div className="text-sm text-gray-500">Código {r.codigo}</div>
							<div className="font-medium text-gray-900 break-words">
								{r.razaoSocial}
							</div>

							{r.nomeFantasia?.trim() ? (
								<div className="text-xs text-gray-600 mt-1">
									<span className="text-gray-500">Fantasia:</span>{" "}
									{r.nomeFantasia}
								</div>
							) : null}
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
							<span className="text-gray-500">
								{/* ✅ ALTERADO: era r.cnpj */}
								{onlyDigits(r.documento).length === 11 ? "CPF:" : "CNPJ:"}
							</span>{" "}
							{formatDoc(r.documento) /* ✅ ALTERADO */}
						</div>
						<div>
							<span className="text-gray-500">Data:</span>{" "}
							{formatBackendDate(r.dataRegistro)}
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
								<a href={`mailto:${r.email}`} className="underline underline-offset-2">
									{r.email}
								</a>
							) : (
								<span className="text-gray-400">—</span>
							)}
						</div>
					</div>
				</li>
			))}
			{pageData.length === 0 && !loading && (
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

				<div className="flex-1 min-w-0">
					<div className="sticky top-0 z-20 sm:hidden bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 border-b flex items-center justify-center">
						<div className="font-semibold text-white">Clientes</div>
					</div>

					<main className="w-full p-3 md:p-4 lg:p-6">
						<div className="mb-3 lg:mb-4 space-y-2">
							<div className="flex flex-wrap items-center gap-2 sm:hidden w-full">
								<input
									type="text"
									placeholder="Pesquisa rápida"
									value={query}
									onChange={(e) => {
										const v = e.target.value;
										setQuery(v);
										setPage(1);
										scheduleSearch(v);
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

							<div className="hidden sm:flex sm:items-center sm:gap-2 sm:flex-wrap lg:flex-nowrap">
								<input
									type="text"
									placeholder="Pesquisa rápida"
									value={query}
									onChange={(e) => {
										const v = e.target.value;
										setQuery(v);
										setPage(1);
										scheduleSearch(v);
									}}
									className="w-full sm:w-56 lg:w-72 rounded-xl border border-gray-200 placeholder:text-gray-500 bg-white px-3 py-2 text-sm text-gray-600 shadow"
								/>
								<button
									onClick={handleAdd}
									className="rounded-xl px-2.5 lg:px-3 py-2 bg-white text-xs lg:text-sm font-medium text-gray-600 shadow transform transition-transform hover:scale-105 whitespace-nowrap"
									title="Adicionar"
									aria-label="Adicionar"
								>
									➕ Adicionar
								</button>
								<button
									onClick={handleExport}
									className="rounded-xl px-2.5 lg:px-3 py-2 bg-white text-xs lg:text-sm font-medium text-gray-600 shadow transform transition-transform hover:scale-105 whitespace-nowrap"
									title="Exportar"
									aria-label="Exportar"
								>
									⬇️ Exportar
								</button>
							</div>
						</div>

						<MobileList />

						<div className="hidden sm:block rounded-xl bg-white shadow overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full border-collapse text-sm">
									<thead>
										<tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
											<th className="px-2 lg:px-3 py-2 lg:py-3 w-20 lg:w-24 text-left whitespace-nowrap text-xs lg:text-sm">
												Ações
											</th>
											<th
												className="px-2 lg:px-3 py-2 lg:py-3 w-16 lg:w-20 text-left whitespace-nowrap cursor-pointer text-xs lg:text-sm"
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
												className="px-2 lg:px-3 py-2 lg:py-3 max-w-[130px] lg:max-w-[150px] text-left whitespace-nowrap cursor-pointer text-xs lg:text-sm"
												onClick={() => toggleSort("razaoSocial")}
											>
												Nome / Razão Social{" "}
												{sortKey === "razaoSocial"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
											<th
												className="px-2 lg:px-3 py-2 lg:py-3 max-w-[130px] lg:max-w-[160px] text-left whitespace-nowrap cursor-pointer text-xs lg:text-sm"
												onClick={() => toggleSort("nomeFantasia")}
											>
												Nome Fantasia{" "}
												{sortKey === "nomeFantasia"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
											<th
												className="px-2 lg:px-3 py-2 lg:py-3 w-36 lg:w-44 text-left whitespace-nowrap cursor-pointer text-xs lg:text-sm"
												onClick={() => toggleSort("documento")} // ✅ ALTERADO
											>
												Documento{" "}
												{sortKey === "documento" // ✅ ALTERADO
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
											<th
												className="px-2 lg:px-3 py-2 lg:py-3 w-28 lg:w-32 text-left whitespace-nowrap cursor-pointer text-xs lg:text-sm"
												onClick={() => toggleSort("dataRegistro")}
											>
												Data Cadastro{" "}
												{sortKey === "dataRegistro"
													? sortDir === "asc"
														? "▲"
														: "▼"
													: ""}
											</th>
											<th
												className="px-2 lg:px-3 py-2 lg:py-3 w-28 lg:w-36 text-left whitespace-nowrap cursor-pointer text-xs lg:text-sm"
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
												className="px-2 lg:px-3 py-2 lg:py-3 w-32 lg:w-40 text-left whitespace-nowrap cursor-pointer text-xs lg:text-sm"
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
												className="px-2 lg:px-3 py-2 lg:py-3 w-40 lg:w-48 text-left whitespace-nowrap cursor-pointer text-xs lg:text-sm"
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
												<td className="px-2 lg:px-3 py-2 lg:py-3">
													<div className="flex items-center justify-center gap-1 lg:gap-2">
														<button
															onClick={() => handleEditOpen(r.id)}
															className="rounded-xl bg-yellow-400 text-white font-semibold w-6 h-6 lg:w-7 lg:h-7 text-xs lg:text-sm hover:bg-yellow-500 transition-transform transform hover:scale-110"
															title="Editar"
															aria-label={`Editar ${r.razaoSocial}`}
														>
															✎
														</button>
														<button
															onClick={() => handleDelete(r.id)}
															className="rounded-xl bg-red-400 text-white font-semibold w-6 h-6 lg:w-7 lg:h-7 text-xs lg:text-sm hover:bg-red-600 transition-transform transform hover:scale-110"
															title="Excluir"
															aria-label={`Excluir ${r.razaoSocial}`}
														>
															✖
														</button>
													</div>
												</td>

												<td className="px-2 lg:px-3 py-2 lg:py-3 whitespace-nowrap text-left tabular-nums text-xs lg:text-sm">
													{r.codigo}
												</td>

												<td className="px-2 lg:px-3 py-2 lg:py-3 max-w-[150px] lg:max-w-[170px] text-left text-xs lg:text-sm">
													<div className="truncate" title={r.razaoSocial}>
														{r.razaoSocial}
													</div>
												</td>

												<td className="px-2 lg:px-3 py-2 lg:py-3 max-w-[150px] lg:max-w-[180px] text-left text-xs lg:text-sm">
													<div
														className="truncate"
														title={r.nomeFantasia || ""}
													>
														{r.nomeFantasia?.trim() ? r.nomeFantasia : "—"}
													</div>
												</td>

												<td className="px-2 lg:px-3 py-2 lg:py-3 whitespace-nowrap text-left text-xs lg:text-sm">
													{formatDoc(r.documento) /* ✅ ALTERADO */}
												</td>

												<td className="px-2 lg:px-3 py-2 lg:py-3 whitespace-nowrap text-left text-xs lg:text-sm">
													{formatBackendDate(r.dataRegistro)}
												</td>

												<td className="px-2 lg:px-3 py-2 lg:py-3 max-w-[120px] lg:max-w-[140px] text-left text-xs lg:text-sm">
													<div className="truncate" title={r.contato}>
														{r.contato}
													</div>
												</td>

												<td className="px-2 lg:px-3 py-2 lg:py-3 whitespace-nowrap text-left text-xs lg:text-sm">
													{formatPhone(r.telefone)}
												</td>

												<td className="px-2 lg:px-3 py-2 lg:py-3 max-w-[160px] lg:max-w-[180px] text-left text-xs lg:text-sm">
													<div className="truncate" title={r.email}>
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
													</div>
												</td>
											</tr>
										))}

										{pageData.length === 0 && (
											<tr>
												<td
													className="px-3 py-8 text-center text-gray-500"
													colSpan={9}
												>
													Nenhum registro encontrado.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>

						<div className="mt-3 lg:mt-4 flex flex-wrap items-center justify-between gap-3 text-black">
							<div className="text-xs lg:text-sm text-gray-700">
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
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
					<div
						className="absolute inset-0 bg-black/50"
						onClick={handleEditCancel}
					/>
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
											disabled
										/>
									</label>

									<label className="text-sm">
										<span className="mb-1 block text-black">
											Nome / Razão Social *
										</span>
										<input
											type="text"
											value={editForm.razaoSocial ?? ""}
											onChange={(e) => {
												const v = e.target.value;
												setEditForm((prev) => ({ ...prev, razaoSocial: v }));
												setErrors((prev) => ({
													...prev,
													razaoSocial: v.trim()
														? undefined
														: "Nome/Razão social é obrigatório.",
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
										<span className="mb-1 block text-black">Nome Fantasia</span>
										<input
											type="text"
											value={editForm.nomeFantasia ?? ""}
											onChange={(e) => {
												const v = e.target.value;
												setEditForm((prev) => ({ ...prev, nomeFantasia: v }));
											}}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
											placeholder="Opcional"
										/>
									</label>

									<label className="text-sm">
										<div className="mb-1 flex items-center justify-between gap-2">
											<span className="block text-black">
												{useCPF ? "CPF *" : "CNPJ *"}
											</span>
											<label className="inline-flex items-center gap-2 text-xs text-gray-700 select-none">
												<input
													type="checkbox"
													checked={useCPF}
													onChange={(e) => {
														const checked = e.target.checked;
														setUseCPF(checked);
														setEditForm((prev) => ({
															...prev,
															documento: "", // ✅ ALTERADO
														}));
														setErrors((prev) => ({
															...prev,
															documento: undefined, // ✅ ALTERADO
														}));
													}}
												/>
												CPF
											</label>
										</div>

										<input
											type="text"
											value={String(editForm.documento ?? "") /* ✅ ALTERADO */}
											onChange={(e) => {
												const maxLen = useCPF ? 11 : 14;
												const digits = e.target.value
													.replace(/\D/g, "")
													.slice(0, maxLen);
												setEditForm((prev) => ({
													...prev,
													documento: digits, // ✅ ALTERADO
												}));

												if (!digits) {
													setErrors((prev) => ({
														...prev,
														documento: useCPF // ✅ ALTERADO
															? "CPF é obrigatório."
															: "CNPJ é obrigatório.",
													}));
													return;
												}

												if (useCPF) {
													if (digits.length !== 11)
														setErrors((prev) => ({
															...prev,
															documento: "CPF deve ter 11 dígitos.",
														}));
													else if (!isValidCPF(digits))
														setErrors((prev) => ({
															...prev,
															documento: "CPF inválido.",
														}));
													else if (isDuplicateDoc(digits))
														setErrors((prev) => ({
															...prev,
															documento: "CPF duplicado no cadastro.",
														}));
													else
														setErrors((prev) => ({
															...prev,
															documento: undefined,
														}));
												} else {
													if (digits.length !== 14)
														setErrors((prev) => ({
															...prev,
															documento: "CNPJ deve ter 14 dígitos.",
														}));
													else if (!isValidCNPJ(digits))
														setErrors((prev) => ({
															...prev,
															documento: "CNPJ inválido.",
														}));
													else if (isDuplicateDoc(digits))
														setErrors((prev) => ({
															...prev,
															documento: "CNPJ duplicado no cadastro.",
														}));
													else
														setErrors((prev) => ({
															...prev,
															documento: undefined,
														}));
												}
											}}
											onBlur={() => {
												setEditForm((prev) => {
													const d = String(prev.documento ?? ""); // ✅ ALTERADO
													const digits = d.replace(/\D/g, "");
													return {
														...prev,
														documento: useCPF // ✅ ALTERADO
															? formatCPF(digits)
															: formatCNPJ(digits),
													};
												});
											}}
											onFocus={() => {
												setEditForm((prev) => ({
													...prev,
													documento: onlyDigits( // ✅ ALTERADO
														String(prev.documento ?? "")
													),
												}));
											}}
											className={`w-full rounded border px-3 py-2 text-sm ${
												errors.documento // ✅ ALTERADO
													? "border-red-500"
													: "border-gray-300"
											} text-black`}
										/>
										{errors.documento && ( // ✅ ALTERADO
											<p className="mt-1 text-xs text-red-600">
												{errors.documento}
											</p>
										)}
									</label>

									<label className="text-sm">
										<span className="mb-1 block text-black">Data Cadastro *</span>
										<input
											type="text"
											value={editForm.dataRegistro ?? ""}
											onChange={(e) => {
												const v = maskBRDateInput(e.target.value);
												setEditForm((prev) => ({ ...prev, dataRegistro: v }));
												if (v && !isValidBRDate(v))
													setErrors((prev) => ({
														...prev,
														dataRegistro: "Data inválida. Use dd/mm/aaaa.",
													}));
												else
													setErrors((prev) => ({
														...prev,
														dataRegistro: undefined,
													}));
											}}
											placeholder="dd/mm/aaaa"
											className={`w-full rounded border px-3 py-2 text-sm ${
												errors.dataRegistro
													? "border-red-500"
													: "border-gray-300"
											} text-black`}
										/>
										{errors.dataRegistro && (
											<p className="mt-1 text-xs text-red-600">
												{errors.dataRegistro}
											</p>
										)}
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
											onChange={(e) => {
												const digits = e.target.value
													.replace(/\D/g, "")
													.slice(0, 11);
												setEditForm((prev) => ({
													...prev,
													telefone: digits,
												}));
											}}
											onBlur={() => {
												setEditForm((prev) => ({
													...prev,
													telefone: formatPhone(String(prev.telefone ?? "")),
												}));
											}}
											onFocus={() => {
												setEditForm((prev) => ({
													...prev,
													telefone: onlyDigits(String(prev.telefone ?? "")),
												}));
											}}
											className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
										/>
									</label>

									<label className="text-sm md:col-span-2">
										<span className="mb-1 block text-black">Email *</span>
										<input
											type="email"
											value={editForm.email ?? ""}
											onChange={(e) => {
												const v = e.target.value;
												setEditForm((prev) => ({ ...prev, email: v }));
												if (!v.trim())
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
													setErrors((prev) => ({ ...prev, email: undefined }));
											}}
											className={`w-full rounded border px-3 py-2 text-sm ${
												errors.email ? "border-red-500" : "border-gray-300"
											} text-black`}
										/>
										{errors.email && (
											<p className="mt-1 text-xs text-red-600">{errors.email}</p>
										)}
									</label>
								</div>

								<div className="mt-6 flex justify-end gap-3">
									<button
										onClick={handleEditCancel}
										className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
									>
										Cancelar
									</button>
									<button
										onClick={handleEditSave}
										disabled={saving}
										className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
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

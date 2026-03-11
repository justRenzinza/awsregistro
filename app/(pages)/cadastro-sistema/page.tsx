// cadastro de sistema
"use client";

import { useEffect, useState, FormEvent } from "react";
import Sidebar from "@/app/components/Sidebar";
import { backendFetch } from "@/lib/backend";

type Sistema = {
    id: number;
    nome: string;
};

function normalizeList(resp: any): any[] {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp?.data)) return resp.data;
    if (Array.isArray(resp?.items)) return resp.items;
    if (Array.isArray(resp?.result)) return resp.result;
    if (Array.isArray(resp?.value)) return resp.value;
    if (Array.isArray(resp?.$values)) return resp.$values;
    if (Array.isArray(resp?.lista)) return resp.lista;
    if (Array.isArray(resp?.sistemas)) return resp.sistemas;
    return [];
}

function isFallbackStatus(err: any) {
    const s = Number(err?.status ?? 0);
    return s === 404 || s === 405;
}

export default function CadastroSistemaPage() {
    /* ===== Estados ===== */
    const [nome, setNome] = useState("");
    const [idEditando, setIdEditando] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);

    const [sistemas, setSistemas] = useState<Sistema[]>([]);
    const [query, setQuery] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    /* ===== Trava scroll quando modal abre ===== */
    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [showModal]);

    /* ===== Carregar Sistemas (GET /sistema) ===== */
    async function loadSistemas() {
        try {
            setError(null);

            const resp = await backendFetch("/sistema", { method: "GET" });
            if (!resp) throw new Error("Resposta inválida");

            console.log("Sistemas carregados:", resp);

            const list = normalizeList(resp);
            setSistemas(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error("Erro ao carregar sistemas:", e);
            setError("Não foi possível carregar os sistemas.");
        }
    }

    useEffect(() => {
        loadSistemas();
    }, []);

    /* ===== SUBMIT (POST OU PUT) ===== */
    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const nomeTrim = nome.trim();
        if (!nomeTrim) {
            setError("Informe o nome do sistema.");
            return;
        }

        try {
            setLoading(true);

            // payload conforme Swagger
            const payload = {
                id: idEditando ?? 0,
                nome: nomeTrim,
                observacao: "", // mantém compatibilidade sem alterar UI
            };

            // Se está editando → tenta PUT /sistema/{id}
            if (idEditando !== null) {
                try {
                    await backendFetch(`/sistema/${idEditando}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });
                } catch (err: any) {
                    // fallback: alguns backends fazem update via POST /sistema (upsert)
                    if (isFallbackStatus(err)) {
                        await backendFetch(`/sistema`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                        });
                    } else {
                        throw err;
                    }
                }

                setSuccess("Sistema atualizado com sucesso!");
            } else {
                // Novo cadastro → POST /sistema
                await backendFetch(`/sistema`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                setSuccess("Sistema cadastrado com sucesso!");
            }

            setNome("");
            setIdEditando(null);
            setShowModal(false);
            loadSistemas();
        } catch (e: any) {
            console.error("Erro ao salvar sistema:", {
                message: e?.message,
                status: e?.status,
                data: e?.data,
            });
            setError("Erro ao salvar sistema.");
        } finally {
            setLoading(false);
        }
    }

    /* ===== Editar ===== */
    function startEdit(s: Sistema) {
        setIdEditando(s.id);
        setNome(s.nome);
        setError(null);
        setSuccess(null);
        setShowModal(true);
    }

    /* ===== Limpar e abrir modal ===== */
    function handleNovo() {
        setIdEditando(null);
        setNome("");
        setError(null);
        setSuccess(null);
        setShowModal(true);
    }

    /* ===== Cancelar ===== */
    function handleCancel() {
        setShowModal(false);
        setIdEditando(null);
        setNome("");
        setError(null);
        setSuccess(null);
    }

    /* ===== Excluir ===== */
    async function handleDelete(id: number) {
        if (!confirm("Deseja realmente excluir este sistema?")) return;

        try {
            // tenta DELETE /sistema/{id}
            try {
                await backendFetch(`/sistema/${id}`, { method: "DELETE" });
            } catch (err: any) {
                // fallback comum: DELETE /sistema?id=123
                if (isFallbackStatus(err)) {
                    await backendFetch(`/sistema?id=${id}`, { method: "DELETE" });
                } else {
                    throw err;
                }
            }

            loadSistemas();
        } catch (e) {
            console.error(e);
            alert("Erro ao excluir sistema.");
        }
    }

    /* ===== Filtro ===== */
    const filtered = sistemas.filter((s) =>
        s.nome.toLowerCase().includes(query.toLowerCase())
    );

    /* ===== Render ===== */
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <Sidebar active="cadastro-sistema" />

                <div className="flex-1">
                    {/* topo mobile */}
                    <div className="sticky top-0 z-20 sm:hidden bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 border-b flex justify-center">
                        <div className="font-semibold text-white">Cadastro de Sistema</div>
                    </div>

                    <main className="mx-auto max-w-7xl p-4 md:p-6">
                        {/* LISTA DE SISTEMAS */}
                        <div className="rounded-xl bg-white shadow overflow-hidden">
                            {/* Cabeçalho branco com título + pesquisa + botão adicionar */}
                            <div className="px-4 py-3 sm:px-6 border-b">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-800">
                                            Lista de Sistemas
                                        </h2>
                                        <p className="text-xs text-gray-500">
                                            Veja, edite ou exclua os sistemas cadastrados.
                                        </p>
                                    </div>

                                    {/* Pesquisa + Botão Adicionar */}
                                    <div className="flex items-end gap-2">
                                        <div className="w-full sm:w-64">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Pesquisa rápida
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Digite para filtrar..."
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow bg-white text-gray-700"
                                            />
                                        </div>

                                        <button
											onClick={handleNovo}
											className="inline-flex items-center justify-center gap-1 px-3 h-10 rounded-lg bg-white text-gray-700 shadow transform transition-transform hover:scale-105 whitespace-nowrap"
											title="Adicionar Sistema"
											aria-label="Adicionar Sistema"
										>
											➕ Adicionar
										</button>

                                    </div>
                                </div>
                            </div>

                            {/* Tabela */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm border-separate border-spacing-0">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-center">
                                            {/* AÇÕES — primeira coluna */}
                                            <th className="px-3 py-3 w-24">Ações</th>
                                            {/* ID */}
                                            <th className="px-3 py-3 w-20">ID</th>
                                            {/* Nome */}
                                            <th className="px-3 py-3">Nome do Sistema</th>
                                        </tr>
                                    </thead>

                                    <tbody className="text-gray-900 text-center">
                                        {filtered.map((s, idx) => (
                                            <tr
                                                key={s.id}
                                                className={idx % 2 === 0 ? "bg-white" : "bg-gray-100"}
                                            >
                                                {/* AÇÕES */}
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => startEdit(s)}
                                                            className="rounded-xl bg-yellow-400 text-white font-semibold w-7 h-7 hover:bg-yellow-500 transition-transform transform hover:scale-110"
                                                            title="Editar"
                                                        >
                                                            ✎
                                                        </button>

                                                        <button
                                                            onClick={() => handleDelete(s.id)}
                                                            className="rounded-xl bg-red-400 text-white font-semibold w-7 h-7 hover:bg-red-600 transition-transform transform hover:scale-110"
                                                            title="Excluir"
                                                        >
                                                            ✖
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* ID */}
                                                <td className="px-3 py-3">{s.id}</td>

                                                {/* Nome */}
                                                <td className="px-3 py-3">{s.nome}</td>
                                            </tr>
                                        ))}

                                        {filtered.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-3 py-6 text-gray-500">
                                                    Nenhum sistema encontrado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            {/* MODAL DE CADASTRO/EDIÇÃO */}
            {showModal && (
                <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50" onClick={handleCancel}></div>

                    {/* Modal */}
                    <div className="absolute inset-0 flex items-stretch sm:items-center justify-center p-0 sm:p-3">
                        <div className="h-full w-full sm:h-auto sm:w-full sm:max-w-2xl rounded-none sm:rounded-xl bg-white shadow-lg overflow-y-auto">
                            {/* Header */}
                            <h2 className="sticky top-0 z-10 px-6 py-4 text-xl font-semibold text-blue-700 bg-white border-b">
                                {idEditando ? "Editar Sistema" : "Cadastro de Sistema"}
                            </h2>

                            {/* Body */}
                            <div className="p-6">
                                <p className="text-sm text-gray-500 mb-4">
                                    Informe o nome do sistema abaixo.
                                </p>

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

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm mb-1">
                                            <span className="text-black font-medium">Nome do Sistema</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={nome}
                                            onChange={(e) => setNome(e.target.value)}
                                            className="w-full rounded border border-gray-300 text-black px-3 py-2 text-sm"
                                            placeholder="Ex.: SACEX, SAGRAM..."
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-4">
                                        <button
                                            type="button"
                                            onClick={handleCancel}
                                            className="rounded-xl bg-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {loading ? "Salvando..." : "Salvar"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

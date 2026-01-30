// app/components/Sidebar.tsx
"use client";

import { useState, useRef, useEffect } from "react";

type SidebarKey =
    | "clientes"
    | "controle-sistema"
    | "cadastro-sistema"
    | "versao-sistema"
    | "clientes-versao"
    | "controle-registro"  // ← ESTE VAI SER USADO
    | "atualizar-clientes";

type SidebarProps = {
    active: SidebarKey;
};

const items: { key: SidebarKey; label: string; href: string }[] = [
    {
        key: "clientes",
        label: "👥 Cadastro de Clientes",
        href: "/clientes",
    },
    {
        key: "controle-sistema",
        label: "🧩 Cliente x Sistema",
        href: "/controle-sistema",
    },
    {
        key: "clientes-versao",
        label: "📊 Clientes por Versão",
        href: "/clientes-versao",
    },
    {
        key: "cadastro-sistema",
        label: "⚙️ Cadastro de Sistema",
        href: "/cadastro-sistema",
    },
    {
        key: "versao-sistema",
        label: "🗂️ Cadastro de Versão",
        href: "/versao-sistema",
    },
    {
        key: "controle-registro",  // ← ATIVADO COM HREF CORRETO
        label: "📜 Controle de Registro",
        href: "/controle-registro",  // ← MUDEI DE "#" PARA A ROTA REAL
    },
    {
        key: "atualizar-clientes",
        label: "🔁 Atualizar Clientes",
        href: "/atualizar-clientes",
    },
];

export default function Sidebar({ active }: SidebarProps) {
    const [openMobile, setOpenMobile] = useState(false);

    // usuário logado (dinâmico)
    const [usuarioLabel, setUsuarioLabel] = useState("—");

    useEffect(() => {
        if (typeof window === "undefined") return;

        const rawUser = localStorage.getItem("aws_user");
        if (rawUser && rawUser.trim()) {
            setUsuarioLabel(rawUser.trim());
            return;
        }

        const rawCliente = localStorage.getItem("aws_cliente");
        if (rawCliente) {
            try {
                const cliente = JSON.parse(rawCliente);
                const nome =
                    cliente?.login ||
                    cliente?.usuario ||
                    cliente?.nomeUsuario ||
                    cliente?.nome ||
                    "—";
                setUsuarioLabel(String(nome || "—"));
                return;
            } catch {
                // ignore
            }
        }

        setUsuarioLabel("—");
    }, []);

    // ===== função de logout =====
    function handleLogout() {
        if (typeof window === "undefined") return;

        localStorage.removeItem("aws_user");
        localStorage.removeItem("aws_cliente");
        // localStorage.removeItem("aws_token");

        window.location.href = "/";
    }

    // ====== CONTROLE DE DRAG DO BOTTOM SHEET (MOBILE) ======
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const dragStartYRef = useRef<number | null>(null);
    const dragStartTimeRef = useRef<number | null>(null);
    const lastYRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);
    const velocityRef = useRef<number>(0);

    const MAX_DRAG = 300;
    const CLOSE_THRESHOLD = 120;
    const VELOCITY_THRESHOLD = 0.9;

    function getClientY(e: any): number {
        if (e.touches && e.touches[0]) return e.touches[0].clientY;
        return e.clientY ?? 0;
    }

    const handleDragStart = (e: any) => {
        e.preventDefault();
        setIsDragging(true);

        const y = getClientY(e);
        const now = performance.now ? performance.now() : Date.now();

        dragStartYRef.current = y;
        dragStartTimeRef.current = now;
        lastYRef.current = y;
        lastTimeRef.current = now;
        velocityRef.current = 0;
    };

    const handleDragMove = (e: any) => {
        if (!isDragging || dragStartYRef.current === null) return;

        const currentY = getClientY(e);
        const delta = currentY - dragStartYRef.current;

        if (delta <= 0) {
            setDragOffset(0);
            return;
        }

        const limitado = Math.min(delta, MAX_DRAG);
        setDragOffset(limitado);

        const now = performance.now ? performance.now() : Date.now();
        if (lastYRef.current !== null && lastTimeRef.current !== null) {
            const dy = currentY - lastYRef.current;
            const dt = now - lastTimeRef.current;
            if (dt > 0) {
                velocityRef.current = dy / dt;
            }
        }
        lastYRef.current = currentY;
        lastTimeRef.current = now;
    };

    const handleDragEnd = () => {
        if (!isDragging) return;

        const speed = Math.abs(velocityRef.current);

        const shouldClose =
            dragOffset > CLOSE_THRESHOLD || speed > VELOCITY_THRESHOLD;

        if (shouldClose) {
            setOpenMobile(false);
        }

        setIsDragging(false);
        setDragOffset(0);
        dragStartYRef.current = null;
        dragStartTimeRef.current = null;
        lastYRef.current = null;
        lastTimeRef.current = null;
        velocityRef.current = 0;
    };

    // impedir scroll do fundo quando menu mobile aberto
    useEffect(() => {
        if (openMobile) {
            document.body.style.overflow = "hidden";
            document.body.style.position = "relative";
        } else {
            document.body.style.overflow = "";
            document.body.style.position = "";
        }

        return () => {
            document.body.style.overflow = "";
            document.body.style.position = "";
        };
    }, [openMobile]);

    return (
        <>
            {/* SIDEBAR DESKTOP - responsiva para telas menores */}
            <aside className="hidden sm:flex sm:flex-col sm:w-52 lg:w-60 xl:w-64 sm:min-h-screen sm:sticky sm:top-0 sm:bg-white sm:shadow sm:border-r">
                <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-3 lg:p-4 text-white">
                    <div className="font-semibold text-center text-sm lg:text-base">
                        AWSRegistro | Painel
                    </div>
                </div>

                <nav className="flex-1 p-2 lg:p-3 overflow-y-auto">
                    {items.map((item) => {
                        const isActive = item.key === active;
                        const base =
                            "mb-1 flex items-center justify-between rounded-lg px-2 lg:px-3 py-2 text-xs lg:text-sm font-semibold transition-colors";

                        const classes = isActive
                            ? `${base} text-gray-900 bg-blue-50 border border-blue-200`
                            : `${base} text-gray-700 hover:bg-gray-100`;

                        return (
                            <a key={item.key} href={item.href} className={classes}>
                                <span className="truncate">{item.label}</span>
                            </a>
                        );
                    })}
                </nav>

                <div className="p-2 lg:p-3 text-xs lg:text-sm text-gray-600">
                    <div className="rounded-lg border p-2 lg:p-3 space-y-2">
                        <div className="font-medium text-gray-800 text-xs lg:text-sm">
                            Usuário
                        </div>

                        <div className="flex items-center justify-between gap-1 lg:gap-2">
                            <span className="text-gray-700 truncate text-xs lg:text-sm flex-1 min-w-0">
                                {usuarioLabel}
                            </span>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="inline-flex items-center rounded-md bg-red-500 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 whitespace-nowrap flex-shrink-0"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* BOTÃO DO MENU (MOBILE) */}
            <button
                type="button"
                onClick={() => {
                    setOpenMobile(true);
                    setDragOffset(0);
                }}
                className="fixed top-1.5 left-4 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 text-lg shadow-xl sm:hidden active:scale-95 transition-transform"
                aria-label="Abrir menu"
            >
                ☰
            </button>

            {/* MENU MOBILE (BOTTOM SHEET) */}
            {openMobile && (
                <div
                    className="fixed inset-0 z-50 sm:hidden"
                    aria-modal="true"
                    role="dialog"
                    onClick={() => setOpenMobile(false)}
                >
                    {/* backdrop */}
                    <div className="absolute inset-0 bg-black/40" />

                    {/* sheet */}
                    <div
                        className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white shadow-xl pb-4 pt-3 overscroll-y-contain"
                        onClick={(e) => e.stopPropagation()}
                        onTouchMove={handleDragMove}
                        onTouchEnd={handleDragEnd}
                        onTouchCancel={handleDragEnd}
                        onMouseMove={handleDragMove}
                        onMouseUp={handleDragEnd}
                        onMouseLeave={handleDragEnd}
                        style={{
                            transform: `translateY(${dragOffset}px)`,
                            transition: isDragging ? "none" : "transform 0.18s ease-out",
                            touchAction: "none",
                        }}
                    >
                        {/* handle que realmente arrasta */}
                        <div
                            className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-gray-300 cursor-pointer active:bg-gray-400"
                            onTouchStart={handleDragStart}
                            onMouseDown={handleDragStart}
                        />

                        <div className="px-4 pb-2">
                            <div className="text-sm font-semibold text-gray-800">
                                AWSRegistro | Menu
                            </div>
                            <div className="mt-1 text-xs text-gray-600">
                                Usuário:{" "}
                                <span className="font-medium text-gray-800">
                                    {usuarioLabel}
                                </span>
                            </div>
                        </div>

                        <nav className="px-3 max-h-[55vh] overflow-y-auto overscroll-y-contain">
                            {items.map((item) => {
                                const isActive = item.key === active;
                                const base =
                                    "mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold";

                                const classes = isActive
                                    ? `${base} text-gray-900 bg-blue-50 border border-blue-200`
                                    : `${base} text-gray-700 hover:bg-gray-100`;

                                return (
                                    <a
                                        key={item.key}
                                        href={item.href}
                                        className={classes}
                                        onClick={() => setOpenMobile(false)}
                                    >
                                        <span>{item.label}</span>
                                    </a>
                                );
                            })}
                        </nav>

                        {/* botão logout mobile */}
                        <div className="mt-3 px-4">
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full inline-flex items-center justify-center rounded-md bg-red-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

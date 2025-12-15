// app/components/Sidebar.tsx
"use client";

import { useState, useRef, useEffect } from "react";

type SidebarKey =
	| "clientes"
	| "controle-sistema"
	| "cadastro-sistema"
	| "versao-sistema"
	| "clientes-versao"
	| "controle-registro"
	| "atualizar-clientes";

type SidebarProps = {
	active: SidebarKey;
};

const items: { key: SidebarKey; label: string; href: string }[] = [
	{
		key: "clientes",
		label: "👥 Cadastro de Clientes", //
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
		key: "atualizar-clientes",
		label: "🔁 Atualizar Clientes",
		href: "/atualizar-clientes",
	},
	{
		key: "controle-registro",
		label: "📜 Controle de Registro",
		href: "#",
	},
];

export default function Sidebar({ active }: SidebarProps) {
	const [openMobile, setOpenMobile] = useState(false);

	// ✅ usuário logado (dinâmico)
	const [usuarioLabel, setUsuarioLabel] = useState("—");

	// pega do localStorage (login digitado) ou do cliente (se existir)
	useEffect(() => {
		if (typeof window === "undefined") return;

		// 1) preferir o usuário digitado no login (ex.: AWS, allware)
		const rawUser = localStorage.getItem("aws_user");
		if (rawUser && rawUser.trim()) {
			setUsuarioLabel(rawUser.trim());
			return;
		}

		// 2) fallback: tentar ler algo do aws_cliente se tiver
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
				// ignora parse errado
			}
		}

		setUsuarioLabel("—");
	}, []);

	// ====== CONTROLE DE DRAG DO BOTTOM SHEET (MOBILE) ======
	const [dragOffset, setDragOffset] = useState(0); // quanto já desceu em px
	const [isDragging, setIsDragging] = useState(false);

	const dragStartYRef = useRef<number | null>(null);
	const dragStartTimeRef = useRef<number | null>(null);
	const lastYRef = useRef<number | null>(null);
	const lastTimeRef = useRef<number | null>(null);
	const velocityRef = useRef<number>(0); // px/ms

	const MAX_DRAG = 300; // limite máximo que o sheet pode descer
	const CLOSE_THRESHOLD = 120; // deslocamento mínimo pra fechar
	const VELOCITY_THRESHOLD = 0.9; // velocidade mínima (px/ms) pra fechar num swipe rápido

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

		// se arrastar pra cima, não sobe mais que 0
		if (delta <= 0) {
			setDragOffset(0);
			return;
		}

		const limitado = Math.min(delta, MAX_DRAG);
		setDragOffset(limitado);

		// calcula velocidade
		const now = performance.now ? performance.now() : Date.now();
		if (lastYRef.current !== null && lastTimeRef.current !== null) {
			const dy = currentY - lastYRef.current;
			const dt = now - lastTimeRef.current;
			if (dt > 0) {
				velocityRef.current = dy / dt; // px/ms
			}
		}
		lastYRef.current = currentY;
		lastTimeRef.current = now;
	};

	const handleDragEnd = () => {
		if (!isDragging) return;

		const speed = Math.abs(velocityRef.current); // px/ms

		const shouldClose =
			dragOffset > CLOSE_THRESHOLD || speed > VELOCITY_THRESHOLD;

		if (shouldClose) {
			setOpenMobile(false);
		}

		// reseta o offset/estado (se não fechar, ele volta suavemente)
		setIsDragging(false);
		setDragOffset(0);
		dragStartYRef.current = null;
		dragStartTimeRef.current = null;
		lastYRef.current = null;
		lastTimeRef.current = null;
		velocityRef.current = 0;
	};

	/* ===== impedir scroll do fundo quando menu mobile aberto ===== */
	useEffect(() => {
		if (openMobile) {
			// bloqueia rolagem vertical e horizontal da página atrás
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
			{/* SIDEBAR DESKTOP */}
			<aside className="hidden sm:flex sm:flex-col sm:w-64 sm:min-h-screen sm:sticky sm:top-0 sm:bg-white sm:shadow sm:border-r">
				<div className="bg-gradient-to-r from-blue-700 to-blue-500 p-4 text-white">
					<div className="font-semibold text-center">AWSRegistro | Painel</div>
				</div>

				<nav className="flex-1 p-3">
					{items.map((item) => {
						const isActive = item.key === active;
						const base =
							"mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold";

						const classes = isActive
							? `${base} text-gray-900 bg-blue-50 border border-blue-200`
							: `${base} text-gray-700 hover:bg-gray-100`;

						return (
							<a key={item.key} href={item.href} className={classes}>
								<span>{item.label}</span>
							</a>
						);
					})}
				</nav>

				<div className="p-3 text-sm text-gray-600">
					<div className="rounded-lg border p-3">
						<div className="mb-1 font-medium text-gray-800">Usuário</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-700">{usuarioLabel}</span>
						</div>
					</div>
				</div>
			</aside>

			{/* BOTÃO DO MENU (MOBILE) – lado ESQUERDO, contido na barra azul */}
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
								Usuário: <span className="font-medium text-gray-800">{usuarioLabel}</span>
							</div>
						</div>

						<nav className="px-3 max-h-[60vh] overflow-y-auto overscroll-y-contain">
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
					</div>
				</div>
			)}
		</>
	);
}

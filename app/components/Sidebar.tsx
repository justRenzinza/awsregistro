// app/components/Sidebar.tsx
"use client";

import { useState } from "react";

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
	{ key: "clientes", label: "👥 Clientes", href: "/clientes" },
	{
		key: "controle-sistema",
		label: "🧩 Controle de Sistema",
		href: "/controle-sistema",
	},
	{
		key: "cadastro-sistema",
		label: "⚙️ Cadastro de Sistema",
		href: "/cadastro-sistema",
	},
	{
		key: "versao-sistema",
		label: "🗂️ Versão dos Sistema",
		href: "/versao-sistema",
	},
	{
		key: "clientes-versao",
		label: "📊 Clientes por Versão",
		href: "/clientes-versao",
	},
	{ key: "controle-registro", label: "📜 Controle Registro", href: "#" },
	{
		key: "atualizar-clientes",
		label: "🔁 Atualizar Clientes",
		href: "/atualizar-clientes",
	},
];

export default function Sidebar({ active }: SidebarProps) {
	const [openMobile, setOpenMobile] = useState(false);

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
							<span className="text-gray-700">AWS</span>
							<span className="text-gray-400">▾</span>
						</div>
					</div>
				</div>
			</aside>

			{/* BOTÃO DO MENU (MOBILE) – lado ESQUERDO, contido na barra azul */}
			<button
				type="button"
				onClick={() => setOpenMobile(true)}
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
						className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white shadow-xl pb-4 pt-3"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-gray-300" />

						<div className="px-4 pb-2">
							<div className="text-sm font-semibold text-gray-800">
								AWSRegistro | Menu
							</div>
						</div>

						<nav className="px-3">
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

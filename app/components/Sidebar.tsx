// app/components/Sidebar.tsx
"use client";

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
	{ key: "controle-sistema", label: "🧩 Controle de Sistema", href: "/controle-sistema" },
	{ key: "cadastro-sistema", label: "⚙️ Cadastro de Sistema", href: "/cadastro-sistema" },
	{ key: "versao-sistema", label: "🔄 Versão dos Sistemas", href: "/versao-sistema" },
	{ key: "clientes-versao", label: "📊 Clientes por Versão", href: "/clientes-versao" },
	{ key: "controle-registro", label: "📜 Controle Registro", href: "#" },
	{ key: "atualizar-clientes", label: "Atualizar Clientes", href: "/atualizar-clientes" },

];

export default function Sidebar({ active }: SidebarProps) {
	return (
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
	);
}

import type { Cliente } from "../(pages)/clientes/page";

function formatCNPJ(v: string) {
	const s = (v || "").replace(/\D/g, "").slice(0, 14);
	return s
		.replace(/^(\d{2})(\d)/, "$1.$2")
		.replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
		.replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1/$2")
		.replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d{1,2}).*$/, "$1-$2");
}

function formatPhone(v: string) {
	const s = (v || "").replace(/\D/g, "").slice(0, 11);
	if (s.length <= 10) {
		return s.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{4})$/, "$1-$2");
	}
	return s.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{4})$/, "$1-$2");
}

export function toCSV(rows: Cliente[]): string {
	const header = [
		"Código",
		"Razão Social",
		"Documento",
		"Data Registro",
		"Contato",
		"Telefone",
		"Email",
	];

	const body = rows.map((r) => {
		const cols = [
			r.codigo,
			r.razaoSocial,
			formatCNPJ(String((r as any).cnpj ?? r.documento ?? "")),
			r.dataRegistro,
			r.contato,
			formatPhone(r.telefone),
			r.email,
		].map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`);
		return cols.join(";");
	});

	return "\uFEFF" + header.join(";") + "\n" + body.join("\n");
}

export function downloadCSV(csv: string, filename = "clientes.csv") {
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

type ControleSistemaLike = {
	clienteId: number;
	sistema: string;
	qtdLicenca: number;
	qtdDiaLiberacao: number;
	status: string;
};

export function toCSVControleSistema(
	rows: ControleSistemaLike[],
	resolveClienteNome: (id: number) => string
): string {
	const header = [
		"Cliente",
		"Sistema",
		"Qtd. Licença",
		"Qtd. Dia Liberação",
		"Status",
	];

	const body = rows.map((r) => {
		const cols = [
			resolveClienteNome(r.clienteId),
			r.sistema,
			r.qtdLicenca,
			r.qtdDiaLiberacao,
			r.status,
		].map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`);
		return cols.join(";");
	});

	return "\uFEFF" + header.join(";") + "\n" + body.join("\n");
}

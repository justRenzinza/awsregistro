// lib/backend.ts

/**
 * ATENÇÃO (Vercel):
 * - Em produção (HTTPS), o browser não pode chamar backend HTTP direto (Mixed Content).
 * - Por isso, quando estiver rodando no browser e NÃO for localhost, usamos o proxy:
 *     /api/proxy/...
 * - No localhost, pode chamar direto o BACKEND_URL (ou também pode usar o proxy, se quiser).
 */

// URL base do backend (DEV/local). Mantive exatamente seu padrão.
// Se quiser, pode trocar para "...:8046/v1" como você já usa.
export const BACKEND_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || "http://189.50.1.222:8046";

/**
 * Lê o token salvo no localStorage pelo login
 */
export function getAuthHeaders(): Record<string, string> {
	if (typeof window === "undefined") return {};
	const token = localStorage.getItem("aws_token");
	return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Normaliza qualquer tipo de headers (Headers, array, objeto simples)
 * para um objeto { [chave]: valor }
 */
function normalizeHeaders(h: HeadersInit | undefined): Record<string, string> {
	if (!h) return {};

	// Headers()
	if (h instanceof Headers) {
		const obj: Record<string, string> = {};
		h.forEach((v, k) => {
			obj[k] = v;
		});
		return obj;
	}

	// Array [ [k, v], ... ]
	if (Array.isArray(h)) {
		const obj: Record<string, string> = {};
		for (const [k, v] of h) {
			obj[k] = v;
		}
		return obj;
	}

	// Objeto simples
	return h as Record<string, string>;
}

/**
 * Decide qual "base" usar:
 * - Produção no browser (Vercel): usa /api/proxy
 * - Localhost no browser: usa BACKEND_URL direto (mantém seu comportamento atual)
 * - SSR (server): pode usar BACKEND_URL direto também (mas normalmente suas páginas são "use client")
 */
function getBaseUrl(): string {
	// Se está no browser
	if (typeof window !== "undefined") {
		const host = window.location.hostname;
		const isLocal = host === "localhost" || host === "127.0.0.1";

		// Em produção (não-local), usa proxy do próprio domínio
		if (!isLocal) return "/api/proxy";

		// Localhost: usa backend direto
		return BACKEND_URL;
	}

	// No server (build/runtime): em geral não chamamos backend aqui,
	// mas se chamar, mantém o BACKEND_URL.
	return BACKEND_URL;
}

/**
 * Garante que não vai dar "//" e que path sempre tem "/"
 */
function joinUrl(base: string, path: string): string {
	const b = String(base || "").replace(/\/+$/, "");
	const p = String(path || "").startsWith("/") ? path : `/${path}`;
	return `${b}${p}`;
}

/**
 * Wrapper padrão para chamadas ao backend
 */
export async function backendFetch(
	path: string,
	options: RequestInit = {}
): Promise<any> {
	const base = getBaseUrl();

	// Quando base é "/api/proxy", precisamos repassar o path "limpo"
	// Ex: backendFetch("/clientesistema") => "/api/proxy/clientesistema"
	const url = joinUrl(base, path);

	// headers vindos de quem chamou
	const incoming = normalizeHeaders(options.headers);

	// headers de auth com token
	const authHeaders = getAuthHeaders();

	// objeto final de headers (objeto simples)
	const finalHeaders: Record<string, string> = {
		...incoming,
		...authHeaders,
	};

	// Só força Content-Type quando tem body
	// (evita dar problema em GET/DELETE e em alguns backends mais chatos)
	const hasBody = options.body !== undefined && options.body !== null;
	if (hasBody && !finalHeaders["Content-Type"] && !finalHeaders["content-type"]) {
		finalHeaders["Content-Type"] = "application/json";
	}

	const resp = await fetch(url, {
		...options,
		headers: finalHeaders as HeadersInit,
	});

	// --- trata respostas sem corpo (204/205) ---
	if (resp.status === 204 || resp.status === 205) {
		if (!resp.ok) {
			const err = new Error(`Backend error ${resp.status}: no content`) as Error & {
				status?: number;
				data?: any;
			};
			err.status = resp.status;
			err.data = null;
			throw err;
		}
		return null;
	}

	const text = await resp.text();
	let data: any = null;

	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		data = text; // texto cru
	}

	if (!resp.ok) {
		const err = new Error(
			`Backend error ${resp.status}: ${
				typeof data === "string" ? data : JSON.stringify(data)
			}`
		) as Error & { status?: number; data?: any };
		err.status = resp.status;
		err.data = data;
		throw err;
	}

	return data;
}

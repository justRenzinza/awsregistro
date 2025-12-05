// lib/backend.ts

// URL base do backend (pode usar variável de ambiente se quiser)
export const BACKEND_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || "http://189.50.1.222:8046/v1";

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
 * Wrapper padrão para chamadas ao backend
 */
export async function backendFetch(
	path: string,
	options: RequestInit = {}
): Promise<any> {
	const url = `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;

	// headers vindos de quem chamou
	const incoming = normalizeHeaders(options.headers);
	// headers de auth com token
	const authHeaders = getAuthHeaders();

	// objeto final de headers (objeto simples)
	const finalHeaders: Record<string, string> = {
		"Content-Type": "application/json",
		...incoming,
		...authHeaders,
	};

	// aqui a mágica: cast explícito pra HeadersInit
	const resp = await fetch(url, {
		...options,
		headers: finalHeaders as HeadersInit,
	});

	const text = await resp.text();
	let data: any = null;

	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		data = text;
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

// lib/backend.ts

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

function normalizeHeaders(h: HeadersInit | undefined): Record<string, string> {
	if (!h) return {};
	if (h instanceof Headers) {
		const obj: Record<string, string> = {};
		h.forEach((v, k) => (obj[k] = v));
		return obj;
	}
	if (Array.isArray(h)) {
		const obj: Record<string, string> = {};
		for (const [k, v] of h) obj[k] = v;
		return obj;
	}
	return h as Record<string, string>;
}

/**
 * Em produção (Vercel/HTTPS), usa /api/proxy para evitar Mixed Content.
 * Em dev (localhost), pode ir direto no backend http.
 */
function buildUrl(path: string) {
	const cleanPath = path.startsWith("/") ? path : `/${path}`;

	const isBrowser = typeof window !== "undefined";
	const isHttps =
		isBrowser && window.location && window.location.protocol === "https:";

	// Se estiver em HTTPS, usa o proxy interno do Next (/api/proxy)
	if (isHttps) {
		// remove /v1 do começo (porque o proxy vai montar o caminho)
		const p = cleanPath.replace(/^\/v1\b/, "");
		return `/api/proxy${p}`;
	}

	// Caso contrário, chama direto o backend
	return `${BACKEND_URL}${cleanPath}`;
}

export async function backendFetch(
	path: string,
	options: RequestInit = {}
): Promise<any> {
	const url = buildUrl(path);

	const incoming = normalizeHeaders(options.headers);
	const authHeaders = getAuthHeaders();

	const finalHeaders: Record<string, string> = {
		"Content-Type": "application/json",
		...incoming,
		...authHeaders,
	};

	const resp = await fetch(url, {
		...options,
		headers: finalHeaders as HeadersInit,
	});

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

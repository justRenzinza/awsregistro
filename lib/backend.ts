// lib/backend.ts

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

function buildUrl(path: string) {
	const cleanPath = path.startsWith("/") ? path : `/${path}`;
	return `/api/backend${cleanPath}`;
}

function safePreview(text: string, max = 200) {
	if (!text) return "";
	return text.length > max ? text.slice(0, max) + "..." : text;
}

export async function backendFetch(
	path: string,
	options: RequestInit = {}
): Promise<any> {
	const url = buildUrl(path);

	console.log("🔵 Backend fetch iniciado:", {
		path,
		url,
		method: options.method || "GET",
	});

	const incoming = normalizeHeaders(options.headers);

	try {
		const resp = await fetch(url, {
			...options,
			credentials: "include",
			headers: {
				...incoming,
			} as HeadersInit,
			cache: "no-store",
		});

		console.log("📡 Resposta recebida:", {
			status: resp.status,
			statusText: resp.statusText,
			ok: resp.ok,
		});

		// ✅ 204/205: por definição não tem corpo
		if (resp.status === 204 || resp.status === 205) {
			console.log("✅ Resposta sem conteúdo (204/205).");
			if (!resp.ok) {
				const err = new Error(`Backend error ${resp.status}: No Content`) as Error & {
					status?: number;
					data?: any;
				};
				err.status = resp.status;
				err.data = null;
				throw err;
			}
			return {}; // padrão: sucesso sem payload
		}

		const text = await resp.text();
		console.log("📄 Corpo da resposta (raw):", safePreview(text));

		let data: any = null;

		// ✅ se vier vazio (alguns backends respondem 200 com body vazio)
		if (!text) {
			data = null;
		} else {
			try {
				data = JSON.parse(text);
			} catch {
				console.warn("⚠️ Falha ao parsear JSON, usando texto bruto");
				data = text;
			}
		}

		if (!resp.ok) {
			console.error("❌ Erro do backend:", {
				status: resp.status,
				statusText: resp.statusText,
				data,
			});

			const err = new Error(
				`Backend error ${resp.status}: ${
					typeof data === "string" ? data : JSON.stringify(data)
				}`
			) as Error & { status?: number; data?: any };

			err.status = resp.status;
			err.data = data;
			throw err;
		}

		console.log("✅ Requisição bem-sucedida");
		return data ?? {};
	} catch (error) {
		console.error("❌ Backend fetch error:", {
			path,
			url,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw error;
	}
}

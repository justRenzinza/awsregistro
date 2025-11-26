/* eslint-disable @typescript-eslint/no-explicit-any */

//search generico pra funcionar no site todo
function toStr(v: unknown): string {
	return String(v ?? "").trim().toLowerCase();
}

export function matchFields<T extends Record<string, any>>(
	record: T,
	query: string,
	fields: (keyof T)[] | string[],
	extras: string[] = []
): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;

	const tokens = q.split(/\s+/).filter(Boolean);
	const haystack = [
		...(fields as string[]).map((k) => toStr(record[k as keyof T])),
		...extras.map(toStr),
	].join(" ");

	return tokens.every((t) => haystack.includes(t));
}

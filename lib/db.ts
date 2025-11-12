// lib/db.ts
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
	throw new Error("DATABASE_URL não está definida nas variáveis de ambiente.");
}

// Singleton do Pool (evita abrir conexão a cada chamada em serverless)
const globalForPool = global as unknown as { __pgPool?: Pool };

export const pool =
	globalForPool.__pgPool ??
	new Pool({
		connectionString: DATABASE_URL,
		ssl: { rejectUnauthorized: false }, // Supabase + pooler pedem SSL
		// Ajustes seguros p/ PgBouncer (Vercel):
		max: 1,
		idleTimeoutMillis: 0,
	});

if (!globalForPool.__pgPool) {
	globalForPool.__pgPool = pool;
}

// T agora respeita o constraint exigido por pg: QueryResultRow
export async function query<T extends QueryResultRow = QueryResultRow>(
	text: string,
	params: any[] = []
): Promise<QueryResult<T>> {
	const res = await pool.query<T>(text, params);
	return res;
}

export async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
	const client = await pool.connect();
	try {
		return await fn(client);
	} finally {
		client.release();
	}
}

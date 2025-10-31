// lib/db.ts
import { Pool, QueryResultRow } from "pg";

// manter uma instância única em dev
const globalAny = globalThis as unknown as { pgPool?: Pool };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL não está definida no .env.local");
}

// cria (ou reusa) o pool
export const pool: Pool =
    globalAny.pgPool ??
    new Pool({
        connectionString,
        ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
        idleTimeoutMillis: 30_000,
});

if (!globalAny.pgPool) {
    globalAny.pgPool = pool;
}

// helper tipado: T precisa extender QueryResultRow
export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: any[] = []
) {
    const res = await pool.query<T>(text, params);
    return res;
}

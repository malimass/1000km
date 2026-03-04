import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;

function getInstance(): ReturnType<typeof neon> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL non impostata nelle variabili d'ambiente Vercel");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<any[]> {
  return (getInstance() as any)(strings, ...values);
}

/**
 * Banco em memória para os testes, usando sql.js (SQLite em WebAssembly, sem compilar nada).
 * Implementa a mesma interface `Db` que o app usa com o expo-sqlite.
 */
import initSqlJs from "sql.js";
import type { Db, SqlParam } from "../db";
import { migrate } from "../migrations";

export async function createTestDb(options: { migrate?: boolean } = {}): Promise<Db> {
  const SQL = await initSqlJs();
  const raw = new SQL.Database();
  raw.run("PRAGMA foreign_keys = ON");

  const getAll = <T>(sql: string, params: SqlParam[] = []): T[] => {
    const statement = raw.prepare(sql);
    try {
      statement.bind(params);
      const rows: T[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as T);
      return rows;
    } finally {
      statement.free();
    }
  };

  const db: Db = {
    async execAsync(sql) {
      raw.exec(sql);
    },
    async runAsync(sql, params = []) {
      raw.run(sql, params);
      const changes = raw.getRowsModified();
      const [row] = getAll<{ id: number }>("SELECT last_insert_rowid() AS id");
      return { changes, lastInsertRowId: row?.id ?? 0 };
    },
    async getAllAsync<T>(sql: string, params: SqlParam[] = []) {
      return getAll<T>(sql, params);
    },
    async getFirstAsync<T>(sql: string, params: SqlParam[] = []) {
      return getAll<T>(sql, params)[0] ?? null;
    },
    async withTransactionAsync(task) {
      raw.run("BEGIN");
      try {
        await task();
        raw.run("COMMIT");
      } catch (error) {
        raw.run("ROLLBACK");
        throw error;
      }
    },
  };

  if (options.migrate !== false) await migrate(db);
  return db;
}

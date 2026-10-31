import * as SQLite from "expo-sqlite";
import type { Db, SqlParam } from "./db";
import { migrate } from "./migrations";

//nome do arquivo do banco de dados
export const DATABASE_NAME = "contaai.db";

//adapta o SALiteDatabase do expo-sqlitte à interface Db usada
function toDb(database: SQLite.SQLiteDatabase): Db {
  return {
    execAsync: (sql) => database.execAsync(sql),
    runAsync: (sql, params = []) => database.runAsync(sql, params),
    getAllAsync: <T>(sql: string, params: SqlParam[] = []) =>
      database.getAllAsync<T>(sql, params),
    getFirstAsync: <T>(sql: string, params: SqlParam[] = []) =>
      database.getFirstAsync<T>(sql, params),
    withTransactionAsync: (task) => database.withTransactionAsync(task),
  };
}

//abre o banco do App e aplicar migrações
export async function openAppDatabase(): Promise<Db> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await database.execAsync(
    "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;",
  );
  const db = toDb(database);
  await migrate(db);
  return db;
}

//variável de abertura
let opening: Promise<Db> | null = null;

//devolve sempre o mesmo banco, abrindo e migrando uma única vez
export function getAppDatabase(): Promise<Db> {
  if (!opening) {
    opening = openAppDatabase().catch((error) => {
      opening = null;
      throw error;
    });
  }
  return opening;
}

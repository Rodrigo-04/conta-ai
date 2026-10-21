//interface do banco de dados usada pelo app
//valores permitidos para consultas sql
export type SqlParam = string | number | null;

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

//cria uma interface Db, permitindo que o mesmo código pode funcionar com diferentes implementações de banco
export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SqlParam[]): Promise<RunResult>;
  getAllAsync<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

//fila de transações
const queues = new WeakMap<Db, Promise<unknown>>();

//organiza e controla a execução de comandos sql
export function inTransaction<T>(db: Db, fn: () => Promise<T>): Promise<T> {
  const previous = queues.get(db) ?? Promise.resolve();
  const run = previous
    .catch(() => undefined)
    .then(async () => {
      let result: T | undefined;
      await db.withTransactionAsync(async () => {
        result = await fn();
      });
      return result as T;
    });
  queues.set(db, run);
  return run;
}

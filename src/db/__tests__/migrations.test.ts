/** @jest-environment node */
import { LATEST_VERSION, migrate } from "../migrations";
import { createTestDb } from "../testing/testDb";

describe("migrações", () => {
  it("cria todas as tabelas e grava a versão", async () => {
    const db = await createTestDb();
    const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
    expect(version?.user_version).toBe(LATEST_VERSION);

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual(
      expect.arrayContaining(["conta", "pessoa", "item", "consumo", "parcela"]),
    );
  });

  it("pode rodar de novo sem erro e sem refazer nada", async () => {
    const db = await createTestDb();
    await db.runAsync(
      "INSERT INTO conta (id, data, created_at, updated_at) VALUES ('c1', '2026-10-17', 1, 1)",
    );
    await migrate(db);
    await migrate(db);
    const rows = await db.getAllAsync("SELECT id FROM conta");
    expect(rows).toHaveLength(1);
  });

  it("as chaves estrangeiras estão ligadas", async () => {
    const db = await createTestDb();
    await expect(
      db.runAsync(
        "INSERT INTO item (id, conta_id, nome, valor_linha_centavos, created_at, updated_at) VALUES ('i', 'nao-existe', 'x', 100, 1, 1)",
      ),
    ).rejects.toThrow();
  });

  it("recusa valores inválidos pelas regras do banco", async () => {
    const db = await createTestDb();
    await db.runAsync("INSERT INTO conta (id, data, created_at, updated_at) VALUES ('c', '2026-10-17', 1, 1)");
    await expect(
      db.runAsync(
        "INSERT INTO item (id, conta_id, nome, valor_linha_centavos, created_at, updated_at) VALUES ('i', 'c', 'x', -1, 1, 1)",
      ),
    ).rejects.toThrow();
    await expect(
      db.runAsync(
        "INSERT INTO parcela (id, conta_id, pessoa_id, valor_devido_centavos, status, created_at, updated_at) VALUES ('p', 'c', 'x', 1, 'talvez', 1, 1)",
      ),
    ).rejects.toThrow();
  });
});

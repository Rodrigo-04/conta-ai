//cria o banco de dados

import { inTransaction, type Db } from "./db";

//objeto migration
export interface Migration {
  version: number;
  name: string;
  sql: string;
}

/**
 * Migrações posseum orede, precisam ser criadas nela.
 * Não editamos migrações públicadas, criamos uma nova com uma versão maior.
 * A versão aplicada fica em "PRAGMA user_version".
 */
//migrações
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: "esquema inicial",
    sql: `
      CREATE TABLE conta (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        data TEXT NOT NULL,
        restaurante TEXT,
        total_impresso_centavos INTEGER CHECK (total_impresso_centavos IS NULL OR total_impresso_centavos >= 0),
        taxa_percentual REAL CHECK (taxa_percentual IS NULL OR taxa_percentual >= 0),
        taxa_centavos INTEGER CHECK (taxa_centavos IS NULL OR taxa_centavos >= 0),
        desconto_centavos INTEGER NOT NULL DEFAULT 0 CHECK (desconto_centavos >= 0),
        modo_divisao TEXT NOT NULL DEFAULT 'itens' CHECK (modo_divisao IN ('igual', 'itens')),
        modo_taxa TEXT NOT NULL DEFAULT 'igual' CHECK (modo_taxa IN ('igual', 'proporcional')),
        pagador_id TEXT REFERENCES pessoa(id),
        diferenca_centavos INTEGER NOT NULL DEFAULT 0 CHECK (diferenca_centavos >= 0),
        pessoa_diferenca_id TEXT REFERENCES pessoa(id),
        sorteio_realizado INTEGER NOT NULL DEFAULT 0 CHECK (sorteio_realizado IN (0, 1)),
        foto_caminho_local TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );

      CREATE TABLE pessoa (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        conta_id TEXT NOT NULL REFERENCES conta(id),
        nome TEXT NOT NULL,
        apelido TEXT,
        ordem INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );

      CREATE TABLE item (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        conta_id TEXT NOT NULL REFERENCES conta(id),
        nome TEXT NOT NULL,
        quantidade REAL NOT NULL DEFAULT 1 CHECK (quantidade > 0),
        valor_linha_centavos INTEGER NOT NULL CHECK (valor_linha_centavos >= 0),
        ordem INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );

      CREATE TABLE consumo (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        item_id TEXT NOT NULL REFERENCES item(id),
        pessoa_id TEXT NOT NULL REFERENCES pessoa(id),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        UNIQUE (item_id, pessoa_id)
      );

      CREATE TABLE parcela (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        conta_id TEXT NOT NULL REFERENCES conta(id),
        pessoa_id TEXT NOT NULL REFERENCES pessoa(id),
        valor_devido_centavos INTEGER NOT NULL CHECK (valor_devido_centavos >= 0),
        status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
        pago_em INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        UNIQUE (conta_id, pessoa_id)
      );

      CREATE INDEX idx_conta_data ON conta (data, created_at);
      CREATE INDEX idx_pessoa_conta ON pessoa (conta_id);
      CREATE INDEX idx_item_conta ON item (conta_id);
      CREATE INDEX idx_consumo_item ON consumo (item_id);
      CREATE INDEX idx_consumo_pessoa ON consumo (pessoa_id);
      CREATE INDEX idx_parcela_conta ON parcela (conta_id);
    `,
  },
];

//última versão da migration (olha quantas foram criadas)
export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

//aplica as migrações pendentes
//PRAGMa é um recurso SQLite que permite armazenar o núemro da versão
export async function migrate(db: Db): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const current = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await inTransaction(db, async () => {
      await db.execAsync(migration.sql);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}

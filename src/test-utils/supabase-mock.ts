import { vi } from "vitest";

type MockResponse = {
  data: unknown;
  error: { message: string } | null;
};

type TableConfig = {
  select?: MockResponse;
  insert?: MockResponse;
  update?: MockResponse;
  delete?: MockResponse;
  upsert?: MockResponse;
};

type MockConfig = {
  tables?: Record<string, TableConfig>;
  auth?: {
    getUser?: { data: { user: { email: string } | null }; error: null };
  };
};

/**
 * チェーン可能な Supabase クライアントモックを生成する。
 *
 * 使い方:
 * ```ts
 * const { supabase, mockModule } = createMockSupabase({
 *   tables: {
 *     teachers: { select: { data: { id: "t1" }, error: null } },
 *   },
 *   auth: {
 *     getUser: { data: { user: { email: "teacher@example.com" } }, error: null },
 *   },
 * });
 * ```
 */
export function createMockSupabase(config: MockConfig = {}) {
  const defaultResponse: MockResponse = { data: null, error: null };

  // テーブルごとの動的レスポンスを管理
  // setTableResponse で後から変更可能
  const tableResponses = new Map<string, TableConfig>();
  if (config.tables) {
    for (const [table, cfg] of Object.entries(config.tables)) {
      tableResponses.set(table, { ...cfg });
    }
  }

  function getTableConfig(table: string): TableConfig {
    return tableResponses.get(table) ?? {};
  }

  // チェーン可能なクエリビルダー
  function createQueryBuilder(table: string, operation: keyof TableConfig) {
    const cfg = getTableConfig(table);
    const response = cfg[operation] ?? defaultResponse;

    const builder: Record<string, unknown> = {};
    const chainMethods = [
      "eq",
      "neq",
      "in",
      "select",
      "order",
      "limit",
      "single",
      "range",
      "gte",
      "lte",
      "is",
    ];

    for (const method of chainMethods) {
      builder[method] = vi.fn().mockReturnValue(builder);
    }

    // 最終結果として response を返す（Promise 風に then 可能）
    builder.then = (resolve: (value: MockResponse) => void) =>
      resolve(response);

    return builder;
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue(
        config.auth?.getUser ?? {
          data: { user: null },
          error: null,
        }
      ),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn(() => createQueryBuilder(table, "select")),
      insert: vi.fn(() => createQueryBuilder(table, "insert")),
      update: vi.fn(() => createQueryBuilder(table, "update")),
      delete: vi.fn(() => createQueryBuilder(table, "delete")),
      upsert: vi.fn(() => createQueryBuilder(table, "upsert")),
    })),
  };

  // createClient モジュールをモックするためのヘルパー
  const mockModule = {
    createClient: vi.fn().mockResolvedValue(supabase),
  };

  return {
    supabase,
    mockModule,
    /** テーブルのレスポンスを動的に変更する */
    setTableResponse(table: string, operation: keyof TableConfig, response: MockResponse) {
      let cfg = tableResponses.get(table);
      if (!cfg) {
        cfg = {};
        tableResponses.set(table, cfg);
      }
      cfg[operation] = response;
    },
  };
}

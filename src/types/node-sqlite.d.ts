declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string, options?: { open?: boolean; enableForeignKeyConstraints?: boolean });
    exec(sql: string): void;
    prepare(sql: string): {
      get(...params: unknown[]): unknown;
      run(...params: unknown[]): unknown;
    };
    close(): void;
  }
}

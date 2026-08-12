# 构建、测试与质量检查

## 常用命令

| 命令                | 作用                                                             |
| ------------------- | ---------------------------------------------------------------- |
| `pnpm install`      | 还原依赖（packageManager 固定为 pnpm@10.30.3）                   |
| `pnpm build`        | tsup 构建，产出 `dist/index.js`（ESM）与 `dist/index.cjs`（CJS） |
| `pnpm typecheck`    | `tsc --noEmit` 类型检查                                          |
| `pnpm lint`         | oxlint 代码质量检查                                              |
| `pnpm format`       | oxfmt 自动格式化                                                 |
| `pnpm format:check` | oxfmt 格式检查（CI 用）                                          |
| `pnpm test`         | vitest 单次运行全部测试                                          |
| `pnpm test:watch`   | vitest 监听模式                                                  |

## 构建细节

- **tsup**：`entry: ["src/index.ts"]`，`format: ["esm", "cjs"]`，
  `target: "node18"`，`sourcemap: true`，`dts: false`。
- **typescript**：固定使用 `^5.9.3`。`typescript@7.0.1-rc`（tsgo，Go 原生实现）
  没有 JS 主入口，tsup 无法 `require("typescript")` 完成 dts 相关工作，
  因此本仓库不启用 dts 生成。
- **package.json 导出映射**：

    ```json
    "exports": {
        ".": {
            "import": "./dist/index.js",
            "require": "./dist/index.cjs"
        }
    }
    ```

    ESM 消费方（`import`）走 `dist/index.js`，CJS 消费方（`require`）走
    `dist/index.cjs`。

## Lint 与格式

- **oxlint**：只做代码质量检查（配置见 `.oxlintrc.json`，
  启用 `typescript` / `unicorn` / `oxc` 插件，`correctness` 类别全部为 error）。
  oxlint 不含缩进、分号、引号等格式规则。
- **oxfmt**：负责格式，配置见 `.oxfmtrc.json`：
  `tabWidth: 4`（4 空格缩进）、`semi: true`（强制分号）、
  `singleQuote: false`（强制双引号）。
- 提交前建议依次执行 `pnpm format && pnpm lint && pnpm typecheck && pnpm test`。

## 测试

vitest 配置见 `vitest.config.ts`，测试文件位于 `tests/`：

| 文件                    | 覆盖                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| `tests/decode.test.ts`  | `decodeZipFileName` 四种编码回退路径                               |
| `tests/extract.test.ts` | `extractZip` 解压、子目录、中文名、路径穿越防护                    |
| `tests/convert.test.ts` | `convertImage` 各通道模式转换                                      |
| `tests/helpers.ts`      | `makeEntry`（模拟 yauzl 条目）、`buildZipRaw`（手工构造 zip 字节） |

## CI

`.github/workflows/ci.yml`：仅在 `main` 分支 push 时触发，执行
`pnpm install --frozen-lockfile` → `pnpm build` → `pnpm typecheck` →
`pnpm lint` → `pnpm format:check`，并校验 `dist/index.js` 与 `dist/index.cjs`
确实生成。按约定，CI **只编译不运行代码**（不执行 `pnpm test`、不运行示例）。

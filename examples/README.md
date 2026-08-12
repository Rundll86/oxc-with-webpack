# examples —— 转换脚本用法示例

本项目打包后（`dist/index.js`，ESM）对外导出以下四个函数，示例全部直接
`import` 自构建产物，可在 Node.js 下直接运行。

| 导出                | 签名                                             | 作用                             |
|---------------------|--------------------------------------------------|----------------------------------|
| `convertImage`      | `(src: string, dst: string) => Promise<void>`    | 任意图片转 PNG                   |
| `extractZip`        | `(zip: string, target: string) => Promise<void>` | 解压 zip（含中文文件名编码修复） |
| `decodeZipFileName` | `(entry: yauzl.Entry) => string`                 | 还原 yauzl 条目文件名            |
| `main`              | `() => Promise<void>`                            | 完整批处理（textures + comics）  |

## 运行方式

先构建，再运行任意示例：

```sh
pnpm build
node examples/convert-image.mjs   # 单张图片转 PNG
node examples/extract-zip.mjs     # 解压 assets/comics 下所有 zip
node examples/decode-filename.mjs # 演示文件名编码回退链
node examples/full-pipeline.mjs   # 调用 main() 完整批处理
```

## 目录结构约定

```plain
assets/
  textures/        # 源图片（任意 sharp 支持的格式）
  comics/          # 源 zip 漫画包
textures/          # 转换后的 PNG（按文件名排序后 0.png, 1.png, ...）
comics/            # 解压后的漫画目录
```

详细设计见 [`docs/design.md`](../docs/design.md)。

# 转换脚本文档

本仓库的 [`src/index.ts`](../src/index.ts) 由原 `index.py`（PIL + zipfile）转换为
Node.js / TypeScript 实现，功能完全一致：

1. **图片转换**：把 `assets/textures/` 下任意格式的图片统一转换为 PNG，
   输出到 `textures/`（按文件名排序后命名为 `0.png`、`1.png`…）。
2. **漫画解压**：把 `assets/comics/` 下所有 zip 解压到 `comics/<zip文件名>/`，
   并修复中文文件名在 zip 中常见的编码问题（GBK / UTF-8 / CP437）。

## 文档导航

| 文档                   | 内容                             |
| ---------------------- | -------------------------------- |
| [design.md](design.md) | 转换脚本的基本原理与设计细节     |
| [build.md](build.md)   | 构建、测试、Lint、格式检查的说明 |

## 目录结构

```
assets/
  textures/        # 源图片（任意 sharp 支持的格式）
  comics/          # 源 zip 漫画包
textures/          # 转换后的 PNG（0.png, 1.png, ...）
comics/            # 解压后的漫画目录
src/index.ts       # 转换脚本唯一源码
tests/             # vitest 单元测试
examples/          # 用法示例（import dist 构建产物）
dist/              # tsup 构建产物（ESM + CJS）
docs/              # 本文档
```

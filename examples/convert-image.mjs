/**
 * 示例 1：convertImage —— 单张图片转 PNG
 *
 * 将 assets/textures/ 中任意格式的图片转换为 PNG：
 * - 含透明通道（RGBA / LA）的图片会补齐 alpha 并转为 RGBA PNG
 * - 不含透明通道的图片会移除 alpha 并转为 RGB PNG
 *
 * 运行前先执行 pnpm build，然后：
 *   node examples/convert-image.mjs
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { convertImage } from "../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, "../assets/textures/0.png");
const dst = path.resolve(__dirname, "../textures/0.png");

await convertImage(src, dst);
console.log(`已转换: ${src} -> ${dst}`);

/**
 * 示例 4：main —— 完整批处理管线
 *
 * 等价于原 index.py 的全部行为：
 *   1. 清空并重建 textures/，把 assets/textures/ 下按文件名排序的图片
 *      逐一转换为 0.png, 1.png, ...
 *   2. 把 assets/comics/ 下所有 zip 解压到 comics/<zip文件名>/，
 *      自动修复中文文件名编码。
 *
 * 运行前先执行 pnpm build，然后：
 *   node examples/full-pipeline.mjs
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { cwd } from "node:process";

import { main } from "../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// main() 的输入输出路径是相对"当前工作目录"的，
// 因此这里切到项目根目录再运行，保证 assets/、textures/、comics/ 落在仓库根。
process.chdir(path.resolve(__dirname, ".."));
console.log(`工作目录: ${cwd()}`);

await main();
console.log("完成：textures 与 comics 均已生成。");

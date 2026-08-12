/**
 * 示例 2：extractZip —— 解压漫画 zip
 *
 * 将 assets/comics/ 下的 zip 解压到 comics/<zip文件名>/，
 * 自动处理 GBK/UTF-8/CP437 三种文件名编码（见 docs/design.md），
 * 并拦截路径穿越（../）等恶意条目。
 *
 * 运行前先执行 pnpm build，然后：
 *   node examples/extract-zip.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractZip } from "../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, "../assets/comics");

if (!fs.existsSync(assetsDir)) {
    console.error(`目录不存在: ${assetsDir}`);
    process.exit(1);
}

for (const file of fs.readdirSync(assetsDir).sort()) {
    if (!file.toLowerCase().endsWith(".zip")) {
        continue;
    }
    const name = path.basename(file, path.extname(file));
    const target = path.resolve(__dirname, `../comics/${name}`);
    fs.mkdirSync(target, { recursive: true });
    await extractZip(path.join(assetsDir, file), target);
    console.log(`已解压: ${file} -> ${target}`);
}

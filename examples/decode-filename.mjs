/**
 * 示例 3：decodeZipFileName —— 单测 yauzl 条目的文件名解码
 *
 * 当 yauzl 以 decodeStrings: false 打开 zip 时，entry.fileName 是原始字节
 * （类型标注为 string，运行时实为 Buffer）。decodeZipFileName 负责按
 * UTF-8 标志位 → UTF-8 严格解码 → GBK 严格解码 → CP437 兜底的顺序还原文件名。
 *
 * 运行前先执行 pnpm build，然后：
 *   node examples/decode-filename.mjs
 */

import iconv from "iconv-lite";

import { decodeZipFileName } from "../dist/index.js";

/**
 * 模拟一个 yauzl.Entry。真实场景中来自 yauzl 的 "entry" 事件。
 * generalPurposeBitFlag 的第 0x800 位表示文件名是否为 UTF-8。
 */
function fakeEntry(fileNameBytes, generalPurposeBitFlag) {
    return { fileName: Buffer.from(fileNameBytes), generalPurposeBitFlag };
}

// 1. UTF-8 标志位已设置 → 直接按 UTF-8 解码
const utf8 = fakeEntry(
    Buffer.from("漫画/第一页.png", "utf-8"),
    0x800, // bit 11
);
console.log(decodeZipFileName(utf8)); // 漫画/第一页.png

// 2. 未设 UTF-8 标志，但字节是 UTF-8 → 回退到 UTF-8 解码
const gbkLike = fakeEntry(Buffer.from("球社更衣室.txt", "utf-8"), 0);
console.log(decodeZipFileName(gbkLike)); // 球社更衣室.txt

// 3. 未设 UTF-8 标志，字节是 GBK → 回退到 GBK 解码。
// 注意：Node 的 Buffer.from 不支持 gbk 编码，需借助 iconv-lite 生成字节。
const gbk = fakeEntry(iconv.encode("球社更衣室.txt", "gbk"), 0);
console.log(decodeZipFileName(gbk)); // 球社更衣室.txt

// 4. 兜底：既不是 UTF-8 也不是 GBK → CP437。
// 0xE9 在 UTF-8/GBK 中均为非法字节，CP437 中 0xE9 = "Θ"。
const cp437 = fakeEntry(
    Buffer.from([0xe9, 0x20, 0x2e, 0x70, 0x6e, 0x67]), // "Θ .png"
    0,
);
console.log(decodeZipFileName(cp437)); // Θ .png

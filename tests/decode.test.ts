import { describe, expect, it } from "vitest";

import { decodeZipFileName } from "../src/index.js";
import { makeEntry } from "./helpers.js";

describe("decodeZipFileName", () => {
    it("对设置 UTF-8 标志位的条目按 UTF-8 解码", () => {
        const name = "中文文件.txt";
        const entry = makeEntry(Buffer.from(name, "utf-8"), 0x0800);
        expect(decodeZipFileName(entry)).toBe(name);
    });

    it("对未设置标志位但为 UTF-8 字节的条目回退解码为 UTF-8", () => {
        const name = "中文文件夹/a.png";
        const entry = makeEntry(Buffer.from(name, "utf-8"), 0);
        expect(decodeZipFileName(entry)).toBe(name);
    });

    it("对 GBK 编码的条目回退解码为 GBK", () => {
        // "球社更衣室.txt" 的 GBK 字节
        const gbkBytes = Buffer.from([
            0xc7, 0xf2, 0xc9, 0xe7, 0xb8, 0xfc, 0xd2, 0xc2, 0xca, 0xd2, 0x2e, 0x74, 0x78, 0x74,
        ]);
        const entry = makeEntry(gbkBytes, 0);
        expect(decodeZipFileName(entry)).toBe("球社更衣室.txt");
    });

    it("对既非 UTF-8 也非 GBK 的字节回退为 CP437", () => {
        // 0xE9 0x20 0x2E 0x70 0x6E 0x67，0xE9 在 UTF-8/GBK 中均非法
        const bytes = Buffer.from([0xe9, 0x20, 0x2e, 0x70, 0x6e, 0x67]);
        const entry = makeEntry(bytes, 0);
        // CP437 中 0xE9 = "Θ"
        expect(decodeZipFileName(entry)).toBe("Θ .png");
    });

    it("对 ASCII 名称直接返回", () => {
        const entry = makeEntry(Buffer.from("a/b.txt", "ascii"), 0);
        expect(decodeZipFileName(entry)).toBe("a/b.txt");
    });
});

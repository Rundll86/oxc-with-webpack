import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import yazl from "yazl";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { extractZip } from "../src/index.js";

import { buildZipRaw } from "./helpers.js";

describe("extractZip", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), "oxc-bridge-"));
    });

    afterEach(() => {
        fs.rmSync(tmp, { recursive: true, force: true });
    });

    /** 用 yazl 生成一个 zip 文件，fileName 以原始字节写入（utf-8） */
    function createZip(fileName: string, content: Buffer, zipPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const zipfile = new yazl.ZipFile();
            zipfile.addBuffer(content, fileName);
            zipfile.outputStream
                .pipe(fs.createWriteStream(zipPath))
                .on("close", () => resolve())
                .on("error", reject);
            zipfile.end();
        });
    }

    it("将 zip 内的文件解压到目标目录", async () => {
        const zipPath = path.join(tmp, "a.zip");
        await createZip("hello.txt", Buffer.from("world"), zipPath);

        const target = path.join(tmp, "out");
        await extractZip(zipPath, target);

        expect(fs.readFileSync(path.join(target, "hello.txt"), "utf-8")).toBe("world");
    });

    it("保留 zip 内的子目录结构", async () => {
        const zipPath = path.join(tmp, "dir.zip");
        await createZip("sub/nested/file.txt", Buffer.from("x"), zipPath);

        const target = path.join(tmp, "out");
        await extractZip(zipPath, target);

        expect(fs.readFileSync(path.join(target, "sub/nested/file.txt"), "utf-8")).toBe("x");
    });

    it("UTF-8 中文文件名能正确解压", async () => {
        const zipPath = path.join(tmp, "cn.zip");
        const fileName = "漫画/第一页.png";
        await createZip(fileName, Buffer.from([0xff]), zipPath);

        const target = path.join(tmp, "out");
        await extractZip(zipPath, target);

        expect(fs.existsSync(path.join(target, fileName))).toBe(true);
    });

    it("拒绝路径穿越的条目", async () => {
        const zipPath = path.join(tmp, "evil.zip");
        // yazl 会拒绝写入 "../evil.txt"，因此手工构造包含恶意条目的 zip 字节
        fs.writeFileSync(
            zipPath,
            buildZipRaw([{ fileName: Buffer.from("../evil.txt"), data: Buffer.from("boom") }]),
        );

        const target = path.join(tmp, "out");
        await expect(extractZip(zipPath, target)).rejects.toThrow();

        expect(fs.existsSync(path.join(tmp, "evil.txt"))).toBe(false);
    });

    it("zip 不存在时抛出错误", async () => {
        await expect(extractZip(path.join(tmp, "missing.zip"), tmp)).rejects.toThrow();
    });
});

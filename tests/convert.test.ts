import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { convertImage } from "../src/index.js";
describe("convertImage", () => {
    let tmp: string;
    beforeEach(() => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), "oxc-bridge-img-"));
    });
    afterEach(() => {
        fs.rmSync(tmp, { recursive: true, force: true });
    });
    it("将 RGBA 图片转换为 RGBA PNG", async () => {
        const src = path.join(tmp, "in.png");
        const dst = path.join(tmp, "out.png");
        await sharp({
            create: {
                width: 2,
                height: 2,
                channels: 4,
                background: { r: 255, g: 0, b: 0, alpha: 128 },
            },
        })
            .png()
            .toFile(src);
        await convertImage(src, dst);
        const meta = await sharp(dst).metadata();
        expect(meta.format).toBe("png");
        expect(meta.channels).toBe(4); // RGBA
        expect(meta.hasAlpha).toBe(true);
    });
    it("将 RGB 图片转换为 RGB PNG（无 alpha 通道）", async () => {
        const src = path.join(tmp, "in.jpg");
        const dst = path.join(tmp, "out.png");
        await sharp({
            create: { width: 2, height: 2, channels: 3, background: { r: 0, g: 128, b: 255 } },
        })
            .jpeg()
            .toFile(src);
        await convertImage(src, dst);
        const meta = await sharp(dst).metadata();
        expect(meta.format).toBe("png");
        expect(meta.hasAlpha).toBe(false);
    });
    it("转换前后像素数据一致", async () => {
        const src = path.join(tmp, "in.png");
        const dst = path.join(tmp, "out.png");
        const pixels = Buffer.from([
            255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255,
        ]);
        await sharp(pixels, { raw: { width: 2, height: 2, channels: 4 } })
            .png()
            .toFile(src);
        await convertImage(src, dst);
        const { data } = await sharp(dst).raw().toBuffer({ resolveWithObject: true });
        expect([...data]).toEqual([...pixels]);
    });
    it("源文件不存在时抛出错误", async () => {
        const src = path.join(tmp, "missing.png");
        const dst = path.join(tmp, "out.png");
        await expect(convertImage(src, dst)).rejects.toThrow();
    });
});

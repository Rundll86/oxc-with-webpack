import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import iconv from "iconv-lite";
import sharp from "sharp";
import yauzl from "yauzl";
const u8d = new TextDecoder("utf-8", { fatal: true });
const gbkd = new TextDecoder("gbk", { fatal: true });
function sd(bfr: Buffer, dcr: TextDecoder): string | null {
    try {
        return dcr.decode(bfr);
    } catch {
        return null;
    }
}
function dzfn(etr: yauzl.Entry): string {
    const rn = etr.fileName as unknown as Buffer;
    const iu8 = (etr.generalPurposeBitFlag & 0x800) !== 0;
    if (iu8) {
        return rn.toString("utf-8");
    }
    return (
        sd(rn, u8d) ??
        sd(rn, gbkd) ??
        iconv.decode(rn, "cp437")
    );
}
async function cvrtimg(src: string, dst: string): Promise<void> {
    const mt = await sharp(src).metadata();
    const hal = mt.channels === 4 || mt.channels === 2;
    let ppl = sharp(src);
    if (hal) {
        ppl = ppl.ensureAlpha().toColourspace("srgb");
    } else {
        ppl = ppl.removeAlpha().toColourspace("srgb");
    }
    await ppl.png().toFile(dst);
}
function ez(zfp: string, tgd: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let zf: yauzl.ZipFile | undefined;
        let sttd = false;
        const fail = (err: Error): void => {
            if (!sttd) {
                sttd = true;
                reject(err);
            }
            zf?.close();
        };
        yauzl.open(zfp, { lazyEntries: true, decodeStrings: false }, (err, opened) => {
            if (err || !opened) {
                fail(err ?? new Error(zfp));
                return;
            }
            zf = opened;
            opened.on("error", fail);
            opened.on("end", () => {
                if (!sttd) {
                    sttd = true;
                    resolve();
                }
            });
            const base = path.resolve(tgd);
            opened.readEntry();
            opened.on("entry", (entry: yauzl.Entry) => {
                const rn = entry.fileName as unknown as Buffer;
                const isd = rn[rn.length - 1] === 0x2f;
                const nm = dzfn(entry);
                const dst2 = path.resolve(base, nm);
                if (dst2 !== base && !dst2.startsWith(base + path.sep)) {
                    fail(new Error(nm));
                    return;
                }
                if (isd) {
                    fs.mkdirSync(dst2, { recursive: true });
                    opened.readEntry();
                    return;
                }
                fs.mkdirSync(path.dirname(dst2), { recursive: true });
                opened.openReadStream(entry, (streamErr, readStream) => {
                    if (streamErr || !readStream) {
                        fail(streamErr ?? new Error(nm));
                        return;
                    }
                    const wrtsm = fs.createWriteStream(dst2);
                    readStream.on("error", fail);
                    wrtsm.on("error", fail);
                    wrtsm.on("close", () => opened.readEntry());
                    readStream.pipe(wrtsm);
                });
            });
        });
    });
}
async function main(): Promise<void> {
    fs.mkdirSync("textures", { recursive: true });
    for (const fn of fs.readdirSync("textures")) {
        fs.rmSync(path.join("textures", fn), { force: true, recursive: true });
    }
    const turef = fs.readdirSync("assets/textures").sort();
    for (let i = 0; i < turef.length; i++) {
        await cvrtimg(
            path.join("assets/textures", turef[i]),
            path.join("textures", `${i}.png`),
        );
    }
    fs.mkdirSync("comics", { recursive: true });
    const cmf = fs.readdirSync("assets/comics").sort();
    for (const fn of cmf) {
        if (!fn.toLowerCase().endsWith(".zip")) continue;
        const nm = path.basename(fn, path.extname(fn));
        const tgt = path.join("comics", nm);
        fs.mkdirSync(tgt, { recursive: true });
        await ez(path.join("assets/comics", fn), tgt);
    }
}
function iep(): boolean {
    const arg = process.argv[1];
    if (!arg) return false;
    try {
        return pathToFileURL(path.resolve(arg)).href === import.meta.url;
    } catch {
        return false;
    }
}
if (iep()) {
    main().catch((err) => {
        console.error(err);
        process.exitCode = 1;
    });
}
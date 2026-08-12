/**
 * 测试辅助工具。
 *
 * - makeEntry：构造最小化的 yauzl.Entry，用于单测 decodeZipFileName。
 * - buildZipRaw：手工拼装最简 zip（Store 压缩）的原始字节，
 *   允许写入 yazl 会拒绝的非法文件名字节（如 "../evil.txt"），
 *   用于验证 extractZip 的路径穿越防护。
 */

import type { Entry } from "yauzl";

/**
 * 构造一个最小化的 yauzl.Entry，仅包含 decodeZipFileName 需要的字段。
 * fileName 字段在库源码中被强转为 Buffer（decodeStrings: false 时其值为原始字节）。
 */
export function makeEntry(fileName: Buffer, generalPurposeBitFlag: number): Entry {
    return {
        fileName: fileName as unknown as string,
        generalPurposeBitFlag,
    } as Entry;
}

/** 计算 CRC-32 校验值（构造合法 zip 所需）。 */
export function crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let k = 0; k < 8; k++) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

/**
 * 手工构造一个最简 zip（Store 压缩、无 UTF-8 标志）的原始字节。
 * 文件名直接按原始字节写入，允许包含 "../" 这类 yazl 拒绝的路径，
 * 以便测试 extractZip 的路径穿越防护逻辑。
 */
export function buildZipRaw(entries: ReadonlyArray<{ fileName: Buffer; data: Buffer }>): Buffer {
    const chunks: Buffer[] = [];
    const central: Buffer[] = [];
    let offset = 0;

    for (const e of entries) {
        // Local File Header
        const lfh = Buffer.alloc(30);
        lfh.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
        lfh.writeUInt16LE(20, 4); // version needed to extract
        lfh.writeUInt16LE(0, 6); // general purpose bit flag
        lfh.writeUInt16LE(0, 8); // compression method: store
        lfh.writeUInt16LE(0, 10); // last mod time
        lfh.writeUInt16LE(0x21, 12); // last mod date
        lfh.writeUInt32LE(crc32(e.data), 14);
        lfh.writeUInt32LE(e.data.length, 18); // compressed size
        lfh.writeUInt32LE(e.data.length, 22); // uncompressed size
        lfh.writeUInt16LE(e.fileName.length, 26);
        lfh.writeUInt16LE(0, 28); // extra field length
        chunks.push(lfh, e.fileName, e.data);

        // Central Directory Header
        const cd = Buffer.alloc(46);
        cd.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
        cd.writeUInt16LE(20, 4); // version made by
        cd.writeUInt16LE(20, 6); // version needed to extract
        cd.writeUInt16LE(0, 8); // flags
        cd.writeUInt16LE(0, 10); // method: store
        cd.writeUInt16LE(0, 12); // mod time
        cd.writeUInt16LE(0x21, 14); // mod date
        cd.writeUInt32LE(crc32(e.data), 16);
        cd.writeUInt32LE(e.data.length, 20); // compressed size
        cd.writeUInt32LE(e.data.length, 24); // uncompressed size
        cd.writeUInt16LE(e.fileName.length, 28);
        cd.writeUInt16LE(0, 30); // extra field length
        cd.writeUInt16LE(0, 32); // comment length
        cd.writeUInt16LE(0, 34); // disk number start
        cd.writeUInt16LE(0, 36); // internal file attributes
        cd.writeUInt32LE(0, 38); // external file attributes
        cd.writeUInt32LE(offset, 42); // local header offset
        central.push(cd, e.fileName);

        offset += 30 + e.fileName.length + e.data.length;
    }

    const cdStart = offset;
    const cdBuf = Buffer.concat(central);

    // End of Central Directory
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
    eocd.writeUInt16LE(0, 4); // disk number
    eocd.writeUInt16LE(0, 6); // disk with central dir
    eocd.writeUInt16LE(entries.length, 8); // entries on this disk
    eocd.writeUInt16LE(entries.length, 10); // total entries
    eocd.writeUInt32LE(cdBuf.length, 12); // central dir size
    eocd.writeUInt32LE(cdStart, 16); // central dir offset
    eocd.writeUInt16LE(0, 20); // comment length

    return Buffer.concat([...chunks, cdBuf, eocd]);
}

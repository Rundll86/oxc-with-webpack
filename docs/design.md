# 转换脚本基本原理

`src/index.ts` 是原 `index.py` 的 Node.js / TypeScript 移植，共两部分逻辑：
**图片转换**与 **zip 解压**。以下分别说明其原理与设计取舍。

## 一、图片转换（PIL → sharp）

### 原 Python 行为

原脚本用 PIL 打开图片，判断模式：

- 模式为 `RGBA` / `LA` / `P`（含透明通道）→ 转换为 `RGBA`
- 其余模式 → 转换为 `RGB`
- 一律保存为 PNG

### Node.js 实现

```ts
async function convertImage(src: string, dst: string): Promise<void> {
    const mt = await sharp(src).metadata();
    const hasAlpha = mt.channels === 4 || mt.channels === 2; // RGBA / LA
    let ppl = sharp(src);
    if (hasAlpha) {
        ppl = ppl.ensureAlpha().toColourspace("srgb"); // 补齐 alpha 并转 sRGB
    } else {
        ppl = ppl.removeAlpha().toColourspace("srgb"); // 移除多余 alpha
    }
    await ppl.png().toFile(dst);
}
```

- `metadata().channels`：`4` 表示 RGBA，`2` 表示灰度 + alpha（LA）。
- `ensureAlpha()`：无 alpha 通道时补齐为不透明，等价于 PIL 的 `RGBA` 转换。
- `removeAlpha()`：移除 alpha 通道，等价于 PIL 的 `RGB` 转换。
- 两端都以 `sRGB` 颜色空间输出，保证与原脚本一致。

### 为什么用 sharp

| 需求         | sharp | 说明                            |
| ------------ | ----- | ------------------------------- |
| 读取多种格式 | ✅    | JPEG / PNG / WebP / GIF / AVIF… |
| 查询通道数   | ✅    | `metadata()`                    |
| alpha 处理   | ✅    | `ensureAlpha` / `removeAlpha`   |
| 异步化       | ✅    | 基于 libvips，无需维护线程池    |

## 二、zip 解压（zipfile → yauzl）

### 中文文件名编码问题

zip 规范允许文件名使用两种编码：

1. 通用标志位第 **11 位（bit 11，即 `0x800`）** 置位 → 文件名 **必须** 是 UTF-8。
2. 未置位 → 文件名编码由创建者决定。Windows 压缩软件常使用本地
   **GBK**（简体中文）或 **CP437**（英文系统默认）。

原 Python 脚本的处理逻辑：

```python
if flag_bits & 0x800:  # UTF-8 标志位
    name = raw.decode("utf-8")
else:
    try:
        name = raw.decode("cp437").encode("cp437").decode("utf-8")  # 尝试 utf-8
    except UnicodeDecodeError:
        try:
            name = raw.decode("cp437").encode("cp437").decode("gbk")  # 再尝试 gbk
        except UnicodeDecodeError:
            name = raw.decode("cp437")  # 兜底 cp437
```

核心技巧：**原始字节先按 `cp437` 解码再编码**，这是一个"无损"操作——
CP437 是单字节编码，任意字节序列都能无损还原，之后才能用 UTF-8 / GBK
重新解码原始字节。

### Node.js 实现

```ts
const u8d = new TextDecoder("utf-8", { fatal: true });
const gbkd = new TextDecoder("gbk", { fatal: true });

function decodeZipFileName(entry: yauzl.Entry): string {
    const raw = entry.fileName as unknown as Buffer; // decodeStrings:false 时是原始字节
    const isUtf8 = (entry.generalPurposeBitFlag & 0x800) !== 0;
    if (isUtf8) return raw.toString("utf-8");
    return (
        tryDecode(raw, u8d) ?? // UTF-8 严格解码
        tryDecode(raw, gbkd) ?? // GBK 严格解码
        iconv.decode(raw, "cp437") // 兜底
    );
}
```

要点：

- `yauzl.open(zip, { decodeStrings: false })` 让 yauzl 返回**原始字节**
  （类型标注为 `string`，运行时实为 `Buffer`），交由我们自行解码。
- `TextDecoder(..., { fatal: true })` 在遇到非法字节时**抛错**而非替换，
  因此可以用"尝试解码是否成功"来判断编码。
- 解码顺序与 Python 一致：UTF-8 → GBK → CP437 兜底。
- 兜底直接用 `iconv-lite` 解码 CP437，效果与 Python 的 `decode("cp437")` 相同，
  无需 Python 式的"先解码再编码"绕行。

### 安全：路径穿越防护

zip 条目名可能包含 `../`，若直接拼接路径会把文件写到目标目录之外。
解压前做一次规范化校验：

```ts
const resolved = path.resolve(base, name);
if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error(name); // 拒绝所有逃逸到 base 之外的条目
}
```

- `path.resolve` 会折叠 `..`，因此 `base + "/../evil.txt"` 会解析到 base 之外。
- `resolved.startsWith(base + path.sep)` 严格限定在 base 目录树内。
- 测试用例 `tests/extract.test.ts` 用**手工构造的 zip 字节**（`tests/helpers.ts`
  的 `buildZipRaw`）注入 `../evil.txt` 条目，验证该防护确实生效。

## 三、入口检测

`src/index.ts` 既可被 `import` 复用，也可作为脚本直接运行：

```ts
function isEntryPoint(): boolean {
    const arg = process.argv[1];
    if (!arg) return false;
    return pathToFileURL(path.resolve(arg)).href === import.meta.url;
}
if (isEntryPoint()) {
    main().catch((err) => {
        console.error(err);
        process.exitCode = 1;
    });
}
```

`process.argv[1]` 是入口文件路径，`import.meta.url` 是当前模块 URL。
两者相等说明当前文件是被 node 直接执行的入口，此时才调用 `main()` 批处理；
被 import 时仅导出四个函数。

## 四、导出 API

| 导出                | 签名                             | 对应原逻辑     |
| ------------------- | -------------------------------- | -------------- |
| `convertImage`      | `(src, dst) => Promise<void>`    | PIL 图片转换   |
| `extractZip`        | `(zip, target) => Promise<void>` | zipfile 解压   |
| `decodeZipFileName` | `(entry: yauzl.Entry) => string` | 文件名编码修复 |
| `main`              | `() => Promise<void>`            | 完整批处理     |

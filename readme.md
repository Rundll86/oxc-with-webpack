# 在Webpack中使用oxc编译TypeScript模块

还原依赖：

```bash
pnpm install
```

编译项目：

```bash
pnpm build
```

查看产物：

```bash
ls dist
```

使用方法：

1. `npm install oxc-webpack-loader --save-dev`
2. 在webpack配置文件中添加 `use: { loader: "oxc-webpack-loader" }`

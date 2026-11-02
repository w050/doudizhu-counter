# PWA 图标说明

当前目录已经包含生成好的 PNG：

- `icons/icon-192.png`（192 × 192）
- `icons/icon-512.png`（512 × 512）
- `icons/apple-touch-icon.png`（180 × 180，供 iOS 使用）
- `icons/icon.svg`（矢量源文件）

`manifest.json` 引用前两张 PNG；`index.html` 的 `apple-touch-icon` 引用 180 × 180 版本。
如果需要重新生成图标，可使用下面的命令。

目录结构：

```text
.
├── index.html
├── manifest.json
├── sw.js
└── icons/
    ├── icon.svg
    ├── icon-192.png
    ├── icon-512.png
    ├── apple-touch-icon.png
    └── README.md
```

## 方法一：ImageMagick

在项目根目录执行：

```bash
magick icons/icon.svg -resize 192x192 icons/icon-192.png
magick icons/icon.svg -resize 512x512 icons/icon-512.png
```

如果系统安装的是旧版 ImageMagick，命令可能是：

```bash
convert icons/icon.svg -resize 192x192 icons/icon-192.png
convert icons/icon.svg -resize 512x512 icons/icon-512.png
```

## 方法二：Python + CairoSVG

```bash
python -m pip install cairosvg
python -c "import cairosvg; cairosvg.svg2png(url='icons/icon.svg', write_to='icons/icon-192.png', output_width=192, output_height=192); cairosvg.svg2png(url='icons/icon.svg', write_to='icons/icon-512.png', output_width=512, output_height=512)"
```

## 方法三：Node.js + sharp

```bash
npm install sharp
node -e "const sharp=require('sharp'); Promise.all([sharp('icons/icon.svg').resize(192,192).png().toFile('icons/icon-192.png'), sharp('icons/icon.svg').resize(512,512).png().toFile('icons/icon-512.png')]).then(()=>console.log('icons generated'))"
```

## 本地测试 PWA

Service Worker 和安装能力需要 HTTPS 或 localhost，不能直接双击 `file://` 打开测试。

```bash
# 在项目根目录启动静态服务器
python -m http.server 8080
```

然后访问：

```text
http://localhost:8080
```

打开浏览器开发者工具的 Application 面板，确认：

1. Manifest 能正常解析，并看到 192 × 192 与 512 × 512 图标；
2. Service Workers 状态为 activated；
3. 在 Network 面板切换 Offline 后刷新，页面仍能打开。

## 图标建议

- 192 × 192：用于主屏幕、任务切换等较小尺寸场景。
- 512 × 512：用于启动画面、安装弹窗和高分辨率场景。
- 如果以后需要 Android 的“可裁切”图标，建议另生成一张 512 × 512 maskable 图标，并把主体内容控制在中心约 80% 的安全区域内；当前 `icon.svg` 的主体已经为裁切预留了空间。

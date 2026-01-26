# QuoteMan-Remotion 操作手册

本文档详细说明了如何使用 QuoteMan-Remotion 系统批量生成名言短视频。

## 1. 系统简介

这是一个基于 **Remotion** (React视频框架) 和 **Azure Neural TTS** (微软神经语音) 的自动化视频生成流水线。
它能够将 JSON 格式的名言数据批量转换为 9:16 的竖屏短视频，具有以下特点：
*   **智能排版**：根据文本长度自动选择“静态居中”或“滚动字幕”模式。
*   **精准同步**：单词级别的逐字高亮（Word-level highlighting）。
*   **批量生产**：支持并发渲染，适合大规模生成（已验证 4000+ 条数据）。

## 2. 环境要求

*   **Node.js**: v18 或更高版本。
*   **操作系统**: macOS, Windows, 或 Linux。
*   **网络**: 需要连接互联网以访问 Azure 服务（Mock 模式除外）。

## 3. 安装与配置

### 3.1 安装依赖
在项目根目录下运行：
```bash
npm install
```

### 3.2 配置环境变量
复制配置文件模板：
```bash
cp .env.example .env
```
编辑 `.env` 文件，填入你的 Azure Speech 服务密钥（如果仅测试流程，可留空进入 Mock 模式）：
```ini
AZURE_SPEECH_KEY=你的Azure密钥
AZURE_SPEECH_REGION=你的服务区域 (例如: uksouth)
```

## 4. 数据准备

请编辑或替换 `quotes/quotes.json` 文件。系统目前支持以下 JSON 格式：

```json
[
  {
    "id": "f7aa8a3bd2c4b51c9f70aef208060d7f",
    "tag": "philosophy",
    "quote": "“All are one” ― Heraclitus",
    "author": "Heraclitus"
  },
  {
    "id": "4d884e55995e01aac206f08553bfc550",
    "tag": "travel",
    "quote": "“Long quote text here...”",
    "author": "Author Name"
  }
]
```
*   **id**: 唯一标识符，用于生成文件名（如 `f7aa8...mp4`）。
*   **quote**: 名言全文（包含作者也可以，系统会自动处理）。
*   **author**: 作者名。
*   **tag**: 分类标签（可选）。

## 5. 生成流程 (核心)

生成视频分为四个步骤，请依次执行：

### 第一步：数据标准化 (Normalize)
解析 `quotes.json`，提取作者并清理文本，生成中间文件。
```bash
npm run normalize
```
*   输出：`quotes/normalized.json`

### 第二步：语音合成 (TTS)
调用 Azure 接口生成语音文件和时间戳。
```bash
npm run tts
```
*   **注意**：如果没有配置 Azure Key，此步骤会自动进入 **Mock 模式**，下载一个示例音频代替，用于测试流程。
*   输出：`public/assets/audio/*.mp3`, `public/assets/timing/*.raw.json`

### 第三步：后期处理 (Post-process)
计算音频时长，转换时间戳格式，并决定视频布局（静态/滚动）。
```bash
npm run postprocess
```
*   输出：`public/assets/timing/*.json`, `public/assets/layout/*.json`

### 第四步：批量渲染 (Batch Render)
启动 Remotion 渲染引擎，生成最终 MP4 视频。
```bash
npm run batch-render
```
*   输出：`out/*.mp4`
*   此步骤支持断点续传，如果 `out/` 下已有同名文件，会自动跳过。

## 6. 开发与预览

如果你想调试样式或查看单个视频的效果，可以使用可视化编辑器：

```bash
npm run dev
```
这将启动一个本地服务器（通常是 http://localhost:3000）。你可以使用右侧的属性面板修改 `id` 来预览不同的名言。

## 7. 常见问题

**Q: 渲染失败，提示 "timings.map is not a function"？**
A: 这通常是因为之前的步骤（TTS 或 Postprocess）没有正确生成数据。请尝试清理缓存并重新运行完整流程：
```bash
rm -rf public/assets/audio/* public/assets/timing/* public/assets/layout/* out/*
# 然后重新运行上述四个步骤
```

**Q: 如何调整视频分辨率或帧率？**
A: 修改 `remotion/constants.ts` 文件中的 `OUTPUT_WIDTH`, `OUTPUT_HEIGHT` 和 `FPS`。

**Q: Mock 模式生成的视频没有声音？**
A: 是的，Mock 模式使用的是占位音频（或下载的示例文本音频），仅用于验证视频生成逻辑是否通畅。要生成真实语音，必须配置 Azure Key。

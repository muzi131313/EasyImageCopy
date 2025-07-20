# EasyImageCopy - 智能图片复制插件

[![版本](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/roastwind/EasyImageCopy)
[![许可证](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![支持的浏览器](https://img.shields.io/badge/Chrome-支持-brightgreen.svg)](https://www.google.com/chrome/)

**EasyImageCopy** 是一款强大的 Chrome 浏览器扩展程序，旨在帮助用户轻松、精准地复制网页上的任何图片，特别是那些由动态内容生成的复杂图片。它通过智能的元素选择和监控机制，在目标图片上悬浮一个便捷的复制按钮，一键即可将图片复制到剪贴板。

## ✨ 功能特性

- **一键悬浮按钮**：在指定的图片元素旁显示一个悬浮的复制按钮，操作直观。
- **动态内容感知**：利用 `MutationObserver` 实时监控页面变化，即使图片内容是动态加载或更新的，也能确保按钮始终指向最新的图片。
- **精准定位**：自动计算并调整按钮位置，确保它总是出现在目标图片的右上角，不遮挡内容。
- **异步复制**：使用现代的 `Clipboard API` 和 `Fetch API`，以异步方式获取并复制图片，不会阻塞页面。
- **优雅的UI反馈**：提供加载、成功、失败等清晰的视觉反馈，提升用户体验。
- **健壮的错误处理**：包含了完善的重试和防循环机制，确保在复杂的单页应用（SPA）中也能稳定运行。

## 🚀 安装方式

### 方式一：从 Chrome 应用商店安装 (推荐)

> (即将上线)

一旦插件通过审核，你将可以直接从 Chrome 应用商店安装，享受自动更新带来的便利。

### 方式二：从源码本地加载

如果你想立即体验或进行二次开发，可以按照以下步骤从源码加载：

1.  **下载源码**：克隆或下载本项目到你的本地计算机。
    ```bash
    git clone https://github.com/roastwind/EasyImageCopy.git
    ```
2.  **打开扩展程序页面**：在 Chrome 浏览器中，访问 `chrome://extensions`。
3.  **启用开发者模式**：在页面右上角，打开“开发者模式”的开关。
4.  **加载插件**：点击“加载已解压的扩展程序”按钮，然后选择你刚刚下载的 `EasyImageCopy` 文件夹。
5.  插件图标将出现在浏览器的工具栏中，表示安装成功！

## 📖 使用方法

1.  **打开目标网页**：访问任何你想要复制图片的网页。
2.  **激活插件**：点击浏览器工具栏中的 **EasyImageCopy** 图标。
3.  **输入选择器**：在弹出的窗口中，输入能唯一标识目标图片容器的 CSS 选择器（例如 `#image-container` 或 `.main-photo`），然后点击“显示复制按钮”。
4.  **点击复制**：一个复制图标会出现在目标图片的右上角。点击它，图片就会被复制到你的剪贴板。

## 🔧 技术实现

本项目主要使用了以下 Web 技术：

- **Manifest V3**: 最新的 Chrome 扩展清单规范。
- **DOM Manipulation**: 动态创建和管理悬浮按钮。
- **MutationObserver**: 实时监控 DOM 树的变化，以应对动态内容。
- **Fetch API**: 异步获取图片资源。
- **Clipboard API**: 安全地将图片数据写入用户剪贴板。
- **CSS**: 实现按钮的样式和动画效果。

## 🤝 贡献指南

我们非常欢迎社区的贡献！如果你有任何好的想法或发现了 bug，请通过以下方式参与：

-   **提交 Issue**: 如果你遇到了问题或有功能建议，请在 [Issues](https://github.com/roastwind/EasyImageCopy/issues) 中告诉我们。
-   **发起 Pull Request**: 如果你修复了一个 bug 或实现了一个新功能，欢迎提交 PR。

## 📄 许可协议

本项目采用 [MIT License](LICENSE) 开源。

---

希望这个插件能为你带来便利！

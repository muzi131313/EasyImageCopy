// 后台脚本 - 处理插件的后台逻辑
chrome.runtime.onInstalled.addListener(() => {
  console.log('图片选择复制器插件已安装');
});

// 处理来自content script和popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 转发消息到popup（如果需要）
  if (request.action === 'elementSelected') {
    // 这个消息会被popup接收
    return;
  }
});
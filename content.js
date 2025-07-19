// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Content script 收到消息:", request);
  
  if (request.action === 'copyImageBySelector') {
    console.log("开始处理复制图片请求，选择器:", request.selector);
    
    copyImageBySelector(request.selector).then(result => {
      console.log("复制图片结果:", result);
      sendResponse(result);
    }).catch(error => {
      console.error("复制图片过程中出错:", error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // 保持消息通道开放
  }
});

// 根据CSS选择器复制图片
async function copyImageBySelector(selector) {
  try {
    console.log("开始查找元素，选择器:", selector);
    
    // 查找匹配选择器的元素
    const elements = document.querySelectorAll(selector);
    console.log("找到元素数量:", elements.length);
    
    if (elements.length === 0) {
      return { success: false, error: `没有找到匹配选择器 "${selector}" 的元素` };
    }

    // 在找到的元素中查找图片
    let imgSrc = '';
    let foundElement = null;
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      console.log(`检查第 ${i+1} 个元素:`, element);
      
      const imgInfo = findImageInElement(element);
      console.log("图片信息:", imgInfo);
      
      if (imgInfo.src) {
        imgSrc = imgInfo.src;
        foundElement = imgInfo.element;
        console.log("找到图片:", imgSrc);
        break;
      }
    }

    if (!imgSrc) {
      return { success: false, error: `在匹配的 ${elements.length} 个元素中没有找到图片` };
    }

    console.log("开始下载和复制图片:", imgSrc);
    
    // 下载图片并复制到剪贴板
    const success = await downloadAndCopyImage(imgSrc);
    console.log("复制结果:", success);
    
    if (success) {
      // 高亮显示找到的图片元素
      highlightElement(foundElement);
      
      return { 
        success: true, 
        count: elements.length,
        src: imgSrc
      };
    } else {
      return { success: false, error: '复制图片到剪贴板失败' };
    }
    
  } catch (error) {
    console.error("copyImageBySelector 出错:", error);
    return { success: false, error: error.message };
  }
}

// 在元素中查找图片
function findImageInElement(element) {
  // 如果元素本身就是img
  if (element.tagName === 'IMG' && element.src) {
    return { src: element.src, element: element };
  }
  
  // 查找直接子元素中的img
  const directImg = element.querySelector('img');
  if (directImg && directImg.src) {
    return { src: directImg.src, element: directImg };
  }
  
  // 查找所有img元素（包括深层嵌套）
  const allImgs = element.querySelectorAll('img');
  for (const img of allImgs) {
    if (img.src) {
      return { src: img.src, element: img };
    }
  }
  
  // 查找背景图片
  const computedStyle = window.getComputedStyle(element);
  const backgroundImage = computedStyle.backgroundImage;
  if (backgroundImage && backgroundImage !== 'none') {
    const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
    if (urlMatch && urlMatch[1]) {
      return { src: urlMatch[1], element: element };
    }
  }
  
  // 查找canvas元素
  const canvas = element.querySelector('canvas');
  if (canvas) {
    try {
      const dataUrl = canvas.toDataURL();
      return { src: dataUrl, element: canvas };
    } catch (e) {
      console.warn('无法从canvas获取图片数据:', e);
    }
  }
  
  return { src: null, element: null };
}

// 高亮显示元素
function highlightElement(element) {
  if (!element) return;
  
  // 移除之前的高亮
  document.querySelectorAll('.kiro-found-image').forEach(el => {
    el.classList.remove('kiro-found-image');
  });
  
  // 添加高亮
  element.classList.add('kiro-found-image');
  
  // 3秒后移除高亮
  setTimeout(() => {
    element.classList.remove('kiro-found-image');
  }, 3000);
}

// 下载图片并复制到剪贴板
async function downloadAndCopyImage(imageUrl) {
  try {
    console.log("开始下载图片:", imageUrl);
    
    // 检查剪贴板API是否可用
    if (!navigator.clipboard) {
      throw new Error('浏览器不支持剪贴板API');
    }
    
    // 获取图片数据
    const response = await fetch(imageUrl);
    console.log("图片下载响应状态:", response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`无法下载图片: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log("图片blob信息:", {
      type: blob.type,
      size: blob.size
    });
    
    // 检查blob类型
    if (!blob.type.startsWith('image/')) {
      throw new Error(`不是有效的图片格式: ${blob.type}`);
    }
    
    // 复制到剪贴板
    console.log("开始复制到剪贴板...");
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ]);
    
    console.log("图片已成功复制到剪贴板");
    return true;
  } catch (error) {
    console.error('复制图片失败:', error);
    console.error('错误详情:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return false;
  }
}
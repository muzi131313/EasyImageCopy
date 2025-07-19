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
  
  if (request.action === 'showQuickCopyButtons') {
    const result = showQuickCopyButtons(request.selector);
    sendResponse(result);
  }
  
  if (request.action === 'hideQuickCopyButtons') {
    hideQuickCopyButtons();
    sendResponse({ success: true });
  }
});

// 全局变量
let currentSelector = '';
let mutationObserver = null;
let buttonCount = 0;

// 显示快速复制按钮
function showQuickCopyButtons(selector) {
  console.log("开始显示快速复制按钮，选择器:", selector);
  
  // 保存当前选择器
  currentSelector = selector;
  
  // 先移除已存在的按钮
  hideQuickCopyButtons();
  
  // 重置按钮计数
  buttonCount = 0;
  
  try {
    const elements = document.querySelectorAll(selector);
    console.log("找到目标元素数量:", elements.length);
    
    if (elements.length === 0) {
      console.warn("没有找到匹配的元素");
      return { success: true, buttonCount: 0, error: "没有找到匹配的元素" };
    }
    
    // 只为第一个包含图片的元素创建按钮
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      console.log(`检查第 ${i + 1} 个元素:`, element);
      
      // 检查元素是否包含图片
      const hasImage = element.tagName === 'IMG' || element.querySelector('img');
      console.log("元素是否包含图片:", hasImage);
      
      if (!hasImage) {
        console.log("元素不包含图片，跳过");
        continue;
      }
      
      // 创建快速复制按钮（只为第一个找到的元素创建）
      if (createQuickCopyButton(element, i)) {
        buttonCount = 1;
        console.log("已为第一个匹配元素创建快速复制按钮");
        break; // 只创建一个按钮就退出循环
      }
    }
    
    // 启动页面监控
    startPageMonitoring();
    
    console.log(`成功创建 ${buttonCount} 个快速复制按钮`);
    return { success: true, buttonCount: buttonCount };
    
  } catch (error) {
    console.error("显示快速复制按钮失败:", error);
    return { success: false, error: error.message };
  }
}

// 创建快速复制按钮
function createQuickCopyButton(element, index) {
  try {
    // 检查是否已经有按钮
    if (document.querySelector('.kiro-quick-copy-btn')) {
      console.log("页面已有快速复制按钮，先移除");
      document.querySelector('.kiro-quick-copy-btn').remove();
    }
    
    // 获取目标元素的位置信息
    const rect = element.getBoundingClientRect();
    console.log("目标元素位置:", rect);
    
    // 创建快速复制按钮
    const quickBtn = document.createElement('button');
    quickBtn.className = 'kiro-quick-copy-btn';
    quickBtn.innerHTML = '📋';
    quickBtn.title = '快速复制图片';
    quickBtn.setAttribute('data-element-index', index);
    
    // 计算按钮位置（在目标元素右上角外侧）
    const buttonSize = 40;
    const offset = 10;
    const left = rect.right + offset;
    const top = rect.top - offset;
    
    // 设置按钮样式 - 使用fixed定位
    Object.assign(quickBtn.style, {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: `${buttonSize}px`,
      height: `${buttonSize}px`,
      borderRadius: '50%',
      border: 'none',
      backgroundColor: '#4CAF50',
      color: 'white',
      fontSize: '16px',
      cursor: 'pointer',
      zIndex: '10000',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      fontFamily: 'Arial, sans-serif'
    });
    
    // 确保按钮不会超出视窗边界
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (left + buttonSize > viewportWidth) {
      // 如果右侧超出，放到元素左侧
      quickBtn.style.left = `${rect.left - buttonSize - offset}px`;
    }
    
    if (top < 0) {
      // 如果上方超出，放到元素下方
      quickBtn.style.top = `${rect.bottom + offset}px`;
    }
    
    // 鼠标悬停效果
    quickBtn.addEventListener('mouseenter', () => {
      quickBtn.style.backgroundColor = '#45a049';
      quickBtn.style.transform = 'scale(1.1)';
      quickBtn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
    });
    
    quickBtn.addEventListener('mouseleave', () => {
      quickBtn.style.backgroundColor = '#4CAF50';
      quickBtn.style.transform = 'scale(1)';
      quickBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    });
    
    // 点击复制事件
    quickBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 显示加载状态
      quickBtn.innerHTML = '⏳';
      quickBtn.style.backgroundColor = '#FF9800';
      
      try {
        // 检查选择器是否有效
        if (!currentSelector || currentSelector.trim() === '') {
          throw new Error("选择器为空，无法查找目标元素");
        }
        
        // 重新查找当前的目标元素，确保复制最新的图片
        console.log("重新查找目标元素，选择器:", currentSelector);
        
        let currentElements;
        try {
          currentElements = document.querySelectorAll(currentSelector);
        } catch (selectorError) {
          console.error("选择器语法错误:", selectorError);
          throw new Error("选择器语法错误: " + selectorError.message);
        }
        
        console.log("当前找到的元素数量:", currentElements.length);
        
        if (currentElements.length === 0) {
          throw new Error("未找到匹配的元素");
        }
        
        let targetElement = null;
        
        // 找到第一个包含图片的元素
        for (let i = 0; i < currentElements.length; i++) {
          const elem = currentElements[i];
          const hasImage = elem.tagName === 'IMG' || elem.querySelector('img');
          if (hasImage) {
            targetElement = elem;
            console.log("找到当前目标元素:", targetElement);
            break;
          }
        }
        
        if (!targetElement) {
          throw new Error("未找到包含图片的目标元素");
        }
        
        const result = await copyImageFromElement(targetElement);
        if (result.success) {
          // 成功状态
          quickBtn.innerHTML = '✅';
          quickBtn.style.backgroundColor = '#4CAF50';
          setTimeout(() => {
            quickBtn.innerHTML = '📋';
          }, 2000);
        } else {
          // 失败状态
          quickBtn.innerHTML = '❌';
          quickBtn.style.backgroundColor = '#f44336';
          setTimeout(() => {
            quickBtn.innerHTML = '📋';
            quickBtn.style.backgroundColor = '#4CAF50';
          }, 2000);
        }
      } catch (error) {
        console.error("快速复制失败:", error);
        quickBtn.innerHTML = '❌';
        quickBtn.style.backgroundColor = '#f44336';
        setTimeout(() => {
          quickBtn.innerHTML = '📋';
          quickBtn.style.backgroundColor = '#4CAF50';
        }, 2000);
      }
    });
    
    // 监听页面滚动，更新按钮位置
    const updateButtonPosition = () => {
      const newRect = element.getBoundingClientRect();
      const newLeft = newRect.right + offset;
      const newTop = newRect.top - offset;
      
      quickBtn.style.left = `${newLeft}px`;
      quickBtn.style.top = `${newTop}px`;
      
      // 检查边界
      if (newLeft + buttonSize > window.innerWidth) {
        quickBtn.style.left = `${newRect.left - buttonSize - offset}px`;
      }
      
      if (newTop < 0) {
        quickBtn.style.top = `${newRect.bottom + offset}px`;
      }
      
      // 如果元素不在视窗内，隐藏按钮
      if (newRect.bottom < 0 || newRect.top > window.innerHeight || 
          newRect.right < 0 || newRect.left > window.innerWidth) {
        quickBtn.style.display = 'none';
      } else {
        quickBtn.style.display = 'flex';
      }
    };
    
    // 添加滚动监听
    window.addEventListener('scroll', updateButtonPosition, { passive: true });
    window.addEventListener('resize', updateButtonPosition, { passive: true });
    
    // 保存更新函数的引用，以便后续移除
    quickBtn._updatePosition = updateButtonPosition;
    
    // 添加按钮到页面
    document.body.appendChild(quickBtn);
    console.log(`成功创建快速复制按钮，位置: (${left}, ${top})`);
    return true;
    
  } catch (error) {
    console.error("创建快速复制按钮失败:", error);
    return false;
  }
}

// 启动页面监控
function startPageMonitoring() {
  // 停止之前的监控
  stopPageMonitoring();
  
  if (!currentSelector) return;
  
  console.log("启动页面元素变动监控");
  
  // 创建MutationObserver监控DOM变化
  mutationObserver = new MutationObserver((mutations) => {
    let needsUpdate = false;
    
    mutations.forEach((mutation) => {
      console.log('[debug] mutation.type: ', mutation.type)
      // 检查是否有节点被添加或移除
      if (mutation.type === 'childList') {
        // 检查是否有快速复制按钮被移除
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList && node.classList.contains('kiro-quick-copy-btn')) {
              needsUpdate = true;
            } else if (node.querySelector && node.querySelector('.kiro-quick-copy-btn')) {
              needsUpdate = true;
            }
          }
        });
        
        // 检查是否有新的目标元素被添加
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches && node.matches(currentSelector)) {
              needsUpdate = true;
            } else if (node.querySelector && node.querySelector(currentSelector)) {
              needsUpdate = true;
            }
          }
        });
      }
      
      // 检查属性变化（如class、style等）
      if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (target.matches && target.matches(currentSelector)) {
          needsUpdate = true;
        }
      }
    });
    
    // 如果需要更新，延迟执行以避免频繁更新
    if (needsUpdate) {
      console.log("检测到页面元素变动，准备更新快速复制按钮");
      clearTimeout(window.kiroUpdateTimeout);
      window.kiroUpdateTimeout = setTimeout(() => {
        console.log("重新创建快速复制按钮");
        showQuickCopyButtons(currentSelector);
      }, 500);
    }
  });
  
  // 开始监控
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'data-visible', 'data-testid']
  });
}

// 停止页面监控
function stopPageMonitoring() {
  if (mutationObserver) {
    console.log("停止页面元素变动监控");
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  
  // 清除延迟更新
  if (window.kiroUpdateTimeout) {
    clearTimeout(window.kiroUpdateTimeout);
    window.kiroUpdateTimeout = null;
  }
}

// 隐藏快速复制按钮
function hideQuickCopyButtons() {
  console.log("隐藏快速复制按钮");
  
  // 停止页面监控
  stopPageMonitoring();
  
  // 清空当前选择器
  currentSelector = '';
  
  // 移除所有快速复制按钮和相关事件监听器
  const existingButtons = document.querySelectorAll('.kiro-quick-copy-btn');
  console.log(`移除 ${existingButtons.length} 个快速复制按钮`);
  existingButtons.forEach(btn => {
    // 移除滚动和resize事件监听器
    if (btn._updatePosition) {
      window.removeEventListener('scroll', btn._updatePosition);
      window.removeEventListener('resize', btn._updatePosition);
    }
    btn.remove();
  });
  
  // 重置按钮计数
  buttonCount = 0;
}

// 从单个元素复制图片
async function copyImageFromElement(element) {
  try {
    let imgSrc = '';
    let foundElement = null;
    
    // 如果元素本身就是img
    if (element.tagName === 'IMG' && element.src) {
      imgSrc = element.src;
      foundElement = element;
    } else {
      // 查找子元素中的img
      const img = element.querySelector('img');
      if (img && img.src) {
        imgSrc = img.src;
        foundElement = img;
      }
    }
    
    if (!imgSrc) {
      return { success: false, error: '未找到图片' };
    }
    
    // 高亮显示图片
    if (foundElement) {
      foundElement.style.outline = '3px solid #4CAF50';
      foundElement.style.outlineOffset = '2px';
      setTimeout(() => {
        foundElement.style.outline = '';
        foundElement.style.outlineOffset = '';
      }, 1000);
    }
    
    // 获取图片数据
    const response = await fetch(imgSrc);
    if (!response.ok) {
      return { success: false, error: '无法下载图片' };
    }
    
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) {
      return { success: false, error: '不是有效的图片格式' };
    }
    
    // 复制到剪贴板
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ]);
    
    return { success: true };
    
  } catch (error) {
    console.error("复制图片失败:", error);
    return { success: false, error: error.message };
  }
}

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
document.addEventListener("DOMContentLoaded", function () {
  const tagNameInput = document.getElementById("tagName");
  const classSelectorInput = document.getElementById("classSelector");
  const saveTagBtn = document.getElementById("saveTag");
  const copyImageBtn = document.getElementById("copyImage");
  const statusDiv = document.getElementById("status");
  const currentSettingDiv = document.getElementById("currentSetting");
  const currentSelectorSpan = document.getElementById("currentSelector");
  const savedTagsDiv = document.getElementById("savedTags");
  const autoModeSwitch = document.getElementById("autoMode");
  const quickCopyModeSwitch = document.getElementById("quickCopyMode");

  let currentSelectedTag = null;

  // 加载保存的标签和默认标签
  loadSavedTags();

  // 加载自动复制模式设置
  loadAutoModeSettings();
  
  // 加载快速复制模式设置
  loadQuickCopyModeSettings();
  
  // 测试快速复制开关是否存在
  console.log("快速复制开关元素:", quickCopyModeSwitch);
  if (!quickCopyModeSwitch) {
    console.error("找不到快速复制开关元素！");
  }

  // 自动复制模式开关事件
  autoModeSwitch.addEventListener("change", async function () {
    try {
      const isEnabled = autoModeSwitch.checked;
      await saveAutoModeSettings(isEnabled);

      if (isEnabled) {
        showStatus("自动复制模式已开启", "success");
        // 如果开启自动模式且有默认标签，立即执行复制
        if (currentSelectedTag) {
          setTimeout(() => {
            copyImageBtn.click();
          }, 500);
        }
      } else {
        showStatus("自动复制模式已关闭", "success");
      }
    } catch (error) {
      console.error("保存自动模式设置失败:", error);
      showStatus("保存设置失败: " + error.message, "error");
    }
  });

  // 快速复制模式开关事件
  quickCopyModeSwitch.addEventListener("change", async function () {
    console.log("快速复制开关被点击");
    try {
      const isEnabled = quickCopyModeSwitch.checked;
      console.log("快速复制模式开关状态:", isEnabled);
      console.log("当前选中标签:", currentSelectedTag);
      
      await saveQuickCopyModeSettings(isEnabled);

      if (isEnabled) {
        showStatus("快速复制按钮已开启", "success");
        // 如果有选中的标签，显示快速复制按钮
        if (currentSelectedTag) {
          console.log("开始显示快速复制按钮，选择器:", currentSelectedTag.selector);
          await showQuickCopyButtons(currentSelectedTag.selector);
        } else {
          console.log("没有选中的标签，无法显示快速复制按钮");
          showStatus("请先选择一个标签", "error");
        }
      } else {
        showStatus("快速复制按钮已关闭", "success");
        // 隐藏快速复制按钮
        await hideQuickCopyButtons();
      }
    } catch (error) {
      console.error("保存快速复制模式设置失败:", error);
      showStatus("保存设置失败: " + error.message, "error");
    }
  });

  // 保存标签
  saveTagBtn.addEventListener("click", async function () {
    const tagName = tagNameInput.value.trim();
    const selector = classSelectorInput.value.trim();

    if (!tagName) {
      showStatus("请输入标签名称", "error");
      return;
    }

    if (!selector) {
      showStatus("请输入DOM节点选择器", "error");
      return;
    }

    try {
      // 获取现有标签
      const savedTags = await getSavedTags();

      // 检查是否已存在相同名称的标签
      const existingIndex = savedTags.findIndex((tag) => tag.name === tagName);

      if (existingIndex >= 0) {
        // 更新现有标签
        savedTags[existingIndex] = { name: tagName, selector: selector };
        showStatus(`标签 "${tagName}" 已更新`, "success");
      } else {
        // 添加新标签
        savedTags.push({ name: tagName, selector: selector });
        showStatus(`标签 "${tagName}" 已保存`, "success");
      }

      // 保存到存储
      await saveTags(savedTags);

      // 重新加载标签显示
      loadSavedTags();

      // 清空输入框
      tagNameInput.value = "";
      classSelectorInput.value = "";
    } catch (error) {
      console.error("保存标签时出错:", error);
      showStatus("保存失败: " + error.message, "error");
    }
  });

  // 复制图片
  copyImageBtn.addEventListener("click", async function () {
    let selector;

    // 如果有选中的标签，使用标签的选择器
    if (currentSelectedTag) {
      selector = currentSelectedTag.selector;
    } else {
      // 否则尝试从存储获取
      try {
        if (
          typeof chrome !== "undefined" &&
          chrome.storage &&
          chrome.storage.sync
        ) {
          const settings = await chrome.storage.sync.get(["imageSelector"]);
          selector = settings.imageSelector;
        } else {
          selector = localStorage.getItem("imageSelector");
        }
      } catch (error) {
        selector = localStorage.getItem("imageSelector");
      }
    }

    if (!selector) {
      showStatus("请先选择一个标签或设置CSS选择器", "error");
      return;
    }

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    try {
      showStatus("正在查找和复制图片...", "success");
      console.log("开始处理复制请求，选择器:", selector);

      // 第一步：在页面中查找图片并获取图片数据
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: async function (selector) {
          console.log("页面脚本开始执行，选择器:", selector);

          try {
            // 查找匹配选择器的元素
            const elements = document.querySelectorAll(selector);
            console.log("找到元素数量:", elements.length);

            if (elements.length === 0) {
              return {
                success: false,
                error: `没有找到匹配选择器 "${selector}" 的元素`,
              };
            }

            // 查找图片
            let imgSrc = "";
            let foundElement = null;

            for (let i = 0; i < elements.length; i++) {
              const element = elements[i];
              console.log(
                `检查第 ${i + 1} 个元素:`,
                element.tagName,
                element.className
              );

              // 如果元素本身就是img
              if (element.tagName === "IMG" && element.src) {
                imgSrc = element.src;
                foundElement = element;
                console.log("找到图片:", imgSrc);
                break;
              }

              // 查找子元素中的img
              const img = element.querySelector("img");
              if (img && img.src) {
                imgSrc = img.src;
                foundElement = img;
                console.log("在子元素中找到图片:", imgSrc);
                break;
              }
            }

            if (!imgSrc) {
              return {
                success: false,
                error: `在匹配的 ${elements.length} 个元素中没有找到图片`,
              };
            }

            console.log("开始下载图片:", imgSrc);

            // 获取图片数据
            const response = await fetch(imgSrc);
            console.log("图片下载响应状态:", response.status);

            if (!response.ok) {
              return {
                success: false,
                error: `无法下载图片: ${response.status} ${response.statusText}`,
              };
            }

            const blob = await response.blob();
            console.log("图片blob信息:", { type: blob.type, size: blob.size });

            // 检查blob类型
            if (!blob.type.startsWith("image/")) {
              return {
                success: false,
                error: `不是有效的图片格式: ${blob.type}`,
              };
            }

            // 高亮显示找到的图片元素
            if (foundElement) {
              foundElement.style.outline = "3px solid #FF9800";
              foundElement.style.outlineOffset = "2px";
              setTimeout(() => {
                foundElement.style.outline = "";
                foundElement.style.outlineOffset = "";
              }, 3000);
            }

            // 将blob转换为base64，以便传回popup
            const reader = new FileReader();
            return new Promise((resolve) => {
              reader.onload = function () {
                resolve({
                  success: true,
                  count: elements.length,
                  src: imgSrc,
                  imageData: reader.result,
                  mimeType: blob.type,
                });
              };
              reader.onerror = function () {
                resolve({
                  success: false,
                  error: "无法读取图片数据",
                });
              };
              reader.readAsDataURL(blob);
            });
          } catch (error) {
            console.error("页面脚本执行出错:", error);
            return { success: false, error: error.message };
          }
        },
        args: [selector],
      });

      console.log("脚本执行结果:", result.result);
      const response = result.result;

      if (response && response.success) {
        // 第二步：在popup中复制图片到剪贴板
        try {
          showStatus("正在复制图片到剪贴板...", "success");

          // 将base64数据转换回blob
          const base64Data = response.imageData.split(",")[1];
          const binaryData = atob(base64Data);
          const bytes = new Uint8Array(binaryData.length);
          for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: response.mimeType });

          // 在popup中复制到剪贴板（这里有用户交互上下文）
          await navigator.clipboard.write([
            new ClipboardItem({
              [response.mimeType]: blob,
            }),
          ]);

          showStatus(
            `图片已成功复制到剪贴板！(找到 ${response.count} 张图片)`,
            "success"
          );
        } catch (clipboardError) {
          console.error("剪贴板复制失败:", clipboardError);
          showStatus("复制到剪贴板失败: " + clipboardError.message, "error");
        }
      } else {
        const errorMsg = response?.error || "复制失败，未知原因";
        console.error("复制失败:", errorMsg);
        showStatus(errorMsg, "error");
      }
    } catch (error) {
      console.error("复制过程中出现错误:", error);

      if (error.message.includes("Cannot read properties of undefined")) {
        showStatus("插件权限不足，请重新加载插件", "error");
      } else if (error.message.includes("Cannot access")) {
        showStatus("无法访问此页面，请在普通网页上使用此插件", "error");
      } else {
        showStatus("复制过程中出现错误: " + error.message, "error");
      }
    }
  });

  // 加载设置
  async function loadSettings() {
    let selector;

    try {
      // 尝试从chrome storage获取设置
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        const settings = await chrome.storage.sync.get(["imageSelector"]);
        selector = settings.imageSelector;
      } else {
        // 备用方案：从localStorage获取
        selector = localStorage.getItem("imageSelector");
      }
    } catch (error) {
      // 如果chrome storage失败，尝试localStorage
      selector = localStorage.getItem("imageSelector");
      console.log("从localStorage加载设置:", selector);
    }

    if (selector) {
      classSelectorInput.value = selector;
      updateCurrentSetting(selector);
      copyImageBtn.disabled = false;
    }
  }

  // 更新当前设置显示
  function updateCurrentSetting(selector) {
    currentSelectorSpan.textContent = selector;
    currentSettingDiv.style.display = "block";
  }

  // 获取保存的标签
  async function getSavedTags() {
    try {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        const result = await chrome.storage.sync.get(["savedTags"]);
        return result.savedTags || [];
      } else {
        const tags = localStorage.getItem("savedTags");
        return tags ? JSON.parse(tags) : [];
      }
    } catch (error) {
      console.error("获取标签失败:", error);
      const tags = localStorage.getItem("savedTags");
      return tags ? JSON.parse(tags) : [];
    }
  }

  // 保存标签到存储
  async function saveTags(tags) {
    try {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        await chrome.storage.sync.set({ savedTags: tags });
      } else {
        localStorage.setItem("savedTags", JSON.stringify(tags));
      }
    } catch (error) {
      console.error("保存标签失败:", error);
      localStorage.setItem("savedTags", JSON.stringify(tags));
    }
  }

  // 加载并显示保存的标签
  async function loadSavedTags() {
    const tags = await getSavedTags();
    displayTags(tags);

    // 自动选择默认标签
    const defaultTag = tags.find((tag) => tag.isDefault);
    if (defaultTag && !currentSelectedTag) {
      currentSelectedTag = defaultTag;
      updateCurrentSetting(defaultTag.selector);
      copyImageBtn.disabled = false;

      // 高亮默认标签
      setTimeout(() => {
        const defaultTagElement = document.querySelector(".tag-item.default");
        if (defaultTagElement) {
          defaultTagElement.classList.add("active");
        }
      }, 100);
    }
  }

  // 显示标签
  function displayTags(tags) {
    savedTagsDiv.innerHTML = "";

    if (tags.length === 0) {
      savedTagsDiv.innerHTML = '<div class="empty-tags">暂无保存的标签</div>';
      return;
    }

    tags.forEach((tag, index) => {
      const tagElement = document.createElement("div");
      tagElement.className = "tag-item";
      if (tag.isDefault) {
        tagElement.classList.add("default");
      }
      tagElement.innerHTML = `
        <div class="tag-content">
          <div class="tag-name">${tag.name}</div>
          <div class="tag-selector">${tag.selector}</div>
        </div>
        <div class="tag-buttons">
          <button class="default-btn" title="设为默认标签">★</button>
          <button class="delete-btn" title="删除标签">×</button>
        </div>
      `;

      // 点击标签选择
      tagElement.addEventListener("click", function (e) {
        if (e.target.classList.contains("delete-btn")) {
          return; // 如果点击的是删除按钮，不执行选择逻辑
        }

        // 移除其他标签的选中状态
        document.querySelectorAll(".tag-item").forEach((item) => {
          item.classList.remove("active");
        });

        // 选中当前标签
        tagElement.classList.add("active");
        currentSelectedTag = tag;

        // 更新当前设置显示
        updateCurrentSetting(tag.selector);
        copyImageBtn.disabled = false;

        // 如果快速复制模式开启，显示快速复制按钮
        if (quickCopyModeSwitch.checked) {
          showQuickCopyButtons(tag.selector);
        }

        showStatus(`已选择标签: ${tag.name}`, "success");
      });

      // 设为默认标签
      const defaultBtn = tagElement.querySelector(".default-btn");
      defaultBtn.addEventListener("click", async function (e) {
        e.stopPropagation();

        try {
          // 清除所有标签的默认状态
          const updatedTags = tags.map((t) => ({ ...t, isDefault: false }));
          // 设置当前标签为默认
          updatedTags[index].isDefault = true;

          await saveTags(updatedTags);
          loadSavedTags();

          showStatus(`已将 "${tag.name}" 设为默认标签`, "success");
        } catch (error) {
          console.error("设置默认标签失败:", error);
          showStatus("设置默认标签失败: " + error.message, "error");
        }
      });

      // 删除标签
      const deleteBtn = tagElement.querySelector(".delete-btn");
      deleteBtn.addEventListener("click", async function (e) {
        e.stopPropagation();

        if (confirm(`确定要删除标签 "${tag.name}" 吗？`)) {
          try {
            const updatedTags = tags.filter((_, i) => i !== index);
            await saveTags(updatedTags);
            loadSavedTags();

            // 如果删除的是当前选中的标签，清除选中状态
            if (currentSelectedTag && currentSelectedTag.name === tag.name) {
              currentSelectedTag = null;
              currentSettingDiv.style.display = "none";
              copyImageBtn.disabled = true;
            }

            showStatus(`标签 "${tag.name}" 已删除`, "success");
          } catch (error) {
            console.error("删除标签失败:", error);
            showStatus("删除失败: " + error.message, "error");
          }
        }
      });

      savedTagsDiv.appendChild(tagElement);
    });
  }

  // 更新当前设置显示
  function updateCurrentSetting(selector) {
    currentSelectorSpan.textContent = selector;
    currentSettingDiv.style.display = "block";
  }

  // 加载自动复制模式设置
  async function loadAutoModeSettings() {
    try {
      let autoModeEnabled = false;

      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        const result = await chrome.storage.sync.get(["autoModeEnabled"]);
        autoModeEnabled = result.autoModeEnabled || false;
      } else {
        const stored = localStorage.getItem("autoModeEnabled");
        autoModeEnabled = stored === "true";
      }

      autoModeSwitch.checked = autoModeEnabled;

      // 如果自动模式开启且有默认标签，延迟执行复制
      if (autoModeEnabled && currentSelectedTag) {
        setTimeout(() => {
          copyImageBtn.click();
        }, 1000);
      }
    } catch (error) {
      console.error("加载自动模式设置失败:", error);
    }
  }

  // 保存自动复制模式设置
  async function saveAutoModeSettings(enabled) {
    try {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        await chrome.storage.sync.set({ autoModeEnabled: enabled });
      } else {
        localStorage.setItem("autoModeEnabled", enabled.toString());
      }
    } catch (error) {
      console.error("保存自动模式设置失败:", error);
      localStorage.setItem("autoModeEnabled", enabled.toString());
    }
  }

  // 加载快速复制模式设置
  async function loadQuickCopyModeSettings() {
    try {
      let quickCopyEnabled = false;

      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        const result = await chrome.storage.sync.get(["quickCopyEnabled"]);
        quickCopyEnabled = result.quickCopyEnabled || false;
      } else {
        const stored = localStorage.getItem("quickCopyEnabled");
        quickCopyEnabled = stored === "true";
      }

      quickCopyModeSwitch.checked = quickCopyEnabled;

      // 如果快速复制模式开启且有选中标签，显示快速复制按钮
      if (quickCopyEnabled && currentSelectedTag) {
        setTimeout(async () => {
          await showQuickCopyButtons(currentSelectedTag.selector);
        }, 500);
      }
    } catch (error) {
      console.error("加载快速复制模式设置失败:", error);
    }
  }

  // 保存快速复制模式设置
  async function saveQuickCopyModeSettings(enabled) {
    try {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        await chrome.storage.sync.set({ quickCopyEnabled: enabled });
      } else {
        localStorage.setItem("quickCopyEnabled", enabled.toString());
      }
    } catch (error) {
      console.error("保存快速复制模式设置失败:", error);
      localStorage.setItem("quickCopyEnabled", enabled.toString());
    }
  }

  // 显示快速复制按钮
  async function showQuickCopyButtons(selector) {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    try {
      // 首先尝试注入content script
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        console.log("Content script 注入成功");
      } catch (injectError) {
        console.log("Content script 可能已经存在:", injectError.message);
      }

      // 等待一小段时间确保脚本加载完成
      await new Promise(resolve => setTimeout(resolve, 200));

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "showQuickCopyButtons",
        selector: selector,
      });
      
      if (response && !response.success) {
        showStatus(response.error || "快速复制按钮显示失败", "error");
      } else if (response && response.success) {
        if (response.buttonCount > 0) {
          showStatus(`已显示 ${response.buttonCount} 个快速复制按钮`, "success");
        } else {
          showStatus("未找到匹配的图片元素，请检查选择器", "error");
        }
      }
    } catch (error) {
      console.error("显示快速复制按钮失败:", error);
      if (error.message.includes("Could not establish connection")) {
        showStatus("无法连接到页面脚本，请刷新页面后重试", "error");
      } else if (error.message.includes("Cannot access")) {
        showStatus("无法访问此页面，请在普通网页上使用此插件", "error");
      } else {
        showStatus("显示快速复制按钮失败: " + error.message, "error");
      }
    }
  }

  // 隐藏快速复制按钮
  async function hideQuickCopyButtons() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: "hideQuickCopyButtons",
      });
    } catch (error) {
      console.error("隐藏快速复制按钮失败:", error);
    }
  }

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    setTimeout(() => {
      statusDiv.textContent = "";
      statusDiv.className = "";
    }, 3000);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const classSelectorInput = document.getElementById("classSelector");
  const saveSettingsBtn = document.getElementById("saveSettings");
  const copyImageBtn = document.getElementById("copyImage");
  const statusDiv = document.getElementById("status");
  const currentSettingDiv = document.getElementById("currentSetting");
  const currentSelectorSpan = document.getElementById("currentSelector");

  // 加载保存的设置
  loadSettings();

  // 示例按钮点击事件
  document.querySelectorAll(".example-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const selector = this.getAttribute("data-selector");
      classSelectorInput.value = selector;
    });
  });

  // 保存设置
  saveSettingsBtn.addEventListener("click", async function () {
    console.log("保存按钮被点击");
    const selector = classSelectorInput.value.trim();
    console.log("输入的选择器:", selector);

    if (!selector) {
      showStatus("请输入CSS选择器", "error");
      return;
    }

    try {
      // 检查chrome.storage是否可用
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        // 保存到chrome storage
        await chrome.storage.sync.set({ imageSelector: selector });
        console.log("设置已保存到chrome storage");
      } else {
        // 备用方案：使用localStorage
        localStorage.setItem("imageSelector", selector);
        console.log("设置已保存到localStorage");
      }

      // 更新UI
      updateCurrentSetting(selector);
      copyImageBtn.disabled = false;

      showStatus("设置已保存", "success");
    } catch (error) {
      console.error("保存设置时出错:", error);
      showStatus("保存失败: " + error.message, "error");
    }
  });

  // 复制图片
  copyImageBtn.addEventListener("click", async function () {
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
    }

    if (!selector) {
      showStatus("请先设置CSS选择器", "error");
      return;
    }

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    try {
      showStatus("正在查找和复制图片...", "success");
      console.log("开始处理复制请求，选择器:", selector);

      // 直接注入代码到页面执行
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

            console.log("开始下载和复制图片:", imgSrc);

            // 检查剪贴板API是否可用
            if (!navigator.clipboard) {
              return { success: false, error: "浏览器不支持剪贴板API" };
            }

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

            // 复制到剪贴板 - 使用用户交互触发的方式
            console.log("开始复制到剪贴板...");

            // 创建一个临时按钮来触发用户交互
            const copyButton = document.createElement("button");
            copyButton.textContent = "点击复制图片";
            copyButton.style.position = "fixed";
            copyButton.style.top = "50%";
            copyButton.style.left = "50%";
            copyButton.style.transform = "translate(-50%, -50%)";
            copyButton.style.zIndex = "10000";
            copyButton.style.padding = "20px";
            copyButton.style.fontSize = "16px";
            copyButton.style.backgroundColor = "#4CAF50";
            copyButton.style.color = "white";
            copyButton.style.border = "none";
            copyButton.style.borderRadius = "5px";
            copyButton.style.cursor = "pointer";
            copyButton.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";

            // 添加按钮到页面
            document.body.appendChild(copyButton);

            // 返回一个Promise，等待用户点击
            return new Promise((resolve) => {
              copyButton.onclick = async () => {
                try {
                  await navigator.clipboard.write([
                    new ClipboardItem({
                      [blob.type]: blob,
                    }),
                  ]);

                  console.log("图片已成功复制到剪贴板");

                  // 移除按钮
                  document.body.removeChild(copyButton);

                  resolve({
                    success: true,
                    count: elements.length,
                    src: imgSrc,
                  });
                } catch (error) {
                  console.error("复制失败:", error);
                  document.body.removeChild(copyButton);
                  resolve({
                    success: false,
                    error: "复制到剪贴板失败: " + error.message,
                  });
                }
              };

              // 10秒后自动移除按钮
              setTimeout(() => {
                if (document.body.contains(copyButton)) {
                  document.body.removeChild(copyButton);
                  resolve({
                    success: false,
                    error: "用户未点击复制按钮，操作超时",
                  });
                }
              }, 10000);
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
        showStatus(
          `图片已成功复制到剪贴板！(找到 ${response.count} 张图片)`,
          "success"
        );
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

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    setTimeout(() => {
      statusDiv.textContent = "";
      statusDiv.className = "";
    }, 3000);
  }
});

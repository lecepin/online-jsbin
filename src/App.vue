<template>
  <div class="container">
    <div class="tabs">
      <div>
        <button
          v-for="tab in tabs"
          :key="tab"
          :class="{ active: currentTab === tab }"
          @click="currentTab = tab"
        >
          {{ tab.toUpperCase() }}
        </button>
      </div>
      <select v-model="selectedCDN" @change="insertCDN" class="cdn-select">
        <option value="">选择 CDN 包</option>
        <option v-for="cdn in cdnList" :key="cdn.name" :value="cdn.url">
          {{ cdn.name }}
        </option>
      </select>
      <div class="action-buttons">
        <button class="preview-button" @click="openInNewWindow">
          <ExternalIcon theme="outline" size="16" />
          在新窗口打开
        </button>
        <button class="preview-button" @click="shareCode">
          <ShareIcon theme="outline" size="16" />
          分享代码
        </button>
        <GithubIcon
          theme="outline"
          size="30"
          class="github-icon"
          @click="openGithub"
        />
      </div>
    </div>

    <Splitpanes
      class="editor-container"
      vertical
      @resize="isDragging = true"
      @resized="isDragging = false"
    >
      <Pane>
        <div class="editor-panel">
          <MonacoEditor :language="currentTab" v-model="code[currentTab]" />
        </div>
      </Pane>
      <Pane>
        <div class="preview-panel">
          <iframe
            ref="previewFrame"
            sandbox="allow-scripts"
            :style="{ display: isDragging ? 'none' : 'block' }"
          ></iframe>
          <div v-if="isDragging" class="dragging-overlay">正在拖动...</div>
        </div>
      </Pane>
    </Splitpanes>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import MonacoEditor from "./components/MonacoEditor.vue";
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import {
  Link as ExternalIcon,
  Share as ShareIcon,
  Github as GithubIcon,
} from "@icon-park/vue-next";

// 添加防抖函数
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: number | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

type TabType = "html" | "css" | "javascript";
type CodeType = Record<TabType, string>;

const tabs: TabType[] = ["html", "css", "javascript"];
const currentTab = ref<TabType>("html");
const previewFrame = ref<HTMLIFrameElement | null>(null);
const isDragging = ref(false);

// 添加 CDN 列表
const cdnList = [
  {
    name: "Axios",
    url: "https://cdn.jsdelivr.net/npm/axios@1.6.7/dist/axios.min.js",
  },
  {
    name: "Lodash",
    url: "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js",
  },
  {
    name: "jQuery",
    url: "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js",
  },
];

const selectedCDN = ref("");

// 插入 CDN 的方法
const insertCDN = () => {
  if (!selectedCDN.value) return;

  const scriptTag = `<script src="${selectedCDN.value}"><\/script>\n`;
  const htmlContent = code.value.html;

  // 检查是否已经存在该 CDN
  if (!htmlContent.includes(selectedCDN.value)) {
    code.value.html = scriptTag + htmlContent;
  }

  // 重置选择
  selectedCDN.value = "";
};

// 从 URL 解析代码或使用默认值
const getInitialCode = () => {
  try {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash) {
      return JSON.parse(decodeURIComponent(escape(atob(hash))));
    }
  } catch (e) {
    console.warn("Failed to parse code from URL");
  }
  return {
    html: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body>
    <div class="hello">Hello World</div>
  </body>
</html>
  `,
    css: ".hello { color: #abcdef; }",
    javascript: 'console.log("Hello from JS!");',
  };
};

const code = ref<CodeType>(getInitialCode());

const getPreviewContent = () => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>${code.value.css}</style>
      </head>
      <body>
        ${code.value.html}
        <script>${code.value.javascript}<\/script>
      </body>
    </html>
  `;
};

const updatePreview = debounce(() => {
  if (!previewFrame.value) return;
  previewFrame.value.srcdoc = getPreviewContent();
}, 1000);

const openInNewWindow = () => {
  const previewWindow = window.open("", "_blank");
  if (previewWindow) {
    previewWindow.document.write(getPreviewContent());
    previewWindow.document.close();
  }
};

const shareCode = async () => {
  const codeStr = btoa(unescape(encodeURIComponent((JSON.stringify(code.value)))));
  const url = `${window.location.origin}${window.location.pathname}#${codeStr}`;

  try {
    // 检查是否支持 clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      alert("分享链接已复制到剪贴板！");
    } else {
      // 回退方案：创建临时输入框
      const tempInput = document.createElement("input");
      tempInput.value = url;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
      alert("分享链接已复制到剪贴板！");
    }
  } catch (err) {
    // 如果复制失败，显示链接让用户手动复制
    const shouldCopy = window.confirm(
      "无法自动复制链接。点击确定显示链接，以便手动复制。"
    );
    if (shouldCopy) {
      const linkText = document.createElement("textarea");
      linkText.value = url;
      linkText.style.position = "fixed";
      linkText.style.left = "0";
      linkText.style.top = "0";
      linkText.style.width = "100%";
      linkText.style.height = "100px";
      document.body.appendChild(linkText);
      linkText.focus();
      linkText.select();

      // 3秒后自动移除文本框
      setTimeout(() => {
        document.body.removeChild(linkText);
      }, 3000);
    }
  }
};

const openGithub = () => {
  window.open("https://github.com/lecepin", "_blank");
};

// 监听 URL 变化
window.addEventListener("hashchange", () => {
  code.value = getInitialCode();
});

watch(code, updatePreview, { deep: true });
onMounted(updatePreview);
</script>

<style scoped>
.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.tabs {
  padding: 10px;
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.preview-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.preview-button :deep(svg) {
  vertical-align: middle;
}

.tabs button {
  padding: 8px 16px;
  margin-right: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #ffffff;
  color: #666;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tabs button:hover {
  background: #f0f0f0;
}

.tabs button.active {
  background: #e8f0fe;
  color: #1a73e8;
  border-color: #1a73e8;
}

.editor-container {
  flex: 1;
  background-color: #f5f5f5;
}

.editor-panel {
  height: 100%;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background: #ffffff;
}

.preview-panel {
  height: 100%;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background: #ffffff;
  position: relative;
}

iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

/* 自定义分割条样式 */
:deep(.splitpanes__splitter) {
  background-color: #f5f5f5;
  position: relative;
  width: 6px !important;
  margin: 0 -3px;
  z-index: 1;
}

:deep(.splitpanes__splitter::before) {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 40px;
  background: #e0e0e0;
  border-radius: 2px;
  transition: background-color 0.2s;
}

:deep(.splitpanes__splitter:hover::before) {
  background: #1a73e8;
}

/* 确保面板内容不会溢出 */
:deep(.splitpanes__pane) {
  background-color: transparent !important;
  overflow: hidden;
}

.editor-panel,
.preview-panel {
  height: 100%;
  width: 100%;
  position: relative;
}

.dragging-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  font-size: 16px;
  color: #666;
}

.cdn-select {
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #ffffff;
  color: #666;
  font-size: 14px;
  margin-right: 8px;
  cursor: pointer;
}

.cdn-select:hover {
  border-color: #1a73e8;
}

.github-icon {
  cursor: pointer;
  vertical-align: middle;
}

.github-icon:hover {
  color: #1a73e8;
}
</style>

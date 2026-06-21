<script setup>
import { ref, computed, onMounted } from 'vue';
import Sidebar from './components/Sidebar.vue';
import GeneralSettings from './components/GeneralSettings.vue';
import AISettings from './components/AISettings.vue';
import ApiSourceManagement from './components/ApiSourceManagement.vue';
import DebugSettings from './components/DebugSettings.vue';
import DataManagement from './components/DataManagement.vue';
import AboutSettings from './components/AboutSettings.vue';

// 当前选中的选项卡
const activeTab = ref('api');

// 状态提示
const statusMessage = ref('');
const statusType = ref('success');
const showStatus = ref(false);

// 显示状态消息
function showMessage(message, type = 'success') {
  statusMessage.value = message;
  statusType.value = type;
  showStatus.value = true;
  setTimeout(() => {
    showStatus.value = false;
  }, 2000);
}

// 切换选项卡
function switchTab(tab) {
  activeTab.value = tab;
}

// 页面加载完成后初始化
onMounted(() => {
  // 从URL参数中获取tab参数，如果有则切换到对应页面
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam) {
    activeTab.value = tabParam;
    // 如果是subErr参数，打开关于页面
    if (tabParam === 'subErr') {
      activeTab.value = 'about';
      // 延迟一下，确保页面已加载
      setTimeout(() => {
        // 触发打开PyCatch模态框的事件
        const event = new CustomEvent('openPycatchModal');
        window.dispatchEvent(event);
      }, 1000);
    }
  } else {
    // 检查是否是第一次加载插件
    chrome.storage.local.get(['pluginLoaded'], (result) => {
      if (!result.pluginLoaded) {
        // 第一次加载，打开关于页面
        activeTab.value = 'about';
        // 标记插件已加载
        chrome.storage.local.set({ pluginLoaded: true });
      } else {
        // v3 改造：非首次打开默认进入 API 源管理 tab
        activeTab.value = 'api';
      }
    });
  }
  
  // 监听来自content-script的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openPycatchModal') {
      // 切换到关于页面
      activeTab.value = 'about';
      // 延迟一下，确保页面已加载
      setTimeout(() => {
        // 触发打开PyCatch模态框的事件
        const event = new CustomEvent('openPycatchModal');
        window.dispatchEvent(event);
      }, 1000);
    }
  });
});

// v3 改造：全局确认修改（保存并通知 PTA 页面刷新）
async function globalConfirmChanges() {
  // 通知后台 Service Worker → 刷新所有 PTA 页面和当前 options 页面
  // 各 tab 的数据已在用户编辑时通过 autoSaveConfig 实时保存
  try {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'ptaConfigUpdated' }, () => resolve());
    });
  } catch (e) {
    console.warn('[fuckpta] 通知后台失败:', e);
  }
  showMessage('已保存并通知 PTA Helper 刷新', 'success');
}
</script>

<template>
  <div class="container">
    <!-- 左侧导航 -->
    <Sidebar 
      :active-tab="activeTab"
      :status-message="statusMessage"
      :status-type="statusType"
      :show-status="showStatus"
      @switch-tab="switchTab"
    />
    
    <!-- 右侧内容区 -->
    <div class="main">
      <!-- 常规设置 -->
      <div v-show="activeTab === 'general'" class="panel">
        <h2 class="panel-title">常规设置</h2>
        <GeneralSettings />
      </div>
      
      <!-- AI 设置 -->
      <div v-show="activeTab === 'ai'" class="panel">
        <h2 class="panel-title">AI 设置</h2>
        <AISettings />
      </div>
      
      <!-- API 源管理 -->
      <div v-show="activeTab === 'api'" class="panel panel-full">
        <ApiSourceManagement />
      </div>
      
      <!-- 调试设置 -->
      <div v-show="activeTab === 'debug'" class="panel">
        <h2 class="panel-title">调试设置</h2>
        <DebugSettings />
      </div>
      
      <!-- 数据管理 -->
      <div v-show="activeTab === 'data'" class="panel">
        <h2 class="panel-title">数据管理</h2>
        <DataManagement />
      </div>
      
      <!-- 关于 -->
      <div v-show="activeTab === 'about'" class="panel">
        <h2 class="panel-title">关于</h2>
        <AboutSettings />
      </div>
    </div>

    <!-- v3 改造：全局悬浮"确认修改"按钮（所有 tab 都可见，固定在右侧） -->
    <button
      class="global-confirm-changes-btn"
      @click="globalConfirmChanges"
      title="保存所有修改并通知 PTA 页面刷新"
    >
      <span class="check-icon">✓</span> 确认修改
    </button>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.container {
  display: flex;
  height: 100vh;
  background-color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  overflow: hidden;
}

.main {
  flex: 1;
  padding: 48px 64px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel {
  max-width: 720px;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.panel::-webkit-scrollbar {
  display: none;
}

.panel-full {
  max-width: none;
  padding: 0;
}

.panel-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 32px;
  letter-spacing: -0.5px;
  flex-shrink: 0;
}

/* v3 改造：全局悬浮"确认修改"按钮（所有 tab 都可见，固定在右侧中间） */
.global-confirm-changes-btn {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: #dc2626;
  color: #fff;
  border: none;
  padding: 14px 18px;
  border-radius: 12px 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: background 0.2s, padding 0.2s, box-shadow 0.2s;
  box-shadow: -2px 0 12px rgba(220, 38, 38, 0.3);
  z-index: 1000;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 2px;
}

.global-confirm-changes-btn:hover {
  background: #b91c1c;
  padding-right: 24px;
  box-shadow: -4px 0 20px rgba(220, 38, 38, 0.5);
}

.global-confirm-changes-btn:active {
  background: #991b1b;
}

.global-confirm-changes-btn .check-icon {
  writing-mode: horizontal-tb;
  font-size: 20px;
  font-weight: bold;
}
</style>

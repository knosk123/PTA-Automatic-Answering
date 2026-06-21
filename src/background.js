// 检查是否是首次加载插件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 首次安装，打开配置页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html')
    });
  }
});

// 监听来自popup和content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openOptions') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html')
    });
    sendResponse({ success: true });
  } else if (message.action === 'openOptionsWithTab') {
    // 打开带有tab参数的选项页面
    const tabParam = message.tab || '';
    chrome.tabs.create({
      url: chrome.runtime.getURL(`options.html?tab=${tabParam}`)
    });
    sendResponse({ success: true });
  } else if (message.action === 'ptaConfigUpdated') {
    // v3 改造：API 源管理页面点击"确认修改"后，刷新所有 PTA 页面和当前打开的 options 页面
    const optionsUrl = chrome.runtime.getURL('options.html');
    chrome.tabs.query({ url: ['*://pintia.cn/*', optionsUrl] }, (tabs) => {
      for (const tab of tabs) {
        try {
          chrome.tabs.reload(tab.id);
        } catch (e) {
          // 忽略刷新失败的 tab（可能正在关闭）
        }
      }
    });
    sendResponse({ success: true });
  }
});

import { buildApiUrl, buildOpenAICompatibleUrl } from './utils/apiUrl.js';
import { collectOpenAIStreamContentFromSseText } from './utils/aiAnswerHelpers.js';

function shouldRetryStatus(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFetchTimeoutMs(options = {}) {
  return options.timeoutMs || 120000;
}

async function fetchWithRetry(url, options, retries = 2) {
  let lastResponse;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getFetchTimeoutMs(options));
    try {
      const { timeoutMs, ...fetchOptions } = options || {};
      const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
      lastResponse = response;
      if (!shouldRetryStatus(response.status) || attempt === retries) {
        return response;
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error(`AI 请求超时（${Math.round(getFetchTimeoutMs(options) / 1000)} 秒）`);
      }
      if (attempt === retries) throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    await delay(500 * (attempt + 1));
  }

  return lastResponse;
}

async function requestAiEndpoint(message) {
  const endpoint = message.endpoint || 'chat/completions';
  const builder = message.openAICompatible === false ? buildApiUrl : buildOpenAICompatibleUrl;
  const url = builder(message.apiUrl, endpoint);
  const response = await fetchWithRetry(url, {
    method: message.method || 'POST',
    headers: message.headers || {},
    body: message.body ? JSON.stringify(message.body) : undefined,
    timeoutMs: message.timeoutMs
  });

  const contentType = response.headers.get('content-type') || '';
  let data;

  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    const text = await response.text();
    data = message.body?.stream || contentType.includes('text/event-stream')
      ? { choices: [{ message: { content: collectOpenAIStreamContentFromSseText(text) } }] }
      : text;
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    data
  };
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html')
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openOptions') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html')
    });
    sendResponse({ success: true });
    return false;
  }

  if (message.action === 'openOptionsWithTab') {
    const tabParam = message.tab || '';
    chrome.tabs.create({
      url: chrome.runtime.getURL(`options.html?tab=${tabParam}`)
    });
    sendResponse({ success: true });
    return false;
  }

  if (message.action === 'aiFetch') {
    requestAiEndpoint(message)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((error) => sendResponse({ success: false, error: error.message || String(error) }));
    return true;
  }

  return false;
});

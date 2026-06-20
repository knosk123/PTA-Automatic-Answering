import { normalizeOpenAICompatibleBaseUrl } from './apiUrl.js';

export const DEFAULT_API_SOURCES = [
  {
    name: '硅基流动',
    url: 'https://api.siliconflow.cn/v1',
    keys: [''],
    models: ['deepseek-ai/DeepSeek-V3'],
    enabled: false,
    icon: {
      type: 'url',
      content: 'https://cloud.siliconflow.cn/favicon.ico',
      color: '#32F08C'
    }
  },
  {
    name: '阿里云百炼',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    keys: [''],
    models: ['qwen3-max'],
    enabled: false,
    icon: {
      type: 'url',
      content: 'https://img.alicdn.com/imgextra/i4/O1CN01YDrZSq1jY4mWMcVoy_!!6000000004559-2-tps-56-56.png',
      color: '#32F08C'
    }
  },
  {
    name: '小米 MiMo',
    url: 'https://token-plan-cn.xiaomimimo.com/v1',
    keys: [''],
    models: ['MiMo-VL-7B-RL'],
    enabled: false,
    icon: {
      type: 'text',
      content: 'Mi',
      color: '#ff6900'
    }
  },
  {
    name: 'MiniMax',
    url: 'https://api.minimaxi.com/v1',
    keys: [''],
    models: ['MiniMax-M3'],
    enabled: false,
    icon: {
      type: 'text',
      content: 'MM',
      color: '#1677ff'
    }
  }
];

export function getDefaultApiSources() {
  return DEFAULT_API_SOURCES.map((source) => ({
    ...source,
    keys: [...source.keys],
    models: [...source.models],
    icon: { ...source.icon }
  }));
}

export function getEnabledModels(apiSources) {
  const models = [];
  if (!Array.isArray(apiSources)) return models;

  apiSources.forEach((source) => {
    if (!source?.enabled) return;
    const sourceKeys = Array.isArray(source.keys)
      ? source.keys.filter((key) => String(key || '').trim())
      : [];
    if (sourceKeys.length === 0) return;

    const sourceModels = Array.isArray(source.models) ? source.models : [];
    sourceModels.filter((model) => String(model || '').trim()).forEach((model) => {
      models.push({
        id: String(model).trim(),
        sourceName: source.name,
        sourceUrl: source.url,
        sourceKeys
      });
    });
  });

  return models;
}

export function normalizeConfiguredApiUrl(apiUrl, model = '') {
  const url = String(apiUrl || '').trim();
  const lowerUrl = url.toLowerCase();
  const lowerModel = String(model || '').toLowerCase();

  if (
    lowerUrl.includes('anthropic') ||
    lowerUrl.includes('google') ||
    lowerUrl.includes('gemini') ||
    lowerUrl.includes('azure') ||
    lowerUrl.includes('openai.azure') ||
    lowerUrl.includes('volcano') ||
    lowerUrl.includes('ark.cn-beijing.volces.com') ||
    lowerUrl.includes('volces.com') ||
    lowerModel.includes('claude') ||
    lowerModel.includes('gemini') ||
    lowerModel.includes('volcano')
  ) {
    return url;
  }

  return normalizeOpenAICompatibleBaseUrl(url);
}

export function selectActiveApiConfig(config) {
  const apiSources = Array.isArray(config?.apiSources) ? config.apiSources : [];
  const enabledSources = apiSources.filter((source) => source?.enabled);
  const enabledModels = getEnabledModels(apiSources);

  if (enabledSources.length > 0 && enabledModels.length > 0) {
    const selectedModel = enabledModels[Math.floor(Math.random() * enabledModels.length)];

    const selectedSource = enabledSources.find((source) =>
      Array.isArray(source.models) && source.models.includes(selectedModel.id)
    );

    if (selectedSource && selectedModel) {
      return {
        url: normalizeConfiguredApiUrl(selectedSource.url, selectedModel.id),
        key: selectedModel.sourceKeys[Math.floor(Math.random() * selectedModel.sourceKeys.length)],
        model: selectedModel.id
      };
    }
  }

  if (config?.aiApiKey) {
    const model = config.aiModel || 'gpt-3.5-turbo';
    return {
      url: normalizeConfiguredApiUrl(config.aiApiUrl || 'https://api.openai.com/v1', model),
      key: config.aiApiKey,
      model
    };
  }

  return null;
}

export function parseAIJsonArray(raw) {
  const cleaned = String(raw || '').replace(/```(?:json|javascript|js)?\s*/gi, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const candidates = [];

    for (let i = 0; i < cleaned.length; i += 1) {
      if (cleaned[i] !== '[') continue;
      for (let j = cleaned.length - 1; j > i; j -= 1) {
        if (cleaned[j] !== ']') continue;
        candidates.push(cleaned.slice(i, j + 1));
        break;
      }
    }

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    throw error;
  }
}

export function normalizeFillBlankAnswer(answer, expectedCount) {
  let values;
  if (Array.isArray(answer)) {
    values = answer;
  } else if (answer === undefined || answer === null) {
    values = [];
  } else {
    values = [answer];
  }

  values = values.map((value) => String(value ?? '').trim());
  while (values.length < expectedCount) values.push('');
  return values.slice(0, expectedCount);
}

export function hasUsableFillBlankAnswer(answer) {
  return Array.isArray(answer) && answer.some((value) => String(value || '').trim());
}

export function isFillBlankTemplateContent(content) {
  const text = String(content || '');
  return (
    text.includes('程序填空题模板') ||
    text.includes('add-blank-inline') ||
    text.includes('添加填空')
  );
}

export function chooseFillBlankProblemContent(apiProblem = {}, domQuestion = {}, problemType = '') {
  const apiContent = apiProblem.content || apiProblem.description || '';
  const domContent = domQuestion.text || '';

  if (problemType === 'FILL_IN_THE_BLANK_FOR_PROGRAMMING' && isFillBlankTemplateContent(apiContent) && domContent) {
    return domContent;
  }

  return apiContent || domContent;
}

export function normalizeChoiceAnswer(answer) {
  const match = String(answer || '').trim().toUpperCase().match(/[A-Z]/);
  return match ? match[0] : '';
}

function normalizeMessageText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((part) => {
      if (typeof part === 'string') return part;
      return part?.text || part?.content || part?.output_text || '';
    }).join('');
  }
  return '';
}

export function getOpenAIMessageContent(data) {
  const choice = data?.choices?.[0] || {};
  const message = choice.message || {};
  return (
    normalizeMessageText(message.content).trim() ||
    normalizeMessageText(message.reasoning_content).trim() ||
    normalizeMessageText(choice.text).trim() ||
    ''
  );
}

function isMiniMaxModel(model) {
  return String(model || '').toLowerCase().includes('minimax-m3');
}

function isXiaomiMimoModel(model, apiUrl = '') {
  const text = `${model || ''} ${apiUrl || ''}`.toLowerCase();
  return text.includes('mimo') || text.includes('xiaomi');
}

export function isDashScopeBailian(apiUrl = '', model = '') {
  const text = `${apiUrl || ''} ${model || ''}`.toLowerCase();
  return text.includes('dashscope') || text.includes('aliyun') || text.includes('bailian') || text.includes('qwen');
}

function isSiliconFlowReasoningModel(apiUrl = '', model = '') {
  const text = `${apiUrl || ''} ${model || ''}`.toLowerCase();
  return text.includes('siliconflow') && (
    text.includes('deepseek') ||
    text.includes('qwen') ||
    text.includes('glm') ||
    text.includes('reason')
  );
}

export function shouldStreamOpenAICompatibleRequest(apiUrl = '', model = '') {
  return isDashScopeBailian(apiUrl, model);
}

export function buildOpenAICompatibleChatBody(model, messages, stream = false, options = {}) {
  const apiUrl = options.apiUrl || '';
  const enableProviderReasoning = options.enableProviderReasoning !== false;
  const body = {
    model,
    messages,
    temperature: 0.7,
    stream
  };

  if (!enableProviderReasoning) {
    return body;
  }

  if (isMiniMaxModel(model)) {
    body.thinking = { type: 'adaptive' };
    body.reasoning_split = true;
  } else if (isXiaomiMimoModel(model, apiUrl)) {
    body.thinking = { type: 'enabled' };
  } else if (isDashScopeBailian(apiUrl, model)) {
    body.enable_thinking = true;
    body.stream = true;
  } else if (isSiliconFlowReasoningModel(apiUrl, model)) {
    body.reasoning_effort = 'high';
  }

  return body;
}

export function collectOpenAIStreamContentFromSseText(sseText) {
  const chunks = String(sseText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6).trim())
    .filter((data) => data && data !== '[DONE]')
    .map((data) => {
      try {
        const parsed = JSON.parse(data);
        const choice = parsed?.choices?.[0] || {};
        const delta = choice.delta || {};
        const message = choice.message || {};
        return {
          content: normalizeMessageText(delta.content) || normalizeMessageText(message.content),
          reasoning: normalizeMessageText(delta.reasoning_content) || normalizeMessageText(message.reasoning_content)
        };
      } catch {
        return { content: '', reasoning: '' };
      }
    });

  const content = chunks.map((chunk) => chunk.content).join('');
  if (content.trim()) return content;
  return chunks.map((chunk) => chunk.reasoning).join('');
}

export function getAIRequestTimeoutMs({ reasoning = false } = {}) {
  return reasoning ? 120000 : 60000;
}

export function shouldUseBackgroundOpenAIRequest(provider) {
  return ['openai', 'openai-compatible', 'deepseek', 'siliconflow', 'aliyun'].includes(provider);
}

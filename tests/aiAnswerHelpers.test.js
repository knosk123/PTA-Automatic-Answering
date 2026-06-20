import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOpenAICompatibleChatBody,
  chooseFillBlankProblemContent,
  collectOpenAIStreamContentFromSseText,
  getDefaultApiSources,
  getAIRequestTimeoutMs,
  getOpenAIMessageContent,
  hasUsableFillBlankAnswer,
  normalizeFillBlankAnswer,
  parseAIJsonArray,
  selectActiveApiConfig,
  shouldStreamOpenAICompatibleRequest,
  shouldUseBackgroundOpenAIRequest
} from '../src/utils/aiAnswerHelpers.js';

test('getDefaultApiSources includes the four built-in compatible providers disabled by default', () => {
  const sources = getDefaultApiSources();

  assert.deepEqual(sources.map((source) => source.url), [
    'https://api.siliconflow.cn/v1',
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'https://token-plan-cn.xiaomimimo.com/v1',
    'https://api.minimaxi.com/v1'
  ]);
  assert.equal(sources.every((source) => source.enabled === false), true);
  assert.equal(sources.every((source) => Array.isArray(source.keys) && source.keys.length === 1), true);
});

test('getDefaultApiSources returns fresh editable copies', () => {
  const first = getDefaultApiSources();
  first[0].keys[0] = 'changed';
  first[0].icon.content = 'changed';

  const second = getDefaultApiSources();
  assert.equal(second[0].keys[0], '');
  assert.notEqual(second[0].icon.content, 'changed');
});

test('selectActiveApiConfig prefers enabled apiSources over legacy API key', () => {
  const selected = selectActiveApiConfig({
    aiApiKey: 'old-key',
    aiApiUrl: 'https://old.example.com/v1',
    aiModel: 'old-model',
    modelSelectMode: 'manual',
    selectedModelId: 'new-model',
    apiSources: [
      {
        name: 'new-source',
        url: 'https://new.example.com',
        keys: ['new-key'],
        models: ['new-model'],
        enabled: true
      }
    ]
  });

  assert.deepEqual(selected, {
    url: 'https://new.example.com/v1',
    key: 'new-key',
    model: 'new-model'
  });
});

test('selectActiveApiConfig returns enabled source even when legacy aiEnabled flag is false', () => {
  const selected = selectActiveApiConfig({
    aiEnabled: false,
    modelSelectMode: 'manual',
    selectedModelId: 'MiniMax-M3',
    apiSources: [
      {
        name: 'minimax',
        url: 'https://api.minimaxi.com/v1',
        keys: ['key'],
        models: ['MiniMax-M3'],
        enabled: true
      }
    ]
  });

  assert.deepEqual(selected, {
    url: 'https://api.minimaxi.com/v1',
    key: 'key',
    model: 'MiniMax-M3'
  });
});

test('selectActiveApiConfig ignores removed manual model selection and uses random choice', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const selected = selectActiveApiConfig({
      modelSelectMode: 'manual',
      selectedModelId: 'second-model',
      apiSources: [
        {
          name: 'source',
          url: 'https://example.com/v1',
          keys: ['key'],
          models: ['first-model', 'second-model'],
          enabled: true
        }
      ]
    });

    assert.equal(selected.model, 'first-model');
  } finally {
    Math.random = originalRandom;
  }
});

test('selectActiveApiConfig falls back to legacy API key when no enabled source exists', () => {
  const selected = selectActiveApiConfig({
    aiApiKey: 'old-key',
    aiApiUrl: 'https://old.example.com',
    aiModel: 'old-model',
    apiSources: []
  });

  assert.deepEqual(selected, {
    url: 'https://old.example.com/v1',
    key: 'old-key',
    model: 'old-model'
  });
});

test('parseAIJsonArray extracts arrays from markdown and surrounding text', () => {
  assert.deepEqual(parseAIJsonArray('```json\n[["a"], ["b"]]\n```'), [['a'], ['b']]);
  assert.deepEqual(parseAIJsonArray('答案如下：\n["A", "B"]\n请检查'), ['A', 'B']);
});

test('parseAIJsonArray ignores MiniMax thinking and problem brackets before the answer', () => {
  const raw = '<think>题目里有 [capture_2022.bmp] 和代码数组 a[10]，不要当答案。</think>\n最终答案：\n```json\n[["0"], ["1", "2"]]\n```';

  assert.deepEqual(parseAIJsonArray(raw), [['0'], ['1', '2']]);
});

test('buildOpenAICompatibleChatBody enables high-quality thinking for MiniMax-M3', () => {
  const body = buildOpenAICompatibleChatBody('MiniMax-M3', [{ role: 'user', content: '[]' }], false);

  assert.equal(body.model, 'MiniMax-M3');
  assert.deepEqual(body.thinking, { type: 'adaptive' });
  assert.equal(body.reasoning_split, true);
  assert.equal(body.stream, false);
});

test('buildOpenAICompatibleChatBody enables Xiaomi MiMo thinking', () => {
  const body = buildOpenAICompatibleChatBody('MiMo-VL-7B-RL', [{ role: 'user', content: '[]' }], false, {
    apiUrl: 'https://api.xiaomi.com/v1'
  });

  assert.deepEqual(body.thinking, { type: 'enabled' });
});

test('buildOpenAICompatibleChatBody enables DashScope Bailian thinking', () => {
  const body = buildOpenAICompatibleChatBody('qwen3.7-plus', [{ role: 'user', content: '[]' }], false, {
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  });

  assert.equal(body.enable_thinking, true);
  assert.equal(body.stream, true);
});

test('buildOpenAICompatibleChatBody can keep health checks lightweight', () => {
  const body = buildOpenAICompatibleChatBody('qwen3.7-plus', [{ role: 'user', content: 'ping' }], false, {
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    enableProviderReasoning: false
  });

  assert.equal(body.enable_thinking, undefined);
  assert.equal(body.stream, false);
});

test('buildOpenAICompatibleChatBody enables SiliconFlow high reasoning effort for reasoning models', () => {
  const body = buildOpenAICompatibleChatBody('deepseek-v4-flash', [{ role: 'user', content: '[]' }], false, {
    apiUrl: 'https://api.siliconflow.cn/v1'
  });

  assert.equal(body.reasoning_effort, 'high');
});

test('normalizeFillBlankAnswer pads answers and identifies empty answers as unusable', () => {
  const empty = normalizeFillBlankAnswer(undefined, 2);
  const answer = normalizeFillBlankAnswer(['x'], 2);

  assert.deepEqual(empty, ['', '']);
  assert.equal(hasUsableFillBlankAnswer(empty), false);
  assert.deepEqual(answer, ['x', '']);
  assert.equal(hasUsableFillBlankAnswer(answer), true);
});

test('chooseFillBlankProblemContent prefers DOM text for programming fill blank templates', () => {
  const content = chooseFillBlankProblemContent(
    { content: '这是程序填空题模板。[add-blank-inline.png]' },
    { text: '5-1 兔子的数量\\n#include<stdio.h>\\nf1=f2=____;' },
    'FILL_IN_THE_BLANK_FOR_PROGRAMMING'
  );

  assert.equal(content, '5-1 兔子的数量\\n#include<stdio.h>\\nf1=f2=____;');
});

test('OpenAI-compatible providers should use background request path', () => {
  assert.equal(shouldUseBackgroundOpenAIRequest('openai-compatible'), true);
  assert.equal(shouldUseBackgroundOpenAIRequest('deepseek'), true);
  assert.equal(shouldUseBackgroundOpenAIRequest('anthropic'), false);
});

test('getOpenAIMessageContent reads chat and text completion shapes', () => {
  assert.equal(getOpenAIMessageContent({ choices: [{ message: { content: 'chat' } }] }), 'chat');
  assert.equal(getOpenAIMessageContent({ choices: [{ text: 'text' }] }), 'text');
});

test('getOpenAIMessageContent falls back to MiMo reasoning_content when content is empty', () => {
  const data = {
    choices: [
      {
        message: {
          content: '',
          reasoning_content: '[["stdio.h", "0"], ["main"]]'
        }
      }
    ]
  };

  assert.equal(getOpenAIMessageContent(data), '[["stdio.h", "0"], ["main"]]');
});

test('getOpenAIMessageContent joins array content parts', () => {
  const data = {
    choices: [
      {
        message: {
          content: [
            { type: 'text', text: '[["A"]' },
            { type: 'output_text', text: ', ["B"]]' }
          ]
        }
      }
    ]
  };

  assert.equal(getOpenAIMessageContent(data), '[["A"], ["B"]]');
});

test('collectOpenAIStreamContentFromSseText merges streamed content chunks', () => {
  const sse = [
    'data: {"choices":[{"delta":{"content":"[["}}]}',
    'data: {"choices":[{"delta":{"content":"\\"A\\""}}]}',
    'data: {"choices":[{"delta":{"content":"]]"} }]}',
    'data: [DONE]'
  ].join('\n');

  assert.equal(collectOpenAIStreamContentFromSseText(sse), '[["A"]]');
});

test('collectOpenAIStreamContentFromSseText falls back to reasoning chunks when content chunks are empty', () => {
  const sse = [
    'data: {"choices":[{"delta":{"reasoning_content":"[["}}]}',
    'data: {"choices":[{"delta":{"reasoning_content":"\\"A\\""}}]}',
    'data: {"choices":[{"delta":{"reasoning_content":"]]"} }]}',
    'data: [DONE]'
  ].join('\n');

  assert.equal(collectOpenAIStreamContentFromSseText(sse), '[["A"]]');
});

test('shouldStreamOpenAICompatibleRequest streams DashScope thinking requests', () => {
  assert.equal(shouldStreamOpenAICompatibleRequest('https://dashscope.aliyuncs.com/compatible-mode/v1', 'qwen3.7-plus'), true);
  assert.equal(shouldStreamOpenAICompatibleRequest('https://api.minimaxi.com/v1', 'MiniMax-M3'), false);
});

test('getAIRequestTimeoutMs gives reasoning requests a finite timeout', () => {
  assert.equal(getAIRequestTimeoutMs({ reasoning: true }), 120000);
  assert.equal(getAIRequestTimeoutMs({ reasoning: false }), 60000);
});

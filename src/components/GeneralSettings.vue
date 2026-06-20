<script setup>
import { ref, computed } from 'vue';

const defaultGeneralConfig = {
  autoPopup: true,
  language: 'c',
  aiEnabled: true,
  modelSelectMode: 'random',
  selectedModelId: '',
  aiSystemPrompt: `你是专业的编程题 AC 生成器。
语言：{language}

请直接输出**能 AC 的完整代码**，不要解释、不要说明、不要多余内容。
严格遵守格式：换行、空格、缩进必须完全符合题目要求。

以下是题目内容：
{problem content}`,
  aiErrorPrompt: `你是专业的编程题 AC 生成器。
语言：{language}
错误类型：{error_type}
编译器提示：{compiler_msg}
测试点提示：{data_tip}

请直接输出**能 AC 的完整代码**，不要解释、不要说明、不要多余内容。
严格遵守格式：换行、空格、缩进必须完全符合题目要求。
题目如下：
{problem content}
错误源码如下：
{res_code}`,
  choiceBatchSize: 20,
  choicePrompt: `你是一个专业的AI做题工具
请直接输出**符合格式的JSON**，不要解释、不要说明、不要多余内容。
格式如下
[
  "A",
  "B"
]

以下是题目内容：
{problem content}`
};

const config = ref({ ...defaultGeneralConfig });

const presetLanguages = [
  { value: 'c', label: 'C' },
  { value: 'c++', label: 'C++' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
  { value: 'py', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'js', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'ts', label: 'TypeScript' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'rs', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'rb', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'kt', label: 'Kotlin' },
  { value: 'scala', label: 'Scala' },
  { value: 'r', label: 'R' },
  { value: 'matlab', label: 'MATLAB' },
  { value: 'sql', label: 'SQL' },
  { value: 'shell', label: 'Shell' },
  { value: 'bash', label: 'Bash' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'ps', label: 'PowerShell' },
  { value: 'assembly', label: 'Assembly' },
  { value: 'asm', label: '汇编语言' },
  { value: 'brainfuck', label: 'Brainfuck' },
  { value: 'bf', label: 'Brainfuck' },
  { value: 'intercal', label: 'INTERCAL' },
  { value: 'whitespace', label: 'Whitespace' },
  { value: 'ook', label: 'Ook!' },
  { value: 'piet', label: 'Piet' },
  { value: 'malbolge', label: 'Malbolge' },
  { value: 'cow', label: 'COW' },
  { value: 'lolcode', label: 'LOLCODE' },
  { value: 'chef', label: 'Chef' },
  { value: 'binary', label: 'Binary' },
  { value: 'hex', label: 'Hex' },
  { value: 'fortran', label: 'Fortran' },
  { value: 'cobol', label: 'COBOL' },
  { value: 'pascal', label: 'Pascal' },
  { value: 'ada', label: 'Ada' },
  { value: 'prolog', label: 'Prolog' },
  { value: 'lisp', label: 'Lisp' },
  { value: 'clojure', label: 'Clojure' },
  { value: 'erlang', label: 'Erlang' },
  { value: 'elixir', label: 'Elixir' },
  { value: 'haskell', label: 'Haskell' },
  { value: 'ocaml', label: 'OCaml' }
];

const showSuggestions = ref(false);

const filteredSuggestions = computed(() => {
  const input = String(config.value.language || '').toLowerCase().trim();
  if (!input) return presetLanguages.slice(0, 8);

  return presetLanguages.filter(lang =>
    lang.value.toLowerCase().includes(input) ||
    lang.label.toLowerCase().includes(input)
  ).slice(0, 8);
});

function selectSuggestion(lang) {
  config.value.language = lang.value;
  showSuggestions.value = false;
  autoSaveConfig();
}

function hideSuggestions() {
  setTimeout(() => {
    showSuggestions.value = false;
  }, 200);
}

function loadConfig() {
  chrome.storage.local.get(Object.keys(defaultGeneralConfig), (result) => {
    config.value = {
      ...defaultGeneralConfig,
      ...result,
      aiEnabled: true,
      modelSelectMode: 'random',
      selectedModelId: ''
    };
    chrome.storage.local.set({ aiEnabled: true, modelSelectMode: 'random', selectedModelId: '' });
  });
}

const GENERAL_KEYS = Object.keys(defaultGeneralConfig);

function autoSaveConfig() {
  const raw = JSON.parse(JSON.stringify(config.value));
  const configToSave = {};
  GENERAL_KEYS.forEach((key) => {
    configToSave[key] = raw[key];
  });
  configToSave.aiEnabled = true;
  configToSave.modelSelectMode = 'random';
  configToSave.selectedModelId = '';
  chrome.storage.local.set(configToSave);
}

let textareaTimer = null;
function debouncedSave() {
  if (textareaTimer) clearTimeout(textareaTimer);
  textareaTimer = setTimeout(autoSaveConfig, 500);
}

loadConfig();
</script>

<template>
  <div>
    <div class="setting-section">
      <h3 class="section-title">基本设置</h3>
      <div class="setting-card">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">自动弹出浮动窗口</div>
            <div class="setting-desc">在 PTA 答题页面自动显示代码提交浮动窗口</div>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="config.autoPopup" @change="autoSaveConfig">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">指定语言</div>
            <div class="setting-desc">AI 生成代码的默认语言，可自定义输入</div>
          </div>
          <div class="language-input-wrapper">
            <input
              type="text"
              v-model="config.language"
              class="input-text"
              placeholder="输入语言，如 c, java, python"
              @focus="showSuggestions = true"
              @blur="hideSuggestions"
              @change="autoSaveConfig"
            >
            <div v-if="showSuggestions && filteredSuggestions.length > 0" class="suggestions-dropdown">
              <div
                v-for="lang in filteredSuggestions"
                :key="lang.value"
                class="suggestion-item"
                @mousedown.prevent="selectSuggestion(lang)"
              >
                <span class="suggestion-label">{{ lang.label }}</span>
                <span class="suggestion-value">{{ lang.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="setting-section">
      <h3 class="section-title">提示词设置</h3>
      <div class="setting-card">
        <div class="setting-item vertical">
          <div class="setting-info">
            <div class="setting-name">系统提示词</div>
            <div class="setting-desc">用于普通编程题生成答案</div>
          </div>
          <textarea v-model="config.aiSystemPrompt" class="input-textarea" @input="debouncedSave" @blur="autoSaveConfig"></textarea>
        </div>

        <div class="setting-item vertical">
          <div class="setting-info">
            <div class="setting-name">纠错提示词</div>
            <div class="setting-desc">提交失败后根据错误信息重新生成答案</div>
          </div>
          <textarea v-model="config.aiErrorPrompt" class="input-textarea" @input="debouncedSave" @blur="autoSaveConfig"></textarea>
        </div>
      </div>
    </div>

    <div class="setting-section">
      <h3 class="section-title">选择题设置</h3>
      <div class="setting-card">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">每批题目数量</div>
            <div class="setting-desc">每次发送给 AI 的选择、判断、填空题数量</div>
          </div>
          <input type="number" v-model.number="config.choiceBatchSize" class="input-number" min="1" max="100" @change="autoSaveConfig">
        </div>

        <div class="setting-item vertical">
          <div class="setting-info">
            <div class="setting-name">选择题提示词</div>
            <div class="setting-desc">使用 {problem content} 作为题目内容占位符</div>
          </div>
          <textarea v-model="config.choicePrompt" class="input-textarea" @input="debouncedSave" @blur="autoSaveConfig"></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setting-section {
  margin-bottom: 40px;
}

.setting-card {
  background-color: #fafafa;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #f0f0f0;
  gap: 32px;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item.vertical {
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-name {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.setting-desc {
  font-size: 13px;
  color: #999;
  line-height: 1.4;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #e5e5e5;
  transition: 0.2s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

input:checked + .toggle-slider {
  background-color: #32F08C;
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.language-input-wrapper {
  position: relative;
  width: 200px;
}

.input-text,
.input-number {
  padding: 8px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  font-size: 14px;
  background-color: #fafafa;
  transition: all 0.2s;
}

.input-text {
  width: 100%;
}

.input-number {
  width: 80px;
  text-align: center;
}

.input-text:focus,
.input-number:focus {
  outline: none;
  border-color: #1a1a1a;
  background-color: #fff;
}

.input-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px 14px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  font-size: 14px;
  background-color: #fafafa;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
  transition: all 0.2s;
}

.input-textarea:focus {
  outline: none;
  border-color: #1a1a1a;
  background-color: #fff;
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background-color: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.suggestion-item:hover {
  background-color: #f5f5f5;
}

.suggestion-label {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 500;
}

.suggestion-value {
  font-size: 12px;
  color: #999;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
}
</style>

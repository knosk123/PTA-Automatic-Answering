# 核心项目改造 - 限定 4 个默认 API 源 + 补全题型支持

**日期：** 2026-06-21
**项目：** `C:\Users\zhanglei\Desktop\fuckpta-main(1)\fuckpta-main`（fuckpta 核心项目）
**参考项目：** `C:\Users\zhanglei\Desktop\有意思的小项目\pta\fuckpta-main\fuckpta-main`（改良版）

## 1. 目标

将核心项目（fuckpta-main(1)）改造为一个**限定 4 个默认 API 源**的"开箱即用"扩展，同时补全缺失的 3 种题型作答支持：
1. **判断题**（`/type/1`）
2. **普通填空题**（`/type/4`）
3. **程序填空题**（`/type/5`）

## 2. 用户需求

1. **补全核心项目缺失的题型作答功能** — 参考项目支持 6 种题型（编程题、函数题、选择题 + 判断题、普通填空、程序填空），核心项目只支持 3 种，需要移植缺失的 3 种。
2. **保证 4 个默认 API 源可用** — 硅基流动、阿里云百炼、小米 MiMo、MiniMax-M3 必须能正常工作。
3. **限定使用默认 API 源** — 移除其他适配器（OpenAI、Anthropic、Google、Azure、DeepSeek、Volcano），只保留 4 个默认源对应的适配器。
4. **不影响 AI 答题速度** — 保留 `simpleStreamAIResponse` / `simpleGenerateAIResponse` 快速路径，保留的 3 个适配器（siliconflow、aliyun、openai-compatible）保持原有实现。
5. **保留核心项目原有的 AI 调用方式** — 不引入 background.js 中转、不重写 simple* 快路径。

## 3. 架构

### 3.1 文件改动清单

| 操作 | 文件 | 估计行数 | 描述 |
|------|------|----------|------|
| 修改 | `src/content-script.js` | +1100 / -800 | 移除 6 个非默认源适配器；新增 3 种题型的全部代码 |
| 修改 | `src/components/ApiSourceManagement.vue` | ~10 行 | 移除"添加自定义 API 源"按钮；只显示 4 个默认源 |
| 修改 | `manifest.json` | +4 行 | 添加 4 个默认 API 域名的 host_permissions |
| 不变 | `src/background.js` | 0 | 不引入 aiFetch 中转 |
| 不变 | 其他 Vue 组件 | 0 | UI 结构、popup 都不变 |
| 不变 | `src/options-main.js`、`src/config.js`、`src/style.css` | 0 | 入口和样式不变 |
| 不变 | `src/main.js`、`src/data-manager-main.js` | 0 | popup/data-manager 入口不变 |

### 3.2 AI 适配器改动

**保留 3 个适配器**（保留核心项目原有实现，不引入参考项目的工厂函数）：
- `SiliconFlowAdapter` - 硅基流动专用
- `AliyunAdapter` - 阿里云百炼专用
- `OpenAIAdapter` - 兼容模式（用于小米 MiMo、MiniMax）

**移除 6 个适配器**（直接从代码中删除）：
- `AnthropicAdapter` - Claude
- `GoogleAdapter` - Gemini
- `AzureAdapter`
- `DeepSeekAdapter`
- `VolcanoAdapter` - 火山方舟
- `simpleStreamAIResponse` / `simpleGenerateAIResponse` 不删除，保留快速路径

### 3.3 detectProvider 简化

**原版**（8 个 provider）：
```javascript
if (url.includes('siliconflow')) return 'siliconflow';
if (url.includes('volcano') || url.includes('volces.com')) return 'volcano';
if (url.includes('aliyun') || url.includes('dashscope')) return 'aliyun';
if (url.includes('anthropic') || url.includes('claude')) return 'anthropic';
if (url.includes('google') || url.includes('gemini')) return 'google';
if (url.includes('azure') || url.includes('openai.azure')) return 'azure';
if (url.includes('deepseek')) return 'deepseek';
if (url.includes('openai') || url.includes('gpt')) return 'openai';
return 'openai-compatible';
```

**新版**（4 个 provider）：
```javascript
if (url.includes('siliconflow')) return 'siliconflow';
if (url.includes('aliyun') || url.includes('dashscope')) return 'aliyun';
return 'openai-compatible';
```

### 3.4 AIAdapters 简化

**原版**（8 个 entries）：
```javascript
const AIAdapters = {
  openai, anthropic, google, azure, deepseek, siliconflow, volcano, aliyun,
  'openai-compatible': OpenAIAdapter
};
```

**新版**（3 个 entries）：
```javascript
const AIAdapters = {
  siliconflow: SiliconFlowAdapter,
  aliyun: AliyunAdapter,
  'openai-compatible': OpenAIAdapter
};
```

## 4. 新增的题型代码

### 4.1 判断题（约 250 行）

新增到 `src/content-script.js`：

| 函数 | 作用 |
|------|------|
| `isTrueFalseQuestionPage()` | URL 检测：`/problem-sets/.../type/1` |
| `fetchTrueFalseQuestions()` | 调用 PTA API：`/api/problem-sets/{id}/exam-problems?problem_type=TRUE_OR_FALSE` |
| `createTrueFalseQuestionHTML()` | 浮窗 HTML（三态按钮、列表） |
| `renderTrueFalseList()` | 渲染题目列表 |
| `initTrueFalseQuestionEvents()` | 浮窗事件绑定 |
| `batchProcessTrueFalseQuestions()` | 批量调用 AI（流式），解析 T/F 答案 |
| `fillTrueFalseAnswersToPage()` | 填入答案（点击 radio） |

修改位置：
- `checkAutoPopup()` 第 401-451 行：增加 `isTrueFalse` 分支
- `createFloatingWindow()` 第 2195-2209 行：增加 `isTrueFalse` 渲染分支
- `initFloatingWindowEvents()` 第 2495-2507 行：增加 `isTrueFalse` 初始化分支

### 4.2 普通填空 + 程序填空（约 850 行）

新增到 `src/content-script.js`：

| 函数 | 作用 |
|------|------|
| `isFillBlankQuestionPage()` | URL 检测：`/problem-sets/.../type/[45]` |
| `getFillBlankProblemType()` | 区分 `FILL_IN_THE_BLANK`（type/4）vs `FILL_IN_THE_BLANK_FOR_PROGRAMMING`（type/5） |
| `fetchFillBlankQuestions()` | 调用 PTA API：传入对应 `problem_type` |
| `waitForFillBlankDomQuestions()` | 等待 DOM 渲染完成 |
| `getFillBlankDomQuestions()` | 从 DOM 提取题目（input/textarea/contenteditable） |
| `createFillBlankQuestionHTML()` | 浮窗 HTML |
| `renderFillBlankList()` | 渲染题目 |
| `initFillBlankQuestionEvents()` | 浮窗事件绑定 |
| `batchProcessFillBlankQuestions()` | 批量 AI 调用（含 prompt 模板），并发 3 批 |
| `fillFillBlankAnswersToPage()` | 填入答案 |
| `chooseFillBlankProblemContent()` | 选择 API content 或 DOM content |
| `countBlanksFromContent()` | 从 API content 中统计填空数（"X 分" 标记） |
| `parseAIJsonArray()` | 解析 AI 返回的 JSON 数组 |
| `normalizeFillBlankAnswer()` | 标准化填空答案数组 |
| `hasUsableFillBlankAnswer()` | 检查填空答案有效性 |

修改位置：
- `checkAutoPopup()` 第 401-451 行：增加 `isFillBlank` 分支
- `createFloatingWindow()` 第 2195-2209 行：增加 `isFillBlank` 渲染分支
- `initFloatingWindowEvents()` 第 2495-2507 行：增加 `isFillBlank` 初始化分支

### 4.3 选择题辅助函数（约 30 行）

新增 `normalizeChoiceAnswer()`：将 AI 返回的答案规范化为单个大写字母 A-Z。

修改位置：现有 `batchProcessChoiceQuestions` 函数末尾的答案解析逻辑。

## 5. 数据结构

### 5.1 4 个默认 API 源

修改 `src/components/ApiSourceManagement.vue` 第 117-142 行的 `else` 分支，扩展为 4 个源：

```javascript
config.value.apiSources = [
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
    models: ['mimo-v2.5-pro'],
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
```

### 5.2 URL 验证

4 个默认源 URL 与现有适配器拼接 `/chat/completions` 后均为合法端点：

| 源 | baseUrl | 完整端点 |
|----|---------|----------|
| 硅基流动 | `https://api.siliconflow.cn/v1` | `https://api.siliconflow.cn/v1/chat/completions` ✓ |
| 阿里云百炼 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` ✓ |
| 小米 MiMo | `https://token-plan-cn.xiaomimimo.com/v1` | `https://token-plan-cn.xiaomimimo.com/v1/chat/completions` ✓ |
| MiniMax | `https://api.minimaxi.com/v1` | `https://api.minimaxi.com/v1/chat/completions` ✓ |

无需 `apiUrl.js` 规范化。

## 6. manifest.json 改动

```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "storage", "tabs"],
  "host_permissions": [
    "*://pintia.cn/*",
    "*://raw.githubusercontent.com/*",
    "*://gitee.com/*",
    "*://api.siliconflow.cn/*",
    "*://dashscope.aliyuncs.com/*",
    "*://token-plan-cn.xiaomimimo.com/*",
    "*://api.minimaxi.com/*"
  ],
  ...
}
```

## 7. 数据流程

### 7.1 首次安装

```
用户安装扩展
    ↓
打开 options 页面
    ↓
ApiSourceManagement.vue 加载
    ↓
loadConfig() → chrome.storage.local.get('apiSources')
    ↓
apiSources 为空
    ↓
写入 4 个默认源
    ↓
autoSaveConfig() 持久化
    ↓
用户看到 4 个默认源
    ↓
用户填入 API key、启用、选择模型
    ↓
保存到 storage
```

### 7.2 答题流程（以程序填空题为例）

```
用户访问 PTA 平台，URL 为 /problem-sets/.../type/5
    ↓
content-script.js 加载
    ↓
checkAutoPopup() 检测到 isFillBlankQuestionPage() = true
    ↓
fetchFillBlankQuestions() 调用 PTA API 获取题目
    ↓
createFloatingWindow() 渲染填空题浮窗
    ↓
用户点击「获取答案」
    ↓
batchProcessFillBlankQuestions() 批量调用 AI
    ↓
AI 返回 JSON 数组（如 [["答案1", "答案2"], ["答案3"]]）
    ↓
parseAIJsonArray() 解析
    ↓
normalizeFillBlankAnswer() 标准化
    ↓
浮窗显示答案
    ↓
用户点击「填入答案」→ fillFillBlankAnswersToPage()
    ↓
答案填入 DOM 输入框（不自动保存）
    ↓
用户手动点击「保存」
```

## 8. 实现细节

### 8.1 内容脚本的代码组织

新增代码按以下顺序添加到 `src/content-script.js`：

1. **顶部 import**（如有需要从 utils 导入）
2. **题型检测函数**：`isTrueFalseQuestionPage()`、`isFillBlankQuestionPage()`、`getFillBlankProblemType()`
3. **Pintia API 包装**：`pintiaFetch()`（如果尚未存在）
4. **判断题函数**：`fetchTrueFalseQuestions()`、`batchProcessTrueFalseQuestions()`、`fillTrueFalseAnswersToPage()`、`renderTrueFalseList()`、`initTrueFalseQuestionEvents()`、`createTrueFalseQuestionHTML()`
5. **填空题函数**：`getFillBlankDomQuestions()`、`waitForFillBlankDomQuestions()`、`fetchFillBlankQuestions()`、`batchProcessFillBlankQuestions()`、`fillFillBlankAnswersToPage()`、`renderFillBlankList()`、`initFillBlankQuestionEvents()`、`createFillBlankQuestionHTML()`
6. **辅助函数**：`parseAIJsonArray()`、`normalizeFillBlankAnswer()`、`hasUsableFillBlankAnswer()`、`chooseFillBlankProblemContent()`、`countBlanksFromContent()`、`normalizeChoiceAnswer()`

### 8.2 关键修改点

- **content-script.js 第 401-451 行 `checkAutoPopup()`**：增加判断题、填空题分支
- **content-script.js 第 2195-2209 行 `createFloatingWindow()`**：增加判断题、填空题 HTML 渲染分支
- **content-script.js 第 2495-2507 行 `initFloatingWindowEvents()`**：增加判断题、填空题事件初始化分支
- **content-script.js 第 1404-1450 行 `detectProvider()`**：简化为 4 个 provider
- **content-script.js 第 2155-2166 行 `AIAdapters`**：简化为 3 个 entries
- **content-script.js 第 1527-1800 行**：删除 6 个适配器
- **ApiSourceManagement.vue 第 117-142 行**：扩展为 4 个默认源
- **ApiSourceManagement.vue** 移除"添加自定义 API 源"按钮（保留编辑、删除功能）
- **manifest.json**：添加 4 个 host_permissions

### 8.3 删除的代码清单

从 `src/content-script.js` 删除（按行号）：
- `const AnthropicAdapter = { ... }` (第 1527-1632 行)
- `const GoogleAdapter = { ... }` (第 1633-1721 行)
- `const AzureAdapter = { ... }` (第 1722-1806 行)
- `const DeepSeekAdapter = { ... }` (第 1807-1893 行)
- `const VolcanoAdapter = { ... }` (第 1894-1980 行)
- `const OpenAIAdapter` 独立版本（如有，与硅基流动等共用的保留）

## 9. 边界情况处理

| 情况 | 行为 | 备注 |
|------|------|------|
| 首次安装（无 storage 数据） | 写入 4 个默认源 | ✅ 目标场景 |
| 老用户（已有 apiSources） | 加载用户现有数据 | ✅ 非破坏性 |
| 用户访问的 URL 是 /type/1/2/4/5/6/7 | 相应题型浮窗出现 | ✅ 全题型支持 |
| 用户填入错误的 API key | AI 调用返回错误，浮窗显示提示 | ✅ 与现有逻辑一致 |
| 4 个默认源 URL 失效 | 用户可在 API 源管理页修改 URL | ✅ 可编辑 |
| 用户删除某个默认源 | 不会重新出现 | ✅ 符合预期 |
| manifest.json 未授权 API 域名 | CORS 错误，AI 调用失败 | ❌ 必须添加 host_permissions |

## 10. 测试与验证

### 10.1 验证场景

**场景 1：构建无错误**
- 操作：`npm run build`
- 预期：构建成功，无 Vue/JS 编译错误

**场景 2：4 个默认源显示**
- 操作：清除 storage 数据 → 加载扩展 → 打开 options → 切换到「API 源」tab
- 预期：看到 4 个默认源（硅基流动、阿里云百炼、小米 MiMo、MiniMax-M3）

**场景 3：判断题**
- 操作：访问 PTA 判断题页面（/type/1）
- 预期：浮窗出现，列出所有判断题，点击「获取答案」后 AI 返回 T/F，填入页面

**场景 4：普通填空题**
- 操作：访问 PTA 填空题页面（/type/4）
- 预期：浮窗出现，列出填空题，AI 返回答案，填入输入框

**场景 5：程序填空题**
- 操作：访问 PTA 程序填空题页面（/type/5）
- 预期：浮窗出现，AI 正确识别程序填空模板（"X 分" 标记），返回答案

**场景 6：编程题回归**
- 操作：访问 PTA 编程题（/type/7）测试
- 预期：编程题作答正常，答题速度与改造前一致

**场景 7：函数题回归**
- 操作：访问 PTA 函数题（/type/6）测试
- 预期：函数题作答正常

**场景 8：选择题回归**
- 操作：访问 PTA 选择题（/type/2）测试
- 预期：选择题作答正常

**场景 9：4 个 API 源可用**
- 操作：分别填入 4 个 API 源的 key，测试 AI 调用
- 预期：4 个源都能成功调用 AI，无 CORS 错误

**场景 10：移除的适配器不再可用**
- 操作：尝试添加自定义 API 源（如 OpenAI、Anthropic）
- 预期：「添加 API 源」按钮不可见或被禁用

### 10.2 风险评估

- 改动文件：3 个
- 新增代码：~1100 行（3 种题型）
- 删除代码：~800 行（6 个适配器）
- 修改代码：~30 行
- 触及 AI 答题速度的代码：0 处（保留 simple* 快路径，保留 3 个适配器原样）
- **风险等级：中**（主要是移植代码量大、需要详细测试）

## 11. 未来扩展（不在本次范围）

以下内容可在未来按需引入：

- 添加 `utils/apiUrl.js` 提供 URL 规范化能力
- 添加「重置为默认 API 源」按钮
- 引入 `<all_urls>` host_permissions 兼容任意中转站
- 添加更多默认 API 源（如 DeepSeek 官方、Qwen 官方等）
- 完善自动保存/提交逻辑

## 12. 设计变更历史

- **v3（当前）**：需求范围扩大，补全 3 种题型 + 限定 4 个默认源 + 移除其他适配器
- **v2（已废弃）**：只扩展默认源列表（2→4），不动 content-script.js
- **v1（已废弃）**：在 options-main.js 中添加独立种子逻辑（错误，因为没有 onMounted 钩子）

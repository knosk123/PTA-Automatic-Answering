# 核心项目改造 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将核心项目（fuckpta-main(1)）改造为限定 4 个默认 API 源的"开箱即用"扩展，移植判断题、普通填空、程序填空 3 种题型支持，移除其他 6 个非默认源适配器。

**Architecture:**
- 复用核心项目现有 AI 适配器结构（不引入参考项目的工厂函数）
- 保留 `simpleStreamAIResponse` / `simpleGenerateAIResponse` 快速路径（不影响答题速度）
- 移植参考项目的题型相关函数（判断题、填空题）到 `src/content-script.js`
- 在 `ApiSourceManagement.vue` 中扩展 4 个默认 API 源
- 简化 `detectProvider` 和 `AIAdapters` 字典
- 更新 `manifest.json` 添加 4 个新 host_permissions

**Tech Stack:** Vue 3 + Chrome Extension (Manifest V3) + Vite + chrome.storage.local

**Spec 参考：** `docs/superpowers/specs/2026-06-21-default-api-sources-design.md` (v3)

---

## File Structure

**修改的文件：**
- `manifest.json` — 添加 4 个 host_permissions
- `src/content-script.js` — 移除 6 个适配器，新增 3 种题型代码
- `src/components/ApiSourceManagement.vue` — 扩展 4 个默认源，移除"添加自定义"按钮

**不变的文件：**
- `src/background.js` — 不引入 aiFetch 中转
- `src/App.vue`、`src/Options.vue`、`src/DataManager.vue`
- `src/components/AboutSettings.vue`、`AiSettings.vue`、`GeneralSettings.vue`
- `src/options-main.js`、`src/data-manager-main.js`、`src/main.js`
- `src/config.js`、`src/style.css`

---

## Task 1: 更新 manifest.json 添加 4 个 API 域名权限

**Files:**
- Modify: `manifest.json` (host_permissions 字段)

- [ ] **Step 1: 打开 `manifest.json` 定位 host_permissions**

打开 `C:\Users\zhanglei\Desktop\fuckpta-main(1)\fuckpta-main\manifest.json`，找到 `host_permissions` 字段（约第 10-15 行）。

- [ ] **Step 2: 添加 4 个 API 域名**

将 `host_permissions` 修改为：
```json
"host_permissions": [
  "*://pintia.cn/*",
  "*://raw.githubusercontent.com/*",
  "*://gitee.com/*",
  "*://api.siliconflow.cn/*",
  "*://dashscope.aliyuncs.com/*",
  "*://token-plan-cn.xiaomimimo.com/*",
  "*://api.minimaxi.com/*"
]
```

- [ ] **Step 3: 验证 JSON 格式**

确保 JSON 有效，逗号位置正确。可以使用 `node -e "console.log(JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')))"` 验证。

- [ ] **Step 4: 提交修改**

```bash
cd "C:\Users\zhanglei\Desktop\fuckpta-main(1)\fuckpta-main"
git add manifest.json
git commit -m "feat: manifest 添加 4 个默认 API 源域名权限"
```

---

## Task 2: 简化 detectProvider 和 AIAdapters

**Files:**
- Modify: `src/content-script.js` (detectProvider 函数, AIAdapters 对象)

- [ ] **Step 1: 定位 detectProvider 函数**

打开 `src/content-script.js`，找到 `detectProvider` 函数（约第 1404 行）。

- [ ] **Step 2: 替换 detectProvider 函数体**

将 `detectProvider` 函数体替换为：
```javascript
function detectProvider(apiUrl, model) {
  const url = String(apiUrl || '').toLowerCase();
  if (url.includes('siliconflow')) return 'siliconflow';
  if (url.includes('aliyun') || url.includes('dashscope')) return 'aliyun';
  return 'openai-compatible';
}
```

- [ ] **Step 3: 定位 AIAdapters 对象**

在 `src/content-script.js` 中找到 `const AIAdapters = {` 定义（约第 2155 行）。

- [ ] **Step 4: 替换 AIAdapters 对象**

将 `AIAdapters` 对象替换为：
```javascript
const AIAdapters = {
  siliconflow: SiliconFlowAdapter,
  aliyun: AliyunAdapter,
  'openai-compatible': OpenAIAdapter
};
```

- [ ] **Step 5: 验证修改**

打开 `src/content-script.js`，搜索以下内容确认无残留：
- `grep -n "anthropic\|google\|azure\|deepseek\|volcano" src/content-script.js` 应只剩 AIAdapters 中可能出现的关键字
- `grep -n "AIAdapters\['" src/content-script.js` 应只显示 3 个 provider

---

## Task 3: 移除 6 个非默认源适配器

**Files:**
- Modify: `src/content-script.js`

- [ ] **Step 1: 定位 6 个适配器**

打开 `src/content-script.js`，找到以下 6 个适配器对象的起始行：
- `const AnthropicAdapter = {` (约第 1527 行)
- `const GoogleAdapter = {` (约第 1633 行)
- `const AzureAdapter = {` (约第 1722 行)
- `const DeepSeekAdapter = {` (约第 1807 行)
- `const VolcanoAdapter = {` (约第 1894 行)
- 检查 `const OpenAIAdapter` 是否独立（非工厂模式），如有则评估是否需要

**注意**：保留 `SiliconFlowAdapter`、`AliyunAdapter`、`OpenAIAdapter`（兼容模式）。

- [ ] **Step 2: 删除 AnthropicAdapter**

从 `const AnthropicAdapter = {` 开始删除，直到下一个 `const` 关键字（约 100 行）。保留 `SiliconFlowAdapter` 不变。

- [ ] **Step 3: 删除 GoogleAdapter**

从 `const GoogleAdapter = {` 开始删除，直到下一个 `const` 关键字（约 90 行）。

- [ ] **Step 4: 删除 AzureAdapter**

从 `const AzureAdapter = {` 开始删除，直到下一个 `const` 关键字（约 80 行）。

- [ ] **Step 5: 删除 DeepSeekAdapter**

从 `const DeepSeekAdapter = {` 开始删除，直到下一个 `const` 关键字（约 90 行）。

- [ ] **Step 6: 删除 VolcanoAdapter**

从 `const VolcanoAdapter = {` 开始删除，直到下一个 `const` 关键字（约 90 行）。

- [ ] **Step 7: 验证残留**

```bash
grep -n "AnthropicAdapter\|GoogleAdapter\|AzureAdapter\|DeepSeekAdapter\|VolcanoAdapter" src/content-script.js
```

预期：无匹配（5 个适配器名完全移除）。

- [ ] **Step 8: 提交修改**

```bash
git add src/content-script.js
git commit -m "refactor: 移除 6 个非默认源 AI 适配器"
```

---

## Task 4: 添加题型检测函数

**Files:**
- Modify: `src/content-script.js`

- [ ] **Step 1: 定位插入位置**

在 `src/content-script.js` 中找到 `isProgrammingDetailPage` 函数（约第 471 行），在它附近添加新函数。

- [ ] **Step 2: 添加 3 个检测函数**

在 `isProgrammingDetailPage` 函数之后添加：
```javascript
// 检查是否是判断题页面（/type/1）
function isTrueFalseQuestionPage() {
  const url = window.location.href;
  return /\/problem-sets\/.+\/exam\/problems\/type\/1/.test(url);
}

// 检查是否是填空题页面（/type/4 普通填空，/type/5 程序填空）
function isFillBlankQuestionPage() {
  const url = window.location.href;
  return /\/problem-sets\/.+\/exam\/problems\/type\/[45]/.test(url);
}

function getFillBlankProblemType() {
  const url = window.location.href;
  if (/\/type\/5/.test(url)) return 'FILL_IN_THE_BLANK_FOR_PROGRAMMING';
  return 'FILL_IN_THE_BLANK';
}
```

- [ ] **Step 3: 验证**

`grep -n "isTrueFalseQuestionPage\|isFillBlankQuestionPage\|getFillBlankProblemType" src/content-script.js` 应显示 3 个函数定义。

---

## Task 5: 添加判断题（/type/1）支持

**Files:**
- Modify: `src/content-script.js`

**注意：** 由于代码量大，本任务应使用 subagent 执行。subagent 需要读取参考项目的具体实现并复制到核心项目。

- [ ] **Step 1: 从参考项目复制 7 个判断题函数**

打开 `C:\Users\zhanglei\Desktop\有意思的小项目\pta\fuckpta-main\fuckpta-main\src\content-script.js`，找到以下函数（参考项目中的行号）：
- `fetchTrueFalseQuestions()` (第 1178 行)
- `createTrueFalseQuestionHTML()` 
- `renderTrueFalseList()`
- `initTrueFalseQuestionEvents()`
- `batchProcessTrueFalseQuestions()` (第 2678 行)
- `fillTrueFalseAnswersToPage()` (第 2793 行)

将以上 6 个函数完整复制到核心项目的 `src/content-script.js` 中。建议插入位置：第 1100 行之后（fetchChoiceQuestions 之后）。

- [ ] **Step 2: 修改 3 个路由函数**

修改 `checkAutoPopup()` 函数（约第 401 行），在选择题分支之前增加判断题分支：
```javascript
if (isTrueFalse) {
  removeFloatingWindow();
  createFloatingWindow();
  setTimeout(() => {
    fetchTrueFalseQuestions();
  }, 100);
} else if (isChoice) {
  // ... 现有代码
}
```

修改 `createFloatingWindow()` 函数（约第 2195 行），在选择题 HTML 之前增加判断题 HTML：
```javascript
if (isTrueFalseQuestionPage()) {
  floatWindow.innerHTML = createTrueFalseQuestionHTML();
} else if (isChoiceQuestionPage()) {
  // ... 现有代码
}
```

修改 `initFloatingWindowEvents()` 函数（约第 2495 行），在选择题事件之前增加判断题事件：
```javascript
if (isTrueFalseQuestionPage()) {
  initTrueFalseQuestionEvents(floatWindow);
} else if (isChoiceQuestionPage()) {
  // ... 现有代码
}
```

- [ ] **Step 3: 验证语法**

打开 `src/content-script.js`，检查所有新代码的语法（括号、引号、函数名）。运行 `npm run build` 应能成功（但可能有 Vue 文件未改的提示）。

- [ ] **Step 4: 提交修改**

```bash
git add src/content-script.js
git commit -m "feat: 添加判断题（/type/1）支持"
```

---

## Task 6: 添加填空题（/type/4, /type/5）支持

**Files:**
- Modify: `src/content-script.js`

- [ ] **Step 1: 从参考项目复制填空题相关函数**

打开参考项目的 `src/content-script.js`，复制以下函数到核心项目：
- `getFillBlankDomQuestions()` (约第 1356 行)
- `waitForFillBlankDomQuestions()`
- `fetchFillBlankQuestions()` (第 1253 行)
- `batchProcessFillBlankQuestions()` (第 2910 行)
- `fillFillBlankAnswersToPage()`
- `renderFillBlankList()`
- `initFillBlankQuestionEvents()`
- `createFillBlankQuestionHTML()`
- `chooseFillBlankProblemContent()` (从 aiAnswerHelpers.js 复制到 content-script.js)
- `countBlanksFromContent()`
- `parseAIJsonArray()`
- `normalizeFillBlankAnswer()`
- `hasUsableFillBlankAnswer()`

插入位置：紧接判断题函数之后，约第 1100-1300 行。

- [ ] **Step 2: 修改 3 个路由函数**

按 Task 5 同样的方式，在以下函数中增加填空题分支：
- `checkAutoPopup()` - 在判断题之后、选择题之前增加 `isFillBlank` 分支
- `createFloatingWindow()` - 在判断题之后、选择题之前增加 `isFillBlank` 渲染分支
- `initFloatingWindowEvents()` - 在判断题之后、选择题之前增加 `isFillBlank` 事件分支

- [ ] **Step 3: 验证语法**

运行 `npm run build` 确保无编译错误。

- [ ] **Step 4: 提交修改**

```bash
git add src/content-script.js
git commit -m "feat: 添加普通填空和程序填空题（/type/4, /type/5）支持"
```

---

## Task 7: 添加选择题答案规范化函数

**Files:**
- Modify: `src/content-script.js`

- [ ] **Step 1: 定位选择题答案处理**

打开 `src/content-script.js`，找到 `batchProcessChoiceQuestions` 函数（约第 3100 行，参考项目）。

- [ ] **Step 2: 添加 normalizeChoiceAnswer 函数**

在 `batchProcessChoiceQuestions` 函数之前添加：
```javascript
function normalizeChoiceAnswer(answer) {
  const match = String(answer || '').trim().toUpperCase().match(/[A-Z]/);
  return match ? match[0] : '';
}
```

- [ ] **Step 3: 在答案解析处使用**

修改选择题答案解析逻辑，使用 `normalizeChoiceAnswer` 规范化每个答案（确保 A-Z 大写字母）。

- [ ] **Step 4: 提交修改**

```bash
git add src/content-script.js
git commit -m "feat: 添加选择题答案规范化函数"
```

---

## Task 8: 更新 ApiSourceManagement.vue 添加 4 个默认源

**Files:**
- Modify: `src/components/ApiSourceManagement.vue` (loadConfig 函数 else 分支, 第 117-142 行)

- [ ] **Step 1: 打开文件定位**

打开 `src/components/ApiSourceManagement.vue`，找到 `loadConfig()` 函数中的 `else` 分支（约第 117-142 行）。

- [ ] **Step 2: 替换默认源列表**

将第 117-142 行的 `config.value.apiSources = [...]` 数组替换为：
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

- [ ] **Step 3: 验证**

打开文件确认替换正确，4 个源都在。

---

## Task 9: 在 ApiSourceManagement.vue 中移除"添加自定义 API 源"按钮

**Files:**
- Modify: `src/components/ApiSourceManagement.vue`

- [ ] **Step 1: 定位"添加 API 源"按钮**

打开文件，找到"添加 API 源"按钮相关的代码（约在第 160-197 行的 `openAddModal`、`closeAddModal`、`addApiSource` 函数，以及模板中调用这些函数的按钮）。

- [ ] **Step 2: 评估保留或禁用**

如果用户的"API 源管理"页面有"添加 API 源"按钮：
- **方案 A（推荐）**：将按钮 `disabled` 或 `display: none`
- **方案 B**：将按钮文本改为"暂不支持添加"并禁用
- 保留 `addApiSource` 等函数代码以备未来扩展

- [ ] **Step 3: 应用方案 A**

在模板中，找到"添加 API 源"按钮的 HTML，添加 `style="display: none;"` 或 `v-if="false"`。

- [ ] **Step 4: 验证**

打开文件，确认按钮不可见（前端 UI 不显示）。

- [ ] **Step 5: 提交修改**

```bash
git add src/components/ApiSourceManagement.vue
git commit -m "feat: API 源管理扩展 4 个默认源，移除添加自定义源按钮"
```

---

## Task 10: 构建与基础验证

**Files:**
- Build: `dist/` (自动生成)

- [ ] **Step 1: 安装依赖**

```bash
cd "C:\Users\zhanglei\Desktop\fuckpta-main(1)\fuckpta-main"
npm install
```

- [ ] **Step 2: 运行生产构建**

```bash
npm run build
```

预期：
- 命令无错误退出
- 终端输出包含 `dist/` 目录生成信息
- 无 TypeScript/Vue 编译错误
- 终端可能显示警告（关于路由函数修改），但应无错误

- [ ] **Step 3: 检查 dist 输出**

```bash
ls -la dist/
```

预期：能看到 manifest.json、options.html、assets/ 等。

- [ ] **Step 4: 验证 dist 中包含 4 个默认源**

```bash
grep -c "deepseek-ai/DeepSeek-V3" dist/assets/*.js
grep -c "token-plan-cn.xiaomimimo.com" dist/assets/*.js
grep -c "api.minimaxi.com" dist/assets/*.js
grep -c "qwen3-max" dist/assets/*.js
```

预期：每个命令至少输出 1。

- [ ] **Step 5: 验证 4 个 host_permissions 已构建到 manifest**

```bash
cat dist/manifest.json
```

预期：host_permissions 包含 4 个新 API 域名。

---

## Task 11: 手动测试所有 10 个场景

**说明：** 由于这是 Chrome 扩展（无自动化测试基础设施），所有测试场景需要手动验证。

- [ ] **Step 1: 场景 1 — 构建无错误**

确认 Task 10 的 build 命令无错误。

- [ ] **Step 2: 场景 2 — 4 个默认源显示**

操作：
1. Chrome 扩展管理页面 `chrome://extensions/`
2. 找到 fuckpta 扩展，点击「移除」按钮卸载
3. 重新点击「加载已解压的扩展程序」→ 选择 `dist/` 目录
4. 打开扩展 options 页面
5. 切换到「API 源」tab

预期：看到 4 个默认源：硅基流动、阿里云百炼、小米 MiMo、MiniMax-M3。

- [ ] **Step 3: 场景 3 — 判断题**

操作：访问 PTA 判断题页面（URL 含 `/type/1`）。

预期：
- 浮窗出现，列出所有判断题
- 点击「获取答案」后 AI 返回 T/F
- 填入页面成功

- [ ] **Step 4: 场景 4 — 普通填空题**

操作：访问 PTA 填空题页面（URL 含 `/type/4`）。

预期：
- 浮窗出现，列出填空题
- AI 返回答案
- 填入输入框成功

- [ ] **Step 5: 场景 5 — 程序填空题**

操作：访问 PTA 程序填空题页面（URL 含 `/type/5`）。

预期：
- 浮窗出现
- AI 正确识别程序填空模板（"X 分" 标记）
- 返回答案
- 填入输入框成功

- [ ] **Step 6: 场景 6 — 编程题回归**

操作：访问 PTA 编程题（/type/7），测试一道编程题。

预期：
- 编程题作答正常
- 答题速度与改造前一致
- 简单路径（simpleStream/simpleGenerate）正常工作

- [ ] **Step 7: 场景 7 — 函数题回归**

操作：访问 PTA 函数题（/type/6），测试一道函数题。

预期：函数题作答正常。

- [ ] **Step 8: 场景 8 — 选择题回归**

操作：访问 PTA 选择题（/type/2），测试一组选择题。

预期：选择题作答正常。

- [ ] **Step 9: 场景 9 — 4 个 API 源可用**

操作：分别填入 4 个 API 源的 key（每个源一个），测试 AI 调用。

预期：
- 4 个源都能成功调用 AI
- 无 CORS 错误
- 硅基流动/阿里云/小米 MiMo/MiniMax 都能返回答案

- [ ] **Step 10: 场景 10 — 移除的适配器不再可用**

操作：查看 API 源管理页面，检查是否还有"添加自定义 API 源"按钮。

预期：按钮不可见或被禁用（只能看到 4 个默认源）。

---

## Self-Review Checklist

完成后请验证：

- [ ] 4 个默认源都成功显示在「API 源」管理中
- [ ] 3 种新题型（判断题、普通填空、程序填空）浮窗正常出现
- [ ] 6 个非默认源适配器已完全移除
- [ ] manifest.json 包含 4 个新 host_permissions
- [ ] content-script.js 的 AI 答题速度与改造前一致
- [ ] 4 个 API 源都能成功调用 AI
- [ ] 构建无错误

## 风险评估

- **改动文件数：** 3 个
- **新增代码行数：** ~1100 行
- **删除代码行数：** ~800 行
- **修改代码行数：** ~30 行
- **触及 AI 答题速度：** 0 处（保留 simple* 快路径）
- **风险等级：** 中（移植代码量大、需要详细测试）

## 完成标准

✅ Task 1-9 完成后：所有代码改动完成
✅ Task 10 完成后：构建无错误
✅ Task 11 完成后：所有 10 个测试场景通过

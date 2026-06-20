<script setup>
import { ref } from 'vue';
import { buildOpenAICompatibleChatBody, getAIRequestTimeoutMs } from '../utils/aiAnswerHelpers.js';
const props = defineProps({
 model: {
 type: String,
 required: true
 },
 apiKey: {
 type: String,
 required: true
 },
 apiUrl: {
 type: String,
 required: true
 }
});
const emit = defineEmits(['close']);
const messages = ref([
 {
 role: 'assistant',
 content: '您好！我是AI助手，请问有什么可以帮您的？',
 isLoading: false
 }
]);
const inputMessage = ref('');
const isSending = ref(false);
function sendExtensionMessage(message) {
 return new Promise((resolve, reject) => {
 chrome.runtime.sendMessage(message, (response) => {
 if (chrome.runtime.lastError) {
 reject(new Error(chrome.runtime.lastError.message));
 return;
 }
 resolve(response);
 });
 });
}
async function sendMessage() {
 if (!inputMessage.value.trim() || isSending.value)
 return;
 const userMessage = inputMessage.value.trim();
 inputMessage.value = '';
 // 添加用户消息
 messages.value.push({
 role: 'user',
 content: userMessage,
 isLoading: false
 });
 // 添加加载中的助手消息
 messages.value.push({
 role: 'assistant',
 content: '',
 isLoading: true
 });
 try {
 isSending.value = true;
 // 构建请求
 const requestBody = buildOpenAICompatibleChatBody(props.model, [
 { role: 'user', content: userMessage }
 ], false, { apiUrl: props.apiUrl });
 // 发送请求
 const response = await sendExtensionMessage({
 action: 'aiFetch',
 apiUrl: props.apiUrl,
 endpoint: 'chat/completions',
 openAICompatible: true,
 method: 'POST',
 timeoutMs: getAIRequestTimeoutMs({ reasoning: true }),
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${props.apiKey}`
 },
 body: requestBody
 });
 const lastMessage = messages.value[messages.value.length - 1];
 lastMessage.isLoading = false;
 if (!response?.success) {
 throw new Error(response?.error || '请求失败');
 }
 if (!response.ok) {
 const error = response.data?.error?.message || response.data?.message || `HTTP error! status: ${response.status}`;
 throw new Error(error);
 }
 lastMessage.content = response.data?.choices?.[0]?.message?.content || response.data?.choices?.[0]?.text || '';
 }
 catch (error) {
 console.error('发送消息失败:', error);
 const lastMessage = messages.value[messages.value.length - 1];
 lastMessage.isLoading = false;
 lastMessage.content = `发送失败: ${error.message}`;
 }
 finally {
 isSending.value = false;
 }
}
function handleKeydown(event) {
 if (event.key === 'Enter' && !event.shiftKey) {
 event.preventDefault();
 sendMessage();
 }
}
function closeModal() {
 emit('close');
}
</script>

<template>
  <div class="chat-test-modal">
    <div class="modal-header">
      <h3 class="modal-title">对话测试 - {{ model }}</h3>
      <button class="close-btn" @click="closeModal">×</button>
    </div>
    
    <div class="chat-container">
      <div class="messages">
        <div 
          v-for="(message, index) in messages" 
          :key="index"
          :class="['message', message.role]"
        >
          <div class="message-content">
            <span v-if="message.isLoading" class="loading">
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
            </span>
            <span v-else>{{ message.content }}</span>
          </div>
        </div>
      </div>
      
      <div class="input-area">
        <textarea
          v-model="inputMessage"
          @keydown="handleKeydown"
          placeholder="输入消息，按 Enter 发送..."
          class="message-input"
          :disabled="isSending"
        ></textarea>
        <button 
          @click="sendMessage" 
          class="send-btn"
          :disabled="isSending"
        >
          {{ isSending ? '发送中...' : '发送' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-test-modal {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e8e8e8;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background-color: #e8e8e8;
  color: #666;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: #d9d9d9;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 18px;
}

.message.user {
  align-self: flex-end;
  background-color: #32F08C;
  color: #fff;
}

.message.assistant {
  align-self: flex-start;
  background-color: #f0f0f0;
  color: #333;
}

.message-content {
  font-size: 14px;
  line-height: 1.5;
}

.loading {
  display: flex;
  gap: 4px;
}

.loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #999;
  animation: loading 1.4s infinite ease-in-out;
}

.loading-dot:nth-child(1) { animation-delay: 0s; }
.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes loading {
  0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.input-area {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #e8e8e8;
  background-color: #fafafa;
}

.message-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
}

.message-input:focus {
  border-color: #32F08C;
}

.message-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.send-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background-color: #32F08C;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  background-color: #2ad87d;
}

.send-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>

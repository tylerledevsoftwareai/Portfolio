// Tyler AI Interactive n8n Agentic Workflow Engine
document.addEventListener('DOMContentLoaded', () => {
  const WORKFLOWS = {
    interview: 'https://opacity-referee-thirty.ngrok-free.dev/webhook/tyler-le-interview-prep/chat',
    professional: 'https://opacity-referee-thirty.ngrok-free.dev/webhook/109f5b2a-50c4-4e63-b1d8-eeb1472e74c5/chat'
  };

  let sessionId = 'tylerai-session-' + Date.now();

  function parseMarkdown(md) {
    if (!md) return '';
    let html = md
      // Normalize excessive consecutive line breaks to max 2
      .replace(/\n{3,}/g, '\n\n')
      // Escape unsafe HTML characters
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers (#### Header, ### Header, ## Header, # Header)
      .replace(/^#### (.*$)/gim, '<h4 class="tylerai-heading">$1</h4>')
      .replace(/^### (.*$)/gim, '<h4 class="tylerai-heading">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 class="tylerai-heading">$1</h3>')
      .replace(/^# (.*$)/gim, '<h2 class="tylerai-heading">$1</h2>')
      // Horizontal Rules (*** or ---)
      .replace(/^\*{3,}$/gim, '<hr class="tylerai-hr" />')
      .replace(/^-{3,}$/gim, '<hr class="tylerai-hr" />')
      // Bold (**text**)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic (*text*)
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Markdown links [text](url)
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="tylerai-link">$1 &nearr;</a>')
      // Bullet items (* item or - item)
      .replace(/^\s*[\*\-]\s+(.*$)/gim, '<li class="tylerai-bullet">$1</li>')
      // Wrap consecutive <li> tags into <ul>
      .replace(/(<li class="tylerai-bullet">.*<\/li>\n?)+/g, '<ul class="tylerai-list">$&</ul>')
      // Paragraph line breaks
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');

    return html;
  }

  function initChatbotInstance(options) {
    const { chatLogId, chatInputId, sendBtnId, modeSelectId, statusBoxId } = options;

    const chatLog = document.getElementById(chatLogId);
    const chatInput = document.getElementById(chatInputId);
    const sendBtn = document.getElementById(sendBtnId);
    const modeSelect = document.getElementById(modeSelectId);
    const statusBox = statusBoxId ? document.getElementById(statusBoxId) : null;

    if (!chatInput || !sendBtn) return;

    function appendMessage(text, sender) {
      if (!chatLog) return null;
      const bubble = document.createElement('div');
      bubble.className = `tylerai-msg ${sender}`;
      if (sender === 'ai') {
        bubble.innerHTML = parseMarkdown(text);
      } else {
        bubble.textContent = text;
      }
      chatLog.appendChild(bubble);
      chatLog.scrollTop = chatLog.scrollHeight;
      return bubble;
    }

    async function sendMessage() {
      const text = chatInput.value.trim();
      if (!text) return;

      appendMessage(text, 'user');
      chatInput.value = '';

      const selectedMode = modeSelect ? modeSelect.value : 'professional';
      const targetUrl = WORKFLOWS[selectedMode] || WORKFLOWS.professional;
      const modeLabel = selectedMode === 'interview' ? 'Interview Prep' : 'Professional Assistant';

      if (statusBox) {
        statusBox.innerHTML = `<span><span class="som-loading-spinner"></span> Connecting to ${modeLabel} n8n Agent...</span>`;
      }

      const typingBubble = appendMessage('🤖 Thinking...', 'ai');

      try {
        const payload = {
          chatInput: text,
          action: 'sendMessage',
          sessionId: sessionId
        };

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`n8n webhook returned status ${response.status}`);
        }

        const data = await response.json();
        let replyText = '';

        if (typeof data === 'string') {
          replyText = data;
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data) && data[0]) {
            replyText = data[0].output || data[0].text || data[0].message || JSON.stringify(data[0]);
          } else {
            replyText = data.output || data.text || data.message || JSON.stringify(data);
          }
        }

        if (replyText === 'Workflow was started' || !replyText) {
          replyText = 'Response processed successfully.';
        }

        if (typingBubble) typingBubble.remove();
        appendMessage(replyText, 'ai');

        if (statusBox) {
          statusBox.innerHTML = `<span style="color:#34D399;">✓ Response received from ${modeLabel} n8n Agent.</span>`;
        }
      } catch (err) {
        console.error('Tyler AI Connection Error:', err);
        if (typingBubble) typingBubble.remove();
        appendMessage('⚠️ Unable to connect to n8n webhook endpoint. Please verify ngrok tunnel status.', 'ai');
        if (statusBox) {
          statusBox.innerHTML = `<span style="color:#ef4444;">Webhook endpoint offline or initializing... retry shortly.</span>`;
        }
      }
    }

    sendBtn.addEventListener('click', sendMessage);

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });

    if (modeSelect) {
      modeSelect.addEventListener('change', () => {
        sessionId = 'tylerai-session-' + Date.now();
        const modeLabel = modeSelect.value === 'interview' ? 'Interview Prep' : 'Professional Assistant';
        if (statusBox) {
          statusBox.innerHTML = `<span>Switched workflow mode to ${modeLabel}. New session initialized.</span>`;
        }
      });
    }
  }

  // Initialize Project 01 Chatbot Widget
  initChatbotInstance({
    chatLogId: 'tylerai-chat-log',
    chatInputId: 'tylerai-chat-input',
    sendBtnId: 'tylerai-send-btn',
    modeSelectId: 'tylerai-mode-select',
    statusBoxId: 'tylerai-status'
  });

  // Initialize Hero Top Chatbot Widget (Above Avatar)
  initChatbotInstance({
    chatLogId: 'hero-chat-log',
    chatInputId: 'hero-chat-input',
    sendBtnId: 'hero-send-btn',
    modeSelectId: 'hero-mode-select'
  });
});

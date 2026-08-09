/**
 * Unit tests for Tyler AI Interactive Widget & Serverless Proxy Route
 * Covers: assets/js/tylerai-widget.js and api/tylerai.js
 * @jest-environment jsdom
 */

const tyleraiProxyHandler = require('../api/tylerai.js').default || require('../api/tylerai.js');

describe('Tyler AI Frontend Widget & Serverless Proxy Suite', () => {
  let chatLog, chatInput, sendBtn, modeSelect, statusBox;
  let heroChatLog, heroChatInput, heroSendBtn;

  beforeEach(() => {
    document.body.innerHTML = `
      <!-- Hero Top Chatbot Widget -->
      <div id="hero-chat-log"></div>
      <input type="text" id="hero-chat-input" value="Tell me about your AI background" />
      <button id="hero-send-btn">Send</button>
      <select id="hero-mode-select">
        <option value="professional" selected>Professional Assistant</option>
        <option value="interview">Interview Prep</option>
      </select>

      <!-- Project 01 Chatbot Widget -->
      <div id="tylerai-chat-log"></div>
      <input type="text" id="tylerai-chat-input" value="Tell me about your RAG architecture experience" />
      <button id="tylerai-send-btn">Send</button>
      <select id="tylerai-mode-select">
        <option value="professional" selected>Professional Assistant</option>
        <option value="interview">Interview Prep</option>
      </select>
      <div id="tylerai-status"></div>
    `;

    chatLog = document.getElementById('tylerai-chat-log');
    chatInput = document.getElementById('tylerai-chat-input');
    sendBtn = document.getElementById('tylerai-send-btn');
    modeSelect = document.getElementById('tylerai-mode-select');
    statusBox = document.getElementById('tylerai-status');

    heroChatLog = document.getElementById('hero-chat-log');
    heroChatInput = document.getElementById('hero-chat-input');
    heroSendBtn = document.getElementById('hero-send-btn');

    global.fetch = jest.fn();
    require('../assets/js/tylerai-widget.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  describe('Frontend Widget Engine (assets/js/tylerai-widget.js)', () => {
    test('should render STAR narrative markdown headers (####), bold text, and linebreaks cleanly', async () => {
      const starNarrativeSample = `
#### Situation
While working at Ausbiz Consulting, we relied on a single-source RAG pipeline.

#### Task
My task was to stabilize the architecture to eliminate production downtime.

#### Action
I architected and deployed a multi-tier fallback RAG system using **MCP server**.

#### Result
We reduced production downtime by **40%** and achieved an **80% RAGAS faithfulness score**.
***
* **Email:** tyler.le.dev.software.ai@gmail.com
* **LinkedIn:** [linkedin.com/in/tyler-le-dev-software-ai/](https://www.linkedin.com/in/tyler-le-dev-software-ai/)
      `;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: starNarrativeSample })
      });

      sendBtn.click();
      await new Promise(process.nextTick);

      const messages = chatLog.querySelectorAll('.tylerai-msg');
      const aiBubble = messages[1];

      expect(aiBubble.innerHTML).toContain('<h4 class="tylerai-heading">Situation</h4>');
      expect(aiBubble.innerHTML).toContain('<h4 class="tylerai-heading">Task</h4>');
      expect(aiBubble.innerHTML).toContain('<h4 class="tylerai-heading">Action</h4>');
      expect(aiBubble.innerHTML).toContain('<h4 class="tylerai-heading">Result</h4>');
      expect(aiBubble.innerHTML).toContain('<strong>MCP server</strong>');
      expect(aiBubble.innerHTML).toContain('<strong>40%</strong>');
      expect(aiBubble.innerHTML).toContain('<hr class="tylerai-hr">');
      expect(aiBubble.innerHTML).toContain('class="tylerai-link"');
    });

    test('should send message from Hero Top Chatbot widget above avatar', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: 'Hero chatbot answer.' })
      });

      heroSendBtn.click();
      await new Promise(process.nextTick);

      const messages = heroChatLog.querySelectorAll('.tylerai-msg');
      expect(messages.length).toBe(2);
      expect(messages[0].textContent).toBe('Tell me about your AI background');
      expect(messages[1].innerHTML).toContain('Hero chatbot answer.');
    });

    test('should trigger sendMessage on Enter keydown in chatInput', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: 'Enter key response.' })
      });

      chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await new Promise(process.nextTick);

      const messages = chatLog.querySelectorAll('.tylerai-msg');
      expect(messages.length).toBe(2);
      expect(messages[1].innerHTML).toContain('Enter key response.');
    });

    test('should ignore empty or whitespace-only chat input', () => {
      chatInput.value = '   ';
      sendBtn.click();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should handle array structured responses from n8n webhooks', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ text: 'Array format output text.' }])
      });

      sendBtn.click();
      await new Promise(process.nextTick);

      const messages = chatLog.querySelectorAll('.tylerai-msg');
      expect(messages[1].innerHTML).toContain('Array format output text.');
    });

    test('should switch webhook URL when workflow mode is changed to interview', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: 'Interview Prep response.' })
      });

      modeSelect.value = 'interview';
      modeSelect.dispatchEvent(new Event('change'));

      expect(statusBox.textContent).toContain('Switched workflow mode to Interview Prep');

      sendBtn.click();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://opacity-referee-thirty.ngrok-free.dev/webhook/tyler-le-interview-prep/chat',
        expect.anything()
      );
    });

    test('should handle network connection error gracefully with status notice', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch.mockRejectedValueOnce(new Error('Network offline'));

      sendBtn.click();
      await new Promise(process.nextTick);

      const messages = chatLog.querySelectorAll('.tylerai-msg');
      expect(messages[1].textContent).toContain('Unable to connect to n8n webhook');
      expect(statusBox.textContent).toContain('retry shortly');
      consoleSpy.mockRestore();
    });
  });

  describe('Serverless Proxy Route (api/tylerai.js)', () => {
    let mockReq, mockRes;

    beforeEach(() => {
      mockReq = {
        method: 'POST',
        body: {
          mode: 'professional',
          chatInput: 'How do you handle microservices architecture?',
          sessionId: 'test-session-123'
        }
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    test('should reject GET requests with HTTP 405 Method Not Allowed', async () => {
      mockReq.method = 'GET';
      await tyleraiProxyHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });

    test('should forward request to professional webhook URL by default', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ output: 'Serverless proxy response' })
      });

      await tyleraiProxyHandler(mockReq, mockRes);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://opacity-referee-thirty.ngrok-free.dev/webhook/109f5b2a-50c4-4e63-b1d8-eeb1472e74c5/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }),
          body: JSON.stringify({
            chatInput: 'How do you handle microservices architecture?',
            action: 'sendMessage',
            sessionId: 'test-session-123'
          })
        })
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ output: 'Serverless proxy response' });
    });

    test('should forward request to interview webhook URL when mode is interview', async () => {
      mockReq.body.mode = 'interview';

      global.fetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ output: 'Interview response' })
      });

      await tyleraiProxyHandler(mockReq, mockRes);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://opacity-referee-thirty.ngrok-free.dev/webhook/tyler-le-interview-prep/chat',
        expect.anything()
      );
    });

    test('should return 500 error when fetch proxy request fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Connection timeout'));

      await tyleraiProxyHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Proxy request to n8n webhook failed',
        details: 'Connection timeout'
      });
    });
  });
});

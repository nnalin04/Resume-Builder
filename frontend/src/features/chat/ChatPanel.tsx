import type { RefObject } from 'react';


interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface ChatPanelProps {
  chatOpen: boolean;
  setChatOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  isChatLoading: boolean;
  chatEndRef: RefObject<HTMLDivElement | null>;
  handleChatSend: () => Promise<void>;
}

export default function ChatPanel({
  chatOpen,
  setChatOpen,
  chatMessages,
  chatInput,
  setChatInput,
  isChatLoading,
  chatEndRef,
  handleChatSend,
}: ChatPanelProps) {
  return (
    <div style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', position: 'sticky', bottom: 0 }}>
      <button
        onClick={() => setChatOpen((prev) => !prev)}
        style={{
          width: '100%',
          padding: '10px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          fontWeight: 700,
          color: '#6366f1',
        }}
      >
        <span>AI Coach</span>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{chatOpen ? '▲ hide' : '▼ open'}</span>
      </button>

      {chatOpen && (
        <div style={{ borderTop: '1px solid #e2e8f0' }}>
          <div style={{ height: 260, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chatMessages.length === 0 && (
              <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 60 }}>
                Ask me anything about your resume.
                <br />
                "Improve my summary", "What keywords am I missing?"
              </div>
            )}
            {chatMessages.map((message, index) => (
              <div
                key={index}
                style={{
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: message.role === 'user' ? '#ede9fe' : '#fff',
                  border: message.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                  borderRadius: 10,
                  padding: '7px 11px',
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: '#1e293b',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {message.text}
              </div>
            ))}
            {isChatLoading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '7px 14px',
                  fontSize: 12,
                  color: '#94a3b8',
                }}
              >
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ display: 'flex', gap: 8, padding: '8px 12px 12px', borderTop: '1px solid #e2e8f0' }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleChatSend();
                }
              }}
              placeholder="Ask your AI coach..."
              style={{
                flex: 1,
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 13,
                outline: 'none',
                background: '#fff',
              }}
            />
            <button
              onClick={() => void handleChatSend()}
              disabled={isChatLoading || !chatInput.trim()}
              style={{
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: isChatLoading || !chatInput.trim() ? 0.5 : 1,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

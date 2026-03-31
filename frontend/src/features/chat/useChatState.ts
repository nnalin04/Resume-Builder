import { useRef, useState } from 'react';

import { api } from '../../api/client';


type ToastType = 'error' | 'success' | 'info';

interface ResumeSummaryState {
  summary: string;
  experiences: { id: string }[];
}

interface UseChatStateArgs {
  backendResumeId: number | null;
  jobDescription: string;
  resumeData: ResumeSummaryState;
  addToast: (message: string, type?: ToastType) => void;
}

export function useChatState({ backendResumeId, jobDescription, resumeData, addToast }: UseChatStateArgs) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleChatSend = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);
    try {
      let reply: string;
      if (backendResumeId) {
        const res = await api.chat(backendResumeId, userMsg, jobDescription);
        reply = res.reply;
      } else {
        const res = await api.rewriteText(
          resumeData.summary,
          userMsg,
          `Resume has ${resumeData.experiences.length} experience(s). Job description: ${jobDescription.slice(0, 300)}`,
        );
        reply = res.result || 'Please import a PDF resume for full coaching support.';
      }
      setChatMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      addToast('Chat failed', 'error');
    } finally {
      setIsChatLoading(false);
    }
  };

  return {
    chatOpen,
    setChatOpen,
    chatMessages,
    chatInput,
    setChatInput,
    isChatLoading,
    chatEndRef,
    handleChatSend,
  };
}

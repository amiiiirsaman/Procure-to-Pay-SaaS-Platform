import React, { useState } from 'react';
import { MessageSquare, Send, Loader2, Sparkles } from 'lucide-react';

interface ChatbotProps {
  onFieldsFilled: (fields: Record<string, any>) => void;
  disabled?: boolean;
}

export const RequisitionChatbot: React.FC<ChatbotProps> = ({ onFieldsFilled, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { 
      role: 'assistant', 
      content: 'Hi! Tell me what you need to purchase, and I\'ll help fill out the requisition form. For example: "I need 10 Dell laptops for the IT department, urgent delivery by next week"' 
    }
  ]);

  const handleSend = async () => {
    if (!chatInput.trim() || loading) return;

    const userMessage = chatInput.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setLoading(true);

    try {
      console.log('[CHATBOT] Sending message to Bedrock-powered API:', userMessage);
      
      const response = await fetch('/api/v1/requisitions/chat-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CHATBOT] API error:', response.status, errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[CHATBOT] Received parsed data:', data);
      
      // Send parsed fields back to parent form
      if (data.fields && Object.keys(data.fields).length > 0) {
        onFieldsFilled(data.fields);
      }

      // Show assistant response with parsing method info
      const parsingInfo = data.parsing_method === 'llm' 
        ? '🤖 Analyzed with AWS Bedrock Nova Pro' 
        : '📝 Parsed with pattern matching';
      const assistantMsg = `${data.message}\n\n${parsingInfo}`;
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMsg }]);

      // Auto-close chatbot after successful parse (if we got meaningful fields)
      if (data.field_count >= 3) {
        setTimeout(() => setIsOpen(false), 2500);
      }

    } catch (err) {
      console.error('[CHATBOT] Error:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I had trouble processing that request. The AI service might be temporarily unavailable. Please try again or fill the form manually.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed z-50"
        title="AI Assistant"
      >
        <div className="relative">
          <MessageSquare size={24} />
          <Sparkles size={12} className="absolute -top-1 -right-1 text-yellow-300" />
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} />
          <span className="font-semibold">AI Requisition Assistant</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20 rounded p-1 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-3 max-h-96 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 p-3 rounded-lg rounded-bl-none flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Analyzing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Describe what you need..."
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!chatInput.trim() || loading}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Tip: Be specific about quantities, departments, suppliers, and dates
        </p>
      </div>
    </div>
  );
};

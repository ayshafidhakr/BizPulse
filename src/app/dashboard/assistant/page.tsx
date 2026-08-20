"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
    role: "user" | "assistant";
    content: string;
}

const suggestions = [
    "How much did I earn today?",
    "Which product sells the most?",
    "Who owes me money?",
    "What items are low on stock?",
    "What's my total profit?",
    "How many sales did I make this week?",
    "Which customer has the highest pending credit?",
    "What's my best performing product?",
];

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    onstart: () => void;
    onend: () => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: () => void;
    start: () => void;
}

interface SpeechRecognitionConstructor {
    new(): SpeechRecognitionInstance;
}

interface WindowWithSpeechRecognition extends Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export default function AssistantPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content:
                "Hi! I'm your **BizPulse AI assistant** 👋\n\nAsk me anything about your business — sales, inventory, credit, profits, or anything else!",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [listening, setListening] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    function handleVoice() {
        const speechWindow = window as WindowWithSpeechRecognition;

        const SpeechRecognition =
            speechWindow.SpeechRecognition ||
            speechWindow.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert("Voice input is not supported in your browser. Try Chrome.");
            return;
        }

        const recognition = new SpeechRecognition();

        recognition.lang = "en-IN";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setListening(true);
        recognition.onend = () => setListening(false);

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
        };

        recognition.onerror = () => setListening(false);
        recognition.start();
    }

    async function handleSend(question?: string) {
        const q = question ?? input.trim();
        if (!q || loading) return;

        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: q }]);
        setLoading(true);

        try {
            const res = await fetch("/api/assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: q }),
            });

            const data = await res.json();

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: data.answer ?? "Sorry, I couldn't get an answer.",
                },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, something went wrong. Please try again.",
                },
            ]);
        }

        setLoading(false);
    }

    return (
        <div className="flex flex-col h-screen max-h-screen">
            {/* Header */}
            <div className="px-8 py-5 border-b border-gray-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center text-xl">
                    🤖
                </div>
                <div>
                    <h1 className="text-xl font-bold">AI Business Assistant</h1>
                    <p className="text-gray-400 text-sm">
                        Powered by real data from your business
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-4">

                {/* Suggestion chips */}
                {messages.length === 1 && (
                    <div className="flex flex-col gap-3">
                        <p className="text-gray-500 text-sm">Try asking:</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => handleSend(s)}
                                    className="text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-emerald-700 text-gray-300 hover:text-white px-4 py-2 rounded-xl transition"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chat messages */}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        {/* Avatar for assistant */}
                        {msg.role === "assistant" && (
                            <div className="w-8 h-8 rounded-lg bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                                🤖
                            </div>
                        )}

                        <div
                            className={`max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed
                ${msg.role === "user"
                                    ? "bg-emerald-600 text-white rounded-br-sm"
                                    : "bg-gray-900 border border-gray-800 text-gray-200 rounded-bl-sm"
                                }`}
                        >
                            {msg.role === "assistant" ? (
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => (
                                            <p className="mb-2 last:mb-0">{children}</p>
                                        ),
                                        strong: ({ children }) => (
                                            <strong className="text-emerald-400 font-semibold">
                                                {children}
                                            </strong>
                                        ),
                                        ul: ({ children }) => (
                                            <ul className="list-none flex flex-col gap-1 mt-1">
                                                {children}
                                            </ul>
                                        ),
                                        li: ({ children }) => (
                                            <li className="flex items-start gap-2">
                                                <span className="text-emerald-500 mt-0.5">•</span>
                                                <span>{children}</span>
                                            </li>
                                        ),
                                        h3: ({ children }) => (
                                            <h3 className="text-white font-bold text-sm mb-1 mt-2">
                                                {children}
                                            </h3>
                                        ),
                                        code: ({ children }) => (
                                            <code className="bg-gray-800 text-emerald-300 px-1.5 py-0.5 rounded text-xs">
                                                {children}
                                            </code>
                                        ),
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            ) : (
                                msg.content
                            )}
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                    <div className="flex justify-start items-end gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center text-sm flex-shrink-0">
                            🤖
                        </div>
                        <div className="bg-gray-900 border border-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                            <div className="flex gap-1">
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"
                                        style={{ animationDelay: `${i * 0.15}s` }}
                                    />
                                ))}
                            </div>
                            <span className="text-gray-500 text-xs">Thinking...</span>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-8 py-5 border-t border-gray-800">
                <div className="flex gap-3 items-center bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 focus-within:border-emerald-600 transition">

                    {/* Mic Button */}
                    <button
                        onClick={handleVoice}
                        disabled={loading}
                        className={`p-2 rounded-xl transition flex-shrink-0
              ${listening
                                ? "bg-red-600 animate-pulse text-white"
                                : "bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
                            }`}
                        title={listening ? "Listening..." : "Click to speak"}
                    >
                        {listening ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z" />
                            </svg>
                        )}
                    </button>

                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder={
                            listening
                                ? "Listening... speak now 🎙️"
                                : "Ask anything or click mic to speak..."
                        }
                        className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
                        disabled={loading}
                    />

                    <button
                        onClick={() => handleSend()}
                        disabled={loading || !input.trim()}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
                    >
                        Send →
                    </button>
                </div>

                {/* Status */}
                <div className="flex items-center justify-center mt-2 gap-2 h-5">
                    {listening ? (
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="w-1 h-4 bg-red-500 rounded-full animate-bounce"
                                        style={{ animationDelay: `${i * 0.15}s` }}
                                    />
                                ))}
                            </div>
                            <p className="text-red-400 text-xs font-medium">
                                Listening... speak your question
                            </p>
                        </div>
                    ) : (
                        <p className="text-gray-600 text-xs">
                            AI answers are based on your actual business data
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
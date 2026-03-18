import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Chatbot.css';

const GREETING = "Hi! I'm your FoodFreaky assistant. I can help you with:\n• Your order history & details\n• Current/latest order\n• Order status & tracking\n• Total spent & order count\n\nType 'help' anytime for options.";

const matches = (text, keywords) => keywords.some(kw => text.includes(kw));

const Chatbot = () => {
    const { authToken, isLoggedIn } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', text: GREETING, timestamp: new Date() }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [lastOrderRef, setLastOrderRef] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchOrders = async () => {
        try {
            const { data } = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/orders/myorders?limit=20`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            return data.data || [];
        } catch (err) {
            console.error('Failed to fetch orders:', err);
            return [];
        }
    };

    const formatOrderSummary = (order, includeTip = false) => {
        const items = (order.items || []).slice(0, 3).map(i => `${i.name} (x${i.quantity})`).join(', ');
        const more = (order.items?.length || 0) > 3 ? ` +${order.items.length - 3} more` : '';
        let text = `Order #${order._id?.substring(0, 8)}\n• Restaurant: ${order.restaurant?.name || 'N/A'}\n• Items: ${items}${more}\n• Total: ₹${order.totalPrice?.toFixed(2) || '0'}\n• Status: ${order.status}\n• Date: ${new Date(order.createdAt).toLocaleString()}`;
        if (includeTip && order.status === 'Out for Delivery') {
            text += '\n\n📍 You can track it live from your Dashboard!';
        }
        return text;
    };

    const processMessage = async (userMessage) => {
        const lower = userMessage.toLowerCase().trim();

        if (!isLoggedIn || !authToken) {
            return "Please log in to view your orders. You can log in from the top menu.";
        }

        if (matches(lower, ['help', 'what can you do', 'options', 'commands']) || ['hi', 'hello', 'hey', 'hola'].includes(lower)) {
            return GREETING;
        }
        if (['thanks', 'thank you', 'thx', 'ok', 'okay', 'got it'].includes(lower)) {
            return "You're welcome! Ask me anything about your orders. 😊";
        }

        const orders = await fetchOrders();

        if (matches(lower, ['order history', 'my orders', 'all orders', 'past orders', 'previous orders', 'list orders', 'show orders', 'order list'])) {
            if (orders.length === 0) {
                return "You don't have any orders yet. Browse our restaurants and place your first order! 🍕";
            }
            let text = `You have ${orders.length} order(s):\n\n`;
            orders.slice(0, 6).forEach((o, i) => {
                text += `${i + 1}. Order #${o._id?.substring(0, 8)} - ${o.restaurant?.name || 'Restaurant'} - ${o.status} - ₹${o.totalPrice?.toFixed(2)}\n`;
            });
            if (orders.length > 6) {
                text += `\n...and ${orders.length - 6} more. Ask "details of order 2" for more info on any order.`;
            } else {
                text += `\nAsk "details of order 2" (or 1, 3...) for full details.`;
            }
            return text;
        }

        if (matches(lower, ['current', 'latest', 'last order', 'recent order', 'most recent', 'newest order', 'last one'])) {
            if (orders.length === 0) return "You don't have any orders yet.";
            const latest = orders[0];
            setLastOrderRef(latest);
            return `Here's your latest order:\n\n${formatOrderSummary(latest, true)}`;
        }

        if (matches(lower, ['status', 'track', 'where', 'delivery', 'on the way', 'when will it arrive', 'eta', 'active order'])) {
            const activeOrders = orders.filter(o =>
                ['Waiting for Acceptance', 'Accepted', 'Preparing Food', 'Out for Delivery'].includes(o.status)
            );
            if (activeOrders.length === 0) {
                return orders.length > 0
                    ? "You have no active orders right now. Your last order was delivered. ✅"
                    : "You don't have any orders yet.";
            }
            let text = "Your active order(s):\n\n";
            activeOrders.forEach((o, i) => {
                const trackHint = o.status === 'Out for Delivery' ? ' — Track live on Dashboard!' : '';
                text += `${i + 1}. Order #${o._id?.substring(0, 8)} - ${o.status}${trackHint}\n   Restaurant: ${o.restaurant?.name}\n`;
            });
            return text;
        }

        if (matches(lower, ['total spent', 'how much spent', 'money spent', 'total money', 'spending', 'how much i spent'])) {
            const delivered = orders.filter(o => o.status === 'Delivered');
            const total = delivered.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
            if (delivered.length === 0) {
                return orders.length > 0
                    ? "None of your orders have been delivered yet. Total spent will show once orders are completed."
                    : "You haven't placed any orders yet.";
            }
            return `You've completed ${delivered.length} order(s) and spent ₹${total.toFixed(2)} in total. 🎉`;
        }

        if (matches(lower, ['how many orders', 'order count', 'number of orders', 'total orders'])) {
            if (orders.length === 0) return "You have 0 orders.";
            const delivered = orders.filter(o => o.status === 'Delivered').length;
            return `You have ${orders.length} order(s) in total. ${delivered} delivered, ${orders.length - delivered} in progress or cancelled.`;
        }

        const ordinals = { first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4, '4th': 4, fifth: 5, '5th': 5 };
        let orderNum = null;
        const numMatch = lower.match(/(?:order\s*)?#?\s*(\d+)|details?\s*(?:of|for)?\s*(?:the\s*)?(?:order\s*)?(\d+)/i);
        if (numMatch) {
            orderNum = parseInt(numMatch[1] || numMatch[2] || '1', 10);
        } else {
            for (const [word, n] of Object.entries(ordinals)) {
                if (lower.includes(word + ' order') || lower.includes('order ' + word)) {
                    orderNum = n;
                    break;
                }
            }
        }
        if (orderNum != null) {
            const idx = orderNum === 0 ? 0 : orderNum - 1;
            if (orders[idx]) {
                setLastOrderRef(orders[idx]);
                return formatOrderSummary(orders[idx], true);
            }
        }

        const orderIdMatch = lower.match(/order\s*(#)?\s*([a-f0-9]{6,12})/i);
        if (orderIdMatch) {
            const shortId = orderIdMatch[2];
            const order = orders.find(o => o._id?.toLowerCase().startsWith(shortId) || o._id?.includes(shortId));
            if (order) {
                setLastOrderRef(order);
                return formatOrderSummary(order, true);
            }
        }

        if (matches(lower, ['that one', 'the order', 'tell me more', 'more details', 'what about it']) && lastOrderRef) {
            return formatOrderSummary(lastOrderRef, true);
        }

        if (matches(lower, ['delivered', 'completed', 'finished orders'])) {
            const delivered = orders.filter(o => o.status === 'Delivered');
            if (delivered.length === 0) return "You have no delivered orders yet.";
            let text = `Your ${delivered.length} delivered order(s):\n\n`;
            delivered.slice(0, 5).forEach((o, i) => {
                text += `${i + 1}. Order #${o._id?.substring(0, 8)} - ${o.restaurant?.name} - ₹${o.totalPrice?.toFixed(2)}\n`;
            });
            return text;
        }

        if (matches(lower, ['cancel', 'cancelled'])) {
            const cancelled = orders.filter(o => o.status === 'Cancelled');
            if (cancelled.length === 0) return "You have no cancelled orders.";
            return `You have ${cancelled.length} cancelled order(s). Only orders "Waiting for Acceptance" can be cancelled from your Dashboard.`;
        }

        return "I can help with your orders! Try:\n• \"My orders\" — order history\n• \"Latest order\" — current order details\n• \"Order status\" — track delivery\n• \"Total spent\" — your spending\n• \"Details of order 2\" — specific order\n• \"Help\" — all options";
    };

    const handleSend = async (e) => {
        e?.preventDefault();
        const text = input.trim();
        if (!text || loading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', text, timestamp: new Date() }]);
        setLoading(true);

        try {
            const botResponse = await processMessage(text);
            setMessages(prev => [...prev, { role: 'bot', text: botResponse, timestamp: new Date() }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'bot', text: "Sorry, something went wrong. Please try again.", timestamp: new Date() }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="chatbot-toggle"
                aria-label="Open chat"
            >
                <span className="chatbot-toggle-icon">{isOpen ? '✕' : '💬'}</span>
            </button>

            {isOpen && (
                <div className="chatbot-panel">
                    <div className="chatbot-header">
                        <h3 className="chatbot-title">FoodFreaky Assistant</h3>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="chatbot-close"
                            aria-label="Close chat"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="chatbot-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`chatbot-msg chatbot-msg-${msg.role}`}>
                                <div className="chatbot-msg-bubble">
                                    <pre className="chatbot-msg-text">{msg.text}</pre>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="chatbot-msg chatbot-msg-bot">
                                <div className="chatbot-msg-bubble chatbot-typing">
                                    <span>.</span><span>.</span><span>.</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSend} className="chatbot-input-wrap">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your orders..."
                            className="chatbot-input"
                            disabled={loading}
                        />
                        <button type="submit" className="chatbot-send" disabled={loading || !input.trim()}>
                            Send
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default Chatbot;

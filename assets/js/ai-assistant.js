// ai-assistant.js - AI-powered chatbot and assistant for Dataconecta

class AIAssistant {
    constructor() {
        this.isActive = false;
        this.conversationHistory = [];
        this.knowledgeBase = this.initializeKnowledgeBase();
        this.suggestions = new Map();
        this.init();
    }

    init() {
        this.createChatInterface();
        this.loadConversationHistory();
        this.initializeNLPProcessor();
        this.setupEventListeners();
        console.log('AI Assistant initialized successfully');
    }

    initializeKnowledgeBase() {
        return {
            services: {
                'data analytics': 'Ofrecemos análisis avanzado de datos, modelado predictivo, machine learning y business intelligence para optimizar tus decisiones empresariales.',
                'business intelligence': 'Implementamos soluciones de BI que transforman datos en insights accionables mediante dashboards interactivos y reportes automatizados.',
                'ux/ui design': 'Diseñamos experiencias de usuario intuitivas y interfaces atractivas basadas en research, prototipado y testing de usabilidad.',
                'marketing digital': 'Desarrollamos estrategias data-driven para maximizar tu presencia digital, engagement y ROI a través de analítica web y automation.',
                'automatización': 'Automatizamos procesos empresariales mediante RPA, workflow automation e integración de sistemas para mejorar eficiencia.',
                'capacitación': 'Ofrecemos formación especializada en herramientas de analytics, talleres prácticos y certificaciones para equipos técnicos y de negocio.'
            },
            processes: {
                'consultoría': 'Nuestro proceso incluye: 1) Análisis de necesidades, 2) Diseño de solución, 3) Implementación ágil, 4) Soporte continuo.',
                'metodología': 'Utilizamos metodologías ágiles con entregables iterativos, transparencia total y acompañamiento continuo.',
                'tiempos': 'Los proyectos típicos van de 2-16 semanas dependiendo de la complejidad. Ofrecemos consultoría inicial sin costo.'
            },
            contact: {
                'email': 'contacto@dataconecta.com',
                'phone': '+34 123 456 789',
                'linkedin': 'linkedin.com/company/dataconecta',
                'github': 'github.com/dataconecta'
            }
        };
    }

    createChatInterface() {
        const chatContainer = document.createElement('div');
        chatContainer.id = 'ai-chat-container';
        chatContainer.className = 'ai-chat-container';
        chatContainer.innerHTML = `
            <div class="ai-chat-toggle" id="ai-chat-toggle">
                <i class="bi bi-robot"></i>
                <span class="chat-notification" id="chat-notification">1</span>
            </div>
            <div class="ai-chat-window" id="ai-chat-window">
                <div class="ai-chat-header">
                    <div class="ai-assistant-info">
                        <i class="bi bi-robot"></i>
                        <span>Asistente Dataconecta</span>
                    </div>
                    <button class="ai-chat-close" id="ai-chat-close">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                <div class="ai-chat-messages" id="ai-chat-messages">
                    <div class="ai-message">
                        <div class="ai-avatar">
                            <i class="bi bi-robot"></i>
                        </div>
                        <div class="ai-text">
                            ¡Hola! Soy el asistente virtual de Dataconecta. ¿En qué puedo ayudarte hoy? Puedo responder preguntas sobre nuestros servicios, procesos o contacto.
                        </div>
                    </div>
                </div>
                <div class="ai-chat-suggestions" id="ai-chat-suggestions">
                    <button class="suggestion-btn" data-suggestion="¿Qué servicios ofrecen?">¿Qué servicios ofrecen?</button>
                    <button class="suggestion-btn" data-suggestion="¿Cómo es su proceso de trabajo?">¿Cómo es su proceso?</button>
                    <button class="suggestion-btn" data-suggestion="¿Cómo puedo contactarlos?">Información de contacto</button>
                </div>
                <div class="ai-chat-input">
                    <input type="text" id="ai-chat-input-field" placeholder="Escribe tu pregunta...">
                    <button id="ai-chat-send">
                        <i class="bi bi-send"></i>
                    </button>
                </div>
                <div class="ai-chat-typing" id="ai-chat-typing" style="display: none;">
                    <span>El asistente está escribiendo</span>
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(chatContainer);
        this.addChatStyles();
    }

    addChatStyles() {
        const styles = `
            .ai-chat-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                font-family: 'Inter', sans-serif;
            }

            .ai-chat-toggle {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #00F0FF 0%, #5271FF 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(0, 240, 255, 0.3);
                transition: transform 0.3s ease;
                position: relative;
            }

            .ai-chat-toggle:hover {
                transform: scale(1.1);
            }

            .ai-chat-toggle i {
                font-size: 24px;
                color: white;
            }

            .chat-notification {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ff4757;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
            }

            .ai-chat-window {
                position: absolute;
                bottom: 70px;
                right: 0;
                width: 350px;
                height: 500px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 16px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                display: none;
                flex-direction: column;
                overflow: hidden;
            }

            .ai-chat-header {
                background: linear-gradient(135deg, #00F0FF 0%, #5271FF 100%);
                color: white;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .ai-assistant-info {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 600;
            }

            .ai-chat-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 5px;
                border-radius: 4px;
            }

            .ai-chat-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .ai-chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
                background: linear-gradient(135deg, #0A1128 0%, #1C2E5C 100%);
            }

            .ai-message, .user-message {
                display: flex;
                margin-bottom: 15px;
                align-items: flex-start;
                gap: 10px;
            }

            .user-message {
                flex-direction: row-reverse;
            }

            .ai-avatar, .user-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
            }

            .ai-avatar {
                background: linear-gradient(135deg, #00F0FF 0%, #5271FF 100%);
                color: white;
            }

            .user-avatar {
                background: #64748b;
                color: white;
            }

            .ai-text, .user-text {
                background: rgba(255, 255, 255, 0.1);
                padding: 10px 15px;
                border-radius: 16px;
                color: white;
                max-width: 70%;
                word-wrap: break-word;
                line-height: 1.4;
            }

            .user-text {
                background: linear-gradient(135deg, #00F0FF 0%, #5271FF 100%);
            }

            .ai-chat-suggestions {
                padding: 10px 15px;
                background: linear-gradient(135deg, #0A1128 0%, #1C2E5C 100%);
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .suggestion-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .suggestion-btn:hover {
                background: rgba(0, 240, 255, 0.2);
                border-color: #00F0FF;
            }

            .ai-chat-input {
                padding: 15px;
                background: rgba(255, 255, 255, 0.95);
                display: flex;
                gap: 10px;
                align-items: center;
            }

            #ai-chat-input-field {
                flex: 1;
                border: 1px solid #e2e8f0;
                border-radius: 25px;
                padding: 10px 15px;
                outline: none;
                font-size: 14px;
            }

            #ai-chat-input-field:focus {
                border-color: #00F0FF;
                box-shadow: 0 0 0 2px rgba(0, 240, 255, 0.2);
            }

            #ai-chat-send {
                background: linear-gradient(135deg, #00F0FF 0%, #5271FF 100%);
                border: none;
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.3s ease;
            }

            #ai-chat-send:hover {
                transform: scale(1.1);
            }

            .ai-chat-typing {
                padding: 10px 15px;
                background: linear-gradient(135deg, #0A1128 0%, #1C2E5C 100%);
                color: white;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .typing-dots {
                display: flex;
                gap: 3px;
            }

            .typing-dots span {
                width: 4px;
                height: 4px;
                background: #00F0FF;
                border-radius: 50%;
                animation: typing 1.4s infinite ease-in-out;
            }

            .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
            .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

            @keyframes typing {
                0%, 80%, 100% {
                    transform: scale(0);
                    opacity: 0.5;
                }
                40% {
                    transform: scale(1);
                    opacity: 1;
                }
            }

            @media (max-width: 768px) {
                .ai-chat-window {
                    width: 300px;
                    height: 400px;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    setupEventListeners() {
        const toggle = document.getElementById('ai-chat-toggle');
        const window = document.getElementById('ai-chat-window');
        const close = document.getElementById('ai-chat-close');
        const input = document.getElementById('ai-chat-input-field');
        const send = document.getElementById('ai-chat-send');
        const suggestions = document.getElementById('ai-chat-suggestions');

        toggle.addEventListener('click', () => this.toggleChat());
        close.addEventListener('click', () => this.closeChat());
        send.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        suggestions.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-btn')) {
                const suggestion = e.target.dataset.suggestion;
                this.sendMessage(suggestion);
            }
        });
    }

    toggleChat() {
        const window = document.getElementById('ai-chat-window');
        const notification = document.getElementById('chat-notification');
        
        if (window.style.display === 'none' || !window.style.display) {
            window.style.display = 'flex';
            notification.style.display = 'none';
            this.isActive = true;
        } else {
            window.style.display = 'none';
            this.isActive = false;
        }
    }

    closeChat() {
        const window = document.getElementById('ai-chat-window');
        window.style.display = 'none';
        this.isActive = false;
    }

    async sendMessage(message = null) {
        const input = document.getElementById('ai-chat-input-field');
        const messagesContainer = document.getElementById('ai-chat-messages');
        
        const text = message || input.value.trim();
        if (!text) return;

        // Add user message
        this.addMessage(text, 'user');
        
        // Clear input
        if (!message) input.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        // Process message and get response
        setTimeout(async () => {
            const response = await this.processMessage(text);
            this.hideTypingIndicator();
            this.addMessage(response, 'ai');
            
            // Save conversation
            this.conversationHistory.push({ type: 'user', text, timestamp: new Date() });
            this.conversationHistory.push({ type: 'ai', text: response, timestamp: new Date() });
            this.saveConversationHistory();
        }, 1000 + Math.random() * 2000); // Random delay 1-3 seconds
    }

    addMessage(text, type) {
        const messagesContainer = document.getElementById('ai-chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'user' ? 'user-message' : 'ai-message';
        
        messageDiv.innerHTML = `
            <div class="${type}-avatar">
                <i class="bi bi-${type === 'user' ? 'person' : 'robot'}"></i>
            </div>
            <div class="${type}-text">${text}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showTypingIndicator() {
        document.getElementById('ai-chat-typing').style.display = 'flex';
    }

    hideTypingIndicator() {
        document.getElementById('ai-chat-typing').style.display = 'none';
    }

    async processMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        // Check for service-related queries
        for (const [service, description] of Object.entries(this.knowledgeBase.services)) {
            if (lowerMessage.includes(service)) {
                return description;
            }
        }
        
        // Check for process-related queries
        for (const [process, description] of Object.entries(this.knowledgeBase.processes)) {
            if (lowerMessage.includes(process)) {
                return description;
            }
        }
        
        // Check for contact queries
        if (lowerMessage.includes('contacto') || lowerMessage.includes('email') || lowerMessage.includes('teléfono')) {
            return `Puedes contactarnos por:
            📧 Email: ${this.knowledgeBase.contact.email}
            📞 Teléfono: ${this.knowledgeBase.contact.phone}
            💼 LinkedIn: ${this.knowledgeBase.contact.linkedin}
            💻 GitHub: ${this.knowledgeBase.contact.github}`;
        }
        
        // Check for greetings
        if (lowerMessage.includes('hola') || lowerMessage.includes('buenos') || lowerMessage.includes('buenas')) {
            return '¡Hola! Es un placer ayudarte. ¿En qué área de Dataconecta te gustaría que profundice? Podemos hablar de nuestros servicios, metodología de trabajo o información de contacto.';
        }
        
        // Check for thanks
        if (lowerMessage.includes('gracias') || lowerMessage.includes('gracias')) {
            return '¡De nada! Estoy aquí para ayudarte con cualquier consulta sobre Dataconecta. ¿Hay algo más en lo que pueda asistirte?';
        }
        
        // Default response with suggestions
        return `Entiendo tu consulta sobre "${message}". Te puedo ayudar con información sobre:
        
        🔹 Nuestros servicios (Data Analytics, BI, UX/UI, Marketing Digital)
        🔹 Metodología y procesos de trabajo
        🔹 Información de contacto y colaboración
        
        ¿Sobre qué te gustaría saber más específicamente?`;
    }

    initializeNLPProcessor() {
        // Basic NLP processing for better understanding
        this.stopWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'como', 'las', 'del', 'los'];
        this.synonyms = {
            'servicio': ['servicios', 'oferta', 'propuesta'],
            'precio': ['precios', 'costo', 'costos', 'precio'],
            'tiempo': ['tiempos', 'duración', 'plazo', 'plazos'],
            'contacto': ['contactar', 'comunicar', 'hablar']
        };
    }

    loadConversationHistory() {
        const saved = localStorage.getItem('ai_conversation_history');
        if (saved) {
            this.conversationHistory = JSON.parse(saved);
        }
    }

    saveConversationHistory() {
        // Keep only last 50 messages
        if (this.conversationHistory.length > 50) {
            this.conversationHistory = this.conversationHistory.slice(-50);
        }
        localStorage.setItem('ai_conversation_history', JSON.stringify(this.conversationHistory));
    }

    // Analytics integration
    trackInteraction(type, data) {
        if (window.gtag) {
            window.gtag('event', 'ai_assistant_interaction', {
                interaction_type: type,
                ...data
            });
        }
    }
}

// Initialize AI Assistant when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistant = new AIAssistant();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIAssistant;
}
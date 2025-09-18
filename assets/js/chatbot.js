// AI Chatbot for Dataconecta

class DataconectaChatbot {
    constructor() {
        this.isOpen = false;
        this.responses = this.loadResponses();
        this.conversationHistory = [];
        this.init();
    }

    init() {
        this.createChatInterface();
        this.setupEventListeners();
        this.loadConversationHistory();
    }

    loadResponses() {
        return {
            greetings: [
                "¡Hola! Soy el asistente virtual de Dataconecta. ¿En qué puedo ayudarte hoy?",
                "¡Bienvenido/a! Estoy aquí para responder tus preguntas sobre nuestros servicios.",
                "¡Hola! ¿Te gustaría conocer más sobre nuestras soluciones de datos?"
            ],
            services: {
                keywords: ["servicio", "analytics", "bi", "ux", "ui", "marketing", "consultoría"],
                responses: [
                    "Ofrecemos servicios especializados en Data Analytics & BI, Diseño UX/UI, Marketing Digital y Automatización de procesos. ¿Te interesa alguno en particular?",
                    "Nuestros principales servicios incluyen análisis de datos, business intelligence, diseño de experiencias digitales y estrategias de marketing basadas en datos."
                ]
            },
            contact: {
                keywords: ["contacto", "hablar", "reunión", "presupuesto", "cotización"],
                responses: [
                    "¡Perfecto! Puedes contactarnos en contacto@dataconecta.com o completar nuestro formulario de contacto. ¿Prefieres que programemos una llamada?",
                    "Me encantaría conectarte con nuestro equipo. Puedes escribirnos o agendar una consultoría gratuita desde nuestra página de contacto."
                ]
            },
            process: {
                keywords: ["proceso", "metodología", "como", "trabajo"],
                responses: [
                    "Nuestro proceso tiene 4 fases: 1) Descubrimiento y análisis, 2) Diseño de solución, 3) Implementación iterativa, y 4) Soporte continuo.",
                    "Trabajamos con metodologías ágiles para garantizar resultados tangibles en cada etapa del proyecto."
                ]
            },
            pricing: {
                keywords: ["precio", "costo", "tarifa", "inversión"],
                responses: [
                    "Nuestras tarifas varían según el alcance y complejidad del proyecto. Te ofrecemos una consultoría inicial gratuita para evaluar tus necesidades específicas.",
                    "Cada proyecto es único. ¿Te gustaría agendar una reunión para discutir tu presupuesto y objetivos?"
                ]
            },
            default: [
                "Interesante pregunta. ¿Podrías ser más específico? Puedo ayudarte con información sobre nuestros servicios, procesos o contacto.",
                "No estoy seguro de entender completamente. ¿Te refieres a nuestros servicios de analytics, UX/UI o marketing digital?",
                "Esa es una buena pregunta. Te recomiendo contactar directamente a nuestro equipo para una respuesta más detallada."
            ]
        };
    }

    createChatInterface() {
        const chatHTML = `
            <div id="chatbot-container" class="chatbot-container">
                <div id="chatbot-toggle" class="chatbot-toggle" aria-label="Abrir chat de asistencia">
                    <i class="bi bi-chat-dots-fill"></i>
                    <span class="chat-notification" id="chat-notification">1</span>
                </div>
                <div id="chatbot-window" class="chatbot-window">
                    <div class="chatbot-header">
                        <div class="chatbot-avatar">
                            <img src="assets/img/logo.png" alt="Dataconecta" width="30">
                        </div>
                        <div class="chatbot-info">
                            <h5>Asistente Dataconecta</h5>
                            <span class="status online">En línea</span>
                        </div>
                        <button id="chatbot-minimize" class="chatbot-minimize" aria-label="Minimizar chat">
                            <i class="bi bi-dash-lg"></i>
                        </button>
                    </div>
                    <div class="chatbot-messages" id="chatbot-messages">
                        <div class="message bot-message">
                            <div class="message-content">
                                <p>¡Hola! Soy el asistente virtual de Dataconecta. ¿En qué puedo ayudarte hoy?</p>
                                <div class="quick-actions">
                                    <button class="quick-btn" data-action="services">Ver servicios</button>
                                    <button class="quick-btn" data-action="contact">Contactar</button>
                                    <button class="quick-btn" data-action="demo">Solicitar demo</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="chatbot-input">
                        <div class="typing-indicator" id="typing-indicator" style="display: none;">
                            <span></span><span></span><span></span>
                        </div>
                        <div class="input-area">
                            <input type="text" id="chatbot-message-input" placeholder="Escribe tu mensaje..." maxlength="500">
                            <button id="chatbot-send" aria-label="Enviar mensaje">
                                <i class="bi bi-send-fill"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', chatHTML);
    }

    setupEventListeners() {
        const toggle = document.getElementById('chatbot-toggle');
        const minimize = document.getElementById('chatbot-minimize');
        const sendBtn = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-message-input');

        toggle.addEventListener('click', () => this.toggleChat());
        minimize.addEventListener('click', () => this.toggleChat());
        sendBtn.addEventListener('click', () => this.sendMessage());
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Quick action buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-btn')) {
                const action = e.target.getAttribute('data-action');
                this.handleQuickAction(action);
            }
        });
    }

    toggleChat() {
        const container = document.getElementById('chatbot-container');
        const notification = document.getElementById('chat-notification');
        
        this.isOpen = !this.isOpen;
        container.classList.toggle('open', this.isOpen);
        
        if (this.isOpen) {
            notification.style.display = 'none';
            document.getElementById('chatbot-message-input').focus();
        }
    }

    sendMessage() {
        const input = document.getElementById('chatbot-message-input');
        const message = input.value.trim();
        
        if (!message) return;

        this.addMessage(message, 'user');
        input.value = '';
        
        this.showTypingIndicator();
        setTimeout(() => {
            this.hideTypingIndicator();
            this.generateResponse(message);
        }, 1000 + Math.random() * 2000);
    }

    addMessage(content, type, includeActions = false) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        let messageHTML = `<div class="message-content"><p>${content}</p>`;
        
        if (includeActions && type === 'bot') {
            messageHTML += `
                <div class="quick-actions">
                    <button class="quick-btn" data-action="services">Ver servicios</button>
                    <button class="quick-btn" data-action="contact">Contactar</button>
                </div>
            `;
        }
        
        messageHTML += '</div>';
        messageDiv.innerHTML = messageHTML;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        this.conversationHistory.push({ content, type, timestamp: new Date() });
        this.saveConversationHistory();
    }

    generateResponse(userMessage) {
        const message = userMessage.toLowerCase();
        let response = this.getRandomResponse(this.responses.default);

        // Check for greeting patterns
        if (this.matchesPattern(message, ['hola', 'hello', 'hi', 'buenos', 'buenas'])) {
            response = this.getRandomResponse(this.responses.greetings);
        }
        // Check for service inquiries
        else if (this.matchesKeywords(message, this.responses.services.keywords)) {
            response = this.getRandomResponse(this.responses.services.responses);
        }
        // Check for contact requests
        else if (this.matchesKeywords(message, this.responses.contact.keywords)) {
            response = this.getRandomResponse(this.responses.contact.responses);
        }
        // Check for process questions
        else if (this.matchesKeywords(message, this.responses.process.keywords)) {
            response = this.getRandomResponse(this.responses.process.responses);
        }
        // Check for pricing questions
        else if (this.matchesKeywords(message, this.responses.pricing.keywords)) {
            response = this.getRandomResponse(this.responses.pricing.responses);
        }

        this.addMessage(response, 'bot', true);
    }

    matchesPattern(message, patterns) {
        return patterns.some(pattern => message.includes(pattern));
    }

    matchesKeywords(message, keywords) {
        return keywords.some(keyword => message.includes(keyword));
    }

    getRandomResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }

    showTypingIndicator() {
        document.getElementById('typing-indicator').style.display = 'block';
        const messagesContainer = document.getElementById('chatbot-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        document.getElementById('typing-indicator').style.display = 'none';
    }

    handleQuickAction(action) {
        switch (action) {
            case 'services':
                this.addMessage('Me gustaría conocer más sobre sus servicios', 'user');
                setTimeout(() => {
                    this.addMessage('Perfecto! Ofrecemos servicios especializados en Data Analytics & BI, Diseño UX/UI, Marketing Digital y Automatización. ¿Te interesa algún área específica?', 'bot', true);
                }, 1000);
                break;
            case 'contact':
                this.addMessage('Quiero ponerme en contacto con el equipo', 'user');
                setTimeout(() => {
                    this.addMessage('¡Excelente! Puedes contactarnos en contacto@dataconecta.com o completar nuestro formulario. También puedes agendar una consultoría gratuita.', 'bot', true);
                }, 1000);
                break;
            case 'demo':
                this.addMessage('Me gustaría solicitar una demo', 'user');
                setTimeout(() => {
                    this.addMessage('¡Perfecto! Te conectaré con nuestro equipo para programar una demo personalizada. Por favor, completa el formulario de contacto con tus datos y nos comunicaremos contigo pronto.', 'bot', true);
                }, 1000);
                break;
        }
    }

    saveConversationHistory() {
        try {
            localStorage.setItem('dataconecta-chat-history', JSON.stringify(this.conversationHistory.slice(-20)));
        } catch (e) {
            console.warn('Could not save conversation history');
        }
    }

    loadConversationHistory() {
        try {
            const history = localStorage.getItem('dataconecta-chat-history');
            if (history) {
                this.conversationHistory = JSON.parse(history);
            }
        } catch (e) {
            console.warn('Could not load conversation history');
        }
    }
}

// Initialize chatbot when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.dataconectaChatbot = new DataconectaChatbot();
    });
} else {
    window.dataconectaChatbot = new DataconectaChatbot();
}
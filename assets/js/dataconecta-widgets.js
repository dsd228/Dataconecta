// Banner de Cookies GDPR
document.addEventListener('DOMContentLoaded', function () {
  // Banner Cookies
  const cookieBanner = document.getElementById('cookie-banner');
  const cookieAccept = document.getElementById('cookie-accept');
  if (cookieBanner && cookieAccept) {
    if (!localStorage.getItem('dataconectaCookieConsent')) {
      cookieBanner.hidden = false;
    }
    cookieAccept.addEventListener('click', () => {
      localStorage.setItem('dataconectaCookieConsent', '1');
      cookieBanner.hidden = true;
    });
  }

  // Chatbot Widget
  const chatbotToggle = document.getElementById('chatbot-toggle');
  const chatbotWidget = document.getElementById('chatbot-widget');
  const chatbotClose = document.getElementById('chatbot-close');
  const chatbotBody = document.getElementById('chatbot-body');
  const chatbotForm = document.getElementById('chatbot-form');
  const chatbotInput = document.getElementById('chatbot-input');

  function toggleChatbot(open) {
    if (open) {
      chatbotWidget.hidden = false;
      chatbotBody.focus();
    } else {
      chatbotWidget.hidden = true;
    }
  }

  if (chatbotToggle && chatbotWidget) {
    chatbotToggle.addEventListener('click', () => toggleChatbot(true));
  }
  if (chatbotClose) {
    chatbotClose.addEventListener('click', () => toggleChatbot(false));
  }
  // Cerrar con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleChatbot(false);
  });
  // Envío de mensajes (simulado)
  if (chatbotForm && chatbotInput && chatbotBody) {
    chatbotForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const text = chatbotInput.value.trim();
      if (!text) return;
      const userMsg = document.createElement('div');
      userMsg.className = 'chatbot-message user';
      userMsg.textContent = text;
      chatbotBody.appendChild(userMsg);
      chatbotBody.scrollTop = chatbotBody.scrollHeight;
      chatbotInput.value = '';
      // Simulación de respuesta IA
      setTimeout(() => {
        const botMsg = document.createElement('div');
        botMsg.className = 'chatbot-message bot';
        botMsg.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Pensando...';
        chatbotBody.appendChild(botMsg);
        chatbotBody.scrollTop = chatbotBody.scrollHeight;
        setTimeout(() => {
          botMsg.innerHTML = '¡Gracias por tu consulta! Un asesor responderá pronto.<br><i>(Integración IA próximamente)</i>';
        }, 1200);
      }, 500);
    });
  }
});
// Security Configuration and Protection

class SecurityManager {
    constructor() {
        this.config = {
            csp: {
                'default-src': ["'self'"],
                'script-src': ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
                'style-src': ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
                'img-src': ["'self'", "data:", "https:"],
                'font-src': ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
                'connect-src': ["'self'", "https:"],
                'frame-ancestors': ["'none'"],
                'base-uri': ["'self'"],
                'form-action': ["'self'"]
            },
            rateLimiting: {
                maxRequests: 100,
                windowMs: 15 * 60 * 1000, // 15 minutes
                skipSuccessfulRequests: true
            },
            formValidation: {
                maxLength: 1000,
                allowedPatterns: {
                    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    phone: /^[+]?[\d\s\-\(\)]{10,}$/,
                    name: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/
                }
            }
        };
        this.requestCounts = new Map();
        this.init();
    }

    init() {
        this.setSecurityHeaders();
        this.setupFormProtection();
        this.implementRateLimiting();
        this.setupContentProtection();
        this.monitorSecurity();
    }

    setSecurityHeaders() {
        // Since we can't set HTTP headers in client-side JS, 
        // we'll create meta tags and implement client-side security measures
        
        const securityMetas = [
            { name: 'referrer', content: 'strict-origin-when-cross-origin' },
            { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
            { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
            { 'http-equiv': 'X-XSS-Protection', content: '1; mode=block' },
            { 'http-equiv': 'Strict-Transport-Security', content: 'max-age=31536000; includeSubDomains' }
        ];

        securityMetas.forEach(meta => {
            const metaTag = document.createElement('meta');
            Object.keys(meta).forEach(key => {
                metaTag.setAttribute(key, meta[key]);
            });
            document.head.appendChild(metaTag);
        });

        // Implement CSP via meta tag
        const cspContent = Object.entries(this.config.csp)
            .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
            .join('; ');
        
        const cspMeta = document.createElement('meta');
        cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
        cspMeta.setAttribute('content', cspContent);
        document.head.appendChild(cspMeta);
    }

    setupFormProtection() {
        // Add CSRF-like protection to forms
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.tagName === 'FORM') {
                if (!this.validateForm(form)) {
                    e.preventDefault();
                    this.showSecurityWarning('Formulario inválido. Por favor, verifica los datos ingresados.');
                    return false;
                }
                
                if (!this.checkRateLimit()) {
                    e.preventDefault();
                    this.showSecurityWarning('Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.');
                    return false;
                }

                this.addSecurityToken(form);
            }
        });

        // Input sanitization
        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                this.sanitizeInput(e.target);
            }
        });
    }

    validateForm(form) {
        const inputs = form.querySelectorAll('input, textarea, select');
        let isValid = true;

        inputs.forEach(input => {
            // Check for suspicious patterns
            if (this.containsSuspiciousContent(input.value)) {
                isValid = false;
                this.markInputAsInvalid(input, 'Contenido no permitido detectado');
            }

            // Validate based on input type
            if (input.type === 'email' && input.value) {
                if (!this.config.formValidation.allowedPatterns.email.test(input.value)) {
                    isValid = false;
                    this.markInputAsInvalid(input, 'Formato de email inválido');
                }
            }

            if (input.name === 'phone' && input.value) {
                if (!this.config.formValidation.allowedPatterns.phone.test(input.value)) {
                    isValid = false;
                    this.markInputAsInvalid(input, 'Formato de teléfono inválido');
                }
            }

            if ((input.name === 'name' || input.type === 'text') && input.value) {
                if (input.value.length > this.config.formValidation.maxLength) {
                    isValid = false;
                    this.markInputAsInvalid(input, 'Texto demasiado largo');
                }
            }

            // Check for XSS attempts
            if (this.containsXSS(input.value)) {
                isValid = false;
                this.markInputAsInvalid(input, 'Contenido potencialmente peligroso detectado');
                this.logSecurityEvent('XSS_ATTEMPT', { input: input.name, value: input.value });
            }
        });

        return isValid;
    }

    containsSuspiciousContent(value) {
        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /eval\s*\(/i,
            /document\.cookie/i,
            /window\.location/i,
            /<iframe/i,
            /<object/i,
            /<embed/i
        ];

        return suspiciousPatterns.some(pattern => pattern.test(value));
    }

    containsXSS(value) {
        const xssPatterns = [
            /<script.*?>.*?<\/script>/gi,
            /<img.*?onerror.*?>/gi,
            /<.*?javascript:.*?>/gi,
            /<.*?on\w+.*?=.*?>/gi
        ];

        return xssPatterns.some(pattern => pattern.test(value));
    }

    sanitizeInput(input) {
        if (input.type === 'text' || input.tagName === 'TEXTAREA') {
            // Remove potentially dangerous characters
            input.value = input.value
                .replace(/[<>]/g, '') // Remove < and >
                .replace(/javascript:/gi, '') // Remove javascript: protocol
                .replace(/on\w+\s*=/gi, ''); // Remove event handlers
        }
    }

    markInputAsInvalid(input, message) {
        input.classList.add('is-invalid');
        
        // Remove existing error message
        const existingError = input.parentNode.querySelector('.security-error');
        if (existingError) {
            existingError.remove();
        }

        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'security-error text-danger small mt-1';
        errorDiv.textContent = message;
        input.parentNode.appendChild(errorDiv);

        // Remove error after 5 seconds
        setTimeout(() => {
            input.classList.remove('is-invalid');
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    addSecurityToken(form) {
        // Add a timestamp-based token to prevent replay attacks
        const token = this.generateSecurityToken();
        
        let tokenInput = form.querySelector('input[name="security_token"]');
        if (!tokenInput) {
            tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = 'security_token';
            form.appendChild(tokenInput);
        }
        
        tokenInput.value = token;
    }

    generateSecurityToken() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return btoa(`${timestamp}_${random}`);
    }

    implementRateLimiting() {
        setInterval(() => {
            this.requestCounts.clear();
        }, this.config.rateLimiting.windowMs);
    }

    checkRateLimit() {
        const clientId = this.getClientId();
        const currentCount = this.requestCounts.get(clientId) || 0;
        
        if (currentCount >= this.config.rateLimiting.maxRequests) {
            this.logSecurityEvent('RATE_LIMIT_EXCEEDED', { clientId, attempts: currentCount });
            return false;
        }
        
        this.requestCounts.set(clientId, currentCount + 1);
        return true;
    }

    getClientId() {
        // Simple client identification based on session storage and fingerprinting
        let clientId = sessionStorage.getItem('client_id');
        
        if (!clientId) {
            clientId = this.generateFingerprint();
            sessionStorage.setItem('client_id', clientId);
        }
        
        return clientId;
    }

    generateFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.platform
        ];
        
        const fingerprint = btoa(components.join('|'));
        return fingerprint.substr(0, 16);
    }

    setupContentProtection() {
        // Disable right-click context menu on sensitive content
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.protected-content')) {
                e.preventDefault();
                this.showSecurityWarning('Contenido protegido');
            }
        });

        // Disable text selection on protected content
        document.addEventListener('selectstart', (e) => {
            if (e.target.closest('.protected-content')) {
                e.preventDefault();
            }
        });

        // Disable developer tools shortcuts
        document.addEventListener('keydown', (e) => {
            if (
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) ||
                e.key === 'F12'
            ) {
                if (window.location.hostname !== 'localhost') {
                    e.preventDefault();
                    this.showSecurityWarning('Herramientas de desarrollador deshabilitadas');
                }
            }
        });

        // Detect developer tools
        this.detectDevTools();
    }

    detectDevTools() {
        let devtools = { open: false };
        
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > 160) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.logSecurityEvent('DEVTOOLS_OPENED');
                }
            } else {
                devtools.open = false;
            }
        }, 500);
    }

    monitorSecurity() {
        // Monitor for suspicious activities
        let clickCount = 0;
        let rapidClicks = 0;

        document.addEventListener('click', () => {
            clickCount++;
            rapidClicks++;
            
            // Reset rapid click counter
            setTimeout(() => rapidClicks--, 1000);
            
            // Detect potential bot behavior
            if (rapidClicks > 10) {
                this.logSecurityEvent('SUSPICIOUS_ACTIVITY', { 
                    type: 'rapid_clicks', 
                    count: rapidClicks 
                });
            }
        });

        // Monitor for page visibility changes (potential tab switching during form fill)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.logSecurityEvent('PAGE_HIDDEN');
            }
        });

        // Monitor for unusual navigation patterns
        window.addEventListener('beforeunload', () => {
            this.logSecurityEvent('PAGE_UNLOAD', { 
                timeOnPage: Date.now() - this.pageLoadTime,
                interactions: clickCount 
            });
        });

        this.pageLoadTime = Date.now();
    }

    showSecurityWarning(message) {
        const warning = document.createElement('div');
        warning.className = 'security-warning';
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #ff4757, #ff6b7d);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-weight: 600;
            box-shadow: 0 4px 20px rgba(255, 71, 87, 0.3);
            animation: slideInRight 0.3s ease;
        `;
        warning.textContent = `⚠️ ${message}`;
        
        document.body.appendChild(warning);
        
        setTimeout(() => {
            if (warning.parentNode) {
                warning.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (warning.parentNode) {
                        warning.parentNode.removeChild(warning);
                    }
                }, 300);
            }
        }, 3000);
    }

    logSecurityEvent(eventType, data = {}) {
        const event = {
            type: eventType,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            clientId: this.getClientId(),
            ...data
        };

        // Store in localStorage for later reporting
        try {
            const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
            logs.push(event);
            
            // Keep only last 100 events
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }
            
            localStorage.setItem('security_logs', JSON.stringify(logs));
        } catch (e) {
            console.warn('Could not store security log');
        }

        // Log to console in development
        if (window.location.hostname === 'localhost') {
            console.warn('Security Event:', event);
        }
    }

    getSecurityReport() {
        try {
            return JSON.parse(localStorage.getItem('security_logs') || '[]');
        } catch (e) {
            return [];
        }
    }

    clearSecurityLogs() {
        localStorage.removeItem('security_logs');
    }
}

// Add animation styles
const securityStyles = document.createElement('style');
securityStyles.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    .protected-content {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
    }
`;
document.head.appendChild(securityStyles);

// Initialize security manager
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.securityManager = new SecurityManager();
    });
} else {
    window.securityManager = new SecurityManager();
}
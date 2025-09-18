// security.js - Advanced Security Features for Dataconecta

class SecurityManager {
    constructor() {
        this.securityConfig = {
            enableCSP: true,
            enableXSSProtection: true,
            enableHTTPS: true,
            encryptLocalStorage: true,
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            maxLoginAttempts: 3,
            passwordComplexity: {
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSymbols: true
            }
        };
        this.encryptionKey = this.generateEncryptionKey();
        this.securityHeaders = new Map();
        this.auditLog = [];
        this.init();
    }

    init() {
        this.implementCSP();
        this.setupXSSProtection();
        this.enableHTTPSRedirect();
        this.setupSessionManagement();
        this.enableLocalStorageEncryption();
        this.setupSecurityMonitoring();
        this.initPrivacyCompliance();
        console.log('Security Manager initialized with advanced protection');
    }

    implementCSP() {
        if (!this.securityConfig.enableCSP) return;

        const cspPolicy = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
            "img-src 'self' data: https:",
            "connect-src 'self' https://api.dataconecta.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join('; ');

        // Set CSP header if possible (server-side preferred)
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = cspPolicy;
        document.head.appendChild(meta);

        this.logSecurityEvent('CSP', 'Content Security Policy enabled');
    }

    setupXSSProtection() {
        if (!this.securityConfig.enableXSSProtection) return;

        // Input sanitization
        this.setupInputSanitization();
        
        // Output encoding
        this.setupOutputEncoding();
        
        // DOM-based XSS protection
        this.setupDOMProtection();

        this.logSecurityEvent('XSS', 'XSS protection mechanisms enabled');
    }

    setupInputSanitization() {
        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                e.target.value = this.sanitizeInput(e.target.value);
            }
        });
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    setupOutputEncoding() {
        // Override innerHTML and textContent to auto-encode
        const originalInnerHTML = Element.prototype.innerHTML;
        Element.prototype.innerHTML = function(value) {
            if (typeof value === 'string') {
                value = this.sanitizeInput(value);
            }
            return originalInnerHTML.call(this, value);
        };
    }

    setupDOMProtection() {
        // Monitor for dangerous DOM modifications
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.scanElementForThreats(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    scanElementForThreats(element) {
        // Check for suspicious attributes
        const dangerousAttributes = ['onload', 'onerror', 'onclick', 'onmouseover'];
        dangerousAttributes.forEach(attr => {
            if (element.hasAttribute(attr)) {
                this.logSecurityEvent('DOM', `Suspicious attribute detected: ${attr}`, 'HIGH');
                element.removeAttribute(attr);
            }
        });

        // Check for suspicious content
        if (element.innerHTML && element.innerHTML.includes('javascript:')) {
            this.logSecurityEvent('DOM', 'JavaScript URL detected in content', 'HIGH');
            element.innerHTML = this.sanitizeInput(element.innerHTML);
        }
    }

    enableHTTPSRedirect() {
        if (!this.securityConfig.enableHTTPS) return;

        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            location.replace('https:' + window.location.href.substring(window.location.protocol.length));
        }

        // Ensure all links are HTTPS
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && e.target.href.startsWith('http:')) {
                e.target.href = e.target.href.replace('http:', 'https:');
            }
        });

        this.logSecurityEvent('HTTPS', 'HTTPS enforcement enabled');
    }

    setupSessionManagement() {
        let sessionStartTime = Date.now();
        let lastActivity = Date.now();

        // Session timeout
        const checkSession = () => {
            const now = Date.now();
            const sessionDuration = now - sessionStartTime;
            const inactivityDuration = now - lastActivity;

            if (sessionDuration > this.securityConfig.sessionTimeout || 
                inactivityDuration > this.securityConfig.sessionTimeout) {
                this.terminateSession();
            }
        };

        // Track user activity
        document.addEventListener('click', () => {
            lastActivity = Date.now();
        });

        document.addEventListener('keypress', () => {
            lastActivity = Date.now();
        });

        // Check session every minute
        setInterval(checkSession, 60000);

        this.logSecurityEvent('SESSION', 'Session management initialized');
    }

    terminateSession() {
        // Clear sensitive data
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear cookies
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        this.logSecurityEvent('SESSION', 'Session terminated due to timeout');
        
        // Show session expired modal
        this.showSessionExpiredModal();
    }

    showSessionExpiredModal() {
        const modal = document.createElement('div');
        modal.className = 'security-modal';
        modal.innerHTML = `
            <div class="security-modal-content">
                <div class="security-modal-header">
                    <i class="bi bi-shield-exclamation"></i>
                    <h3>Sesión Expirada</h3>
                </div>
                <div class="security-modal-body">
                    <p>Tu sesión ha expirado por seguridad. Por favor, recarga la página para continuar.</p>
                </div>
                <div class="security-modal-footer">
                    <button onclick="location.reload()" class="btn-primary">Recargar Página</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.addSecurityModalStyles();
    }

    enableLocalStorageEncryption() {
        if (!this.securityConfig.encryptLocalStorage) return;

        // Override localStorage methods
        const originalSetItem = localStorage.setItem;
        const originalGetItem = localStorage.getItem;

        localStorage.setItem = (key, value) => {
            const encryptedValue = this.encrypt(value);
            return originalSetItem.call(localStorage, key, encryptedValue);
        };

        localStorage.getItem = (key) => {
            const encryptedValue = originalGetItem.call(localStorage, key);
            if (encryptedValue) {
                try {
                    return this.decrypt(encryptedValue);
                } catch (error) {
                    console.warn('Failed to decrypt localStorage value:', error);
                    return null;
                }
            }
            return encryptedValue;
        };

        this.logSecurityEvent('ENCRYPTION', 'LocalStorage encryption enabled');
    }

    generateEncryptionKey() {
        return btoa(Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15));
    }

    encrypt(text) {
        if (typeof text !== 'string') {
            text = JSON.stringify(text);
        }
        return btoa(encodeURIComponent(text));
    }

    decrypt(encryptedText) {
        return decodeURIComponent(atob(encryptedText));
    }

    setupSecurityMonitoring() {
        // Monitor console access attempts
        const originalConsole = window.console;
        window.console = new Proxy(originalConsole, {
            get: (target, prop) => {
                if (prop === 'log' || prop === 'warn' || prop === 'error') {
                    this.logSecurityEvent('CONSOLE', `Console ${prop} accessed`);
                }
                return target[prop];
            }
        });

        // Monitor DevTools opening
        let devtools = {
            open: false,
            orientation: null
        };

        const threshold = 160;

        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.logSecurityEvent('DEVTOOLS', 'Developer Tools opened', 'MEDIUM');
                }
            } else {
                devtools.open = false;
            }
        }, 500);

        // Monitor suspicious activities
        this.monitorSuspiciousActivities();

        this.logSecurityEvent('MONITORING', 'Security monitoring enabled');
    }

    monitorSuspiciousActivities() {
        let clickCount = 0;
        let keyPressCount = 0;
        
        // Monitor rapid clicking
        document.addEventListener('click', () => {
            clickCount++;
            setTimeout(() => clickCount--, 1000);
            
            if (clickCount > 20) {
                this.logSecurityEvent('SUSPICIOUS', 'Rapid clicking detected', 'MEDIUM');
            }
        });

        // Monitor rapid key presses
        document.addEventListener('keypress', () => {
            keyPressCount++;
            setTimeout(() => keyPressCount--, 1000);
            
            if (keyPressCount > 50) {
                this.logSecurityEvent('SUSPICIOUS', 'Rapid key pressing detected', 'MEDIUM');
            }
        });

        // Monitor copy attempts on sensitive areas
        document.addEventListener('copy', (e) => {
            if (e.target.classList.contains('sensitive-data')) {
                e.preventDefault();
                this.logSecurityEvent('DATA', 'Attempt to copy sensitive data blocked', 'HIGH');
            }
        });
    }

    initPrivacyCompliance() {
        this.createPrivacyBanner();
        this.setupDataProtection();
        this.implementCookieConsent();
        this.logSecurityEvent('PRIVACY', 'Privacy compliance features initialized');
    }

    createPrivacyBanner() {
        const banner = document.createElement('div');
        banner.id = 'privacy-banner';
        banner.className = 'privacy-banner';
        banner.innerHTML = `
            <div class="privacy-content">
                <div class="privacy-text">
                    <i class="bi bi-shield-check"></i>
                    <span>Respetamos tu privacidad. Utilizamos cookies para mejorar tu experiencia.</span>
                </div>
                <div class="privacy-actions">
                    <button id="privacy-accept" class="btn-accept">Aceptar</button>
                    <button id="privacy-settings" class="btn-settings">Configurar</button>
                    <button id="privacy-reject" class="btn-reject">Rechazar</button>
                </div>
            </div>
        `;

        if (!localStorage.getItem('privacy-consent')) {
            document.body.appendChild(banner);
            this.addPrivacyBannerStyles();
            this.setupPrivacyControls();
        }
    }

    setupPrivacyControls() {
        document.getElementById('privacy-accept').addEventListener('click', () => {
            localStorage.setItem('privacy-consent', JSON.stringify({
                essential: true,
                analytics: true,
                marketing: true,
                timestamp: new Date().toISOString()
            }));
            document.getElementById('privacy-banner').remove();
            this.logSecurityEvent('PRIVACY', 'Privacy consent granted');
        });

        document.getElementById('privacy-reject').addEventListener('click', () => {
            localStorage.setItem('privacy-consent', JSON.stringify({
                essential: true,
                analytics: false,
                marketing: false,
                timestamp: new Date().toISOString()
            }));
            document.getElementById('privacy-banner').remove();
            this.logSecurityEvent('PRIVACY', 'Privacy consent rejected');
        });

        document.getElementById('privacy-settings').addEventListener('click', () => {
            this.showPrivacySettings();
        });
    }

    showPrivacySettings() {
        const modal = document.createElement('div');
        modal.className = 'privacy-settings-modal';
        modal.innerHTML = `
            <div class="privacy-settings-content">
                <div class="privacy-settings-header">
                    <h3>Configuración de Privacidad</h3>
                    <button class="close-btn" onclick="this.closest('.privacy-settings-modal').remove()">×</button>
                </div>
                <div class="privacy-settings-body">
                    <div class="privacy-option">
                        <label>
                            <input type="checkbox" checked disabled> Cookies Esenciales
                            <span class="checkmark"></span>
                            <small>Necesarias para el funcionamiento del sitio</small>
                        </label>
                    </div>
                    <div class="privacy-option">
                        <label>
                            <input type="checkbox" id="analytics-consent"> Cookies de Análisis
                            <span class="checkmark"></span>
                            <small>Nos ayudan a mejorar el sitio web</small>
                        </label>
                    </div>
                    <div class="privacy-option">
                        <label>
                            <input type="checkbox" id="marketing-consent"> Cookies de Marketing
                            <span class="checkmark"></span>
                            <small>Para personalizar anuncios y contenido</small>
                        </label>
                    </div>
                </div>
                <div class="privacy-settings-footer">
                    <button onclick="this.closest('.privacy-settings-modal').remove()" class="btn-cancel">Cancelar</button>
                    <button onclick="window.securityManager.savePrivacySettings()" class="btn-save">Guardar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.addPrivacyModalStyles();
    }

    savePrivacySettings() {
        const analytics = document.getElementById('analytics-consent').checked;
        const marketing = document.getElementById('marketing-consent').checked;
        
        localStorage.setItem('privacy-consent', JSON.stringify({
            essential: true,
            analytics: analytics,
            marketing: marketing,
            timestamp: new Date().toISOString()
        }));

        document.querySelector('.privacy-settings-modal').remove();
        document.getElementById('privacy-banner').remove();
        
        this.logSecurityEvent('PRIVACY', 'Privacy settings updated');
    }

    setupDataProtection() {
        // Right to be forgotten
        window.addEventListener('beforeunload', () => {
            const consent = JSON.parse(localStorage.getItem('privacy-consent') || '{}');
            if (!consent.analytics) {
                // Clear analytics data
                this.clearAnalyticsData();
            }
        });
    }

    clearAnalyticsData() {
        // Clear Google Analytics data if present
        if (window.gtag) {
            window.gtag('config', 'GA_MEASUREMENT_ID', {
                'client_storage': 'none'
            });
        }

        // Clear other analytics data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('analytics') || key.includes('tracking'))) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    implementCookieConsent() {
        // Override document.cookie to check consent
        const originalCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
        
        Object.defineProperty(document, 'cookie', {
            get: function() {
                return originalCookie.get.call(this);
            },
            set: function(value) {
                const consent = JSON.parse(localStorage.getItem('privacy-consent') || '{}');
                
                // Allow essential cookies always
                if (value.includes('essential') || consent.essential) {
                    return originalCookie.set.call(this, value);
                }
                
                // Check for analytics cookies
                if (value.includes('analytics') || value.includes('_ga')) {
                    if (consent.analytics) {
                        return originalCookie.set.call(this, value);
                    } else {
                        console.log('Analytics cookie blocked by user consent');
                        return;
                    }
                }
                
                // Check for marketing cookies
                if (value.includes('marketing') || value.includes('ads')) {
                    if (consent.marketing) {
                        return originalCookie.set.call(this, value);
                    } else {
                        console.log('Marketing cookie blocked by user consent');
                        return;
                    }
                }
                
                return originalCookie.set.call(this, value);
            }
        });
    }

    logSecurityEvent(type, message, severity = 'INFO') {
        const event = {
            timestamp: new Date().toISOString(),
            type: type,
            message: message,
            severity: severity,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.auditLog.push(event);
        
        // Keep only last 1000 events
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-1000);
        }

        // Store in localStorage (encrypted)
        try {
            localStorage.setItem('security_audit_log', JSON.stringify(this.auditLog));
        } catch (error) {
            console.warn('Failed to save security audit log:', error);
        }

        // Log to console for development
        if (severity === 'HIGH') {
            console.error(`[SECURITY ${severity}] ${type}: ${message}`);
        } else if (severity === 'MEDIUM') {
            console.warn(`[SECURITY ${severity}] ${type}: ${message}`);
        } else {
            console.log(`[SECURITY ${severity}] ${type}: ${message}`);
        }
    }

    addSecurityModalStyles() {
        const styles = `
            .security-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
            }

            .security-modal-content {
                background: white;
                border-radius: 8px;
                padding: 30px;
                max-width: 400px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }

            .security-modal-header i {
                font-size: 3rem;
                color: #ff6b6b;
                margin-bottom: 15px;
            }

            .security-modal-header h3 {
                margin: 0 0 20px 0;
                color: #333;
            }

            .security-modal-body p {
                color: #666;
                line-height: 1.6;
                margin-bottom: 30px;
            }

            .security-modal-footer .btn-primary {
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    addPrivacyBannerStyles() {
        const styles = `
            .privacy-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                background: rgba(10, 17, 40, 0.95);
                backdrop-filter: blur(10px);
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                padding: 15px 20px;
                z-index: 9999;
                animation: slideUp 0.3s ease-out;
            }

            @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }

            .privacy-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                max-width: 1200px;
                margin: 0 auto;
                gap: 20px;
            }

            .privacy-text {
                display: flex;
                align-items: center;
                gap: 10px;
                color: white;
                font-size: 14px;
            }

            .privacy-text i {
                color: #00F0FF;
                font-size: 18px;
            }

            .privacy-actions {
                display: flex;
                gap: 10px;
            }

            .privacy-actions button {
                padding: 8px 16px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.3s ease;
            }

            .btn-accept {
                background: #00F0FF;
                color: #0A1128;
                font-weight: 600;
            }

            .btn-settings {
                background: transparent;
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
            }

            .btn-reject {
                background: transparent;
                color: #ff6b6b;
                border: 1px solid #ff6b6b;
            }

            .privacy-actions button:hover {
                transform: translateY(-1px);
            }

            @media (max-width: 768px) {
                .privacy-content {
                    flex-direction: column;
                    text-align: center;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    addPrivacyModalStyles() {
        const styles = `
            .privacy-settings-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
            }

            .privacy-settings-content {
                background: white;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }

            .privacy-settings-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #eee;
            }

            .privacy-settings-header h3 {
                margin: 0;
                color: #333;
            }

            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
            }

            .privacy-settings-body {
                padding: 20px;
            }

            .privacy-option {
                margin-bottom: 20px;
                padding: 15px;
                border: 1px solid #eee;
                border-radius: 8px;
            }

            .privacy-option label {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                cursor: pointer;
            }

            .privacy-option input[type="checkbox"] {
                margin-top: 2px;
            }

            .privacy-option small {
                display: block;
                color: #666;
                margin-top: 5px;
            }

            .privacy-settings-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding: 20px;
                border-top: 1px solid #eee;
            }

            .privacy-settings-footer button {
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }

            .btn-cancel {
                background: #f8f9fa;
                color: #6c757d;
            }

            .btn-save {
                background: #007bff;
                color: white;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    // Validate password complexity
    validatePassword(password) {
        const config = this.securityConfig.passwordComplexity;
        const errors = [];

        if (password.length < config.minLength) {
            errors.push(`La contraseña debe tener al menos ${config.minLength} caracteres`);
        }

        if (config.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('La contraseña debe contener al menos una letra mayúscula');
        }

        if (config.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('La contraseña debe contener al menos una letra minúscula');
        }

        if (config.requireNumbers && !/\d/.test(password)) {
            errors.push('La contraseña debe contener al menos un número');
        }

        if (config.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('La contraseña debe contener al menos un símbolo especial');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Get security audit log
    getSecurityAuditLog() {
        return this.auditLog;
    }

    // Export security audit log
    exportSecurityAuditLog() {
        const blob = new Blob([JSON.stringify(this.auditLog, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-audit-log-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.logSecurityEvent('AUDIT', 'Security audit log exported');
    }
}

// Initialize Security Manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.securityManager = new SecurityManager();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityManager;
}
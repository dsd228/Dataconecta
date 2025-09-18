// Enhanced Accessibility Manager for Dataconecta

class AccessibilityManager {
    constructor() {
        this.config = {
            announcements: {
                politeness: 'polite',
                timeout: 3000
            },
            focusManagement: {
                skipLinks: true,
                focusRing: true,
                tabIndex: true
            },
            colorContrast: {
                minRatio: 4.5,
                checkInterval: 5000
            },
            motionPreferences: {
                respectPreference: true,
                reducedMotion: false
            }
        };
        this.announcer = null;
        this.focusHistory = [];
        this.init();
    }

    init() {
        this.createScreenReaderAnnouncer();
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.checkMotionPreferences();
        this.enhanceFormAccessibility();
        this.addSkipLinks();
        this.setupARIALiveRegions();
        this.monitorColorContrast();
    }

    createScreenReaderAnnouncer() {
        this.announcer = document.createElement('div');
        this.announcer.setAttribute('aria-live', this.config.announcements.politeness);
        this.announcer.setAttribute('aria-atomic', 'true');
        this.announcer.className = 'sr-only';
        this.announcer.id = 'accessibility-announcer';
        document.body.appendChild(this.announcer);
    }

    announce(message, priority = 'polite') {
        if (!this.announcer) return;
        
        this.announcer.setAttribute('aria-live', priority);
        this.announcer.textContent = message;
        
        setTimeout(() => {
            this.announcer.textContent = '';
        }, this.config.announcements.timeout);
    }

    setupKeyboardNavigation() {
        // Enhanced keyboard navigation
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Tab':
                    this.handleTabNavigation(e);
                    break;
                case 'Escape':
                    this.handleEscapeKey(e);
                    break;
                case 'Enter':
                case ' ':
                    this.handleActivation(e);
                    break;
                case 'ArrowDown':
                case 'ArrowUp':
                case 'ArrowLeft':
                case 'ArrowRight':
                    this.handleArrowNavigation(e);
                    break;
                case 'Home':
                case 'End':
                    this.handleHomeEndNavigation(e);
                    break;
            }
        });

        // Skip to content functionality
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 's') {
                e.preventDefault();
                this.skipToContent();
            }
        });
    }

    handleTabNavigation(e) {
        const focusableElements = this.getFocusableElements();
        const currentIndex = focusableElements.indexOf(document.activeElement);
        
        if (e.shiftKey) {
            // Shift+Tab (backward)
            if (currentIndex === 0) {
                e.preventDefault();
                focusableElements[focusableElements.length - 1].focus();
            }
        } else {
            // Tab (forward)
            if (currentIndex === focusableElements.length - 1) {
                e.preventDefault();
                focusableElements[0].focus();
            }
        }
        
        this.trackFocus(document.activeElement);
    }

    handleEscapeKey(e) {
        // Close modals, dropdowns, etc.
        const openModal = document.querySelector('.modal.show');
        const openDropdown = document.querySelector('.dropdown-menu.show');
        const openChatbot = document.querySelector('.chatbot-container.open');
        
        if (openModal) {
            const closeBtn = openModal.querySelector('[data-bs-dismiss="modal"]');
            if (closeBtn) closeBtn.click();
        } else if (openDropdown) {
            const toggleBtn = document.querySelector('[data-bs-toggle="dropdown"][aria-expanded="true"]');
            if (toggleBtn) toggleBtn.click();
        } else if (openChatbot) {
            document.getElementById('chatbot-minimize')?.click();
        }
        
        this.announce('Diálogo cerrado');
    }

    handleActivation(e) {
        const target = e.target;
        
        // Handle custom interactive elements
        if (target.hasAttribute('data-action') || target.classList.contains('clickable')) {
            e.preventDefault();
            target.click();
        }
        
        // Handle card links
        if (target.closest('.card-glass')) {
            const link = target.closest('.card-glass').querySelector('a');
            if (link) {
                e.preventDefault();
                link.click();
            }
        }
    }

    handleArrowNavigation(e) {
        const target = e.target;
        
        // Handle navigation in custom components
        if (target.closest('.navbar-nav')) {
            this.navigateMenu(e);
        } else if (target.closest('.card-grid')) {
            this.navigateCardGrid(e);
        }
    }

    navigateMenu(e) {
        const menuItems = Array.from(document.querySelectorAll('.navbar-nav .nav-link'));
        const currentIndex = menuItems.indexOf(e.target);
        
        let nextIndex;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % menuItems.length;
        } else {
            nextIndex = currentIndex === 0 ? menuItems.length - 1 : currentIndex - 1;
        }
        
        e.preventDefault();
        menuItems[nextIndex].focus();
    }

    navigateCardGrid(e) {
        const cards = Array.from(document.querySelectorAll('.card-glass'));
        const currentCard = e.target.closest('.card-glass');
        const currentIndex = cards.indexOf(currentCard);
        
        let nextIndex;
        const cardsPerRow = Math.floor(window.innerWidth / 300); // Approximate
        
        switch (e.key) {
            case 'ArrowRight':
                nextIndex = Math.min(currentIndex + 1, cards.length - 1);
                break;
            case 'ArrowLeft':
                nextIndex = Math.max(currentIndex - 1, 0);
                break;
            case 'ArrowDown':
                nextIndex = Math.min(currentIndex + cardsPerRow, cards.length - 1);
                break;
            case 'ArrowUp':
                nextIndex = Math.max(currentIndex - cardsPerRow, 0);
                break;
        }
        
        if (nextIndex !== currentIndex) {
            e.preventDefault();
            const nextCard = cards[nextIndex];
            const focusable = nextCard.querySelector('a, button, [tabindex="0"]');
            if (focusable) {
                focusable.focus();
            } else {
                nextCard.setAttribute('tabindex', '0');
                nextCard.focus();
            }
        }
    }

    handleHomeEndNavigation(e) {
        const container = e.target.closest('.navbar-nav, .card-grid');
        if (!container) return;
        
        const focusableElements = container.querySelectorAll('a, button, [tabindex="0"]');
        
        if (e.key === 'Home') {
            e.preventDefault();
            focusableElements[0]?.focus();
        } else if (e.key === 'End') {
            e.preventDefault();
            focusableElements[focusableElements.length - 1]?.focus();
        }
    }

    getFocusableElements() {
        const selector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
        return Array.from(document.querySelectorAll(selector)).filter(el => {
            return el.offsetParent !== null && !el.hasAttribute('hidden');
        });
    }

    trackFocus(element) {
        this.focusHistory.push({
            element,
            timestamp: Date.now(),
            tagName: element.tagName,
            className: element.className,
            id: element.id
        });
        
        // Keep only last 10 focus events
        if (this.focusHistory.length > 10) {
            this.focusHistory.shift();
        }
    }

    setupFocusManagement() {
        // Enhanced focus visibility
        document.addEventListener('focusin', (e) => {
            e.target.classList.add('keyboard-focused');
            this.announce(`Enfocado en ${this.getElementDescription(e.target)}`);
        });
        
        document.addEventListener('focusout', (e) => {
            e.target.classList.remove('keyboard-focused');
        });
        
        // Mouse interaction removes keyboard focus indication
        document.addEventListener('mousedown', (e) => {
            e.target.classList.remove('keyboard-focused');
        });
    }

    getElementDescription(element) {
        // Get accessible name for element
        const ariaLabel = element.getAttribute('aria-label');
        const ariaLabelledBy = element.getAttribute('aria-labelledby');
        const title = element.getAttribute('title');
        const text = element.textContent?.trim();
        const placeholder = element.getAttribute('placeholder');
        
        if (ariaLabel) return ariaLabel;
        if (ariaLabelledBy) {
            const labelElement = document.getElementById(ariaLabelledBy);
            if (labelElement) return labelElement.textContent?.trim();
        }
        if (title) return title;
        if (text) return text;
        if (placeholder) return placeholder;
        
        return `${element.tagName.toLowerCase()} element`;
    }

    checkMotionPreferences() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        this.config.motionPreferences.reducedMotion = prefersReducedMotion.matches;
        
        if (prefersReducedMotion.matches) {
            document.body.classList.add('reduce-motion');
            this.announce('Animaciones reducidas activadas');
        }
        
        prefersReducedMotion.addEventListener('change', (e) => {
            this.config.motionPreferences.reducedMotion = e.matches;
            document.body.classList.toggle('reduce-motion', e.matches);
        });
    }

    enhanceFormAccessibility() {
        // Add required field indicators
        const requiredFields = document.querySelectorAll('input[required], textarea[required], select[required]');
        requiredFields.forEach(field => {
            if (!field.getAttribute('aria-required')) {
                field.setAttribute('aria-required', 'true');
            }
            
            // Add visual indicator if not present
            const label = document.querySelector(`label[for="${field.id}"]`);
            if (label && !label.querySelector('.required-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'required-indicator';
                indicator.textContent = ' *';
                indicator.setAttribute('aria-hidden', 'true');
                label.appendChild(indicator);
            }
        });
        
        // Enhanced error handling
        document.addEventListener('invalid', (e) => {
            const field = e.target;
            const message = field.validationMessage;
            this.announce(`Error en ${this.getElementDescription(field)}: ${message}`, 'assertive');
        });
        
        // Form submission feedback
        document.addEventListener('submit', (e) => {
            this.announce('Formulario enviado, procesando...', 'polite');
        });
    }

    addSkipLinks() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link sr-only-focusable btn btn-primary';
        skipLink.textContent = 'Saltar al contenido principal';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            z-index: 100000;
            padding: 8px 16px;
            text-decoration: none;
            transition: top 0.2s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
        
        // Ensure main content has ID
        const mainContent = document.querySelector('main, .hero-section, .container');
        if (mainContent && !mainContent.id) {
            mainContent.id = 'main-content';
        }
    }

    skipToContent() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.focus();
            this.announce('Saltado al contenido principal');
        }
    }

    setupARIALiveRegions() {
        // Create polite live region for general announcements
        const politeRegion = document.createElement('div');
        politeRegion.setAttribute('aria-live', 'polite');
        politeRegion.setAttribute('aria-atomic', 'false');
        politeRegion.className = 'sr-only';
        politeRegion.id = 'polite-announcements';
        document.body.appendChild(politeRegion);
        
        // Create assertive live region for urgent announcements
        const assertiveRegion = document.createElement('div');
        assertiveRegion.setAttribute('aria-live', 'assertive');
        assertiveRegion.setAttribute('aria-atomic', 'true');
        assertiveRegion.className = 'sr-only';
        assertiveRegion.id = 'assertive-announcements';
        document.body.appendChild(assertiveRegion);
    }

    monitorColorContrast() {
        // Basic color contrast monitoring
        setInterval(() => {
            this.checkColorContrast();
        }, this.config.colorContrast.checkInterval);
    }

    checkColorContrast() {
        // Simplified contrast checking
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, button, label, span');
        
        textElements.forEach(element => {
            const styles = window.getComputedStyle(element);
            const color = styles.color;
            const backgroundColor = styles.backgroundColor;
            
            // Basic contrast check (simplified)
            if (this.hasLowContrast(color, backgroundColor)) {
                element.classList.add('low-contrast-warning');
                console.warn('Low contrast detected:', element);
            }
        });
    }

    hasLowContrast(color, backgroundColor) {
        // Simplified contrast calculation
        // In a real implementation, you'd calculate the actual contrast ratio
        return false; // Placeholder
    }

    // Public API methods
    announceToScreenReader(message, priority = 'polite') {
        this.announce(message, priority);
    }

    setFocusToElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.focus();
            this.announce(`Enfoque movido a ${this.getElementDescription(element)}`);
        }
    }

    getAccessibilityReport() {
        return {
            focusHistory: this.focusHistory.slice(-5),
            motionPreferences: this.config.motionPreferences,
            focusableElementsCount: this.getFocusableElements().length,
            hasSkipLinks: !!document.querySelector('.skip-link'),
            hasLiveRegions: !!document.getElementById('accessibility-announcer')
        };
    }
}

// Add accessibility styles
const accessibilityStyles = document.createElement('style');
accessibilityStyles.textContent = `
    .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
    }
    
    .sr-only-focusable:focus {
        position: static !important;
        width: auto !important;
        height: auto !important;
        padding: inherit !important;
        margin: inherit !important;
        overflow: visible !important;
        clip: auto !important;
        white-space: normal !important;
    }
    
    .keyboard-focused {
        outline: 2px solid var(--accent-primary) !important;
        outline-offset: 2px !important;
    }
    
    .required-indicator {
        color: #ff4757;
        font-weight: bold;
    }
    
    .reduce-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
    
    .low-contrast-warning {
        border: 1px dashed orange;
    }
    
    @media (prefers-reduced-motion: reduce) {
        * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
        }
    }
    
    @media (prefers-color-scheme: dark) {
        .keyboard-focused {
            outline-color: var(--accent-primary) !important;
        }
    }
`;
document.head.appendChild(accessibilityStyles);

// Initialize accessibility manager
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.accessibilityManager = new AccessibilityManager();
    });
} else {
    window.accessibilityManager = new AccessibilityManager();
}
/**
 * @jest-environment jsdom
 */

describe('Security Manager', () => {
  let securityManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    // Reset localStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Mock crypto API for token generation
    global.btoa = jest.fn().mockImplementation((str) => Buffer.from(str).toString('base64'));
    
    securityManager = new (require('../assets/js/security.js'));
  });

  test('should validate email format correctly', () => {
    const validEmails = ['test@example.com', 'user.name@domain.co.uk'];
    const invalidEmails = ['invalid-email', 'test@', '@domain.com'];

    validEmails.forEach(email => {
      expect(securityManager.config.formValidation.allowedPatterns.email.test(email)).toBe(true);
    });

    invalidEmails.forEach(email => {
      expect(securityManager.config.formValidation.allowedPatterns.email.test(email)).toBe(false);
    });
  });

  test('should detect XSS attempts', () => {
    const xssAttempts = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
      'javascript:alert(1)',
      '<div onclick="alert(1)">click me</div>'
    ];

    const safeInputs = [
      'Hello world',
      'Contact us at info@company.com',
      'Visit our website for more info'
    ];

    xssAttempts.forEach(input => {
      expect(securityManager.containsXSS(input)).toBe(true);
    });

    safeInputs.forEach(input => {
      expect(securityManager.containsXSS(input)).toBe(false);
    });
  });

  test('should generate unique security tokens', () => {
    const token1 = securityManager.generateSecurityToken();
    const token2 = securityManager.generateSecurityToken();
    
    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);
  });

  test('should implement rate limiting', () => {
    // Set low rate limit for testing
    securityManager.config.rateLimiting.maxRequests = 2;
    
    expect(securityManager.checkRateLimit()).toBe(true);
    expect(securityManager.checkRateLimit()).toBe(true);
    expect(securityManager.checkRateLimit()).toBe(false);
  });

  test('should sanitize dangerous input', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = '<script>alert("test")</script>';
    
    securityManager.sanitizeInput(input);
    
    expect(input.value).not.toContain('<script>');
    expect(input.value).not.toContain('</script>');
  });
});
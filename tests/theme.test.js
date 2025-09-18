/**
 * @jest-environment jsdom
 */

describe('Theme Functionality', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.className = '';
  });

  test('should apply dark mode when system preference is dark', () => {
    // Mock matchMedia to return dark mode preference
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    // Load and execute theme.js
    require('../assets/js/theme.js');
    
    expect(document.body.classList.contains('dark-mode')).toBe(true);
  });

  test('should not apply dark mode when system preference is light', () => {
    // Mock matchMedia to return light mode preference
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    // Load and execute theme.js
    require('../assets/js/theme.js');
    
    expect(document.body.classList.contains('dark-mode')).toBe(false);
  });
});
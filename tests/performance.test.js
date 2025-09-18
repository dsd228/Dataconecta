/**
 * @jest-environment jsdom
 */

describe('Performance Monitor', () => {
  let performanceMonitor;

  beforeEach(() => {
    // Mock performance API
    global.performance = {
      now: jest.fn(() => Date.now()),
      getEntriesByType: jest.fn(() => []),
      mark: jest.fn(),
      measure: jest.fn()
    };

    // Mock PerformanceObserver
    global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
      observe: jest.fn(),
      disconnect: jest.fn()
    }));

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    global.localStorage = localStorageMock;

    performanceMonitor = new (require('../assets/js/performance-monitor.js'));
  });

  test('should initialize with default metrics', () => {
    expect(performanceMonitor.metrics).toBeDefined();
    expect(performanceMonitor.metrics.pageLoadTime).toBe(0);
    expect(performanceMonitor.metrics.errorsCount).toBe(0);
    expect(performanceMonitor.metrics.userInteractions).toBe(0);
  });

  test('should generate performance grade', () => {
    performanceMonitor.metrics.largestContentfulPaint = 2000;
    performanceMonitor.metrics.firstInputDelay = 50;
    performanceMonitor.metrics.cumulativeLayoutShift = 0.05;
    performanceMonitor.metrics.pageLoadTime = 2500;
    performanceMonitor.metrics.errorsCount = 0;

    const grade = performanceMonitor.getPerformanceGrade();
    expect(grade).toBeGreaterThan(80);
    expect(grade).toBeLessThanOrEqual(100);
  });

  test('should generate recommendations based on metrics', () => {
    performanceMonitor.metrics.largestContentfulPaint = 5000;
    performanceMonitor.metrics.firstInputDelay = 200;
    performanceMonitor.metrics.cumulativeLayoutShift = 0.2;

    const recommendations = performanceMonitor.getRecommendations();
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]).toContain('Largest Contentful Paint');
  });

  test('should track user interactions', () => {
    const initialCount = performanceMonitor.metrics.userInteractions;
    
    // Simulate click event
    const clickEvent = new Event('click');
    document.dispatchEvent(clickEvent);
    
    expect(performanceMonitor.metrics.userInteractions).toBe(initialCount + 1);
  });

  test('should generate session ID', () => {
    const sessionId1 = performanceMonitor.getSessionId();
    const sessionId2 = performanceMonitor.getSessionId();
    
    expect(sessionId1).toBeDefined();
    expect(sessionId1).toBe(sessionId2); // Should be consistent within session
  });

  test('should store metrics in localStorage', () => {
    const testData = { test: 'data' };
    performanceMonitor.storeMetrics(testData);
    
    expect(localStorage.setItem).toHaveBeenCalled();
  });
});
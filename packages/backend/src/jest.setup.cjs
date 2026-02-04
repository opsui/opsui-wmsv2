/**
 * Jest setup file
 *
 * This file is run once before all tests and can be used for:
 * - Setting up test globals
 * - Cleaning up resources after all tests
 */

// Store interval IDs for cleanup
const intervals = [];

// Store the original setInterval to monkey-patch it
const originalSetInterval = global.setInterval;

// Monkey-patch setInterval to track all intervals created during tests
global.setInterval = function (...args) {
  const intervalId = originalSetInterval.apply(this, args);
  intervals.push(intervalId);
  return intervalId;
};

// Cleanup function to clear all tracked intervals
function cleanupIntervals() {
  for (const intervalId of intervals) {
    clearInterval(intervalId);
  }
  intervals.length = 0; // Clear the array
}

// Cleanup after each test suite
afterEach(() => {
  // Clear any intervals created during the test
  // This is important because routes load middleware which creates intervals
  cleanupIntervals();
});

// Cleanup after all tests complete
afterAll(() => {
  // Final cleanup
  cleanupIntervals();

  // Give a small delay for cleanup to complete
  return new Promise((resolve) => setTimeout(resolve, 100));
});

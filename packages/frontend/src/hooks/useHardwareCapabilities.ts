/**
 * Hardware Capabilities Detection Hook
 *
 * Detects device capabilities to automatically enable performance mode
 * for lower-end devices. This ensures buttery smooth performance on
 * older hardware like Intel i5-4570 with integrated graphics.
 *
 * Detection criteria:
 * - CPU cores (navigator.hardwareConcurrency)
 * - Device memory (navigator.deviceMemory)
 * - GPU renderer (WebGL detection for integrated vs discrete)
 * - Battery status (power saving mode)
 * - Screen refresh rate detection
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface HardwareCapabilities {
  /** Number of logical CPU cores */
  cpuCores: number;
  /** Device memory in GB (approximate) */
  deviceMemory: number;
  /** Whether the GPU is likely integrated (Intel HD, AMD APU, etc.) */
  isIntegratedGPU: boolean;
  /** GPU renderer string if detectable */
  gpuRenderer: string | null;
  /** Whether the device is on battery power */
  isOnBattery: boolean;
  /** Whether the device is in low-power mode */
  isLowPowerMode: boolean;
  /** Estimated refresh rate of the display */
  refreshRate: number;
  /** Overall performance tier: 'high', 'medium', 'low' */
  performanceTier: 'high' | 'medium' | 'low';
  /** Whether performance mode should be enabled */
  shouldUsePerformanceMode: boolean;
}

interface HardwareInfo {
  cpuCores: number;
  deviceMemory: number;
  isIntegratedGPU: boolean;
  gpuRenderer: string | null;
}

/**
 * Detect GPU information via WebGL
 */
function detectGPU(): { isIntegrated: boolean; renderer: string | null } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      return { isIntegrated: true, renderer: null }; // Assume integrated if WebGL not available
    }

    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');

    if (!debugInfo) {
      return { isIntegrated: true, renderer: null };
    }

    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

    // Detect integrated GPUs by common patterns
    const integratedPatterns = [
      /Intel.*HD Graphics/i,
      /Intel.*UHD Graphics/i,
      /Intel.*Iris/i,
      /Intel.*Graphics/i,
      /AMD.*Radeon.*Vega.*[0-9]/i, // APUs
      /AMD.*Radeon.*R[0-9]/i, // Older APUs
      /Microsoft Basic Render/i,
      /SwiftShader/i,
      /llvmpipe/i,
      /Mesa/i,
    ];

    const isIntegrated = integratedPatterns.some(pattern => pattern.test(renderer));

    return { isIntegrated, renderer };
  } catch (e) {
    // WebGL not supported or blocked
    return { isIntegrated: true, renderer: null };
  }
}

/**
 * Get basic hardware info synchronously
 */
function getHardwareInfo(): HardwareInfo {
  const cpuCores = navigator.hardwareConcurrency || 2;
  const deviceMemory = (navigator as any).deviceMemory || 4;
  const gpuInfo = detectGPU();

  return {
    cpuCores,
    deviceMemory,
    isIntegratedGPU: gpuInfo.isIntegrated,
    gpuRenderer: gpuInfo.renderer,
  };
}

/**
 * Estimate display refresh rate using requestAnimationFrame
 */
function estimateRefreshRate(): Promise<number> {
  return new Promise(resolve => {
    let frameCount = 0;
    let lastTime = performance.now();
    const minFrames = 30;
    const maxDuration = 2000; // 2 seconds max

    function countFrames(currentTime: number) {
      frameCount++;

      if (frameCount < minFrames && currentTime - lastTime < maxDuration) {
        requestAnimationFrame(countFrames);
      } else {
        const duration = currentTime - lastTime;
        const fps = (frameCount / duration) * 1000;
        // Round to common refresh rates (60, 75, 120, 144)
        const roundedFps = Math.round(fps / 15) * 15;
        resolve(Math.min(roundedFps, 144));
      }
    }

    lastTime = performance.now();
    requestAnimationFrame(countFrames);
  });
}

/**
 * Calculate performance tier based on hardware
 */
function calculatePerformanceTier(hardware: HardwareInfo): 'high' | 'medium' | 'low' {
  let score = 0;

  // CPU scoring (more cores = better)
  if (hardware.cpuCores >= 8) score += 3;
  else if (hardware.cpuCores >= 4) score += 2;
  else if (hardware.cpuCores >= 2) score += 1;

  // Memory scoring
  if (hardware.deviceMemory >= 16) score += 3;
  else if (hardware.deviceMemory >= 8) score += 2;
  else if (hardware.deviceMemory >= 4) score += 1;

  // GPU scoring (discrete = better)
  if (!hardware.isIntegratedGPU) score += 3;
  else score += 0; // Integrated GPUs get 0 points

  // Determine tier
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

/**
 * Hook to detect hardware capabilities and determine if performance mode should be used
 */
export function useHardwareCapabilities(): HardwareCapabilities {
  const [capabilities, setCapabilities] = useState<HardwareCapabilities>(() => {
    // Initialize with safe defaults
    return {
      cpuCores: 2,
      deviceMemory: 4,
      isIntegratedGPU: true,
      gpuRenderer: null,
      isOnBattery: false,
      isLowPowerMode: false,
      refreshRate: 60,
      performanceTier: 'medium',
      shouldUsePerformanceMode: false,
    };
  });

  // Cache refresh rate — running the RAF loop every visibilitychange is wasteful
  // since the display refresh rate doesn't change when switching tabs.
  const cachedRefreshRate = useRef<number | null>(null);

  const updateCapabilities = useCallback(async () => {
    const hardware = getHardwareInfo();
    const tier = calculatePerformanceTier(hardware);

    // Check battery status
    let isOnBattery = false;
    let isLowPowerMode = false;

    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        isOnBattery = !battery.charging;
        // Some browsers support low power mode detection
        isLowPowerMode = battery.dischargingTime < Infinity && battery.level < 0.2;
      }
    } catch (e) {
      // Battery API not available
    }

    // Estimate refresh rate only once — the display rate doesn't change between tab switches
    if (cachedRefreshRate.current === null) {
      try {
        cachedRefreshRate.current = await estimateRefreshRate();
      } catch (e) {
        cachedRefreshRate.current = 60;
      }
    }
    const refreshRate = cachedRefreshRate.current;

    // Determine if performance mode should be enabled.
    // deviceMemory API may return undefined on older browsers — treat undefined as low-memory.
    const mem = hardware.deviceMemory ?? 4;
    const shouldUsePerformanceMode =
      tier === 'low' ||
      tier === 'medium' ||
      hardware.isIntegratedGPU ||
      mem <= 8 ||
      hardware.cpuCores <= 4 ||
      (isOnBattery && isLowPowerMode) ||
      (hardware.gpuRenderer?.includes('HD Graphics') &&
        !hardware.gpuRenderer?.includes('HD Graphics 5')) ||
      hardware.gpuRenderer?.includes('UHD Graphics') ||
      hardware.gpuRenderer?.includes('Mesa') ||
      hardware.gpuRenderer?.includes('Intel');

    setCapabilities({
      cpuCores: hardware.cpuCores,
      deviceMemory: hardware.deviceMemory,
      isIntegratedGPU: hardware.isIntegratedGPU,
      gpuRenderer: hardware.gpuRenderer,
      isOnBattery,
      isLowPowerMode,
      refreshRate,
      performanceTier: tier,
      shouldUsePerformanceMode,
    });

    // Apply performance mode class to HTML element
    if (shouldUsePerformanceMode) {
      document.documentElement.classList.add('performance-mode');
      console.log('[Performance] Performance mode ENABLED for this device', {
        tier,
        cpuCores: hardware.cpuCores,
        deviceMemory: hardware.deviceMemory,
        gpuRenderer: hardware.gpuRenderer,
        isIntegratedGPU: hardware.isIntegratedGPU,
      });
    } else {
      document.documentElement.classList.remove('performance-mode');
      console.log('[Performance] Performance mode NOT needed - device is capable');
    }
  }, []);

  useEffect(() => {
    updateCapabilities();

    // Re-check on visibility change (in case user switches tabs/windows)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateCapabilities();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateCapabilities]);

  return capabilities;
}

/**
 * Simple hook to just check if performance mode is enabled
 */
export function useIsPerformanceMode(): boolean {
  const [isPerformanceMode, setIsPerformanceMode] = useState(false);

  useEffect(() => {
    // Check if performance-mode class is on html element
    const checkPerformanceMode = () => {
      setIsPerformanceMode(document.documentElement.classList.contains('performance-mode'));
    };

    checkPerformanceMode();

    // Observe class changes
    const observer = new MutationObserver(checkPerformanceMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isPerformanceMode;
}

export default useHardwareCapabilities;

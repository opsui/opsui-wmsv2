/**
 * Route Optimization Service
 *
 * Implements algorithms for optimizing warehouse picking routes:
 * - Traveling Salesman Problem (TSP) solver for optimal route
 * - Nearest Neighbor heuristic (fast approximation)
 * - Zone-based optimization
 * - Aisle-by-aisle traversal (S-shape)
 *
 * References:
 * - TSP for Warehouse Order Picking Optimization
 * - Meta-Heuristic Algorithms for Order Picking
 *
 * @see https://www.researchgate.net/publication/374910922_TSP_for_Warehouse_Order_Picking_Optimization_and_Simulation
 */

// ============================================================================
// TYPES
// ============================================================================

export interface BinLocation {
  location: string; // Format: Z-A-S (Zone-Aisle-Shelf), e.g., A-12-03
  zone: string;
  aisle: number;
  shelf: number;
  side?: 'L' | 'R'; // Left or right side of aisle
}

export interface PickTask {
  taskId: string;
  orderId: string;
  sku: string;
  quantity: number;
  binLocation: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  weight?: number; // For weighted optimization
}

export interface OptimizedRoute {
  tasks: OptimizedPickTask[];
  totalDistance: number; // In warehouse units (meters or feet)
  estimatedTime: number; // In seconds
  waypoints: Waypoint[];
  algorithm: string;
}

export interface OptimizedPickTask extends PickTask {
  sequence: number;
  fromLocation: string;
  toLocation: string;
  distance: number;
  estimatedTime: number;
}

export interface Waypoint {
  location: string;
  type: 'start' | 'pickup' | 'end';
  sequence: number;
  coordinates: { x: number; y: number; z?: number };
}

export interface WarehouseConfig {
  aisleWidth: number; // Distance between aisles
  shelfDepth: number; // Depth of shelving units
  shelfHeight: number; // Height between shelves
  walkingSpeed: number; // Meters per second
  pickTime: number; // Average time per pick (seconds)
  zoneLayout: {
    [zone: string]: {
      startAisle: number;
      endAisle: number;
      x: number;
      y: number;
    };
  };
}

// ============================================================================
// ROUTE OPTIMIZATION SERVICE
// ============================================================================

class RouteOptimizationService {
  private config: WarehouseConfig;

  constructor(config?: Partial<WarehouseConfig>) {
    this.config = {
      aisleWidth: 3.0, // 3 meters between aisles
      shelfDepth: 1.0, // 1 meter shelf depth
      shelfHeight: 0.5, // 0.5 meters between shelves
      walkingSpeed: 1.4, // Average walking speed (m/s)
      pickTime: 15, // 15 seconds average per pick
      zoneLayout: this.getDefaultZoneLayout(),
      ...config,
    };
  }

  /**
   * Optimize picking route using best available algorithm
   */
  optimizeRoute(
    tasks: PickTask[],
    startLocation: string = 'DEPOT',
    options: {
      algorithm?: 'tsp' | 'nearest' | 'aisle' | 'zone';
      maxTime?: number; // Maximum time to spend on optimization (ms)
    } = {}
  ): OptimizedRoute {
    const algorithm = options.algorithm || this.selectAlgorithm(tasks);
    const startTime = Date.now();

    let route: OptimizedRoute;

    switch (algorithm) {
      case 'tsp':
        route = this.solveTSP(tasks, startLocation);
        break;
      case 'nearest':
        route = this.solveNearestNeighbor(tasks, startLocation);
        break;
      case 'aisle':
        route = this.solveAisleByAisle(tasks, startLocation);
        break;
      case 'zone':
        route = this.solveZoneBased(tasks, startLocation);
        break;
      default:
        route = this.solveNearestNeighbor(tasks, startLocation);
    }

    route.algorithm = algorithm;

    const optimizationTime = Date.now() - startTime;
    console.log(`Route optimization completed in ${optimizationTime}ms using ${algorithm}`);

    return route;
  }

  /**
   * Solve TSP using 2-opt local search (optimal for small n, good approximation for large n)
   */
  private solveTSP(tasks: PickTask[], startLocation: string): OptimizedRoute {
    const locations = [startLocation, ...tasks.map(t => t.binLocation), startLocation];
    const distanceMatrix = this.buildDistanceMatrix(locations);

    // Initial solution using nearest neighbor
    let route = this.nearestNeighborTSP(locations, distanceMatrix);

    // Improve using 2-opt local search
    let improved = true;
    let iterations = 0;
    const maxIterations = 1000;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      for (let i = 1; i < route.length - 2; i++) {
        for (let j = i + 1; j < route.length - 1; j++) {
          const newRoute = this.twoOptSwap(route, i, j);
          const newDistance = this.calculateRouteDistance(newRoute);

          if (newDistance < this.calculateRouteDistance(route)) {
            route = newRoute;
            improved = true;
          }
        }
      }
    }

    return this.buildOptimizedRoute(route, tasks, startLocation);
  }

  /**
   * Nearest Neighbor heuristic (fast, good approximation)
   */
  private solveNearestNeighbor(tasks: PickTask[], startLocation: string): OptimizedRoute {
    const locations = [startLocation, ...tasks.map(t => t.binLocation), startLocation];
    const distanceMatrix = this.buildDistanceMatrix(locations);

    const route = this.nearestNeighborTSP(locations, distanceMatrix);

    return this.buildOptimizedRoute(route, tasks, startLocation);
  }

  /**
   * Aisle-by-aisle traversal (S-shape strategy)
   * Good for high-density picking in multiple aisles
   */
  private solveAisleByAisle(tasks: PickTask[], startLocation: string): OptimizedRoute {
    // Group tasks by aisle
    const tasksByAisle = new Map<number, PickTask[]>();

    for (const task of tasks) {
      const loc = this.parseLocation(task.binLocation);
      if (!tasksByAisle.has(loc.aisle)) {
        tasksByAisle.set(loc.aisle, []);
      }
      tasksByAisle.get(loc.aisle)!.push(task);
    }

    // Sort aisles by proximity to start
    const startLoc = this.parseLocation(startLocation === 'DEPOT' ? 'A-01-01' : startLocation);
    const sortedAisles = Array.from(tasksByAisle.keys()).sort((a, b) => {
      return Math.abs(a - startLoc.aisle) - Math.abs(b - startLoc.aisle);
    });

    // Build route: visit each aisle in order, picking items along the way
    const route: string[] = [startLocation];
    const optimizedTasks: OptimizedPickTask[] = [];
    let currentLocation = startLocation;

    for (const aisle of sortedAisles) {
      const aisleTasks = tasksByAisle.get(aisle)!;

      // Sort tasks by shelf number within aisle
      aisleTasks.sort((a, b) => {
        const locA = this.parseLocation(a.binLocation);
        const locB = this.parseLocation(b.binLocation);
        return locA.shelf - locB.shelf;
      });

      // Determine traversal direction based on entry point
      const entryLoc = this.parseLocation(
        currentLocation === 'DEPOT' ? 'A-01-01' : currentLocation
      );
      const entryFromFront = entryLoc.aisle <= aisle;

      // If entering from front, go low to high; else high to low
      if (!entryFromFront) {
        aisleTasks.reverse();
      }

      for (const task of aisleTasks) {
        route.push(task.binLocation);
        const distance = this.calculateDistance(currentLocation, task.binLocation);
        const time = this.calculateTravelTime(distance) + this.config.pickTime;

        optimizedTasks.push({
          ...task,
          sequence: optimizedTasks.length + 1,
          fromLocation: currentLocation,
          toLocation: task.binLocation,
          distance,
          estimatedTime: time,
        });

        currentLocation = task.binLocation;
      }
    }

    // Return to start
    route.push(startLocation);

    const totalDistance =
      optimizedTasks.reduce((sum, t) => sum + t.distance, 0) +
      this.calculateDistance(currentLocation, startLocation);
    const totalTime =
      optimizedTasks.reduce((sum, t) => sum + t.estimatedTime, 0) +
      this.calculateTravelTime(this.calculateDistance(currentLocation, startLocation));

    return {
      tasks: optimizedTasks,
      totalDistance,
      estimatedTime: totalTime,
      waypoints: this.buildWaypoints(route),
      algorithm: 'aisle-by-aisle',
    };
  }

  /**
   * Zone-based optimization
   * Groups picks by zone and optimizes within each zone
   */
  private solveZoneBased(tasks: PickTask[], startLocation: string): OptimizedRoute {
    // Group tasks by zone
    const tasksByZone = new Map<string, PickTask[]>();

    for (const task of tasks) {
      const loc = this.parseLocation(task.binLocation);
      if (!tasksByZone.has(loc.zone)) {
        tasksByZone.set(loc.zone, []);
      }
      tasksByZone.get(loc.zone)!.push(task);
    }

    // Optimize route through zones
    const zones = Array.from(tasksByZone.keys());
    const zoneOrder = this.optimizeZoneOrder(zones, startLocation);

    const route: string[] = [startLocation];
    const optimizedTasks: OptimizedPickTask[] = [];
    let currentLocation = startLocation;

    for (const zone of zoneOrder) {
      const zoneTasks = tasksByZone.get(zone)!;

      // Optimize within zone using nearest neighbor
      const zoneRoute = this.solveNearestNeighbor(zoneTasks, currentLocation);

      for (const task of zoneRoute.tasks) {
        route.push(task.binLocation);
        optimizedTasks.push(task);
      }

      currentLocation = zoneRoute.tasks[zoneRoute.tasks.length - 1]?.binLocation || currentLocation;
    }

    // Return to start
    route.push(startLocation);

    const totalDistance =
      optimizedTasks.reduce((sum, t) => sum + t.distance, 0) +
      this.calculateDistance(currentLocation, startLocation);
    const totalTime =
      optimizedTasks.reduce((sum, t) => sum + t.estimatedTime, 0) +
      this.calculateTravelTime(this.calculateDistance(currentLocation, startLocation));

    return {
      tasks: optimizedTasks,
      totalDistance,
      estimatedTime: totalTime,
      waypoints: this.buildWaypoints(route),
      algorithm: 'zone-based',
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Select the best algorithm based on task count and characteristics
   */
  private selectAlgorithm(tasks: PickTask[]): 'tsp' | 'nearest' | 'aisle' | 'zone' {
    const count = tasks.length;

    // For small numbers, TSP is fine
    if (count <= 10) {
      return 'tsp';
    }

    // Check if tasks span multiple zones
    const zones = new Set(tasks.map(t => this.parseLocation(t.binLocation).zone));

    // Check if tasks span multiple aisles
    const aisles = new Set(tasks.map(t => this.parseLocation(t.binLocation).aisle));

    if (zones.size > 2) {
      return 'zone';
    }

    if (aisles.size > 3) {
      return 'aisle';
    }

    // Default to nearest neighbor for balance of speed and quality
    return 'nearest';
  }

  /**
   * Build distance matrix for all locations
   */
  private buildDistanceMatrix(locations: string[]): number[][] {
    const n = locations.length;
    const matrix: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else if (matrix[j][i] !== 0) {
          matrix[i][j] = matrix[j][i]; // Symmetric
        } else {
          matrix[i][j] = this.calculateDistance(locations[i], locations[j]);
        }
      }
    }

    return matrix;
  }

  /**
   * Calculate Manhattan distance between two warehouse locations
   */
  private calculateDistance(from: string, to: string): number {
    const fromLoc = from === 'DEPOT' ? { zone: 'A', aisle: 0, shelf: 0 } : this.parseLocation(from);
    const toLoc = to === 'DEPOT' ? { zone: 'A', aisle: 0, shelf: 0 } : this.parseLocation(to);

    // Distance = aisle traversal + within-aisle movement
    const aisleDistance = Math.abs(fromLoc.aisle - toLoc.aisle) * this.config.aisleWidth;
    const shelfDistance = Math.abs(fromLoc.shelf - toLoc.shelf) * this.config.shelfDepth;
    const zoneDistance = fromLoc.zone !== toLoc.zone ? 10 : 0; // Zone transition penalty

    return aisleDistance + shelfDistance + zoneDistance;
  }

  /**
   * Calculate travel time for a given distance
   */
  private calculateTravelTime(distance: number): number {
    return (distance / this.config.walkingSpeed) * 1000; // Convert to ms
  }

  /**
   * Parse bin location string into components
   */
  private parseLocation(location: string): BinLocation {
    const match = location.match(/^([A-Z])-(\d+)-(\d+)([LR])?$/);

    if (!match) {
      throw new Error(`Invalid location format: ${location}`);
    }

    return {
      location,
      zone: match[1],
      aisle: parseInt(match[2], 10),
      shelf: parseInt(match[3], 10),
      side: match[4] as 'L' | 'R' | undefined,
    };
  }

  /**
   * Nearest neighbor TSP algorithm
   */
  private nearestNeighborTSP(locations: string[], distanceMatrix: number[][]): string[] {
    const n = locations.length;
    const visited = new Set<number>([0]); // Start from first location
    const route = [locations[0]];
    let current = 0;

    while (visited.size < n) {
      let nearest = -1;
      let minDistance = Infinity;

      for (let i = 0; i < n; i++) {
        if (!visited.has(i)) {
          const dist = distanceMatrix[current][i];
          if (dist < minDistance) {
            minDistance = dist;
            nearest = i;
          }
        }
      }

      if (nearest !== -1) {
        visited.add(nearest);
        route.push(locations[nearest]);
        current = nearest;
      } else {
        break;
      }
    }

    return route;
  }

  /**
   * 2-opt swap for TSP improvement
   */
  private twoOptSwap(route: string[], i: number, j: number): string[] {
    const newRoute = [...route];
    const segment = newRoute.slice(i, j + 1).reverse();
    newRoute.splice(i, segment.length, ...segment);
    return newRoute;
  }

  /**
   * Calculate total route distance
   */
  private calculateRouteDistance(route: string[]): number {
    let total = 0;

    for (let i = 0; i < route.length - 1; i++) {
      total += this.calculateDistance(route[i], route[i + 1]);
    }

    return total;
  }

  /**
   * Build optimized route object from TSP solution
   */
  private buildOptimizedRoute(
    route: string[],
    tasks: PickTask[],
    startLocation: string
  ): OptimizedRoute {
    const optimizedTasks: OptimizedPickTask[] = [];
    // Group tasks by location to handle multiple tasks at the same bin
    const tasksByLocation = new Map<string, PickTask[]>();
    for (const task of tasks) {
      if (!tasksByLocation.has(task.binLocation)) {
        tasksByLocation.set(task.binLocation, []);
      }
      tasksByLocation.get(task.binLocation)!.push(task);
    }

    let currentLocation = startLocation;

    for (let i = 1; i < route.length - 1; i++) {
      const location = route[i];
      const tasksAtLocation = tasksByLocation.get(location);

      if (tasksAtLocation && tasksAtLocation.length > 0) {
        const distance = this.calculateDistance(currentLocation, location);
        const time = this.calculateTravelTime(distance) + this.config.pickTime;

        // Add all tasks at this location with the same sequence
        for (const task of tasksAtLocation) {
          optimizedTasks.push({
            ...task,
            sequence: optimizedTasks.length + 1,
            fromLocation: currentLocation,
            toLocation: location,
            distance,
            estimatedTime: time,
          });
        }

        currentLocation = location;
      }
    }

    const totalDistance = this.calculateRouteDistance(route);
    const totalTime = optimizedTasks.reduce((sum, t) => sum + t.estimatedTime, 0);

    return {
      tasks: optimizedTasks,
      totalDistance,
      estimatedTime: totalTime,
      waypoints: this.buildWaypoints(route),
      algorithm: 'tsp',
    };
  }

  /**
   * Build waypoints array for navigation
   */
  private buildWaypoints(route: string[]): Waypoint[] {
    return route.map((location, index) => ({
      location,
      type: index === 0 ? 'start' : index === route.length - 1 ? 'end' : 'pickup',
      sequence: index,
      coordinates: this.locationToCoordinates(location),
    }));
  }

  /**
   * Convert location string to coordinates (for display/mapping)
   */
  private locationToCoordinates(location: string): { x: number; y: number; z?: number } {
    if (location === 'DEPOT') {
      return { x: 0, y: 0 };
    }

    const loc = this.parseLocation(location);
    return {
      x: loc.aisle * this.config.aisleWidth,
      y: loc.zone.charCodeAt(0) - 65, // A=0, B=1, etc.
      z: loc.shelf * this.config.shelfHeight,
    };
  }

  /**
   * Optimize order of zones to visit
   */
  private optimizeZoneOrder(zones: string[], startLocation: string): string[] {
    const startLoc = this.parseLocation(startLocation === 'DEPOT' ? 'A-01-01' : startLocation);

    return zones.sort((a, b) => {
      const zoneA = a.charCodeAt(0) - 65;
      const zoneB = b.charCodeAt(0) - 65;
      return (
        Math.abs(zoneA - (startLoc.zone.charCodeAt(0) - 65)) -
        Math.abs(zoneB - (startLoc.zone.charCodeAt(0) - 65))
      );
    });
  }

  /**
   * Get default zone layout
   */
  private getDefaultZoneLayout(): WarehouseConfig['zoneLayout'] {
    return {
      A: { startAisle: 1, endAisle: 20, x: 0, y: 0 },
      B: { startAisle: 1, endAisle: 15, x: 100, y: 0 },
      C: { startAisle: 1, endAisle: 25, x: 0, y: 50 },
      D: { startAisle: 1, endAisle: 10, x: 100, y: 50 },
    };
  }

  /**
   * Update warehouse configuration
   */
  updateConfig(config: Partial<WarehouseConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): WarehouseConfig {
    return { ...this.config };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const routeOptimizationService = new RouteOptimizationService();

export default routeOptimizationService;

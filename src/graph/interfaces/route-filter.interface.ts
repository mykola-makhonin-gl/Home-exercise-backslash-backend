import { GraphNode } from './graph-node.interface';

export interface RouteFilter {
  /** Unique key used as the query param name (e.g., "startPublic") */
  readonly key: string;

  /** Human-readable description for Swagger docs */
  readonly description: string;

  /**
   * Returns true if the given path (ordered array of nodes) satisfies this filter.
   */
  matches(path: GraphNode[]): boolean;

  /**
   * Optional hook: returns true if a node is valid as the starting point of a route.
   * Used for dynamic search space optimization.
   */
  shouldStartWith?(node: GraphNode): boolean;

  /**
   * Optional hook: returns true if a node is valid as the ending point of a route.
   * Used for dynamic search space optimization.
   */
  shouldEndWith?(node: GraphNode): boolean;
}

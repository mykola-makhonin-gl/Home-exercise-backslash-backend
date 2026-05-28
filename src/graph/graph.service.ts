import { Injectable, Inject, Logger } from '@nestjs/common';
import { ROUTE_FILTERS } from './filters/filters.constants';
import { RouteFilter } from './interfaces/route-filter.interface';
import { GraphLoaderService } from './loader/graph-loader.service';
import { GraphNode } from './interfaces/graph-node.interface';
import { GraphEdge } from './interfaces/graph-edge.interface';
import { GraphResponseDto } from './dto/graph-response.dto';

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);

  constructor(
    private readonly loader: GraphLoaderService,
    @Inject(ROUTE_FILTERS) private readonly filters: RouteFilter[],
  ) {}

  getAvailableFilters(): { key: string; description: string }[] {
    return this.filters.map((filter) => ({
      key: filter.key,
      description: filter.description,
    }));
  }

  getFullGraph(): GraphResponseDto {
    return {
      nodes: this.loader.getNodes(),
      edges: this.loader.getEdges(),
    };
  }

  getFilteredRoutes(
    activeFilterKeys: Record<string, boolean>,
  ): GraphResponseDto {
    const activeFilters = this.filters.filter(
      (f) => activeFilterKeys[f.key] === true,
    );

    this.logger.log(
      `Finding routes. Active filters: ${
        activeFilters.length > 0
          ? activeFilters.map((f) => f.key).join(', ')
          : 'none'
      }`,
    );
    const paths = this.findAllPaths(activeFilters);

    const matchingPaths = paths.filter((path) => {
      const fullPathNodes = path
        .map((name) => this.loader.getNodeMap().get(name))
        .filter((node): node is GraphNode => !!node);

      return activeFilters.every((filter) => filter.matches(fullPathNodes));
    });

    const subgraphNodes = new Set<string>();
    const edgeMap = new Map<string, Set<string>>();

    for (const path of matchingPaths) {
      for (let i = 0; i < path.length; i++) {
        subgraphNodes.add(path[i]);

        if (i < path.length - 1) {
          const from = path[i];
          const to = path[i + 1];

          if (!edgeMap.has(from)) {
            edgeMap.set(from, new Set());
          }
          edgeMap.get(from)!.add(to);
        }
      }
    }

    const resolvedNodes = Array.from(subgraphNodes)
      .map((name) => this.loader.getNodeMap().get(name)!)
      .filter((node) => !!node);
    const resolvedEdges: GraphEdge[] = Array.from(edgeMap.entries()).map(
      ([from, toSet]) => ({
        from,
        to: Array.from(toSet),
      }),
    );

    return {
      nodes: resolvedNodes,
      edges: resolvedEdges,
      paths: matchingPaths,
    };
  }

  /**
   * DFS traversal to find all maximal paths in the graph.
   * Leverages strategy-driven optimization (pruning start/end search space).
   */
  private findAllPaths(activeFilters: RouteFilter[]): string[][] {
    const results: string[][] = [];
    const nodeMap = this.loader.getNodeMap();
    const adjacencyList = this.loader.getAdjacencyList();

    const startFilters = activeFilters.filter(
      (f) => typeof f.shouldStartWith === 'function',
    );
    const endFilters = activeFilters.filter(
      (f) => typeof f.shouldEndWith === 'function',
    );

    const sources = Array.from(adjacencyList.keys()).filter((nodeName) => {
      const node = nodeMap.get(nodeName);
      if (!node) return false;
      return startFilters.every((f) => f.shouldStartWith!(node));
    });

    for (const start of sources) {
      this.dfs(
        start,
        [start],
        new Set([start]),
        endFilters,
        results,
        nodeMap,
        adjacencyList,
      );
    }

    return results;
  }

  /**
   * Recursive DFS with cycle prevention.
   */
  private dfs(
    current: string,
    path: string[],
    visited: Set<string>,
    endFilters: RouteFilter[],
    results: string[][],
    nodeMap: Map<string, GraphNode>,
    adjacencyList: Map<string, string[]>,
  ): void {
    const neighbors = adjacencyList.get(current) ?? [];
    const unvisited = neighbors.filter((n) => !visited.has(n));

    if (unvisited.length === 0) {
      const lastNode = nodeMap.get(current);
      if (lastNode) {
        const satisfiesEndFilters = endFilters.every((f) =>
          f.shouldEndWith!(lastNode),
        );
        if (satisfiesEndFilters) {
          results.push([...path]);
        }
      }
      return;
    }

    for (const next of unvisited) {
      visited.add(next);
      path.push(next);
      this.dfs(
        next,
        path,
        visited,
        endFilters,
        results,
        nodeMap,
        adjacencyList,
      );
      path.pop();
      visited.delete(next);
    }
  }
}

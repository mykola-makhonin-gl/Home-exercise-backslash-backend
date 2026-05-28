import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { RawGraphData } from '../interfaces/graph-data.interface';
import { GraphNode } from '../interfaces/graph-node.interface';
import { GraphEdge } from '../interfaces/graph-edge.interface';

@Injectable()
export class GraphLoaderService implements OnModuleInit {
  private readonly logger = new Logger(GraphLoaderService.name);

  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private nodeMap = new Map<string, GraphNode>();
  private adjacencyList = new Map<string, string[]>();

  onModuleInit() {
    this.loadGraphData();
  }

  private loadGraphData() {
    try {
      const filePath = path.join(process.cwd(), 'data', 'train-ticket-be.json');
      this.logger.log(`Loading graph data from ${filePath}`);

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const rawData = JSON.parse(fileContent) as RawGraphData;

      // 1. Load existing nodes into the map
      if (Array.isArray(rawData.nodes)) {
        for (const node of rawData.nodes) {
          this.nodeMap.set(node.name, node);
        }
      }

      // Helper to ensure nodes referenced in edges exist (creates stub nodes if missing)
      const ensureNodeExists = (name: string, warnMessage: string) => {
        if (!this.nodeMap.has(name)) {
          this.logger.warn(warnMessage);
          this.nodeMap.set(name, { name, kind: 'unknown' });
        }
      };

      // 2. Process and normalize edges
      if (Array.isArray(rawData.edges)) {
        for (const rawEdge of rawData.edges) {
          const { from, to: rawTo } = rawEdge;
          const to = (Array.isArray(rawTo) ? rawTo : [rawTo]).filter(Boolean);

          // Add stub nodes for referenced but missing target nodes
          for (const targetName of to) {
            ensureNodeExists(
              targetName,
              `Edge from '${from}' references missing node '${targetName}'. Creating stub node with kind 'unknown'.`,
            );
          }

          // Ensure 'from' is also in the nodeMap
          ensureNodeExists(
            from,
            `Edge references missing source node '${from}'. Creating stub node with kind 'unknown'.`,
          );

          this.edges.push({ from, to });
        }
      }

      // 3. Compile all nodes from nodeMap
      this.nodes = Array.from(this.nodeMap.values());

      // 4. Build adjacency list
      // Pre-initialize adjacency list with all nodes
      for (const nodeName of this.nodeMap.keys()) {
        this.adjacencyList.set(nodeName, []);
      }

      // Populate adjacency list without duplicates
      for (const edge of this.edges) {
        const targets = this.adjacencyList.get(edge.from)!;
        for (const targetName of edge.to) {
          if (!targets.includes(targetName)) {
            targets.push(targetName);
          }
        }
      }

      this.logger.log(
        `Successfully loaded ${this.nodes.length} nodes and ${this.edges.length} normalized edges.`,
      );
    } catch (error) {
      this.logger.error('Failed to load or parse graph data:', error);
      throw error;
    }
  }

  getNodes(): GraphNode[] {
    return this.nodes;
  }

  getEdges(): GraphEdge[] {
    return this.edges;
  }

  getNodeMap(): Map<string, GraphNode> {
    return this.nodeMap;
  }

  getAdjacencyList(): Map<string, string[]> {
    return this.adjacencyList;
  }
}

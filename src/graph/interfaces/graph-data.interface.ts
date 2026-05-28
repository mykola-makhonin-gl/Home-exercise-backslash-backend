import { GraphNode } from './graph-node.interface';

export interface RawGraphEdge {
  from: string;
  to: string | string[];
}

export interface RawGraphData {
  nodes: GraphNode[];
  edges: RawGraphEdge[];
}

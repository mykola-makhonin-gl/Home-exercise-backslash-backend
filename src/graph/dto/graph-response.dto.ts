import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GraphNode } from '../interfaces/graph-node.interface';
import { GraphEdge } from '../interfaces/graph-edge.interface';

export class GraphResponseDto {
  @ApiProperty({ description: 'Nodes in the (sub)graph' })
  nodes: GraphNode[];

  @ApiProperty({ description: 'Edges in the (sub)graph' })
  edges: GraphEdge[];

  @ApiPropertyOptional({
    description: 'Matching route paths (arrays of node names)',
  })
  paths?: string[][];
}

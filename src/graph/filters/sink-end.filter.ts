import { Injectable } from '@nestjs/common';
import { RouteFilter } from '../interfaces/route-filter.interface';
import { GraphNode } from '../interfaces/graph-node.interface';

@Injectable()
export class SinkEndFilter implements RouteFilter {
  readonly key = 'endSink';
  readonly description =
    'Routes that end in a sink node (rds, sqs, or any non-service kind)';

  matches(path: GraphNode[]): boolean {
    const last = path[path.length - 1];
    return last?.kind !== 'service';
  }

  shouldEndWith(node: GraphNode): boolean {
    return node.kind !== 'service';
  }
}

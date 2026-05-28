import { Injectable } from '@nestjs/common';
import { RouteFilter } from '../interfaces/route-filter.interface';
import { GraphNode } from '../interfaces/graph-node.interface';

@Injectable()
export class PublicStartFilter implements RouteFilter {
  readonly key = 'startPublic';
  readonly description =
    'Routes that start in a public service (publicExposed: true)';

  matches(path: GraphNode[]): boolean {
    return path[0]?.publicExposed === true;
  }

  shouldStartWith(node: GraphNode): boolean {
    return node.publicExposed === true;
  }
}

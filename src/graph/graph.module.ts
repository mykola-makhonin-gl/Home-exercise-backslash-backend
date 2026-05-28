import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { GraphLoaderService } from './loader/graph-loader.service';
import { ROUTE_FILTERS } from './filters/filters.constants';
import { PublicStartFilter } from './filters/public-start.filter';
import { SinkEndFilter } from './filters/sink-end.filter';
import { VulnerabilityFilter } from './filters/vulnerability.filter';

/**
 * To add a new filter:
 * 1. Create a new class implementing `RouteFilter`
 * 2. Append it to FILTER_CLASSES below
 * 3. Add the corresponding query param to the DTO
 */
const FILTER_CLASSES = [PublicStartFilter, SinkEndFilter, VulnerabilityFilter];

@Module({
  controllers: [GraphController],
  providers: [
    GraphLoaderService,
    GraphService,
    ...FILTER_CLASSES,
    {
      provide: ROUTE_FILTERS,
      useFactory: (...filters) => filters,
      inject: FILTER_CLASSES,
    },
  ],
  exports: [GraphLoaderService, GraphService],
})
export class GraphModule {}


import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GraphService } from './graph.service';
import { GraphQueryDto } from './dto/graph-query.dto';
import { GraphResponseDto } from './dto/graph-response.dto';

@ApiTags('Graph')
@Controller('api/graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get()
  @ApiOperation({ summary: 'Get the full microservices graph (unfiltered)' })
  @ApiResponse({
    status: 200,
    description: 'Return full graph',
    type: GraphResponseDto,
  })
  getFullGraph(): GraphResponseDto {
    return this.graphService.getFullGraph();
  }

  @Get('routes')
  @ApiOperation({ summary: 'Get filtered routes through the graph' })
  @ApiResponse({
    status: 200,
    description: 'Return filtered routes and subgraph',
    type: GraphResponseDto,
  })
  getRoutes(@Query() query: GraphQueryDto): GraphResponseDto {
    const activeFilters = {
      startPublic: !!query.startPublic,
      endSink: !!query.endSink,
      hasVulnerability: !!query.hasVulnerability,
    };
    return this.graphService.getFilteredRoutes(activeFilters);
  }

  @Get('filters')
  @ApiOperation({ summary: 'List available route filters' })
  @ApiResponse({
    status: 200,
    description: 'List of filters with key and description',
  })
  getAvailableFilters(): { key: string; description: string }[] {
    return this.graphService.getAvailableFilters();
  }
}

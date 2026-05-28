import { Test, TestingModule } from '@nestjs/testing';
import { GraphService } from './graph.service';
import { GraphLoaderService } from './loader/graph-loader.service';
import { ROUTE_FILTERS } from './filters/filters.constants';
import { PublicStartFilter } from './filters/public-start.filter';
import { SinkEndFilter } from './filters/sink-end.filter';
import { VulnerabilityFilter } from './filters/vulnerability.filter';
import { GraphNode } from './interfaces/graph-node.interface';
import { GraphEdge } from './interfaces/graph-edge.interface';

const FILTER_CLASSES = [PublicStartFilter, SinkEndFilter, VulnerabilityFilter];

describe('GraphService', () => {
  let service: GraphService;
  let mockLoader: jest.Mocked<Partial<GraphLoaderService>>;

  // Define a clean, predictable mock graph:
  // A (public) -> B (vulnerable) -> C (sink)
  const mockNodes: GraphNode[] = [
    { name: 'A', kind: 'service', publicExposed: true },
    { name: 'B', kind: 'service', vulnerabilities: [{ file: 'test.ts', severity: 'high', message: 'vuln' }] },
    { name: 'C', kind: 'rds' },
  ];

  const mockEdges: GraphEdge[] = [
    { from: 'A', to: ['B'] },
    { from: 'B', to: ['C'] },
  ];

  const mockNodeMap = new Map<string, GraphNode>([
    ['A', mockNodes[0]],
    ['B', mockNodes[1]],
    ['C', mockNodes[2]],
  ]);

  const mockAdjacencyList = new Map<string, string[]>([
    ['A', ['B']],
    ['B', ['C']],
    ['C', []],
  ]);

  beforeEach(async () => {
    mockLoader = {
      getNodes: jest.fn().mockReturnValue(mockNodes),
      getEdges: jest.fn().mockReturnValue(mockEdges),
      getNodeMap: jest.fn().mockReturnValue(mockNodeMap),
      getAdjacencyList: jest.fn().mockReturnValue(mockAdjacencyList),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphService,
        {
          provide: GraphLoaderService,
          useValue: mockLoader,
        },
        ...FILTER_CLASSES,
        {
          provide: ROUTE_FILTERS,
          useFactory: (...filters) => filters,
          inject: FILTER_CLASSES,
        },
      ],
    }).compile();

    service = module.get<GraphService>(GraphService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFullGraph', () => {
    it('should return all nodes and edges from loader', () => {
      const graph = service.getFullGraph();
      expect(graph.nodes).toEqual(mockNodes);
      expect(graph.edges).toEqual(mockEdges);
    });
  });

  describe('getAvailableFilters', () => {
    it('should return a list of available filters with keys and descriptions', () => {
      const filters = service.getAvailableFilters();
      expect(filters.length).toBe(3);
      expect(filters[0]).toHaveProperty('key');
      expect(filters[0]).toHaveProperty('description');
    });
  });

  describe('getFilteredRoutes', () => {
    it('should return the complete path A -> B -> C when no filters are active', () => {
      const result = service.getFilteredRoutes({});
      expect(result.paths).toBeDefined();
      // Should find the maximal path starting from A and B
      // From A: A -> B -> C
      // From B: B -> C
      // From C: C
      expect(result.paths).toContainEqual(['A', 'B', 'C']);
      expect(result.paths).toContainEqual(['B', 'C']);
      expect(result.paths).toContainEqual(['C']);
    });

    it('should filter paths to only those starting with public nodes (A)', () => {
      const result = service.getFilteredRoutes({ startPublic: true });
      expect(result.paths).toEqual([['A', 'B', 'C']]);
      // Verify subgraph nodes & edges
      expect(result.nodes.map(n => n.name)).toEqual(['A', 'B', 'C']);
      expect(result.edges).toEqual([
        { from: 'A', to: ['B'] },
        { from: 'B', to: ['C'] },
      ]);
    });

    it('should filter paths to only those ending with a sink (C)', () => {
      const result = service.getFilteredRoutes({ endSink: true });
      // Maximal paths ending in C:
      // A -> B -> C
      // B -> C
      expect(result.paths).toContainEqual(['A', 'B', 'C']);
      expect(result.paths).toContainEqual(['B', 'C']);
      expect(result.paths).toContainEqual(['C']);
    });

    it('should filter paths to only those containing a vulnerability (B)', () => {
      const result = service.getFilteredRoutes({ hasVulnerability: true });
      // Paths containing B:
      // A -> B -> C
      // B -> C
      expect(result.paths).toContainEqual(['A', 'B', 'C']);
      expect(result.paths).toContainEqual(['B', 'C']);
      expect(result.paths).not.toContainEqual(['C']);
    });

    it('should combine multiple filters using AND logic (startPublic=true AND endSink=true AND hasVulnerability=true)', () => {
      const result = service.getFilteredRoutes({
        startPublic: true,
        endSink: true,
        hasVulnerability: true,
      });
      // The only path starting public (A), containing vulnerability (B), and ending in sink (C)
      expect(result.paths).toEqual([['A', 'B', 'C']]);
    });
  });
});

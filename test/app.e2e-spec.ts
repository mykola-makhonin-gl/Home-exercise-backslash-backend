import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('GraphController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Wire up global pipes to match main.ts setup
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/api/graph (GET)', () => {
    it('should return the full unfiltered graph', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/graph')
        .expect(200);

      expect(response.body).toHaveProperty('nodes');
      expect(response.body).toHaveProperty('edges');
      expect(Array.isArray(response.body.nodes)).toBe(true);
      expect(Array.isArray(response.body.edges)).toBe(true);

      // Verify stub node assurance-service was created
      const assuranceNode = response.body.nodes.find(
        (n: any) => n.name === 'assurance-service',
      );
      expect(assuranceNode).toBeDefined();
      expect(assuranceNode.kind).toBe('unknown');
    });
  });

  describe('/api/graph/filters (GET)', () => {
    it('should return all registered route filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/graph/filters')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);

      const keys = response.body.map((f: any) => f.key);
      expect(keys).toContain('startPublic');
      expect(keys).toContain('endSink');
      expect(keys).toContain('hasVulnerability');
    });
  });

  describe('/api/graph/routes (GET)', () => {
    it('should return all maximal paths when no filters are applied', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/graph/routes')
        .expect(200);

      expect(response.body).toHaveProperty('nodes');
      expect(response.body).toHaveProperty('edges');
      expect(response.body).toHaveProperty('paths');
      expect(Array.isArray(response.body.paths)).toBe(true);
      expect(response.body.paths.length).toBeGreaterThan(0);
    });

    it('should correctly filter routes starting at public services', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/graph/routes?startPublic=true')
        .expect(200);

      expect(response.body).toHaveProperty('paths');
      const paths = response.body.paths;
      expect(paths.length).toBe(6);

      // Verify that all returned paths start with public nodes (frontend or gateway-service)
      for (const path of paths) {
        expect(['frontend', 'gateway-service']).toContain(path[0]);
      }
    });

    it('should correctly filter routes ending in sinks', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/graph/routes?endSink=true')
        .expect(200);

      expect(response.body).toHaveProperty('paths');
      const paths = response.body.paths;

      // Verify that all returned paths end with a non-service (sink) node
      const nodes = response.body.nodes;
      for (const path of paths) {
        const lastNodeName = path[path.length - 1];
        const lastNode = nodes.find((n: any) => n.name === lastNodeName);
        expect(lastNode).toBeDefined();
        expect(lastNode.kind).not.toBe('service');
      }
    });

    it('should correctly filter routes passing through a vulnerable node', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/graph/routes?hasVulnerability=true')
        .expect(200);

      expect(response.body).toHaveProperty('paths');
      const paths = response.body.paths;

      // Verify that all returned paths pass through either auth-service or order-service
      for (const path of paths) {
        const hasVulnerableNode =
          path.includes('auth-service') || path.includes('order-service');
        expect(hasVulnerableNode).toBe(true);
      }
    });

    it('should correctly filter routes with endSink=true and hasVulnerability=true', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/graph/routes?endSink=true&hasVulnerability=true')
        .expect(200);

      expect(response.body).toHaveProperty('paths');
      const paths = response.body.paths;
      expect(paths.length).toBeGreaterThan(0);

      const nodes = response.body.nodes;
      for (const path of paths) {
        const hasVulnerableNode =
          path.includes('auth-service') || path.includes('order-service');
        expect(hasVulnerableNode).toBe(true);

        const lastNodeName = path[path.length - 1];
        const lastNode = nodes.find((n: any) => n.name === lastNodeName);
        expect(lastNode).toBeDefined();
        expect(lastNode.kind).not.toBe('service');
      }
    });
  });
});

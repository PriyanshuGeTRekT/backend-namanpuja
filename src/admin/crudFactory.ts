/**
 * Generic react-admin compatible CRUD router factory.
 *
 * Speaks the `ra-data-simple-rest` dialect:
 *   - GET    /        ?sort=["field","ASC"]&range=[0,24]&filter={...}
 *            → 200 [ ...rows ]  with header  Content-Range: <resource> 0-24/total
 *   - GET    /:id     → 200 row
 *   - POST   /        → 201 row
 *   - PUT    /:id     → 200 row
 *   - DELETE /:id     → 200 { id }
 *
 * All routes are mounted behind admin authentication.
 */
import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

interface CrudOptions {
  resource: string;
  /** Prisma model delegate, e.g. prisma.city */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any;
  /** Fields searched by the `q` filter (case-insensitive contains). */
  searchableFields?: string[];
  /** Relations to include on list/detail responses. */
  include?: Record<string, unknown>;
  /** Default ordering when none supplied. */
  defaultOrderBy?: Record<string, 'asc' | 'desc'>;
  /** Transform/validate the body before create/update. */
  beforeWrite?: (data: Record<string, unknown>, ctx: { isCreate: boolean }) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function createCrudRouter(opts: CrudOptions): Router {
  const router = Router();
  const {
    resource,
    model,
    searchableFields = [],
    include,
    defaultOrderBy = { createdAt: 'desc' },
  } = opts;

  // LIST
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const sort = parseJson<[string, string]>(req.query.sort, ['createdAt', 'DESC']);
      const range = parseJson<[number, number]>(req.query.range, [0, 24]);
      const filter = parseJson<Record<string, unknown>>(req.query.filter, {});

      const [start, end] = range;
      const take = Math.max(0, end - start + 1);

      // Build where clause from filter
      const where: Record<string, unknown> = {};
      const andClauses: unknown[] = [];

      for (const [key, value] of Object.entries(filter)) {
        if (key === 'q') {
          if (searchableFields.length && value) {
            andClauses.push({
              OR: searchableFields.map((f) => ({
                [f]: { contains: String(value), mode: 'insensitive' },
              })),
            });
          }
        } else if (Array.isArray(value)) {
          where[key] = { in: value };
        } else {
          where[key] = value;
        }
      }
      if (andClauses.length) where.AND = andClauses;

      const orderBy = sort?.[0]
        ? { [sort[0]]: (sort[1] || 'ASC').toLowerCase() as 'asc' | 'desc' }
        : defaultOrderBy;

      const [rows, total] = await Promise.all([
        model.findMany({ where, orderBy, skip: start, take, include }),
        model.count({ where }),
      ]);

      res.setHeader('Content-Range', `${resource} ${start}-${start + rows.length - 1}/${total}`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range');
      res.json(rows);
    }),
  );

  // GET ONE
  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const row = await model.findUnique({ where: { id: req.params.id }, include });
      if (!row) throw ApiError.notFound(`${resource} not found`);
      res.json(row);
    }),
  );

  // CREATE
  router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      let data = req.body as Record<string, unknown>;
      delete data.id;
      if (opts.beforeWrite) data = await opts.beforeWrite(data, { isCreate: true });
      const row = await model.create({ data, include });
      res.status(201).json(row);
    }),
  );

  // UPDATE
  router.put(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      let data = req.body as Record<string, unknown>;
      delete data.id;
      delete data.createdAt;
      delete data.updatedAt;
      if (opts.beforeWrite) data = await opts.beforeWrite(data, { isCreate: false });
      const row = await model.update({ where: { id: req.params.id }, data, include });
      res.json(row);
    }),
  );

  // DELETE
  router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      await model.delete({ where: { id: req.params.id } });
      res.json({ id: req.params.id });
    }),
  );

  return router;
}

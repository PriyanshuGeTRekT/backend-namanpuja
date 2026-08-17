/**
 * Generic react-admin compatible CRUD router factory for Mongoose.
 *
 * Speaks the `ra-data-simple-rest` dialect:
 *   - GET    /        ?sort=["field","ASC"]&range=[0,24]&filter={...}
 *   - GET    /:id     
 *   - POST   /        
 *   - PUT    /:id     
 *   - DELETE /:id     
 */
import { Router, type Request, type Response } from 'express';
import type { Model } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

interface CrudOptions {
  resource: string;
  model: Model<any>;
  searchableFields?: string[];
  populate?: string[];
  defaultOrderBy?: Record<string, 1 | -1>;
  baseFilter?: Record<string, unknown>;
  beforeWrite?: (data: Record<string, unknown>, ctx: { isCreate: boolean }) => Promise<Record<string, unknown>> | Record<string, unknown>;
  afterWrite?: (doc: any, ctx: { isCreate: boolean }) => Promise<void> | void;
  /** Transform the raw doc before sending it back on GET ONE (for edit-form field-name remapping) */
  getTransform?: (doc: Record<string, any>) => Record<string, any>;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function serializeDoc(doc: any, getTransform?: (d: Record<string, any>) => Record<string, any>) {
  if (!doc) return doc;
  const raw = typeof doc.toJSON === 'function' 
    ? doc.toJSON({ virtuals: true }) 
    : (typeof doc.toObject === 'function' ? doc.toObject({ virtuals: true }) : { ...doc });
  
  if (raw && raw._id && !raw.id) {
    raw.id = raw._id.toString();
  }
  return getTransform ? getTransform(raw) : raw;
}

export function createCrudRouter(opts: CrudOptions): Router {
  const router = Router();
  const {
    resource,
    model,
    searchableFields = [],
    populate = [],
    defaultOrderBy = { createdAt: -1 },
    baseFilter = {},
  } = opts;

  // LIST
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const sort = parseJson<[string, string]>(req.query.sort, ['createdAt', 'DESC']);
      const range = parseJson<[number, number]>(req.query.range, [0, 24]);
      const filter = parseJson<Record<string, unknown>>(req.query.filter, {});

      const [start, end] = range;
      const limit = Math.max(0, end - start + 1);

      const where: Record<string, unknown> = Object.keys(baseFilter).length > 0 ? { ...baseFilter } : {};
      const orClauses: unknown[] = [];

      for (const [key, value] of Object.entries(filter)) {
        if (key === 'q') {
          if (searchableFields.length && value) {
            orClauses.push(
              ...searchableFields.map((f) => ({
                [f]: { $regex: String(value), $options: 'i' },
              }))
            );
          }
        } else if (Array.isArray(value)) {
          where[key] = { $in: value };
        } else {
          where[key] = value;
        }
      }
      if (orClauses.length) {
        if (where.$or) {
          where.$and = [{ $or: where.$or }, { $or: orClauses }];
          delete where.$or;
        } else {
          where.$or = orClauses;
        }
      }

      const orderBy = sort?.[0]
        ? { [sort[0]]: (sort[1] || 'ASC').toUpperCase() === 'ASC' ? 1 : -1 }
        : defaultOrderBy;

      let query = model.find(where).sort(orderBy as any).skip(start).limit(limit).lean();
      if (resource === 'pujas' || resource === 'puja-pages') {
        query = query.select('-blocks -description -benefits -rituals -samagri');
      }
      for (const p of populate) {
        query = query.populate(p);
      }

      const [rows, total] = await Promise.all([
        query.exec(),
        model.countDocuments(where),
      ]);

      const transformedRows = rows.map((r) => serializeDoc(r, opts.getTransform));

      res.setHeader('Content-Range', `${resource} ${start}-${start + rows.length - 1}/${total}`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range');
      res.json(transformedRows);
    }),
  );

  // GET ONE
  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      let query = model.findById(req.params.id);
      for (const p of populate) {
        query = query.populate(p);
      }
      const row = await query.exec();
      if (!row) throw ApiError.notFound(`${resource} not found`);
      res.json(serializeDoc(row, opts.getTransform));
    }),
  );

  // CREATE
  router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      let data = req.body as Record<string, unknown>;
      delete data.id;
      if (opts.beforeWrite) data = await opts.beforeWrite(data, { isCreate: true });
      const row = await new model(data).save();
      
      if (opts.afterWrite) await opts.afterWrite(row, { isCreate: true });
      
      let query = model.findById(row._id);
      for (const p of populate) {
        query = query.populate(p);
      }
      const populatedRow = await query.exec();
      res.status(201).json(serializeDoc(populatedRow, opts.getTransform));
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
      const row = await model.findByIdAndUpdate(req.params.id, data, { new: true });
      if (!row) throw ApiError.notFound(`${resource} not found`);
      
      if (opts.afterWrite) await opts.afterWrite(row, { isCreate: false });
      
      let query = model.findById(row._id);
      for (const p of populate) {
        query = query.populate(p);
      }
      const populatedRow = await query.exec();
      res.json(serializeDoc(populatedRow, opts.getTransform));
    }),
  );

  // DELETE
  router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const row = await model.findByIdAndDelete(req.params.id);
      if (!row) throw ApiError.notFound(`${resource} not found`);
      res.json({ id: req.params.id });
    }),
  );

  return router;
}

'use strict';
// Minimal, dependency-free JSON Schema validator for the subset used by
// schema/juxt-ir.schema.json: type, enum, required, properties,
// additionalProperties (bool or schema), items, $ref (local), $defs.
function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v === 'number' ? 'number' : typeof v;
}
function typeOk(v, t) {
  if (Array.isArray(t)) return t.some(x => typeOk(v, x));
  const a = typeOf(v);
  if (t === 'number') return a === 'number' || a === 'integer';
  if (t === 'integer') return a === 'integer';
  return a === t;
}
function resolve(root, ref) {
  if (!ref.startsWith('#/')) return null;
  return ref.slice(2).split('/').reduce((o, k) => (o ? o[k] : undefined), root);
}
function validate(data, schema, root = schema, path = '', errs = []) {
  if (schema.$ref) { const s = resolve(root, schema.$ref); if (s) return validate(data, s, root, path, errs); }
  if (schema.type && !typeOk(data, schema.type))
    errs.push(`${path || '/'}: expected ${Array.isArray(schema.type) ? schema.type.join('|') : schema.type}, got ${typeOf(data)}`);
  if (schema.enum && !schema.enum.some(e => e === data || (e === null && data === null)))
    errs.push(`${path || '/'}: ${JSON.stringify(data)} not in [${schema.enum.map(x => JSON.stringify(x)).join(', ')}]`);
  if (typeOf(data) === 'object') {
    for (const r of schema.required || []) if (!(r in data)) errs.push(`${path}/${r}: required`);
    const props = schema.properties || {};
    for (const [k, v] of Object.entries(data)) {
      if (props[k]) validate(v, props[k], root, `${path}/${k}`, errs);
      else if (schema.additionalProperties === false) errs.push(`${path}/${k}: unexpected property`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object')
        validate(v, schema.additionalProperties, root, `${path}/${k}`, errs);
    }
  }
  if (typeOf(data) === 'array' && schema.items)
    data.forEach((v, i) => validate(v, schema.items, root, `${path}/${i}`, errs));
  return errs;
}
module.exports = { validate };

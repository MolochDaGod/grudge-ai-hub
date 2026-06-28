/**
 * Observatory ingest — fleet logging (from grudge-fleet/observatory)
 */

export class Observatory {
  constructor(opts) {
    this.opts = opts;
  }

  emit(input) {
    const body = {
      v: 1,
      source: this.opts.source,
      kind: input.kind || 'log',
      level: input.level || 'info',
      message: input.message,
      ts: Date.now(),
      trace_id: input.trace_id,
      grudge_id: input.grudge_id,
      stage: this.opts.stage,
      ai: input.ai,
      http: input.http,
      metric: input.metric,
      attrs: input.attrs,
    };
    const p = fetch(`${this.opts.endpoint.replace(/\/$/, '')}/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-grudge-key': this.opts.key,
      },
      body: JSON.stringify(body),
    }).catch(() => {});
    if (this.opts.waitUntil) this.opts.waitUntil(p);
    else void p;
  }

  info(message, attrs) { this.emit({ level: 'info', message, attrs }); }
  warn(message, attrs) { this.emit({ level: 'warn', message, attrs }); }
  error(message, attrs) { this.emit({ level: 'error', message, attrs }); }
  ai(fields) {
    this.emit({
      kind: 'ai',
      level: fields.status === 'error' ? 'error' : 'info',
      message: String(fields.message || 'ai call'),
      ai: fields,
    });
  }
  http(fields) {
    this.emit({
      kind: 'http',
      level: typeof fields.status === 'number' && fields.status >= 500 ? 'error' : 'info',
      message: `${fields.method || 'GET'} ${fields.path || '/'} ${fields.status || ''}`.trim(),
      http: fields,
    });
  }
}
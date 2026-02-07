import http from "http";

const __serverData = new WeakMap();
const __requestData = new WeakMap();
export class Server {
  constructor(port) {
    this.port = port;
  }

}
export class Request {
  constructor(method, path, body, headers, query, url) {
    this.method = method;
    this.path = path;
    this.body = body;
    this.headers = headers;
    this.query = query;
    this.url = url;
  }

}
export async function createServer(port) {
  const server = new Server(port);
    const data = {
      handle: null,
      requestQueue: [],
      waitingResolve: null
    };
    __serverData.set(server, data);

    return new Promise((resolve, reject) => {
      const httpServer = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const headers = {};
          for (const [k, v] of Object.entries(req.headers)) {
            headers[k] = Array.isArray(v) ? v.join(', ') : (v || '');
          }
          const urlObj = new URL(req.url || '/', `http://localhost:${port}`);
          const request = new Request(
            req.method || 'GET',
            urlObj.pathname,
            body,
            headers,
            urlObj.search ? urlObj.search.substring(1) : '',
            req.url || '/'
          );
          __requestData.set(request, res);

          if (data.waitingResolve) {
            const r = data.waitingResolve;
            data.waitingResolve = null;
            r(request);
          } else {
            data.requestQueue.push(request);
          }
        });
      });

      data.handle = httpServer;

      httpServer.listen(port, () => {
        resolve(server);
      });

      httpServer.on('error', (err) => {
        reject(err);
      });
    });
}
export async function nextRequest(server) {
  const data = __serverData.get(server);
    if (!data) throw new Error('Invalid server');

    if (data.requestQueue.length > 0) {
      return data.requestQueue.shift();
    }

    return new Promise((resolve) => {
      data.waitingResolve = resolve;
    });
}
export async function respond(req, status, body) {
  const res = __requestData.get(req);
    if (!res) throw new Error('Invalid request or already responded');
    res.writeHead(status, { 'Content-Type': 'text/plain' });
    res.end(body);
    __requestData.delete(req);
}
export async function respondJson(req, status, data) {
  const res = __requestData.get(req);
    if (!res) throw new Error('Invalid request or already responded');
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    __requestData.delete(req);
}
export async function respondWithHeaders(req, status, body, headers) {
  const res = __requestData.get(req);
    if (!res) throw new Error('Invalid request or already responded');
    const headerObj = { ...headers };
    if (!headerObj['Content-Type'] && !headerObj['content-type']) {
      headerObj['Content-Type'] = 'text/plain';
    }
    res.writeHead(status, headerObj);
    res.end(body);
    __requestData.delete(req);
}
export async function getQuery(req, key) {
  const params = new URLSearchParams(req.query);
    return params.get(key) || '';
}
export async function getQueryAll(req) {
  const params = new URLSearchParams(req.query);
    const result = {};
    for (const [k, v] of params.entries()) {
      result[k] = v;
    }
    return result;
}
export async function parseBody(req) {
  try {
      return JSON.parse(req.body);
    } catch (e) {
      return null;
    }
}
export async function closeServer(server) {
  const data = __serverData.get(server);
    if (!data || !data.handle) return;
    return new Promise((resolve) => {
      data.handle.close(() => {
        __serverData.delete(server);
        resolve();
      });
    });
}
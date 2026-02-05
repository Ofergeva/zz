export class Response {
  constructor(status, statusText, body, headers) {
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.headers = headers;
  }

}
export async function get(url) {
  const res = await fetch(url);
    const body = await res.text();
    const headers = {};
    res.headers.forEach((v, k) => headers[k] = v);
    return new Response(res.status, res.statusText, body, headers);
}
export async function getWithHeaders(url, headers) {
  const res = await fetch(url, { headers });
    const body = await res.text();
    const resHeaders = {};
    res.headers.forEach((v, k) => resHeaders[k] = v);
    return new Response(res.status, res.statusText, body, resHeaders);
}
export async function post(url, body) {
  const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const responseBody = await res.text();
    const headers = {};
    res.headers.forEach((v, k) => headers[k] = v);
    return new Response(res.status, res.statusText, responseBody, headers);
}
export async function postWithHeaders(url, body, headers) {
  const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });
    const responseBody = await res.text();
    const resHeaders = {};
    res.headers.forEach((v, k) => resHeaders[k] = v);
    return new Response(res.status, res.statusText, responseBody, resHeaders);
}
export async function put(url, body) {
  const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const responseBody = await res.text();
    const headers = {};
    res.headers.forEach((v, k) => headers[k] = v);
    return new Response(res.status, res.statusText, responseBody, headers);
}
export async function del(url) {
  const res = await fetch(url, { method: 'DELETE' });
    const body = await res.text();
    const headers = {};
    res.headers.forEach((v, k) => headers[k] = v);
    return new Response(res.status, res.statusText, body, headers);
}
export async function patch(url, body) {
  const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const responseBody = await res.text();
    const headers = {};
    res.headers.forEach((v, k) => headers[k] = v);
    return new Response(res.status, res.statusText, responseBody, headers);
}
export async function fetch(url, options) {
  const fetchOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    if (options.body) {
      fetchOptions.body = typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
    }
    const res = await fetch(url, fetchOptions);
    const body = await res.text();
    const headers = {};
    res.headers.forEach((v, k) => headers[k] = v);
    return new Response(res.status, res.statusText, body, headers);
}
export async function parseJson(res) {
  try {
      return JSON.parse(res.body);
    } catch (e) {
      return null;
    }
}
export async function isOk(res) {
  return res.status >= 200 && res.status < 300;
}
export async function encodeUrl(str) {
  return encodeURIComponent(str);
}
export async function decodeUrl(str) {
  return decodeURIComponent(str);
}
export async function buildQuery(params) {
  return Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
}
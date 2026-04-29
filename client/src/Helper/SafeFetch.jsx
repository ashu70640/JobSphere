export async function safeFetch(url, options = {}) {
  const res = await fetch(url, options);

  const contentType = res.headers.get("content-type");
  let data;

  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  return data;
}

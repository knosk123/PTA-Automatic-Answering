function trimSlashes(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function stripKnownEndpoint(base) {
  return base
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/models(?:\/[^/?#]+)?$/i, '');
}

function joinApiPath(apiUrl, path) {
  const base = trimSlashes(apiUrl);
  const cleanPath = String(path || '').replace(/^\/+/, '');
  if (!base || !cleanPath) return base;

  if (base.toLowerCase().endsWith(`/${cleanPath.toLowerCase()}`)) {
    return base;
  }

  const pathSegments = cleanPath.split('/');
  for (let i = 1; i < pathSegments.length; i += 1) {
    const prefix = pathSegments.slice(0, i).join('/');
    const suffix = pathSegments.slice(i).join('/');
    if (base.toLowerCase().endsWith(`/${prefix.toLowerCase()}`)) {
      return `${base}/${suffix}`;
    }
  }

  const [firstSegment, ...restSegments] = cleanPath.split('/');
  if (base.toLowerCase().endsWith(`/${firstSegment.toLowerCase()}`) && restSegments.length > 0) {
    return `${base}/${restSegments.join('/')}`;
  }

  return `${base}/${cleanPath}`;
}

export function buildApiUrl(apiUrl, path) {
  return joinApiPath(apiUrl, path);
}

export function normalizeOpenAICompatibleBaseUrl(apiUrl) {
  let base = stripKnownEndpoint(trimSlashes(apiUrl));

  if (!base) return base;

  const hasVersionSegment = /\/(?:v\d+|compatible-mode\/v\d+|api\/v\d+)(?:\/|$)/i.test(base);
  if (!hasVersionSegment) {
    base = `${base}/v1`;
  }

  return base;
}

export function buildOpenAICompatibleUrl(apiUrl, path) {
  const cleanPath = String(path || '').replace(/^\/+/, '');
  const base = normalizeOpenAICompatibleBaseUrl(apiUrl);

  if (!base || !cleanPath) return base;
  if (base.toLowerCase().endsWith(`/${cleanPath.toLowerCase()}`)) {
    return base;
  }

  return joinApiPath(base, cleanPath);
}

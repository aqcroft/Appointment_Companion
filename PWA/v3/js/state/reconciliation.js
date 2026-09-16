import { clone } from './canonical-state.js';

const object = value => value && typeof value === 'object' && !Array.isArray(value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const empty = value => value == null || value === '' || (Array.isArray(value) && !value.length);

function mergeNode(base, local, remote, path, conflicts) {
  if (same(local, remote)) return clone(local);
  if (same(local, base)) return clone(remote);
  if (same(remote, base)) return clone(local);
  if (empty(local) && !empty(remote)) return clone(remote);
  if (empty(remote) && !empty(local)) return clone(local);

  if (object(local) || object(remote) || object(base)) {
    const keys = new Set([...Object.keys(base || {}), ...Object.keys(local || {}), ...Object.keys(remote || {})]);
    const merged = {};
    for (const key of keys) merged[key] = mergeNode(base?.[key], local?.[key], remote?.[key], path ? `${path}.${key}` : key, conflicts);
    return merged;
  }

  // Arrays (notably per-SIM state) are atomic to avoid silently mixing two simultaneous edits.
  conflicts.push({ path, base: clone(base), local: clone(local), remote: clone(remote) });
  return clone(local);
}

export function reconcileSnapshots({ base = {}, local = {}, remote = {} }) {
  const conflicts = [];
  const merged = mergeNode(base, local, remote, '', conflicts);
  return { status: conflicts.length ? 'conflict' : 'merged', merged, conflicts };
}

export function remoteVersion(row) {
  return String(row?.cloud_revision || row?.sync_revision || row?.updated_at || '');
}


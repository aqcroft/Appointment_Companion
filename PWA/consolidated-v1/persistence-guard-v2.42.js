/* Appointment Companion v2.42 - name-gated persistence + three-way Cloud reconciliation. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var store = global.AppointmentCompanionLocalStore;
  var canonical = global.AppointmentCompanionCanonical;
  if (!store || !canonical || store.__v242Wrapped) return;

  var originalPut = store.put.bind(store);
  var originalList = store.list.bind(store);
  var originalRemove = store.remove.bind(store);

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function plain(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function meaningful(v) {
    if (v == null || v === '') return false;
    if (typeof v === 'string') return !!v.trim() && !/^not set$/i.test(v.trim());
    if (typeof v === 'number') return isFinite(v) && v !== 0;
    if (typeof v === 'boolean') return v === true;
    if (Array.isArray(v)) return v.length > 0;
    if (plain(v)) return Object.keys(v).some(function (k) { return meaningful(v[k]); });
    return true;
  }
  function remoteVersion(row) { return String(row && (row.cloud_revision || row.sync_revision || row.updated_at) || ''); }
  function parse(value) {
    if (!value) return null;
    if (typeof value === 'object') return clone(value);
    try { return JSON.parse(value); } catch (_) { return null; }
  }
  function remoteAppointment(remote) {
    var raw = remote && (remote.appointment_state || remote.appointment_state_json || remote.appointment_snapshot);
    var parsed = parse(raw);
    return parsed ? canonical.normaliseAppointment(parsed) : null;
  }
  function baseAppointment(base) {
    return remoteAppointment(base || {});
  }
  function pathLabel(path) {
    var map = {
      'customerName':'Customer name','homeStatus':'Homeowner / tenant','lastQuoteSharedAt':'Last quote shared at','basketUrl':'Basket link',
      'energy.electricityUsageTotalKwh':'Electricity annual usage','energy.gasUsageKwh':'Gas annual usage',
      'energy.electricityUsageDayKwh':'Electricity day usage','energy.electricityUsageNightKwh':'Electricity night usage',
      'energy.electricityUsageSource':'Electricity usage source','energy.electricityUsageSourceDetail':'Electricity usage source',
      'energy.gasUsageSource':'Gas usage source','energy.gasUsageSourceDetail':'Gas usage source',
      'energy.energyFuelSelection':'Energy fuel selection','energy.electricityProfile':'Electricity profile'
    };
    if (map[path]) return map[path];
    return path.replace(/^canonical\./,'').replace(/^specialist\./,'').replace(/([A-Z])/g,' $1').replace(/[._]/g,' ').replace(/\s+/g,' ').trim().replace(/^./, function (c) { return c.toUpperCase(); });
  }

  function merge3(local, cloud, base, path, conflicts) {
    if (same(local, cloud)) return clone(local);
    if (plain(local) || plain(cloud) || plain(base)) {
      var l = plain(local) ? local : {}, c = plain(cloud) ? cloud : {}, b = plain(base) ? base : {};
      var keys = {};
      Object.keys(l).concat(Object.keys(c), Object.keys(b)).forEach(function (k) { keys[k] = true; });
      var out = {};
      Object.keys(keys).forEach(function (k) {
        out[k] = merge3(l[k], c[k], b[k], path ? path + '.' + k : k, conflicts);
      });
      return out;
    }
    if (Array.isArray(local) || Array.isArray(cloud) || Array.isArray(base)) {
      var la = Array.isArray(local) ? local : [], ca = Array.isArray(cloud) ? cloud : [], ba = Array.isArray(base) ? base : [];
      if (same(la, ca)) return clone(la);
      if (same(la, ba)) return clone(ca);
      if (same(ca, ba)) return clone(la);
      if (!la.length && ca.length) return clone(ca);
      if (!ca.length && la.length) return clone(la);
      conflicts.push({ path:path, label:pathLabel(path), local:clone(la), cloud:clone(ca) });
      return clone(la);
    }

    var localChanged = !same(local, base);
    var cloudChanged = !same(cloud, base);
    if (!localChanged && cloudChanged) return clone(cloud);
    if (localChanged && !cloudChanged) return clone(local);
    if (!meaningful(local) && meaningful(cloud)) return clone(cloud);
    if (meaningful(local) && !meaningful(cloud)) return clone(local);
    if (!meaningful(local) && !meaningful(cloud)) return clone(local != null ? local : cloud);
    conflicts.push({ path:path, label:pathLabel(path), local:clone(local), cloud:clone(cloud) });
    return clone(local);
  }

  function specialistFromRemote(remote, appt) {
    var out = appt && appt.ui_state && appt.ui_state._journey && appt.ui_state._journey.specialists ? clone(appt.ui_state._journey.specialists) : {};
    if (remote && (remote.ev_state || remote.ev_state_json)) out.ev = parse(remote.ev_state || remote.ev_state_json) || remote.ev_state || remote.ev_state_json;
    return out || {};
  }

  function analyse(rowLike) {
    var conflict = rowLike && rowLike.conflict;
    if (!conflict) return null;
    var remote = conflict.cloud || {};
    if (remote.deleted) return { conflicts:[{ path:'profile', label:'Profile', local:'Exists on this device', cloud:'Deleted from Cloud' }], mergedAppointment:clone(rowLike.appointment_state), mergedSpecialists:clone(rowLike.specialist_state || {}) };

    var localAppt = conflict.local && conflict.local.appointment_state || rowLike.appointment_state || null;
    localAppt = localAppt ? canonical.normaliseAppointment(localAppt) : canonical.normaliseAppointment({});
    var cloudAppt = remoteAppointment(remote) || canonical.normaliseAppointment({});
    var baseAppt = baseAppointment(conflict.base || rowLike.base_cloud_snapshot) || canonical.normaliseAppointment({});
    var conflicts = [];
    var mergedCanonical = merge3(localAppt.canonical || {}, cloudAppt.canonical || {}, baseAppt.canonical || {}, '', conflicts);
    var localSpec = conflict.local && conflict.local.specialist_state || rowLike.specialist_state || {};
    var cloudSpec = specialistFromRemote(remote, cloudAppt);
    var baseRemote = conflict.base || rowLike.base_cloud_snapshot || {};
    var baseSpec = specialistFromRemote(baseRemote, baseAppointment(baseRemote));
    var mergedSpec = merge3(localSpec || {}, cloudSpec || {}, baseSpec || {}, 'specialist', conflicts);
    var mergedAppt = clone(localAppt);
    mergedAppt.canonical = mergedCanonical;
    if (mergedAppt.ui_state && mergedAppt.ui_state._journey) mergedAppt.ui_state._journey.specialists = clone(mergedSpec);
    return { conflicts:conflicts, mergedAppointment:mergedAppt, mergedSpecialists:mergedSpec, remote:remote };
  }

  async function guardedPut(input, options) {
    var next = clone(input || {});
    var name = String(next.customer_name || next.appointment_state && next.appointment_state.canonical && next.appointment_state.canonical.customerName || '').trim();

    /* A blank screen is a transient draft, not a customer profile. */
    if (!next.deleted && !name) {
      return Object.assign({
        schema_version:1, local_id:String(next.local_id || store.makeId()), cloud_id:String(next.cloud_id || ''), customer_name:'',
        appointment_state:next.appointment_state || null, specialist_state:next.specialist_state || {}, basket_url:next.basket_url || '',
        local_revision:Number(next.local_revision || 0), cloud_synced_local_revision:Number(next.cloud_synced_local_revision || 0),
        sync_state:'draft', deleted:false, tombstone:false, conflict:null, created_at:next.created_at || new Date().toISOString(), updated_at:new Date().toISOString()
      }, next, { customer_name:'', sync_state:'draft' });
    }

    if (next.sync_state === 'conflict' && next.conflict) {
      var result = analyse(next);
      if (result) {
        if (!result.conflicts.length) {
          var remote = result.remote || {};
          next.appointment_state = result.mergedAppointment;
          next.specialist_state = result.mergedSpecialists;
          next.customer_name = String(result.mergedAppointment && result.mergedAppointment.canonical && result.mergedAppointment.canonical.customerName || next.customer_name || remote.customer_name || '').trim();
          next.basket_url = result.mergedAppointment && result.mergedAppointment.canonical && result.mergedAppointment.canonical.basketUrl || next.basket_url || remote.basket_url || '';
          next.cloud_customer = clone(remote);
          next.base_cloud_revision = remoteVersion(remote) || next.base_cloud_revision || '';
          next.base_cloud_snapshot = clone(remote);
          next.conflict = null;
          next.sync_state = 'pending';
        } else {
          next.conflict.true_conflicts = result.conflicts;
        }
      }
    }
    return originalPut(next, options);
  }

  async function cleanExisting() {
    try {
      var rows = await originalList(true);
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (!row.deleted && !String(row.customer_name || '').trim()) await originalRemove(row.local_id);
      }
      rows = await originalList(true);
      for (var j = 0; j < rows.length; j++) {
        var r = rows[j];
        if (!r.deleted && r.conflict) {
          var result = analyse(r);
          if (!result) continue;
          if (!result.conflicts.length) {
            var remote = result.remote || {};
            await originalPut(Object.assign({}, r, {
              appointment_state:result.mergedAppointment,
              specialist_state:result.mergedSpecialists,
              customer_name:String(result.mergedAppointment && result.mergedAppointment.canonical && result.mergedAppointment.canonical.customerName || r.customer_name || remote.customer_name || '').trim(),
              basket_url:result.mergedAppointment && result.mergedAppointment.canonical && result.mergedAppointment.canonical.basketUrl || r.basket_url || remote.basket_url || '',
              cloud_customer:clone(remote), base_cloud_revision:remoteVersion(remote) || r.base_cloud_revision || '', base_cloud_snapshot:clone(remote),
              conflict:null, sync_state:'pending'
            }), { keepRevision:true, keepSyncState:true });
          } else if (!same(r.conflict.true_conflicts || [], result.conflicts)) {
            await originalPut(Object.assign({}, r, { conflict:Object.assign({}, r.conflict, { true_conflicts:result.conflicts }) }), { keepRevision:true, keepSyncState:true });
          }
        }
      }
    } catch (_) {}
  }

  store.put = guardedPut;
  store.__v242Wrapped = true;
  global.AppointmentCompanionReconcileV242 = { analyse:analyse, meaningful:meaningful, merge3:merge3 };
  setTimeout(cleanExisting, 80);
})(window);

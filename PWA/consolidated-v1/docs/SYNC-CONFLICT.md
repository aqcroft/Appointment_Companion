# Identity, synchronisation and conflict model

## Identity

- `local_id` is required, generated on the device and is the primary key in IndexedDB.
- `cloud_id` is optional and assigned/linked only after a Cloud acknowledgement.
- Cloud connection, authentication failure or Cloud deletion never prevents creation, editing, saving, reopening, specialist use or local deletion.
- Device and tab IDs describe presence only. They are not customer identities.

## Revision model

Every meaningful local write increments `local_revision` and creates a new `client_revision_id`. A successful Cloud acknowledgement records:

- `cloud_synced_local_revision`
- `base_cloud_revision` (server revision when available, otherwise its returned `updated_at`)
- `base_cloud_snapshot`

These values form the last common point used for the next reconciliation.

## Conservative reconciliation

For a linked record, compare local and Cloud to the last acknowledged base:

| Local changed? | Cloud changed? | Result |
|---|---|---|
| No | No | Keep synced. |
| Yes | No | Send the current canonical local record; update the base only after acknowledgement. |
| No | Yes | Hydrate the Cloud version into IndexedDB, then paint the UI from IndexedDB. |
| Yes | Yes, content equivalent | Mark synced and advance the base. |
| Yes | Yes, content divergent | Preserve local, Cloud and base snapshots; set `sync_state = conflict`; ask the Partner to choose. |

Last-write-wins is permitted only when metadata proves the other side has not changed since the base. A timestamp alone does not justify discarding two independently changed versions.

## Conflict resolution

- **Keep mine:** clear the displayed conflict, retain the Cloud snapshot in conflict history and upload the local version against the new base.
- **Use Cloud:** archive the local/base conflict detail in history, replace canonical state locally, then mark the acknowledged local revision synced.
- **Remote deletion + local change:** surface a conflict; do not silently delete the local work.
- **Remote deletion + no local change:** remove the local synced copy after hydration confirms it is absent.

## Deletion

Local deletion writes a tombstone immediately and removes the customer from normal local lists. A linked record remains as `pending_delete` until Cloud acknowledges deletion. Only then is the tombstone physically removed. An unlinked local record can be removed after the local deletion transaction completes.

## Retry and authentication

Sync runs after local commit, on connectivity/focus/authentication events and with bounded exponential backoff. Authentication is a sync capability, not an operational gate. `?local=1` disables all Cloud reads, writes and Cloud-backed sharing deliberately.


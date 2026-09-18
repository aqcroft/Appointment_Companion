export class UnsavedWorkGuard {
  constructor({ save, restore, modal }) {
    this.save = save;
    this.restore = restore;
    this.modal = modal;
    this.persistedFingerprint = '';
    this.currentFingerprint = '';
    this.pendingResolve = null;
    this.beforeUnload = event => {
      if (!this.isDirty()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', this.beforeUnload);
    modal?.addEventListener('click', event => {
      const action = event.target.closest('[data-unsaved-action]')?.dataset.unsavedAction;
      if (action) this.choose(action);
    });
  }

  static fingerprint(value) { return JSON.stringify(value); }

  initialise(value) {
    this.currentFingerprint = UnsavedWorkGuard.fingerprint(value);
    this.persistedFingerprint = this.currentFingerprint;
  }

  changed(value) { this.currentFingerprint = UnsavedWorkGuard.fingerprint(value); }

  persisted(value) {
    this.currentFingerprint = UnsavedWorkGuard.fingerprint(value);
    this.persistedFingerprint = this.currentFingerprint;
  }

  isDirty() { return this.currentFingerprint !== this.persistedFingerprint; }

  async confirmNavigation() {
    if (!this.isDirty()) return true;
    this.modal?.showModal();
    return new Promise(resolve => { this.pendingResolve = resolve; });
  }

  async choose(action) {
    if (!this.pendingResolve) return;
    if (action === 'save') {
      try { await this.save(); }
      catch { return; }
      this.modal.close();
      this.pendingResolve(true);
    } else if (action === 'discard') {
      await this.restore();
      this.modal.close();
      this.pendingResolve(true);
    } else {
      this.modal.close();
      this.pendingResolve(false);
    }
    this.pendingResolve = null;
  }
}


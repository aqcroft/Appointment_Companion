/* Cloud pilot path shim - loads the root Appointment Companion tariff status script. */
(function () {
  'use strict';
  const s = document.createElement('script');
  s.src = '../tariff-status.js';
  s.async = false;
  document.head.appendChild(s);
})();

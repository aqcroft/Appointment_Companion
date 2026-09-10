/* Cloud pilot path shim - loads the root Appointment Companion tariff status script. */
(function () {
  'use strict';
  const s = document.createElement('script');
  s.src = '../tariff-status.js?v=20260910-sweep1';
  s.async = false;
  document.head.appendChild(s);
})();

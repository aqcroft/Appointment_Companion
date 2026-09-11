(function (global) {
  'use strict';
  function register() {
    var registry = global.AppointmentCompanionSpecialists;
    if (!registry || typeof registry.register !== 'function') return false;
    registry.register({ tool_id: 'ev', label: 'EV Companion', emoji: '🚙', url: './ev/', description: 'Explore EV charging and tariff costs using this local customer journey.' });
    return true;
  }
  if (register()) return;
  var attempts = 0, timer = setInterval(function () { if (register() || ++attempts > 60) clearInterval(timer); }, 50);
})(window);

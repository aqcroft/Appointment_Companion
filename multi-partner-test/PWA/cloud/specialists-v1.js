/* Specialist Companion registry v1
   Add future specialist tools here without changing the launcher architecture.
*/
(function (global) {
  'use strict';

  function registerAll() {
    const registry = global.AppointmentCompanionSpecialists;
    if (!registry || typeof registry.register !== 'function') return false;

    registry.register({
      tool_id: 'ev',
      label: 'EV Companion',
      emoji: '🚙',
      url: '../cloud-ev-pilot.html',
      description: 'Explore EV charging and tariff costs using this customer journey.'
    });

    return true;
  }

  if (registerAll()) return;

  let attempts = 0;
  const timer = setInterval(function () {
    attempts++;
    if (registerAll() || attempts > 60) clearInterval(timer);
  }, 50);
})(window);

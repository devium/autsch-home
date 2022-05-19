navigator.serviceWorker.getRegistrations().then(function(serviceWorkers) {
  serviceWorkers.forEach(serviceWorker => serviceWorker.unregister());
  console.log("Unregistered " + serviceWorkers.length + " service workers for " + window.location.origin);
  if (window.location.origin.startsWith('https://www.')) {
    window.location.replace('https://{{ $.Site.Params.baseDomain }}');
  } else {
    window.location.replace('https://www.{{ $.Site.Params.baseDomain }}/clear');
  }
});

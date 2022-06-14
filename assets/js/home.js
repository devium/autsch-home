document.addEventListener('DOMContentLoaded', function() {
  if (location.hash !== null && location.hash !== '') {
    const id = '#accordion-' + location.hash.substr(1)
    $('.accordion-collapse.show').not(id).collapse('hide');
    $(id).collapse('show');
    fullCalendar.render();
    window.scrollTo(0, 0);
  }
});
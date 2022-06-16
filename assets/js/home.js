document.addEventListener('DOMContentLoaded', function() {
  if (location.hash !== null && location.hash !== '') {
    const id = '#accordion-' + location.hash.substr(1)
    $('.accordion-collapse.show').not(id).collapse('hide');
    $(id).collapse('show');
    fullCalendar.render();
    window.scrollTo(0, 0);
  }
});

$('.accordion-button').click(function(e) {
  const button = $(e.delegateTarget);
  const collapse = button.parents('.accordion-item').children('.accordion-collapse')
  if (button.hasClass('collapsed')) {
    location.hash = '';
  } else {
    location.hash = '#' + collapse.attr('id').replace('accordion-', '');
  }
});

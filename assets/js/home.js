var charlotte = false;
var charlotteAnimation;

document.addEventListener('DOMContentLoaded', function() {
  if (location.hash !== null && location.hash !== '') {
    const id = '#accordion-' + location.hash.substr(1)
    $('.accordion-collapse.show').not(id).collapse('hide');
    $(id).collapse('show');
    window.scrollTo(0, 0);
  }

  resetCursors();
  $('#charlotte').click(toggleCharlotte);
});

function resetCursors() {
  $('html').css({
    '--cursor-default': 'default',
    '--cursor-pointer': 'pointer',
    '--cursor-text': 'text'
  });
}

function toggleCharlotte() {
  if (charlotte) {
    clearInterval(charlotteAnimation);
    resetCursors();
  } else {
    {{ $charlotteDefault := resources.Get "/img/charlotte.png" }}
    {{ $charlottePointing := resources.Get "/img/charlotte_pointing.png" }}
    $('html').css({
      '--cursor-default': 'url({{ $charlottePointing.RelPermalink }}) 21 5, auto',
      '--cursor-pointer': 'url({{ $charlotteDefault.RelPermalink }}) 21 5, auto',
      '--cursor-text': 'url({{ $charlottePointing.RelPermalink }}) 21 5, auto'
    });

    const setDefaultCharlotte = function() {
      if (charlotte) {
        $('html').css({
          '--cursor-pointer': 'url({{ $charlotteDefault.RelPermalink }}) 21 5, auto',
        })
      }
    };
    charlotteAnimation = setInterval(function() {
      $('html').css({
        '--cursor-pointer': 'url({{ $charlottePointing.RelPermalink }}) 21 5, auto',
      });
      setTimeout(setDefaultCharlotte, 100);
    }, 200);
  }
  charlotte = !charlotte;
}

$('.accordion-button.anchor').click(function(e) {
  const button = $(e.delegateTarget);
  const collapse = button.parents('.accordion-item').children('.accordion-collapse')
  if (button.hasClass('collapsed')) {
    location.hash = '';
  } else {
    location.hash = '#' + collapse.attr('id').replace('accordion-', '');
  }
});

{{ $jitsiUrl := printf "https://hang.%s" $.Site.Params.baseDomain }}

async function requestNotificationPermission() {
  if (!Notification) {
    console.warn('Notifications not available.');
    return;
  }

  if (Notification.permission !== 'granted') {
    await Notification.requestPermission();
    updateBellIcon();
  }
}

function updateBellIcon() {
  const icon = $('#notification-request');
  icon.removeClass('bi-bell bi-bell-fill bi-bell-slash');
  var title;

  if (Notification.permission === 'granted') {
    icon.addClass('bi-bell-fill');
    title = 'Raumbenachrichtigungen aktiviert.';
  } else if (Notification.permission ==='denied') {
    icon.addClass('bi-bell-slash');
    title = 'Raumbenachrichtigungen blockiert.';
  } else {
    icon.addClass('bi-bell');
    title = 'Raumbenachrichtigungen aktivieren.';
  }

  const oldTooltip = bootstrap.Tooltip.getInstance(icon);
  if (oldTooltip) {
    oldTooltip.dispose();
  }
  const tooltip = new bootstrap.Tooltip(icon, { title: title, placement: 'bottom' });
}

function sortRoomsByName(a, b) {
  return ((a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0);
}

var rooms = [];

function refresh(notificationsEnabled) {
  $.getJSON('{{ $jitsiUrl }}/rooms', function(data) {
    data.rooms.sort(sortRoomsByName);

    $('#rooms').children().slice(1).remove();

    var roomsNew = [];
    
    $.each(data.rooms, function(_, room) {
      roomsNew.push(room.name);
      renderRoom(room);
    });

    $('#numRooms').text("(" + data.num_rooms + ")")

    if (notificationsEnabled) {
      var roomDiff = $(roomsNew).not(rooms);
      if (roomDiff.length > 0) {
        notify(roomDiff[0]);
      }
    } 
    rooms = roomsNew;
  });
};

function renderRoom(room) {
  $('#rooms').append(
    $('<div>', { class: 'col'}).append(
      $('<div>', { class: 'd-block card card-hover h-100' }).append(
        $('<div>', { class: 'card-header text-center d-flex' }).append(
          $('<a>', {
            class: 'h5 text-decoration-none flex-grow-1 text-truncate text-dark card-title',
            href: '{{ $jitsiUrl }}/' + room.name,
            target: '_blank'
          }).text(room.name)
        ).append(
          $('<div>', { class: 'dropdown' }).append(
            $('<button>', {
              class: 'btn btn-sm btn-outline-dark bi bi-three-dots-vertical ms-1',
              type: 'button',
              'data-bs-toggle': 'dropdown'
            })
          ).append(
            $('<ul>', { class: 'dropdown-menu dropdown-menu-end' }).append(
              $('<li>').append(
                $('<a>', {
                  class: 'dropdown-item text-end',
                  href: '{{ $jitsiUrl }}/' + room.name,
                  target: '_blank'
                }).text('Als Gast beitreten').append(
                  $('<span>', { class: 'bi bi-person ps-2' })
                ).append(
                  $('<span>', { class: 'bi bi-box-arrow-in-right' })
                )
              )
            ).append(
              $('<li>').append(
                $('<a>', {
                  class: 'dropdown-item text-end',
                  href: '{{ $jitsiUrl }}/oidc/auth?path=%2F' + room.name,
                  target: '_blank'
                }).text('Anmelden und beitreten').append(
                  $('<span>', { class: 'bi bi-key ps-2' })
                ).append(
                  $('<span>', { class: 'bi bi-box-arrow-in-right' })
                )
              )
            )
          )
        )
      ).append(
        $('<a>', {
          class: 'text-decoration-none text-dark',
          href: '{{ $jitsiUrl }}/' + room.name,
          target: '_blank'
          }).append(
          $('<div>', {
            class: 'card-body'
          }).append(
            $('<h6>', { class: 'mb-0' }).text('Hauptraum (' + room.occupants.length + '):' )
          ).append(
            $('<div>').append(
              $.map(room.occupants, function(occupant, _) {
                return $('<span>', { class: 'badge bg-light text-dark mx-1' }).text(occupant.name);
              })
            )
          ).append(
            $.map(room.breakoutRooms, function(breakoutRoom, _) {
              return $.merge(
                [$('<h6>', { class: 'mb-0' }).text(breakoutRoom.name + ' (' + breakoutRoom.occupants.length + '):')],
                $('<div>').append(
                  $.map(breakoutRoom.occupants, function(occupant, _) {
                    return $('<span>', { class: 'badge bg-light text-dark mx-1' }).text(occupant.name);
                  })
                )
              );
            })
          )
        )
      )
    )
  );
}

function notify(roomName) {
  if (Notification.permission !== 'granted') {
    return;
  }
  else {
    var notification = new Notification('Neuer Jitsi-Raum', {
     body: 'Ein neuer Jitsi-Raum wurde geöffnet: ' + roomName,
    });
    notification.onclick = function() {
      window.open('{{ $jitsiUrl }}' + roomName);
    };
  }
}

document.addEventListener('DOMContentLoaded', function() {
  $('#roomname').keyup(function(event) {
    if (event.keyCode === 13) {
      $('#openroom').click();
    }
  });

  $('#notification-request').click(function(event) {
    requestNotificationPermission();
  });

  $('#openroom').click(function(event) {
    window.open('{{ $jitsiUrl }}/oidc/auth?path=%2F' + $('#roomname').val().replace(/\s/g, '_'), '_blank')
  });

  $('[data-bs-toggle="tooltip"]').get().map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
  });

  $(function() {
    refresh(false);
    setInterval(function() {
      refresh(true);
    }, 15000);
  });

  updateBellIcon();
});

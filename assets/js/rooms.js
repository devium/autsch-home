{{ $jitsiUrl := printf "https://hang.%s" $.Site.Params.baseDomain }}

function requestNotificationPermission() {
  if (!Notification) {
    console.warn('Notifications not available.');
    return;
  }

  if (Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
}

function sortRoomsByName(a, b) {
  return ((a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0);
}

var rooms = [];

function refresh(notifications_enabled) {
  $.getJSON('{{ $jitsiUrl }}/rooms', function(data) {
    data.rooms.sort(sortRoomsByName);

    $('#rooms').children().slice(1).remove();

    var roomsNew = [];
    
    $.each(data.rooms, function(_, room) {
      roomsNew.push(room.name);
      renderRoom(room);
    });

    $('#numRooms').text("(" + data.num_rooms + ")")

    if (notifications_enabled) {
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
                  href: 'https://login.hang.{{ $.Site.Params.baseDomain }}/' + room.name,
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

function notify(room_name) {
  if (Notification.permission !== 'granted') {
    return;
  }
  else {
    var notification = new Notification('Neuer Jitsi-Raum', {
     body: 'Ein neuer Jitsi-Raum wurde geöffnet: ' + room_name,
    });
    notification.onclick = function() {
      window.open('{{ $jitsiUrl }}' + room_name);
    };
  }
}

$('#roomname').keyup(function(event) {
  if (event.keyCode === 13) {
    $('#openroom').click();
  }
});

$('#notification-request').click(function(event) {
  requestNotificationPermission();
});

$('#openroom').click(function(event) {
  window.open('https://login.hang.{{ $.Site.Params.baseDomain }}/' + $('#roomname').val(), '_blank')
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

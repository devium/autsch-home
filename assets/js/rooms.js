{{ $jitsiUrl := printf "https://%s.%s" $.Site.Params.subdomains.jitsi $.Site.Params.baseDomain }}

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

    $('#roomsHeading').text("Jitsi-Raumübersicht (" + data.num_rooms + ")")

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
  var col = $('#rooms').append(
    $('<div>', { class: "col"}).append(
      $('<a>', {
        class: 'text-decoration-none text-dark d-block card card-hover cursorPointer h-100',
        href: '{{ $jitsiUrl }}/' + room.name,
        target: '_blank'
      }).append(
        $('<div>', { class: 'card-header text-center' }).append(
          $('<h5>').text(room.name)
        )
      ).append(
        $('<div>', { class: 'card-body' }).append(
          $('<h6>').text('Hauptraum (' + room.occupants.length + '):' )
        ).append(
          $('<div>', { class: 'row row-cols-2'}).append(
            $.map(room.occupants, function(occupant, _) {
              return $('<div>', { class: 'col' }).text(occupant.name);
            })
          )
        ).append(
          $.map(room.breakoutRooms, function(breakoutRoom, _) {
            return $.merge(
              [$('<h6>').text(breakoutRoom.name + ' (' + breakoutRoom.occupants.length + '):')],
              $.map(breakoutRoom.occupants, function(occupant, _) {
                return $('<p>').text(occupant.name);
              })
            );
          })
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

$(function() {
  refresh(false);
  setInterval(function() {
    refresh(true);
  }, 10000);
});

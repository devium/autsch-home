var fullCalendar = null;

function createCalendar(calendar) {
  var calendarEl = document.getElementById('calendar');

  fullCalendar = new FullCalendar.Calendar(calendarEl, {
    themeSystem: 'bootstrap5',
    locale: 'de',
    initialView: 'dayGridMonth',
    contentHeight: 600,
    footerToolbar: {
      center: 'dayGridMonth,listMonth'
    },
    eventClick: function(eventClickInfo) {
      $('#modalTitle').text(eventClickInfo.event._def.title);

      var body = $('#modalBody');
      body.empty();
      var props = eventClickInfo.event._def.extendedProps;

      if (eventClickInfo.event.start !== null) {
        body.append($('<h6>').text("Beginn:"));
        const weekday = eventClickInfo.event.start.toLocaleString([], { weekday: 'short' });
        const date = eventClickInfo.event.start.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        body.append($('<p>').text(weekday + ', ' + date));
      }
      if (eventClickInfo.event.end !== null) {
        body.append($('<h6>').text("Ende:"));
        const weekday = eventClickInfo.event.end.toLocaleString([], { weekday: 'short' });
        const date = eventClickInfo.event.end.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        body.append($('<p>').text(weekday + ', ' + date));
      }

      if (props.description !== null) {
        body.append($('<h6>').text("Beschreibung:"));
        body.append($('<p>').text(props.description)).linkify({ target: '_blank' });
      }
      if (props.location !== null) {
        body.append($('<h6>').text("Ort:"));
        body.append($('<p>').text(props.location)).linkify({ target: '_blank' });
      }
    },
    eventDidMount: function(arg) {
      $(arg.el)
        .attr('data-bs-toggle', 'modal')
        .attr('data-bs-target', '#eventModal');
    },
    displayEventTime: false,
    eventDisplay: 'block'
  });

  fullCalendar.render();
  return fullCalendar;
}

function renderCalendar(calendar) {
  if (fullCalendar === null) {
    fullCalendar = createCalendar(calendar);
  }
  fullCalendar.setOption('events', {
    url: "https://next.{{ $.Site.Params.baseDomain }}/remote.php/dav/public-calendars/" + calendar.id + "?export",
    format: "ics"
  });

  $('#copyUrl').click(function () {
    navigator.clipboard.writeText('webcal://next.{{ $.Site.Params.baseDomain }}/remote.php/dav/public-calendars/' + calendar.id + '/?export');
    $('#copyUrlIcon').removeClass("bi-clipboard-plus").addClass("bi-clipboard-check");
    setTimeout(function() {
      $('#copyUrlIcon').removeClass("bi-clipboard-check").addClass("bi-clipboard-plus");
    }, 2000);
  });
  $('#nextcloud').attr('href', 'https://next.{{ $.Site.Params.baseDomain }}/apps/calendar/p/' + calendar.id);
}

document.addEventListener('DOMContentLoaded', function() {
  var calendars = {{ .Site.Data.calendars.items | jsonify }};

  var hash = location.hash.replace(/^#/, '');
  var calendar = calendars.find(calendar => calendar.slug == hash);

  if (!calendar) {
    calendar = calendars[0];
  }
  renderCalendar(calendar);

  $('a[href="#' + calendar.slug + '"].nav-link').tab('show');

  $('.nav-tabs a').on('shown.bs.tab', function (e) {
    window.location.hash = e.target.hash;
  })
});

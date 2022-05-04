var fullCalendar = null;
const calendars = {{ .Site.Data.calendars.items | jsonify }};

function createCalendar() {
  const calendarEl = document.getElementById('calendar');

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

      const calendar = calendars.find(function(cal) { return cal.id === eventClickInfo.event.source.id });

      const body = $('#modalBody');
      body.empty();

      const props = eventClickInfo.event._def.extendedProps;
      const allDay = eventClickInfo.event.allDay;

      if (eventClickInfo.event.start !== null) {
        body.append($('<h6>').text("Beginn:"));
        const weekday = eventClickInfo.event.start.toLocaleString([], { weekday: 'short' });
        const options = allDay ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' }
        const date = eventClickInfo.event.start.toLocaleString([], options);
        body.append($('<p>').text(weekday + ', ' + date));
      }
      if (eventClickInfo.event.end !== null) {
        body.append($('<h6>').text("Ende:"));
        const weekday = eventClickInfo.event.end.toLocaleString([], { weekday: 'short' });
        const options = allDay ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' }
        const date = eventClickInfo.event.end.toLocaleString([], options);
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

      $('#modalFooterBadge').css('background-color', calendar.color);
      $('#modalFooterText').text(calendar.name);
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

function refreshCalendars() {
  if (fullCalendar === null) {
    fullCalendar = createCalendar();
  }
  var calendarOptions = $('.calendar-checkbox').filter(function() { return this.checked; }).map(function() {
    return {
      id: this.id,
      url: 'https://next.{{ $.Site.Params.baseDomain }}/remote.php/dav/public-calendars/' + this.id + '?export',
      format: 'ics',
      color: $('#color-' + this.id).css('background-color'),
    };
  });

  fullCalendar.setOption('eventSources', calendarOptions.get());
}

function toggleAllCalendars() {
  $('#calendars-dropdown .calendar-checkbox').prop('checked', $('#checkbox-all')[0].checked);
  refreshCalendars();
}

function copyICal(id) {
  navigator.clipboard.writeText('webcal://next.{{ $.Site.Params.baseDomain }}/remote.php/dav/public-calendars/' + id + '/?export');

  const icon = $('#copy-ical-icon-' + id)
  icon.removeClass("bi-clipboard-plus").addClass("bi-clipboard-check");
  setTimeout(function() {
    icon.removeClass("bi-clipboard-check").addClass("bi-clipboard-plus");
  }, 2000);
}

document.addEventListener('DOMContentLoaded', function() {
  refreshCalendars();

  $('#calendars-dropdown').click(function(e) {
    e.stopPropagation();
  });
});

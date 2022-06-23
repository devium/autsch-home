var fullCalendar = null;

function createCalendar() {
  const calendarEl = document.getElementById('fullcalendar');

  fullCalendar = new FullCalendar.Calendar(calendarEl, {
    themeSystem: 'bootstrap5',
    locale: 'de',
    initialView: 'dayGridMonth',
    contentHeight: 'auto',
    footerToolbar: {
      center: 'dayGridMonth,listMonth'
    },
    eventClick: renderEventDetails,
    eventDidMount: function(arg) {
      $(arg.el)
        .attr('data-bs-toggle', 'modal')
        .attr('data-bs-target', '#modal');
    },
    displayEventTime: false,
    eventDisplay: 'block',
    viewDidMount: function(arg) {
      $('#fullcalendar .btn-primary').addClass('btn-dark').removeClass('btn-primary');
    }
  });

  fullCalendar.render();
  return fullCalendar;
}

function loadLocalStorage() {
  const calendarsStored = JSON.parse(localStorage.getItem('calendars') || '{}');
  $.each(locations, function(index, location) {
    $.each(location.calendars, function(index, calendar) {
      if (calendar.id in calendarsStored) {
        calendar.checked = calendarsStored[calendar.id];

        if (location.id === 'global') {
          $('#checkbox-' + calendar.id).prop('checked', calendarsStored[calendar.id]);
        }
      }
    });
  });
}

function refreshCalendars() {
  if (fullCalendar === null) {
    fullCalendar = createCalendar();
  }

  const calendars = $.map(locations, location => location.calendars);
  const activeCalendars = calendars.filter(calendar => calendar.checked);
  const calendarOptions = activeCalendars.map(function(calendar) {
    return {
      id: calendar.id,
      url: 'https://next.{{ $.Site.Params.baseDomain }}/remote.php/dav/public-calendars/' + calendar.id + '?export',
      format: 'ics',
      color: calendar.color,
    };
  });
  fullCalendar.setOption('eventSources', calendarOptions);

  const calendarsEntry = Object.fromEntries(calendars.map(calendar => [ calendar.id, calendar.checked ]));
  localStorage.setItem('calendars', JSON.stringify(calendarsEntry));
}

function copyICal(id, iconEl) {
  navigator.clipboard.writeText('webcal://next.{{ $.Site.Params.baseDomain }}/remote.php/dav/public-calendars/' + id + '/?export');

  iconEl.removeClass("bi-clipboard-plus").addClass("bi-clipboard-check");
  setTimeout(function() {
    iconEl.removeClass("bi-clipboard-check").addClass("bi-clipboard-plus");
  }, 2000);
}

function renderEventDetails(eventClickInfo) {
  $('#modalTitle').text(eventClickInfo.event._def.title);

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

  const calendar = $.map(locations, location => location.calendars).find(cal => cal.id == eventClickInfo.event.source.id);
  $('#modalFooter').removeClass('d-none');
  $('#modalFooterBadge').css('background-color', calendar.color);
  $('#modalFooterText').text(calendar.name);
}

function renderPins(e) {
  const paddingX = parseInt($('#map-menu').css('padding-left'));
  const paddingY = parseInt($('#map-menu').css('padding-top'));
  const pinOffset = [16, 44];
  const offsetX = paddingX - pinOffset[0];
  const offsetY = paddingY - pinOffset[1];

  const origin = [55.10, 5.55];
  const end = [45.65, 17.30];
  const map = $('#map');
  const scaleX = map.width() / (end[1] - origin[1]);
  const scaleY = map.height() / (end[0] - origin[0]);

  $('.map-pin').each(function() {
    const el = $(this);
    const location = locations.find(loc => loc.id === el.attr('location'));
    const loc = location.loc.split(', ');
    const x = (loc[1] - origin[1]) * scaleX;
    const y = (loc[0] - origin[0]) * scaleY;
    el.css({
      'left': Math.max(x + offsetX, 0),
      'top': Math.max(y + offsetY, 0)
    });

    el.removeClass('text-success text-primary text-muted');
    if (location.calendars.length > 0 && location.calendars.every(calendar => calendar.checked)) {
      el.addClass('text-success');
    } else if (location.calendars.some(calendar => calendar.checked)) {
      el.addClass('text-primary');
    } else {
      el.addClass('text-muted');
    }
  });
}

function renderCalendarTable(thisObj) {
  bootstrap.Tooltip.getInstance(thisObj.children('span')[0]).hide();

  const location = locations.find(loc => loc['id'] === thisObj.attr('location'));

  $('#modalTitle').text(location.name);

  const body = $('#modalBody');
  body.empty();

  body.append($('<table>', { class: 'table align-middle text-white' }).append(
    $('<thead>').append(
      $('<tr>').append(
        $('<th>')
      ).append(
        $('<th>', { class: 'text-center' }).text('In Nextcloud öffnen')
      ).append(
        $('<th>', { class: 'text-center' }).text('iCal-Link kopieren')
      )
    )
  ).append(
    $('<tbody>').append(
      $.map(location.calendars, calendar => $('<tr>').append(
        $('<td>').append(
          $('<input>', {
            id: 'checkbox-' + calendar.id,
            class: 'form-check-input calendar-checkbox',
            type: 'checkbox',
            value: '',
            calendar: calendar.id
          }).prop('checked', calendar.checked).click(function() { toggleCalendar($(this)); })
        ).append(
          $('<span>', {
            class: 'badge mx-1',
            style: 'background-color: ' + calendar.color
          }).html('&nbsp;')
        ).append(
          $('<label>', {
            class: 'form-check-label user-select-none',
            for: 'checkbox-' + calendar.id
          }).text(calendar.name)
        )
      ).append(
        $('<td>', { class: 'text-center' }).append(
          $('<a>', {
            href: 'https://next.{{ $.Site.Params.baseDomain }}/apps/calendar/p/' + calendar.id,
            target: '_blank',
            class: 'btn btn-xs'
          }).append(
            $('<span>', { class: 'bi bi-box-arrow-up-right text-white' })
          )
        )
      ).append(
        $('<td>', { class: 'text-center' }).append(
          $('<button>', {
            class: 'btn btn-xs',
            role: 'button'
          }).click(function() {
            navigator.clipboard.writeText('webcal://next.{{ $.Site.Params.baseDomain }}/remote.php/dav/public-calendars/' + calendar.id + '/?export');
            const icon = $(this).children('span');
            icon.removeClass('bi-clipboard-plus').addClass('bi-clipboard-check');
            setTimeout(function() {
              icon.removeClass('bi-clipboard-check').addClass('bi-clipboard-plus');
            }, 2000);
          }).append(
            $('<span>', { class: 'bi bi-clipboard-plus text-white' })
          )
        )
      ))
    )
  ));

  $('#modalFooter').addClass('d-none');
}

function toggleCalendar(thisObj) {
  const calendar = $.map(locations, location => location.calendars).find(calendar => calendar.id == thisObj.attr('calendar'));
  calendar.checked = thisObj.is(':checked');
  refreshCalendars();
  renderPins();
}

var initialized = false;
var locations = [];

document.addEventListener('DOMContentLoaded', function() {
  if (initialized) {
    return
  }

  initialized = true;

  locations = {{ .Site.Data.locations | jsonify }};
  loadLocalStorage();
  refreshCalendars();

  $('#calendars-dropdown').click(function(e) {
    e.stopPropagation();
  });

  $('#modal').click(function(e) {
    e.stopPropagation();
  });

  $('[data-bs-target="#accordion-calendar"]').click(function(e) {
    fullCalendar.render();
  });

  $('#map-dropdown').click(function(e) {
    e.stopPropagation();
  });

  $('#map-toggle').click(function(e) {
    if ($('#map-menu').hasClass('show')) {
      renderPins(e);
    }
  });

  $('.map-pin').click(function() {
    renderCalendarTable($(this));
  });

  $('.calendar-checkbox').click(function() {
    toggleCalendar($(this));
  });

  $('.copy-ical').click(function() {
    const thisObj = $(this);
    copyICal(thisObj.attr('calendar'), thisObj.children('span'));
  });
});

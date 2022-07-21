var fullCalendar = null;
var locations = {{ .Site.Data.locations | jsonify }};
var calendars = {{ .Site.Data.calendars | jsonify }};

function createCalendar() {
  const calendarEl = document.getElementById('fullcalendar');

  fullCalendar = new FullCalendar.Calendar(calendarEl, {
    themeSystem: 'bootstrap5',
    locale: 'de',
    initialView: 'dayGridMonth',
    contentHeight: 'auto',
    eventClick: renderEventDetails,
    eventDidMount: function(event) {
      $(event.el)
        .attr('data-bs-toggle', 'modal')
        .attr('data-bs-target', '#modal');
    },
    displayEventTime: false,
    eventDisplay: 'block',
    viewDidMount: function(view) {
      $('#fullcalendar .btn-primary').addClass('btn-dark').removeClass('btn-primary');
    },
    datesSet: function() {
      refreshCalendars();
    }
  });

  fullCalendar.render();
  return fullCalendar;
}

function createICalURL(id) {
  return 'https://next.{{ $.Site.Params.baseDomain }}/remote.php/dav/public-calendars/' + id + '?export';
}

function loadLocalStorage() {
  const calendarsStored = JSON.parse(localStorage.getItem('calendars') || '{}');
  $.each(calendars, function(index, calendar) {
    if (calendar.id in calendarsStored) {
      calendar.checked = calendarsStored[calendar.id];

      if (calendar.location === 'global') {
        $('#checkbox-' + calendar.id).prop('checked', calendar.checked);
      }
    }
  });
}

function refreshCalendars() {
  parseICal();

  const calendarOptions = calendars.filter(calendar => calendar.checked).map(function(calendar) {
    return {
      id: calendar.id,
      color: calendar.color,
      events: calendar.events
    };
  });
  fullCalendar.setOption('eventSources', calendarOptions);

  const calendarsEntry = Object.fromEntries(calendars.map(calendar => [ calendar.id, calendar.checked ]));
  localStorage.setItem('calendars', JSON.stringify(calendarsEntry));
}

function renderEventDetails(eventClickInfo) {
  $('#modalTitle').text(eventClickInfo.event._def.title);

  const body = $('#modalBody');
  body.empty();

  const props = eventClickInfo.event.extendedProps;
  const allDay = eventClickInfo.event.allDay;

  if ($(eventClickInfo.el).hasClass('cancelled')) {
    body.append($('<h5>', { class: 'bi bi-exclamation-triangle text-danger' } ).text(' Abgesagt!'));
  }
  if ($(eventClickInfo.el).hasClass('tentative')) {
    body.append($('<h5>', { class: 'bi bi-exclamation-triangle text-warning' } ).text(' Vorläufiger Termin!'));
  }
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

  const calendar = calendars.find(cal => cal.id == eventClickInfo.event.source.id);
  $('#modalFooter').removeClass('d-none');
  $('#modalFooterBadge').css('background-color', calendar.color);
  $('#modalFooterText').text(calendar.name);
}

function renderPins(e) {
  const pinOffset = [$('.map-pin').width() / 2, $('.map-pin').height() * 0.9];
  const offsetX = ($('#map-container').width() - $('#map').width()) / 2 - pinOffset[0];
  const offsetY = - pinOffset[1];

  const origin = [55.10, 5.55];
  const end = [45.75, 17.25];
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

    const localCalendars = calendars.filter(calendar => calendar.location === location.id);
    if (localCalendars.length > 0 && localCalendars.every(calendar => calendar.checked)) {
      el.addClass('text-success');
    } else if (localCalendars.some(calendar => calendar.checked)) {
      el.addClass('text-primary');
    } else {
      el.addClass('text-muted');
    }
  });
}

function copyICal(id, iconEl) {
  navigator.clipboard.writeText(createICalURL(id));

  const tooltip = new bootstrap.Tooltip(iconEl, { title: 'Kopiert!', trigger: 'manual', placement: 'left' });
  tooltip.show();

  iconEl.removeClass("bi-clipboard-plus").addClass("bi-clipboard-check-fill");
  setTimeout(function() {
    iconEl.removeClass("bi-clipboard-check-fill").addClass("bi-clipboard-plus");
    tooltip.hide();
  }, 3000);
}

function renderCalendarTable(thisObj) {
  bootstrap.Tooltip.getInstance(thisObj.children('span')[0]).hide();

  const location = locations.find(loc => loc['id'] === thisObj.attr('location'));
  const localCalendars = calendars.filter(calendar => calendar.location === location.id);

  $('#modalTitle').text(location.name);

  const body = $('#modalBody');
  body.empty();

  body.append($('<table>', { class: 'table align-middle text-white' }).append(
    $('<thead>').append(
      $('<tr>').append(
        $('<th>')
      ).append(
        $('<th>', { class: 'text-center' }).text('iCal-Link kopieren')
      )
    )
  ).append(
    $('<tbody>').append(
      $.map(localCalendars, calendar => $('<tr>').append(
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
          $('<button>', {
            class: 'btn btn-xs',
            role: 'button'
          }).click(function() {
            copyICal(calendar.id, $(this).children('span'));
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
  const calendar = calendars.find(calendar => calendar.id == thisObj.attr('calendar'));
  calendar.checked = thisObj.is(':checked');
  refreshCalendars();
  renderPins();
}

async function loadICal() {
  await Promise.all(calendars.map(async function(calendar) {
    const response = await fetch(createICalURL(calendar.id));
    const text = await response.text();
    calendar.ical = new ICAL.Component(ICAL.parse(text));
  }));
}

function parseICal() {
  calendars.forEach(function(calendar) {
    calendar.color = calendar.ical.getFirstPropertyValue('x-apple-calendar-color');
    calendar.name = calendar.ical.getFirstPropertyValue('x-wr-calname').replace(/ \(keycloak-.*/, '');

    $('#name-' + calendar.id).text(calendar.name);
    $('#color-' + calendar.id).attr('style', 'background-color: ' + calendar.color);

    if (!calendar.checked) {
      return;
    }

    const vevents = calendar.ical.getAllSubcomponents('vevent');
    const activeRange = fullCalendar.view.getCurrentData().dateProfile.activeRange;
    const startDate = ICAL.Time.fromJSDate(activeRange.start);
    const endDate = ICAL.Time.fromJSDate(activeRange.end);

    const events = vevents.map(function (vevent) {
      const event = new ICAL.Event(vevent);

      if (event.isRecurring()) {
        const expand = event.iterator(event.startDate);
        var next;
        var eventsExpanded = [];

        while ((next = expand.next()) && next.compare(endDate) < 0) {
          if (next.compare(startDate) < 0) {
            continue;
          }
          const occurrence = event.getOccurrenceDetails(next);

          classNames = [];
          const status = occurrence.item.component.getFirstPropertyValue('status');
          if (status === 'TENTATIVE') {
            classNames.push('tentative');
          } else if (status === 'CANCELLED') {
            classNames.push('cancelled');
          }

          eventsExpanded.push({
            id: occurrence.item.uid + '-' + occurrence.recurrenceId.toString().substring(0, 10),
            title: occurrence.item.summary,
            start: occurrence.startDate.toJSDate(),
            end: occurrence.endDate.toJSDate(),
            description: occurrence.item.description,
            classNames: classNames
          });
        }

        return eventsExpanded;

      } else if (!event.isRecurrenceException() && event.startDate.compare(startDate) > 0 && event.startDate.compare(endDate) < 0) {
        classNames = [];
        const status = event.component.getFirstPropertyValue('status');
        if (status === 'TENTATIVE') {
          classNames.push('tentative');
        } else if (status === 'CANCELLED') {
          classNames.push('cancelled');
        }

        return {
          id: event.uid,
          title: event.summary,
          start: event.startDate.toJSDate(),
          end: event.endDate.toJSDate(),
          description: event.description,
          classNames: classNames
        }
      } else {
        return [];
      }
    });

    calendar.events = events.flat();
  });
}

var initialized = false;

document.addEventListener('DOMContentLoaded', async function() {
  if (initialized) {
    return
  }

  initialized = true;

  loadLocalStorage();
  await loadICal();
  fullCalendar = createCalendar();
  $('.calendar-fluff').removeClass('d-none');
  $('#calendar-spinner').addClass('d-none');
  renderPins();

  $('[data-bs-target="#accordion-calendar"]').click(function(e) {
    fullCalendar.render();
    renderPins();
  });

  $('#calendars-dropdown').click(function(e) {
    e.stopPropagation();
  });

  $('#modal').click(function(e) {
    e.stopPropagation();
  });

  $('[data-bs-target="#accordion-calendar"]').click(function(e) {
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

window.addEventListener('resize', function(event) {
  renderPins();
});

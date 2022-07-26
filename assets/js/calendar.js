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
  parseICalRange(calendars);

  if (!fullCalendar.dirty) {
    return;
  }

  const calendarOptions = calendars.filter(calendar => calendar.checked).map(function(calendar) {
    return {
      id: calendar.id,
      color: calendar.color,
      events: calendar.events
    };
  });
  fullCalendar.setOption('eventSources', calendarOptions);
  fullCalendar.dirty = false;
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

  if (props.location !== null) {
    body.append($('<h6>').text("Ort:"));
    body.append($('<p>').text(props.location)).linkify({ target: '_blank' });
  }
  if (props.description !== null) {
    body.append($('<h6>').text("Beschreibung:"));
    body.append($('<p>').text(props.description)).linkify({ target: '_blank' });
  }

  const calendar = calendars.find(cal => cal.id == eventClickInfo.event.source.id);
  $('#modalFooter').removeClass('d-none');
  $('#modalFooterBadge').css('background-color', calendar.color);
  $('#modalFooterText').text(calendar.name);
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

function renderCalendarTable() {
  parseICalMeta();
  $('#regional-row').nextAll().remove();

  $(locations).filter(location => location.id != 'global').each(function () {
    const localCalendars = calendars.filter(calendar => calendar.location === this.id);

    $('#calendar-table').children('tbody').append(
      $('<tr>').append(
        $('<td>', { colspan: 2, class: 'border-top' }).text(this.name)
      )
    ).append(
      $.map(localCalendars, calendar => $('<tr>').append(
        $('<td>', { class: 'text-start' }).append(
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
          }).click(function() { copyICal(calendar.id, $(this).children('span')); }).append(
            $('<span>', { class: 'bi bi-clipboard-plus text-white' })
          )
        )
      ))
    );
  });
}

function toggleCalendar(thisObj) {
  const calendar = calendars.find(calendar => calendar.id == thisObj.attr('calendar'));
  calendar.checked = thisObj.is(':checked');

  if (calendar.checked) {
    parseICalRange([calendar]);
    fullCalendar.addEventSource({
      id: calendar.id,
      color: calendar.color,
      events: calendar.events
    });
  } else {
    fullCalendar.getEventSourceById(calendar.id).remove();
  }

  const calendarsEntry = Object.fromEntries(calendars.map(calendar => [ calendar.id, calendar.checked ]));
  localStorage.setItem('calendars', JSON.stringify(calendarsEntry));
}

async function loadICal() {
  await Promise.all(calendars.map(async function(calendar) {
    const response = await fetch(createICalURL(calendar.id));
    const text = await response.text();
    calendar.ical = new ICAL.Component(ICAL.parse(text));
  }));
}

function parseICalMeta() {
  calendars.forEach(function(calendar) {
    calendar.color = calendar.ical.getFirstPropertyValue('x-apple-calendar-color');
    calendar.name = calendar.ical.getFirstPropertyValue('x-wr-calname').replace(/ \(keycloak-.*/, '');

    $('#name-' + calendar.id).text(calendar.name);
    $('#color-' + calendar.id).attr('style', 'background-color: ' + calendar.color);
  });
}

function parseICalRange(newCalendars) {
  newCalendars.forEach(function(calendar) {
    if (!calendar.checked) {
      return;
    }

    const activeRange = fullCalendar.view.getCurrentData().dateProfile.activeRange;
    var startDate = ICAL.Time.fromJSDate(activeRange.start);
    var endDate = ICAL.Time.fromJSDate(activeRange.end);

    if (calendar.loadedStart && calendar.loadedEnd && startDate.compare(calendar.loadedStart) > 0 && endDate.compare(calendar.loadedEnd) < 0) {
      return;
    }
    fullCalendar.dirty = true;
    startDate.addDuration(new ICAL.Duration({ weeks: -25 }));
    endDate.addDuration(new ICAL.Duration({ weeks: 25 }));

    const vevents = calendar.ical.getAllSubcomponents('vevent');

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
            classNames: classNames,
            location: occurrence.item.location
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
          classNames: classNames,
          location: event.location
        }
      } else {
        return [];
      }
    });

    calendar.events = events.flat();
    calendar.loadedStart = startDate;
    calendar.loadedEnd = endDate;
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
  renderCalendarTable();

  fullCalendar = createCalendar();
  $('.calendar-fluff').removeClass('d-none');
  $('#calendar-spinner').addClass('d-none');

  $('[data-bs-target="#accordion-calendar"]').click(function(e) {
    fullCalendar.render();
  });

  $('#calendars-dropdown').click(function(e) {
    e.stopPropagation();
  });

  $('#modal').click(function(e) {
    e.stopPropagation();
  });

  $('[data-bs-target="#accordion-calendar"]').click(function(e) {
  });

  $('.copy-ical').click(function() {
    const thisObj = $(this);
    copyICal(thisObj.attr('calendar'), thisObj.children('span'));
  });
});

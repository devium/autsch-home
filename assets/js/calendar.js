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
    eventClick: eventClickInfo => renderEventDetails(eventClickInfo.event),
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

function createEventParam(event) {
  // Occurrence date is part of the event's unique identifier. Prefer that to the actual date. Should be the same in most cases.
  var date = event.id.substring(37);
  if (!date) {
    date = event.start.toISOString().substring(0, 10);
  }
  return 'event=' + date + '-' + event.id.substring(0, 4) + '-' + event.source.id;
}

function createEventURL(event) {
  return location.origin + '/' + '?' + createEventParam(event) + location.hash;
}

function renderEventDetails(event) {
  window.history.replaceState({}, '', createEventURL(event));

  $('#modalTitle').text(event._def.title);

  $('#modalShare').unbind('click').click(function() {
    copyEventURL(event, $(this));
  });

  const body = $('#modalBody');
  body.empty();

  if (event.extendedProps.status === 'CANCELLED') {
    body.append($('<h5>', { class: 'bi bi-exclamation-triangle text-danger' } ).text(' Abgesagt!'));
  }
  if (event.extendedProps.status === 'TENTATIVE') {
    body.append($('<h5>', { class: 'bi bi-exclamation-triangle text-warning' } ).text(' Vorläufiger Termin!'));
  }
  if (event.start !== null) {
    body.append($('<h6>').text("Beginn:"));
    const weekday = event.start.toLocaleString([], { weekday: 'short' });
    const options = event.allDay ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' }
    const date = event.start.toLocaleString([], options);
    body.append($('<p>').text(weekday + ', ' + date));
  }
  if (event.end !== null) {
    body.append($('<h6>').text("Ende:"));
    const weekday = event.end.toLocaleString([], { weekday: 'short' });
    const options = event.allDay ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' }
    const date = event.end.toLocaleString([], options);
    body.append($('<p>').text(weekday + ', ' + date));
  }

  if (event.extendedProps.location !== null) {
    body.append($('<h6>').text("Ort:"));
    body.append($('<p>').text(event.extendedProps.location)).linkify({ target: '_blank' });
  }
  if (event.extendedProps.description !== null) {
    body.append($('<h6>').text("Beschreibung:"));
    body.append($('<p>').text(event.extendedProps.description)).linkify({ target: '_blank' });
  }

  const calendar = calendars.find(cal => cal.id == event.source.id);
  $('#modalFooterBadge').css('background-color', calendar.color);
  $('#modalFooterText').text(calendar.name);
}

function copyEventURL(event, iconEl) {
  navigator.clipboard.writeText(createEventURL(event));

  const tooltip = new bootstrap.Tooltip(iconEl, { title: 'Link kopiert!', trigger: 'manual', placement: 'left' });
  tooltip.show();

  setTimeout(function() {
    tooltip.hide();
  }, 3000);
}

function copyICal(id, iconEl) {
  const selectedCalendar = calendars.find(calendar => calendar.id == id);
  navigator.clipboard.writeText(selectedCalendar.url);

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
            class: 'badge calendar-badge mx-1',
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
    const response = await fetch(calendar.url);
    const text = await response.text();
    calendar.ical = new ICAL.Component(ICAL.parse(text));
  }));
}

function parseICalMeta() {
  calendars.forEach(function(calendar) {
    calendar.color = calendar.ical.getFirstPropertyValue('x-apple-calendar-color');
    calendar.name = calendar.ical.getFirstPropertyValue('x-wr-calname').replace(/ \([0-9a-fA-F-]{36}\)/, '');

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
            location: occurrence.item.location,
            status: status
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
          location: event.location,
          status: status
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

function findEvent(calendarId, eventId, date) {
  for (const calendar of calendars) {
    if (calendar.id.startsWith(calendarId)) {
      if (!calendar.checked) {
        $('#checkbox-' + calendar.id).click();
      }
      for (const event of calendar.events) {
        if (event.id.startsWith(eventId)) {
          if (event.id.length === 36 || event.id.endsWith(date)) {
            return fullCalendar.getEventById(event.id);
          }
        }
      }
    }
  }

  return null;
}

function showURLEvent() {
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has('event')) {
    return;
  }

  const eventParam = urlParams.get('event');
  const date = eventParam.substring(0, 10);
  const eventId = eventParam.substring(11, 15);
  const calendarId = eventParam.substring(16);

  fullCalendar.gotoDate(new Date(date));
  const event = findEvent(calendarId, eventId, date);

  if (event) {
    renderEventDetails(event);
    $('#modal').modal('show');
  }
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

  $('#modal').on('hide.bs.modal', function(e) {
    window.history.replaceState({}, '', location.origin + '/' + location.hash);
  });

  showURLEvent();
});

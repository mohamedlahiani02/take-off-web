/**
 * Club-time helpers for the admin console.
 *
 * Every date, hour, window and calendar position is computed in the club's own
 * timezone, never the browser's. The console used getHours() and toISOString()
 * directly, so a booking at 2026-09-25T06:00:00Z landed on the 07:00 row for
 * staff in Tunis and on a non-existent 08:00 row for staff in Paris — where it
 * simply vanished from the calendar. Same database row, different screens.
 *
 * Mirrors lib/club-time.ts on the member side so both consoles agree.
 */
(function () {
  'use strict';

  var CLUB_TZ = 'Africa/Tunis';

  /** Wall-clock parts of an instant, as seen at the club. */
  function partsOf(instant) {
    var f = new Intl.DateTimeFormat('en-GB', {
      timeZone: CLUB_TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    var out = {};
    f.formatToParts(instant).forEach(function (p) {
      if (p.type !== 'literal') out[p.type] = p.value;
    });
    // Intl renders midnight as "24" in some engines; normalise it.
    if (out.hour === '24') out.hour = '00';
    return out;
  }

  /** Offset of the club from UTC, in minutes, at a given instant. */
  function offsetMinutes(instant) {
    var p = partsOf(instant);
    var asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    // Seconds are irrelevant to the offset and are dropped on both sides.
    return (asUtc - Math.floor(instant.getTime() / 60000) * 60000) / 60000;
  }

  /** 'YYYY-MM-DD' of the club day an instant falls on. */
  function dayKey(iso) {
    var p = partsOf(new Date(iso));
    return p.year + '-' + p.month + '-' + p.day;
  }

  /** 'HH:MM' club wall-clock time of an instant. */
  function timeKey(iso) {
    var p = partsOf(new Date(iso));
    return p.hour + ':' + p.minute;
  }

  /**
   * The UTC instant of a club wall-clock moment.
   *
   * Resolved in two passes: guess with the offset at the naive instant, then
   * re-check with the offset actually in force at the result, so a moment near
   * a transition lands on the right side of it.
   */
  function instantOf(dateStr, timeStr) {
    var parts = String(dateStr).split('-');
    var hm = String(timeStr || '00:00').split(':');
    var naive = Date.UTC(+parts[0], +parts[1] - 1, +parts[2], +hm[0], +hm[1]);
    var guess = new Date(naive - offsetMinutes(new Date(naive)) * 60000);
    return new Date(naive - offsetMinutes(guess) * 60000);
  }

  /** Today's club day. */
  function todayKey() {
    return dayKey(new Date().toISOString());
  }

  /** A club day shifted by whole days, rolling over months and years. */
  function shiftDay(dateStr, delta) {
    var parts = String(dateStr).split('-');
    var moved = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2] + delta, 12));
    return dayKey(moved.toISOString());
  }

  /** Day of week (0=Sunday) of a club day. */
  function dowOf(dateStr) {
    var parts = String(dateStr).split('-');
    return new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2], 12)).getUTCDay();
  }

  /** Monday of the club week containing the given day. */
  function weekStart(dateStr) {
    var dow = dowOf(dateStr);
    return shiftDay(dateStr, dow === 0 ? -6 : 1 - dow);
  }

  /** [from, to) covering one whole club day, as ISO instants. */
  function dayWindow(dateStr) {
    return {
      from: instantOf(dateStr, '00:00').toISOString(),
      to: instantOf(shiftDay(dateStr, 1), '00:00').toISOString(),
    };
  }

  /** [from, to) covering a whole club week from `startDate`. */
  function weekWindow(startDate) {
    return {
      from: instantOf(startDate, '00:00').toISOString(),
      // Exclusive bound at the start of the eighth day, so the seventh is whole.
      to: instantOf(shiftDay(startDate, 7), '00:00').toISOString(),
      startDate: startDate,
    };
  }

  /** Human label for a club day, e.g. "Fri 25 Sep". */
  function dayLabel(dateStr) {
    var parts = String(dateStr).split('-');
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short',
    }).format(new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2], 12)));
  }

  window.ClubTime = {
    TZ: CLUB_TZ,
    dayKey: dayKey,
    timeKey: timeKey,
    instantOf: instantOf,
    todayKey: todayKey,
    shiftDay: shiftDay,
    dowOf: dowOf,
    weekStart: weekStart,
    dayWindow: dayWindow,
    weekWindow: weekWindow,
    dayLabel: dayLabel,
  };
})();

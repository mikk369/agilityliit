"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/LanguageContext";
import "./calendar.css";

interface CalendarEvent {
  id: number;
  clubName: string;
  start: string;
  end: string;
  referee: string[];
  competitionClasses: string;
  competitionType: string;
  description: string;
  location: string;
  regStatus: string | null;
  status: string;
}

const MONTHS_ET = [
  "Jaanuar", "Veebruar", "Märts", "Aprill",
  "Mai", "Juuni", "Juuli", "August",
  "September", "Oktoober", "November", "Detsember",
];

const MONTHS_EN = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

export default function CalendarPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [modalMonth, setModalMonth] = useState<number | null>(null);
  const [modalYear, setModalYear] = useState(currentYear);
  const [openMonthIndex, setOpenMonthIndex] = useState<number | null>(new Date().getMonth());
  const [showRegClosedError, setShowRegClosedError] = useState(false);

  const months = locale === "et" ? MONTHS_ET : MONTHS_EN;

  useEffect(() => {
    async function fetchBookings() {
      try {
        const res = await fetch("/api/bookings/calendar");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const mapped: CalendarEvent[] = data.map(
          (b: {
            id: number;
            clubName: string;
            startDate: string;
            endDate: string;
            referee: string[] | string;
            competitionClasses: string | null;
            competitionType: string;
            info: string | null;
            location: string;
            regStatus: string | null;
            status: string;
          }) => ({
            id: b.id,
            clubName: b.clubName,
            start: b.startDate,
            end: b.endDate,
            referee: Array.isArray(b.referee) ? b.referee : b.referee ? [b.referee] : [],
            competitionClasses: b.competitionClasses || "",
            competitionType: b.competitionType,
            description: b.info || "",
            location: b.location,
            regStatus: b.regStatus,
            status: b.status,
          })
        );
        setEvents(mapped);
      } catch {
        setError(t.loadFailed);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, [t.loadFailed]);

  const filterEventsForDay = useCallback(
    (evts: CalendarEvent[], year: number, monthIndex: number, day: number | null) => {
      if (!day) return [];
      const currentDate = new Date(year, monthIndex, day);
      currentDate.setHours(0, 0, 0, 0);

      return evts.filter((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        eventStart.setHours(0, 0, 0, 0);
        eventEnd.setHours(23, 59, 59, 999);
        return currentDate >= eventStart && currentDate <= eventEnd;
      });
    },
    []
  );

  const getDayBoxClass = (day: number | null, dayEvents: CalendarEvent[]) => {
    if (!day) return "inactive";
    if (dayEvents.some((e) => e.status === "CLUBEVENT")) return "clubevent";
    if (dayEvents.some((e) => e.status === "BOOKED")) return "booked";
    if (dayEvents.some((e) => e.status === "PENDING")) return "pending";
    return "";
  };

  const renderDots = (dayEvents: CalendarEvent[]) => {
    const hasClubEvent = dayEvents.some((e) => e.status === "CLUBEVENT");
    const hasPending = dayEvents.some((e) => e.status === "PENDING");
    const hasBooked = dayEvents.some((e) => e.status === "BOOKED");
    const hasBookedCount = dayEvents.filter((e) => e.status === "BOOKED").length;

    return (
      <div className="dot-container">
        {hasBookedCount > 1 && <div className="booked-dot"></div>}
        {hasPending && (hasBooked || hasClubEvent) && <div className="pending-dot"></div>}
        {hasClubEvent && hasBooked && <div className="booked-dot"></div>}
      </div>
    );
  };

  const generateMonthGrid = (month: number, year: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startDay = new Date(year, month, 1).getDay();
    startDay = startDay === 0 ? 7 : startDay;

    const daysArray: (number | null)[] = [];
    for (let i = 1; i < startDay; i++) daysArray.push(null);
    for (let i = 1; i <= daysInMonth; i++) daysArray.push(i);
    while (daysArray.length < 42) daysArray.push(null);
    return daysArray;
  };

  const changeYear = (increment: number) => {
    setSelectedYear((prev) => {
      const newYear = prev + increment;
      return newYear < currentYear ? prev : newYear;
    });
  };

  const handleMonthClick = (i: number) => {
    setOpenMonthIndex(openMonthIndex === i ? null : i);
  };

  const openModal = (monthIndex: number) => {
    setModalMonth(monthIndex);
    setModalYear(selectedYear);
  };

  const closeModal = () => {
    setModalMonth(null);
    setShowRegClosedError(false);
  };

  const changeModalMonth = (increment: number) => {
    if (modalMonth === null) return;
    let newMonth = modalMonth + increment;
    let newYear = modalYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newYear < currentYear) return;
    setModalMonth(newMonth);
    setModalYear(newYear);
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.regStatus === "reg_closed") {
      setShowRegClosedError(true);
      setTimeout(() => setShowRegClosedError(false), 3000);
    } else {
      router.push(`/competitor/register/${event.id}`);
    }
  };

  // Get events for the modal month
  const getMonthEvents = (year: number, month: number) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
      return eventStart <= monthEnd && eventEnd >= monthStart;
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="cal-loading">{t.loading}</div>
      </div>
    );
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <div id="agility-calendar-wrapper">
      {/* Year Navigation */}
      <div className="year-selector">
        <button onClick={() => changeYear(-1)} disabled={selectedYear === currentYear}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="year-title">{selectedYear}</span>
        <button onClick={() => changeYear(1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="calendar-container">
        {months.map((month, index) => (
          <div key={index} className={`month-box ${openMonthIndex === index ? "open" : ""}`}>
            <h3 className="month-title" onClick={() => handleMonthClick(index)}>
              {month} {selectedYear}
              <span className="down-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </h3>
            <div className="month-grid" onClick={() => openModal(index)}>
              <span className="day-header">E</span>
              <span className="day-header">T</span>
              <span className="day-header">K</span>
              <span className="day-header">N</span>
              <span className="day-header">R</span>
              <span className="day-header">L</span>
              <span className="day-header">P</span>

              {generateMonthGrid(index, selectedYear).map((day, i) => {
                const dayEvents = filterEventsForDay(events, selectedYear, index, day);
                return (
                  <div key={i} className={`day-box ${getDayBoxClass(day, dayEvents)}`}>
                    {day || ""}
                    {renderDots(dayEvents)}
                    {dayEvents.length > 0 && (
                      <div className="event-tooltip">
                        {dayEvents.map((event, ei) => (
                          <div key={ei} className={`event-tooltip-info ${event.status.toLowerCase()}`}>
                            <strong>{event.clubName}</strong>
                            <small>{event.location}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal - plain React, no FullCalendar */}
      {modalMonth !== null && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {showRegClosedError && (
              <div className="error-wrapper">
                <p className="error-container error-text competition-closed">
                  {t.regClosedText}
                </p>
              </div>
            )}
            <div className="modal-detail-container">
              {/* Modal header with month navigation */}
              <div className="modal-detail-header">
                <button className="modal-nav-button" onClick={() => changeModalMonth(-1)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <h2 className="modal-month-title">{months[modalMonth]} {modalYear}</h2>
                <button className="modal-nav-button" onClick={() => changeModalMonth(1)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                <button className="modal-close-button" onClick={closeModal}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Month grid inside modal */}
              <div className="modal-month-grid">
                <span className="day-header">E</span>
                <span className="day-header">T</span>
                <span className="day-header">K</span>
                <span className="day-header">N</span>
                <span className="day-header">R</span>
                <span className="day-header">L</span>
                <span className="day-header">P</span>

                {generateMonthGrid(modalMonth, modalYear).map((day, i) => {
                  const dayEvents = filterEventsForDay(events, modalYear, modalMonth, day);
                  return (
                    <div key={i} className={`modal-day-box ${getDayBoxClass(day, dayEvents)}`}>
                      <span className="modal-day-number">{day || ""}</span>
                      {dayEvents.map((event, ei) => (
                        <div
                          key={ei}
                          className={`modal-event ${event.status.toLowerCase()}`}
                          onClick={() => handleEventClick(event)}
                        >
                          <strong>{event.clubName}</strong>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Event list for this month */}
              <div className="modal-events-list">
                <h3>{locale === "et" ? "Võistlused" : "Competitions"}</h3>
                {getMonthEvents(modalYear, modalMonth).length === 0 ? (
                  <p className="no-events">{locale === "et" ? "Selles kuus võistlusi pole" : "No competitions this month"}</p>
                ) : (
                  getMonthEvents(modalYear, modalMonth).map((event) => (
                    <div
                      key={event.id}
                      className={`modal-event-card ${event.status.toLowerCase()}`}
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="modal-event-card-header">
                        <strong>{event.clubName}</strong>
                        <span className={`modal-event-status ${event.status.toLowerCase()}`}>
                          {event.status}
                        </span>
                      </div>
                      <p>
                        {new Date(event.start).toLocaleDateString(locale === "et" ? "et-EE" : "en-GB")}
                        {event.start !== event.end && ` – ${new Date(event.end).toLocaleDateString(locale === "et" ? "et-EE" : "en-GB")}`}
                      </p>
                      {event.referee.length > 0 && (
                        <p>{locale === "et" ? "Kohtunik" : "Judge"}: {event.referee.join(", ")}</p>
                      )}
                      {event.competitionType && (
                        <p>{locale === "et" ? "Tüüp" : "Type"}: {event.competitionType}</p>
                      )}
                      <p>{locale === "et" ? "Asukoht" : "Location"}: {event.location}</p>
                      {event.description && <p>{event.description}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

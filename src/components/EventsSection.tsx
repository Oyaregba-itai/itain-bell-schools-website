import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, MapPin } from "lucide-react";

const TYPE_BG: Record<string, string> = {
  holiday:        "bg-red-50 border-red-200",
  school_event:   "bg-blue-50 border-blue-200",
  sports_day:     "bg-green-50 border-green-200",
  exam:           "bg-amber-50 border-amber-200",
  parent_meeting: "bg-purple-50 border-purple-200",
  other:          "bg-gray-50 border-gray-200",
};

const TYPE_BADGE: Record<string, string> = {
  holiday:        "bg-red-100 text-red-700",
  school_event:   "bg-blue-100 text-blue-700",
  sports_day:     "bg-green-100 text-green-700",
  exam:           "bg-amber-100 text-amber-700",
  parent_meeting: "bg-purple-100 text-purple-700",
  other:          "bg-gray-100 text-gray-600",
};

const TYPE_LABELS: Record<string, string> = {
  holiday:        "Holiday",
  school_event:   "School Event",
  sports_day:     "Sports Day",
  exam:           "Exam",
  parent_meeting: "Parent Meeting",
  other:          "Other",
};

const EventsSection = () => {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("events")
      .select("*")
      .eq("is_public", true)
      .gte("start_date", today)
      .order("start_date", { ascending: true })
      .limit(6)
      .then(({ data }) => { if (data?.length) setEvents(data); });
  }, []);

  if (!events.length) return null;

  return (
    <section id="events" className="py-20 md:py-28 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-3">
            School Calendar
          </span>
          <h2 className="text-3xl md:text-4xl font-heading text-foreground">Upcoming Events</h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Stay up to date with what&apos;s happening at Itain&#8209;Bell Schools.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const bg    = TYPE_BG[event.event_type]    || TYPE_BG.other;
            const badge = TYPE_BADGE[event.event_type] || TYPE_BADGE.other;
            const label = TYPE_LABELS[event.event_type] || "Event";
            return (
              <div key={event.id} className={`rounded-2xl p-6 border ${bg}`}>
                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full mb-3 ${badge}`}>
                  {label}
                </span>
                <h3 className="font-heading text-lg text-foreground mb-2 leading-snug">
                  {event.title}
                </h3>
                {event.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {event.description}
                  </p>
                )}
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    {new Date(event.start_date + "T00:00:00").toLocaleDateString("en-GB", {
                      weekday: "short", day: "numeric", month: "long",
                    })}
                    {event.end_date && event.end_date !== event.start_date &&
                      ` – ${new Date(event.end_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                  </div>
                  {event.start_time && (
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      {event.start_time}
                      {event.end_time ? ` – ${event.end_time}` : ""}
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      {event.location}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EventsSection;

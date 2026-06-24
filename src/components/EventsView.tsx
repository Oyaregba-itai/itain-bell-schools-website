import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Clock, Megaphone } from "lucide-react";
import { format } from "date-fns";

const TYPE_STYLES: Record<string, string> = {
  holiday:        "bg-red-100 text-red-700 border-red-200",
  school_event:   "bg-blue-100 text-blue-700 border-blue-200",
  sports_day:     "bg-green-100 text-green-700 border-green-200",
  exam:           "bg-amber-100 text-amber-700 border-amber-200",
  parent_meeting: "bg-purple-100 text-purple-700 border-purple-200",
  other:          "bg-gray-100 text-gray-700 border-gray-200",
};

const TYPE_LABELS: Record<string, string> = {
  holiday:        "Holiday",
  school_event:   "School Event",
  sports_day:     "Sports Day",
  exam:           "Exam",
  parent_meeting: "Parent Meeting",
  other:          "Other",
};

const EventsView = () => {
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["events-view"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("start_date", today)
        .order("start_date", { ascending: true })
        .limit(24);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ["announcements-events-view"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  if (eventsLoading || announcementsLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const hasEvents = events && events.length > 0;
  const hasAnnouncements = announcements && announcements.length > 0;

  if (!hasEvents && !hasAnnouncements) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Calendar size={44} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium">Nothing to show yet</p>
        <p className="text-sm mt-1">Check back later for school events and announcements.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Upcoming Events */}
      {hasEvents && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            <h3 className="text-lg font-heading text-foreground">Upcoming Events</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events!.map((event: any) => {
              const style = TYPE_STYLES[event.event_type] || TYPE_STYLES.other;
              const label = TYPE_LABELS[event.event_type] || "Event";
              return (
                <div key={event.id} className="bg-card rounded-xl shadow-card border border-border overflow-hidden flex flex-col">
                  {event.flyer_url && (
                    <img src={event.flyer_url} alt={event.title} className="w-full h-52 object-cover" />
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-foreground leading-snug">{event.title}</h4>
                      <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full border ${style}`}>
                        {label}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                    )}
                    <div className="space-y-1.5 text-xs text-muted-foreground mt-auto">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} />
                        <span>
                          {new Date(event.start_date + "T00:00:00").toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                          {event.end_date && event.end_date !== event.start_date &&
                            ` – ${new Date(event.end_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                        </span>
                      </div>
                      {event.start_time && (
                        <div className="flex items-center gap-2">
                          <Clock size={13} />
                          <span>{event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}</span>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={13} />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Announcements */}
      {hasAnnouncements && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-primary" />
            <h3 className="text-lg font-heading text-foreground">Announcements</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {announcements!.map((a: any) => (
              <div key={a.id} className="bg-card rounded-xl shadow-card border border-border overflow-hidden flex flex-col">
                {a.image_url && (
                  <img src={a.image_url} alt={a.title} className="w-full h-48 object-cover" />
                )}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-foreground leading-snug">{a.title}</h4>
                    <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-full border bg-orange-100 text-orange-700 border-orange-200">
                      Announcement
                    </span>
                  </div>
                  {a.content && (
                    <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap line-clamp-3">{a.content}</p>
                  )}
                  <div className="mt-auto text-xs text-muted-foreground flex items-center gap-2">
                    <Calendar size={13} />
                    <span>{format(new Date(a.created_at), "d MMM yyyy")}</span>
                    {a.target_role !== "all" && (
                      <span className="ml-auto px-2 py-0.5 rounded-md bg-accent/20 text-accent-foreground capitalize">{a.target_role}s only</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsView;

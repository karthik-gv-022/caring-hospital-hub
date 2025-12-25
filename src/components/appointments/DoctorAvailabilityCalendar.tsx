import { useState, useEffect } from "react";
import { format, addDays, startOfWeek, isSameDay, isToday, isPast } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Clock, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DoctorAvailabilityCalendarProps {
  doctorId: string;
  doctorName?: string;
  onSlotSelect?: (date: string, time: string) => void;
  selectedDate?: string;
  selectedTime?: string;
}

const timeSlots = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
];

interface BookedSlot {
  scheduled_date: string;
  scheduled_time: string;
}

export function DoctorAvailabilityCalendar({
  doctorId,
  doctorName,
  onSlotSelect,
  selectedDate,
  selectedTime,
}: DoctorAvailabilityCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 }); // Monday
  });
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (doctorId) {
      fetchBookedSlots();
    }
  }, [doctorId, currentWeekStart]);

  const fetchBookedSlots = async () => {
    setLoading(true);
    const startDate = format(currentWeekStart, "yyyy-MM-dd");
    const endDate = format(addDays(currentWeekStart, 13), "yyyy-MM-dd");

    const { data } = await supabase
      .from("appointments")
      .select("scheduled_date, scheduled_time")
      .eq("doctor_id", doctorId)
      .gte("scheduled_date", startDate)
      .lte("scheduled_date", endDate)
      .in("status", ["pending", "confirmed"]);

    if (data) {
      setBookedSlots(data);
    }
    setLoading(false);
  };

  const isSlotBooked = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookedSlots.some(
      (slot) => slot.scheduled_date === dateStr && slot.scheduled_time === time
    );
  };

  const getAvailableSlotsCount = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const bookedCount = bookedSlots.filter(
      (slot) => slot.scheduled_date === dateStr
    ).length;
    return timeSlots.length - bookedCount;
  };

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(currentWeekStart, i)
  );

  const handlePrevWeek = () => {
    setCurrentWeekStart((prev) => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => addDays(prev, 7));
  };

  const handleDaySelect = (day: Date) => {
    if (isPast(day) && !isToday(day)) return;
    setSelectedDay(day);
  };

  const handleSlotSelect = (time: string) => {
    if (!selectedDay) return;
    const dateStr = format(selectedDay, "yyyy-MM-dd");
    onSlotSelect?.(dateStr, time);
  };

  const canGoPrev = !isPast(currentWeekStart);

  return (
    <Card className="p-4 bg-gradient-card border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">
            {doctorName ? `${doctorName}'s Availability` : "Doctor Availability"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevWeek}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {format(currentWeekStart, "MMM d")} -{" "}
            {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Week View */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map((day) => {
          const availableSlots = getAvailableSlotsCount(day);
          const isPastDay = isPast(day) && !isToday(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const isSelectedDate = selectedDate === format(day, "yyyy-MM-dd");

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDaySelect(day)}
              disabled={isPastDay}
              className={cn(
                "flex flex-col items-center p-2 rounded-lg border transition-all",
                isPastDay && "opacity-40 cursor-not-allowed",
                !isPastDay && "hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
                (isSelected || isSelectedDate) && "border-primary bg-primary/10",
                isToday(day) && "ring-2 ring-primary/30"
              )}
            >
              <span className="text-xs text-muted-foreground">
                {format(day, "EEE")}
              </span>
              <span className={cn(
                "text-lg font-semibold",
                isToday(day) && "text-primary"
              )}>
                {format(day, "d")}
              </span>
              <Badge
                variant={availableSlots > 5 ? "default" : availableSlots > 0 ? "secondary" : "outline"}
                className={cn(
                  "text-xs mt-1",
                  availableSlots === 0 && "bg-destructive/10 text-destructive"
                )}
              >
                {availableSlots} slots
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Time Slots */}
      {selectedDay && (
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Available slots for {format(selectedDay, "EEEE, MMMM d")}
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {timeSlots.map((time) => {
              const isBooked = isSlotBooked(selectedDay, time);
              const isSelectedSlot =
                selectedDate === format(selectedDay, "yyyy-MM-dd") &&
                selectedTime === time;

              return (
                <Button
                  key={time}
                  variant={isSelectedSlot ? "default" : "outline"}
                  size="sm"
                  disabled={isBooked}
                  onClick={() => handleSlotSelect(time)}
                  className={cn(
                    "text-xs",
                    isBooked && "opacity-40 line-through",
                    isSelectedSlot && "bg-primary text-primary-foreground"
                  )}
                >
                  {time}
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border bg-background" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-primary" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border bg-muted opacity-40" />
              <span>Booked</span>
            </div>
          </div>
        </div>
      )}

      {!selectedDay && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Select a day to view available time slots
        </p>
      )}
    </Card>
  );
}

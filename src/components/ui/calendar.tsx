import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/common/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all duration-200",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-10 font-medium text-[0.75rem] uppercase tracking-wider",
        row: "flex w-full mt-2",
        cell: cn(
          "relative h-10 w-10 text-center text-sm p-0 focus-within:relative focus-within:z-20",
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-normal rounded-md transition-all duration-200",
          "hover:bg-primary/10 hover:text-primary hover:scale-105",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-gradient-to-br from-primary to-wellness text-primary-foreground font-semibold",
          "hover:from-primary/90 hover:to-wellness/90 hover:text-primary-foreground",
          "focus:from-primary focus:to-wellness focus:text-primary-foreground",
          "shadow-md hover:shadow-lg transition-all duration-200",
        ),
        day_today: cn(
          "bg-accent/10 text-accent font-semibold border-2 border-accent/30",
          "hover:bg-accent/20 transition-all duration-200",
        ),
        day_outside: cn(
          "text-muted-foreground/40 opacity-50",
          "hover:bg-muted/30 hover:text-muted-foreground/60",
        ),
        day_disabled: "text-muted-foreground/30 opacity-40 hover:bg-transparent cursor-not-allowed",
        day_range_middle: "aria-selected:bg-accent/50 aria-selected:text-accent-foreground rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

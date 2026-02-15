import { useState } from "react";
import { cn } from "@/lib/utils";

interface BodyRegion {
    id: string;
    label: string;
    path: string;
}

const REGIONS: BodyRegion[] = [
    { id: "head", label: "Head", path: "M50,10 A10,10 0 1,1 50,30 A10,10 0 1,1 50,10" },
    { id: "neck", label: "Neck", path: "M45,30 L55,30 L55,35 L45,35 Z" },
    { id: "shoulders", label: "Shoulders", path: "M30,35 L70,35 L75,45 L25,45 Z" },
    { id: "chest", label: "Chest", path: "M35,45 L65,45 L65,65 L35,65 Z" },
    { id: "abdomen", label: "Abdomen", path: "M35,65 L65,65 L65,85 L35,85 Z" },
    { id: "upper-arm-l", label: "Upper Arm (L)", path: "M25,45 L30,45 L30,65 L20,65 Z" },
    { id: "upper-arm-r", label: "Upper Arm (R)", path: "M70,45 L75,45 L80,65 L70,65 Z" },
    { id: "lower-arm-l", label: "Lower Arm (L)", path: "M20,65 L30,65 L30,85 L20,85 Z" },
    { id: "lower-arm-r", label: "Lower Arm (R)", path: "M70,65 L80,65 L80,85 L70,85 Z" },
    { id: "hands-l", label: "Hand (L)", path: "M20,85 L30,85 L28,95 L22,95 Z" },
    { id: "hands-r", label: "Hand (R)", path: "M70,85 L80,85 L78,95 L72,95 Z" },
    { id: "upper-leg-l", label: "Upper Leg (L)", path: "M35,85 L50,85 L50,115 L35,115 Z" },
    { id: "upper-leg-r", label: "Upper Leg (R)", path: "M50,85 L65,85 L65,115 L50,115 Z" },
    { id: "lower-leg-l", label: "Lower Leg (L)", path: "M35,115 L50,115 L50,145 L35,145 Z" },
    { id: "lower-leg-r", label: "Lower Leg (R)", path: "M50,115 L65,115 L65,145 L50,145 Z" },
    { id: "feet-l", label: "Foot (L)", path: "M35,145 L50,145 L48,155 L32,155 Z" },
    { id: "feet-r", label: "Foot (R)", path: "M50,145 L65,145 L68,155 L52,155 Z" },
    { id: "back-upper", label: "Upper Back", path: "M35,45 L65,45 L65,55 L35,55 Z" }, // Represented roughly
    { id: "back-lower", label: "Lower Back", path: "M35,65 L65,65 L65,75 L35,75 Z" }, // Represented roughly
];

interface BodyMapProps {
    selectedRegions: string[];
    onChange: (regions: string[]) => void;
    className?: string;
}

export function BodyMap({ selectedRegions, onChange, className }: BodyMapProps) {
    const toggleRegion = (id: string) => {
        if (selectedRegions.includes(id)) {
            onChange(selectedRegions.filter((r) => r !== id));
        } else {
            onChange([...selectedRegions, id]);
        }
    };

    return (
        <div className={cn("flex flex-col items-center gap-6", className)}>
            <div className="relative w-64 h-96 lg:w-80 lg:h-[30rem] bg-secondary/10 rounded-[2rem] border-2 border-border/50 p-6 shadow-inner transition-all">
                <svg viewBox="0 0 100 160" className="w-full h-full">
                    {REGIONS.map((region) => (
                        <path
                            key={region.id}
                            d={region.path}
                            className={cn(
                                "cursor-pointer transition-all duration-200 stroke-2",
                                selectedRegions.includes(region.id)
                                    ? "fill-primary stroke-primary"
                                    : "fill-background stroke-muted-foreground/30 hover:fill-primary/20 hover:stroke-primary/50"
                            )}
                            onClick={() => toggleRegion(region.id)}
                        >
                            <title>{region.label}</title>
                        </path>
                    ))}
                </svg>
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                {selectedRegions.map((id) => {
                    const region = REGIONS.find((r) => r.id === id);
                    return (
                        <span
                            key={id}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                            {region?.label}
                            <button
                                type="button"
                                onClick={() => toggleRegion(id)}
                                className="ml-1.5 inline-flex items-center justify-center text-primary/50 hover:text-primary"
                            >
                                ×
                            </button>
                        </span>
                    );
                })}
                {selectedRegions.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                        Select regions on the map...
                    </p>
                )}
            </div>
        </div>
    );
}

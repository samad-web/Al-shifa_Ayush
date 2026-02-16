import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { useEffect } from "react";

const languages = [
    { code: 'en', name: 'English (English)', dir: 'ltr' },
    { code: 'ta', name: 'Tamil (தமிழ்)', dir: 'ltr' }
];

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const currentLanguage = languages.find((l) => l.code === i18n.language) || languages[0];

    useEffect(() => {
        document.documentElement.dir = currentLanguage.dir;
        document.documentElement.lang = currentLanguage.code;
    }, [currentLanguage]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Languages className="h-4 w-4" />
                    <span className="sr-only">Switch Language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => i18n.changeLanguage(lang.code)}
                        className={i18n.language === lang.code ? "bg-accent" : ""}
                    >
                        {lang.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

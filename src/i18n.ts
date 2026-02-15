import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            "welcome": "Welcome to Al-shifa Ayush",
            "onboarding": {
                "title": "Patient Onboarding",
                "description": "Please help us understand your health needs.",
                "therapy_type": "Preferred Therapy Type",
                "gender": "Self Identification",
                "ayurveda": "Ayurveda",
                "unani": "Unani",
                "homeopathy": "Homeopathy",
                "siddha": "Siddha",
                "yoga": "Yoga",
                "perfect": "You're all set!",
                "complete_description": "Your profile is updated. Let's begin your healing journey.",
                "genders": {
                    "male": "Male",
                    "female": "Female",
                    "other": "Other"
                },
                "steps": {
                    "0": { "title": "Basic Information", "subtitle": "Help us personalize your experience" },
                    "1": { "title": "Sleep Patterns", "subtitle": "Sleep is crucial for your healing journey" },
                    "2": { "title": "Pain Assessment", "subtitle": "Tell us where it hurts and how much" }
                }
            },
            "chat": {
                "title": "Secure Messaging",
                "placeholder": "Type a message...",
                "send": "Send"
            }
        }
    },
    hi: {
        translation: {
            "welcome": "अल-शिफा आयुश में आपका स्वागत है",
            "onboarding": {
                "title": "रोगी ऑनबोर्डिंग",
                "description": "कृपया हमें अपनी स्वास्थ्य आवश्यकताओं को समझने में मदद करें।",
                "therapy_type": "पसंद की चिकित्सा पद्धति",
                "gender": "स्वयं की पहचान",
                "ayurveda": "आयुर्वेद",
                "unani": "यूनानी",
                "homeopathy": "होम्योपैथी",
                "siddha": "सिद्ध",
                "yoga": "योग",
                "perfect": "आप पूरी तरह तैयार हैं!",
                "complete_description": "आपकी प्रोफाइल अपडेट कर दी गई है। आइए अपनी उपचार यात्रा शुरू करें।",
                "genders": {
                    "male": "पुरुष",
                    "female": "महिला",
                    "other": "अन्य"
                },
                "steps": {
                    "0": { "title": "बुनियादी जानकारी", "subtitle": "हमें आपके अनुभव को व्यक्तिगत बनाने में मदद करें" },
                    "1": { "title": "नींद का पैटर्न", "subtitle": "नींद आपकी उपचार यात्रा के लिए महत्वपूर्ण है" },
                    "2": { "title": "दर्द का आकलन", "subtitle": "हमें बताएं कि कहां दर्द होता है और कितना" }
                }
            },
            "chat": {
                "title": "सुरक्षित संदेश",
                "placeholder": "संदेश टाइप करें...",
                "send": "भेजें"
            }
        }
    },
    ar: {
        translation: {
            "welcome": "مرحباً بكم في الشفاء أيوش",
            "onboarding": {
                "title": "تسجيل المريض",
                "description": "يرجى مساعدتنا في فهم احتياجاتك الصحية.",
                "therapy_type": "نوع العلاج المفضل",
                "gender": "الهوية الذاتية",
                "ayurveda": "أيروفيدا",
                "unani": "يوناني",
                "homeopathy": "هوميوباثي",
                "siddha": "سيدها",
                "yoga": "يوغا",
                "perfect": "أنت جاهز تماماً!",
                "complete_description": "تم تحديث ملفك الشخصي. لنبدأ رحلة الشفاء الخاصة بك.",
                "genders": {
                    "male": "ذكر",
                    "female": "أنثى",
                    "other": "آخر"
                },
                "steps": {
                    "0": { "title": "معلومات أساسية", "subtitle": "ساعدنا في تخصيص تجربتك" },
                    "1": { "title": "أنماط النوم", "subtitle": "النوم ضروري لرحلة الشفاء" },
                    "2": { "title": "تقييم الألم", "subtitle": "أخبرنا أين يؤلمك وكم" }
                }
            },
            "chat": {
                "title": "الرسائل الآمنة",
                "placeholder": "اكتب رسالة...",
                "send": "إرسال"
            }
        }
    },
    ta: {
        translation: {
            "welcome": "அல்-ஷிபா ஆயுலுக்கு வரவேற்கிறோம்",
            "onboarding": {
                "title": "நோயாளி பதிவு",
                "description": "உங்கள் சுகாதாரத் தேவைகளைப் புரிந்துகொள்ள எங்களுக்கு உதவுங்கள்.",
                "therapy_type": "விருப்பமான சிகிச்சை முறை",
                "gender": "சுய அடையாளம்",
                "ayurveda": "ஆயுர்வேதம்",
                "unani": "யுனானி",
                "homeopathy": "ஹோமியோபதி",
                "siddha": "சித்தா",
                "yoga": "யோகா",
                "perfect": "எல்லாம் தயார்!",
                "complete_description": "உங்கள் சுயவிவரம் புதுப்பிக்கப்பட்டது. உங்கள் குணமாக்கும் பயணத்தைத் தொடங்குவோம்.",
                "genders": {
                    "male": "ஆண்",
                    "female": "பெண்",
                    "other": "மற்றவை"
                },
                "steps": {
                    "0": { "title": "அடிப்படைத் தகவல்", "subtitle": "நாங்கள் உங்கள் அனுபவத்தை தனிப்பயனாக்க விரும்புகிறோம்" },
                    "1": { "title": "தூக்க முறைகள்", "subtitle": "உங்கள் குணமடைய தூக்கம் மிகவும் முக்கியமானது" },
                    "2": { "title": "வலி மதிப்பீடு", "subtitle": "எங்களுக்கு எங்கு வலிக்கிறது மற்றும் எவ்வளவு என்று சொல்லுங்கள்" }
                }
            },
            "chat": {
                "title": "பாதுகாப்பான செய்திகள்",
                "placeholder": "செய்தியைத் தட்டச்சு செய்க...",
                "send": "அனுப்பு"
            }
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "en",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;

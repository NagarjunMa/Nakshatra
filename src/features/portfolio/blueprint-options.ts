export type BlueprintOption = { value: string; label: string };

const option = (value: string, label = value): BlueprintOption => ({ value, label });

export const GENDER_OPTIONS = [
  option("", "Select gender"),
  option("female", "Female"),
  option("male", "Male"),
  option("non_binary", "Non-binary"),
  option("prefer_not_to_say", "Prefer not to say"),
];

export const PROFILE_FOR_OPTIONS = [
  option("", "Select who is creating this"),
  option("self", "Myself"),
  option("son", "My son"),
  option("daughter", "My daughter"),
  option("sibling", "My sibling"),
  option("relative", "A relative"),
];

export const MARITAL_STATUS_OPTIONS = [
  option("", "Select marital status"),
  option("Never Married"),
  option("Previously Married"),
  option("Widowed"),
  option("Separated"),
  option("Annulled"),
  option("Prefer not to say"),
];

export const HEIGHT_OPTIONS = [
  option("", "Select height"),
  ...Array.from({ length: 37 }, (_, index) => {
    const inches = 48 + index;
    return option(`${Math.floor(inches / 12)}'${inches % 12}"`);
  }),
];

export const AGE_OPTIONS = [
  option("", "Select age"),
  ...Array.from({ length: 63 }, (_, index) => option(String(18 + index))),
];

export const COUNTRY_OPTIONS = [
  option("", "Select country"),
  option("India"),
  option("United States"),
  option("Canada"),
  option("United Kingdom"),
  option("Australia"),
  option("New Zealand"),
  option("United Arab Emirates"),
  option("Singapore"),
  option("Germany"),
  option("Netherlands"),
  option("Ireland"),
  option("France"),
  option("Switzerland"),
  option("Other"),
];

export const RELIGION_OPTIONS = [
  option("", "Select religion or outlook"),
  option("Hindu"),
  option("Muslim"),
  option("Christian"),
  option("Sikh"),
  option("Buddhist"),
  option("Jain"),
  option("Jewish"),
  option("Zoroastrian"),
  option("No Religion"),
  option("Spiritual but not religious"),
  option("Prefer not to say"),
  option("Other"),
];

export const JOB_TYPE_OPTIONS = [
  option("", "Select work status"),
  option("Full-time"),
  option("Contract"),
  option("Job Search"),
  option("Studying"),
  option("Business"),
  option("Freelance"),
  option("Internship"),
  option("Self-Employed"),
  option("Career break"),
  option("Prefer not to say"),
];

export const VISA_OPTIONS = [
  option("", "Select visa or residency"),
  option("Not Applicable"),
  option("H1B"),
  option("Green Card"),
  option("OPT"),
  option("L1"),
  option("I-140"),
  option("Student"),
  option("Post-Study Work"),
  option("Work"),
  option("Business"),
  option("Permanent Resident"),
  option("Citizen"),
  option("Other"),
  option("Prefer not to say"),
];

export const QUALIFICATION_OPTIONS = [
  option("", "Select highest qualification"),
  option("High School"),
  option("Diploma/Associate Degree"),
  option("Bachelor's Degree"),
  option("Master's Degree"),
  option("Professional Specialization"),
  option("Doctorate"),
  option("Other"),
  option("Prefer not to say"),
];

export const CURRENCY_OPTIONS = [
  option("", "Currency"),
  option("INR"),
  option("USD"),
  option("CAD"),
  option("GBP"),
  option("AUD"),
  option("EUR"),
  option("AED"),
  option("SGD"),
  option("Other"),
];

export const INCOME_RANGE_OPTIONS = [
  option("", "Select an income range"),
  option("Under 25k"),
  option("25k-50k"),
  option("50k-75k"),
  option("75k-100k"),
  option("100k-125k"),
  option("125k-150k"),
  option("150k-200k"),
  option("200k-250k"),
  option("250k-500k"),
  option("500k+"),
  option("Prefer not to say"),
];

export const WEALTH_STAGE_OPTIONS = [
  option("", "Select financial stage"),
  option("Starting out"),
  option("Growing steadily"),
  option("Comfortable"),
  option("Well-established"),
  option("Affluent"),
  option("Prefer not to say"),
];

export const DIET_OPTIONS = [
  option("", "Select dietary preference"),
  option("Vegetarian"),
  option("Non-Vegetarian"),
  option("Vegan"),
  option("Flexitarian"),
  option("Pescatarian"),
  option("Lacto-ovo vegetarian"),
  option("Other"),
  option("Prefer not to say"),
];

export const FREQUENCY_OPTIONS = [
  option("", "Select"),
  option("Never"),
  option("Occasionally"),
  option("Socially"),
  option("Regularly"),
  option("Will share later"),
];

export const HOBBY_OPTIONS = [
  "Reading", "Traveling", "Photography", "Cooking", "Hiking", "Gaming",
  "Painting", "Yoga", "Meditation", "Gardening", "Dancing", "Singing",
  "Playing musical instruments", "Writing", "Swimming", "Cycling", "Running",
  "Gym & fitness", "Tennis", "Badminton", "Cricket", "Chess", "Board games",
  "Watching movies", "Theatre", "Concerts", "Volunteering", "Teaching",
  "Learning languages", "Coding", "DIY & crafts", "Astronomy", "Camping",
  "Fashion & style", "Podcasting", "Blogging", "Pet care",
].map((value) => option(value));

export const VALUE_OPTIONS = [
  "Kindness", "Honesty", "Trust", "Mutual respect", "Empathy", "Compassion",
  "Open communication", "Family", "Loyalty", "Responsibility", "Personal growth", "Spirituality",
  "Patience", "Humility", "Generosity", "Curiosity", "Optimism",
  "Independence", "Stability", "Adventure", "Community", "Health",
  "Creativity", "Ambition", "Balance", "Resilience", "Fairness", "Tradition",
].map((value) => option(value));

export const LANGUAGE_OPTIONS = [
  "Assamese", "Arabic", "Bengali", "Bhojpuri", "English", "French", "German",
  "Gujarati", "Hindi", "Kannada", "Kashmiri", "Konkani", "Malayalam",
  "Mandarin", "Marathi", "Marwari", "Nepali", "Odia", "Persian", "Punjabi",
  "Rajasthani", "Russian", "Sanskrit", "Sindhi", "Spanish", "Tamil", "Telugu",
  "Tulu", "Urdu", "Other",
].map((value) => option(value));

export const COMMUNITY_OPTIONS = [
  option("", "Select community"),
  "No caste", "Arya Vysya", "Bestha", "Brahmin", "Goud", "Intercaste",
  "Kamma", "Kalinga Vysya", "Kapu", "Kshatriya", "Lambadi", "Madiga", "Mala",
  "Mudaliyar", "Mudhiraj", "Nai Brahmin", "Padmasali", "Padmanayaka Velama",
  "Perika", "Reddy", "Velama", "Viswabrahmin", "Yadav", "Other",
].map((value) => typeof value === "string" ? option(value) : value);

export const CASTE_PREFERENCE_OPTIONS = [
  option("", "Select community preference"),
  option("open", "Open to all communities"),
  option("specific", "Open to specific communities"),
  option("not_applicable", "Not applicable"),
  option("prefer_not_to_say", "Prefer not to say"),
];

export const SIBLING_POSITION_OPTIONS = [
  option("", "Select position"),
  option("Oldest"),
  option("Middle"),
  option("Youngest"),
  option("Twin"),
  option("Only Child"),
  option("Step-Sibling"),
];

export const MARRIAGE_TIMELINE_OPTIONS = [
  option("", "Choose what feels closest"),
  option("Ready within 6–12 months"),
  option("Within 1–2 years"),
  option("Open, without a fixed timeline"),
  option("Still exploring"),
  option("Discuss later"),
  option("Prefer not to say"),
];

export const CHILDREN_OPTIONS = [
  option("", "Choose what feels closest"),
  option("Would like children"),
  option("Would not like children"),
  option("Open and undecided"),
  option("Discuss later"),
  option("Prefer not to say"),
];

export const RELOCATION_OPTIONS = [
  option("", "Choose what feels closest"),
  option("Open to relocating"),
  option("Prefer to stay where I am"),
  option("Depends on both careers and family"),
  option("Open to returning to India"),
  option("Discuss later"),
];

export const CAREER_AFTER_MARRIAGE_OPTIONS = [
  option("", "Choose what feels closest"),
  option("Both careers should be supported equally"),
  option("We can adapt as life changes"),
  option("One partner may pause by mutual choice"),
  option("Career is flexible for the right family plan"),
  option("Discuss later"),
  option("Prefer not to say"),
];

export const LIVING_ARRANGEMENT_OPTIONS = [
  option("", "Choose what feels closest"),
  option("Our own home"),
  option("With parents or extended family"),
  option("Near family, in a separate home"),
  option("Flexible depending on circumstances"),
  option("Discuss later"),
  option("Prefer not to say"),
];

export const FAMILY_RESPONSIBILITY_OPTIONS = [
  option("", "Choose what feels closest"),
  option("Shared equally as a couple"),
  option("Based on each person's strengths and availability"),
  option("Family support is an important shared priority"),
  option("Flexible as needs change"),
  option("Discuss later"),
  option("Prefer not to say"),
];

export const HOROSCOPE_PREFERENCE_OPTIONS = [
  option("", "Select horoscope preference"),
  option("Yes"),
  option("No"),
  option("Flexible"),
  option("Not applicable"),
];

export const WEDDING_EXPECTATION_OPTIONS = [
  option("", "Select what feels right"),
  option("Intimate: close family and a few friends"),
  option("Modest: immediate family and close friends"),
  option("Traditional: extended family and friends"),
  option("Grand celebration"),
  option("Destination wedding"),
  option("Registered marriage"),
  option("Discuss and decide together"),
];

export const GIFT_EXPECTATION_OPTIONS = [
  option("", "Select your outlook"),
  option("No gifts expected"),
  option("Only symbolic exchanges"),
  option("Discuss and decide together"),
  option("Prefer not to say"),
];

export const PARENT_SUPPORT_OPTIONS = [
  option("", "Select your outlook"),
  option("No financial support needed"),
  option("Occasional financial assistance"),
  option("Regular family support"),
  option("Discuss and decide together"),
  option("Prefer not to say"),
];

export const MANGLIK_OPTIONS = [
  option("", "Select manglik status"),
  option("Yes"),
  option("No"),
  option("Partial"),
  option("Unsure"),
  option("Not applicable"),
];

export const NAKSHATRA_OPTIONS = [
  "Anuradha", "Ardra", "Ashlesha", "Ashwini", "Bharani", "Chitra",
  "Dhanishta", "Hasta", "Jyeshtha", "Krittika", "Magha", "Mrigashira",
  "Mula", "Punarvasu", "Purva Ashadha", "Purva Bhadrapada", "Purva Phalguni",
  "Pushya", "Revati", "Rohini", "Shatabhisha", "Shravana", "Swati",
  "Uttara Ashadha", "Uttara Bhadrapada", "Uttara Phalguni", "Vishakha",
].map((value) => option(value));

export const SECTION_AUDIENCE_OPTIONS = [
  option("public", "Public portfolio"),
  option("approved", "Approved viewers"),
  option("broker", "Authorized broker"),
  option("owner", "Only me"),
];

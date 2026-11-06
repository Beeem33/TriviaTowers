import type { Question, QuestionCategory, Difficulty, Choices, ChoiceIndex } from "@triviatowers/shared-types";

/**
 * Local sample bank for Phase 1 (offline play). Answers are well-established facts, but
 * every entry is marked `pending_review`: run them through the editorial review flow
 * (docs/QUESTIONS.md) before they are scheduled into a ranked Daily Tower.
 *
 * Convention: the correct answer is written first (index 0). Choice order is shuffled
 * deterministically at selection time, so the stored order never leaks to players.
 */
type Row = [
  id: string,
  category: QuestionCategory,
  difficulty: Difficulty,
  prompt: string,
  choices: Choices,
  explanation: string,
  source: string,
];

const CREATED = "2026-11-06T00:00:00.000Z";
const W = "https://en.wikipedia.org/wiki/";

const rows: Row[] = [
  // Geography
  ["geo-001", "geography", "easy", "What is the capital city of Australia?", ["Canberra", "Sydney", "Melbourne", "Perth"], "Canberra was purpose-built as a compromise between rivals Sydney and Melbourne.", W + "Canberra"],
  ["geo-002", "geography", "easy", "What is the largest ocean on Earth?", ["Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Southern Ocean"], "The Pacific covers about a third of Earth's surface — more than all land combined.", W + "Pacific_Ocean"],
  ["geo-003", "geography", "easy", "What is the smallest country in the world by area?", ["Vatican City", "Monaco", "San Marino", "Liechtenstein"], "Vatican City covers roughly 0.44 km², entirely within the city of Rome.", W + "Vatican_City"],
  ["geo-004", "geography", "medium", "Mount Kilimanjaro is located in which country?", ["Tanzania", "Kenya", "Uganda", "Ethiopia"], "Kilimanjaro, Africa's highest peak, sits in northeastern Tanzania near the Kenyan border.", W + "Mount_Kilimanjaro"],
  ["geo-005", "geography", "medium", "What is the largest hot desert in the world?", ["Sahara", "Arabian Desert", "Kalahari", "Gobi"], "The Sahara is the largest hot desert; the cold deserts of Antarctica and the Arctic are larger.", W + "Sahara"],
  ["geo-006", "geography", "medium", "Which country is home to the most lakes?", ["Canada", "Russia", "Finland", "United States"], "Canada has more lakes than any other country — by many estimates over half of the world's lakes.", W + "List_of_lakes_of_Canada"],
  ["geo-007", "geography", "hard", "Counting its overseas territories, which country spans the most time zones?", ["France", "Russia", "United States", "United Kingdom"], "Thanks to territories from French Polynesia to Réunion, France uses 12 time zones (13 including Antarctica).", W + "Time_in_France"],

  // History
  ["his-001", "history", "easy", "In which year did the Berlin Wall fall?", ["1989", "1987", "1991", "1985"], "The wall was opened on 9 November 1989, leading to German reunification in 1990.", W + "Fall_of_the_Berlin_Wall"],
  ["his-002", "history", "easy", "Who was the first person to walk on the Moon?", ["Neil Armstrong", "Buzz Aldrin", "Yuri Gagarin", "Michael Collins"], "Armstrong stepped onto the Moon on 20 July 1969 during Apollo 11; Aldrin followed minutes later.", W + "Neil_Armstrong"],
  ["his-003", "history", "easy", "Which civilization built Machu Picchu?", ["The Inca", "The Aztecs", "The Maya", "The Olmecs"], "Machu Picchu was built in the 15th century in the Andes of Peru for the Inca emperor Pachacuti.", W + "Machu_Picchu"],
  ["his-004", "history", "medium", "The Rosetta Stone was key to deciphering which writing system?", ["Egyptian hieroglyphs", "Cuneiform", "Linear B", "Maya script"], "It carries the same decree in hieroglyphic, Demotic and Greek, which let scholars crack hieroglyphs in the 1820s.", W + "Rosetta_Stone"],
  ["his-005", "history", "medium", "Mansa Musa, famed for his immense wealth, ruled which empire?", ["Mali Empire", "Songhai Empire", "Ghana Empire", "Ethiopian Empire"], "Mansa Musa ruled the Mali Empire in the 14th century; his pilgrimage to Mecca became legendary.", W + "Musa_I_of_Mali"],
  ["his-006", "history", "medium", "Which ship carried the Pilgrims to North America in 1620?", ["Mayflower", "Santa María", "Endeavour", "Golden Hind"], "The Mayflower landed at Cape Cod in November 1620 before the settlers founded Plymouth Colony.", W + "Mayflower"],
  ["his-007", "history", "hard", "Which was the first self-governing country to grant women the vote in national elections?", ["New Zealand", "Finland", "United States", "United Kingdom"], "New Zealand granted women the right to vote in parliamentary elections in 1893.", W + "Women%27s_suffrage_in_New_Zealand"],

  // Science
  ["sci-001", "science", "easy", "What is the chemical symbol for gold?", ["Au", "Ag", "Gd", "Go"], "Au comes from the Latin word for gold, aurum. Ag is silver.", W + "Gold"],
  ["sci-002", "science", "easy", "Which planet is known as the Red Planet?", ["Mars", "Venus", "Jupiter", "Mercury"], "Iron oxide — rust — in Martian soil gives Mars its reddish colour.", W + "Mars"],
  ["sci-003", "science", "easy", "What is the hardest naturally occurring mineral?", ["Diamond", "Quartz", "Topaz", "Corundum"], "Diamond scores 10, the maximum, on the Mohs hardness scale.", W + "Mohs_scale"],
  ["sci-004", "science", "medium", "How many bones are in a typical adult human body?", ["206", "186", "212", "226"], "Babies are born with around 270 bones; many fuse together as we grow.", W + "List_of_bones_of_the_human_skeleton"],
  ["sci-005", "science", "medium", "Which metal is liquid at a typical room temperature of about 20 °C?", ["Mercury", "Gallium", "Tungsten", "Sodium"], "Mercury melts at −38.8 °C. Gallium melts at about 29.8 °C — it would melt in your hand, but not on a cool desk.", W + "Mercury_(element)"],
  ["sci-006", "science", "medium", "Roughly how fast does light travel in a vacuum?", ["300,000 km per second", "30,000 km per second", "3,000,000 km per second", "150,000 km per second"], "Light travels at 299,792 km/s — fast enough to circle Earth about 7.5 times in one second.", W + "Speed_of_light"],
  ["sci-007", "science", "medium", "What is the most abundant gas in Earth's atmosphere?", ["Nitrogen", "Oxygen", "Carbon dioxide", "Argon"], "Nitrogen makes up about 78% of the air; oxygen is about 21%.", W + "Atmosphere_of_Earth"],

  // Technology
  ["tec-001", "technology", "easy", "How many bits are in one byte?", ["8", "4", "16", "10"], "A byte is eight bits, enough for 256 distinct values.", W + "Byte"],
  ["tec-002", "technology", "easy", "Who is credited with inventing the World Wide Web?", ["Tim Berners-Lee", "Bill Gates", "Steve Wozniak", "Ada Lovelace"], "Tim Berners-Lee proposed the Web in 1989 while working at CERN.", W + "Tim_Berners-Lee"],
  ["tec-003", "technology", "medium", "The Python programming language is named after what?", ["A British comedy group", "A large snake", "A Greek myth", "A video game"], "Creator Guido van Rossum named it after Monty Python's Flying Circus.", W + "Python_(programming_language)"],
  ["tec-004", "technology", "medium", "What does “QR” stand for in “QR code”?", ["Quick Response", "Quality Read", "Quantum Record", "Query Reference"], "QR codes were invented in 1994 by Denso Wave to track car parts quickly.", W + "QR_code"],
  ["tec-005", "technology", "medium", "In which year was the first iPhone released?", ["2007", "2005", "2009", "2010"], "Apple announced the original iPhone in January 2007 and released it that June.", W + "IPhone_(1st_generation)"],
  ["tec-006", "technology", "easy", "What does “HTTP” stand for?", ["HyperText Transfer Protocol", "High Transfer Text Process", "Hyperlink Text Tracking Program", "Home Tool Transfer Protocol"], "HTTP is the protocol browsers use to request web pages from servers.", W + "HTTP"],

  // Sports
  ["spo-001", "sports", "easy", "How many players does a soccer team have on the field at once?", ["11", "9", "10", "12"], "Each side fields eleven players, including the goalkeeper.", W + "Association_football"],
  ["spo-002", "sports", "easy", "How many rings are on the Olympic flag?", ["5", "4", "6", "7"], "The five interlocking rings represent the union of the inhabited continents.", W + "Olympic_symbols"],
  ["spo-003", "sports", "medium", "In tennis, what is a score of zero called?", ["Love", "Nil", "Duck", "Blank"], "“Love” for zero has been used in tennis scoring since at least the 18th century; its origin is debated.", W + "Tennis_scoring_system"],
  ["spo-004", "sports", "medium", "What is the official length of a marathon?", ["42.195 km", "40 km", "38.6 km", "45 km"], "The distance — about 26.2 miles — was standardized in 1921, based on the 1908 London Olympic course.", W + "Marathon"],
  ["spo-005", "sports", "easy", "In bowling, what is it called when you knock down all ten pins with your first ball?", ["A strike", "A spare", "A turkey", "A split"], "A spare takes two balls; three strikes in a row is a turkey.", W + "Strike_(bowling)"],

  // Entertainment
  ["ent-001", "entertainment", "easy", "How many keys does a standard modern piano have?", ["88", "76", "92", "64"], "52 white keys and 36 black keys make 88.", W + "Piano"],
  ["ent-002", "entertainment", "easy", "Which band released the album “Abbey Road”?", ["The Beatles", "The Rolling Stones", "Queen", "Pink Floyd"], "Abbey Road (1969) is named after the London street where the Beatles recorded it.", W + "Abbey_Road"],
  ["ent-003", "entertainment", "easy", "Sherlock Holmes famously lives on which street?", ["Baker Street", "Oxford Street", "Fleet Street", "Downing Street"], "Arthur Conan Doyle placed the detective at 221B Baker Street, London.", W + "221B_Baker_Street"],
  ["ent-004", "entertainment", "medium", "Who painted the ceiling of the Sistine Chapel?", ["Michelangelo", "Raphael", "Leonardo da Vinci", "Botticelli"], "Michelangelo painted the ceiling between 1508 and 1512.", W + "Sistine_Chapel_ceiling"],

  // Pop culture
  ["pop-001", "pop-culture", "easy", "What does the “K” in K-pop stand for?", ["Korean", "Kawaii", "Kinetic", "Karaoke"], "K-pop is popular music from South Korea.", W + "K-pop"],
  ["pop-002", "pop-culture", "easy", "What is the name of Superman's home planet?", ["Krypton", "Gallifrey", "Vulcan", "Tatooine"], "Superman (Kal-El) was sent to Earth as a baby before Krypton exploded.", W + "Krypton_(comics)"],
  ["pop-003", "pop-culture", "easy", "Which video game hero is a plumber who wears a red cap marked “M”?", ["Mario", "Luigi", "Wario", "Sonic"], "Mario first appeared in Donkey Kong (1981), originally as “Jumpman”.", W + "Mario"],

  // Nature
  ["nat-001", "nature", "easy", "What is the largest animal on Earth?", ["Blue whale", "African elephant", "Whale shark", "Giraffe"], "Blue whales can exceed 30 m long — the largest animals known to have ever lived.", W + "Blue_whale"],
  ["nat-002", "nature", "medium", "How many hearts does an octopus have?", ["3", "1", "2", "4"], "Two hearts pump blood through the gills; the third pumps it around the body.", W + "Octopus"],
  ["nat-003", "nature", "medium", "Which bird can fly backwards?", ["Hummingbird", "Swallow", "Kingfisher", "Sparrow"], "Hummingbirds rotate their wings in a figure-eight, letting them hover and fly in reverse.", W + "Hummingbird"],
  ["nat-004", "nature", "medium", "What is a group of crows called?", ["A murder", "A parliament", "A pride", "A gaggle"], "A parliament is owls, a pride is lions, and a gaggle is geese.", W + "List_of_animal_names"],
  ["nat-005", "nature", "hard", "Which tree species includes the tallest living trees on Earth?", ["Coast redwood", "Giant sequoia", "Douglas fir", "Mountain ash"], "Coast redwoods top 115 m. Giant sequoias are the most massive trees, but not the tallest.", W + "Sequoia_sempervirens"],
  ["nat-006", "nature", "medium", "What is the only mammal capable of true, sustained flight?", ["The bat", "The flying squirrel", "The sugar glider", "The colugo"], "Flying squirrels, sugar gliders and colugos glide; bats truly fly.", W + "Bat"],

  // Food
  ["foo-001", "food", "easy", "What is the main ingredient in guacamole?", ["Avocado", "Lime", "Tomato", "Green pepper"], "Guacamole dates back to the Aztecs, who called it āhuacamōlli — avocado sauce.", W + "Guacamole"],
  ["foo-002", "food", "easy", "Paella originally comes from which country?", ["Spain", "Italy", "Portugal", "Mexico"], "Paella originated in the Valencia region of eastern Spain.", W + "Paella"],
  ["foo-003", "food", "medium", "Which nut is the main ingredient of marzipan?", ["Almond", "Hazelnut", "Pistachio", "Cashew"], "Marzipan is made mostly of ground almonds and sugar.", W + "Marzipan"],
  ["foo-004", "food", "medium", "The spice saffron comes from which part of a plant?", ["The stigma of a crocus flower", "The root of a lily", "The bark of a tree", "The seeds of a pod"], "Each crocus flower yields just three stigmas, which is why saffron is so expensive.", W + "Saffron"],
  ["foo-005", "food", "hard", "Much of the “wasabi” served outside Japan is mostly made from which plant?", ["Horseradish", "Ginger", "Green chili", "Mustard greens"], "Real wasabi is costly, so imitations typically use horseradish, mustard and green colouring.", W + "Wasabi"],

  // General knowledge
  ["gen-001", "general", "easy", "How many sides does a hexagon have?", ["6", "5", "7", "8"], "Hexa- comes from the Greek for six. Honeycomb cells are hexagons.", W + "Hexagon"],
  ["gen-002", "general", "medium", "How many minutes are there in a day?", ["1,440", "1,240", "1,600", "2,400"], "24 hours × 60 minutes = 1,440 minutes.", W + "Day"],
  ["gen-003", "general", "medium", "Which language has the most native speakers?", ["Mandarin Chinese", "Spanish", "English", "Hindi"], "Mandarin has roughly a billion native speakers; English has the most speakers when learners are included.", W + "List_of_languages_by_number_of_native_speakers"],
];

export const SAMPLE_QUESTIONS: readonly Question[] = rows.map(
  ([id, category, difficulty, prompt, choices, explanation, source]) => ({
    id,
    prompt,
    choices,
    correctIndex: 0 as ChoiceIndex,
    category,
    difficulty,
    explanation,
    source,
    createdAt: CREATED,
    reviewStatus: "pending_review",
  }),
);

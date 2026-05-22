import type { City, Tour } from "./types";

export const FEATURED_CITIES: City[] = [
  { slug: "london", name: "London", country: "United Kingdom", emoji: "🇬🇧", tourCount: 4, coverColor: "#1a3a5c" },
  { slug: "paris", name: "Paris", country: "France", emoji: "🇫🇷", tourCount: 3, coverColor: "#5c1a3a" },
  { slug: "rome", name: "Rome", country: "Italy", emoji: "🇮🇹", tourCount: 5, coverColor: "#5c3a1a" },
  { slug: "tokyo", name: "Tokyo", country: "Japan", emoji: "🇯🇵", tourCount: 3, coverColor: "#1a5c3a" },
  { slug: "new-york", name: "New York", country: "United States", emoji: "🇺🇸", tourCount: 4, coverColor: "#3a1a5c" },
  { slug: "barcelona", name: "Barcelona", country: "Spain", emoji: "🇪🇸", tourCount: 3, coverColor: "#5c4a1a" },
];

export const LONDON_CLASSIC: Tour = {
  id: "london-classic-one-day",
  citySlug: "london",
  cityName: "London",
  title: "London Classic — One Day",
  tagline: "From the Thames to Hyde Park, the essential story of the city.",
  duration: "6–7 hours",
  distance: "5.2 km",
  stopCount: 5,
  tier: "free",
  categories: ["history", "architecture", "funfacts"],
  coverColor: "#1a3a5c",
  stops: [
    {
      id: "tower-of-london",
      order: 1,
      name: "Tower of London",
      duration: "60–75 min",
      lat: 51.5081,
      lng: -0.0759,
      tags: ["History", "Walk", "Iconic"],
      summary: "A thousand years of power, imprisonment and spectacle on the north bank of the Thames.",
      narration: {
        history: `The Tower of London began not as a prison, but as a statement. When William the Conqueror completed the White Tower in 1078, its purpose was unmistakable: a permanent, indestructible reminder to the people of London that Norman rule was here to stay. Standing nearly 30 metres tall, faced in Caen limestone imported from Normandy, it was the tallest building most Londoners had ever seen.

Over the following four centuries, the complex grew outward — moat, curtain walls, inner and outer rings of towers — transforming into the most sophisticated concentric castle in England. But it was its role as a royal prison that gave the Tower its darkest reputation. Anne Boleyn walked through Traitor's Gate in 1536 and was beheaded on the green inside. Thomas More, Lady Jane Grey, and two young princes — the sons of Edward IV, who vanished inside these walls and were never seen again — all passed through here. The mystery of the princes remains one of the most debated cold cases in English history.

Today the Tower houses the Crown Jewels: a collection that includes the Koh-i-Noor diamond, the Sovereign's Sceptre with Cullinan I — the largest colourless cut diamond in the world at 530 carats — and the Imperial State Crown, worn at the close of every State Opening of Parliament. The Yeoman Warders, known as Beefeaters, have guarded the Tower since 1485. There are currently 37 of them, each a veteran with at least 22 years of military service. And then there are the ravens — six of them, always. Legend holds that if the ravens ever leave, the Tower and the kingdom shall fall. Charles II, a man who took the legend seriously, decreed they would be maintained forever. Their wings are clipped just enough to keep them here.`,

        funfacts: `The name "Beefeater" is almost certainly not what you think. The most likely explanation is that the Yeoman Warders were historically entitled to eat from the king's table — beef being the most prestigious dish, and a significant perk in Tudor England when most ordinary people rarely ate red meat. There's also a theory linking the name to the French "buffetier," a royal servant who guarded the royal buffet, but the beef explanation has the most historical weight.

The Koh-i-Noor diamond in the Crown Jewels has one of the most contested histories of any object on earth. Originally mined in India, it passed through the hands of Mughal emperors, Persian rulers, Afghan kings, and Sikh maharajas before being ceded to Queen Victoria in 1849. India, Pakistan, Iran, and Afghanistan have all at various times formally requested its return. The British government has consistently declined. It is currently set in the crown made for Queen Elizabeth The Queen Mother, displayed alongside the other Crown Jewels.

The moat surrounding the Tower was finally drained in 1843, not for strategic reasons but because it had become a public health catastrophe. The stench was reportedly detectable from considerable distance, and the moat had become so contaminated that it was directly contributing to cholera outbreaks in the surrounding area. It is now a neat green lawn where the Tower's famous ravens often graze.`,

        architecture: `The White Tower at the centre is a masterpiece of Romanesque military architecture — square in plan, with walls up to 4.5 metres thick at the base, four corner turrets and a distinctive projecting apse on the south-east corner that contains the Chapel of St John the Evangelist, one of the finest examples of Norman ecclesiastical architecture surviving in England. The chapel's plain, massive columns and round arches feel deliberately austere — power expressed through restraint rather than ornament. The overall complex evolved over 900 years, which is why you can read the whole history of English defensive architecture simply by walking its perimeter.`,
      },
      accessibilityNote: "The Tower grounds are largely accessible. The White Tower interior has steps. The Crown Jewels are fully step-free. Allow extra time at busy periods — the Crown Jewels queue can be long.",
      practicalInfo: {
        openingHours: "Tue–Sat 9am–5:30pm, Sun–Mon 10am–5:30pm",
        admissionFee: "Adults £34.80, free for under 5s",
        nearestTransport: "Tower Hill (Circle & District lines), 3 min walk",
      },
    },
    {
      id: "tower-bridge",
      order: 2,
      name: "Tower Bridge",
      duration: "20–30 min",
      lat: 51.5055,
      lng: -0.0754,
      tags: ["Architecture", "View", "Walk"],
      summary: "London's most recognisable bridge, built in 1894, conceals a clever Victorian deception.",
      narration: {
        history: `Tower Bridge opened in June 1894, after eight years of construction and the labour of 432 workers. The engineer was Horace Jones — who died in 1887, before it was finished — and the hydraulic lifting mechanism was designed by John Wolfe Barry. The bridge needed to open to allow tall ships to reach the Pool of London, the historic heart of the port, while also carrying road traffic across the Thames. The solution was a bascule bridge: two enormous counterweighted leaves that could be raised in approximately one minute.

In its first years of operation, the bridge opened up to 50 times a day. Today it opens around 800 times a year, on request from vessels with sufficient mast height. You can watch a scheduled opening from the south bank — the schedule is published on the Tower Bridge website. When the bascules rise, traffic is stopped and the roadway simply splits in two and tilts skyward. It remains one of the most theatrical things that happens routinely in a European city.`,

        architecture: `The towers are Gothic Revival in style — pointed rooftops, ornate stonework, turrets — which was a deliberate choice to harmonise with the nearby Tower of London. What many people don't know is that this medieval-looking exterior is a skin: the real structure underneath is a steel frame, among the most modern engineering of its day. The Gothic cladding was added specifically to soften the industrial reality of what the bridge actually was. John Wolfe Barry reportedly considered the decorative stonework an unnecessary extravagance, but it was insisted upon so the bridge would not look out of place next to an 11th century castle.

The high-level walkways, 42 metres above the Thames, now have glass floors inserted into them — you can look straight down at the road and the river below. When they were originally built in 1894, the walkways were intended for pedestrians who didn't want to wait for the bridge to close after a ship had passed. They were largely unused, became associated with crime, and were closed in 1910. They reopened as a visitor attraction in 1982.`,

        funfacts: `Tower Bridge is frequently called London Bridge, including by tourists posing for photographs in front of it. The actual London Bridge is a plain, unremarkable concrete structure about 800 metres upstream. The original London Bridge — a different one, built in 1831 — was sold to an American developer in 1968 for $2.46 million, dismantled stone by stone, shipped to Arizona, and rebuilt as a tourist attraction in Lake Havasu City. There is a persistent and entirely false story that the buyer thought he was purchasing Tower Bridge and was disappointed when the structure arrived and turned out to be a rather ordinary Victorian road bridge. This story is not true, but it is too good to fully let go of.`,
      },
      accessibilityNote: "The bridge walkway is step-free via lifts inside the towers. The glass floor walkway is fully accessible.",
      practicalInfo: {
        openingHours: "Daily 9:30am–6pm (last entry 5pm)",
        admissionFee: "Adults £11.40 (exhibition + glass floor walkway)",
        nearestTransport: "Tower Hill or London Bridge stations, both 5–8 min walk",
      },
    },
    {
      id: "st-pauls-cathedral",
      order: 3,
      name: "St Paul's Cathedral",
      duration: "45–60 min",
      lat: 51.5138,
      lng: -0.0984,
      tags: ["Architecture", "History", "View"],
      summary: "Wren's masterpiece has dominated the London skyline for over 300 years — and survived the Blitz by luck and courage.",
      narration: {
        history: `The current St Paul's Cathedral is the fifth church to stand on this site. The fourth burned in the Great Fire of London in September 1666, along with 87 other parish churches and 13,200 houses. The fire was extinguished after four days, leaving roughly a third of the city in ash. Christopher Wren submitted his first rebuilding design within days. It was rejected. He submitted a second. Rejected again. His third design — the so-called "Warrant Design" — was approved in 1675, but Wren was given royal permission to make "necessary alterations" as building progressed. He used this permission liberally, quietly building something quite different from what had been approved. Construction took 35 years. Wren was 78 when the last stone was set in 1710.

During the Second World War, St Paul's became a symbol of national endurance. The Luftwaffe bombed London for 57 consecutive nights from September 1940. The cathedral was struck repeatedly and suffered significant damage, but the dome survived intact — protected partly by luck and partly by teams of volunteer fire-watchers who lived on the roof and extinguished incendiary bombs before they could take hold. A photograph taken by Herbert Mason on the night of 29 December 1940, showing the dome rising above billowing smoke and fire, became one of the defining images of the war. Winston Churchill reportedly gave specific instructions that the cathedral was to be saved at all costs, on the grounds that its survival was essential to morale.`,

        architecture: `The dome is the most technically sophisticated part of the building and contains a deception that is only apparent if you know to look for it. What you see from outside — the great lead-covered hemisphere rising 111 metres above street level — is not the dome you see from inside. Wren built three separate structures: an outer dome for visual impact on the skyline, an inner dome for the interior aesthetic, and between them a hidden brick cone that carries the weight of the lantern on top. The Whispering Gallery, just below the inner dome, is 30 metres in diameter and has an extraordinary acoustic property: a whisper spoken against the wall on one side can be heard clearly on the opposite side, 34 metres away, by anyone with their ear to the stone.`,

        funfacts: `Lord Nelson and the Duke of Wellington are both buried in the crypt of St Paul's, making it one of the more unusually stocked crypts in European history. The crypt also contains the tomb of Christopher Wren himself, whose epitaph reads: "Lector, si monumentum requiris, circumspice" — Reader, if you seek his monument, look around you. It is one of the great understated boasts in the history of architecture.`,
      },
      accessibilityNote: "The main cathedral floor is step-free. The Whispering Gallery (257 steps) and Stone Gallery (378 steps) are not accessible. The crypt is accessible via lift.",
      practicalInfo: {
        openingHours: "Mon–Sat 8:30am–4:30pm (last entry), closed Sundays except for worship",
        admissionFee: "Adults £23, free for children under 6",
        nearestTransport: "St Paul's (Central line), 1 min walk",
      },
    },
    {
      id: "trafalgar-square",
      order: 4,
      name: "Trafalgar Square",
      duration: "20–30 min",
      lat: 51.508,
      lng: -0.1281,
      tags: ["History", "Culture", "Walk"],
      summary: "The social and ceremonial heart of London, and a square full of things that are not quite what they appear.",
      narration: {
        history: `Trafalgar Square commemorates the Battle of Trafalgar, fought on 21 October 1805 off the coast of southern Spain, where the British fleet under Admiral Horatio Nelson defeated a combined Franco-Spanish fleet and secured British naval supremacy for the next century. Nelson was killed during the battle, shot by a French sniper from the mizzenmast of the Redoutable at around 1:25 in the afternoon. His last words, according to his flagcaptain Thomas Hardy, were "Thank God, I have done my duty." He is buried in the crypt of St Paul's, which you just visited.

The square itself was built between 1829 and 1845, designed by John Nash with later modifications by Charles Barry. Nelson's Column — 51.6 metres from ground to the top of Nelson's hat — was erected in 1843. The four bronze lions at its base were added in 1867, cast from cannon recovered from the wreck of the Royal George. The Fourth Plinth in the north-west corner, originally intended for an equestrian statue that was never funded, has since 1999 hosted a rotating series of contemporary art commissions, making it one of the most prominent public art spaces in the world.`,

        funfacts: `Trafalgar Square is, by royal proclamation, the official centre of London — the point from which all distances from London are measured. The actual marker is a small bronze plaque set into the pavement just south of the statue of Charles I at the top of Whitehall.

Nelson's Column is shorter than most people imagine. At 51.6 metres, it is roughly the same height as a 15-storey building. The statue of Nelson on top is 5.5 metres tall — about three times life size — which means that if you could somehow bring Nelson down and stand him on the pavement, he would be an unusually large man but not impossibly so. The lions, by contrast, are larger than actual lions.

The square's fountains were added in 1845 partly as a deliberate crowd-control measure. Large open spaces in 19th century London were associated with political gatherings, riots, and general disorder. Fountains took up space that would otherwise be occupied by people and made mass assembly harder. Urban design as politics.`,
      },
      accessibilityNote: "Fully step-free and open. The fountains and plinths are not raised — everything is at street level.",
      practicalInfo: {
        openingHours: "Always open",
        admissionFee: "Free",
        nearestTransport: "Charing Cross (Bakerloo & Northern lines), 3 min walk",
      },
    },
    {
      id: "hyde-park",
      order: 5,
      name: "Hyde Park & Kensington Gardens",
      duration: "60–90 min",
      lat: 51.5073,
      lng: -0.1657,
      tags: ["Nature", "Walk", "Relaxed"],
      summary: "A royal park that has been open to the public for 400 years — and a very different kind of London history.",
      narration: {
        history: `Hyde Park was seized from the monks of Westminster Abbey by Henry VIII in 1536, converted to a hunting ground, and remained a private royal hunting forest for a century. James I opened it to the public — a radical act, since most parkland was strictly private — and it became immediately popular. In 1642, during the English Civil War, it was sold by Parliament to pay war debts. At the Restoration in 1660, Charles II reclaimed it, had it landscaped, and opened it more formally.

By the 18th century Hyde Park was a fashionable place to see and be seen — duels were fought here, carriages raced along Rotten Row (a corruption of "Route du Roi," the King's Road), and the park became a venue for public spectacle on an enormous scale. The Great Exhibition of 1851, organized by Prince Albert and featuring the Crystal Palace, took place entirely within Hyde Park and attracted more than six million visitors over five months. When it closed, the Crystal Palace was dismantled and rebuilt in South London, where it burned down in 1936.

Speaker's Corner, at the north-east of the park near Marble Arch, has been a site of open-air public speaking since 1872. Anyone can turn up and say almost anything. Karl Marx spoke here. George Orwell did too. It remains one of the rare genuinely open public forums in a major city.`,

        fauna: `The park's ornamental lake, the Serpentine, created in 1730 at the command of Queen Caroline, is home to a large colony of mute swans, as well as herons, great crested grebes, tufted ducks, and coots. The parakeets — bright green ring-necked parakeets — are a more recent arrival and now number in the tens of thousands across London. Their origin is disputed: some say they escaped from the set of The African Queen during filming in 1951, others that they were released by Jimi Hendrix. Neither story is verifiable. What's certain is that they are now thoroughly established and make a startling sound from the treetops — tropical and entirely incongruous with the grey London sky above.

Red foxes are common in Hyde Park and across London generally, and are increasingly unbothered by humans. You are most likely to see them at dusk or dawn, though they are sometimes visible during the day resting in long grass.`,

        funfacts: `The Serpentine has been the site of a Christmas Day swim since 1864. The Peter Pan Cup is awarded annually to the winner, who must complete a 100-yard race at exactly 9am on 25 December. The water temperature in December is typically around 4–6°C. Membership of the Serpentine Swimming Club, which organises the event, requires you to swim in the Serpentine regardless of weather every Sunday from September to April.

Hyde Park and Kensington Gardens together cover 253 hectares — making them larger than the entire principality of Monaco.`,
      },
      accessibilityNote: "Fully accessible throughout. Paved paths and tarmacked roads cross the park in all directions. Hire bikes are available at multiple docking stations. Accessible toilets near the Serpentine Gallery and the Italian Gardens.",
      practicalInfo: {
        openingHours: "Daily 5am–midnight",
        admissionFee: "Free",
        nearestTransport: "Hyde Park Corner, Knightsbridge or Lancaster Gate (all Piccadilly or Central lines), all within 5 min walk",
      },
    },
  ],
};

export const LONDON_TOURS: Tour[] = [
  LONDON_CLASSIC,
  {
    id: "london-east-end",
    citySlug: "london",
    cityName: "London",
    title: "East End Stories",
    tagline: "Jack the Ripper, the Blitz, Brick Lane and the layers of immigrant London.",
    duration: "4–5 hours",
    distance: "4.1 km",
    stopCount: 6,
    tier: "free",
    categories: ["history", "culture", "lore"],
    coverColor: "#2a1a08",
    stops: [],
  },
  {
    id: "london-royal-parks",
    citySlug: "london",
    cityName: "London",
    title: "Royal Parks Circuit",
    tagline: "Green London — from St James's to Regent's Park, a walking tour through 500 years of royal landscaping.",
    duration: "3–4 hours",
    distance: "6.8 km",
    stopCount: 4,
    tier: "free",
    categories: ["history", "flora", "fauna"],
    coverColor: "#1a5c3a",
    stops: [],
  },
  {
    id: "london-custom",
    citySlug: "london",
    cityName: "London",
    title: "Build Your London Tour",
    tagline: "Choose your own attractions, depth and pace. Your London, your way.",
    duration: "You decide",
    distance: "You decide",
    stopCount: 0,
    tier: "pro",
    categories: [],
    coverColor: "#3a1a5c",
    stops: [],
  },
];

export const ALL_TOURS: Tour[] = [...LONDON_TOURS];

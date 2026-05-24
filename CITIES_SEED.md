# TourIt — 200 Cities Seed Plan

## Cost assumptions
| Item | Cost | Notes |
|---|---|---|
| Tavily research per stop | ~$0.005 | ~4 searches/stop, amortised across languages |
| Claude Haiku generation per stop | ~$0.010 | All 11 categories, prompt-cached |
| **Total per stop (English)** | **~$0.015** | |
| **Total per stop (6 languages)** | **~$0.065** | Research once, generate 6× |
| Audio (Kokoro) | $0 | Runs in user's browser |

---

## Pre-warm strategy
- **Tier 1 (~50 cities)** — Generate immediately before launch
- **Tier 2 (~100 cities)** — Generate in batches over first 3 months
- **Tier 3 (~50 cities)** — On-demand when first Pro user requests them (Option A + C)

---

## City list

| # | City | Country | Tier | Est. Stops | EN cost ($) | 6-lang cost ($) |
|---|---|---|---|---|---|---|
| **EUROPE** | | | | | | |
| 1 | Paris | France | 1 | 18 | 0.27 | 1.17 |
| 2 | London | UK | 1 | 20 | 0.30 | 1.30 |
| 3 | Rome | Italy | 1 | 18 | 0.27 | 1.17 |
| 4 | Barcelona | Spain | 1 | 16 | 0.24 | 1.04 |
| 5 | Amsterdam | Netherlands | 1 | 15 | 0.23 | 0.98 |
| 6 | Istanbul | Turkey | 1 | 18 | 0.27 | 1.17 |
| 7 | Prague | Czech Republic | 1 | 15 | 0.23 | 0.98 |
| 8 | Vienna | Austria | 1 | 16 | 0.24 | 1.04 |
| 9 | Athens | Greece | 1 | 15 | 0.23 | 0.98 |
| 10 | Lisbon | Portugal | 1 | 14 | 0.21 | 0.91 |
| 11 | Budapest | Hungary | 1 | 14 | 0.21 | 0.91 |
| 12 | Berlin | Germany | 1 | 16 | 0.24 | 1.04 |
| 13 | Madrid | Spain | 1 | 15 | 0.23 | 0.98 |
| 14 | Venice | Italy | 1 | 14 | 0.21 | 0.91 |
| 15 | Florence | Italy | 1 | 15 | 0.23 | 0.98 |
| 16 | Dublin | Ireland | 1 | 13 | 0.20 | 0.85 |
| 17 | Copenhagen | Denmark | 1 | 13 | 0.20 | 0.85 |
| 18 | Edinburgh | UK | 1 | 13 | 0.20 | 0.85 |
| 19 | Munich | Germany | 1 | 13 | 0.20 | 0.85 |
| 20 | Brussels | Belgium | 2 | 12 | 0.18 | 0.78 |
| 21 | Porto | Portugal | 2 | 12 | 0.18 | 0.78 |
| 22 | Stockholm | Sweden | 2 | 12 | 0.18 | 0.78 |
| 23 | Warsaw | Poland | 2 | 12 | 0.18 | 0.78 |
| 24 | Krakow | Poland | 2 | 12 | 0.18 | 0.78 |
| 25 | Dubrovnik | Croatia | 2 | 10 | 0.15 | 0.65 |
| 26 | Split | Croatia | 2 | 10 | 0.15 | 0.65 |
| 27 | Seville | Spain | 2 | 12 | 0.18 | 0.78 |
| 28 | Valencia | Spain | 2 | 11 | 0.17 | 0.72 |
| 29 | Málaga | Spain | 2 | 10 | 0.15 | 0.65 |
| 30 | Granada | Spain | 2 | 10 | 0.15 | 0.65 |
| 31 | Nice | France | 2 | 10 | 0.15 | 0.65 |
| 32 | Lyon | France | 2 | 10 | 0.15 | 0.65 |
| 33 | Marseille | France | 2 | 10 | 0.15 | 0.65 |
| 34 | Bordeaux | France | 2 | 10 | 0.15 | 0.65 |
| 35 | Zurich | Switzerland | 2 | 10 | 0.15 | 0.65 |
| 36 | Geneva | Switzerland | 2 | 10 | 0.15 | 0.65 |
| 37 | Hamburg | Germany | 2 | 11 | 0.17 | 0.72 |
| 38 | Frankfurt | Germany | 2 | 10 | 0.15 | 0.65 |
| 39 | Cologne | Germany | 2 | 11 | 0.17 | 0.72 |
| 40 | Bruges | Belgium | 2 | 9 | 0.14 | 0.59 |
| 41 | Milan | Italy | 2 | 12 | 0.18 | 0.78 |
| 42 | Naples | Italy | 2 | 12 | 0.18 | 0.78 |
| 43 | Bologna | Italy | 2 | 10 | 0.15 | 0.65 |
| 44 | Verona | Italy | 2 | 9 | 0.14 | 0.59 |
| 45 | Turin | Italy | 2 | 10 | 0.15 | 0.65 |
| 46 | Palermo | Italy | 2 | 10 | 0.15 | 0.65 |
| 47 | Reykjavik | Iceland | 2 | 10 | 0.15 | 0.65 |
| 48 | Oslo | Norway | 2 | 11 | 0.17 | 0.72 |
| 49 | Bergen | Norway | 2 | 9 | 0.14 | 0.59 |
| 50 | Helsinki | Finland | 2 | 11 | 0.17 | 0.72 |
| 51 | Tallinn | Estonia | 3 | 9 | 0.14 | 0.59 |
| 52 | Riga | Latvia | 3 | 9 | 0.14 | 0.59 |
| 53 | Vilnius | Lithuania | 3 | 9 | 0.14 | 0.59 |
| 54 | Salzburg | Austria | 3 | 9 | 0.14 | 0.59 |
| 55 | Bratislava | Slovakia | 3 | 8 | 0.12 | 0.52 |
| 56 | Ljubljana | Slovenia | 3 | 8 | 0.12 | 0.52 |
| 57 | Zagreb | Croatia | 3 | 9 | 0.14 | 0.59 |
| 58 | Sarajevo | Bosnia & Herz. | 3 | 9 | 0.14 | 0.59 |
| 59 | Belgrade | Serbia | 3 | 9 | 0.14 | 0.59 |
| 60 | Bucharest | Romania | 3 | 9 | 0.14 | 0.59 |
| 61 | Sofia | Bulgaria | 3 | 8 | 0.12 | 0.52 |
| 62 | Thessaloniki | Greece | 3 | 9 | 0.14 | 0.59 |
| 63 | Santorini | Greece | 3 | 8 | 0.12 | 0.52 |
| 64 | Rhodes | Greece | 3 | 8 | 0.12 | 0.52 |
| 65 | Valletta | Malta | 3 | 8 | 0.12 | 0.52 |
| **ASIA** | | | | | | |
| 66 | Bangkok | Thailand | 1 | 18 | 0.27 | 1.17 |
| 67 | Tokyo | Japan | 1 | 20 | 0.30 | 1.30 |
| 68 | Singapore | Singapore | 1 | 15 | 0.23 | 0.98 |
| 69 | Dubai | UAE | 1 | 15 | 0.23 | 0.98 |
| 70 | Kuala Lumpur | Malaysia | 1 | 14 | 0.21 | 0.91 |
| 71 | Hong Kong | China | 1 | 14 | 0.21 | 0.91 |
| 72 | Seoul | South Korea | 1 | 15 | 0.23 | 0.98 |
| 73 | Osaka | Japan | 1 | 14 | 0.21 | 0.91 |
| 74 | Taipei | Taiwan | 1 | 13 | 0.20 | 0.85 |
| 75 | Beijing | China | 1 | 16 | 0.24 | 1.04 |
| 76 | Shanghai | China | 1 | 14 | 0.21 | 0.91 |
| 77 | Bali (Denpasar) | Indonesia | 1 | 13 | 0.20 | 0.85 |
| 78 | Kyoto | Japan | 2 | 14 | 0.21 | 0.91 |
| 79 | Phuket | Thailand | 2 | 11 | 0.17 | 0.72 |
| 80 | Chiang Mai | Thailand | 2 | 11 | 0.17 | 0.72 |
| 81 | Antalya | Turkey | 2 | 11 | 0.17 | 0.72 |
| 82 | Ho Chi Minh City | Vietnam | 2 | 12 | 0.18 | 0.78 |
| 83 | Hanoi | Vietnam | 2 | 12 | 0.18 | 0.78 |
| 84 | Delhi | India | 2 | 14 | 0.21 | 0.91 |
| 85 | Mumbai | India | 2 | 13 | 0.18 | 0.78 |
| 86 | Siem Reap | Cambodia | 2 | 10 | 0.15 | 0.65 |
| 87 | Colombo | Sri Lanka | 2 | 10 | 0.15 | 0.65 |
| 88 | Kathmandu | Nepal | 2 | 11 | 0.17 | 0.72 |
| 89 | Macau | China | 2 | 10 | 0.15 | 0.65 |
| 90 | Doha | Qatar | 2 | 11 | 0.17 | 0.72 |
| 91 | Abu Dhabi | UAE | 2 | 11 | 0.17 | 0.72 |
| 92 | Jerusalem | Israel | 2 | 13 | 0.20 | 0.85 |
| 93 | Tel Aviv | Israel | 2 | 11 | 0.17 | 0.72 |
| 94 | Amman | Jordan | 2 | 11 | 0.17 | 0.72 |
| 95 | Hiroshima | Japan | 2 | 10 | 0.15 | 0.65 |
| 96 | Jaipur | India | 2 | 11 | 0.17 | 0.72 |
| 97 | Agra | India | 2 | 8 | 0.12 | 0.52 |
| 98 | Busan | South Korea | 2 | 10 | 0.15 | 0.65 |
| 99 | Hoi An | Vietnam | 2 | 9 | 0.14 | 0.59 |
| 100 | Phnom Penh | Cambodia | 2 | 10 | 0.15 | 0.65 |
| 101 | Chengdu | China | 2 | 11 | 0.17 | 0.72 |
| 102 | Xi'an | China | 2 | 10 | 0.15 | 0.65 |
| 103 | George Town | Malaysia | 2 | 10 | 0.15 | 0.65 |
| 104 | Luang Prabang | Laos | 2 | 9 | 0.14 | 0.59 |
| 105 | Muscat | Oman | 2 | 10 | 0.15 | 0.65 |
| 106 | Beirut | Lebanon | 2 | 10 | 0.15 | 0.65 |
| 107 | Varanasi | India | 2 | 9 | 0.14 | 0.59 |
| 108 | Goa | India | 2 | 9 | 0.14 | 0.59 |
| 109 | Kolkata | India | 2 | 11 | 0.17 | 0.72 |
| 110 | Yangon | Myanmar | 2 | 10 | 0.15 | 0.65 |
| 111 | Nara | Japan | 3 | 8 | 0.12 | 0.52 |
| 112 | Sapporo | Japan | 3 | 9 | 0.14 | 0.59 |
| 113 | Jeju | South Korea | 3 | 9 | 0.14 | 0.59 |
| 114 | Tbilisi | Georgia | 3 | 9 | 0.14 | 0.59 |
| 115 | Baku | Azerbaijan | 3 | 9 | 0.14 | 0.59 |
| 116 | Samarkand | Uzbekistan | 3 | 9 | 0.14 | 0.59 |
| 117 | Tashkent | Uzbekistan | 3 | 9 | 0.14 | 0.59 |
| 118 | Almaty | Kazakhstan | 3 | 9 | 0.14 | 0.59 |
| 119 | Lahore | Pakistan | 3 | 9 | 0.14 | 0.59 |
| 120 | Riyadh | Saudi Arabia | 3 | 9 | 0.14 | 0.59 |
| 121 | Pattaya | Thailand | 3 | 8 | 0.12 | 0.52 |
| 122 | Langkawi | Malaysia | 3 | 8 | 0.12 | 0.52 |
| 123 | Vientiane | Laos | 3 | 8 | 0.12 | 0.52 |
| 124 | Yerevan | Armenia | 3 | 8 | 0.12 | 0.52 |
| 125 | Bangalore | India | 3 | 10 | 0.15 | 0.65 |
| 126 | Chennai | India | 3 | 10 | 0.15 | 0.65 |
| 127 | Guangzhou | China | 3 | 10 | 0.15 | 0.65 |
| 128 | Shenzhen | China | 3 | 9 | 0.14 | 0.59 |
| 129 | Dhaka | Bangladesh | 3 | 8 | 0.12 | 0.52 |
| 130 | Karachi | Pakistan | 3 | 8 | 0.12 | 0.52 |
| **AMERICAS** | | | | | | |
| 131 | New York | USA | 1 | 20 | 0.30 | 1.30 |
| 132 | Los Angeles | USA | 1 | 16 | 0.24 | 1.04 |
| 133 | Mexico City | Mexico | 1 | 16 | 0.24 | 1.04 |
| 134 | Buenos Aires | Argentina | 1 | 15 | 0.23 | 0.98 |
| 135 | Rio de Janeiro | Brazil | 1 | 15 | 0.23 | 0.98 |
| 136 | São Paulo | Brazil | 1 | 14 | 0.21 | 0.91 |
| 137 | Toronto | Canada | 1 | 14 | 0.21 | 0.91 |
| 138 | Miami | USA | 1 | 13 | 0.20 | 0.85 |
| 139 | Las Vegas | USA | 1 | 12 | 0.18 | 0.78 |
| 140 | Cancún | Mexico | 1 | 10 | 0.15 | 0.65 |
| 141 | Chicago | USA | 2 | 14 | 0.21 | 0.91 |
| 142 | San Francisco | USA | 2 | 14 | 0.21 | 0.91 |
| 143 | Washington DC | USA | 2 | 14 | 0.21 | 0.91 |
| 144 | Boston | USA | 2 | 13 | 0.20 | 0.85 |
| 145 | Vancouver | Canada | 2 | 12 | 0.18 | 0.78 |
| 146 | Montreal | Canada | 2 | 12 | 0.18 | 0.78 |
| 147 | Lima | Peru | 2 | 12 | 0.18 | 0.78 |
| 148 | Bogotá | Colombia | 2 | 12 | 0.18 | 0.78 |
| 149 | Santiago | Chile | 2 | 12 | 0.18 | 0.78 |
| 150 | Cusco | Peru | 2 | 12 | 0.18 | 0.78 |
| 151 | Havana | Cuba | 2 | 12 | 0.18 | 0.78 |
| 152 | Cartagena | Colombia | 2 | 11 | 0.17 | 0.72 |
| 153 | Medellín | Colombia | 2 | 11 | 0.17 | 0.72 |
| 154 | Seattle | USA | 2 | 12 | 0.18 | 0.78 |
| 155 | New Orleans | USA | 2 | 12 | 0.18 | 0.78 |
| 156 | Philadelphia | USA | 2 | 12 | 0.18 | 0.78 |
| 157 | Atlanta | USA | 2 | 11 | 0.17 | 0.72 |
| 158 | Nashville | USA | 2 | 10 | 0.15 | 0.65 |
| 159 | Austin | USA | 2 | 10 | 0.15 | 0.65 |
| 160 | Quebec City | Canada | 2 | 10 | 0.15 | 0.65 |
| 161 | Quito | Ecuador | 2 | 10 | 0.15 | 0.65 |
| 162 | La Paz | Bolivia | 2 | 10 | 0.15 | 0.65 |
| 163 | Montevideo | Uruguay | 2 | 10 | 0.15 | 0.65 |
| 164 | Panama City | Panama | 2 | 10 | 0.15 | 0.65 |
| 165 | San Juan | Puerto Rico | 2 | 10 | 0.15 | 0.65 |
| 166 | Guadalajara | Mexico | 2 | 10 | 0.15 | 0.65 |
| 167 | Puerto Vallarta | Mexico | 2 | 9 | 0.14 | 0.59 |
| 168 | Oaxaca | Mexico | 2 | 9 | 0.14 | 0.59 |
| 169 | Denver | USA | 2 | 10 | 0.15 | 0.65 |
| 170 | Portland | USA | 2 | 10 | 0.15 | 0.65 |
| 171 | Salvador | Brazil | 2 | 10 | 0.15 | 0.65 |
| 172 | San José | Costa Rica | 3 | 9 | 0.14 | 0.59 |
| 173 | Nassau | Bahamas | 3 | 8 | 0.12 | 0.52 |
| 174 | Monterrey | Mexico | 3 | 9 | 0.14 | 0.59 |
| 175 | Orlando | USA | 3 | 9 | 0.14 | 0.59 |
| **AFRICA & MIDDLE EAST** | | | | | | |
| 176 | Cairo | Egypt | 1 | 15 | 0.23 | 0.98 |
| 177 | Marrakech | Morocco | 1 | 13 | 0.20 | 0.85 |
| 178 | Cape Town | South Africa | 1 | 14 | 0.21 | 0.91 |
| 179 | Luxor | Egypt | 2 | 10 | 0.15 | 0.65 |
| 180 | Nairobi | Kenya | 2 | 11 | 0.17 | 0.72 |
| 181 | Johannesburg | South Africa | 2 | 11 | 0.17 | 0.72 |
| 182 | Tunis | Tunisia | 2 | 11 | 0.17 | 0.72 |
| 183 | Casablanca | Morocco | 2 | 10 | 0.15 | 0.65 |
| 184 | Addis Ababa | Ethiopia | 2 | 9 | 0.14 | 0.59 |
| 185 | Zanzibar | Tanzania | 2 | 9 | 0.14 | 0.59 |
| 186 | Aswan | Egypt | 2 | 9 | 0.14 | 0.59 |
| 187 | Kigali | Rwanda | 3 | 8 | 0.12 | 0.52 |
| 188 | Lagos | Nigeria | 3 | 8 | 0.12 | 0.52 |
| 189 | Accra | Ghana | 3 | 8 | 0.12 | 0.52 |
| 190 | Dar es Salaam | Tanzania | 3 | 8 | 0.12 | 0.52 |
| **OCEANIA** | | | | | | |
| 191 | Sydney | Australia | 1 | 16 | 0.24 | 1.04 |
| 192 | Melbourne | Australia | 1 | 14 | 0.21 | 0.91 |
| 193 | Honolulu | USA | 1 | 12 | 0.18 | 0.78 |
| 194 | Brisbane | Australia | 2 | 12 | 0.18 | 0.78 |
| 195 | Auckland | New Zealand | 2 | 12 | 0.18 | 0.78 |
| 196 | Perth | Australia | 2 | 11 | 0.17 | 0.72 |
| 197 | Queenstown | New Zealand | 2 | 10 | 0.15 | 0.65 |
| 198 | Christchurch | New Zealand | 2 | 10 | 0.15 | 0.65 |
| 199 | Gold Coast | Australia | 2 | 10 | 0.15 | 0.65 |
| 200 | Adelaide | Australia | 2 | 10 | 0.15 | 0.65 |

---

## Summary

| Tier | Cities | Avg stops | Total stops | EN cost | 6-lang cost |
|---|---|---|---|---|---|
| Tier 1 — pre-warm at launch | 47 | 15.0 | 705 | $10.58 | $45.83 |
| Tier 2 — pre-warm in batches | 107 | 10.7 | 1,145 | $17.18 | $74.43 |
| Tier 3 — on-demand | 46 | 8.7 | 400 | $6.00 | $26.00 |
| **Total** | **200** | **11.3** | **2,250** | **$33.75** | **$146.25** |

---

## Key takeaways

- **Entire 200-city library in English: ~$34** — one-time, never again
- **Entire library in 6 languages: ~$146** — still one-time
- **Single on-demand city (Tier 3, 8 stops):** ~$0.12 — negligible against €5.99 trip pass
- **Single on-demand city (Tier 1, 15 stops):** ~$0.23 — 3.8% of trip pass revenue
- **Audio cost: $0** — Kokoro runs in user's browser

## Phase roll-out cost plan

| Phase | Action | Cost |
|---|---|---|
| Launch | Seed Tier 1 (47 cities, EN) | ~$10.58 |
| Month 1–3 | Seed Tier 2 (107 cities, EN) | ~$17.18 |
| Month 3–6 | Add ES + FR to Tier 1+2 | ~$50 |
| Month 6–12 | Add remaining 4 languages | ~$80 |
| Ongoing | On-demand Tier 3 (per request) | ~$0.10–0.25/city |
| **12-month total** | | **~$158** |

At €5.99/trip pass, you recover the entire 12-month content cost after **27 trip pass sales**.

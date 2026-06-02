"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/db/supabase";
import { setCookieTier } from "@/lib/hooks/useTier";

const ALL_INTERESTS = [
  { id: "history",      label: "History"          },
  { id: "architecture", label: "Architecture"      },
  { id: "culture",      label: "Art & Culture"     },
  { id: "food",         label: "Food & Gastronomy" },
  { id: "fauna",        label: "Wildlife"          },
  { id: "flora",        label: "Nature & Flora"    },
  { id: "geo",          label: "Geography"         },
  { id: "lore",         label: "Legends & Lore"    },
  { id: "funfacts",     label: "Fun Facts"         },
  { id: "photography",  label: "Photography"       },
];

type UserProfile = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  tier: "free" | "pro";
  home_city: string;
  interests: string[];
};

export default function ProfileClient({ user }: { user: UserProfile }) {
  const [name,      setName]      = useState(user.name);
  const [homeCity,  setHomeCity]  = useState(user.home_city);
  const [interests, setInterests] = useState<string[]>(user.interests);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");

  // Keep tier cookie in sync with DB tier
  useEffect(() => {
    setCookieTier(user.tier);
  }, [user.tier]);

  function toggleInterest(id: string) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    setSaved(false);
  }

  async function saveProfile() {
    setSaving(true);
    setSaveError("");
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("users")
      .update({ name, home_city: homeCity, interests })
      .eq("id", user.id);
    setSaving(false);
    if (error) setSaveError(error.message);
    else setSaved(true);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

      {/* Display name + home city */}
      <section className="rounded-2xl border border-white/10 p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">Profile</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Display name</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false); }}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 transition-colors text-sm"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Home city</label>
            <input
              value={homeCity}
              onChange={(e) => { setHomeCity(e.target.value); setSaved(false); }}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 transition-colors text-sm"
              placeholder="e.g. Málaga"
            />
          </div>
        </div>
      </section>

      {/* Interests */}
      <section className="rounded-2xl border border-white/10 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-1">Interests</h2>
        <p className="text-xs text-white/30 mb-4">We&apos;ll highlight tours and stops that match what you love.</p>
        <div className="flex flex-wrap gap-2">
          {ALL_INTERESTS.map((interest) => {
            const active = interests.includes(interest.id);
            return (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  active
                    ? "bg-white text-black font-semibold"
                    : "bg-white/10 text-white/50 hover:bg-white/20"
                }`}
              >
                {interest.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={saveProfile}
          disabled={saving}
          className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-white/90 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-green-400 text-sm">Saved ✓</span>}
        {saveError && <span className="text-red-400 text-sm">{saveError}</span>}
      </div>
    </div>
  );
}

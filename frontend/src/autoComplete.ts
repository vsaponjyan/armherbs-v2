// src/autoComplete.ts

import { SYNONYMS } from "./searchConfig";

interface Herb {
  name: string;
  alternativeNames: string[];
  symptoms: string[];
}

export class AutoComplete {
  private herbs: Herb[] = [];

  private flatSymptoms: string[] = [];

  private readonly fallbackSymptoms: string[] = [
    "գլխացավ", "միգրեն", "գլխապտույտ",
    "ստամոքսի ցավ", "գաստրիտ", "մարսողություն", "փորացավ",
    "փորկապություն", "լուծ", "դիարեա",
    "հազ", "բրոնխիտ", "ասթմա",
    "մրսածություն", "հարբուխ", "ջերմություն", "գրիպ",
    "անքնություն", "սթրես", "նյարդայնություն", "դեպրեսիա",
    "սրտխառնոց", "արյունաճնշում", "հիպերտոնիա",
    "ռևմատիզմ", "հոդերի ցավ", "արթրիտ", "մեջքի ցավ",
    "կոկորդի ցավ", "հնձք", "քթահեղձություն",
    "ատամնացավ", "լնդերի բորբոքում",
    "լյարդ", "երիկամ", "ցիստիտ",
    "էկզեմա", "դերմատիտ", "վերք", "այրվածք",
    "հայտաբերում", "դաշտան", "կլիմակս",
    "անեմիա", "արյունահոսություն", "վարիկոզ",
    "հոգնածություն", "քաշի կորուստ", "շաքարախտ",
  ];

  setHerbs(herbs: Herb[]) {
    this.herbs = herbs;

    const symptomSet = new Set<string>();

    for (const herb of herbs) {
      for (const symptom of herb.symptoms) {
        symptomSet.add(symptom.trim());
      }
    }

    for (const key of Object.keys(SYNONYMS)) {
      symptomSet.add(key.trim());
    }

    for (const s of this.fallbackSymptoms) {
      symptomSet.add(s.trim());
    }

    this.flatSymptoms = Array.from(symptomSet).sort((a, b) =>
      a.localeCompare(b, "hy")
    );

    console.log(`✅ AutoComplete: ${this.flatSymptoms.length} unique symptoms indexed`);
  }

  getSuggestions(input: string, maxResults = 5): string[] {
    if (input.length < 2) return [];

    const inputLower = input.toLowerCase();
    const seen       = new Set<string>();
    const results: string[] = [];

    const addIfNew = (term: string): boolean => {
      const t = term.trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        results.push(t);
        return true;
      }
      return false;
    };

    // ── Priority 1 — Herb name / altName startsWith ────────────────────
    for (const herb of this.herbs) {
      if (results.length >= maxResults) break;
      if (herb.name.toLowerCase().startsWith(inputLower)) {
        addIfNew(herb.name);
      }
      if (results.length >= maxResults) break;
      for (const alt of herb.alternativeNames) {
        if (results.length >= maxResults) break;
        if (alt.toLowerCase().startsWith(inputLower)) {
          addIfNew(alt);
        }
      }
    }

    // ── Priority 2 — flatSymptoms startsWith ───────────────────────────
    if (results.length < maxResults) {
      for (const symptom of this.flatSymptoms) {
        if (results.length >= maxResults) break;
        if (symptom.toLowerCase().startsWith(inputLower)) {
          addIfNew(symptom);
        }
      }
    }

    // ── Priority 3 — Herb name / altName includes ─────────────────────
    if (results.length < maxResults) {
      for (const herb of this.herbs) {
        if (results.length >= maxResults) break;
        if (herb.name.toLowerCase().includes(inputLower)) {
          addIfNew(herb.name);
        }
        if (results.length >= maxResults) break;
        for (const alt of herb.alternativeNames) {
          if (results.length >= maxResults) break;
          if (alt.toLowerCase().includes(inputLower)) {
            addIfNew(alt);
          }
        }
      }
    }

    // ── Priority 4 — flatSymptoms includes ────────────────────────────
    if (results.length < maxResults) {
      for (const symptom of this.flatSymptoms) {
        if (results.length >= maxResults) break;
        if (symptom.toLowerCase().includes(inputLower)) {
          addIfNew(symptom);
        }
      }
    }

    return results;
  }
}

export const autoComplete = new AutoComplete();
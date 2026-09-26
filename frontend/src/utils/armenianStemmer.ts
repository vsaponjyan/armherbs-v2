import { ARMENIAN_CASES } from "../searchConfig";   // ⚠️ փոփոխված՝ ARMENIAN_SUFFIXES → ARMENIAN_CASES

/**
 * Հեռացնում է հայերենի հոլովական վերջավորությունը (genitive/dative/ablative/
 * instrumental...)՝ ARMENIAN_CASES-ի ամենաերկար match-ով։ Օգտագործվում է
 * searchEngine, herbEntityResolver և intentDetector-ի կողմից՝ միասնական
 * stemming behavior-ի համար։
 */
export function stripArmenianSuffix(word: string): string {
  const lowerWord = word.toLowerCase();
  if (lowerWord.length <= 3) return lowerWord;

  for (const caseEnding of ARMENIAN_CASES) {
    if (lowerWord.endsWith(caseEnding) && lowerWord.length - caseEnding.length >= 3) {
      return lowerWord.slice(0, -caseEnding.length);
    }
  }
  return lowerWord;
}
class QueryExpander:
    def __init__(self, index: dict):
    
        self.cooccurrence  = index.get("symptom_cooccurrence", {})
        self.keywords      = index.get("symptom_keywords", {})
        self.herb_names    = index.get("herb_name_index", {})
        self.herb_vocab    = index.get("herb_vocabulary", {})

    def _ngrams(self, words: list) -> list:
        """Generate unigrams, bigrams and trigrams from a word list."""
        result = list(words)
        for n in (2, 3):
            for i in range(len(words) - n + 1):
                result.append(" ".join(words[i:i + n]))
        return result

    def expand(self, query: str) -> str:
        """It makes the question richer by using our index:"""
        if not self.cooccurrence:
            return query

        q = query.strip().lower()
        q_words = q.split()
        phrases = self._ngrams(q_words)
        parts = [query]
        added = set(q_words)

        for phrase in phrases:
            canonical = self.herb_names.get(phrase)
            if canonical:
                vocab = self.herb_vocab.get(canonical.lower(), [])
                for term in vocab:
                    if term not in added:
                        parts.append(term)
                        added.add(term)
                        if len(parts) >= 15: break
                break

        for phrase in phrases:
            related = self.cooccurrence.get(phrase, [])
            for term in related:
                if term not in added:
                    parts.append(term)
                    added.add(term)
                    if len(parts) >= 18: break

        for phrase in phrases:
            keywords = self.keywords.get(phrase, [])
            for kw in keywords:
                if kw not in added:
                    parts.append(kw)
                    added.add(kw)
                    if len(parts) >= 22: break

        return " ".join(parts[:22])




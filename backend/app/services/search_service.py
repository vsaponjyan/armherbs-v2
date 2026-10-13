_ARMENIAN_CASES = [
    'ություններին', 'ություններից', 'ություններով',
    'ությունների', 'ությունները',
    'ություններ',
    'ությունից',
    'ությանը', 'ությամբ', 'ությանն', 'ություն',
    'ներում',
    'ներին', 'ներից', 'ներով',
    'ությ', 'ների', 'ական', 'ային',
    'ներ', 'յան', 'ում', 'յալ', 'ված',
    'յա', 'ան', 'ին', 'ով', 'ից', 'ող', 'ոց', 'ու',
    'ը', 'ն', 'ի', 'ա',
]


def _stem(word: str) -> str:
    """Strip the longest matching Armenian case ending from a word."""
    w = word.lower()
    if len(w) <= 3:
        return w
    for suffix in _ARMENIAN_CASES:
        if w.endswith(suffix) and len(w) - len(suffix) >= 3:
            return w[:-len(suffix)]
    return w


def _stem_set(phrase: str) -> frozenset:
    """Return the set of stemmed, non-trivial words from a phrase."""
    return frozenset(_stem(w) for w in phrase.lower().split() if len(w) > 1)


class QueryExpander:
    def __init__(self, index: dict):
        self.cooccurrence = index.get("symptom_cooccurrence", {})
        self.keywords     = index.get("symptom_keywords", {})
        self.herb_names   = index.get("herb_name_index", {})
        self.herb_vocab   = index.get("herb_vocabulary", {})
        
        self._norm_cooccurrence = {
            _stem_set(k): v for k, v in self.cooccurrence.items() if k.strip()
        }
        self._norm_keywords = {
            _stem_set(k): v for k, v in self.keywords.items() if k.strip()
        }
        self._norm_herb_names = {
            _stem_set(k): v for k, v in self.herb_names.items() if k.strip()
        }

    def expand(self, query: str) -> str:
        """Enrich the query using the symptom index.

        For each index key, checks whether ALL of the key's stemmed words
        are present in the query's stemmed word set. This handles word order
        variation, intervening words, and Armenian morphological inflection.
        Compound-word decomposition is intentionally left to the embedding model.
        """
        if not self.cooccurrence:
            return query

        q = query.strip().lower()
        q_words = q.split()
        q_stemmed = frozenset(_stem(w) for w in q_words if len(w) > 1)

        parts = [query]
        added = set(q_words)

        for key_set, canonical in self._norm_herb_names.items():
            if key_set and key_set.issubset(q_stemmed):
                vocab = self.herb_vocab.get(canonical.lower(), [])
                for term in vocab:
                    if term not in added:
                        parts.append(term)
                        added.add(term)
                        if len(parts) >= 15:
                            break
                break

        for key_set, related in self._norm_cooccurrence.items():
            if key_set and key_set.issubset(q_stemmed):
                for term in related:
                    if term not in added:
                        parts.append(term)
                        added.add(term)
                        if len(parts) >= 18:
                            break

        for key_set, kws in self._norm_keywords.items():
            if key_set and key_set.issubset(q_stemmed):
                for kw in kws:
                    if kw not in added:
                        parts.append(kw)
                        added.add(kw)
                        if len(parts) >= 22:
                            break

        return " ".join(parts[:22])

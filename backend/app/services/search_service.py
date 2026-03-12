# beckend/app/services/search_service.py
class QueryExpander:
    def __init__(self, index: dict):
    
        self.cooccurrence  = index.get("symptom_cooccurrence", {})
        self.keywords      = index.get("symptom_keywords", {})
        self.herb_names    = index.get("herb_name_index", {})
        self.herb_vocab    = index.get("herb_vocabulary", {})

    def expand(self, query: str) -> str:
        """It makes the question richer by using our index:"""
        if not self.cooccurrence:
            return query
            
        q = query.strip().lower()
        q_words = q.split()
        parts = [query]
        added = set(q_words)

        # Looking for names of medicinal herbs
        for word in q_words:
            canonical = self.herb_names.get(word)
            if canonical:
                vocab = self.herb_vocab.get(canonical.lower(), [])
                for term in vocab:
                    if term not in added:
                        parts.append(term)
                        added.add(term)
                        if len(parts) >= 15: break
                break

        # We add related symptoms
        for word in q_words:
            related = self.cooccurrence.get(word, [])
            for term in related:
                if term not in added:
                    parts.append(term)
                    added.add(term)
                    if len(parts) >= 18: break

        # Adding therapeutic keywords
        for word in q_words:
            keywords = self.keywords.get(word, [])
            for kw in keywords:
                if kw not in added:
                    parts.append(kw)
                    added.add(kw)
                    if len(parts) >= 22: break

        return " ".join(parts[:22])
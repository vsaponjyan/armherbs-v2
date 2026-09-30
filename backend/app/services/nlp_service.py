import stanza

class ArmenianNLP:
    def __init__(self):
        self.nlp = stanza.Pipeline(
            'hy',
            processors='tokenize,pos,lemma',
            pos_batch_size=1000,
            download_method=None,
            verbose=False
        )

    def clean_text(self, text: str) -> str:
        text = text.strip()
        doc = self.nlp(text)
        clean_parts = []

        
        useless_types = {'ADP', 'CCONJ', 'SCONJ', 'AUX', 'PART', 'PRON', 'DET'}

        for sentence in doc.sentences:
            for word in sentence.words:
                lemma = word.lemma.lower()
                if word.upos not in useless_types and len(lemma) > 1:    
                    clean_parts.append(word.text.lower())
                    if lemma != word.text.lower():
                        clean_parts.append(lemma)

        return " ".join(clean_parts)
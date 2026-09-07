import stanza
from app.config import ARMENIAN_STOPWORDS

stanza.download('hy', verbose=False)

class ArmenianNLP:
    def __init__(self):
        self.nlp = stanza.Pipeline(
            'hy',
            processors='tokenize,pos,lemma',
            pos_batch_size=1000,
            verbose=False
        )

    def clean_text(self, text: str) -> str:
        text = text.strip()
        doc = self.nlp(text)
        clean_parts = []

        useless_types = {'ADP', 'CCONJ', 'SCONJ', 'AUX', 'PART'}

        for sentence in doc.sentences:
            for word in sentence.words:
                lemma = word.lemma.lower()
                if word.upos not in useless_types and lemma not in ARMENIAN_STOPWORDS:
                    clean_parts.append(word.text.lower())
                    if lemma != word.text.lower():
                        clean_parts.append(lemma)

        return " ".join(clean_parts)
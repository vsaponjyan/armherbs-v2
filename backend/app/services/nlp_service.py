# beckend/app/services/nlp_service.py
import stanza
from app.config import ARMENIAN_STOPWORDS

class ArmenianNLP:
    def __init__(self):
        # Ավելացնում ենք 'pos', որպեսզի ռոբոտը հասկանա բառի տեսակը
        stanza.download('hy')
        self.nlp = stanza.Pipeline('hy', processors='tokenize,pos,lemma', pos_batch_size=1000)
    
    # app/services/nlp_service.py
    def clean_text(self, text: str) -> str:
        text = text.strip()
        doc = self.nlp(text)
        clean_parts = []
        
        useless_types = {'ADP', 'CCONJ', 'SCONJ', 'AUX', 'PART'} # Հանեցինք PRON-ը և DET-ը

        for sentence in doc.sentences:
            for word in sentence.words:
                lemma = word.lemma.lower()
                # Եթե բառը կարևոր է, պահում ենք և՛ արմատը, և՛ հոլովված ձևը
                if word.upos not in useless_types and lemma not in ARMENIAN_STOPWORDS:
                    clean_parts.append(word.text.lower()) # Պահում ենք օրիգինալը (օր. դաշտանի)
                    if lemma != word.text.lower():
                        clean_parts.append(lemma) # Ավելացնում ենք նաև արմատը (օր. դաշտան)
        
        return " ".join(clean_parts)
    # def clean_text(self, text: str) -> str:
    #     doc = self.nlp(text)
    #     clean_words = []
        
    #     # Այս տեսակները մենք չենք ուզում պահել (դատարկ բառեր են)
    #     # ADP - նախդիրներ, CCONJ/SCONJ - շաղկապներ, DET - դերանուններ, AUX - օժանդակ բայեր (է, են)
    #     useless_types = {'ADP', 'CCONJ', 'SCONJ', 'DET', 'AUX', 'PART', 'PRON'}

    #     for sentence in doc.sentences:
    #         for word in sentence.words:
    #             lemma = word.lemma.lower()
    #             # Ռոբոտի "պիտակը" (տեսակը)
    #             word_type = word.upos 

    #             # 1. Ստուգում ենք՝ արդյոք բառի տեսակը "դատարկ" չէ
    #             # 2. Ստուգում ենք՝ արդյոք այն մեր ցուցակում (Stopwords) չկա
    #             # 3. Ստուգում ենք՝ որ բառը 1 տառից ավելի լինի
    #             if word_type not in useless_types and lemma not in ARMENIAN_STOPWORDS and len(lemma) > 1:
    #                 clean_words.append(lemma)
        
    #     return " ".join(clean_words)
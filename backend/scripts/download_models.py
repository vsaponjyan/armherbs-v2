"""
Մեկ-անգամյա setup script. Գործարկեք սա ՄԻԱՅՆ մեկ անգամ, deployment-ից/
local-setup-ից հետո, մինչև server-ը առաջին անգամ գործարկելը:

    ./venv/bin/python scripts/download_models.py

Սա ներբեռնում է Armenian stanza model-ը local cache-ի մեջ
(~/stanza_resources), որպեսզի server-ի startup-ը այլևս երբեք
network-ի կարիք չունենա:
"""
import stanza

if __name__ == "__main__":
    print("⏳ Ներբեռնվում է Armenian (hy) stanza model...")
    stanza.download('hy', verbose=True)
    print("✅ Պատրաստ է: model-ը պահված է local cache-ում:")
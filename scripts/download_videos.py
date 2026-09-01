import os
import subprocess

videos = [
    ("fevicol-bus.mp4", "jTav-vdht0E"),
    ("cadbury-silk.mp4", "hM6ojkIo-nE"),
    ("vico-turmeric.mp4", "QFoMcZI9vRg"),
    ("5star-patloon.mp4", "lesO4lVGT9A"),
    ("happydent-palace.mp4", "6zH6N4LxF1w"),
    ("airtel-jo-mera-hai.mp4", "qQK6iPleBIE"),
    ("nirma-washing-powder.mp4", "wpj2qkaE7YQ"),
    ("cadbury-cricket.mp4", "e7JATezA1nY"),
    ("kitkat.mp4", "xTpv9lc_qMw"),
    ("fevicol-sofa.mp4", "SL8zUMiuBks"),
    ("nirma-husn-pari.mp4", "f17YDux_zh0"),
    ("5star-sequel.mp4", "Ag68swbxQvc"),
    ("kitkat-squirrel.mp4", "lY--9d3Dons"),
    ("airtel-friend.mp4", "qCOKJG59dm8"),
    ("navratna.mp4", "12WAiv-5gww"),
    ("melody.mp4", "BKse4N_-ZuU"),
    ("centerfresh-tvc.mp4", "mIP_IjM5-0U"),
    ("ipl.mp4", "B_JGLe4WgfQ"),
    ("kingfisher.mp4", "2d3aYiIiWZY"),
    ("centerfresh-laplapayee.mp4", "fvWBDWaX-Xg"),
    ("amul.mp4", "2CcgWWtUUAI"),
    ("gems-museum.mp4", "XUdA3Z9y6ps"),
    ("imperial-blue.mp4", "D0I0PT7vmOk"),
    ("redbull.mp4", "K31dg86OmuM"),
    ("mentos.mp4", "1TrHjwCWHN0"),
]

os.makedirs("public/videos", exist_ok=True)
yt_dlp_path = "/Users/kritikaagrawal/Library/Python/3.9/bin/yt-dlp"

for filename, yt_id in videos:
    target_path = f"public/videos/{filename}"
    if os.path.exists(target_path):
        print(f"Skipping {filename}, already exists.")
        continue
    url = f"https://www.youtube.com/watch?v={yt_id}"
    print(f"Downloading {filename} from {url}...")
    cmd = [
        yt_dlp_path,
        "--extractor-args", "youtube:player_client=android,web",
        "-f", "b[ext=mp4]/best[ext=mp4]/best",
        "-o", target_path,
        url
    ]
    try:
        subprocess.run(cmd, check=True)
        print(f"Successfully downloaded {filename}")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")

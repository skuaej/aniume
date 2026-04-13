import re
import random
import string
import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from config import Config

# Initialize MongoDB
client = AsyncIOMotorClient(Config.DATABASE_URI)
db = client[Config.DATABASE_NAME]
anime_collection = db["animes"]
state_collection = db["states"]
settings_collection = db["settings"]

import logging
logger = logging.getLogger(__name__)

def sanitize_name(name):
    return name.replace("[", "").replace("]", "").replace("_", " ").strip()

def process_metadata(message):
    if not message: return None # Fix for NoneType crash
    
    media = message.video or message.document
    if not media:
        return None
        
    mime_type = getattr(media, "mime_type", "")
    if not mime_type and message.video: mime_type = "video/mp4" 
    if not mime_type.startswith("video/") and not mime_type == "":
        return None

    caption = message.caption or ""
    file_name = getattr(media, "file_name", "")
    full_text = f"{caption} {file_name}".strip()
    full_text = re.sub(r"@\w+", "", full_text).strip()

    ep_match = re.search(r"E(\d+)|Episode\s*(\d+)|Ep\s*(\d+)", full_text, re.IGNORECASE)
    ep_number = 1
    if ep_match:
        val = ep_match.group(1) or ep_match.group(2) or ep_match.group(3)
        ep_number = int(val)

    title_part = re.split(r"S\d+E\d+|S\d+|Season\s*\d+|Episode\s*\d+|Ep\s*\d+|1080p|720p|480p|HEVC|x265|WEBRip|Bluray|\.mkv|\.mp4|\.avi", full_text, flags=re.IGNORECASE)[0]
    anime_title = re.sub(r"[\[\]\-\(\)]", " ", title_part)
    anime_title = re.sub(r"\s+", " ", anime_title).strip() or "Uncategorized"
    
    return {
        "animeTitle": anime_title,
        "epNumber": ep_number,
        "fileName": file_name,
        "file_id": media.file_id
    }

async def index_media(source_msg_id, target_msg_id, target_chat_id, metadata):
    anime_title = metadata["animeTitle"]
    ep_number = metadata["epNumber"]
    file_name = metadata["fileName"]
    file_id = metadata["file_id"]

    slug_base = re.sub(r"[^\w-]+", "", anime_title.lower().replace(" ", "-"))
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=7))

    query = {"title": {"$regex": f"^{re.escape(anime_title)}$", "$options": "i"}}
    anime = await anime_collection.find_one(query)
    
    if not anime:
        try:
            anime = {
                "title": anime_title,
                "slug": f"{slug_base}-{random_str}",
                "description": f"Best quality anime series: {anime_title}.",
                "episodes": [],
                "created_at": datetime.datetime.now(),
                "updated_at": datetime.datetime.now()
            }
            await anime_collection.insert_one(anime)
            anime = await anime_collection.find_one(query)
            logger.info(f"Created new anime entry: {anime_title}")
        except Exception as e:
            logger.error(f"MongoDB Insert Error for {anime_title}: {e}")
            return "Error"

    already_indexed = any(str(e.get("source_message_id")) == str(source_msg_id) for e in anime.get("episodes", []))
    if already_indexed:
        return "Duplicate"

    # CRITICAL FIX: Add ObjectId to the episode sub-document for Website Compatibility
    ep_data = {
        "_id": ObjectId(),
        "episode_number": ep_number,
        "title": sanitize_name(file_name or f"{anime_title} Episode {ep_number}"),
        "file_id": file_id,
        "source_message_id": source_msg_id,
        "message_id": target_msg_id,
        "chat_id": Config.TARGET_CHANNEL
    }

    existing_eps = anime.get("episodes", [])
    found = False
    for i, e in enumerate(existing_eps):
        if e.get("episode_number") == ep_number:
            existing_eps[i] = ep_data
            found = True
            break
    
    if not found:
        existing_eps.append(ep_data)

    try:
        await anime_collection.update_one(
            {"_id": anime["_id"]},
            {"$set": {"episodes": existing_eps, "updated_at": datetime.datetime.now()}}
        )
        logger.info(f"Successfully indexed episode {ep_number} for {anime_title}")
    except Exception as e:
        logger.error(f"MongoDB Update Error for {anime_title}: {e}")
        return "Error"
    
    await state_collection.update_one({"key": "last_processed_id"}, {"$set": {"value": source_msg_id}}, upsert=True)
    
    return "Success"

async def get_stats():
    total_anime = await anime_collection.count_documents({})
    pipeline = [{"$project": {"count": {"$size": "$episodes"}}}, {"$group": {"_id": None, "total": {"$sum": "$count"}}}]
    cursor = anime_collection.aggregate(pipeline)
    total_episodes = 0
    async for doc in cursor:
        total_episodes = doc["total"]
    
    last_id = await state_collection.find_one({"key": "last_processed_id"})
    return {
        "total_anime": total_anime,
        "total_episodes": total_episodes,
        "last_id": last_id["value"] if last_id else 0
    }

async def get_setting(key, default):
    res = await settings_collection.find_one({"key": key})
    return res["value"] if res else default

async def set_setting(key, value):
    await settings_collection.update_one({"key": key}, {"$set": {"value": value}}, upsert=True)

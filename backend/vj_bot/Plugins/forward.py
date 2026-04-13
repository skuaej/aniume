import logging
import asyncio
from pyrogram import filters
from bot import channelforward
from config import Config 
from Plugins.database import process_metadata, index_media, get_setting

logger = logging.getLogger(__name__)

@channelforward.on_message((filters.chat() | filters.private) & (filters.video | filters.document))
async def forward_and_index(client, message):
    try:
        # 0. Dynamic Source Check
        source = await get_setting("SOURCE_CHANNEL", Config.SOURCE_CHANNEL)
        # If not from source channel, ignore
        if str(message.chat.id) != str(source) and str(message.chat.username) != str(source):
            return

        # 1. Forward to Target
        target = await get_setting("TARGET_CHANNEL", Config.TARGET_CHANNEL)
        func = message.copy if Config.AS_COPY else message.forward
        target_msg = await func(target)
        
        # 2. Extract Metadata
        metadata = process_metadata(message)
        if metadata:
            # 3. Index in MongoDB
            status = await index_media(message.id, target_msg.id, target, metadata)
            logger.info(f"Forwarded & Indexed: {metadata['animeTitle']} - {status}")
        else:
            logger.info(f"Forwarded non-video message {message.id}")
            
        await asyncio.sleep(1.5) # Flood protection
    except Exception as e:
        logger.error(f"Forward Error: {e}")

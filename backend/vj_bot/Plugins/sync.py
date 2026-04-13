import asyncio
import logging
from pyrogram import filters
from pyrogram.errors import FloodWait, RPCError
from bot import channelforward
from config import Config
from Plugins.database import process_metadata, index_media, anime_collection, state_collection, get_stats, get_setting

logger = logging.getLogger(__name__)

# Track active sync
SYNC_ACTIVE = False

async def process_by_id(client, message_id):
    """Blndly copy a message and read its metadata from the copy (for Bots)"""
    try:
        # Check if already indexed first (Speed optimization)
        exists = await anime_collection.find_one({"episodes.source_message_id": message_id})
        if exists: return "Duplicate"

        source = await get_setting("SOURCE_CHANNEL", Config.SOURCE_CHANNEL)
        target = await get_setting("TARGET_CHANNEL", Config.TARGET_CHANNEL)

        try:
            target_msg = await client.copy_message(
                chat_id=target,
                from_chat_id=source,
                message_id=message_id
            )
        except FloodWait as e:
            # TECH VJ STYLE: Automatic FloodWait Handling
            logger.warning(f"FloodWait detected: Waiting {e.value} seconds...")
            await asyncio.sleep(e.value + 1)
            # Retry once
            target_msg = await client.copy_message(
                chat_id=target,
                from_chat_id=source,
                message_id=message_id
            )

        if not target_msg:
            return "Empty"

        await asyncio.sleep(0.5) 
        metadata = process_metadata(target_msg)
        if metadata:
            return await index_media(message_id, target_msg.id, target, metadata)
        return "Not Video"
    except RPCError as e:
        msg = str(e).lower()
        if "message_id_invalid" in msg or "not found" in msg:
            return "Empty"
        raise e

async def run_sync_loop(client, message, start_id):
    global SYNC_ACTIVE
    SYNC_ACTIVE = True
    current_id = start_id
    success = 0
    empty_count = 0
    
    status_msg = await message.reply(f"🚀 **Starting VJ Sync from ID {start_id}...**")
    
    try:
        while SYNC_ACTIVE and empty_count < 200:
            try:
                res = await process_by_id(client, current_id)
                
                if res == "Success":
                    success += 1
                    empty_count = 0
                elif res == "Duplicate":
                    empty_count = 0
                elif res == "Empty":
                    empty_count += 1
                
                # Update UI every 50 hops or every 10 successes
                if (current_id % 50 == 0) or (success > 0 and success % 10 == 0):
                    await status_msg.edit(f"⚡ **VJ Sync Ongoing**\n\n🔍 Scanning ID: `{current_id}`\n✅ New Episodes: {success}\n⏭ Gap Count: {empty_count}/200\n\nUse /stop to halt.")
                
                current_id += 1
                # Variable sleep: fast for skipped, slow for heavy copies
                await asyncio.sleep(1.2 if res == "Success" else 0.05)
                
            except FloodWait as e:
                await status_msg.edit(f"⚠️ **FloodWait Detected!**\nSleeping for {e.value} seconds...\nDo not stop the bot.")
                await asyncio.sleep(e.value + 1)
                continue # Resume from same loop iteration
            except Exception as loop_err:
                logger.error(f"Loop Error at ID {current_id}: {loop_err}")
                current_id += 1
                continue

        await message.reply(f"✅ **SYNC COMPLETED!**\n- New episodes: {success}\n- Finished at: {current_id}")
    except Exception as e:
        logger.error(f"Sync Crash: {e}")
        await message.reply(f"❌ **Sync Crash**: {e}")
    finally:
        SYNC_ACTIVE = False

@channelforward.on_message(filters.command("sync") & filters.private)
async def manual_sync(client, message):
    args = message.text.split()
    start_id = int(args[1]) if len(args) > 1 else 1
    await run_sync_loop(client, message, start_id)

@channelforward.on_message(filters.command("transfer") & filters.private)
async def transfer_resume(client, message):
    state = await state_collection.find_one({"key": "last_processed_id"})
    start_id = (state["value"] + 1) if state else 1
    await message.reply(f"🔄 **Resuming from Last ID: {start_id}**")
    await run_sync_loop(client, message, start_id)

@channelforward.on_message(filters.command(["total", "stats"]) & filters.private)
async def stats_dashboard(client, message):
    stats = await get_stats()
    status = "🟢 ACTIVE" if SYNC_ACTIVE else "🔴 STOPPED"
    
    source = await get_setting("SOURCE_CHANNEL", Config.SOURCE_CHANNEL)
    target = await get_setting("TARGET_CHANNEL", Config.TARGET_CHANNEL)
    
    msg = f"📊 **Anime Statistics**\n\n" + \
          f"🏢 **Total Anime**: {stats['total_anime']}\n" + \
          f"📀 **Total Episodes**: {stats['total_episodes']}\n" + \
          f"📍 **Last Mirrored ID**: `{stats['last_id']}`\n\n" + \
          f"📡 **Source**: `{source}`\n" + \
          f"🎯 **Target**: `{target}`\n\n" + \
          f"⚡ **Sync Status**: {status}\n" + \
          f"Use `/transfer` to resume from the last ID."
    
    await message.reply(msg)

@channelforward.on_message(filters.command(["stop", "cancel"]) & filters.private)
async def stop_sync(client, message):
    global SYNC_ACTIVE
    SYNC_ACTIVE = False
    await message.reply("⏹ **Stop Requested.** Sync process will finish current message and halt.")

# Don't Remove Credit @VJ_Botz
# Subscribe YouTube Channel For Amazing Bot @Tech_VJ
# Ask Doubt on telegram @KingVJ01

import logging
logger = logging.getLogger(__name__)

from pyrogram import filters
from bot import channelforward
from config import Config
from translation import Translation


################################################################################################################################################################################################################################################
# start command

from pyrogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from Plugins.database import get_setting, set_setting, state_collection
import asyncio

# Admin Check Helper
def is_admin(user_id):
    return user_id == Config.OWNER_ID

@channelforward.on_message(filters.command("start") & filters.private & filters.incoming)
async def start(client, message):
    await message.reply(
        text=Translation.START,
        disable_web_page_preview=True,
        quote=True
    )

@channelforward.on_message(filters.command("botping") & filters.private)
async def botping(client, message):
    if not is_admin(message.from_user.id): return
    await message.reply("🏓 **Pong!** I am alive and connected to Koyeb.")

@channelforward.on_message(filters.command("about") & filters.private & filters.incoming)
async def about(client, message):
    await message.reply(
        text=Translation.ABOUT,
        disable_web_page_preview=True,
        quote=True
    )

# --- SETTINGS Logic ---

@channelforward.on_message(filters.command("settings") & filters.private)
async def settings(client, message):
    if not is_admin(message.from_user.id):
        return await message.reply("❌ **Access Denied.** Only the owner can use this command.")

    source = await get_setting("SOURCE_CHANNEL", Config.SOURCE_CHANNEL)
    target = await get_setting("TARGET_CHANNEL", Config.TARGET_CHANNEL)

    text = (
        "⚙️ **VJ Forward Bot Settings**\n\n"
        f"📡 **Source Channel:** `{source}`\n"
        f"🎯 **Target Channel:** `{target}`\n\n"
        "Click a button below to update settings or reset the bot."
    )

    buttons = [
        [InlineKeyboardButton("📡 Change Source", callback_data="set_src")],
        [InlineKeyboardButton("🎯 Change Target", callback_data="set_tgt")],
        [InlineKeyboardButton("🔄 Reset Sync Position", callback_data="reset_confirm")],
        [InlineKeyboardButton("❌ Close Menu", callback_data="close")]
    ]

    await message.reply(text, reply_markup=InlineKeyboardMarkup(buttons))

@channelforward.on_callback_query()
async def callback_handler(client, query):
    if not is_admin(query.from_user.id):
        return await query.answer("Forbidden", show_alert=True)

    data = query.data

    if data == "close":
        await query.message.delete()
    
    elif data == "set_src":
        await query.message.edit(
            "📝 **Setting New Source**\n\n"
            "Please use this command to set the new source:\n"
            "`/set_source your_channel_id_or_username`",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Back", callback_data="back")]])
        )

    elif data == "set_tgt":
        await query.message.edit(
            "📝 **Setting New Target**\n\n"
            "Please use this command to set the new target:\n"
            "`/set_target your_channel_id_or_username`",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Back", callback_data="back")]])
        )

    elif data == "reset_confirm":
        await query.message.edit(
            "⚠️ **Are you sure?**\n\nThis will reset the sync progress to Message ID 1. Already indexed episodes will NOT be deleted, but they will be scanned again.",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("✅ Yes, Reset", callback_data="do_reset"), InlineKeyboardButton("❌ Cancel", callback_data="back")]
            ])
        )

    elif data == "do_reset":
        await state_collection.update_one({"key": "last_processed_id"}, {"$set": {"value": 0}}, upsert=True)
        await query.answer("✅ Sync Position Reset to 0!", show_alert=True)
        await back_to_settings(query.message)

    elif data == "back":
        await back_to_settings(query.message)

async def back_to_settings(message):
    source = await get_setting("SOURCE_CHANNEL", Config.SOURCE_CHANNEL)
    target = await get_setting("TARGET_CHANNEL", Config.TARGET_CHANNEL)
    text = (
        "⚙️ **VJ Forward Bot Settings**\n\n"
        f"📡 **Source Channel:** `{source}`\n"
        f"🎯 **Target Channel:** `{target}`\n\n"
        "Click a button below to update settings or reset the bot."
    )
    buttons = [
        [InlineKeyboardButton("📡 Change Source", callback_data="set_src")],
        [InlineKeyboardButton("🎯 Change Target", callback_data="set_tgt")],
        [InlineKeyboardButton("🔄 Reset Sync Position", callback_data="reset_confirm")],
        [InlineKeyboardButton("❌ Close Menu", callback_data="close")]
    ]
    await message.edit(text, reply_markup=InlineKeyboardMarkup(buttons))

# --- Text Commands for Settings ---

@channelforward.on_message(filters.command("set_source") & filters.private)
async def set_source_cmd(client, message):
    if not is_admin(message.from_user.id): return
    if len(message.command) < 2:
        return await message.reply("❌ **Usage:** `/set_source your_id` (ID must start with -100)")
    
    new_val = message.command[1]
    await set_setting("SOURCE_CHANNEL", new_val)
    await message.reply(f"✅ **Source Updated!** New Source: `{new_val}`")

@channelforward.on_message(filters.command("set_target") & filters.private)
async def set_target_cmd(client, message):
    if not is_admin(message.from_user.id): return
    if len(message.command) < 2:
        return await message.reply("❌ **Usage:** `/set_target your_id` (ID must start with -100)")
    
    new_val = message.command[1]
    await set_setting("TARGET_CHANNEL", new_val)
    await message.reply(f"✅ **Target Updated!** New Target: `{new_val}`")

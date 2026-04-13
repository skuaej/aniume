import os
from os import getenv

class Config(object):
    # API Credentials
    API_ID = int(getenv("API_ID", "27479878"))
    API_HASH = getenv("API_HASH", "05f8dc8265d4c5df6376dded1d71c0ff")
    BOT_TOKEN = getenv("BOT_TOKEN", "8766875262:AAGjb9sE2r4GNq1J6s468afZ5CsfHrBAr6U")
    
    # MongoDB Config (NEW CLUSTER)
    DATABASE_URI = getenv("DATABASE_URI", "mongodb+srv://rajmanikumari741_db_user:ysAH1jUEwL6Ek315@rajmmamn.xevowds.mongodb.net/?appName=rajmmamn")
    DATABASE_NAME = getenv("DATABASE_NAME", "rajmmamn")
    
    # Channel Config (Usernames for stability)
    SOURCE_CHANNEL = getenv("SOURCE_CHANNEL_ID", "uuiijjjjiiyyjj")
    TARGET_CHANNEL = getenv("TARGET_CHANNEL_ID", "yyuuuuuhny")
    
    # VJ Bot specifics
    AS_COPY = True
    CHANNEL = [SOURCE_CHANNEL, TARGET_CHANNEL]
    OWNER_ID = int(getenv("OWNER_ID", "6804892450"))

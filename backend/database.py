from pymongo import MongoClient, ASCENDING, DESCENDING

import config

client = MongoClient(config.MONGO_URI)

db = client["meetiq"]

meetings_collection = db["meetings"]
users_collection = db["users"]
password_resets_collection = db["password_resets"]

# Ensure indexes (best-effort so startup doesn't crash if DB is starting up)
try:
    users_collection.create_index([("email", ASCENDING)], unique=True)
    meetings_collection.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    password_resets_collection.create_index([("token_hash", ASCENDING)], unique=True)
    password_resets_collection.create_index([("expires_at", ASCENDING)], expireAfterSeconds=3600)
except Exception:
    pass

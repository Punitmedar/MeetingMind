"""READ-ONLY database inspection + JSON backup. Performs no writes."""
import json
import sys
from datetime import datetime
from pathlib import Path

from bson import json_util

sys.path.insert(0, r"C:\MEETINGIQ\backend")
import config
from pymongo import MongoClient

c = MongoClient(config.MONGO_URI)
print("MONGO_URI =", config.MONGO_URI)
print("databases:", {n: c[n].list_collection_names() for n in c.list_database_names() if n not in ("admin", "local", "config")})
out = Path(r"C:\MEETINGIQ\_backups") / f"db_backup_{datetime.now():%Y%m%d_%H%M%S}"
out.mkdir(parents=True, exist_ok=True)
for dbn in c.list_database_names():
    if dbn in ("admin", "local", "config"):
        continue
    for col in c[dbn].list_collection_names():
        docs = list(c[dbn][col].find({}))
        (out / f"{dbn}.{col}.json").write_text(json_util.dumps(docs, indent=1), encoding="utf-8")
        print("backed up", dbn, col, len(docs))
print("backup dir:", out)

db = c["meetiq"]
print("\nUSERS")
users = list(db.users.find({}))
for u in users:
    n = db.meetings.count_documents({"user_id": str(u["_id"])})
    print(u["_id"], u.get("email"), u.get("role"), u.get("created_at"), "meetings:", n)
print("\nMEETINGS total:", db.meetings.count_documents({}))
uids = {str(u["_id"]) for u in users}
orphans = [m for m in db.meetings.find({}, {"user_id": 1, "filename": 1, "created_at": 1, "status": 1}) if m.get("user_id") not in uids]
print("orphan meetings (owner not in users):", len(orphans))
for m in orphans:
    print("  ", m["_id"], m.get("user_id"), m.get("filename"), m.get("created_at"), m.get("status"))
print("\nmeetings by status:", {s: db.meetings.count_documents({"status": s}) for s in db.meetings.distinct("status")})
print("latest 10 meetings:")
for m in db.meetings.find({}, {"user_id": 1, "filename": 1, "created_at": 1, "status": 1}).sort("created_at", -1).limit(10):
    print("  ", m["_id"], m.get("user_id"), m.get("filename"), m.get("created_at"), m.get("status"))
print("password_resets:", db.password_resets.count_documents({}))

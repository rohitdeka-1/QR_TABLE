"""Clear QR Restaurant Database"""
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')
db = client['qr_restaurant']

collections = db.list_collection_names()
print(f"Clearing {len(collections)} collections:")

for collection in collections:
    count = db[collection].delete_many({})
    print(f"  - {collection}: {count.deleted_count} documents deleted")

print("\n✓ Database cleared successfully!")
print("Ready for fresh test run.")

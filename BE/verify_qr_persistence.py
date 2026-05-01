from pymongo import MongoClient
import base64

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['qr_restaurant']

# Get the latest table
table = db.tables.find_one(sort=[('_id', -1)])

if table:
    print(f"Table: {table['tableNumber']}")
    print(f"QR Token: {table.get('qrToken', 'N/A')}")
    print(f"QR URL stored: {table.get('qrUrl', 'N/A')}")
    
    qr_image = table.get('qrCodeImage', '')
    if qr_image:
        print(f"\n✓ QR Code Image persisted in database!")
        print(f"  Size: {len(qr_image)} bytes")
        print(f"  Type: {qr_image[:30]}...")  # Show first 30 chars
        
        # Try to save to file to verify it's valid base64
        try:
            if qr_image.startswith('data:image/png;base64,'):
                img_data = qr_image.split(',')[1]
                decoded = base64.b64decode(img_data)
                print(f"  Decoded size: {len(decoded)} bytes")
                print(f"  Valid PNG: {decoded[:4] == b'\\x89PNG'}")
        except Exception as e:
            print(f"  Decode error: {e}")
    else:
        print("\n✗ No QR Code Image found in database")
else:
    print("No tables found in database")

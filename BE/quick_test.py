import requests
import json

BASE_URL = "http://localhost:4000/api"

# Login to get fresh token
print("1. Logging in...")
r = requests.post(f"{BASE_URL}/auth/login", 
                  json={"email": "admin@test.com", "password": "AdminPass123"})
print(f"   Status: {r.status_code}")
if r.status_code == 200:
    token = r.json()["token"]
    print(f"   Got token: {token[:20]}...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try creating a table with unique ID
    print("\n2. Creating table with unique ID...")
    import random
    table_num = f"T-TEST-{random.randint(1000000, 9999999)}"
    r = requests.post(f"{BASE_URL}/tables",
                      json={"tableNumber": table_num, "location": "Test"},
                      headers=headers)
    print(f"   Status: {r.status_code}")
    print(f"   Response: {r.json()}")
    
    if r.status_code == 201:
        table_id = r.json()["table"]["_id"]
        print(f"\n3. Table created successfully!")
        print(f"   Table ID: {table_id}")
        print(f"   QR Code generated: {'qrCode' in r.json()}")
        print(f"   QR URL: {r.json().get('qrUrl')}")
    else:
        print(f"   Error: {r.text}")
else:
    print(f"   Login failed: {r.text}")

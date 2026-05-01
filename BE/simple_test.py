#!/usr/bin/env python3
"""QR Restaurant API - Comprehensive Test Suite (Simplified for Display)"""

import requests
import random
import json

BASE_URL = "http://localhost:4000/api"
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "AdminPass123"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"TEST: {title}")
    print(f"{'='*60}")

def login():
    """Get admin token"""
    print_section("Login Admin")
    r = requests.post(f"{BASE_URL}/auth/login", 
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code == 200:
        token = r.json()["token"]
        print(f"✓ Logged in, token: {token[:30]}...")
        return {"Authorization": f"Bearer {token}"}
    else:
        print(f"✗ Login failed: {r.status_code}")
        return None

def main():
    print("\n" + "="*60)
    print("QR RESTAURANT API - COMPREHENSIVE TEST")
    print("="*60)
    
    headers = login()
    if not headers:
        return
    
    # Test: Create Table with QR
    print_section("Create Table with QR Code")
    table_num = f"T-{random.randint(100000, 999999)}"
    r = requests.post(f"{BASE_URL}/tables",
                      json={"tableNumber": table_num, "location": "Test Location"},
                      headers=headers)
    
    if r.status_code == 201:
        table_id = r.json()["table"]["_id"]
        qr_token = r.json().get("qrUrl", "").split("token=")[-1] if "token=" in r.json().get("qrUrl", "") else None
        has_qr_code = "qrCode" in r.json() and len(r.json()["qrCode"]) > 100
        print(f"✓ Table created: {table_num}")
        print(f"  ID: {table_id}")
        print(f"  QR Token: {qr_token}")
        print(f"  QR Code stored: {has_qr_code} ({len(r.json().get('qrCode', '')) // 1000}KB)")
        
        # Test: Get Menu
        print_section("Get Public Menu")
        r = requests.get(f"{BASE_URL}/menu")
        if r.status_code == 200:
            items = r.json()
            print(f"✓ Menu fetched: {len(items)} items")
            for item in items[:3]:
                print(f"  - {item.get('name', 'N/A')}: ${item.get('price', 'N/A')}")
        
        # Test: Create Order with QR token
        if qr_token:
            print_section("Create Order via QR Token")
            menu_item = next((item for item in r.json() if item.get('name') == 'Classic Burger'), None)
            if menu_item:
                order_data = {
                    "tableId": table_id,
                    "qrToken": qr_token,
                    "items": [{"itemId": str(menu_item["_id"]), "qty": 1}]
                }
                r = requests.post(f"{BASE_URL}/orders", json=order_data)
                if r.status_code == 201:
                    order = r.json()
                    print(f"✓ Order created!")
                    print(f"  Queue #: {order.get('queueNumber')}")
                    print(f"  Items: {len(order.get('items', []))}")
                    print(f"  Total: ${order.get('totalAmount')}")
                else:
                    print(f"✗ Order creation failed: {r.status_code}")
                    print(f"  Response: {r.json()}")
        
        # Test: Regenerate QR
        print_section("Regenerate QR Code")
        r = requests.patch(f"{BASE_URL}/tables/{table_id}/regenerate-qr", headers=headers)
        if r.status_code == 200:
            new_token = r.json().get("qrUrl", "").split("token=")[-1] if "token=" in r.json().get("qrUrl", "") else None
            print(f"✓ QR regenerated")
            print(f"  New token: {new_token}")
            print(f"  QR version: {r.json().get('qrVersion')}")
        else:
            print(f"✗ Regeneration failed: {r.status_code}")
    else:
        print(f"✗ Table creation failed: {r.status_code}")
        print(f"  Response: {r.json()}")
    
    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60)

if __name__ == "__main__":
    main()

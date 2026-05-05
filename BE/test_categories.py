#!/usr/bin/env python3
"""Test script for category and menu item management APIs."""

import requests
import json
from typing import Optional

BASE_URL = "http://localhost:4000/api"

# Test credentials
TEST_EMAIL = "admin@restaurant.com"
TEST_PASSWORD = "password123"

def login() -> Optional[str]:
    """Login and return JWT token."""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        token = data.get("token")
        print(f"✓ Login successful. Token: {token[:20]}...")
        return token
    else:
        print(f"✗ Login failed: {response.status_code} {response.text}")
        return None

def get_headers(token: str) -> dict:
    """Return headers with authorization."""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def test_list_categories(token: str):
    """Test listing categories."""
    response = requests.get(f"{BASE_URL}/admin/categories", headers=get_headers(token))
    print(f"\n📋 GET /admin/categories: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"  Found {len(data)} categories")
        for cat in data[:2]:
            print(f"    - {cat.get('name')}: {cat.get('description', 'No description')}")
    else:
        print(f"  Error: {response.text}")

def test_create_category(token: str) -> Optional[str]:
    """Test creating a category."""
    payload = {
        "name": "Appetizers",
        "description": "Starters and appetizers"
    }
    response = requests.post(f"{BASE_URL}/admin/categories", 
                             headers=get_headers(token),
                             json=payload)
    print(f"\n📝 POST /admin/categories: {response.status_code}")
    if response.status_code in [200, 201]:
        data = response.json()
        category_id = data.get("_id")
        print(f"  ✓ Created category: {data.get('name')} (ID: {category_id})")
        return category_id
    else:
        print(f"  Error: {response.text}")
        return None

def test_create_menu_item(token: str, category_id: str):
    """Test creating a menu item with a category."""
    payload = {
        "name": "Bruschetta",
        "description": "Toasted bread with tomatoes and basil",
        "price": 8.99,
        "category": category_id,
        "available": True
    }
    response = requests.post(f"{BASE_URL}/admin/menu",
                             headers=get_headers(token),
                             json=payload)
    print(f"\n🍽️ POST /admin/menu: {response.status_code}")
    if response.status_code in [200, 201]:
        data = response.json()
        item_id = data.get("_id")
        print(f"  ✓ Created menu item: {data.get('name')} (ID: {item_id})")
        print(f"    Price: ${data.get('price')}")
        print(f"    Category: {category_id}")
        return item_id
    else:
        print(f"  Error: {response.text}")
        return None

def test_list_menu(token: str):
    """Test listing menu items."""
    response = requests.get(f"{BASE_URL}/admin/menu", headers=get_headers(token))
    print(f"\n📋 GET /admin/menu: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"  Found {len(data)} menu items")
        for item in data[-3:]:  # Show last 3 items
            cat_name = "No category"
            if isinstance(item.get('category'), dict):
                cat_name = item['category'].get('name', 'Unknown')
            elif item.get('category'):
                cat_name = f"ID: {item['category']}"
            print(f"    - {item.get('name')}: ${item.get('price')} ({cat_name})")
    else:
        print(f"  Error: {response.text}")

def test_update_menu_item(token: str, item_id: str):
    """Test updating a menu item."""
    payload = {
        "price": 9.99,
        "description": "Toasted bread with fresh tomatoes and basil"
    }
    response = requests.patch(f"{BASE_URL}/admin/menu/{item_id}",
                              headers=get_headers(token),
                              json=payload)
    print(f"\n✏️ PATCH /admin/menu/{item_id}: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"  ✓ Updated: {data.get('name')} - New price: ${data.get('price')}")
    else:
        print(f"  Error: {response.text}")

def test_image_upload(token: str, item_id: str):
    """Test image upload (optional)."""
    # Create a simple test image file
    import io
    from PIL import Image
    
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    files = {'image': ('test.png', img_bytes, 'image/png')}
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(f"{BASE_URL}/menu/items/{item_id}/image",
                             headers=headers,
                             files=files)
    print(f"\n📸 POST /menu/items/{item_id}/image: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"  ✓ Image uploaded: {data.get('image', 'URL not returned')}")
    else:
        print(f"  Error: {response.text}")

def main():
    """Run all tests."""
    print("=" * 60)
    print("Testing Category & Menu Management APIs")
    print("=" * 60)
    
    token = login()
    if not token:
        print("\n✗ Cannot proceed without authentication")
        return
    
    test_list_categories(token)
    
    category_id = test_create_category(token)
    if category_id:
        item_id = test_create_menu_item(token, category_id)
        if item_id:
            test_list_menu(token)
            test_update_menu_item(token, item_id)
            try:
                test_image_upload(token, item_id)
            except ImportError:
                print("\n📸 Skipping image upload test (PIL not installed)")
    
    print("\n" + "=" * 60)
    print("Tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()

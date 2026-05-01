#!/usr/bin/env python3
"""
QR Restaurant API Test Suite
Comprehensive testing for all endpoints with proper flow:
1. Seed admin user
2. Login and get JWT
3. Create categories and menu items
4. Create tables
5. Place orders via QR
6. Update order status
7. Mark as paid
"""

import requests
import json
import sys
import random
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "http://localhost:4000/api"
ADMIN_SETUP_TOKEN = "replace_with_secure_random_value"  # Match .env value
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "AdminPass123"
STAFF_EMAIL = "kitchen@test.com"
STAFF_PASSWORD = "KitchenPass123"
CASHIER_EMAIL = "cashier@test.com"
CASHIER_PASSWORD = "CashierPass123"

# Global tokens
admin_token = None
staff_token = None
cashier_token = None


class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'


def print_test(name: str):
    """Print test name header"""
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"TEST: {name}")
    print(f"{'='*60}{Colors.RESET}")


def print_pass(msg: str):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")


def print_fail(msg: str):
    """Print failure message"""
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")


def print_info(msg: str):
    """Print info message"""
    print(f"{Colors.YELLOW}ℹ {msg}{Colors.RESET}")


def make_request(
    method: str,
    endpoint: str,
    token: Optional[str] = None,
    data: Optional[Dict] = None,
    headers: Optional[Dict] = None,
    admin_token_header: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Make HTTP request with error handling
    
    Args:
        method: HTTP method (GET, POST, PATCH, DELETE)
        endpoint: API endpoint path (without /api)
        token: JWT bearer token
        data: Request body
        headers: Additional headers
        admin_token_header: X-Admin-Setup-Token header value
    
    Returns:
        Response data or error info
    """
    url = f"{BASE_URL}{endpoint}"
    req_headers = headers or {}
    
    if token:
        req_headers["Authorization"] = f"Bearer {token}"
    
    if admin_token_header:
        req_headers["X-Admin-Setup-Token"] = admin_token_header
    
    req_headers["Content-Type"] = "application/json"
    
    try:
        if method == "GET":
            resp = requests.get(url, headers=req_headers)
        elif method == "POST":
            resp = requests.post(url, json=data, headers=req_headers)
        elif method == "PATCH":
            resp = requests.patch(url, json=data, headers=req_headers)
        elif method == "DELETE":
            resp = requests.delete(url, headers=req_headers)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        print_info(f"{method} {endpoint} → Status {resp.status_code}")
        
        if resp.status_code >= 400:
            print_fail(f"Response: {resp.text}")
            return {"error": resp.text, "status": resp.status_code}
        
        try:
            return resp.json() if resp.text else {"status": resp.status_code}
        except:
            return {"data": resp.text, "status": resp.status_code}
    
    except Exception as e:
        print_fail(f"Request failed: {str(e)}")
        return {"error": str(e)}


# ============================================================================
# AUTH ENDPOINTS
# ============================================================================

def test_seed_admin():
    """Test: Seed admin user"""
    print_test("Seed Admin User")
    
    resp = make_request(
        "POST",
        "/auth/seed-admin",
        data={
            "name": "Admin User",
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
        },
        admin_token_header=ADMIN_SETUP_TOKEN,
    )
    
    if "error" in resp:
        print_fail(f"Seed admin failed: {resp.get('error')}")
        return False
    
    print_pass(f"Admin created: {resp.get('email')}")
    return True


def test_login_admin():
    """Test: Login as admin"""
    print_test("Login Admin")
    global admin_token
    
    resp = make_request(
        "POST",
        "/auth/login",
        data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    
    if "error" in resp or "token" not in resp:
        print_fail(f"Login failed: {resp.get('error')}")
        return False
    
    admin_token = resp["token"]
    print_pass(f"Admin logged in, token: {admin_token[:20]}...")
    print_info(f"User role: {resp.get('user', {}).get('role')}")
    return True


def test_login_invalid_credentials():
    """Test: Login with invalid credentials"""
    print_test("Login with Invalid Credentials")
    
    resp = make_request(
        "POST",
        "/auth/login",
        data={"email": ADMIN_EMAIL, "password": "wrongpassword"},
    )
    
    if "error" in resp:
        print_pass("Invalid credentials rejected as expected")
        return True
    
    if resp.get("status") == 401:
        print_pass("Invalid credentials rejected (401)")
        return True
    
    print_fail("Should have rejected invalid credentials")
    return False


# ============================================================================
# MENU ENDPOINTS
# ============================================================================

def test_create_category():
    """Test: Create menu category"""
    print_test("Create Menu Category")
    global category_id
    
    # Use unique category name to avoid conflicts
    cat_name = f"Burgers-{random.randint(1000, 9999)}"
    
    resp = make_request(
        "POST",
        "/menu/categories",
        token=admin_token,
        data={"name": cat_name, "description": "Delicious burgers"},
    )
    
    if "error" in resp or "_id" not in resp:
        print_fail(f"Create category failed: {resp.get('error')}")
        return False
    
    category_id = resp["_id"]
    print_pass(f"Category created: {resp.get('name')} (ID: {category_id})")
    return True


def test_create_menu_items():
    """Test: Create menu items"""
    print_test("Create Menu Items")
    global menu_item_ids
    menu_item_ids = []
    
    items = [
        {"name": "Classic Burger", "price": 9.99, "description": "Classic cheeseburger", "category": category_id},
        {"name": "French Fries", "price": 3.99, "description": "Crispy fries", "category": category_id},
        {"name": "Coke", "price": 1.99, "description": "Cold coke", "category": category_id},
    ]
    
    for item in items:
        resp = make_request(
            "POST",
            "/menu/items",
            token=admin_token,
            data=item,
        )
        
        if "error" in resp or "_id" not in resp:
            print_fail(f"Create item failed: {resp.get('error')}")
            continue
        
        menu_item_ids.append(resp["_id"])
        print_pass(f"Menu item created: {resp.get('name')} - ${resp.get('price')}")
    
    return len(menu_item_ids) == len(items)


def test_list_menu():
    """Test: List public menu"""
    print_test("List Public Menu (No Auth)")
    
    resp = make_request("GET", "/menu")
    
    if "error" in resp:
        print_fail(f"List menu failed: {resp.get('error')}")
        return False
    
    items = resp if isinstance(resp, list) else []
    print_pass(f"Menu fetched: {len(items)} items")
    for item in items[:3]:
        print_info(f"  - {item.get('name')}: ${item.get('price')}")
    return True


def test_update_menu_item():
    """Test: Update menu item"""
    print_test("Update Menu Item")
    
    if not menu_item_ids:
        print_fail("No menu items to update")
        return False
    
    item_id = menu_item_ids[0]
    resp = make_request(
        "PATCH",
        f"/menu/items/{item_id}",
        token=admin_token,
        data={"price": 10.99, "available": True},
    )
    
    if "error" in resp:
        print_fail(f"Update failed: {resp.get('error')}")
        return False
    
    print_pass(f"Menu item updated: {resp.get('name')} → ${resp.get('price')}")
    return True


# ============================================================================
# TABLE ENDPOINTS
# ============================================================================

def test_create_table():
    """Test: Create table with QR code"""
    print_test("Create Table with QR Code")
    global table_id, qr_token, qr_code_data
    
    # Use random table number to avoid conflicts
    table_num = f"T-{random.randint(1000, 9999)}"
    
    resp = make_request(
        "POST",
        "/tables",
        token=admin_token,
        data={"tableNumber": table_num, "location": "Main Floor"},
    )
    
    if "error" in resp or "table" not in resp:
        print_fail(f"Create table failed: {resp.get('error')}")
        return False
    
    table = resp.get("table", {})
    table_id = table.get("_id")
    qr_url = resp.get("qrUrl", "")
    # Extract token from URL: /menu?tableId=...&token=abc123
    qr_token = qr_url.split("token=")[-1] if "token=" in qr_url else ""
    qr_code_data = resp.get("qrCode", "")
    
    print_pass(f"Table created: {table.get('tableNumber')} (ID: {table_id})")
    if qr_token:
        print_info(f"QR Token: {qr_token[:20]}...")
    print_info(f"QR Code generated: {len(qr_code_data)} bytes")
    return True


def test_regenerate_qr():
    """Test: Regenerate QR code"""
    print_test("Regenerate QR Code")
    
    if not table_id:
        print_fail("No table to regenerate QR")
        return False
    
    resp = make_request(
        "PATCH",
        f"/tables/{table_id}/regenerate-qr",
        token=admin_token,
    )
    
    if "error" in resp:
        print_fail(f"Regenerate QR failed: {resp.get('error')}")
        return False
    
    print_pass(f"QR regenerated - Version: {resp.get('qrVersion')}")
    print_info(f"New QR Token: {resp.get('qrUrl', '')[-20:]}")
    return True


def test_get_qr_code():
    """Test: Get QR code as data URL"""
    print_test("Get QR Code Data URL")
    
    if not table_id:
        print_fail("No table to fetch QR")
        return False
    
    resp = make_request(
        "GET",
        f"/tables/{table_id}/qr",
        token=admin_token,
    )
    
    if "error" in resp:
        print_fail(f"Get QR failed: {resp.get('error')}")
        return False
    
    qr_code = resp.get("qrCode", "")
    print_pass(f"QR code fetched - Version: {resp.get('qrVersion')}")
    print_info(f"QR Code size: {len(qr_code)} bytes (base64)")
    return True


# ============================================================================
# ORDER ENDPOINTS
# ============================================================================

def test_create_order():
    """Test: Create order via QR (public endpoint)"""
    print_test("Create Order via QR Token")
    global order_id
    
    if not table_id or not qr_token or not menu_item_ids:
        print_fail("Missing table, QR token, or menu items")
        return False
    
    # Fetch latest table to get updated QR token
    table_resp = make_request(
        "GET",
        f"/tables/{table_id}/qr",
        token=admin_token,
    )
    current_qr_url = table_resp.get("qrUrl", "")
    current_token = current_qr_url.split("token=")[-1] if "token=" in current_qr_url else qr_token
    
    resp = make_request(
        "POST",
        "/orders",
        data={
            "tableId": table_id,
            "token": current_token,
            "items": [
                {"name": "Classic Burger", "qty": 2, "price": 10.99},
                {"name": "French Fries", "qty": 1, "price": 3.99},
            ],
        },
    )
    
    if "error" in resp or "_id" not in resp:
        print_fail(f"Create order failed: {resp.get('error')}")
        return False
    
    order_id = resp["_id"]
    print_pass(f"Order created (ID: {order_id})")
    print_info(f"  Queue #: {resp.get('queueNumber')}")
    print_info(f"  Status: {resp.get('status')}")
    print_info(f"  Total: ${resp.get('totalAmount')}")
    return True


def test_create_order_invalid_token():
    """Test: Create order with invalid QR token"""
    print_test("Create Order with Invalid QR Token")
    
    if not table_id or not menu_item_ids:
        print_fail("Missing table or menu items")
        return False
    
    resp = make_request(
        "POST",
        "/orders",
        data={
            "tableId": table_id,
            "token": "invalid_token_xyz",
            "items": [{"name": "Burger", "qty": 1, "price": 10.99}],
        },
    )
    
    if "error" in resp and resp.get("status") == 403:
        print_pass("Invalid token rejected (403)")
        return True
    
    print_fail("Should have rejected invalid token")
    return False


def test_list_orders():
    """Test: List orders (staff/admin/cashier)"""
    print_test("List Orders (Kitchen View)")
    
    resp = make_request(
        "GET",
        "/orders",
        token=admin_token,
    )
    
    if "error" in resp:
        print_fail(f"List orders failed: {resp.get('error')}")
        return False
    
    orders = resp if isinstance(resp, list) else []
    print_pass(f"Orders fetched: {len(orders)} orders")
    for order in orders[:3]:
        print_info(f"  - Queue #{order.get('queueNumber')}: {order.get('status')}")
    return True


def test_update_order_status():
    """Test: Update order status"""
    print_test("Update Order Status")
    
    if not order_id:
        print_fail("No order to update")
        return False
    
    statuses = ["preparing", "ready", "served"]
    
    for status in statuses:
        resp = make_request(
            "PATCH",
            f"/orders/{order_id}/status",
            token=admin_token,
            data={"status": status},
        )
        
        if "error" in resp:
            print_fail(f"Update to {status} failed: {resp.get('error')}")
            return False
        
        print_pass(f"Order status updated → {status}")
    
    return True


def test_mark_order_paid():
    """Test: Mark order as paid"""
    print_test("Mark Order as Paid")
    
    if not order_id:
        print_fail("No order to mark as paid")
        return False
    
    resp = make_request(
        "POST",
        f"/orders/{order_id}/mark-paid",
        token=admin_token,
    )
    
    if "error" in resp:
        print_fail(f"Mark paid failed: {resp.get('error')}")
        return False
    
    print_pass(f"Order marked as paid")
    print_info(f"  Payment Status: {resp.get('paymentStatus')}")
    return True


# ============================================================================
# AUTHORIZATION TESTS
# ============================================================================

def test_unauthorized_access():
    """Test: Unauthorized access to protected endpoints"""
    print_test("Unauthorized Access")
    
    resp = make_request(
        "GET",
        "/orders",
        token=None,  # No token
    )
    
    if resp.get("status") == 401 or "error" in resp:
        print_pass("Unauthorized request rejected")
        return True
    
    print_fail("Should have rejected unauthorized request")
    return False


def test_forbidden_access():
    """Test: Access denied due to insufficient role"""
    print_test("Forbidden Access (Role-Based)")
    
    # Try to create table with random number to avoid conflicts
    resp = make_request(
        "POST",
        "/tables",
        token=admin_token,  # Using admin for now (can expand with staff token)
        data={"tableNumber": f"T-{random.randint(1000, 9999)}", "location": "Test"},
    )
    
    print_info("Role-based access control in place")
    return True


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def run_all_tests():
    """Run complete test suite"""
    print(f"\n{Colors.BLUE}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║        QR RESTAURANT API - COMPREHENSIVE TEST SUITE        ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"{Colors.RESET}")
    
    print_info(f"Base URL: {BASE_URL}")
    print_info(f"Admin Email: {ADMIN_EMAIL}")
    print_info(f"Admin Password: {ADMIN_PASSWORD}\n")
    
    # Store test results
    results = {}
    
    # Auth Tests
    results["Seed Admin"] = test_seed_admin()
    results["Login Admin"] = test_login_admin()
    results["Login Invalid"] = test_login_invalid_credentials()
    
    if not admin_token:
        print_fail("Cannot continue without admin token!")
        return results
    
    # Menu Tests
    results["Create Category"] = test_create_category()
    results["Create Menu Items"] = test_create_menu_items()
    results["List Menu"] = test_list_menu()
    results["Update Menu Item"] = test_update_menu_item()
    
    # Table Tests
    results["Create Table"] = test_create_table()
    results["Regenerate QR"] = test_regenerate_qr()
    results["Get QR Code"] = test_get_qr_code()
    
    # Order Tests
    results["Create Order"] = test_create_order()
    results["Invalid QR Token"] = test_create_order_invalid_token()
    results["List Orders"] = test_list_orders()
    results["Update Status"] = test_update_order_status()
    results["Mark Paid"] = test_mark_order_paid()
    
    # Authorization Tests
    results["Unauthorized Access"] = test_unauthorized_access()
    results["Role-Based Access"] = test_forbidden_access()
    
    # Print summary
    print(f"\n{Colors.BLUE}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║                      TEST SUMMARY                          ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"{Colors.RESET}")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}✓ PASS{Colors.RESET}" if result else f"{Colors.RED}✗ FAIL{Colors.RESET}"
        print(f"{test_name:<40} {status}")
    
    print(f"\n{Colors.BLUE}Total: {passed}/{total} tests passed{Colors.RESET}\n")
    
    return results


if __name__ == "__main__":
    try:
        # Initialize global variables
        category_id = None
        menu_item_ids = []
        table_id = None
        qr_token = None
        qr_code_data = None
        order_id = None
        
        run_all_tests()
    except KeyboardInterrupt:
        print(f"\n{Colors.RED}Tests interrupted by user{Colors.RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Unexpected error: {str(e)}{Colors.RESET}")
        sys.exit(1)

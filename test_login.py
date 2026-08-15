import json
import http.cookiejar
from urllib import request, parse, error

BASE_URL = "http://127.0.0.1:8000"

def build_opener():
    cookie_jar = http.cookiejar.CookieJar()
    return request.build_opener(request.HTTPCookieProcessor(cookie_jar))

def fetch_json(opener, url, headers=None, method='GET', data=None):
    if headers is None:
        headers = {}
    req = request.Request(url, headers=headers, method=method)
    if data:
        data = json.dumps(data).encode('utf-8')
        req.add_header('Content-Type', 'application/json')
    try:
        with opener.open(req, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
    except error.HTTPError as e:
        print(f"HTTP error {e.code} for {url}: {e.reason}")
        return None
    except error.URLError as e:
        print(f"URL error for {url}: {e.reason}")
        return None
    except json.JSONDecodeError as e:
        print(f"JSON decode error for {url}: {e}")
        return None

if __name__ == "__main__":
    opener = build_opener()
    url = f"{BASE_URL}/api/login/"
    payload = {"username": "admin", "password": "admin123"}
    headers = {"Content-Type": "application/json"}
    print("Sending login request...")
    result = fetch_json(opener, url, headers=headers, method='POST', data=payload)
    print(f"Result: {result}")

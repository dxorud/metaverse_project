import requests

API_KEY = "app-jr5u0isKHsfqlO5RWKNcdX5W"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

data = {
    "query": "자기소개 부탁드립니다.",
    "inputs": {}, 
    "response_mode": "streaming",
    "user": "interview-user"
}

response = requests.post("https://api.dify.ai/v1/chat-messages", headers=headers, json=data)

print(response.status_code)
print(response.text)

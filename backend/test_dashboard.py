from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)
response = client.get('/api/v1/dashboard/requisitions-status', headers={'Authorization': 'Bearer test'})
print(f'Status: {response.status_code}')
if response.status_code == 200:
    data = response.json()
    print(f'Total requisitions: {len(data)}')
    if data:
        first = data[0]
        print(f'\nFirst requisition:')
        print(f'  Number: {first["number"]}')
        print(f'  Department: {first["department"]}')
        print(f'  Amount: ${first["total_amount"]}')
        print(f'  Status: {first["workflow_status"]}')
        print(f'  Description: {first["description"][:80]}...')
else:
    print(f'Error: {response.text}')

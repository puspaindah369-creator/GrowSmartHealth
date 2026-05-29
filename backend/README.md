# GrowSmart Backend

Backend Python untuk aplikasi GrowSmart.

## Endpoint
- `GET /health`
- `POST /predict`

## Cara menjalankan
```bash
pip install -r requirements.txt
python app.py
```

Server berjalan di:
```bash
http://0.0.0.0:8081
```

## Request contoh
```bash
curl -X POST http://127.0.0.1:8081/predict \
  -H "Content-Type: application/json" \
  -d '{"age":24,"weight":10.5,"height":82}'
```

## Catatan frontend
Di `screens/DeteksiScreen.js` ada import ini:
```js
import { predictMalaria } from '../../pwa/api/api';
```
Kalau file API kamu sebenarnya ada di `utils/api.js`, ubah menjadi:
```js
import { predictMalaria } from '../utils/api';
```

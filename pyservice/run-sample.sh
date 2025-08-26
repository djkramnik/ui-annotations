curl -X POST "http://127.0.0.1:8000/visualize_base64?min_score=0.6" \
  -H "Content-Type: application/json" \
  -d "{\"image_base64\":\"$(cat sample.b64)\"}" \
  --output annotated_sample.png
# Python FastAPI inference server

You must have downloaded the model_final.pth, and have the appropriate config.yaml and metadata.json artifacts in the src/ folder for this to work out of the box.
The config.yaml must be based on the actual config used during training.  metadata.json is just a small json object containing the classes trained. Has to be the same thing_classes set on the metadata during training to properly align.

```
{"thing_classes": ["labela", "labelb", "labelc", ...]}
```

### Usage
1. `python3 -m venv env`
2. `source env/bin/activate`
3. `pip install -r requirements.txt`
4. `pip install --no-build-isolation 'git+https://github.com/facebookresearch/detectron2.git'`
5. `source run-server.sh`

### Try it out:

From root of pyservice run:
`curl -X POST "http://127.0.0.1:8000/predict" -F "file=@./sample.png"`
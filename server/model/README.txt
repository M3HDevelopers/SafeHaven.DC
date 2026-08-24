SAFEHAVEN MODEL FOLDER
======================

Paste your trained ONNX model file here, e.g.:

    weapon-detector.onnx

The backend automatically:
  1. Detects any *.onnx file on startup
  2. Watches this folder — new files are registered while running
  3. Registers it in the Detection Models page (origin: BACKEND)
  4. Serves it to the browser engine, which loads it for real-time inference

OPTIONAL — custom class names:
Create a matching text file with one class per line, in model output order:

    weapon-detector.classes.txt
    ---------------------------
    firearm
    knife
    person

Classes containing gun/weapon/firearm/knife/blade keywords automatically
raise threat incidents + alerts in the SafeHaven console.

Tested exports: YOLOv5 / YOLOv8 Ultralytics ONNX exports.

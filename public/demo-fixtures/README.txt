QRGuard demo fixtures

Drop these onto the upload area after running: npm run dev

url-demo.png         -> https://example.com/qrguard-demo          (low risk)
text-payload.png     -> QRGuard demo text payload                 (low risk)
mailto-demo.png      -> mailto:demo@example.com                   (medium risk)
high-risk-demo.png   -> javascript:alert('QRGuard-demo')          (high risk)
no-qr.png            -> expected decode error (no QR in image)

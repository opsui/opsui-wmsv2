#!/bin/bash
cat packages/backend/dist/services/NetSuiteOrderSyncService.js | ssh 103.208.85.233 "cd /root/opsui-wmsv2/packages/backend/dist/services/NetSuiteOrderSyncService.js && pm2 restart backend" 2>&1

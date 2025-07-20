#!/bin/bash

# 提取代码中使用的消息键
echo "=== 代码中使用的消息键 ==="
grep -rE 'getMessage\("([^"]+)"\)|chrome\.i18n\.getMessage\('"'"'([^'"'"']+)'"'"'\)' . \
  --include="*.js" --exclude-dir=.git --exclude-dir=.history -o | \
  sed -E 's/.*getMessage\("([^"]+)"\).*/\1/; s/.*getMessage\('"'"'([^'"'"']+)'"'"'\).*/\1/' | \
  sort | uniq

echo -e "\n=== 语言包中定义的消息键 ==="
jq -r 'keys[]' _locales/zh_CN/messages.json | sort

echo -e "\n=== 检查缺失的消息键 ==="
# 这里可以进一步比较，但先看看提取的结果

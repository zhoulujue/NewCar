# NewCar 本地数据服务

前端是静态页面，浏览器不能稳定直接跨域读取懂车帝页面，也不能直接安全持有 Gemini API Key。需要在本机或服务器旁边启动两个轻量 Node 服务。

## 懂车帝近期新车

```bash
node scripts/dongchedi-newcar-server.mjs
```

默认地址：

```text
http://127.0.0.1:8788/dongchedi/recent-models
```

健康检查：

```bash
curl http://127.0.0.1:8788/health
```

页面里的“新车情报 -> 刷新懂车帝数据”会先尝试 `/api/dongchedi/recent-models`，失败后再尝试本机 `127.0.0.1:8788`。数据来自懂车帝首页 `newCarData` 和对应车型页 `__NEXT_DATA__`，会提取发布日期、价格、能源类型、车型版本、尺寸、续航/电池、车型资讯和懂车帝链接。

可选环境变量：

```bash
DCD_NEWCAR_PORT=8788 DCD_NEWCAR_CACHE_MINUTES=10 node scripts/dongchedi-newcar-server.mjs
```

## Gemini 信息墙分析

```bash
node scripts/gemini-analyzer-server.mjs
```

默认地址：

```text
http://127.0.0.1:8787/analyze
```

如果本机配置了 `GEMINI_API_KEY`，服务会走 Gemini API；否则会尝试调用本机 `gemini` CLI。不要把 API Key 写进代码或提交到仓库。

可选环境变量：

```bash
GEMINI_MODEL=gemini-2.5-flash GEMINI_ANALYZER_PORT=8787 node scripts/gemini-analyzer-server.mjs
```

如果返回“当前网络区域不可用”，说明本机 Gemini API/CLI 的网络或区域还没打通，前端会保留你上传的信息，稍后可以手动再点“Gemini 分析”。

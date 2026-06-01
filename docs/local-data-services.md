# NewCar 本地数据服务

前端是静态页面，浏览器不能稳定直接跨域读取懂车帝页面，也不能直接安全持有 DeepSeek API Key。需要在本机或服务器旁边启动两个轻量 Node 服务。

## 懂车帝近期新车

```bash
node scripts/dongchedi-newcar-server.mjs
```

这个服务同时提供新车情报和懂车帝官方/自营二手车源。

默认地址：

```text
http://127.0.0.1:8788/dongchedi/recent-models
http://127.0.0.1:8788/dongchedi/official-usedcars
```

健康检查：

```bash
curl http://127.0.0.1:8788/health
```

页面里的“新车情报 -> 刷新懂车帝数据”会先尝试 `/api/dongchedi/recent-models`，失败后再尝试本机 `127.0.0.1:8788`。数据来自懂车帝首页 `newCarData`、首页热门车型 `popularModels` 和对应车型页 `__NEXT_DATA__`，会提取车型来源（近期发布/热门车型）、发布日期、价格、能源类型、车型版本、尺寸、续航/电池、车型资讯和懂车帝链接。

页面里的“二手车 -> 刷新官方车源”会先尝试 `/api/dongchedi/official-usedcars`，失败后再尝试本机 `127.0.0.1:8788`。数据来自懂车帝官方/自营二手车列表接口，并会按用户偏好优先拉取理想 i6、蔚来 ES6/ES8、极氪 7X/007GT、小鹏 G7、智己 LS6、奥迪 Q6L e-tron、乐道 L60/L80、智界 R7、小米 SU7 等重点车系。懂车帝二手车页部分价格和里程使用字体混淆，服务会通过页面内可读字段学习映射后解码，再输出报价、指导价、年份、里程、城市、车源类型、保障标签和风险提示。

可选环境变量：

```bash
DCD_NEWCAR_PORT=8788 DCD_NEWCAR_CACHE_MINUTES=10 node scripts/dongchedi-newcar-server.mjs
```

## DeepSeek 信息墙分析

```bash
node scripts/gemini-analyzer-server.mjs
```

默认地址：

```text
http://127.0.0.1:8787/analyze
http://127.0.0.1:8787/recommend
```

`/analyze` 用于单台车的信息墙/风险分析，`/recommend` 用于首页“用车需求 -> 候选车型”推荐。服务使用 DeepSeek OpenAI 兼容接口，默认模型是 `deepseek-v4-flash`。不要把 API Key 写进代码或提交到仓库。

线上部署时，`car.zhoulujue.com/api/analyze` 和 `car.zhoulujue.com/api/recommend` 都应由 Caddy 代理到服务器内的 DeepSeek analyzer。当前 `huoshan-johor` 上 8787 已被其他服务占用，因此线上 analyzer 使用 `127.0.0.1:8790`。DeepSeek API Key 应写在服务器环境文件，例如 `/etc/newcar/deepseek.env`，并通过 systemd 的 `EnvironmentFile` 加载，不要提交到仓库。

可选环境变量：

```bash
DEEPSEEK_API_KEY=sk-xxx DEEPSEEK_MODEL=deepseek-v4-flash DEEPSEEK_ANALYZER_PORT=8787 node scripts/gemini-analyzer-server.mjs
```

DeepSeek 当前接入按文本 JSON 分析处理：信息墙里的文字、链接、图片文件名会进入模型；图片本身不会作为视觉输入发送。前端会保留你上传的信息，稍后可以手动再点“DeepSeek 分析”。

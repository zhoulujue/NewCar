# NewCar 本地数据服务

前端是静态页面，浏览器不能稳定直接跨域读取懂车帝页面，也不能直接安全持有 AI API Key。需要在本机或服务器旁边启动两个轻量 Node 服务。

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

页面里的“新车情报 -> 刷新懂车帝数据”会先尝试 `/api/dongchedi/recent-models`，失败后再尝试本机 `127.0.0.1:8788`。数据来自懂车帝首页 `newCarData`、首页热门车型 `popularModels`、懂车帝首页资讯/焦点图、汽车之家/易车/太平洋汽车的新车资讯线索，以及用户关注的重点纯电车系池；线索只用于发现车型，最终详情仍回到懂车帝对应车型页 `__NEXT_DATA__` 补全。服务会提取车型来源（近期发布/热门车型/资讯信源/行业线索/重点车型）、发布日期、价格、能源类型、车型版本、尺寸、续航/电池、车型资讯和懂车帝链接。

页面里的“二手车 -> 刷新官方车源”会先尝试 `/api/dongchedi/official-usedcars`，失败后再尝试本机 `127.0.0.1:8788`。数据来自懂车帝官方/自营二手车列表接口，并会按用户偏好优先拉取理想 i6、蔚来 ES6/ES8、极氪 7X/007GT、小鹏 G7、智己 LS6、奥迪 Q6L e-tron、乐道 L60/L80、智界 R7、小米 SU7 等重点车系。懂车帝二手车页部分价格和里程使用字体混淆，服务会通过页面内可读字段学习映射后解码，再输出报价、指导价、年份、里程、城市、车源类型、保障标签和风险提示。

可选环境变量：

```bash
DCD_NEWCAR_PORT=8788 DCD_NEWCAR_CACHE_MINUTES=10 node scripts/dongchedi-newcar-server.mjs
```

## AI 信息墙分析

```bash
node scripts/gemini-analyzer-server.mjs
```

默认地址：

```text
http://127.0.0.1:8787/analyze
http://127.0.0.1:8787/recommend
http://127.0.0.1:8787/quality
```

`/analyze` 用于单台车的信息墙/风险分析，`/recommend` 用于首页“用车需求 -> 候选车型”推荐，`/quality` 用于详情页“质量与三电 -> AI 检索质量线索”。质量线索会优先用 Gemini 的 Google Search grounding 联网检索官方召回、车质网投诉/投诉销量比、第三方质量研究和车主口碑；只有带可核验 grounding 的结果才回填投诉、召回等事实字段。DeepSeek 只作为低置信兜底，兜底时只保留待核验检索入口、判断摘要和下一步问题，不直接写入 `qualityProfile` 的事实数值。单车 SOH、维保、故障码和三电质保仍需上传检测/商家/官方证明，不应由 AI 猜测。如果本机配置了 `GEMINI_API_KEY`，服务会优先走 Gemini API；Gemini 失败后会自动改用 DeepSeek（需配置 `DEEPSEEK_API_KEY`）；二者都失败时，`/recommend` 会返回服务器规则兜底候选。不要把 API Key 写进代码或提交到仓库。

线上部署时，`car.zhoulujue.com/api/analyze`、`car.zhoulujue.com/api/recommend` 和 `car.zhoulujue.com/api/quality` 都应由 Caddy 代理到服务器内的 analyzer。当前 `huoshan-johor` 上 8787 已被其他服务占用，因此线上 analyzer 使用 `127.0.0.1:8790`。Gemini / DeepSeek API Key 应写在服务器环境文件，例如 `/etc/newcar/gemini.env`，并通过 systemd 的 `EnvironmentFile` 加载，不要提交到仓库。

可选环境变量：

```bash
GEMINI_MODEL=gemini-2.5-flash DEEPSEEK_MODEL=deepseek-v4-flash GEMINI_ANALYZER_PORT=8787 node scripts/gemini-analyzer-server.mjs
```

如果返回“当前网络区域不可用”，说明本机 AI API/CLI 的网络或区域还没打通，前端会保留你上传的信息，稍后可以手动再点“AI 分析”。

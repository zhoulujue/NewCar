# Google 登录配置

NewCar V1.1 的账号系统使用 Google Identity Services 前端登录组件。

当前实现是“Google 用户身份 + 本机浏览器数据分区”：

- 未登录时使用默认本地数据；
- 登录后按 Google `sub` 用户 ID 使用独立 localStorage；
- 第一次登录会把当前本机数据复制到该 Google 账号分区；
- 当前版本不把数据上传到云端，后续可接入后端数据库做多设备同步。

## 配置步骤

1. 打开 Google Cloud Console。
2. 创建或选择项目。
3. 进入 APIs & Services。
4. 配置 OAuth consent screen。
5. 创建 OAuth Client ID。
6. Application type 选择 Web application。
7. Authorized JavaScript origins 添加：
   - `https://car.zhoulujue.com`
   - `http://127.0.0.1:4173`
   - `http://localhost:4173`
8. 复制生成的 Web Client ID。
9. 编辑项目根目录 `auth-config.js`：

```js
window.NEWCAR_AUTH_CONFIG = {
  googleClientId: "你的-client-id.apps.googleusercontent.com"
};
```

10. 重新部署静态文件。

## 后续云同步建议

当需要多设备同步时，建议新增一个后端：

- `POST /api/auth/google`：校验 Google ID token，签发站点 session；
- `GET /api/workbench`：读取当前用户数据；
- `PUT /api/workbench`：保存当前用户数据；
- 数据库表按 `google_sub` 隔离。


# 学生信息管理系统

一个轻量级的前后端一体学生信息管理系统。

- **后端**：Fastify（Node.js）+ better-sqlite3
- **前端**：Vue 3（纯 JavaScript，通过 CDN 引入，无需构建/打包工具）
- **数据库**：SQLite（文件型数据库，零配置）

## 功能

- 学生信息的增、删、改、查
- 按姓名 / 学号关键字搜索
- 按班级、学籍状态筛选
- 分页浏览
- 学籍状态统计（在读 / 休学 / 毕业 / 退学、班级分布）
- 学号唯一性校验、必填字段校验
- 首次启动自动写入 5 条演示数据，方便直接体验

## 环境要求

- Node.js >= 18（建议 18 / 20 / 22 LTS）
- 无需额外安装数据库软件（SQLite 是文件数据库，随项目自带）

## 快速开始

### 方式一：一键启动脚本

- macOS / Linux：双击或在终端执行 `./start.sh`
- Windows：双击 `start.bat`

脚本会自动执行 `npm install`（首次运行）并启动服务。

### 方式二：手动执行

```bash
# 1. 安装依赖
npm install

# 2. 启动服务
npm start
```

启动成功后，在浏览器访问：

```
http://localhost:3000
```

默认监听端口 `3000`，可通过环境变量 `PORT` 修改，例如：

```bash
PORT=8080 npm start
```

## 项目结构

```
student-management-system/
├── server/                 # 后端 Fastify 服务
│   ├── index.js            # 服务入口，静态资源托管 + API 挂载
│   ├── db.js                # SQLite 初始化、建表、演示数据
│   └── routes/
│       └── students.js      # 学生信息 CRUD 接口
├── public/                  # 前端静态资源（Vue3，CDN 引入，无需构建）
│   ├── index.html
│   ├── app.js                # Vue3 组合式 API 应用逻辑
│   └── style.css
├── data/                     # SQLite 数据文件存放目录（自动生成）
├── start.sh / start.bat      # 一键启动脚本
├── package.json
└── README.md
```

## API 一览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/students` | 学生列表（支持 `page`、`pageSize`、`keyword`、`class_name`、`status`） |
| GET | `/api/students/:id` | 学生详情 |
| POST | `/api/students` | 新增学生 |
| PUT | `/api/students/:id` | 更新学生信息 |
| DELETE | `/api/students/:id` | 删除学生 |
| GET | `/api/students/stats` | 统计信息（总数、按状态、按班级） |
| GET | `/api/classes` | 班级下拉选项列表 |

## 数据存储说明

- 数据库文件位于 `data/sms.db`，首次启动时自动创建并写入建表语句与演示数据。
- 如需清空数据、恢复到初始演示状态，直接删除 `data/` 目录下的 `sms.db*` 文件后重新启动服务即可。

## 说明

- 前端使用 Vue 3 的浏览器端 CDN 版本（`unpkg.com`），首次打开页面时需要设备联网加载框架脚本；页面加载后本地功能（增删改查等）均由本机 Fastify 服务提供，无需外网。
- 如需完全离线部署，可将 `https://unpkg.com/vue@3.4.31/dist/vue.global.prod.js` 下载后放入 `public/` 目录，并修改 `public/index.html` 中的 `<script src>` 为本地路径。

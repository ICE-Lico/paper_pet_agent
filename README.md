# 论文助手

这是一个放在桌面上的论文阅读小工具。  

前端是 Electron + React，后端是 FastAPI。平时的用法比较直接：把论文内容贴进去，先加载上下文，再做总结、问答和相关方向整理，最后可以保存聊天记录。

现在这个项目已经支持：

- 悬浮球 + 展开面板的桌面形态
- 论文加载、总结、问答、相关方向
- DeepSeek 配置保存，页面的色彩、文字大小的切换
- 聊天记录和论文内容导出为 `txt`
- 退出前提醒是否先导出
- 打包成 Windows 安装版或免安装版

## 项目结构

```text
paper_pet_agent/
├─ app/                    Python 后端
│  ├─ agents/              总结 / 问答 / 相关方向等逻辑
│  ├─ models/              请求模型定义
│  ├─ rag/                 切块、向量检索
│  ├─ services/            LLM 调用
│  ├─ config.py            本地配置读写
│  └─ main.py              FastAPI 入口
├─ electron/               Electron 主进程
├─ frontend/               React 前端
├─ package.json            桌面端脚本
├─ requirements.txt        Python 依赖
└─ README.md
```

## 环境要求

- Windows 10/11
- Node.js 18 或更高
- Python 3.10 到 3.12
- 建议使用虚拟环境

## 首次安装（非开发目的无需进行此步）

先装 Node 和 Python 依赖。

```powershell
npm install
npm --prefix frontend install
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 本地开发

### 方式一：直接一条命令启动桌面端

这是现在最省事的方式。

```powershell
npm run dev
```

这条命令会先构建前端，再启动 Electron。  

开发模式下，Electron 会自动拉起本地 FastAPI 后端。

### 方式二：分开启动，方便排查问题

先启动后端：

```powershell
.venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

再启动桌面端：

```powershell
npm run dev
```

如果只想单独确认前端能不能正常构建：

```powershell
npm --prefix frontend run build
```

## 模型配置

程序里可以直接在右上角设置里填：

- `API Key`
- `Base URL`
- `模型名称`

默认可用的一组配置是：

```text
Base URL: https://api.deepseek.com
模型名称: deepseek-chat
```

配置保存后，程序会写入本地配置文件。  

如果你更喜欢手动改，也可以直接维护根目录下的 `user_config.json`。

示例：

```json
{
  "OPENAI_API_KEY": "your-api-key",
  "OPENAI_BASE_URL": "https://api.deepseek.com",
  "MODEL_NAME": "deepseek-chat"
}
```

## 直接安装开用！（无需环境）

这个项目有两种比较实用的分发方式。

### 1. 安装版 EXE

适合普通用户，双击安装就能用。

打包命令：

```powershell
npm run dist
```

打包完成后，安装包会出现在：

```text
release/论文宠物助手-Setup-0.1.0.exe
```

别人拿到这个文件，安装后直接打开即可。

### 2. 免安装版

适合不想走安装流程，或者想自己压缩后直接发的人。

先执行：

```powershell
npm run pack
```

或者直接在已经打包完成后使用：

```text
release/win-unpacked/
```

这个目录就是免安装版。  

把整个 `win-unpacked` 文件夹打成 zip 发给别人，对方解压后直接运行里面的 `论文宠物助手.exe` 就可以。

注意：

- 免安装版必须整个文件夹一起带走，不能只拿一个 exe
- 因为后端是目录版资源，缺少同级文件时程序会启动失败

## 打包说明

项目目前默认使用“目录版后端”一起打包，而不是单文件后端。  

这样做的原因很简单：单文件方式在部分机器上容易出现后端解压失败，导致界面打开后连不上服务。

现在相关脚本是：

```powershell
npm run build-ui            # 构建前端
npm run build-backend-dir   # 构建目录版后端
npm run pack                # 生成免安装版目录
npm run dist                # 生成安装包
```

## 常见问题

### 1. 打开程序后提示 `Failed to fetch`

一般是后端没有正常起来，优先检查：

- 端口 `8000` 是否已经被别的程序占用
- 打包时是否带上了完整的 `backend` 目录
- 是否只拷走了 exe，没有把整个免安装目录一起带走

### 2. 能打开界面，但问答没反应

通常先看这几项：

- API Key 是否可用
- Base URL 和模型名是否填对
- 当前网络是否能访问对应模型服务

### 3. 为什么退出时会提醒导出

这是为了防止误关后论文内容和聊天记录丢掉。  

如果当前面板里已经有内容，点击右上角退出时会先问你要不要导出 `txt`。


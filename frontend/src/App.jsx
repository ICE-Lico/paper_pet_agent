import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

const suggestionQuestions = [
  "这篇论文的核心贡献是什么？",
  "作者使用了哪些关键方法？",
  "这篇论文适合应用在哪些场景？",
  "这篇论文还有哪些局限性？",
];

const quickActions = [
  { key: "load", label: "加载论文", hint: "建立上下文索引" },
  { key: "analyze", label: "分析论文", hint: "生成总结与贡献点" },
  { key: "related", label: "相关方向", hint: "扩展研究思路" },
];

const themes = [
  { key: "obsidian", name: "曜石黑", accent: "#8ea0ff", accentSoft: "rgba(142, 160, 255, 0.18)", accentStrong: "rgba(142, 160, 255, 0.85)", glow: "rgba(142, 160, 255, 0.35)", panel: "10, 12, 18" },
  { key: "forest", name: "森夜绿", accent: "#7be0bc", accentSoft: "rgba(123, 224, 188, 0.18)", accentStrong: "rgba(86, 194, 155, 0.9)", glow: "rgba(123, 224, 188, 0.32)", panel: "8, 15, 14" },
  { key: "berry", name: "莓雾粉", accent: "#f09be7", accentSoft: "rgba(240, 155, 231, 0.18)", accentStrong: "rgba(211, 112, 200, 0.9)", glow: "rgba(240, 155, 231, 0.3)", panel: "18, 11, 21" },
  { key: "amber", name: "琥珀金", accent: "#f4c16f", accentSoft: "rgba(244, 193, 111, 0.18)", accentStrong: "rgba(223, 168, 69, 0.92)", glow: "rgba(244, 193, 111, 0.3)", panel: "20, 15, 10" },
];

const uiSizes = [
  { key: "compact", name: "紧凑", scale: 0.92 },
  { key: "cozy", name: "标准", scale: 1 },
  { key: "spacious", name: "宽松", scale: 1.08 },
];

function getTimeBasedStatus() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 9) return "晨间待命";
  if (hour >= 9 && hour < 12) return "专注分析";
  if (hour >= 12 && hour < 14) return "午间整理";
  if (hour >= 14 && hour < 18) return "研究推进";
  if (hour >= 18 && hour < 22) return "晚间精读";
  return "静默守候";
}

function getPandaMood({ isBusy, paperText, summary, topics, messages }) {
  if (isBusy) {
    return { tone: "thinking", label: "处理中", description: "正在整理论文内容并生成结果。", eyes: "focused", mouth: "serious" };
  }
  if (messages.length > 5 || topics.length > 0) {
    return { tone: "engaged", label: "陪读中", description: "当前对话和研究方向已经积累起来了。", eyes: "happy", mouth: "smile" };
  }
  if (summary || paperText.trim()) {
    return { tone: "awake", label: "已加载", description: "论文内容已经在上下文里，可以继续追问。", eyes: "bright", mouth: "soft" };
  }
  return { tone: "idle", label: "待机", description: "贴入论文后就可以开始提问或分析。", eyes: "calm", mouth: "soft" };
}

function PandaPet({ mood, compact = false, statusText }) {
  return (
    <div className={`panda-pet ${compact ? "compact" : ""} ${mood.tone}`}>
      <div className="panda-shell">
        <span className="panda-shadow-ring" />
        <span className="panda-glow-ring" />
        <div className="panda-blob">
          <div className="panda-head">
            <span className="panda-ear left" />
            <span className="panda-ear right" />
            <span className="panda-face-shine" />
            <span className="panda-patch left" />
            <span className="panda-patch right" />
            <span className={`panda-eye left ${mood.eyes}`} />
            <span className={`panda-eye right ${mood.eyes}`} />
            <span className="panda-eye-spark left" />
            <span className="panda-eye-spark right" />
            <span className="panda-nose" />
            <span className={`panda-mouth ${mood.mouth}`} />
            <span className="panda-cheek left" />
            <span className="panda-cheek right" />
          </div>
          <div className="panda-body">
            <span className="panda-belly" />
            <span className="panda-chest-glow" />
            <span className="panda-arm left" />
            <span className="panda-arm right" />
            <span className="panda-paw left" />
            <span className="panda-paw right" />
          </div>
        </div>
      </div>
      <div className="panda-meta">
        <span className="panda-label">{mood.label}</span>
        <span className="panda-status">{statusText}</span>
        {!compact && <p>{mood.description}</p>}
      </div>
    </div>
  );
}

function App() {
  const isPanelWindow = window.location.search.includes("panel=1");
  const dragRef = useRef({ isDragging: false, hasMoved: false, startX: 0, startY: 0 });
  const greetedRef = useRef(false);

  const [paperText, setPaperText] = useState("");
  const [question, setQuestion] = useState("");
  const [summary, setSummary] = useState("");
  const [contributions, setContributions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [messages, setMessages] = useState([]);

  const [petStatus, setPetStatus] = useState("等待任务");
  const [timeStatus, setTimeStatus] = useState(getTimeBasedStatus());
  const [isBusy, setIsBusy] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExitPromptOpen, setIsExitPromptOpen] = useState(false);
  const [isQuitting, setIsQuitting] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com");
  const [modelName, setModelName] = useState("deepseek-chat");
  const [apiKeySaved, setApiKeySaved] = useState(false);

  const [themeKey, setThemeKey] = useState("obsidian");
  const [transparency, setTransparency] = useState(78);
  const [uiSize, setUiSize] = useState("cozy");

  const hasDraftContent = Boolean(
    paperText.trim() || summary.trim() || contributions.length || topics.length || messages.length
  );

  const stats = useMemo(() => {
    const paperLength = paperText.trim().length;
    return [
      { label: "论文内容", value: paperLength ? `${paperLength} 字` : "未加载" },
      { label: "对话消息", value: `${messages.length} 条` },
      { label: "研究方向", value: `${topics.length} 个` },
    ];
  }, [messages.length, paperText, topics.length]);

  const hasInsights = Boolean(summary || contributions.length || topics.length);
  const currentTheme = themes.find((item) => item.key === themeKey) ?? themes[0];
  const currentSize = uiSizes.find((item) => item.key === uiSize) ?? uiSizes[1];

  const pandaMood = useMemo(
    () => getPandaMood({ isBusy, paperText, summary, topics, messages }),
    [isBusy, messages, paperText, summary, topics]
  );

  const themeStyle = useMemo(
    () => ({
      "--accent": currentTheme.accent,
      "--accent-soft": currentTheme.accentSoft,
      "--accent-strong": currentTheme.accentStrong,
      "--accent-glow": currentTheme.glow,
      "--panel-rgb": currentTheme.panel,
      "--panel-alpha": String(transparency / 100),
      "--panel-scale": String(currentSize.scale),
    }),
    [currentSize.scale, currentTheme, transparency]
  );

  const appendAssistantMessage = (content) => {
    setMessages((prev) => [...prev, { role: "assistant", content }]);
  };

  const sendRequest = async (path, payload) => {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "请求失败，请稍后重试。");
    }
    return data;
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/config`);
      const data = await response.json();
      setApiKeySaved(Boolean(data.api_key_set));
      setBaseUrl(data.base_url || "https://api.deepseek.com");
      setModelName(data.model_name || "deepseek-chat");
    } catch (error) {
      console.error("读取配置失败", error);
    }
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("paper-pet-ui") || "{}");
      if (saved.themeKey) setThemeKey(saved.themeKey);
      if (typeof saved.transparency === "number") setTransparency(saved.transparency);
      if (saved.uiSize) setUiSize(saved.uiSize);
    } catch (error) {
      console.error("读取界面配置失败", error);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("paper-pet-ui", JSON.stringify({ themeKey, transparency, uiSize }));
  }, [themeKey, transparency, uiSize]);

  useEffect(() => {
    const updateTime = () => setTimeStatus(getTimeBasedStatus());
    updateTime();
    const timer = window.setInterval(updateTime, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!isPanelWindow || greetedRef.current) return;
    greetedRef.current = true;
    appendAssistantMessage("可以先直接提问，或者把论文内容贴进来再继续分析。");
    setPetStatus("等待载入论文");
  }, [isPanelWindow]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!dragRef.current.isDragging) return;
      const deltaX = event.screenX - dragRef.current.startX;
      const deltaY = event.screenY - dragRef.current.startY;
      if (!dragRef.current.hasMoved && Math.abs(deltaX) + Math.abs(deltaY) > 12) {
        dragRef.current.hasMoved = true;
      }
      dragRef.current.startX = event.screenX;
      dragRef.current.startY = event.screenY;
      window.electron?.ipcRenderer.send("window-move", deltaX, deltaY);
    };

    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const runTask = async (taskKey, task) => {
    setActiveAction(taskKey);
    setIsBusy(true);
    try {
      await task();
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失败，请稍后重试。";
      setPetStatus("出现异常");
      appendAssistantMessage(`刚才处理失败了：${message}`);
      window.alert(message);
    } finally {
      setIsBusy(false);
      setActiveAction("");
    }
  };

  const buildExportContent = () => {
    const conversation = messages.length
      ? messages
          .map((msg) => `${msg.role === "user" ? "用户" : "助手"}：${msg.content}`)
          .join("\n\n")
      : "（空）";

    return [
      "论文助手导出",
      `导出时间：${new Date().toLocaleString("zh-CN")}`,
      "",
      "【论文内容】",
      paperText || "（空）",
      "",
      "【论文总结】",
      summary || "（空）",
      "",
      "【核心贡献】",
      contributions.length ? contributions.map((item, index) => `${index + 1}. ${item}`).join("\n") : "（空）",
      "",
      "【相关研究方向】",
      topics.length ? topics.map((item, index) => `${index + 1}. ${item}`).join("\n") : "（空）",
      "",
      "【聊天记录】",
      conversation,
    ].join("\n");
  };

  const handleSaveConfig = async () => {
    await runTask("save-config", async () => {
      await sendRequest("/config", { api_key: apiKey, base_url: baseUrl, model_name: modelName });
      setApiKeySaved(Boolean(apiKey));
      setPetStatus("模型配置已保存");
      appendAssistantMessage("配置已经保存，后续请求会使用这组模型设置。");
      setIsSettingsOpen(false);
    });
  };

  const handleLoadPaper = async () => {
    if (!paperText.trim()) {
      window.alert("请先粘贴论文内容。");
      return;
    }
    await runTask("load", async () => {
      const data = await sendRequest("/load_paper", { text: paperText });
      setPetStatus(`论文已载入，共 ${data.chunk_count} 段`);
      appendAssistantMessage("论文上下文已经建立完成，现在可以直接提问。");
    });
  };

  const handleAnalyze = async () => {
    if (!paperText.trim()) {
      window.alert("请先粘贴论文内容。");
      return;
    }
    await runTask("analyze", async () => {
      const data = await sendRequest("/analyze", { text: paperText });
      setSummary(data.summary || "");
      setContributions(data.contributions || []);
      setPetStatus("分析完成");
      setIsInsightsOpen(true);
      appendAssistantMessage("总结和贡献点已经整理好了。");
    });
  };

  const handleRelated = async () => {
    if (!paperText.trim()) {
      window.alert("请先粘贴论文内容。");
      return;
    }
    await runTask("related", async () => {
      const data = await sendRequest("/related", { text: paperText });
      setTopics(data.topics || []);
      setPetStatus("已生成相关方向");
      setIsInsightsOpen(true);
      appendAssistantMessage("我补充了一批可以延展的研究方向。");
    });
  };

  const handleAsk = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    const nextMessages = [...messages, { role: "user", content: trimmedQuestion }];
    setMessages(nextMessages);
    setQuestion("");

    await runTask("ask", async () => {
      setPetStatus("正在思考");
      const data = await sendRequest("/chat", { question: trimmedQuestion });
      setMessages([...nextMessages, { role: "assistant", content: data.answer || "暂时没有拿到有效回答。" }]);
      setPetStatus("回答完成");
    });
  };

  const handleExportTxt = async ({ silent = false } = {}) => {
    try {
      const result = await window.electron?.saveTextFile?.({
        defaultPath: `paper-pet-${new Date().toISOString().slice(0, 10)}.txt`,
        content: buildExportContent(),
      });

      if (result?.canceled) {
        return { canceled: true };
      }

      if (result?.filePath) {
        setPetStatus("已导出 TXT");
        if (!silent) {
          appendAssistantMessage(`已保存到本地：${result.filePath}`);
        }
      }

      return result ?? { canceled: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "导出失败，请稍后重试。";
      if (!silent) {
        window.alert(message);
      }
      return { canceled: true, error: message };
    }
  };

  const requestQuit = () => {
    if (isQuitting) return;
    if (!hasDraftContent) {
      window.electron?.quitApp?.();
      return;
    }
    setIsExitPromptOpen(true);
  };

  const handleQuitWithoutExport = () => {
    setIsExitPromptOpen(false);
    setIsQuitting(true);
    window.electron?.quitApp?.();
  };

  const handleExportThenQuit = async () => {
    if (isQuitting) return;
    setIsQuitting(true);
    const result = await handleExportTxt({ silent: true });
    if (result?.canceled) {
      setIsQuitting(false);
      return;
    }
    setIsExitPromptOpen(false);
    window.electron?.quitApp?.();
  };

  const handleHidePanel = () => window.electron?.ipcRenderer.send("close-panel");
  const handleTogglePanel = () => window.electron?.ipcRenderer.send("toggle-panel");

  const handleBallClick = () => {
    if (dragRef.current.hasMoved || dragRef.current.isDragging) {
      dragRef.current.hasMoved = false;
      return;
    }
    handleTogglePanel();
  };

  const handleDragStart = (event) => {
    dragRef.current.isDragging = true;
    dragRef.current.hasMoved = false;
    dragRef.current.startX = event.screenX;
    dragRef.current.startY = event.screenY;
  };

  if (!isPanelWindow) {
    return (
      <div className="app-shell ball-shell" style={themeStyle}>
        <button className="floating-button" onMouseDown={handleDragStart} onClick={handleBallClick}>
          <PandaPet mood={pandaMood} compact statusText={timeStatus} />
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell" style={themeStyle}>
      <div className="assistant-panel">
        <div className="panel-header">
          <div className="pet-info">
            <PandaPet mood={pandaMood} compact statusText={petStatus} />
            <div className="pet-header-copy">
              <h1>论文助手</h1>
              <p>{petStatus}</p>
            </div>
          </div>

          <div className="header-actions">
            <button className="icon-button" onClick={() => handleExportTxt()} aria-label="导出 TXT" title="导出 TXT">
              ⭳
            </button>
            <button className="icon-button" onClick={() => setIsSettingsOpen(true)} aria-label="打开设置" title="设置">
              ⚙
            </button>
            <button className="icon-button" onClick={handleHidePanel} aria-label="收起面板" title="收起">
              −
            </button>
            <button className="close-button" onClick={requestQuit} aria-label="退出程序" title="退出">
              ×
            </button>
          </div>
        </div>

        <div className="panel-body">
          <section className="hero-card">
            <div className="hero-copy">
              <span className="eyebrow">Workspace</span>
              <h2>对话和论文内容分开展示，操作入口都放在顶部。</h2>
              <p>先贴论文，再提问；分析结果按需展开，导出和设置都在右上角。</p>
            </div>

            <div className="hero-stats">
              {stats.map((item) => (
                <div key={item.label} className="stat-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="content-grid chat-first">
            <section className="section-card primary-chat-card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Chat</span>
                  <h3>对话问答</h3>
                </div>
                <span className="status-badge">{isBusy ? "处理中" : "随时可问"}</span>
              </div>

              <div className="chat-panel">
                <div className="chat-box">
                  {messages.length ? (
                    messages.map((message, index) => (
                      <div key={`${message.role}-${index}`} className={`message-bubble ${message.role}`}>
                        <span className="message-role">{message.role === "user" ? "用户" : "助手"}</span>
                        <p>{message.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="empty-chat">可以先直接提问，也可以先贴入论文内容再开始。</div>
                  )}
                </div>

                <div className="chat-controls">
                  <div className="suggestions">
                    {suggestionQuestions.map((item) => (
                      <button key={item} className="chip" onClick={() => setQuestion(item)} type="button">
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className="composer">
                    <input
                      type="text"
                      placeholder="输入你想问的问题"
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleAsk();
                        }
                      }}
                    />
                    <button className="primary-button" onClick={handleAsk} disabled={isBusy}>
                      {activeAction === "ask" ? "发送中..." : "发送"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="section-card input-card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Input</span>
                  <h3>论文内容</h3>
                </div>
                <span className="status-badge">{paperText.trim() ? "已输入" : "待输入"}</span>
              </div>

              <div className="input-panel">
                <textarea
                  className="paper-input"
                  placeholder="把论文摘要、正文片段或全文粘贴到这里。"
                  value={paperText}
                  onChange={(event) => setPaperText(event.target.value)}
                />

                <div className="action-grid">
                  {quickActions.map((action) => (
                    <button
                      key={action.key}
                      className="action-button"
                      onClick={action.key === "load" ? handleLoadPaper : action.key === "analyze" ? handleAnalyze : handleRelated}
                      disabled={isBusy}
                    >
                      <strong>{activeAction === action.key ? "处理中..." : action.label}</strong>
                      <span>{action.hint}</span>
                    </button>
                  ))}
                </div>

                <div className="secondary-actions">
                  <button className="ghost-button" onClick={() => setIsInsightsOpen((prev) => !prev)} disabled={!hasInsights}>
                    {hasInsights ? (isInsightsOpen ? "收起分析结果" : "展开分析结果") : "暂无分析结果"}
                  </button>
                </div>
              </div>
            </section>
          </section>

          {isInsightsOpen && hasInsights && (
            <section className="section-card insights-card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Insights</span>
                  <h3>分析结果</h3>
                </div>
                <span className="status-badge">按需查看</span>
              </div>

              <div className="result-grid">
                <article className="result-card accent">
                  <h4>论文总结</h4>
                  <p>{summary || "还没有可展示的总结内容。"}</p>
                </article>

                <article className="result-card">
                  <h4>核心贡献</h4>
                  {contributions.length ? (
                    <ol className="clean-list">
                      {contributions.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ol>
                  ) : (
                    <p>还没有生成贡献点。</p>
                  )}
                </article>

                <article className="result-card">
                  <h4>相关方向</h4>
                  {topics.length ? (
                    <ol className="clean-list">
                      {topics.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ol>
                  ) : (
                    <p>还没有生成相关方向。</p>
                  )}
                </article>
              </div>
            </section>
          )}
        </div>
      </div>

      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="settings-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">Settings</span>
                <h3>设置</h3>
              </div>
              <button className="close-button" onClick={() => setIsSettingsOpen(false)} aria-label="关闭设置">
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="settings-block">
                <h4>DeepSeek 配置</h4>
                <div className="form-grid">
                  <label>
                    API Key
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder="输入 DeepSeek API Key"
                    />
                  </label>
                  <label>
                    Base URL
                    <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.deepseek.com" />
                  </label>
                  <label>
                    模型名称
                    <input value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder="deepseek-chat" />
                  </label>
                </div>
                <div className="secondary-actions">
                  {apiKeySaved && <span className="status-dot saved">已保存</span>}
                  <button className="primary-button" onClick={handleSaveConfig} disabled={isBusy}>
                    保存配置
                  </button>
                </div>
              </div>

              <div className="settings-block">
                <h4>配色主题</h4>
                <div className="theme-grid">
                  {themes.map((theme) => (
                    <button
                      key={theme.key}
                      className={`theme-button ${themeKey === theme.key ? "active" : ""}`}
                      onClick={() => setThemeKey(theme.key)}
                      type="button"
                    >
                      <span className="theme-swatch" style={{ "--swatch": theme.accent }} />
                      {theme.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-block">
                <h4>透明度</h4>
                <div className="range-row">
                  <input
                    type="range"
                    min="52"
                    max="96"
                    value={transparency}
                    onChange={(event) => setTransparency(Number(event.target.value))}
                  />
                  <span>{transparency}%</span>
                </div>
              </div>

              <div className="settings-block">
                <h4>界面大小</h4>
                <div className="size-grid">
                  {uiSizes.map((item) => (
                    <button
                      key={item.key}
                      className={`size-button ${uiSize === item.key ? "active" : ""}`}
                      onClick={() => setUiSize(item.key)}
                      type="button"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
                <p className="settings-tip">布局会随窗口大小自动调整。</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isExitPromptOpen && (
        <div className="modal-overlay" onClick={() => setIsExitPromptOpen(false)}>
          <div className="settings-modal exit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">Exit</span>
                <h3>退出前保存</h3>
              </div>
              <button className="close-button" onClick={() => setIsExitPromptOpen(false)} aria-label="关闭提示">
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="settings-block">
                <p className="settings-tip">当前有论文内容或聊天记录。退出前要不要先导出成 TXT？</p>
                <div className="exit-actions">
                  <button className="primary-button" onClick={handleExportThenQuit} disabled={isQuitting}>
                    导出后退出
                  </button>
                  <button className="ghost-button" onClick={handleQuitWithoutExport} disabled={isQuitting}>
                    直接退出
                  </button>
                  <button className="ghost-button" onClick={() => setIsExitPromptOpen(false)} disabled={isQuitting}>
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

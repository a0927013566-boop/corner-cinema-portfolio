# 角落電影院｜Corner Cinema

[直接開啟公開作品集](https://a0927013566-boop.github.io/corner-cinema-portfolio/)

獨立靜態網站，任何人均可瀏覽，無須登入 ChatGPT。主頁可播放作品、選擇影集集數、搜尋與聆聽歌曲及配樂。

- 20 支公開 YouTube 影片：囚光 17 集、長夜同行第 1 集上／下、路燈 MV。路燈另提供本站中英字幕版，避免重複作品卡。
- 5 支本站影片：兩支 MV、手機課兩種版本、婚禮 AI 示範。
- 41 首歌曲與配樂版本：44 個來源音檔以完整 SHA-256 排除 3 組完全相同的副本，不將不同生成版本混為同曲。
- 作品資料與網頁分離，沒有會員、後台寫入 API 或儲存在前端的密鑰。

## 接手修改

**修改前先讀 [AGENTS.md](AGENTS.md) 與 [design-policy.json](design-policy.json)。使用者已否決 a80eaa0 的視覺方向；後續須保留原設計，逐區塊改善。**

- `data/works.json`：作品、海報、影片來源、影集順序與 AI 示範說明。
- `data/music.json`：曲名、版本、分類與 MP3。
- `data/youtube.json`：經公開 YouTube 資料工具核對的頻道影片清單。
- `index.html`／`style.css`／`script.js`：版面與影片播放器，沒有框架依賴。
- `lib/catalog.mjs`：首頁靜態建置與瀏覽器共用的作品呈現；`lib/listening.js`：常駐音樂、佇列及窄螢幕定位。
- `assets/`／`media/`：經授權公開的網頁展示副本。原始檔保留於原資產來源。
- `catalog.html`：停用 JavaScript 時仍可使用的完整目錄；修改資料後執行 `node scripts/build-catalog.mjs`，同步重建首頁靜態作品卡及完整目錄；請勿手改首頁 START／END 標記之間的產生內容。
- [HANDOFF.md](HANDOFF.md)：來源、權限、驗證及後續維護注意事項。

本機預覽：在本目錄執行 `node scripts/serve.mjs`，開啟 `http://127.0.0.1:8766/`。工具支援影音分段定位，僅綁定本機；也可用 `PORT=8767 node scripts/serve.mjs` 選其他埠號。

發布：修改後做 PR，合併到 `main`；GitHub Pages 從根目錄自動發布。確認 Actions 成功及正式網址的實際內容後才算部署完成。

## 權限

公眾能觀看與複製公開原始碼，不能直接修改正式網站。只有擁有者及其明確授權、具備 GitHub 寫入權限的帳號／AI 可發布。不要將權杖、私人媒體或登入密碼放進本倉庫。AI 工具品牌本身不是身份驗證；寫入權由帳號與授權控制。

## 驗證

安裝 Playwright 與 Chromium 後執行 `node tests/smoke.cjs`；使用現有工具時可設 `PLAYWRIGHT_MODULE`、`CHROMIUM_PATH` 與 `BASE_URL`。測試涵蓋響應式、影片播放及定位、音樂播放、選集、深連結、鍵盤、關閉停止、無 JS 目錄與減少動態。YouTube 第三方串流可用性需另行實測，不由 UI 測試宣稱通過。

設計來源、實測、截圖與操作錄影見 [設計紀錄](docs/design-plan.md)、[驗證紀錄](docs/validation.md)、[畫面證據](docs/evidence/README.md)。

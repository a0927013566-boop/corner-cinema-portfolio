# 角落電影院｜Corner Cinema

[直接開啟公開作品集](https://a0927013566-boop.github.io/corner-cinema-portfolio/)

獨立靜態網站，任何人均可瀏覽，無須登入 ChatGPT。主頁可播放作品、選擇影集集數、搜尋與聆聽歌曲及配樂。

- 20 支公開 YouTube 影片：囚光 17 集、長夜同行第 1 集上／下、路燈 MV。路燈另提供本站中英字幕版，避免重複作品卡。
- 5 支本站影片：兩支 MV、手機課兩種版本、婚禮 AI 示範。
- 41 首歌曲與配樂版本：44 個來源音檔以完整 SHA-256 排除 3 組完全相同的副本，不將不同生成版本混為同曲。
- 作品資料與網頁分離，沒有會員、後台寫入 API 或儲存在前端的密鑰。

目前保留原首頁夜景與作品構圖，加入景深／鏡頭光、作品影框透視、真實波形音樂選擇，以及原作品的3D播放展示。研究取捨、否決紀錄與實際動態錄影見[立體動態紀錄](docs/spatial-design.md)；修正版自查不代表本人已採用。

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

## 動態與立體聆聽

最新設計計畫／驗證見 [spatial-design.md](docs/spatial-design.md)。`spatial.css` 管聆聽室與後續空間設計，`lib/artwork-stage.js` 是原作品的實際3D展示面、相機和燈光；`lib/sound-experience.js` 接既有播放器的頻譜，`lib/motion.js` 共用減少動態／暫停。Three.js r180 在 `vendor/three/` 本地託管，含MIT授權，首頁不預載3D。

`python3 scripts/build-waveforms.py`（需ffmpeg）從已授權MP3重建每首64個RMS振幅，再執行 `node scripts/build-catalog.mjs` 同步靜態HTML。換曲資料保留原來源，不以波形取代音訊。

`node tests/spatial.cjs` 驗真正聲音反應、暫停動態、WebGL失效後仍播放和減少動態；同 smoke 測試的環境變數。軟體WebGL測試不是實體手機GPU性能保證。

首頁的原圖景深在 `lib/scene-motion.js`（2.5D照片處理），作品影框在 `lib/gallery-motion.js`（CSS 3D）。音樂展示是Three.js實際幾何，三者共用暫停設定。不要把照片視差說成完整3D世界，也不要恢復已否決的金色板片。

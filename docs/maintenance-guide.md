# 角落電影院｜使用與 AI 維護手冊

更新：2026-11-07。供本人、Grok Bot 及其他經授權的 AI 接手；依網站 main 實際程式編寫。網站內容更新時，維護者須同步修訂本手冊，不把今天的作品數量當永久上限。

## 1. 網址與使用入口

- 公開網站：https://a0927013566-boop.github.io/corner-cinema-portfolio/
- 作品區：https://a0927013566-boop.github.io/corner-cinema-portfolio/#works
- 音樂區：https://a0927013566-boop.github.io/corner-cinema-portfolio/#music
- 完整備援目錄：https://a0927013566-boop.github.io/corner-cinema-portfolio/catalog.html
- 唯一正式網站倉庫：https://github.com/a0927013566-boop/corner-cinema-portfolio
- 本手冊最新版：https://github.com/a0927013566-boop/corner-cinema-portfolio/blob/main/docs/maintenance-guide.md
- 發布紀錄：https://github.com/a0927013566-boop/corner-cinema-portfolio/actions

這是獨立公開網站，不必登入 GPT。訪客只能透過網站觀看、聆聽和操作，沒有上傳或修改後台。網站與公開原始碼可被複製；正式網站的改動由 GitHub 權限控制。

本人操作：進入「作品」，點海報或「播放完整作品」；影集可選集／下一集；播放器可定位、調音量和關閉。展廊可拖曳、按左右鍵選片，再按播放。進入「音樂」可搜尋、切分類、點單曲或播放清單，下方播放器可換曲、定位與關閉。看不到動態時查「開啟動態／暫停動態」及瀏覽器偏好；無 3D 時仍應可播放。

影片直達例：網站網址加 `#watch=longnight`。影集例：`#watch=qiuguang&episode=5`（集數從 1 開始）。歌曲例：`#watch=track-07`。讀取深連結不自動發聲，需由訪客按播放。

## 2. Grok Bot 接手前必須知道

先讀網站根目錄的 `AGENTS.md`、`design-policy.json`、`HANDOFF.md`，再讀本手冊及這次任務。若具備私人知識庫權限，另讀 ai-director 的原作品集台帳及相關技能；私人倉舊網站快照不能覆蓋正式網站倉。

Grok Bot 需要實際能讀檔、編輯、執行建置／測試、建立分支和 PR 的工具。僅能聊天或讀公開網頁的 Bot，可提出可套用修改檔，不能假稱已部署。使用者另外授予寫入／合併權時才執行對應動作；權杖由 Bot 的工具端安全保存，不貼在聊天、Google 文件、公開倉庫或前端程式。這份手冊不會自動連線、安裝 Bot 或給它 GitHub 權限。

原本明確不公開的內容維持排除。從 Drive 找到檔案，不等於允許公開；私人的原始素材、客戶資料與登入資料不要帶入公開提交。已停用的 C·C 圖標不恢復。更新內容不能順便重做整站或改掉原有設計、播放、手機和備援功能。

## 3. 真正需要修改的檔案

- `data/works.json`：影片／影集的正式播放清單、海報、說明與順序。
- `data/music.json`：音樂正式清單、分類、秒數、MP3 和波形。
- `data/youtube.json`：已核對的公開頻道資料快照；不是前台自動匯入器。只改這份不會新增作品卡。
- `data/media-manifest.json`：本站影音副本的檔案大小、SHA-256、片長與編碼紀錄；不是播放清單。
- `assets/`：授權公開的海報、主視覺和影格；`media/`：網站影片；`media/audio/`：網站音樂。
- `index.html`：頂部主打、初始音樂主打、分類按鈕及靜態首頁。
- `lib/catalog.mjs`：作品分類、卡片與音樂波形的共用呈現；`scripts/build-catalog.mjs` 重建首頁清單及 `catalog.html`。
- `script.js`：影片、YouTube、選集、深連結；`lib/listening.js`：音樂播放器、佇列、單一聲源。
- `lib/scene-motion.js`：頂部照片的景深、路燈、薄霧；`lib/film-gallery.js`／`lib/film-scene.js`：作品展廊與 3D。
- `lib/sound-experience.js`／`lib/artwork-stage.js`：音樂視覺、真實頻譜及目前限定的同步 MV。
- `style.css`、`spatial.css`、`cinematic.css`：既有外觀與動效。單純新增內容通常不必改它們。

本站是原生 HTML／CSS／JavaScript，沒有現成的登入後台，也沒有「上傳 Drive 就自動上架」或「最新影片自動替換主打」功能。內容檔更新、重建、發布是不同步驟。

## 4. 新增一支本站影片

先核本人允許公開的正確版本，保留原始 master。網站使用適合網路播放的展示副本；目前是 H.264／AAC MP4，含 faststart。不要把僅限預覽的 Drive 分享網址直接填成 MP4 `src`，也不要為了播放而擴大原檔的公開權限。

先準備 `media/new-film-web.mp4` 和 `assets/new-film.jpg`，在 `data/works.json` 陣列加入一筆。以下是欄位示例，不是已存在或獲准上架的新作品；片名、片長、素材路徑與說明都需換成真實資料。

```json
{
  "id": "new-film",
  "title": "新作品名稱",
  "subtitle": "中英字幕・02:30",
  "duration": "02:30",
  "category": "mv",
  "label": "音樂 MV",
  "poster": "assets/new-film.jpg",
  "src": "media/new-film-web.mp4",
  "description": "這支作品的真實內容與製作說明。"
}
```

`id` 必須與所有作品和音樂 ID 都不同，使用固定的英數短名；發布後不要為了改片名就更換 ID，否則舊分享連結會失效。`duration` 是顯示文字；不能填估算值冒充實測。AI 虛構活動／婚禮案例須加入正確的 `disclosure`，不可寫成真客戶。

目前分類只有 `series`（影集）、`mv`（音樂影片）、`photo`（照片敘事）。新類型如獨立廣告，不能只填一個 `ad` 就期待卡片出現；須另行同步 `lib/catalog.mjs` 的群組、`index.html` 分類按鈕及相應樣式／測試。不要為了省事把不相符的作品硬歸類。

可選 `notes` 欄位提供創作筆記；填入時必須包含 `story`、`craft` 及 `stills` 陣列。每個影格有 `src`、`alt`、`time`，回查實片後填，沒有資料就省略整個 `notes`，不要編造鏡數或技術。

新增／替換本站影音時，以實檔更新 `data/media-manifest.json` 的 `path`、`bytes`、`sha256`、`duration`、`codecs`。可用 `ffprobe` 讀片長與編碼、Python hashlib 或 `sha256sum` 算雜湊；來源及公開依據另記私人台帳，不把私人連結與秘密放入公開 manifest。大型原檔留原資產來源；超出儲存／託管限制時先選適合的公開影音服務，別強推大檔或把 LFS 指標當影片。

完成後執行 `node scripts/build-catalog.mjs`，提交資料、展示素材、manifest、產生的 `index.html` 和 `catalog.html`；再依第 8 節發布驗證。

## 5. 新增 YouTube 影片或影集集數

使用本人已允許公開且可觀看的真影片 ID，不能只貼頻道網址。新影片是否已公開、是否可嵌入，須分別確認；尚未發布與明確排除的作品不要提前列出。

新增影集或目前的單支 YouTube 作品，使用 `episodes` 陣列，單片也可只有一筆。這個形式兼容現有靜態目錄：目前建置器的非影集分支使用 `src`，只填頂層 `youtubeId` 會讓無 JS 目錄缺少正確連結。

```json
{
  "id": "new-series",
  "title": "新影集名稱",
  "subtitle": "原創短劇・第 1 集",
  "category": "series",
  "label": "故事影集",
  "poster": "assets/new-series.jpg",
  "description": "影集的真實說明。",
  "episodes": [
    {
      "title": "第 1 集的完整標題",
      "youtubeId": "REAL_YOUTUBE_ID",
      "duration": "PT1M30S"
    }
  ]
}
```

`REAL_YOUTUBE_ID` 是待替換標記，不可提交為真 ID；`PT1M30S` 表示 1 分 30 秒，與作品的 `02:30`、音樂的數字秒數不同。新增既有影集集數時追加到其 `episodes`，順序就是播放順序；不要重排舊集而改掉既有 `episode=N` 分享的意思。

特別注意《長夜同行》：`script.js` 現有選集按鈕對 `changye` 寫死「第 1 集・上／下」，第三段以後會顯示錯誤。新增後續集數時，必須先讓按鈕顯示各段真實標題或明確的集數標籤，再驗選集與下一集；不只追加 JSON 就宣稱完成。

若本次也核對頻道清單，更新 `data/youtube.json` 的日期與相應記錄；它仍不會取代 `works.json`。重建目錄後實測 iframe 及「在 YouTube 開啟」備援。測試環境若擋第三方串流，只能報串流未驗，不說全部可播或全部失效。

## 6. 新增歌曲或配樂

先確認可展示版本；既有完全相同音檔才去重，不把不同演唱／混音版本當重複。新增 `media/audio/track-42.mp3`，在 `data/music.json` 加入一筆；42 僅是示例，先找未使用 ID，舊曲不重編號。

```json
{
  "id": "track-42",
  "kind": "audio",
  "title": "新歌曲名稱",
  "version": "",
  "group": "song",
  "duration": 180.25,
  "src": "media/audio/track-42.mp3"
}
```

沿用 `track-` 前綴，因為部分分享與播放狀態程式用它辨認歌曲。`group` 用 `song` 或 `score`；配樂填 `score`。`duration` 是實際秒數，`version` 用來區別版本。`waveform` 不手編：音訊到位後執行下面兩行。

```sh
python3 scripts/build-waveforms.py
node scripts/build-catalog.mjs
```

第一行需要 FFmpeg，會讀取清單內所有本地 MP3，重建每首 64 個 RMS 波形值；因此缺任何既有音檔都會失敗，不能在只有新增單曲的殘缺 checkout 上假稱跑完。第二行更新首頁歌曲靜態清單及完整目錄。配樂在 JS 分類或完整目錄可見，首頁預設先列歌曲。同步更新影音 manifest，實聽並測定位、上一首／下一首、清單接續及開影片時停止音樂。

新增歌曲會加入播放器與搜尋，但不會自動取得專屬封面或同步 MV。目前 `lib/artwork-stage.js` 只有 `track-07` 對應《越過長夜》靜音影片材質；其他曲目用現有展示畫面與真頻譜。若要替新歌接 MV，另建正確的曲目—影片映射並驗起點／版本／時長，維持只有音樂播放器發聲。

如只要換音樂區的初始推薦，修改 `index.html` 的 `#sound-title`、`#sound-detail`、`#sound-play` 之文字、`href`、`data-play` 與可及性文字；檢查 `#sound-space .sound-fallback`。再同步 `lib/sound-experience.js` 的初始波形選擇（目前 `track-07`）。修改首頁主打影片不代表也要改這個音樂推薦。

## 7. 頂部《越過長夜》可以換嗎？可以

可以在有新作品時，依本人指定更換。這是「本期主打」，不是不可更動的永久綁定；但目前不是自動選最新影片，也沒有後台開關。先將新作品正確加入作品清單，再更新頂部相關欄位。舊《越過長夜》仍保留在作品集，除非本人另行要求移除。

### 只更換主打影片，保留目前背景

在 `index.html` 找 `.hero-content` 裡的 `.button`：將 `data-play` 改成新作品 ID，`href` 改成該片真實 MP4 或 YouTube 連結，更新「播放《片名》」和 `.button-time`。再更新 `.hero-caption` 的片名／類型及需要的本期編號。品牌主標題不是影片標題，不必跟著改。

`href` 是 JS 失效時的直接入口，`data-play` 是站內播放器的 ID；兩者必須指同一作品，不能只改文字。背景仍屬《越過長夜》時，保持正確的圖片 alt 與來源歸屬；若與新主打會造成誤解，選擇連背景一同更換。

### 主打影片與頂部背景一起更換

在上述步驟外，準備經允許的新主視覺，例如 `assets/new-feature-art.jpg`，不要用新圖覆寫 `longnight-art.jpg`，因為其他區塊仍在使用原圖。

同步更新 `index.html` 的 `.hero-image`：`src`、真實 `width`／`height`、正確 `alt`；更新 `<link rel="preload" as="image">`，需要分享預覽同步換圖時更新 `og:image` 的完整公開網址。檢查 `style.css` 的 `.hero-image` 裁切與手機版，保留標題及按鈕可讀性。

重要：`lib/scene-motion.js` 的人物景深、三個路燈座標、遠山薄霧遮罩是依目前照片寫的，並非通用自動辨識。換新圖時要按新場景重新安排受影響的遮罩／光源；不合適的舊效果應移除或換成對應設計，不能照搬讓新作品憑空出現路燈。圖片載入、靜態備援、動態開關、正常速度與窄畫面均要檢查。

### 不要混淆另外兩個主打位置

作品展廊目前在 `lib/film-gallery.js` 把 `longnight` 排第一；其 CSS 備援與 `lib/film-scene.js` 亦對它使用專屬原圖。若本人要「展廊第一部也換新片」，另同步排序／展示素材／初始 `.film-play`，確保 WebGL 與備援一致。只改頂部時，不要無故動展廊排序。

音樂區的初始 `track-07` 和同步 MV 是第三處，見第 6 節。禁止全倉把 `longnight` 或《越過長夜》搜尋取代成新片名，這會破壞舊作品、音樂映射與分享網址。

## 8. 修改、檢查、發布與復原

由 AI 執行下列流程，使用者只需交代作品與用途，不必自己打命令。

### 開工與預覽

取得遠端最新 `main`，在乾淨、獨立分支／worktree 修改；不重設其他對話的工作目錄。記本次更改的內容／區塊、保留項、來源版本和實際公開授權。

```sh
node scripts/build-catalog.mjs
node scripts/serve.mjs
```

在伺服器執行期間開 `http://127.0.0.1:8766/` 預覽；這是執行環境的本機位址，不是交給使用者的公開網址。伺服器支援影音 Range 定位；需要另一埠時用現有 `PORT` 設定。不要直接雙擊 HTML 以 `file://` 檢查 JSON 載入。

### 與變更相符的檢查

確認 JSON 可解析、ID 唯一、分類已存在、路徑大小寫正確、媒體確實存在，並確認重建後首頁及無 JS 目錄都有新內容。不要手改 `index.html` 的 WORKS／TRACKS START–END 產生區。

實際播放新增／受影響的片與曲：播放、暫停、定位、關閉、切片、深連結及單一聲源；看桌面與窄畫面的裁切、文字和操作。換主視覺時再看動態正常速度、關閉動態、無 WebGL。視覺是否符合原意與技術能否運行分開判斷。

倉庫已有 `node tests/smoke.cjs`；動效修改按範圍使用 `tests/spatial.cjs`、`tests/motion-choice.cjs`、`tests/film-gallery.cjs`。需 Playwright／Chromium，可沿環境的 `PLAYWRIGHT_MODULE`、`CHROMIUM_PATH`、`BASE_URL` 設定；不要為文件小改動重跑全部影音。

注意：部分測試有目前 7 組作品、17／2 集及特定 ID 的固定斷言。合法新增內容時，依新資料更新預期並保留功能驗證；不要因舊數字失敗就刪新作品，也不要刪掉檢查讓測試變綠。現有 smoke 會封鎖 YouTube 請求，通過不代表第三方串流已播過。

### 正式發布

檢查 diff 不含私人素材或憑證，將本輪變更、生成目錄及維護紀錄一起提交，建立 PR。沿本人已有授權進行合併；無合併權就交 PR，不聲稱已上線。

本網站 GitHub Pages 使用 `main` 分支的 `/ (root)`，不必每次重設 Pages。合併後看 Actions 的對應 commit；排隊不等於成功，失敗要讀原因。成功後以正式網址讀回實際內容及受影響資產，確認新片、歌曲或主打與該 commit 相符。快取問題先確認部署版本，再重新整理或使用新查詢參數；`?v=cinematic-1` 不是另一個網站。

出錯時保留可用版本，對本輪 commit 作有範圍的 revert／修正 PR，再發布核對；不可 force push 或把整站覆蓋成私人舊快照。維護紀錄保存 commit、PR、部署狀態、已驗與未驗事項，其他 AI 可接續。

## 9. 常見問題與定位

- 新片不見：查 `works.json`、分類及是否重建；不要只改 `youtube.json`。
- 主打文字變了卻仍播舊片：查 `.hero` 的 `data-play` 和 `href` 是否一起改；核正式站是否已發布。
- 換背景後光斑、霧或人物變形：查照片專用的 `scene-motion.js`，不是再加更多模糊或粒子。
- 音樂有聲卻沒新封面／MV：新增音檔不會自動建立視覺映射，查第 6 節。
- 影片不能定位或載入：查公開 URL、HTTP 回應、Range、編碼與檔案是否完整；Drive 預覽頁／Git LFS 指標不是媒體本體。
- 兩個聲音同時播：查影片與 `lib/listening.js` 的互斥；同步 MV 必須靜音。
- YouTube 嵌入受限：保留原片備援，核影片狀態；不因單一測試環境受阻反覆換資料。
- Grok Bot 說能維護但無法提交：核它的真實工具和 GitHub 授權；公開網址只提供瀏覽，不能賦予編輯能力。

## 10. 可直接交給 Grok Bot 的接手指令

「請維護我的角落電影院作品集，正式網站為 https://a0927013566-boop.github.io/corner-cinema-portfolio/ ，唯一發布倉庫是 a0927013566-boop/corner-cinema-portfolio。先取最新 main，讀 AGENTS.md、design-policy.json、HANDOFF.md 和 docs/maintenance-guide.md。維持既有設計、作品、播放、單一聲源、手機與備援功能，不使用私人舊快照覆蓋。依我這次指定的素材與公開範圍新增影片／音樂或替換本期主打；保留明確不公開及否決項。更換頂部主打不是刪掉舊作品；先分清頂部、展廊排序、音樂推薦三處。你自行修改正確資料與必要程式、重建、做相應實測、提交 PR，依已有授權合併並核正式網站。沒有工具、素材或寫入權就具體說明可完成的範圍，不假裝已上線。完成後給我公開網址、變更摘要與仍未驗證事項，更新同一維護紀錄。不要把權杖或私人資料放進公開倉庫。」

本手冊完成的是可交接的維護方法；本次沒有替換主打、新增媒體、安裝或授權 Grok Bot。之後本人指定新作品時，按本手冊執行即可。

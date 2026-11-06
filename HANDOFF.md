# 接手與內容依據

## 目標與邊界

本人要可公開瀏覽、能由本人授權的不同 AI 繼續修改的作品集網站。訪客只瀏覽，正式網站的寫入權由 GitHub 倉庫權限管理；公開原始碼可被複製。接案仍依本人當前設定，不因建立作品集而恢復。不得公開家人、客戶或追思素材；虛構 AI 示範如日後公開必須清楚標示。

## 目前內容與來源

- 《路燈亮起的時候》2:47 和《越過長夜》3:04：依私人主倉 `副業管家/作品集.md` 中可展示作品與版本資訊；2026-11-07 查得原片為私人檔案，未把私人 Drive 連結放到公開網頁；是否開放連結觀看待本人決定。
- 《長夜同行》連結來自主倉 `營運/長夜同行_YouTube排程_2026-11-04.md` 的第 1 集上。當前執行環境無法讀取 YouTube，公開狀態與播放未驗證。
- 網站插畫是 CSS 製作的抽象圖形，不是電影畫面。沒有搬運原作品媒體或他人圖片。
- 過去「潤飾作品集說明」對話要求虛構活動明確標示為 AI 生成；家人及追思內容不公開。

## 設計研究

作品導向、簡短作品背景及易尋找的頻道連結，參考 [aemi 電影藝術家工具包](https://aemi.ie/wp-content/uploads/2025/06/Toolkit-for-film-artists-2025.pdf)；[GitHub Pages 官方文件](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)確認靜態 HTML/CSS/JS 可從倉庫部署；[web.dev](https://web.dev/learn/performance/video-performance)建議避免影片嵌入拖慢首次載入。只借資訊組織與方法，未拷貝作品。

## 待完成

- 確認影片公開播放及正確版本，將兩支 MV 的公開網址接到作品卡；不要自行改 Drive 分享權限或上傳影片。
- 確認可公開的聯絡管道後再加入；不要使用私人地址或虛構表單。
- 若有本人授權的作品影格，另外在適當的媒體儲存位置保管，並加入正式來源；目前抽象視覺不是作品截圖。
- 真手機與完整觀看影片、影片字幕驗收仍需實機實測。

## 2026-11-07 狀態

- 網站來源已上傳至本人公開倉庫 [corner-cinema-portfolio](https://github.com/a0927013566-boop/corner-cinema-portfolio)。GitHub Pages 尚待啟用；網站來源可移至其他靜態服務。
- Chromium 桌面 1440px、行動視窗 390px 已檢查畫面、水平溢位與頁內錨點；這不是實體手機測試。
- 已讀回本人倉庫的協作者，當時僅有倉庫擁有者；後續修改權依 GitHub 實際權限與授權為準。

## 公開預覽與正式部署

可供瀏覽的暫時版本：[作品集預覽](https://rawcdn.githack.com/a0927013566-boop/corner-cinema-portfolio/d6c1b675eab4c8367e614e508980776fe30d2099/index.html)。此連結固定在提交 `d6c1b675eab4c8367e614e508980776fe30d2099`；之後改 main 不會自動更新這個網址。這是第三方快取服務，不應當成可持續維護的正式部署。已用 HTTP 讀回 HTML、CSS、JavaScript 各自為 200，未在外部真機完整測試。

正式網站應以 GitHub Pages 綁定 main：目前推送倉庫正常，但當前 GitHub integration 呼叫 Pages 設定 API 回應 403。不得宣稱 GitHub Pages 已啟用。兩支影片的 Drive 權限目前為私人，分享變更待本人同意；不得因預覽網址而聲稱已可播放。

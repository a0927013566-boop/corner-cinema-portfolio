// 放映廳選片規則：下架、固定、滿了擠掉最舊的、影集更新算最新。不用瀏覽器。
import assert from 'node:assert/strict';
import {hallSelection, hallsFor} from '../lib/catalog.mjs';
const w = (id, added, extra = {}) => ({id, title: id, category: extra.category || 'a', label: '甲', added, ...extra});
const ids = r => r.shown.map(x => x.id);
let works = [w('old', '2026-01-01'), w('mid', '2026-02-01'), w('new', '2026-03-01')];
assert.deepEqual(ids(hallSelection(works, 3)), ['old', 'mid', 'new']);                 // 沒滿：全部都在，順序照清單
assert.deepEqual(ids(hallSelection(works, 2)), ['mid', 'new']);                        // 滿了：最舊的出去
assert.deepEqual(hallSelection(works, 2).pushed.map(x => x.id), ['old']);
works[0].updated = '2026-04-01';                                                       // 影集加了一集：變最新
assert.deepEqual(ids(hallSelection(works, 2)), ['old', 'new']);
delete works[0].updated; works[0].hall = 'pinned';                                     // 固定：不會被擠
assert.deepEqual(ids(hallSelection(works, 2)), ['old', 'new']);
works[2].hall = 'off';                                                                 // 下架：不進放映廳，位置讓給別人
assert.deepEqual(ids(hallSelection(works, 2)), ['old', 'mid']);
assert.deepEqual(hallSelection(works, 2).off.map(x => x.id), ['new']);
works = [w('a', '2026-01-01'), w('b', '2026-01-01'), w('c', '2026-01-01')];            // 同一天：清單後面的先出去
assert.deepEqual(ids(hallSelection(works, 2)), ['a', 'b']);
works = [w('a', undefined), w('b', '2026-01-01')];                                     // 沒日期的當最舊
assert.deepEqual(ids(hallSelection(works, 1)), ['b']);
works = [w('a', '2026-01-01', {category: 'x'}), w('b', '2026-02-01', {category: 'y'})]; // 整廳被擠光：那個廳不出現
assert.deepEqual(hallsFor(hallSelection(works, 1).shown).map(h => h.id), ['y']);
assert.equal(hallsFor(works).length, 2);                                               // 作品清單照樣兩組
console.log('PASS hall rule: capacity, oldest out, series update, pin, off, ties, undated, empty hall');
